'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CreditsSlide, DiagramSetSlide, ImageSlide, Project, ProjectSlide } from '@/types'
import { projectSlides } from '@/data/projectSlides'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"

const INFO_COL_W = 200
const SLIDE_GAP_PX = 24
const EASE = 'cubic-bezier(0.7, 0, 0.3, 1)'
const MORPH_MS = 700
const SLIDE_H_RATIO = 0.72   // image·credits 슬라이드 높이 (뷰포트 대비)
const DIAGRAM_H_PCT = '48%'  // diagramSet 이미지 영역 높이
// 어두운 사진 위 대비 확보용 흰 헤일로
const GLYPH_SHADOW = '0 0 10px rgba(255,255,255,0.95), 0 0 3px rgba(255,255,255,0.95)'

interface ContentAreaProps {
  project: Project
  mode: 'idle' | 'active'
  isBlacking: boolean
  visible: boolean
  mobile: boolean
  onBack: () => void
}

interface MorphRect {
  top: number
  left: number
  width: number
  height: number
}

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

// ── 이미지 슬라이드: 높이 100% 채움, 폭은 이미지 비율이 결정. 캡션은 하단 외부 ──
function ImageSlideView({ slide }: { slide: ImageSlide }) {
  const { label, description } = slide.caption ? splitCaption(slide.caption) : { label: '', description: '' }

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={slide.src}
        alt=""
        draggable={false}
        style={{ height: '100%', width: 'auto', display: 'block', objectFit: 'cover' }}
      />
      {slide.caption && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: 12,
          textAlign: 'center',
          fontFamily: FONT,
          fontSize: 12,
          fontWeight: 300,
          color: '#0a0908',
          opacity: 0.7,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}>
          <span style={{ fontWeight: 500 }}>{label}</span>
          {description && ` — ${description}`}
        </div>
      )}
    </div>
  )
}

