'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CreditsSlide, DiagramSetSlide, ImageSlide, Project, ProjectSlide } from '@/types'
import { projectSlides } from '@/data/projectSlides'
import { cldCard } from '@/lib/cloudinary'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"

const HEADER_H = 56          // 모바일 헤더 바 높이 (SiteHeader .mobile-header-bar와 일치)
const CHIPS_H = 44           // 필터 칩 행 높이
const EASE = 'cubic-bezier(0.7, 0, 0.3, 1)'
const MORPH_MS = 500         // 성장/수축 모프 + 동시 스크롤

// ── 콘덴스드 월 — 3단 크기 위계. 배율 확정 (v4.1): TIERS가 최종값, WALL_SCALE 1.0 고정 ──
const WALL_SCALE = 1.0
const TIERS = [
  { w: 288, h: 192, opacity: 1 },     // d=0 위계 중심 (구 192×128의 150%)
  { w: 201, h: 134, opacity: 0.45 },  // d=1 (d=0과 d≥2의 산술 중간)
  { w: 114, h: 76,  opacity: 0.3 },   // d≥2 (불변)
]
const PAIR_TEXT_W = 130      // 측면 텍스트 블록 폭 — 우정렬로 썸네일에 flush
const PAIR_GAP = 8
const ITEM_GAP = 14
const TOP_TEXT_H = 24        // d=0 상단 텍스트 행 — 아이템 높이에 포함, 티어 transition과 함께 보간
const BACK_ROW_H = 36        // 확장 블록 BACK 행 높이 — 타이틀 보간 종착 산출에 사용
const TIER_TRANSITION = 'width 400ms ease, height 400ms ease, opacity 400ms ease'

// ── 트랙 수직 상수 — 히어로 H = (100vw − 32px) × 2/3. 어떤 슬라이드 조합에서도 총 높이 불변 ──
const HERO_W = 'calc(100vw - 32px)'
const TRACK_IMG_H = 'calc((100vw - 32px) * 2 / 3)'       // 이미지·정보·크레딧 슬라이드 = H
const TRACK_DIAGRAM_H = 'calc((100vw - 32px) * 4 / 9)'   // 다이어그램 = H × 2/3
const CAPTION_H = 28         // 캡션 영역 — 항상 고정 예약, 트랙 높이에 미포함

// ── 셔플 (월 결합형) ──
const SHUFFLE_INTERVAL_MS = 6000
const SHUFFLE_RESUME_MS = 8000
const SHUFFLE_SCROLL_MS = 600

// ── 폴드 전환 ──
const FOLD_MS = 280
const FOLD_STAGGER_MS = 15
const FOLD_PAUSE_MS = 80
const UNFOLD_MS = 400
const UNFOLD_STAGGER_MS = 50
const UNFOLD_MAX_DELAY_MS = 600

function tierFor(d: number) {
  const t = TIERS[Math.min(d, 2)]
  return {
    w: Math.round(t.w * WALL_SCALE),
    h: Math.round(t.h * WALL_SCALE),
    opacity: t.opacity,
  }
}

function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// CSS cubic-bezier(0.7,0,0.3,1) 등가 — 스크롤·오버레이를 한 rAF에서 동일 곡선으로 보간
function cubicBezier(p1x: number, p1y: number, p2x: number, p2y: number) {
  const cx = 3 * p1x
  const bx = 3 * (p2x - p1x) - cx
  const ax = 1 - cx - bx
  const cy = 3 * p1y
  const by = 3 * (p2y - p1y) - cy
  const ay = 1 - cy - by
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t
  const sampleDX = (t: number) => (3 * ax * t + 2 * bx) * t + cx
  return (x: number) => {
    let t = x
    for (let i = 0; i < 5; i++) {
      const dx = sampleX(t) - x
      const d = sampleDX(t)
      if (Math.abs(dx) < 1e-4 || d === 0) break
      t -= dx / d
    }
    return sampleY(Math.min(1, Math.max(0, t)))
  }
}
const easeFn = cubicBezier(0.7, 0, 0.3, 1)

// 히어로(커버 3:2)가 트랙 첫 슬라이드 — projectSlides 첫 항목이 커버와 동일 이미지면 중복 제거
function getRestSlides(project: Project): ProjectSlide[] {
  const slides = projectSlides[project.id] ?? []
  if (slides.length > 0 && slides[0].kind === 'image' && slides[0].src === project.coverImage) {
    return slides.slice(1)
  }
  return slides
}

function splitCaption(caption: string): { label: string; description: string } {
  const sepIdx = caption.indexOf('—')
  if (sepIdx < 0) return { label: caption, description: '' }
  return {
    label: caption.slice(0, sepIdx).trim(),
    description: caption.slice(sepIdx + 1).trim(),
  }
}

// ── 캡션 — 고정 28px 영역 내에서만 렌더. 최대 2줄, 넘치면 ellipsis ──
function MobileCaption({ label, description }: { label: string; description: string }) {
  return (
    <div style={{ height: CAPTION_H, paddingTop: 4, width: 0, minWidth: '100%', overflow: 'hidden' }}>
      <div style={{
        fontFamily: FONT,
        fontSize: 10,
        fontWeight: 300,
        lineHeight: 1.2,
        color: '#0a0908',
        opacity: 0.55,
        wordBreak: 'keep-all',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical' as const,
        overflow: 'hidden',
      }}>
        <span style={{ fontWeight: 500 }}>{label}</span>
        {description && ` — ${description}`}
      </div>
    </div>
  )
}

