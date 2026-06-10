'use client'

import { useEffect, useRef, useState } from 'react'
import type { Project } from '@/types'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"

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

const arrowBaseStyle: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  width: 40,
  height: 40,
  borderRadius: '50%',
  background: 'rgba(0,0,0,0.3)',
  border: 'none',
  color: '#FFFFFF',
  fontSize: 20,
  lineHeight: 1,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'opacity 0.2s ease',
  zIndex: 5,
}

export function ContentArea({ project, mode, isBlacking, visible, mobile, onBack }: ContentAreaProps) {
  const images = getImages(project)
  const total = Math.max(images.length, 1)
  const [slideIdx, setSlideIdx] = useState(0)
  const [hovering, setHovering] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const dragStart = useRef<number | null>(null)

  useEffect(() => {
    setSlideIdx(0)
  }, [project.id, mode])

  const goNext = () => setSlideIdx(i => (i + 1) % total)
  const goPrev = () => setSlideIdx(i => (i - 1 + total) % total)

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (mode !== 'active') return
    dragStart.current = e.clientX
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
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

  return (
    <div
      style={{
        width: mobile ? '100%' : '66.667vw',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: '#080706',
        touchAction: mode === 'active' ? 'pan-y' : 'auto',
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
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
            transform: `translateX(calc(${-slideIdx * 100}% + ${dragOffset}px))`,
            transition: dragStart.current === null ? 'transform 400ms ease-in-out' : 'none',
          }}>
            {(images.length > 0 ? images : [null]).map((src, idx) => (
              <div key={idx} style={{ width: '100%', height: '100%', flexShrink: 0 }}>
                <div style={{
                  width: '100%',
                  height: '100%',
                  boxSizing: 'border-box',
                  padding: 48,
                  background: '#080706',
                  transition: 'padding 0.4s ease-out',
                }}>
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={src}
                      alt={project.title}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                      draggable={false}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: project.coverColor }} />
                  )}
                </div>
              </div>
            ))}
          </div>

          {total > 1 && (
            <>
              <button
                onClick={goPrev}
                aria-label="Previous slide"
                style={{ ...arrowBaseStyle, left: 24, opacity: hovering ? 1 : 0 }}
              >
                ‹
              </button>
              <button
                onClick={goNext}
                aria-label="Next slide"
                style={{ ...arrowBaseStyle, right: 24, opacity: hovering ? 1 : 0 }}
              >
                ›
              </button>
            </>
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
            color: '#FFFFFF',
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
