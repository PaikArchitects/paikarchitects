'use client'

import { useEffect, useRef, useState } from 'react'
import type { CreditsSlide, DiagramSetSlide, ImageSlide, Project, ProjectSlide } from '@/types'
import { projectSlides } from '@/data/projectSlides'
import { cldCard } from '@/lib/cloudinary'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"

const HEADER_H = 56          // 모바일 헤더 바 높이 (SiteHeader .mobile-header-bar와 일치)
const CHIPS_H = 44           // 필터 칩 행 높이
const EASE = 'cubic-bezier(0.7, 0, 0.3, 1)'
const MORPH_MS = 500         // 카드 ↔ 트랙 모프
const TRACK_H = '36vh'       // 이미지·정보·크레딧 슬라이드 높이
const DIAGRAM_H = '24vh'     // 다이어그램 높이 — 데스크톱 72%/48% 이분법과 동일 비례(2/3)
const CAPTION_H = 28         // 캡션 영역 — 트랙 높이에 미포함, 하단 고정
const CASCADE_STAGGER_MS = 60
const CASCADE_MAX_DELAY_MS = 600

function getSlides(project: Project): ProjectSlide[] {
  return projectSlides[project.id]
    ?? (project.coverImage ? [{ kind: 'image', src: project.coverImage }] : [])
}

function splitCaption(caption: string): { label: string; description: string } {
  const sepIdx = caption.indexOf('—')
  if (sepIdx < 0) return { label: caption, description: '' }
  return {
    label: caption.slice(0, sepIdx).trim(),
    description: caption.slice(sepIdx + 1).trim(),
  }
}

