'use client'

import { useEffect, useRef, useState } from 'react'
import type { CreditsSlide, DiagramSetSlide, ImageSlide, Project, ProjectSlide } from '@/types'
import { projectSlides } from '@/data/projectSlides'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"

const SLIDE_WIDTH_PCT = 78
const SLIDE_GAP_PX = 24

interface ContentAreaProps {
  project: Project
  mode: 'idle' | 'active'
  isBlacking: boolean
  visible: boolean
  mobile: boolean
  onBack: () => void
}

function getImages(project: Project): string[] {
  return project.coverImage ? [project.coverImage] : []
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

function ImageSlideView({ slide }: { slide: ImageSlide }) {
  const { label, description } = slide.caption ? splitCaption(slide.caption) : { label: '', description: '' }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: '#FFFFFF',
      boxSizing: 'border-box',
      padding: 64,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
    }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={slide.src}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          draggable={false}
        />
      </div>
      {slide.caption && (
        <div style={{
          textAlign: 'center',
          maxWidth: '70%',
          margin: '0 auto',
          fontFamily: FONT,
          fontSize: 12,
          fontWeight: 300,
          color: '#0a0908',
          opacity: 0.7,
          flexShrink: 0,
        }}>
          <span style={{ fontWeight: 500 }}>{label}</span>
          {description && ` — ${description}`}
        </div>
      )}
    </div>
  )
}

function SmallArrowButton({ side, onClick, label }: {
  side: 'left' | 'right'
  onClick: (e: React.MouseEvent) => void
  label: string
}) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={label}
      style={{
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        [side]: 8,
        background: 'none',
        border: 'none',
        fontFamily: FONT,
        fontSize: 24,
        fontWeight: 200,
        lineHeight: 1,
        color: '#0a0908',
        opacity: hover ? 1 : 0.5,
        cursor: 'pointer',
        padding: 8,
        transition: 'opacity 0.2s ease',
        zIndex: 2,
      }}
    >
      {side === 'left' ? '‹' : '›'}
    </button>
  )
}

