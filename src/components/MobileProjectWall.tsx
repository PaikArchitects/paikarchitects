'use client'

// ── MobileProjectWall — 가상 링 렌더러 (MOBILE_RING_SPEC) ──
//
// 구세대 스크롤 문서 모델 폐기. 위치·티어·불투명도는 useRingWall의 offset과
// 애니메이션 높이 배열로부터의 순수 함수 파생이다 (데스크톱 ProjectWall 문법 동일).
// 브라우징 레이어(링)와 열람 레이어(트랙)를 분리 — 탭 시 FLIP 모프로 교대 (§6).
// 필터는 우측 슬라이드 패널(§7), 내비게이션은 SiteHeader의 햄버거 메뉴(§8)가 전담.
// 상태 소유는 LandingExperience (URL 동기화 일원화).

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CreditsSlide, DiagramSetSlide, ImageSlide, Project, ProjectSlide } from '@/types'
import { sanityCard } from '@/lib/imageUrl'
import { shuffle } from '@/lib/shuffle'
import { circDist, mod, useRingWall } from '@/hooks/useRingWall'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"

const HEADER_H = 56          // 모바일 헤더 바 높이 (SiteHeader .mobile-header-bar와 일치)
const EASE = 'cubic-bezier(0.7, 0, 0.3, 1)'
const MORPH_MS = 500         // FLIP 모프 + 레이어 교대 페이드
const BACK_ROW_H = 36        // 확장 블록 BACK 행 높이

// ── 링 티어 기하 — 폭의 연속 함수로 파생. 브레이크포인트 없음 (MOBILE_TIER_SCALE_SPEC §2) ──
// 티어0 = 히어로 폭 × 92%, 단 절대 상한 400px (태블릿 세로 과대화 방지)
const HERO_INSET = 32          // 트랙 히어로의 좌우 인셋 — HERO_W = 100vw - 32px와 일치
const TIER0_RATIO = 0.92       // 히어로 대비 티어0 폭
const TIER0_MAX = 400          // 절대 상한 (px)
const TIER0_MIN = 240          // 절대 하한 — 초소형 뷰포트 안전판 (폭 관찰 이전 프레임의 0나눗셈 방지)
// 티어1·2는 티어0에 대한 고정 비율 (현행 201/288, 114/288 승계)
const TIER1_RATIO = 0.698
const TIER2_RATIO = 0.396
const TIER_ASPECT = 3 / 2      // 전 티어 3:2 유지
const BELOW_TEXT_H = 40        // 이미지 하단 텍스트 행 (프로젝트명 + 용도 상하 배열)
const GAP = 14                 // ITEM_GAP 승계
const OPACITY = { 0: 1, 1: 0.45, 2: 0.3 } as const

// 티어 폭 파생 — 컨테이너 폭(px)이 유일한 입력. 순수 함수
const tierWidths = (cw: number) => {
  const hero = Math.max(cw - HERO_INSET, 0)
  const w0 = Math.min(Math.max(hero * TIER0_RATIO, TIER0_MIN), TIER0_MAX)
  return [w0, w0 * TIER1_RATIO, w0 * TIER2_RATIO] as const
}
// 슬롯 높이 = 이미지 높이(폭/1.5) + 텍스트 행. 전 티어 텍스트 하단 배치이므로 일괄 가산
const tierSlotHeights = (cw: number) => {
  const [w0, w1, w2] = tierWidths(cw)
  return [
    w0 / TIER_ASPECT + BELOW_TEXT_H,
    w1 / TIER_ASPECT + BELOW_TEXT_H,
    w2 / TIER_ASPECT + BELOW_TEXT_H,
  ] as const
}

// ── 트랙 수직 상수 — 히어로 H = (100vw − 32px) × 2/3. 어떤 슬라이드 조합에서도 총 높이 불변 ──
const HERO_W = 'calc(100vw - 32px)'
const TRACK_IMG_H = 'calc((100vw - 32px) * 2 / 3)'       // 이미지·정보·크레딧 슬라이드 = H
const TRACK_DIAGRAM_H = 'calc((100vw - 32px) * 4 / 9)'   // 다이어그램 = H × 2/3
const CAPTION_H = 28         // 캡션 영역 — 항상 고정 예약, 트랙 높이에 미포함