// ── 다이어그램 세트: 이미지 영역 위 커서 추적 화살표, 캡션+카운터는 하단 외부 ──
function DiagramSetSlideView({ slide, isCenter, onHoverChange }: {
  slide: DiagramSetSlide
  isCenter: boolean
  onHoverChange: (hovering: boolean) => void
}) {
  const [subIdx, setSubIdx] = useState(0)
  const [hovering, setHovering] = useState(false)
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)
  const areaRef = useRef<HTMLDivElement>(null)
  const total = slide.items.length

  useEffect(() => {
    if (!isCenter) setSubIdx(0)
  }, [isCenter])

  // 자동 진행 — 호버 시 일시정지
  useEffect(() => {
    if (!isCenter || hovering) return
    const interval = slide.autoAdvanceMs ?? 3000
    const id = setInterval(() => {
      setSubIdx(i => (i + 1) % total)
    }, interval)
    return () => clearInterval(id)
  }, [isCenter, hovering, total, slide.autoAdvanceMs])

  // 언마운트 시 외부 글리프 숨김 상태 해제
  useEffect(() => () => onHoverChange(false), [onHoverChange])

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    const rect = areaRef.current?.getBoundingClientRect()
    if (!rect) return
    if (e.clientX - rect.left > rect.width / 2) setSubIdx(i => (i + 1) % total)
    else setSubIdx(i => (i - 1 + total) % total)
  }

  const item = slide.items[subIdx]
  const areaW = areaRef.current?.clientWidth ?? 0

  return (
    <div
      ref={areaRef}
      style={{
        height: '100%',
        position: 'relative',
        // 내부 글리프 표시 중에는 네이티브 커서 숨김
        cursor: cursor ? 'none' : 'default',
      }}
      onMouseEnter={() => { setHovering(true); onHoverChange(true) }}
      onMouseLeave={() => { setHovering(false); setCursor(null); onHoverChange(false) }}
      onMouseMove={(e) => {
        const rect = areaRef.current?.getBoundingClientRect()
        if (rect) setCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onClick={handleClick}
    >
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

      {/* 내부 커서 추적 글리프 — 커서 지점에 중심 정렬 */}
      {cursor && (
        <span style={{
          position: 'absolute',
          left: cursor.x,
          top: cursor.y,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          fontFamily: FONT,
          fontSize: 28,
          fontWeight: 300,
          lineHeight: 1,
          color: '#080706',
          textShadow: GLYPH_SHADOW,
          zIndex: 3,
          userSelect: 'none',
        }}>
          {cursor.x > areaW / 2 ? '›' : '‹'}
        </span>
      )}

      {/* 캡션 + 카운터 — 이미지 영역 하단 외부 */}
      <div style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        marginTop: 12,
        textAlign: 'center',
        fontFamily: FONT,
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
      }}>
        <div style={{ fontSize: 12, fontWeight: 300, color: '#0a0908', opacity: 0.7 }}>
          <span style={{ fontWeight: 500 }}>{item.label}</span> — {item.description}
        </div>
        <div style={{ fontSize: 11, opacity: 0.5, color: '#0a0908', marginTop: 4 }}>
          {String(subIdx + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </div>
      </div>
    </div>
  )
}

// ── 크레딧: 슬라이드 높이의 흰 블록, 고정 420px ──
function CreditsSlideView({ slide }: { slide: CreditsSlide }) {
  return (
    <div style={{
      height: '100%',
      width: 420,
      background: '#FFFFFF',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {slide.rows.map((row, i) => (
          <div key={i} style={{ display: 'flex', gap: 24, alignItems: 'baseline' }}>
            <div style={{
              width: 120,
              flexShrink: 0,
              textAlign: 'right',
              fontFamily: FONT,
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#0a0908',
              opacity: 0.5,
            }}>
              {row.label}
            </div>
            <div style={{
              textAlign: 'left',
              fontFamily: FONT,
              fontSize: 14,
              fontWeight: 400,
              color: '#0a0908',
            }}>
              {row.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SlideContent({ slide, isCenter, onDiagramHover }: {
  slide: ProjectSlide
  isCenter: boolean
  onDiagramHover: (hovering: boolean) => void
}) {
  switch (slide.kind) {
    case 'image':
      return <ImageSlideView slide={slide} />
    case 'diagramSet':
      return <DiagramSetSlideView slide={slide} isCenter={isCenter} onHoverChange={onDiagramHover} />
    case 'credits':
      return <CreditsSlideView slide={slide} />
  }
}

export function ContentArea({ project, mode, isBlacking, visible, mobile, onBack }: ContentAreaProps) {
  const slides = getSlides(project)
  const total = Math.max(slides.length, 1)

  const rootRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const idleImgEl = useRef<HTMLImageElement | null>(null)

  // ── Idle→Active 모프 전환 ──
  const [morphing, setMorphing] = useState(false)
  const [morphRect, setMorphRect] = useState<MorphRect | null>(null)
  const prevModeRef = useRef(mode)

  // ── 연속 트랙 (픽셀 스크롤 모델) ──
  const [scrollPos, setScrollPos] = useState(0)        // px, 0 = 첫 슬라이드 중앙
  const [rects, setRects] = useState<{ x: number; w: number }[]>([])
  const [viewportW, setViewportW] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [animated, setAnimated] = useState(false)      // 화살표/키보드 이동 시에만 transition
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)
  const [diagramHover, setDiagramHover] = useState(false)
  const [infoIn, setInfoIn] = useState(false)
  const dragState = useRef<{ startX: number; startScroll: number; moved: boolean } | null>(null)

  const centers = rects.map(r => r.x + r.w / 2)
  const c0 = centers[0] ?? 0
  const maxScroll = centers.length > 0 ? Math.max(0, centers[centers.length - 1] - c0) : 0

  let nearest = 0
  for (let i = 1; i < centers.length; i++) {
    if (Math.abs(centers[i] - c0 - scrollPos) < Math.abs(centers[nearest] - c0 - scrollPos)) nearest = i
  }

  const clampScroll = (v: number) => Math.min(maxScroll, Math.max(0, v))

  // 모드 전환 감지 — idle→active 시 모프 시퀀스
  useEffect(() => {
    const prev = prevModeRef.current
    prevModeRef.current = mode

    if (mode === 'active' && prev === 'idle' && rootRef.current) {
      setScrollPos(0)
      setAnimated(false)
      const rw = rootRef.current.clientWidth
      const rh = rootRef.current.clientHeight
      const img = idleImgEl.current
      const aspect = img && img.naturalWidth > 0 && img.naturalHeight > 0
        ? img.naturalWidth / img.naturalHeight
        : 4 / 3
      const th = rh * SLIDE_H_RATIO
      const tw = th * aspect
      const vw = rw - INFO_COL_W

      setMorphing(true)
      setMorphRect({ top: 0, left: 0, width: rw, height: rh })

      let cancelled = false
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (cancelled) return
        setMorphRect({
          top: (rh - th) / 2,
          left: INFO_COL_W + (vw - tw) / 2,
          width: tw,
          height: th,
        })
      }))
      const t = setTimeout(() => {
        setMorphing(false)
        setMorphRect(null)
      }, MORPH_MS)
      return () => { cancelled = true; clearTimeout(t) }
    }

    if (mode === 'idle') {
      // Back은 역방향 모프 없이 즉시 전환
      setMorphing(false)
      setMorphRect(null)
      setScrollPos(0)
      setAnimated(false)
      setDiagramHover(false)
      setCursor(null)
    }
  }, [mode])

  // 정보 컬럼 텍스트 — 400ms 지연 후 400ms 페이드인 (transition delay로 처리)
  useEffect(() => {
    if (mode === 'active') {
      const raf = requestAnimationFrame(() => setInfoIn(true))
      return () => cancelAnimationFrame(raf)
    }
    setInfoIn(false)
  }, [mode])

  // active 중 프로젝트 교체 시 리셋
  useEffect(() => {
    setScrollPos(0)
    setAnimated(false)
  }, [project.id])

  // 슬라이드 rect 측정 — 마운트/리사이즈/이미지 로드 시
  const measure = useCallback(() => {
    const track = trackRef.current
    const vp = viewportRef.current
    if (!track || !vp) return
    const children = Array.from(track.children) as HTMLElement[]
    setRects(children.map(el => ({ x: el.offsetLeft, w: el.offsetWidth })))
    setViewportW(vp.clientWidth)
  }, [])

  useLayoutEffect(() => {
    if (mode !== 'active' || morphing) return
    measure()
    const ro = new ResizeObserver(() => measure())
    if (trackRef.current) ro.observe(trackRef.current)
    if (viewportRef.current) ro.observe(viewportRef.current)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [mode, morphing, project.id, measure])

  // 화살표/키보드 이동 — 중앙 최근접 슬라이드 기준 이전/다음 중앙으로
  const goToSlide = (idx: number) => {
    if (centers.length === 0) return
    const i = Math.max(0, Math.min(centers.length - 1, idx))
    setAnimated(true)
    setScrollPos(clampScroll(centers[i] - c0))
  }
  const goNext = () => goToSlide(nearest + 1)
  const goPrev = () => goToSlide(nearest - 1)

  const navRef = useRef({ next: goNext, prev: goPrev })
  navRef.current = { next: goNext, prev: goPrev }

  useEffect(() => {
    if (mode !== 'active') return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') navRef.current.next()
      else if (e.key === 'ArrowLeft') navRef.current.prev()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mode])

  // ── 드래그: 이동량 직접 반영, 놓아도 스냅하지 않음 ──
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragState.current = { startX: e.clientX, startScroll: scrollPos, moved: false }
    setDragging(true)
    setAnimated(false)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const vp = viewportRef.current
    if (vp) {
      const rect = vp.getBoundingClientRect()
      setCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    }
    const d = dragState.current
    if (!d) return
    const dx = e.clientX - d.startX
    if (Math.abs(dx) >= 5) d.moved = true
    setScrollPos(clampScroll(d.startScroll - dx))
  }
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragState.current
    dragState.current = null
    setDragging(false)
    if (!d || d.moved) return
    // 클릭 (이동량 < 5px): 커서가 우측 반 → 다음, 좌측 반 → 이전
    const vp = viewportRef.current
    if (!vp) return
    const rect = vp.getBoundingClientRect()
    if (e.clientX - rect.left > rect.width / 2) goNext()
    else goPrev()
  }

  // ── 외부 커서 추적 글리프 ──
  const glyphSide: 'left' | 'right' | null =
    cursor && viewportW > 0 ? (cursor.x > viewportW / 2 ? 'right' : 'left') : null
  const showGlyph = !mobile && !morphing && cursor !== null && !dragging && !diagramHover &&
    glyphSide !== null &&
    (glyphSide === 'right' ? scrollPos < maxScroll - 1 : scrollPos > 1)

  return (
    <div
      ref={rootRef}
      style={{
        flex: 1,
        minWidth: 0,
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: mode === 'active' ? '#FFFFFF' : '#080706',
        transition: 'background-color 0.3s ease-out',
      }}
    >
      {mode === 'idle' && (
        <>
          <div style={{
            position: 'absolute',
            inset: 0,
            opacity: visible ? 1 : 0,
            transition: 'opacity 1200ms ease-out',
          }}>
            {project.coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={(el) => { if (el) idleImgEl.current = el }}
                src={project.coverImage}
                alt={project.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', background: project.coverColor }} />
            )}
          </div>

          {/* Project title overlay */}
          <div style={{
            position: 'absolute',
            bottom: 24,
            left: 24,
            fontFamily: FONT,
            fontSize: 12,
            fontWeight: 300,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#FFFFFF',
            opacity: visible ? 1 : 0,
            transition: 'opacity 1200ms ease-out',
            pointerEvents: 'none',
            zIndex: 2,
          }}>
            {project.title}
          </div>

          {/* Blackout overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: '#000000',
            opacity: isBlacking ? 1 : 0,
            transition: isBlacking ? 'opacity 600ms ease-in' : 'opacity 600ms ease-out',
            pointerEvents: 'none',
            zIndex: 3,
          }} />
        </>
      )}

      {mode === 'active' && (
        <div style={{ display: 'flex', width: '100%', height: '100%' }}>
          {/* ── 좌측 정보 컬럼 — 트랙과 무관하게 고정 표시 ── */}
          <div style={{
            width: INFO_COL_W,
            flexShrink: 0,
            height: '100%',
            boxSizing: 'border-box',
            padding: '32px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
            background: '#FFFFFF',
            fontFamily: FONT,
            color: '#080706',
            opacity: infoIn ? 1 : 0,
            transition: 'opacity 400ms ease 400ms',
            zIndex: 4,
          }}>
            {/* Back 컨트롤 */}
            <button
              onClick={onBack}
              style={{
                alignSelf: 'flex-start',
                background: 'none',
                border: 'none',
                padding: 0,
                fontFamily: FONT,
                fontSize: 11,
                fontWeight: 300,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#080706',
                cursor: 'pointer',
              }}
            >
              ← Back
            </button>

            {/* 프로젝트명 + 위치 */}
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.35, wordBreak: 'keep-all' }}>
                {project.title}
              </div>
              <div style={{
                fontSize: 11,
                fontWeight: 300,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                opacity: 0.6,
                marginTop: 6,
              }}>
                {project.location ?? ''}
              </div>
            </div>

            {/* 메타 스택 — BIG 형식: 라벨 + 값 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[['TYPOLOGY', project.type], ['STATUS', project.status], ['YEAR', String(project.year)]].map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontSize: 9, fontWeight: 300, letterSpacing: '0.1em', opacity: 0.45 }}>{l}</div>
                  <div style={{ fontSize: 11, fontWeight: 400, letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 슬라이드 뷰포트 ── */}
          <div
            ref={viewportRef}
            style={{
              flex: 1,
              minWidth: 0,
              height: '100%',
              position: 'relative',
              overflow: 'hidden',
              touchAction: 'pan-y',
              userSelect: 'none',
              // 글리프 표시 중 네이티브 커서 숨김
              cursor: dragging ? 'grabbing' : showGlyph ? 'none' : 'default',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onMouseLeave={() => setCursor(null)}
          >
            {!morphing && (
              <div
                ref={trackRef}
                style={{
                  display: 'flex',
                  gap: SLIDE_GAP_PX,
                  alignItems: 'center',
                  height: '100%',
                  transform: `translateX(${viewportW / 2 - c0 - scrollPos}px)`,
                  transition: animated && !dragging ? `transform 600ms ${EASE}` : 'none',
                  willChange: 'transform',
                }}
              >
                {slides.length > 0 ? slides.map((slide, idx) => (
                  <div
                    key={idx}
                    style={{
                      height: slide.kind === 'diagramSet' ? DIAGRAM_H_PCT : `${SLIDE_H_RATIO * 100}%`,
                      flexShrink: 0,
                      position: 'relative',
                    }}
                  >
                    <SlideContent slide={slide} isCenter={idx === nearest} onDiagramHover={setDiagramHover} />
                  </div>
                )) : (
                  <div style={{
                    height: `${SLIDE_H_RATIO * 100}%`,
                    aspectRatio: '4 / 3',
                    flexShrink: 0,
                    background: project.coverColor,
                  }} />
                )}
              </div>
            )}

            {/* 외부 커서 추적 글리프 — 커서 지점에 중심 정렬 */}
            {showGlyph && cursor && (
              <span style={{
                position: 'absolute',
                left: cursor.x,
                top: cursor.y,
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
                fontFamily: FONT,
                fontSize: 64,
                fontWeight: 300,
                lineHeight: 1,
                color: '#080706',
                textShadow: GLYPH_SHADOW,
                zIndex: 5,
                userSelect: 'none',
              }}>
                {glyphSide === 'right' ? '›' : '‹'}
              </span>
            )}

            {/* 슬라이드 카운터 — 중앙 최근접 인덱스 */}
            {!morphing && (
              <div style={{
                position: 'absolute',
                bottom: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                fontFamily: FONT,
                fontSize: 12,
                fontWeight: 300,
                color: '#0a0908',
                opacity: 0.6,
                pointerEvents: 'none',
                zIndex: 5,
              }}>
                {String(nearest + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 모프 레이어: 풀블리드 커버 → 트랙 첫 슬라이드 rect ── */}
      {morphing && morphRect && (
        project.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.coverImage}
            alt=""
            draggable={false}
            style={{
              position: 'absolute',
              top: morphRect.top,
              left: morphRect.left,
              width: morphRect.width,
              height: morphRect.height,
              objectFit: 'cover',
              transition: `all ${MORPH_MS}ms ${EASE}`,
              pointerEvents: 'none',
              zIndex: 6,
            }}
          />
        ) : (
          <div style={{
            position: 'absolute',
            top: morphRect.top,
            left: morphRect.left,
            width: morphRect.width,
            height: morphRect.height,
            background: project.coverColor,
            transition: `all ${MORPH_MS}ms ${EASE}`,
            pointerEvents: 'none',
            zIndex: 6,
          }} />
        )
      )}
    </div>
  )
}