function DiagramSetSlideView({ slide, isCenter }: { slide: DiagramSetSlide; isCenter: boolean }) {
  const [subIdx, setSubIdx] = useState(0)
  const [hovering, setHovering] = useState(false)
  const total = slide.items.length

  useEffect(() => {
    if (!isCenter) setSubIdx(0)
  }, [isCenter])

  useEffect(() => {
    if (!isCenter || hovering) return
    const interval = slide.autoAdvanceMs ?? 3000
    const id = setInterval(() => {
      setSubIdx(i => (i + 1) % total)
    }, interval)
    return () => clearInterval(id)
  }, [isCenter, hovering, total, slide.autoAdvanceMs, subIdx])

  const goNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSubIdx(i => (i + 1) % total)
  }
  const goPrev = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSubIdx(i => (i - 1 + total) % total)
  }

  const item = slide.items[subIdx]

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: '#FFFFFF',
      boxSizing: 'border-box',
      padding: 64,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
    }}>
      <div
        style={{ flex: 1, minHeight: 0, position: 'relative' }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
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

        {hovering && (
          <>
            <SmallArrowButton side="left" onClick={goPrev} label="Previous diagram" />
            <SmallArrowButton side="right" onClick={goNext} label="Next diagram" />
          </>
        )}
      </div>

      <div style={{ textAlign: 'center', flexShrink: 0, fontFamily: FONT }}>
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

function CreditsSlideView({ slide }: { slide: CreditsSlide }) {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: '#FFFFFF',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxSizing: 'border-box',
      padding: 64,
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

function SlideContent({ slide, isCenter }: { slide: ProjectSlide; isCenter: boolean }) {
  switch (slide.kind) {
    case 'image':
      return <ImageSlideView slide={slide} />
    case 'diagramSet':
      return <DiagramSetSlideView slide={slide} isCenter={isCenter} />
    case 'credits':
      return <CreditsSlideView slide={slide} />
  }
}

function BigArrow({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={side === 'left' ? 'Previous slide' : 'Next slide'}
      style={{
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        [side]: 32,
        background: 'none',
        border: 'none',
        fontFamily: FONT,
        fontSize: 48,
        fontWeight: 200,
        lineHeight: 1,
        color: '#0a0908',
        opacity: hover ? 1 : 0.7,
        cursor: 'pointer',
        transition: 'opacity 0.2s ease',
        zIndex: 5,
      }}
    >
      {side === 'left' ? '‹' : '›'}
    </button>
  )
}

export function ContentArea({ project, mode, isBlacking, visible, mobile, onBack }: ContentAreaProps) {
  const images = getImages(project)
  const slides = getSlides(project)
  const total = Math.max(slides.length, 1)
  const [slideIdx, setSlideIdx] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)
  const [cursorZone, setCursorZone] = useState<'left' | 'right' | null>(null)
  const dragStart = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSlideIdx(0)
  }, [project.id, mode])

  const goNext = () => setSlideIdx(i => Math.min(i + 1, total - 1))
  const goPrev = () => setSlideIdx(i => Math.max(i - 1, 0))

  useEffect(() => {
    if (mode !== 'active') return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext()
      else if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mode, total])

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (mode !== 'active') return
    dragStart.current = e.clientX
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (mode === 'active' && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const relX = (e.clientX - rect.left) / rect.width
      if (relX < 0.25) setCursorZone('left')
      else if (relX > 0.75) setCursorZone('right')
      else setCursorZone(null)
    }
    if (dragStart.current === null) return
    setDragOffset(e.clientX - dragStart.current)
  }
  const onPointerUp = () => {
    if (dragStart.current === null) return
    if (dragOffset < -80) goNext()
    else if (dragOffset > 80) goPrev()
    dragStart.current = null
    setDragOffset(0)
  }
  const onContainerLeave = () => {
    setCursorZone(null)
    onPointerUp()
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: mobile ? '100%' : '66.667vw',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: mode === 'active' ? '#FFFFFF' : '#080706',
        transition: 'background-color 0.3s ease-out',
        touchAction: mode === 'active' ? 'pan-y' : 'auto',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onContainerLeave}
    >
      {mode === 'idle' && (
        <>
          <div style={{
            position: 'absolute',
            inset: 0,
            opacity: visible ? 1 : 0,
            transition: 'opacity 800ms ease-out',
          }}>
            {images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={images[0]}
                alt={project.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', background: project.coverColor }} />
            )}
          </div>

          {/* Blackout overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: '#000000',
            opacity: isBlacking ? 1 : 0,
            transition: isBlacking ? 'opacity 400ms ease-in' : 'opacity 400ms ease-out',
            pointerEvents: 'none',
          }} />
        </>
      )}

      {mode === 'active' && (
        <>
          <div style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            gap: SLIDE_GAP_PX,
            transform: `translateX(calc(50% - ${SLIDE_WIDTH_PCT / 2}% - ${slideIdx} * (${SLIDE_WIDTH_PCT}% + ${SLIDE_GAP_PX}px) + ${dragOffset}px))`,
            transition: dragStart.current === null ? 'transform 500ms cubic-bezier(0.7, 0, 0.3, 1)' : 'none',
          }}>
            {(slides.length > 0 ? slides : [null]).map((slide, idx) => (
              <div
                key={idx}
                onClick={() => { if (idx !== slideIdx) setSlideIdx(idx) }}
                style={{
                  width: `${SLIDE_WIDTH_PCT}%`,
                  height: '100%',
                  flexShrink: 0,
                  opacity: idx === slideIdx ? 1 : 0.4,
                  cursor: idx === slideIdx ? 'default' : 'pointer',
                  transition: 'opacity 500ms ease',
                }}
              >
                {slide ? (
                  <SlideContent slide={slide} isCenter={idx === slideIdx} />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: project.coverColor }} />
                )}
              </div>
            ))}
          </div>

          {!mobile && cursorZone === 'left' && slideIdx > 0 && (
            <BigArrow side="left" onClick={goPrev} />
          )}
          {!mobile && cursorZone === 'right' && slideIdx < total - 1 && (
            <BigArrow side="right" onClick={goNext} />
          )}

          {/* Slide indicator */}
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
            {String(slideIdx + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </div>

          {/* Back */}
          <button
            onClick={onBack}
            style={{
              position: 'absolute',
              top: 20,
              left: 20,
              fontFamily: FONT,
              fontSize: 11,
              fontWeight: 300,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#FFFFFF',
              background: 'rgba(0,0,0,0.3)',
              border: 'none',
              borderRadius: 20,
              padding: '8px 16px',
              cursor: 'pointer',
              zIndex: 5,
            }}
          >
            ← Back
          </button>
        </>
      )}
    </div>
  )
}