// ── 캡션 — 슬라이드 폭 내 줄바꿈, 최대 2줄. width:0 + minWidth:100% = 이미지 폭에 강제 맞춤 ──
function MobileCaption({ label, description }: { label: string; description: string }) {
  return (
    <div style={{ height: CAPTION_H, paddingTop: 6, width: 0, minWidth: '100%' }}>
      <div style={{
        fontFamily: FONT,
        fontSize: 10,
        fontWeight: 300,
        lineHeight: 1.3,
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

// ── 이미지 슬라이드 — 높이 36vh(다이어그램 표기 시 24vh 수직 중앙), 폭은 비율이 결정 ──
function MobileImageSlide({ slide }: { slide: ImageSlide }) {
  const { label, description } = slide.caption
    ? splitCaption(slide.caption)
    : { label: '', description: '' }
  const diagram = slide.diagram === true

  return (
    <div style={{ flexShrink: 0 }}>
      <div style={{ height: TRACK_H, display: 'flex', alignItems: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={slide.src}
          alt=""
          draggable={false}
          style={{ height: diagram ? DIAGRAM_H : '100%', width: 'auto', display: 'block' }}
        />
      </div>
      {slide.caption
        ? <MobileCaption label={label} description={description} />
        : <div style={{ height: CAPTION_H }} />}
    </div>
  )
}

// ── 다이어그램 세트 — 자동 진행 3000ms 루프. 서브 화살표·호버 일시정지는 모바일 미적용 ──
function MobileDiagramSetSlide({ slide }: { slide: DiagramSetSlide }) {
  const [subIdx, setSubIdx] = useState(0)
  const total = slide.items.length

  useEffect(() => {
    const id = setInterval(() => {
      setSubIdx(i => (i + 1) % total)
    }, slide.autoAdvanceMs ?? 3000)
    return () => clearInterval(id)
  }, [total, slide.autoAdvanceMs])

  const item = slide.items[subIdx]

  return (
    <div style={{ flexShrink: 0 }}>
      <div style={{ height: TRACK_H, display: 'flex', alignItems: 'center' }}>
        <div style={{ height: DIAGRAM_H, position: 'relative' }}>
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
    <div style={{ flexShrink: 0, width: '70vw' }}>
      <div style={{ height: TRACK_H, display: 'flex', alignItems: 'center' }}>
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

// ── 정보 슬라이드 — 트랙 첫 요소. 폭 60vw, 수직 중앙. 타이틀은 §2-B 고정 행이 전담 ──
function MobileInfoSlide({ project }: { project: Project }) {
  return (
    <div style={{ flexShrink: 0, width: '60vw' }}>
      <div style={{
        height: TRACK_H,
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

// ── 확장 아이템 — BACK 행 / 타이틀 행 / 수평 트랙 / 카운터 행 ──
function ExpandedTrack({ project, onBack }: { project: Project; onBack: () => void }) {
  const slides = getSlides(project)
  const total = Math.max(slides.length, 1)
  const trackRef = useRef<HTMLDivElement>(null)
  const [counterIdx, setCounterIdx] = useState(1)

  // 뷰포트 중앙에 가장 가까운 슬라이드 인덱스 (자식 0 = 정보 슬라이드 제외)
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
    setCounterIdx(Math.min(Math.max(nearest, 1), total))
  }

  return (
    <div>
      {/* BACK 행 */}
      <button
        onClick={onBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          height: 36,
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
        }}
      >
        ← BACK
      </button>

      {/* 타이틀 행 — 2줄 허용 */}
      <div style={{
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
      }}>
        {project.title}
      </div>

      {/* 수평 트랙 — 네이티브 터치 스크롤, 스냅 없음. marginLeft 16 = 클립 라인 */}
      <div
        ref={trackRef}
        className="mpw-track"
        onScroll={handleScroll}
        style={{
          position: 'relative',
          marginLeft: 16,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          paddingRight: 16,
        }}
      >
        <MobileInfoSlide project={project} />

        {slides.length > 0 ? slides.map((slide, idx) => (
          <MobileSlide key={idx} slide={slide} />
        )) : (
          <div style={{ flexShrink: 0 }}>
            <div style={{ height: TRACK_H, aspectRatio: '3 / 2', background: project.coverColor }} />
            <div style={{ height: CAPTION_H }} />
          </div>
        )}
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
}

/**
 * 모바일 월 우선(Wall-First) 표면 — 수직 카드 피드 + 인라인 수평 트랙 (BIG 2축 모델).
 * 카드 탭 = 별도 뷰 이동 없이 해당 아이템이 제자리에서 트랙으로 모프.
 * 상태 소유는 LandingExperience (URL 동기화 일원화).
 */
export function MobileProjectWall({
  projects, filterTypes, activeFilter, onFilter,
  activeSlug, onActivate, onDeactivate, revealed,
}: MobileProjectWallProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({})

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

  // 등장 캐스케이드 — 인트로 직후 + 필터 변경 시 재실행
  const [cascadeIn, setCascadeIn] = useState(false)
  useEffect(() => {
    if (!revealed) return
    setCascadeIn(false)
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setCascadeIn(true)))
    return () => cancelAnimationFrame(raf)
  }, [revealed, activeFilter])

  // 수축 중인 아이템 — 모프 동안 트랙 콘텐츠 유지 후 언마운트
  const [closingSlug, setClosingSlug] = useState<string | null>(null)
  const prevActiveRef = useRef(activeSlug)
  useEffect(() => {
    const prev = prevActiveRef.current
    prevActiveRef.current = activeSlug
    if (prev && prev !== activeSlug) {
      setClosingSlug(prev)
      const t = setTimeout(() => setClosingSlug(null), MORPH_MS)
      return () => clearTimeout(t)
    }
  }, [activeSlug])

  // 확장 시 스크롤 — 칩 행 바로 아래에 BACK 행 정렬 (딥링크는 전환 없이 즉시)
  useEffect(() => {
    if (!activeSlug) return
    const el = itemRefs.current[activeSlug]
    const c = containerRef.current
    if (!el || !c) return
    c.scrollTo({
      top: Math.max(0, el.offsetTop - CHIPS_H),
      behavior: transitionsOnRef.current ? 'smooth' : 'auto',
    })
  }, [activeSlug])

  return (
    <div
      ref={containerRef}
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
      {/* ── 필터 칩 행 — 피드 최상단 sticky ── */}
      <div
        className="mpw-chips"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 5,
          background: '#FFFFFF',
          height: CHIPS_H,
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          overflowX: 'auto',
          padding: '0 16px',
        }}
      >
        {filterTypes.map(t => (
          <button
            key={t}
            onClick={() => onFilter(t)}
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

      {/* ── 피드 — 첫 카드는 칩 행 아래 8px, 카드 간 40px ── */}
      <div style={{ paddingTop: 8, paddingBottom: 48, display: 'flex', flexDirection: 'column', gap: 40 }}>
        {projects.map((p, i) => {
          const expanded = p.id === activeSlug
          const showTrack = expanded || p.id === closingSlug
          const morphTransition = transitionsOn ? `grid-template-rows ${MORPH_MS}ms ${EASE}` : 'none'
          return (
            <div
              key={p.id}
              ref={el => { itemRefs.current[p.id] = el }}
              style={{
                opacity: cascadeIn ? 1 : 0,
                transform: cascadeIn ? 'none' : 'translateY(12px)',
                transition: 'opacity 400ms ease-out, transform 400ms ease-out',
                transitionDelay: cascadeIn ? `${Math.min(i * CASCADE_STAGGER_MS, CASCADE_MAX_DELAY_MS)}ms` : '0ms',
              }}
            >
              {/* 카드 레이어 — 확장 시 0fr로 수축 (grid-rows 모프) */}
              <div style={{ display: 'grid', gridTemplateRows: expanded ? '0fr' : '1fr', transition: morphTransition }}>
                <div style={{ overflow: 'hidden' }}>
                  <div onClick={() => onActivate(p.id)} style={{ padding: '0 16px' }}>
                    {p.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cldCard(p.coverImage, 800)}
                        alt={p.title}
                        loading="lazy"
                        style={{ width: '100%', aspectRatio: '3 / 2', objectFit: 'cover', display: 'block' }}
                      />
                    ) : (
                      <div style={{ width: '100%', aspectRatio: '3 / 2', background: p.coverColor }} />
                    )}
                    <div style={{ marginTop: 8, fontSize: 14, fontWeight: 500, color: '#080706' }}>
                      {p.title}
                    </div>
                    <div style={{
                      marginTop: 2,
                      fontSize: 10,
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

              {/* 확장(트랙) 레이어 — 확장 시 1fr로 전개 */}
              <div style={{ display: 'grid', gridTemplateRows: expanded ? '1fr' : '0fr', transition: morphTransition }}>
                <div style={{ overflow: 'hidden' }}>
                  {showTrack && <ExpandedTrack project={p} onBack={onDeactivate} />}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