// ── 셔플 (§4, v4.1 상수 승계) ──
const SHUFFLE_INTERVAL_MS = 6000
const SHUFFLE_RESUME_MS = 8000

// ── 슬라이드 패널 (§7) ──
const PANEL_MS = 380

// 히어로(커버 3:2)가 트랙 첫 슬라이드 — slides 첫 항목이 커버와 동일 이미지면 중복 제거
function getRestSlides(project: Project): ProjectSlide[] {
  const slides = project.slides ?? []
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

  // ── 트랙 마우스 드래그-투-스크롤 (P1) — 마우스 전용. 터치/펜은 네이티브 스크롤 위임 (이중 스크롤 방지) ──
  const trackDrag = useRef<{ startX: number; startScroll: number; moved: boolean } | null>(null)
  const onTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return          // 터치/펜 = 네이티브 스크롤 위임
    const el = trackRef.current
    if (!el) return
    trackDrag.current = { startX: e.clientX, startScroll: el.scrollLeft, moved: false }
    el.setPointerCapture(e.pointerId)
  }
  const onTrackPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = trackDrag.current
    const el = trackRef.current
    if (!d || !el) return
    const dx = e.clientX - d.startX
    if (Math.abs(dx) >= 5) d.moved = true
    el.scrollLeft = d.startScroll - dx           // 스냅은 네이티브가 pointerup 후 처리
  }
  const onTrackPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = trackRef.current
    if (el && el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
    trackDrag.current = null
  }

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
        onPointerDown={onTrackPointerDown}
        onPointerMove={onTrackPointerMove}
        onPointerUp={onTrackPointerUp}
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
                src={sanityCard(project.coverImage, 800, project.coverHotspot)}
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
  showFilters: boolean           // [미사용] 필터 글리프가 revealed 동기 상시 표시로 전환되며 유일 소비처 소멸 — 외부 계약(LandingExperience) 불변을 위해 시그니처 유지
}

interface ViewRect {
  top: number
  left: number
  width: number
  height: number
}

// 모프 개시 시점 캡처 — 썸네일/히어로 rect + (d=0 경로) 타이틀 rect
interface PendingMorph {
  slug: string
  from: ViewRect
  titleFrom: { top: number; left: number } | null
}

interface TitleMorph {
  text: string
  from: { top: number; left: number; fontSize: number; fontWeight: number }
  to: { top: number; left: number; fontSize: number; fontWeight: number }
}

interface MorphState {
  slug: string
  src: string | null
  color: string
  from: ViewRect
  to: ViewRect
  title: TitleMorph | null
}