// ── 이미지 슬라이드 — 높이 H (diagram 표기 시 H×2/3 수직 중앙), 폭은 비율이 결정 ──
function MobileImageSlide({ slide }: { slide: ImageSlide }) {
  const { label, description } = slide.caption
    ? splitCaption(slide.caption)
    : { label: '', description: '' }
  const diagram = slide.diagram === true

  return (
    <div style={{ flexShrink: 0, scrollSnapAlign: 'center' }}>
      <div style={{ height: TRACK_IMG_H, display: 'flex', alignItems: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={slide.src}
          alt=""
          draggable={false}
          style={{ height: diagram ? TRACK_DIAGRAM_H : '100%', width: 'auto', display: 'block' }}
        />
      </div>
      {slide.caption
        ? <MobileCaption label={label} description={description} />
        : <div style={{ height: CAPTION_H }} />}
    </div>
  )
}

// ── 다이어그램 세트 — 탭 = 다음 서브슬라이드 + 타이머 리셋, 자동 진행 3000ms 공존 ──
function MobileDiagramSetSlide({ slide }: { slide: DiagramSetSlide }) {
  const [subIdx, setSubIdx] = useState(0)
  const downXRef = useRef<number | null>(null)
  const total = slide.items.length

  // setTimeout을 subIdx에 키잉 — 탭/자동 어느 쪽이든 진행 시 타이머가 자연 리셋된다
  useEffect(() => {
    const t = setTimeout(() => {
      setSubIdx(i => (i + 1) % total)
    }, slide.autoAdvanceMs ?? 3000)
    return () => clearTimeout(t)
  }, [subIdx, total, slide.autoAdvanceMs])

  const item = slide.items[subIdx]

  return (
    <div
      style={{ flexShrink: 0, scrollSnapAlign: 'center' }}
      onPointerDown={e => { downXRef.current = e.clientX }}
      onClick={e => {
        // 탭 판정 — 수평 이동 5px 미만 (스와이프와 구분)
        const dx = downXRef.current == null ? 0 : Math.abs(e.clientX - downXRef.current)
        if (dx < 5) setSubIdx(i => (i + 1) % total)
      }}
    >
      <div style={{ height: TRACK_IMG_H, display: 'flex', alignItems: 'center' }}>
        <div style={{ height: TRACK_DIAGRAM_H, position: 'relative' }}>
          {/* 사이저 — 첫 다이어그램 비율로 슬라이드 폭 결정 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slide.items[0].src}
            alt=""
            draggable={false}
            style={{ height: '100%', width: 'auto', display: 'block', visibility: 'hidden' }}
          />
          {slide.items.map((it, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={it.src}
              alt=""
              draggable={false}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                opacity: i === subIdx ? 1 : 0,
                transition: 'opacity 300ms ease',
              }}
            />
          ))}
        </div>
      </div>
      {/* 캡션 — 현재 서브슬라이드의 것 */}
      <MobileCaption label={item.label} description={item.description} />
    </div>
  )
}

// ── 크레딧 — 폭 70vw, 11px, 수직 중앙 ──
function MobileCreditsSlide({ slide }: { slide: CreditsSlide }) {
  return (
    <div style={{ flexShrink: 0, width: '70vw', scrollSnapAlign: 'center' }}>
      <div style={{ height: TRACK_IMG_H, display: 'flex', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
          {slide.rows.map((row, i) => (
            <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
              <div style={{
                width: 96,
                flexShrink: 0,
                textAlign: 'right',
                fontFamily: FONT,
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#0a0908',
                opacity: 0.5,
              }}>
                {row.label}
              </div>
              <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 400, color: '#0a0908' }}>
                {row.value}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ height: CAPTION_H }} />
    </div>
  )
}

// ── 정보 슬라이드 — BIG 문법: 메인 이미지 오른쪽 첫 번째. 폭 60vw, 수직 중앙 ──
function MobileInfoSlide({ project }: { project: Project }) {
  return (
    <div style={{ flexShrink: 0, width: '60vw', scrollSnapAlign: 'center' }}>
      <div style={{
        height: TRACK_IMG_H,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 16,
        fontFamily: FONT,
        color: '#080706',
      }}>
        <div style={{
          fontSize: 10,
          fontWeight: 300,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          opacity: 0.45,
        }}>
          {project.location ?? ''}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[['TYPOLOGY', project.type], ['STATUS', project.status], ['YEAR', String(project.year)]].map(([l, v]) => (
            <div key={l}>
              <div style={{ fontSize: 9, fontWeight: 300, letterSpacing: '0.1em', opacity: 0.45 }}>{l}</div>
              <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: 2 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ height: CAPTION_H }} />
    </div>
  )
}

function MobileSlide({ slide }: { slide: ProjectSlide }) {
  switch (slide.kind) {
    case 'image':
      return <MobileImageSlide slide={slide} />
    case 'diagramSet':
      return <MobileDiagramSetSlide slide={slide} />
    case 'credits':
      return <MobileCreditsSlide slide={slide} />
  }
}

// ── 확장 블록 — BACK 행 / 타이틀 행 / 트랙 [①히어로 ②정보 ③이후 슬라이드] / 카운터 행 ──
function ExpandedBlock({ project, onBack, heroRef, heroHidden, titleMorphing, titleRef }: {
  project: Project
  onBack: () => void
  heroRef: (el: HTMLDivElement | null) => void
  heroHidden: boolean
  titleMorphing: boolean                            // 상단 텍스트 → 타이틀 직접 보간 중 — 실제 행은 숨김
  titleRef: (el: HTMLDivElement | null) => void
}) {
  const restSlides = getRestSlides(project)
  const total = restSlides.length + 1   // 히어로 포함, 정보 슬라이드 제외
  const trackRef = useRef<HTMLDivElement>(null)
  const [counterIdx, setCounterIdx] = useState(1)

  // 스냅 안착 기준 카운터 — 트랙 중앙 최근접 자식 (0=히어로→01, 1=정보→01 유지, j≥2→j)
  const handleScroll = () => {
    const el = trackRef.current
    if (!el) return
    const center = el.scrollLeft + el.clientWidth / 2
    const children = Array.from(el.children) as HTMLElement[]
    if (children.length === 0) return
    let nearest = 0
    let nearestDist = Infinity
    children.forEach((c, i) => {
      const dist = Math.abs(c.offsetLeft + c.offsetWidth / 2 - center)
      if (dist < nearestDist) {
        nearestDist = dist
        nearest = i
      }
    })
    setCounterIdx(nearest <= 1 ? 1 : Math.min(nearest, total))
  }

  return (
    <div>
      {/* BACK 행 — 타이틀 보간 중 숨김, 모프 완료 시점에 타이틀 위로 페이드 인 */}
      <button
        onClick={onBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          height: BACK_ROW_H,
          padding: '0 16px',
          background: 'none',
          border: 'none',
          textAlign: 'left',
          fontFamily: FONT,
          fontSize: 11,
          fontWeight: 300,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#080706',
          cursor: 'pointer',
          opacity: titleMorphing ? 0 : 1,
          transition: 'opacity 200ms ease',
        }}
      >
        ← BACK
      </button>

      {/* 타이틀 행 — 2줄 허용. 보간 중에는 오버레이가 대신 렌더 (transition 없이 즉시 교대) */}
      <div
        ref={titleRef}
        style={{
          padding: '0 16px',
          marginBottom: 12,
          fontFamily: FONT,
          fontSize: 16,
          fontWeight: 600,
          lineHeight: 1.35,
          color: '#080706',
          wordBreak: 'keep-all',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical' as const,
          overflow: 'hidden',
          opacity: titleMorphing ? 0 : 1,
        }}
      >
        {project.title}
      </div>

      {/* 수평 트랙 — 스냅 + pan-x 고정. marginLeft 16 = 클립 라인, 초기 scrollLeft 0 = 히어로 정렬 */}
      <div
        ref={trackRef}
        className="mpw-track"
        onScroll={handleScroll}
        style={{
          position: 'relative',
          marginLeft: 16,
          paddingRight: 16,
          overflowX: 'auto',
          overflowY: 'hidden',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-x',
          overscrollBehaviorX: 'contain',
          scrollSnapType: 'x mandatory',
          scrollPaddingInline: '16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        {/* ① 히어로 — 성장 모프의 종착. 풀폭 3:2 */}
        <div style={{ flexShrink: 0, scrollSnapAlign: 'center' }}>
          <div
            ref={heroRef}
            style={{ width: HERO_W, height: TRACK_IMG_H, opacity: heroHidden ? 0 : 1 }}
          >
            {project.coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cldCard(project.coverImage, 800)}
                alt={project.title}
                draggable={false}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', background: project.coverColor }} />
            )}
          </div>
          <div style={{ height: CAPTION_H }} />
        </div>

        {/* ② 정보 슬라이드 */}
        <MobileInfoSlide project={project} />

        {/* ③ 이후 슬라이드들 */}
        {restSlides.map((slide, idx) => (
          <MobileSlide key={idx} slide={slide} />
        ))}
      </div>

      {/* 카운터 행 — 우정렬 */}
      <div style={{
        padding: '0 16px',
        textAlign: 'right',
        fontFamily: FONT,
        fontSize: 10,
        color: '#080706',
        opacity: 0.45,
      }}>
        {String(counterIdx).padStart(2, '0')} / {String(total).padStart(2, '0')}
      </div>
    </div>
  )
}

interface MobileProjectWallProps {
  projects: Project[]            // filteredProjects
  filterTypes: string[]          // FILTER_TYPES
  activeFilter: string
  onFilter: (t: string) => void
  activeSlug: string | null
  onActivate: (slug: string) => void
  onDeactivate: () => void
  revealed: boolean              // layoutVisible (introPhase === 'done')
  showFilters: boolean           // WORK 진입 시 true — 필터 칩 행 표시 여부 (M1)
}

type WallPhase = 'pre' | 'folding' | 'unfolding' | 'idle'

interface ViewRect {
  top: number
  left: number
  width: number
  height: number
}

// 모프 시작 시점 캡처 — 썸네일/히어로 rect + (d=0 경로) 타이틀 rect
interface PendingMorph {
  slug: string
  from: ViewRect
  titleFrom: { top: number; left: number } | null
}

/**
 * 모바일 콘덴스드 월 — 데스크톱 ProjectWall 문법의 축소·중앙정렬 이식.
 * [텍스트|썸네일] 페어 수직 피드 + 3단 크기 위계(뷰포트 중앙 기준) + 셔플 자동 스크롤.
 * 중앙 정렬 기준은 모든 티어에서 썸네일 단독의 중심 — 티어 전환 시 썸네일 수평 고정.
 * d=0에서만 텍스트가 썸네일 상단으로 이동(크로스페이드), 탭 시 상단 타이틀이
 * active 타이틀 행으로 직접 보간된다 (13→16px / w400→600, 모프와 동일 500ms·easing).
 * 탭 = 썸네일이 풀폭 히어로로 FLIP 성장 모프, 확장 블록은 가용 영역 수직 중앙 정렬.
 * 상태 소유는 LandingExperience (URL 동기화 일원화).
 */
export function MobileProjectWall({
  projects, filterTypes, activeFilter, onFilter,
  activeSlug, onActivate, onDeactivate, revealed, showFilters,
}: MobileProjectWallProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const itemEls = useRef<Record<string, HTMLDivElement | null>>({})
  const thumbEls = useRef<Record<string, HTMLElement | null>>({})
  const heroEls = useRef<Record<string, HTMLDivElement | null>>({})
  const blockEls = useRef<Record<string, HTMLDivElement | null>>({})
  const topTitleEls = useRef<Record<string, HTMLDivElement | null>>({})  // d=0 상단 타이틀
  const expTitleEls = useRef<Record<string, HTMLDivElement | null>>({})  // 확장 블록 타이틀

  // 마운트 직후 1프레임은 전환 비활성 — 딥링크 진입 시 모프 생략(즉시 확장 상태)
  const [transitionsOn, setTransitionsOn] = useState(false)
  const transitionsOnRef = useRef(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => {
      transitionsOnRef.current = true
      setTransitionsOn(true)
    }))
    return () => cancelAnimationFrame(raf)
  }, [])

  // ── 폴드/펼침 상태 머신 — displayList는 폴드 완료까지 이전 필터 결과를 유지 ──
  const [displayList, setDisplayList] = useState<Project[]>(projects)
  const [phase, setPhase] = useState<WallPhase>('pre')
  const projectsRef = useRef(projects)
  useEffect(() => { projectsRef.current = projects }, [projects])
  const displayLenRef = useRef(displayList.length)
  useEffect(() => { displayLenRef.current = displayList.length }, [displayList])

  // pre(접힘) 상태에서 인트로 완료/리스트 교체 시 펼침 시작
  useEffect(() => {
    if (!revealed || phase !== 'pre') return
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setPhase('unfolding')))
    return () => cancelAnimationFrame(raf)
  }, [revealed, phase])

  // 펼침 종료 → idle (지연이 묻은 transition을 해제해야 이후 모프가 오염되지 않음)
  useEffect(() => {
    if (phase !== 'unfolding') return
    const t = setTimeout(() => setPhase('idle'), UNFOLD_MS + UNFOLD_MAX_DELAY_MS + 100)
    return () => clearTimeout(t)
  }, [phase])

  // M3: 월(비확장) 상태의 "첫 아이템 상단 정렬"을 적용할 시점 표시 — 최초 mount + 필터 교체 직후
  const pendingTopAlignRef = useRef(true)

  // 필터 변경 → 접힘 → 80ms 정지 → 리스트 교체 + 펼침
  const firstFilterRef = useRef(true)
  useEffect(() => {
    if (firstFilterRef.current) {
      firstFilterRef.current = false
      return
    }
    setPhase('folding')
    const foldTotal = FOLD_MS + FOLD_STAGGER_MS * Math.max(0, displayLenRef.current - 1)
    const t = setTimeout(() => {
      setDisplayList(projectsRef.current)
      setPhase('pre')
      const c = containerRef.current
      if (c) c.scrollTop = 0
      setCenterIdx(0)
      pendingTopAlignRef.current = true   // M3: 필터 교체 후 펼침 완료(idle) 시 첫 아이템 상단 정렬
    }, foldTotal + FOLD_PAUSE_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter])

  // ── 위계 중심 — 뷰포트 수직 중앙 최근접 아이템 (rAF 스로틀) ──
  const [centerIdx, setCenterIdx] = useState(0)
  const centerRafRef = useRef<number | null>(null)
  const updateCenter = () => {
    const c = containerRef.current
    if (!c) return
    const center = c.scrollTop + c.clientHeight / 2
    let best = 0
    let bestD = Infinity
    displayList.forEach((p, i) => {
      const el = itemEls.current[p.id]
      if (!el) return
      const d = Math.abs(el.offsetTop + el.offsetHeight / 2 - center)
      if (d < bestD) {
        bestD = d
        best = i
      }
    })
    setCenterIdx(best)
  }
  useEffect(() => {
    if (phase === 'idle') updateCenter()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ── 셔플 / 프로그래매틱 스크롤 ──
  const lastUserRef = useRef(0)
  const lastShuffleRef = useRef(0)
  const programmaticRef = useRef(false)
  const scrollAnimRef = useRef<number | null>(null)
  const queueRef = useRef<string[]>([])
  const queueIdxRef = useRef(0)

  useEffect(() => {
    queueRef.current = shuffleArr(displayList.map(p => p.id))
    queueIdxRef.current = 0
  }, [displayList])

  const cancelScrollAnim = useCallback(() => {
    if (scrollAnimRef.current != null) cancelAnimationFrame(scrollAnimRef.current)
    scrollAnimRef.current = null
    programmaticRef.current = false
  }, [])

  // 스크롤·오버레이 공용 rAF 러너 — 목표는 매 프레임 재계산(동시 수축 등 레이아웃 변동 흡수)
  const animateScroll = useCallback((
    getTarget: () => number,
    ms: number,
    onFrame?: (e: number) => void,
    onDone?: () => void,
  ) => {
    cancelScrollAnim()
    const c = containerRef.current
    if (!c) return
    const start = performance.now()
    const s0 = c.scrollTop
    programmaticRef.current = true
    const step = (now: number) => {
      const cc = containerRef.current
      if (!cc) {
        cancelScrollAnim()
        return
      }
      const t = Math.min(1, (now - start) / ms)
      const e = easeFn(t)
      const target = Math.max(0, Math.min(getTarget(), cc.scrollHeight - cc.clientHeight))
      cc.scrollTop = s0 + (target - s0) * e
      onFrame?.(e)
      if (t < 1) {
        scrollAnimRef.current = requestAnimationFrame(step)
      } else {
        scrollAnimRef.current = null
        programmaticRef.current = false
        onDone?.()
      }
    }
    scrollAnimRef.current = requestAnimationFrame(step)
  }, [cancelScrollAnim])

  const advanceShuffle = useCallback(() => {
    if (queueIdxRef.current >= queueRef.current.length) {
      queueRef.current = shuffleArr(queueRef.current)
      queueIdxRef.current = 0
    }
    const slug = queueRef.current[queueIdxRef.current]
    queueIdxRef.current += 1
    const c = containerRef.current
    const el = itemEls.current[slug]
    if (!c || !el || !slug) return
    lastShuffleRef.current = Date.now()
    animateScroll(
      () => el.offsetTop + el.offsetHeight / 2 - c.clientHeight / 2,
      SHUFFLE_SCROLL_MS,
    )
  }, [animateScroll])

  // 셔플 타이머 — 무조작 6초 주기. 터치/스크롤/active 진입 시 정지, 무조작 8초 후 재개
  useEffect(() => {
    if (!revealed || activeSlug || phase !== 'idle') return
    lastShuffleRef.current = Date.now()
    const id = setInterval(() => {
      const now = Date.now()
      if (now - lastUserRef.current < SHUFFLE_RESUME_MS) return
      if (now - lastShuffleRef.current < SHUFFLE_INTERVAL_MS) return
      advanceShuffle()
    }, 500)
    return () => clearInterval(id)
  }, [revealed, activeSlug, phase, advanceShuffle])

  // ── 모프 (FLIP) ──
  const [overlay, setOverlay] = useState<{ src: string | null; color: string; init: ViewRect } | null>(null)
  const overlayElRef = useRef<HTMLDivElement>(null)
  // 타이틀 오버레이 — d=0 상단 텍스트 ↔ active 타이틀 직접 보간 (이미지 오버레이와 동일 rAF)
  const [titleOverlay, setTitleOverlay] = useState<{
    text: string
    init: { top: number; left: number }
    fontSize: number
    fontWeight: number
  } | null>(null)
  const titleOverlayElRef = useRef<HTMLDivElement>(null)
  const [morphSlug, setMorphSlug] = useState<string | null>(null)   // 모프 중 히어로/썸네일 숨김
  const pendingTapRef = useRef<PendingMorph | null>(null)
  const pendingBackRef = useRef<PendingMorph | null>(null)

  const clearMorphVisuals = useCallback(() => {
    setOverlay(null)
    setTitleOverlay(null)
    setMorphSlug(null)
  }, [])

  // 수축 중 아이템 — 모프 동안 트랙 콘텐츠 유지. 탭/BACK 경로는 언마운트 없이 동일 렌더에 반영
  const [closingSlug, setClosingSlug] = useState<string | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const markClosing = useCallback((slug: string) => {
    setClosingSlug(slug)
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => setClosingSlug(null), MORPH_MS + 50)
  }, [])

  const handleTap = (p: Project) => {
    if (phase === 'folding' || phase === 'pre') return
    if (p.id === activeSlug) return
    lastUserRef.current = Date.now()
    cancelScrollAnim()
    clearMorphVisuals()
    if (activeSlug) markClosing(activeSlug)
    const thumb = thumbEls.current[p.id]
    if (thumb && transitionsOnRef.current) {
      const r = thumb.getBoundingClientRect()
      // d=0 탭 — 상단 타이틀이 active 타이틀로 직접 보간되도록 시작 rect 캡처
      const i = displayList.findIndex(x => x.id === p.id)
      const d = Math.abs(i - Math.min(centerIdx, displayList.length - 1))
      const topTitle = d === 0 ? topTitleEls.current[p.id] : null
      const tr = topTitle ? topTitle.getBoundingClientRect() : null
      pendingTapRef.current = {
        slug: p.id,
        from: { top: r.top, left: r.left, width: r.width, height: r.height },
        titleFrom: tr ? { top: tr.top, left: tr.left } : null,
      }
    }
    onActivate(p.id)
  }

  const handleBack = (p: Project) => {
    lastUserRef.current = Date.now()
    cancelScrollAnim()
    clearMorphVisuals()
    markClosing(p.id)
    const hero = heroEls.current[p.id]
    if (hero && transitionsOnRef.current) {
      const r = hero.getBoundingClientRect()
      const expTitle = expTitleEls.current[p.id]
      const tr = expTitle ? expTitle.getBoundingClientRect() : null
      pendingBackRef.current = {
        slug: p.id,
        from: { top: r.top, left: r.left, width: r.width, height: r.height },
        titleFrom: tr ? { top: tr.top, left: tr.left } : null,
      }
    }
    onDeactivate()
  }

  // active 전환 — 확장: 모프 + 가용 영역 수직 중앙 스크롤 동시 진행 / 수축: 역모프 + 위계 중심 복귀
  const prevActiveRef = useRef<string | null>(activeSlug)
  useLayoutEffect(() => {
    const prev = prevActiveRef.current
    prevActiveRef.current = activeSlug
    if (activeSlug === prev) return
    const c = containerRef.current
    if (!c) return
    // 칩 행 숨김 시(루트에서 카드 바로 탭→확장 경로 포함) CHIPS_H 예약을 0으로 분기 (M1)
    const chipsH = showFilters ? CHIPS_H : 0
    const availCenter = chipsH + (c.clientHeight - chipsH) / 2
    const clamp = (v: number) => Math.max(0, Math.min(v, c.scrollHeight - c.clientHeight))

    if (activeSlug) {
      const itemEl = itemEls.current[activeSlug]
      const block = blockEls.current[activeSlug]
      const hero = heroEls.current[activeSlug]
      const project = displayList.find(p => p.id === activeSlug)
      if (!itemEl || !block) return
      const blockH = block.offsetHeight
      const getTarget = () => itemEl.offsetTop + blockH / 2 - availCenter

      if (!transitionsOnRef.current) {
        // 딥링크: 모프 생략, 즉시 중앙 정렬 위치
        c.scrollTop = clamp(getTarget())
        return
      }

      const pending = pendingTapRef.current
      pendingTapRef.current = null
      if (pending && pending.slug === activeSlug && hero && project) {
        // FLIP 성장 모프 — 썸네일 rect → 히어로 최종 rect (해석적 산출, 매 프레임 갱신)
        const heroOffset = hero.getBoundingClientRect().top - block.getBoundingClientRect().top
        const vw = window.innerWidth
        const heroW = vw - 32
        const heroH = heroW * 2 / 3
        const from = pending.from
        const titleFrom = pending.titleFrom
        const getTo = (): ViewRect => ({
          top: HEADER_H + itemEl.offsetTop + heroOffset - clamp(getTarget()),
          left: 16,
          width: heroW,
          height: heroH,
        })
        setOverlay({
          src: project.coverImage ? cldCard(project.coverImage, 480) : null,
          color: project.coverColor,
          init: from,
        })
        if (titleFrom) {
          setTitleOverlay({ text: project.title, init: titleFrom, fontSize: 13, fontWeight: 400 })
        }
        setMorphSlug(activeSlug)
        animateScroll(getTarget, MORPH_MS, (e) => {
          const el = overlayElRef.current
          if (el) {
            const to = getTo()
            el.style.top = `${from.top + (to.top - from.top) * e}px`
            el.style.left = `${from.left + (to.left - from.left) * e}px`
            el.style.width = `${from.width + (to.width - from.width) * e}px`
            el.style.height = `${from.height + (to.height - from.height) * e}px`
          }
          // 상단 타이틀 → active 타이틀 직접 보간 — 히어로 좌측(16px) 추종, 13→16px / w400→600
          const tEl = titleOverlayElRef.current
          if (tEl && titleFrom) {
            const toTop = HEADER_H + itemEl.offsetTop + BACK_ROW_H - clamp(getTarget())
            tEl.style.top = `${titleFrom.top + (toTop - titleFrom.top) * e}px`
            tEl.style.left = `${titleFrom.left + (16 - titleFrom.left) * e}px`
            tEl.style.fontSize = `${13 + 3 * e}px`
            tEl.style.fontWeight = String(Math.round(400 + 200 * e))
          }
        }, clearMorphVisuals)
      } else {
        animateScroll(getTarget, MORPH_MS)
      }
      return
    }

    if (prev) {
      const itemEl = itemEls.current[prev]
      const project = displayList.find(p => p.id === prev)
      if (!itemEl) return
      const tier0 = tierFor(0)
      // d=0 아이템 = 상단 텍스트 행(24px) + 썸네일 — 묶음 중심이 뷰포트 중앙에 오도록
      const getTarget = () => itemEl.offsetTop + (TOP_TEXT_H + tier0.h) / 2 - c.clientHeight / 2

      if (!transitionsOnRef.current) {
        c.scrollTop = clamp(getTarget())
        return
      }
      if (!closingSlug || closingSlug !== prev) markClosing(prev)   // popstate 경로

      const pending = pendingBackRef.current
      pendingBackRef.current = null
      if (pending && pending.slug === prev && project) {
        // 역모프 — 히어로 rect → 위계 중심(d=0) 썸네일 최종 rect. 중앙 기준 = 썸네일 단독의 중심
        const vw = window.innerWidth
        const thumbLeft = (vw - tier0.w) / 2
        const from = pending.from
        const titleFrom = pending.titleFrom
        const getTo = (): ViewRect => ({
          top: HEADER_H + itemEl.offsetTop + TOP_TEXT_H - clamp(getTarget()),
          left: thumbLeft,
          width: tier0.w,
          height: tier0.h,
        })
        setOverlay({
          src: project.coverImage ? cldCard(project.coverImage, 480) : null,
          color: project.coverColor,
          init: from,
        })
        if (titleFrom) {
          setTitleOverlay({ text: project.title, init: titleFrom, fontSize: 16, fontWeight: 600 })
        }
        setMorphSlug(prev)
        animateScroll(getTarget, MORPH_MS, (e) => {
          const el = overlayElRef.current
          if (el) {
            const to = getTo()
            el.style.top = `${from.top + (to.top - from.top) * e}px`
            el.style.left = `${from.left + (to.left - from.left) * e}px`
            el.style.width = `${from.width + (to.width - from.width) * e}px`
            el.style.height = `${from.height + (to.height - from.height) * e}px`
          }
          // active 타이틀 → 상단 타이틀 역보간 — 썸네일 좌측 에지 추종, 16→13px / w600→400
          const tEl = titleOverlayElRef.current
          if (tEl && titleFrom) {
            const toTop = HEADER_H + itemEl.offsetTop + (TOP_TEXT_H - 13 * 1.35) / 2 - clamp(getTarget())
            tEl.style.top = `${titleFrom.top + (toTop - titleFrom.top) * e}px`
            tEl.style.left = `${titleFrom.left + (thumbLeft - titleFrom.left) * e}px`
            tEl.style.fontSize = `${16 - 3 * e}px`
            tEl.style.fontWeight = String(Math.round(600 - 200 * e))
          }
        }, clearMorphVisuals)
      } else {
        animateScroll(getTarget, MORPH_MS)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSlug])

  // 딥링크: 펼침 완료 후 1회, 확장 아이템을 중앙 정렬 위치로 즉시 이동
  const deepLinkDoneRef = useRef(false)
  useEffect(() => {
    if (phase !== 'idle' || deepLinkDoneRef.current) return
    deepLinkDoneRef.current = true
    if (!activeSlug) return
    const c = containerRef.current
    const itemEl = itemEls.current[activeSlug]
    const block = blockEls.current[activeSlug]
    if (!c || !itemEl || !block) return
    const chipsH = showFilters ? CHIPS_H : 0
    const availCenter = chipsH + (c.clientHeight - chipsH) / 2
    const target = itemEl.offsetTop + block.offsetHeight / 2 - availCenter
    c.scrollTop = Math.max(0, Math.min(target, c.scrollHeight - c.clientHeight))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // M3: 월(비확장) 상태의 첫 아이템 상단 정렬 — 최초 진입 / 필터 교체 후 펼침 완료(idle) 시 1회.
  // active 확장 시의 availCenter 중앙 정렬(동결)과 별개. 첫 d=0 아이템의 top을 칩 행 바로 아래(칩 숨김 시 헤더 바로 아래)에 둔다.
  useEffect(() => {
    if (phase !== 'idle' || !pendingTopAlignRef.current) return
    pendingTopAlignRef.current = false
    if (activeSlug) return   // 딥링크/확장 경로는 별도 중앙 정렬 처리
    const c = containerRef.current
    const first = displayList[0] ? itemEls.current[displayList[0].id] : null
    if (!c || !first) return
    const chipsH = showFilters ? CHIPS_H : 0
    c.scrollTop = Math.max(0, Math.min(first.offsetTop - chipsH, c.scrollHeight - c.clientHeight))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // 언마운트 정리
  useEffect(() => () => {
    cancelScrollAnim()
    if (centerRafRef.current != null) cancelAnimationFrame(centerRafRef.current)
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
  }, [cancelScrollAnim])

  // ── 필터 칩 오버플로 그라디언트 ──
  const chipsRef = useRef<HTMLDivElement>(null)
  const [chipFade, setChipFade] = useState({ left: false, right: false })
  const updateChipFade = () => {
    const el = chipsRef.current
    if (!el) return
    setChipFade({
      left: el.scrollLeft > 1,
      right: el.scrollLeft < el.scrollWidth - el.clientWidth - 1,
    })
  }
  useEffect(() => {
    updateChipFade()
    window.addEventListener('resize', updateChipFade)
    return () => window.removeEventListener('resize', updateChipFade)
  }, [])

  // ── 칩 행 마우스 드래그-투-스크롤 (혼용 환경) — 터치는 네이티브 스크롤 유지 (M2) ──
  const chipDragRef = useRef<{ startX: number; startScroll: number; moved: boolean } | null>(null)
  const chipMovedRef = useRef(false)   // 드래그 직후 칩 클릭(필터 선택) 억제 플래그
  const onChipPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return   // 터치는 Pointer 드래그 미적용 (이중 스크롤 방지)
    const el = chipsRef.current
    if (!el) return
    chipMovedRef.current = false
    chipDragRef.current = { startX: e.clientX, startScroll: el.scrollLeft, moved: false }
    el.setPointerCapture(e.pointerId)
  }
  const onChipPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = chipDragRef.current
    const el = chipsRef.current
    if (!d || !el) return
    const dx = e.clientX - d.startX
    if (Math.abs(dx) >= 5) d.moved = true   // 5px 이상 이동 시에만 드래그로 판정
    el.scrollLeft = d.startScroll - dx
    updateChipFade()
  }
  const onChipPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = chipDragRef.current
    chipDragRef.current = null
    if (!d) return
    const el = chipsRef.current
    if (el && el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
    chipMovedRef.current = d.moved   // 이동량 ≥5px이면 직후 onClick(필터 선택) 억제
  }

  // ── 피드 스크롤 — 위계 갱신(rAF 스로틀) + 사용자 조작 판정(프로그래매틱 제외) ──
  const handleFeedScroll = () => {
    if (!programmaticRef.current) lastUserRef.current = Date.now()
    if (centerRafRef.current != null) return
    centerRafRef.current = requestAnimationFrame(() => {
      centerRafRef.current = null
      updateCenter()
    })
  }

  const handlePointerDown = () => {
    lastUserRef.current = Date.now()
    // 터치 시작 = 셔플 스크롤 즉시 정지
    if (programmaticRef.current) cancelScrollAnim()
  }

  const folded = phase === 'pre' || phase === 'folding'

  return (
    <div
      ref={containerRef}
      onScroll={handleFeedScroll}
      onPointerDown={handlePointerDown}
      onWheel={() => { lastUserRef.current = Date.now() }}
      style={{
        position: 'fixed',
        top: HEADER_H,
        left: 0,
        right: 0,
        bottom: 0,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        background: '#FFFFFF',
        fontFamily: FONT,
        opacity: revealed ? 1 : 0,
        transition: 'opacity 400ms ease-out',
      }}
    >
      {/* ── 필터 칩 행 — WORK 진입(showFilters) 시에만 렌더 (M1). sticky + 오버플로 화살표 ── */}
      {showFilters && (
      <div style={{ position: 'sticky', top: 0, zIndex: 5, height: CHIPS_H, background: '#FFFFFF' }}>
        <div
          ref={chipsRef}
          className="mpw-chips"
          onScroll={updateChipFade}
          onPointerDown={onChipPointerDown}
          onPointerMove={onChipPointerMove}
          onPointerUp={onChipPointerUp}
          style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            overflowX: 'auto',
            touchAction: 'pan-x',
            padding: '0 16px',
          }}
        >
          {filterTypes.map(t => (
            <button
              key={t}
              onClick={() => {
                // 마우스 드래그(이동 ≥5px) 직후의 클릭은 필터 선택으로 처리하지 않음 (M2)
                if (chipMovedRef.current) { chipMovedRef.current = false; return }
                onFilter(t)
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontFamily: FONT,
                fontSize: 11,
                fontWeight: t === activeFilter ? 500 : 300,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#080706',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {/* 불릿 — 선택된 항목 앞에만 */}
              <span style={{
                fontSize: 7,
                lineHeight: 1,
                opacity: t === activeFilter ? 1 : 0,
                transition: 'opacity 200ms',
              }}>●</span>
              {t}
            </button>
          ))}
        </div>

        {/* 오버플로 어포던스 — 스크롤 가능 방향에만 그라데이션 + 화살표 글리프 (데스크톱 필터 바와 동일) */}
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingLeft: 4,
          background: 'linear-gradient(to right, #FFFFFF, rgba(255,255,255,0))',
          color: '#080706',
          fontSize: 13,
          opacity: chipFade.left ? 1 : 0,
          transition: 'opacity 200ms ease',
          pointerEvents: 'none',
        }}>‹</div>
        <div style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingRight: 4,
          background: 'linear-gradient(to left, #FFFFFF, rgba(255,255,255,0))',
          color: '#080706',
          fontSize: 13,
          opacity: chipFade.right ? 1 : 0,
          transition: 'opacity 200ms ease',
          pointerEvents: 'none',
        }}>›</div>
      </div>
      )}

      {/* ── 콘덴스드 월 피드 — 상하 50vh 패딩으로 첫/마지막 아이템도 중앙 도달 가능 ── */}
      <div style={{ paddingTop: '50vh', paddingBottom: '50vh' }}>
        {displayList.map((p, i) => {
          const expanded = p.id === activeSlug
          const showTrack = expanded || p.id === closingSlug
          const isMorphTarget = morphSlug === p.id
          const titleMorphing = isMorphTarget && titleOverlay != null
          const d = Math.abs(i - Math.min(centerIdx, displayList.length - 1))
          const tier = tierFor(d)

          // 단계별 transition — 폴드/펼침은 stagger 지연 포함, idle은 모프 500ms
          let delayMs = 0
          let rowsTransition = 'none'
          let wrapTransition = 'none'
          if (transitionsOn && phase === 'folding') {
            delayMs = i * FOLD_STAGGER_MS
            rowsTransition = `grid-template-rows ${FOLD_MS}ms ease ${delayMs}ms`
            wrapTransition = `opacity ${FOLD_MS}ms ease ${delayMs}ms, margin-bottom ${FOLD_MS}ms ease ${delayMs}ms`
          } else if (transitionsOn && phase === 'unfolding') {
            delayMs = Math.min(i * UNFOLD_STAGGER_MS, UNFOLD_MAX_DELAY_MS)
            rowsTransition = `grid-template-rows ${UNFOLD_MS}ms ease-out ${delayMs}ms`
            wrapTransition = `opacity ${UNFOLD_MS}ms ease-out ${delayMs}ms, margin-bottom ${UNFOLD_MS}ms ease-out ${delayMs}ms`
          } else if (transitionsOn && phase === 'idle') {
            rowsTransition = `grid-template-rows ${MORPH_MS}ms ${EASE}`
            wrapTransition = 'none'
          }

          return (
            <div
              key={p.id}
              ref={el => { itemEls.current[p.id] = el }}
              style={{
                marginBottom: folded ? 0 : ITEM_GAP,
                opacity: folded ? 0 : 1,
                transition: wrapTransition,
              }}
            >
              {/* 페어 레이어 — 확장/폴드 시 0fr 수축 */}
              <div style={{ display: 'grid', gridTemplateRows: folded || expanded ? '0fr' : '1fr', transition: rowsTransition }}>
                <div style={{ overflow: 'hidden' }}>
                  <div
                    onClick={() => handleTap(p)}
                    style={{ opacity: tier.opacity, transition: 'opacity 400ms ease' }}
                  >
                    {/* 상단 텍스트 행 — d=0 전용. 높이 24px가 티어 transition(400ms)과 함께 보간 */}
                    <div style={{
                      height: d === 0 ? TOP_TEXT_H : 0,
                      overflow: 'hidden',
                      display: 'flex',
                      justifyContent: 'center',
                      transition: 'height 400ms ease',
                    }}>
                      <div style={{
                        width: tier.w,
                        display: 'flex',
                        alignItems: 'center',
                        gap: PAIR_GAP,
                        // 보간 중에는 크로스페이드 중단 — 모프 완료 시 타이틀이 즉시 제자리 교대
                        opacity: titleMorphing || d === 0 ? 1 : 0,
                        transition: titleMorphing
                          ? 'width 400ms ease'
                          : `width 400ms ease, opacity 150ms ease ${d === 0 ? 60 : 0}ms`,
                      }}>
                        {/* 프로젝트명 — 1줄 ellipsis. 탭 시 페이드 없이 오버레이가 직접 보간 */}
                        <div
                          ref={el => { topTitleEls.current[p.id] = el }}
                          style={{
                            minWidth: 0,
                            fontFamily: FONT,
                            fontSize: 13,
                            fontWeight: 400,
                            lineHeight: 1.35,
                            color: '#080706',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            visibility: titleMorphing ? 'hidden' : 'visible',
                          }}
                        >
                          {p.title}
                        </div>
                        {/* 카테고리 — 우측 병기, 탭 시 단독 페이드 아웃 (200ms) */}
                        <div style={{
                          flexShrink: 0,
                          marginLeft: 'auto',
                          fontFamily: FONT,
                          fontSize: 9,
                          fontWeight: 300,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          color: '#080706',
                          opacity: expanded ? 0 : 0.45,
                          transition: 'opacity 200ms ease',
                        }}>
                          {p.type}
                        </div>
                      </div>
                    </div>

                    {/* 썸네일 행 — 중앙 정렬 기준 = 썸네일 단독의 중심 (티어 전환 시 수평 고정) */}
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <div
                        ref={el => { thumbEls.current[p.id] = el }}
                        style={{
                          position: 'relative',
                          width: tier.w,
                          height: tier.h,
                          flexShrink: 0,
                          opacity: isMorphTarget ? 0 : 1,
                          transition: TIER_TRANSITION,
                        }}
                      >
                        {p.coverImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={cldCard(p.coverImage, 480)}
                            alt={p.title}
                            loading="lazy"
                            draggable={false}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100%', background: p.coverColor }} />
                        )}

                        {/* 측면 텍스트 — d≥1 페어 문법, 썸네일 좌측 바깥 배치. d=0 승격 시 상단과 크로스페이드 */}
                        <div style={{
                          position: 'absolute',
                          right: `calc(100% + ${PAIR_GAP}px)`,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: PAIR_TEXT_W,
                          textAlign: 'right',
                          opacity: d === 0 ? 0 : 1,
                          transition: `opacity 150ms ease ${d === 0 ? 0 : 60}ms`,
                        }}>
                          <div style={{
                            fontFamily: FONT,
                            fontSize: 13,
                            fontWeight: 400,
                            lineHeight: 1.3,
                            color: '#080706',
                            wordBreak: 'keep-all',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical' as const,
                            overflow: 'hidden',
                          }}>
                            {p.title}
                          </div>
                          <div style={{
                            marginTop: 2,
                            fontFamily: FONT,
                            fontSize: 9,
                            fontWeight: 300,
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            color: '#080706',
                            opacity: 0.45,
                          }}>
                            {p.type}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 확장(트랙) 레이어 */}
              <div style={{ display: 'grid', gridTemplateRows: !folded && expanded ? '1fr' : '0fr', transition: rowsTransition }}>
                <div style={{ overflow: 'hidden' }}>
                  {showTrack && (
                    <div ref={el => { blockEls.current[p.id] = el }}>
                      <ExpandedBlock
                        project={p}
                        onBack={() => handleBack(p)}
                        heroRef={el => { heroEls.current[p.id] = el }}
                        heroHidden={isMorphTarget}
                        titleMorphing={titleMorphing}
                        titleRef={el => { expTitleEls.current[p.id] = el }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── 모프 오버레이 — 썸네일 ↔ 히어로 FLIP. rAF에서 스크롤과 동일 곡선으로 보간 ── */}
      {overlay && (
        <div
          ref={overlayElRef}
          style={{
            position: 'fixed',
            top: overlay.init.top,
            left: overlay.init.left,
            width: overlay.init.width,
            height: overlay.init.height,
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: 60,
          }}
        >
          {overlay.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={overlay.src}
              alt=""
              draggable={false}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: overlay.color }} />
          )}
        </div>
      )}

      {/* ── 타이틀 오버레이 — 상단 텍스트 ↔ active 타이틀 직접 보간 (13↔16px / w400↔600) ── */}
      {titleOverlay && (
        <div
          ref={titleOverlayElRef}
          style={{
            position: 'fixed',
            top: titleOverlay.init.top,
            left: titleOverlay.init.left,
            fontFamily: FONT,
            fontSize: titleOverlay.fontSize,
            fontWeight: titleOverlay.fontWeight,
            lineHeight: 1.35,
            color: '#080706',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 61,
          }}
        >
          {titleOverlay.text}
        </div>
      )}
    </div>
  )
}
