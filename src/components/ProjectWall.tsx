'use client'

import { useEffect, useRef, useState } from 'react'
import type { Project } from '@/types'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"

interface ProjectWallProps {
  projects: Project[]
  highlightSlug: string
  activeSlug: string | null
  revealed: boolean
  onHover: (project: Project | null) => void
  onSelect: (project: Project) => void
}

interface WallCardProps {
  project: Project
  index: number
  isHighlighted: boolean
  isDimmed: boolean
  revealed: boolean
  registerRef: (el: HTMLDivElement | null) => void
  onHover: (project: Project | null) => void
  onSelect: (project: Project) => void
}

function WallCard({ project, index, isHighlighted, isDimmed, revealed, registerRef, onHover, onSelect }: WallCardProps) {
  const [hover, setHover] = useState(false)
  const active = isHighlighted || hover
  const opacity = active ? 1 : isDimmed ? 0.3 : 0.45

  return (
    <div
      ref={registerRef}
      onMouseEnter={() => { setHover(true); onHover(project) }}
      onMouseLeave={() => { setHover(false); onHover(null) }}
      onClick={() => onSelect(project)}
      style={{
        display: 'flex',
        height: 155,
        flexShrink: 0,
        cursor: 'pointer',
        boxSizing: 'border-box',
        borderLeft: active ? '2px solid #080706' : '2px solid transparent',
        opacity: revealed ? 1 : 0,
        transform: revealed ? 'translateY(0)' : 'translateY(8px)',
        transition: `opacity 0.4s ease ${index * 50}ms, transform 0.4s ease ${index * 50}ms, border-color 0.3s ease`,
      }}
    >
      <div style={{
        width: 180,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-end',
        textAlign: 'right',
        paddingLeft: 20,
        paddingRight: 8,
        boxSizing: 'border-box',
        opacity,
        transition: 'opacity 0.3s ease',
      }}>
        <div style={{ fontFamily: FONT, fontSize: 16, fontWeight: 400, color: '#080706', lineHeight: 1.3, wordBreak: 'keep-all' as const }}>
          {project.title}
        </div>
        <div style={{
          fontFamily: FONT,
          fontSize: 11,
          fontWeight: 300,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: '#080706',
          opacity: 0.6,
          marginTop: 6,
        }}>
          {project.location ?? ''}
        </div>
      </div>
      <div style={{ flexGrow: 1, overflow: 'hidden', opacity, transition: 'opacity 0.3s ease' }}>
        {project.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.coverImage}
            alt={project.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: project.coverColor }} />
        )}
      </div>
    </div>
  )
}

export function ProjectWall({ projects, highlightSlug, activeSlug, revealed, onHover, onSelect }: ProjectWallProps) {
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const effectiveHighlight = activeSlug ?? highlightSlug

  useEffect(() => {
    const el = cardRefs.current[effectiveHighlight]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [effectiveHighlight])

  return (
    <div
      className="project-wall-scroll light-panel"
      style={{
        width: '33.333vw',
        height: '100%',
        flexShrink: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        borderRight: '1px solid rgba(255, 255, 255, 0.12)',
        background: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: '16px 0',
        boxSizing: 'border-box',
      }}
    >
      {projects.map((project, index) => {
        const isHighlighted = project.id === effectiveHighlight
        const isDimmed = activeSlug !== null && project.id !== activeSlug
        return (
          <WallCard
            key={project.id}
            project={project}
            index={index}
            isHighlighted={isHighlighted}
            isDimmed={isDimmed}
            revealed={revealed}
            registerRef={(el) => { cardRefs.current[project.id] = el }}
            onHover={onHover}
            onSelect={onSelect}
          />
        )
      })}
    </div>
  )
}