export function MobileProjectWall({
  projects, filterTypes, activeFilter, onFilter,
  activeSlug, onActivate, onDeactivate, revealed,
}: MobileProjectWallProps) {
  // ── 표시 순서 — 초기값은 projects 그대로(SSR/hydration 안전), 마운트 후 1회 셔플 (§4) ──
  const [order, setOrder] = useState<Project[]>(projects)
  const [phase, setPhase] = useState<'idle' | 'exit' | 'enter'>('idle')
  const orderRef = useRef(order)
  useEffect(() => { orderRef.current = order }, [order])

  const N = order.length

  // 마운트 직후 1프레임 전환 비활성 — 딥링크 진입 시 모프 생략 게이트 (§6-4)
  const [transitionsOn, setTransitionsOn] = useState(false)
  const transitionsOnRef = useRef(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => {
      transitionsOnRef.current = true
      setTransitionsOn(true)
    }))
    return () => cancelAnimationFrame(raf)
  }, [])

  // ── 티어 중심 = round(offset) — 별도 하이라이트 상태 변수 없음 (§3-2) ──
  const isLoopRef = useRef(true)
  const centerIdxRef = useRef(0)
  const [centerTick, setCenterTick] = useState(0)   // getSlotHeight 재생성 → 훅 웨이크 트리거

  // 컨테이너 폭 — 훅이 관찰. 첫 프레임은 0이며, ResizeObserver가 즉시 실측값을 커밋한다
  const [cw, setCw] = useState(0)
  const cwRef = useRef(0)
  cwRef.current = cw

  // 티어 슬롯 높이 — cw 파생. cw=0이면 하한(TIER0_MIN)이 적용되어 유효한 값이 나온다
  const slotHs = useMemo(() => tierSlotHeights(cw), [cw])
  const minSlot = slotHs[2]

  const getSlotHeight = useCallback((i: number) => {
    const c = centerIdxRef.current
    const d = isLoopRef.current ? circDist(i, c, N) : Math.abs(i - c)
    return slotHs[Math.min(d, 2)]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [N, centerTick, slotHs])

  const ring = useRingWall({ count: N, getSlotHeight, gap: GAP, minSlotHeight: minSlot })
  isLoopRef.current = ring.isLoop
  const { moveTo, jumpTo } = ring

  // 훅이 관찰한 폭을 상태로 승격 — 다음 렌더에서 티어가 재파생된다
  useEffect(() => {
    if (ring.containerWidth !== cwRef.current) setCw(ring.containerWidth)
  }, [ring.containerWidth])

  // 렌더 단계 파생 — round(offset)이 바뀌면 티어 목표 재생성 (렌더 중 상태 갱신 패턴)
  const liveCenter = N > 0
    ? (ring.isLoop ? mod(Math.round(ring.offset), N) : Math.min(Math.max(Math.round(ring.offset), 0), N - 1))
    : 0
  if (liveCenter !== centerIdxRef.current) {
    centerIdxRef.current = liveCenter
    setCenterTick(t => t + 1)
  }

  // ── 셔플 큐 (§4) — advanceShuffle은 moveTo 한 줄. scrollIntoView·종료 추정 타이머 없음 ──
  const queueRef = useRef<string[]>([])
  const queueIdxRef = useRef(0)
  const lastUserRef = useRef(0)
  const lastShuffleRef = useRef(0)
  const pendingJumpRef = useRef(false)

  // 마운트 후 1회 Fisher-Yates — 인트로가 교체를 가린다
  useEffect(() => {
    setOrder(prev => shuffle(prev))
  }, [])

  // order 교체 시 큐 재생성 + (필터 스왑이면) 큐 첫 항목으로 즉시 점프 (§5)
  useEffect(() => {
    queueRef.current = shuffle(order.map(p => p.id))
    queueIdxRef.current = 0
    if (pendingJumpRef.current) {
      pendingJumpRef.current = false
      const idx = Math.max(0, order.findIndex(p => p.id === queueRef.current[0]))
      centerIdxRef.current = idx   // jumpTo가 재구성할 높이 배열의 중심을 선반영
      setCenterTick(t => t + 1)
      jumpTo(idx)
      queueIdxRef.current = 1
      lastShuffleRef.current = Date.now()
    }
  }, [order, jumpTo])

  // 초기 정착 — revealed 직후 랜덤 큐 첫 항목을 정중앙으로 1회 jumpTo (§4)
  const settledInitRef = useRef(false)
  useEffect(() => {
    if (!revealed || settledInitRef.current) return
    settledInitRef.current = true
    if (activeSlug) return   // 딥링크 — 활성 카드가 이미 중앙 (§6-4)
    const idx = Math.max(0, orderRef.current.findIndex(p => p.id === queueRef.current[0]))
    centerIdxRef.current = idx
    setCenterTick(t => t + 1)
    jumpTo(idx)
    queueIdxRef.current = 1
    lastShuffleRef.current = Date.now()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, jumpTo])

  const advanceShuffle = useCallback(() => {
    if (queueIdxRef.current >= queueRef.current.length) {
      queueRef.current = shuffle(queueRef.current)
      queueIdxRef.current = 0
    }
    const slug = queueRef.current[queueIdxRef.current]
    queueIdxRef.current += 1
    const idx = orderRef.current.findIndex(p => p.id === slug)
    if (idx < 0) return
    lastShuffleRef.current = Date.now()
    moveTo(idx)
  }, [moveTo])

  // 셔플 타이머 — 6000ms 주기 / 조작 후 8000ms 유예 / 500ms 폴링. N<2 미가동 (§4·§9)
  useEffect(() => {
    if (!revealed || activeSlug !== null || phase !== 'idle' || N < 2) return
    lastShuffleRef.current = Date.now()
    const id = setInterval(() => {
      const now = Date.now()
      if (now - lastUserRef.current < SHUFFLE_RESUME_MS) return
      if (now - lastShuffleRef.current < SHUFFLE_INTERVAL_MS) return
      advanceShuffle()
    }, 500)
    return () => clearInterval(id)
  }, [revealed, activeSlug, phase, N, advanceShuffle])

  // ── 필터 2단 시퀀스 — exit 캐스케이드 → 셔플 스왑 + jumpTo → enter 캐스케이드 (§5) ──
  const sourceRef = useRef(projects)
  useEffect(() => {
    if (projects === sourceRef.current) return
    setPhase('exit')                       // 1) 전 카드 페이드아웃, 중앙에서 바깥으로
    const t = setTimeout(() => {
      sourceRef.current = projects
      pendingJumpRef.current = true        // 새 큐 첫 항목으로 jumpTo (order 효과에서)
      setOrder(shuffle(projects))          // 2) 스왑 — 필터마다 새로 셔플
      setPhase('enter')
    }, 350)
    return () => clearTimeout(t)
  }, [projects])

  // enter → 더블 rAF 후 idle — 재입장 캐스케이드 재생
  useEffect(() => {
    if (phase !== 'enter') return
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setPhase('idle')))
    return () => cancelAnimationFrame(raf)
  }, [phase])

  // ── 열람 레이어 (§6) — 브라우징(링)/열람(트랙) 분리. 상태는 부모 소유 ──
  const activeProject = activeSlug
    ? order.find(p => p.id === activeSlug) ?? projects.find(p => p.id === activeSlug) ?? null
    : null
  const [closingProject, setClosingProject] = useState<Project | null>(null)
  const viewerProject = activeProject ?? closingProject

  // 열람 레이어 페이드 인 — 마운트 프레임은 opacity 0, 더블 rAF 후 1 (딥링크는 즉시)
  const [viewerIn, setViewerIn] = useState(activeSlug !== null)
  useEffect(() => {
    if (!activeSlug) {
      setViewerIn(false)
      return
    }
    if (!transitionsOnRef.current) {
      setViewerIn(true)
      return
    }
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setViewerIn(true)))
    return () => cancelAnimationFrame(raf)
  }, [activeSlug])

  const viewerHeroRef = useRef<HTMLDivElement | null>(null)
  const viewerTitleRef = useRef<HTMLDivElement | null>(null)
  const thumbEls = useRef<Record<string, HTMLDivElement | null>>({})
  const topTitleEls = useRef<Record<string, HTMLDivElement | null>>({})

  // ── FLIP 모프 — CSS transition 500ms (rAF 러너·JS 이징 폐기, §6-2) ──
  const [morph, setMorph] = useState<MorphState | null>(null)
  const [morphGo, setMorphGo] = useState(false)
  const morphSlug = morph?.slug ?? null
  const morphTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const morphRafRef = useRef<number | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const startMorph = useCallback((m: MorphState) => {
    if (morphTimerRef.current) clearTimeout(morphTimerRef.current)
    if (morphRafRef.current != null) cancelAnimationFrame(morphRafRef.current)
    setMorph(m)
    setMorphGo(false)
    morphRafRef.current = requestAnimationFrame(() => {
      morphRafRef.current = requestAnimationFrame(() => setMorphGo(true))
    })
    morphTimerRef.current = setTimeout(() => {
      setMorph(null)
      setMorphGo(false)
    }, MORPH_MS + 50)
  }, [])

  const pendingTapRef = useRef<PendingMorph | null>(null)
  const pendingBackRef = useRef<PendingMorph | null>(null)

  // 탭 — 썸네일 rect 캡처(+d=0이면 상단 타이틀 rect) → onActivate + moveTo (§6-2)
  const handleTap = (p: Project, index: number) => {
    if (phase !== 'idle') return
    if (p.id === activeSlug) return
    lastUserRef.current = Date.now()
    const thumb = thumbEls.current[p.id]
    if (thumb && transitionsOnRef.current) {
      const r = thumb.getBoundingClientRect()
      const d = ring.isLoop ? circDist(index, centerIdxRef.current, N) : Math.abs(index - centerIdxRef.current)
      const topTitle = d === 0 ? topTitleEls.current[p.id] : null
      const tr = topTitle ? topTitle.getBoundingClientRect() : null
      pendingTapRef.current = {
        slug: p.id,
        from: { top: r.top, left: r.left, width: r.width, height: r.height },
        titleFrom: tr ? { top: tr.top, left: tr.left } : null,
      }
    }
    onActivate(p.id)          // URL push는 부모 소유
    moveTo(index)             // BACK 복귀 대비 중앙 정렬
  }

  // BACK — 히어로/타이틀 rect 캡처 → 열람 레이어 유지(페이드아웃) → onDeactivate (§6-3)
  const handleBack = () => {
    lastUserRef.current = Date.now()
    const project = viewerProject
    if (project && transitionsOnRef.current) {
      const hero = viewerHeroRef.current
      const title = viewerTitleRef.current
      if (hero) {
        const r = hero.getBoundingClientRect()
        const tr = title ? title.getBoundingClientRect() : null
        pendingBackRef.current = {
          slug: project.id,
          from: { top: r.top, left: r.left, width: r.width, height: r.height },
          titleFrom: tr ? { top: tr.top, left: 16 } : null,
        }
        setClosingProject(project)   // 역모프 동안 열람 레이어 마운트 유지
      }
    }
    onDeactivate()   // 시퀀스 개시 시점에 호출 — 상태는 부모 소유
  }

  // active 전환 — 확장: FLIP 모프(캡처 rect → 실측 히어로 rect) / 수축: 역모프(산식 목표)
  const prevActiveRef = useRef<string | null>(null)
  useLayoutEffect(() => {
    const prev = prevActiveRef.current
    prevActiveRef.current = activeSlug
    if (activeSlug === prev) return

    if (activeSlug) {
      setClosingProject(null)
      const idx = order.findIndex(p => p.id === activeSlug)
      const pending = pendingTapRef.current
      pendingTapRef.current = null

      if (!transitionsOnRef.current) {
        // 딥링크 — 모프 생략, 열람 레이어 즉시 표시 + 중앙 정렬 (§6-4)
        if (idx >= 0) {
          centerIdxRef.current = idx
          setCenterTick(t => t + 1)
          jumpTo(idx)
        }
        return
      }

      if (pending && pending.slug === activeSlug && activeProject) {
        // 히어로 최종 rect — 열람 레이어는 이 커밋에 마운트 완료, 실측 가능 (§6-2)
        const hero = viewerHeroRef.current
        const title = viewerTitleRef.current
        if (hero) {
          const hr = hero.getBoundingClientRect()
          const vw = window.innerWidth
          const heroW = vw - 32
          startMorph({
            slug: activeSlug,
            src: activeProject.coverImage ? sanityCard(activeProject.coverImage, 480, activeProject.coverHotspot) : null,
            color: activeProject.coverColor,
            from: pending.from,
            to: { top: hr.top, left: 16, width: heroW, height: heroW * 2 / 3 },
            title: pending.titleFrom && title ? {
              text: activeProject.title,
              from: { ...pending.titleFrom, fontSize: 13, fontWeight: 400 },
              to: { top: title.getBoundingClientRect().top, left: 16, fontSize: 16, fontWeight: 600 },
            } : null,
          })
        }
      } else if (idx >= 0) {
        moveTo(idx)   // popstate 경유 활성 — 모프 생략, 중앙 정렬만 (§6-4)
      }
      return
    }

    if (prev) {
      const pending = pendingBackRef.current
      pendingBackRef.current = null
      const project = order.find(p => p.id === prev) ?? null
      if (!transitionsOnRef.current || !pending || pending.slug !== prev || !project) {
        // 필터 중 확장 해제 / popstate 해제 — 역모프 생략, 즉시 해제 (§6-4)
        setClosingProject(null)
        return
      }
      // 역모프 목표 — 산식으로 결정적: 링 중앙 d=0 썸네일 rect (§6-3)
      // 티어 기하는 현재 컨테이너 폭에서 파생 — 렌더 경로와 동일한 함수를 쓴다
      const vw = window.innerWidth
      const containerH = window.innerHeight - HEADER_H
      const [w0] = tierWidths(cwRef.current || vw)   // 폭 미관찰 시 뷰포트 폭으로 폴백
      const h0 = w0 / TIER_ASPECT                     // 이미지 높이 (3:2)
      const slot0 = h0 + BELOW_TEXT_H                 // 슬롯 전체 높이 = 이미지 + 하단 텍스트 행
      const cardTop = HEADER_H + containerH / 2 - slot0 / 2   // 슬롯 상단 (= 이미지 상단)
      const thumbLeft = (vw - w0) / 2
      startMorph({
        slug: prev,
        src: project.coverImage ? sanityCard(project.coverImage, 480, project.coverHotspot) : null,
        color: project.coverColor,
        from: pending.from,
        // 이미지가 슬롯 최상단 — TOP_TEXT_H 가산 없음 (텍스트는 하단으로 이동함)
        to: { top: cardTop, left: thumbLeft, width: w0, height: h0 },
        title: pending.titleFrom ? {
          text: project.title,
          from: { ...pending.titleFrom, fontSize: 16, fontWeight: 600 },
          // 타이틀 종착 — 이미지 하단 텍스트 행의 첫 줄. paddingTop 6은 §3-3 렌더와 일치
          to: { top: cardTop + h0 + 6, left: thumbLeft, fontSize: 13, fontWeight: 400 },
        } : null,
      })
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      closeTimerRef.current = setTimeout(() => setClosingProject(null), MORPH_MS + 50)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSlug])

  // 언마운트 정리
  useEffect(() => () => {
    if (morphTimerRef.current) clearTimeout(morphTimerRef.current)
    if (morphRafRef.current != null) cancelAnimationFrame(morphRafRef.current)
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
  }, [])

  // ── 필터 패널 (§7) — 로컬 상태. 메뉴 패널(SiteHeader)과 각자 스크림으로 상호 독립 ──
  const [filterOpen, setFilterOpen] = useState(false)

  const ringHidden = activeSlug !== null

  return (
    <>
      {/* ── 브라우징 레이어 — 가상 링. 스크롤 요소 아님, 입력은 useRingWall 전담 (§3-4) ── */}
      <div
        ref={ring.containerRef}
        onPointerDown={() => { lastUserRef.current = Date.now() }}
        onWheel={() => { lastUserRef.current = Date.now() }}
        style={{
          position: 'fixed',
          top: HEADER_H,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
          background: '#FFFFFF',
          fontFamily: FONT,
          touchAction: 'none',
          opacity: revealed && !ringHidden ? 1 : 0,
          pointerEvents: ringHidden ? 'none' : 'auto',
          transition: ringHidden || closingProject
            ? `opacity ${MORPH_MS}ms ${EASE}`
            : 'opacity 400ms ease-out',
        }}
      >
        {ring.slots.map(({ slot, index, turn, yCenter }) => {
          const p = order[index]
          if (!p) return null
          const h = ring.heights[index] ?? slotHs[2]      // 물리 루프가 보간 중인 슬롯 높이
          const thumbH = Math.max(h - BELOW_TEXT_H, 0)    // 이미지 높이 — 슬롯에서 텍스트 행 차감
          const thumbW = thumbH * TIER_ASPECT             // 폭은 3:2에서 파생 (측정 없음)
          const d = ring.isLoop ? circDist(index, liveCenter, N) : Math.abs(index - liveCenter)
          const tierOpacity = OPACITY[Math.min(d, 2) as 0 | 1 | 2]
          const exiting = phase === 'exit'
          const shown = revealed && phase === 'idle'
          const delay = Math.abs(slot) * (exiting ? 15 : 40)
          const titleMorphing = morphSlug === p.id && morph?.title != null

          return (
            // 외피(위치 계층) — 위치·크기에 CSS transition 금지: 운동은 전량 물리 루프 공급
            <div
              key={`${p.id}#${turn}`}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: h,
                transform: `translateY(${yCenter - h / 2}px)`,
              }}
            >
              {/* 내피(현출 계층) — 필터 exit/enter 캐스케이드 전담 (§5) */}
              <div
                onClick={() => handleTap(p, index)}
                style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: 'pointer',
                  opacity: exiting ? 0 : shown ? 1 : 0,
                  transform: exiting ? 'translateY(-16px)' : shown ? 'translateY(0)' : 'translateY(8px)',
                  transition: transitionsOn
                    ? exiting
                      ? `opacity 250ms ease-in ${delay}ms, transform 250ms ease-in ${delay}ms`
                      : `opacity 400ms ease ${delay}ms, transform 400ms ease ${delay}ms`
                    : 'none',
                }}
              >
                {/* 티어 불투명도 계층 — 이산 d 기준 (§3-3) */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  opacity: tierOpacity,
                  transition: 'opacity 300ms ease',
                }}>
                  {/* 썸네일 — 전 구간 3:2, 커버 부재 시 단색 폴백 */}
                  <div
                    ref={el => { thumbEls.current[p.id] = el }}
                    style={{
                      width: thumbW,
                      height: thumbH,
                      opacity: morphSlug === p.id ? 0 : 1,
                    }}
                  >
                    {p.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={sanityCard(p.coverImage, 480, p.coverHotspot)}
                        alt={p.title}
                        loading="lazy"
                        draggable={false}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: p.coverColor }} />
                    )}
                  </div>

                  {/* 텍스트 행 — 전 티어 공통. 썸네일 하단, 폭 일치, 좌측 정렬 */}
                  <div style={{
                    width: thumbW,
                    height: BELOW_TEXT_H,
                    paddingTop: 6,
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    textAlign: 'left',
                  }}>
                    {/* 프로젝트명 — 1줄 ellipsis (텍스트 행 높이 고정 보장) */}
                    <div
                      ref={el => { topTitleEls.current[p.id] = el }}
                      style={{
                        fontSize: 13,
                        fontWeight: 400,
                        lineHeight: 1.3,
                        color: '#080706',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        visibility: titleMorphing ? 'hidden' : 'visible',
                      }}
                    >
                      {p.title}
                    </div>
                    {/* 용도 — 1줄 ellipsis */}
                    <div style={{
                      marginTop: 2,
                      fontSize: 9,
                      fontWeight: 300,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: '#080706',
                      opacity: 0.45,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {p.type}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── 열람 레이어 (§6-1) — 가용 영역 수직 중앙: BACK/타이틀/트랙/카운터 ── */}
      {viewerProject && (
        <div style={{
          position: 'fixed',
          top: HEADER_H,
          left: 0,
          right: 0,
          bottom: 0,
          background: '#FFFFFF',
          zIndex: 40,
          fontFamily: FONT,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          opacity: activeSlug && viewerIn ? 1 : 0,
          pointerEvents: activeSlug ? 'auto' : 'none',
          transition: transitionsOn ? `opacity ${MORPH_MS}ms ${EASE}` : 'none',
        }}>
          <ExpandedBlock
            project={viewerProject}
            onBack={handleBack}
            heroRef={el => { viewerHeroRef.current = el }}
            heroHidden={morphSlug === viewerProject.id}
            titleMorphing={morphSlug === viewerProject.id && morph?.title != null}
            titleRef={el => { viewerTitleRef.current = el }}
          />
        </div>
      )}

      {/* ── 모프 오버레이 — 캡처 rect → 종착 rect, CSS transition 500ms (§6-2) ── */}
      {morph && (
        <div style={{
          position: 'fixed',
          top: morphGo ? morph.to.top : morph.from.top,
          left: morphGo ? morph.to.left : morph.from.left,
          width: morphGo ? morph.to.width : morph.from.width,
          height: morphGo ? morph.to.height : morph.from.height,
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: 60,
          transition: morphGo
            ? `top ${MORPH_MS}ms ${EASE}, left ${MORPH_MS}ms ${EASE}, width ${MORPH_MS}ms ${EASE}, height ${MORPH_MS}ms ${EASE}`
            : 'none',
        }}>
          {morph.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={morph.src}
              alt=""
              draggable={false}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: morph.color }} />
          )}
        </div>
      )}

      {/* ── 타이틀 직접 보간 (d=0 탭/BACK 한정) — 13↔16px / w400↔600, 동일 500ms·이징 ── */}
      {morph?.title && (
        <div style={{
          position: 'fixed',
          top: morphGo ? morph.title.to.top : morph.title.from.top,
          left: morphGo ? morph.title.to.left : morph.title.from.left,
          fontFamily: FONT,
          fontSize: morphGo ? morph.title.to.fontSize : morph.title.from.fontSize,
          fontWeight: morphGo ? morph.title.to.fontWeight : morph.title.from.fontWeight,
          lineHeight: 1.35,
          color: '#080706',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 61,
          transition: morphGo
            ? `top ${MORPH_MS}ms ${EASE}, left ${MORPH_MS}ms ${EASE}, font-size ${MORPH_MS}ms ${EASE}, font-weight ${MORPH_MS}ms ${EASE}`
            : 'none',
        }}>
          {morph.title.text}
        </div>
      )}

      {/* ── 필터 글리프 + 우측 슬라이드 패널 (§7) — 햄버거와 동일하게 인트로 완료(revealed)와 동기해 상시 표시 ── */}
      {revealed && (
        <>
          {/* 트리거 — 헤더 존 우측. 길이가 체감하는 수평선 3개 (햄버거와 구분).
               SVG 통일 기하: viewBox 0 0 18 14, 선 중심 y=1/7/13 — 햄버거와 전체 높이·두께·수직 위치 동일 */}
          <button
            aria-label="Filter"
            onClick={() => setFilterOpen(o => !o)}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              width: 56,
              height: 56,
              zIndex: 95,   // 헤더 바 90 위, 워드마크 200 아래
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: '#080706',
              opacity: revealed ? 1 : 0,
              pointerEvents: revealed ? 'auto' : 'none',
              transition: 'opacity 400ms ease-out',
            }}
          >
            <svg
              viewBox="0 0 18 14"
              width={18}
              height={14}
              style={{ display: 'block' }}
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="butt"
            >
              <line x1="0" y1="1" x2="18" y2="1" />
              <line x1="3" y1="7" x2="15" y2="7" />
              <line x1="6" y1="13" x2="12" y2="13" />
            </svg>
          </button>

          {/* 스크림 — 탭 시 닫힘 */}
          <div
            onClick={() => setFilterOpen(false)}
            aria-hidden="true"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(8, 7, 6, 0.25)',
              zIndex: 110,
              opacity: filterOpen ? 1 : 0,
              pointerEvents: filterOpen ? 'auto' : 'none',
              transition: `opacity ${PANEL_MS}ms ${EASE}`,
            }}
          />

          {/* 패널 — 우측 슬라이드 인 */}
          <div style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: 'min(62vw, 280px)',
            background: '#FFFFFF',
            zIndex: 120,
            transform: filterOpen ? 'translateX(0)' : 'translateX(100%)',
            transition: `transform ${PANEL_MS}ms ${EASE}`,
            boxShadow: '-8px 0 24px rgba(0, 0, 0, 0.06)',
            padding: '72px 16px 24px 24px',
            overflowY: 'auto',
            fontFamily: FONT,
          }}>
            {filterTypes.map(t => (
              <button
                key={t}
                onClick={() => {
                  setFilterOpen(false)
                  onFilter(t)   // §5 시퀀스가 이어진다
                }}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 8,
                  width: '100%',
                  padding: '12px 0',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: FONT,
                  fontSize: 12,
                  fontWeight: t === activeFilter ? 500 : 300,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#080706',
                  wordBreak: 'keep-all',   // 장문 라벨 2줄 허용
                }}
              >
                {/* 불릿 — 활성 항목 앞에만 (칩 문법 승계) */}
                <span style={{
                  fontSize: 7,
                  lineHeight: 1,
                  flexShrink: 0,
                  opacity: t === activeFilter ? 1 : 0,
                  transition: 'opacity 200ms',
                }}>●</span>
                <span>{t}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  )
}
