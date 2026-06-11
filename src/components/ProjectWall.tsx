'use client'

import { useEffect, useRef, useState } from 'react'
import type { Project } from '@/types'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"

interface ProjectWallProps {
  projects: Project[]
  filterKey: string
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
  exiting: boolean
  registerRef: (el: HTMLDivElement | null) => void
  onHover: (project: Project | null) => void
  onSelect: (project: Project) => void
}

function WallCard({ project, index, isHighlighted, isDimmed, revealed, exiting, registerRef, onHover, onSelect }: WallCardProps) {
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
        height: 124,
        flexShrink: 0,
        justifyContent: 'flex-end',
        cursor: 'pointer',
        boxSizing: 'border-box',
        borderLeft: active ? '2px solid #080706' : '2px solid transparent',
        opacity: exiting ? 0 : revealed ? 1 : 0,
        transform: exiting ? 'translateY(-16px)' : revealed ? 'translateY(0)' : 'translateY(8px)',
        transition: exiting
          ? `opacity 250ms ease-in ${index * 15}ms, transform 250ms ease-in ${index * 15}ms`
          : `opacity 0.4s ease ${index * 50}ms, transform 0.4s ease ${index * 50}ms, border-color 0.3s ease`,
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
        <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 450, color: '#080706', lineHeight: 1.3, wordBreak: 'keep-all' as const }}>
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
          marginTop: 4,
        }}>
          {project.type}
        </div>
      </div>
      <div style={{
        height: '100%',
        aspectRatio: '2.5 / 1',
        flexShrink: 1,
        minWidth: 0,
        maxWidth: 'calc(100% - 188px)',
        overflow: 'hidden',
        opacity,
        transition: 'opacity 0.3s ease',
      }}>
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

export function ProjectWall({ projects, filterKey, highlightSlug, activeSlug, revealed, onHover, onSelect }: ProjectWallProps) {
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const containerRef = useRef<HTMLDivElement>(null)
  const effectiveHighlight = activeSlug ?? highlightSlug

  // ── 필터링 2단계 시퀀스: 전 카드 위로 퇴장 → 목록 교체 후 캐스케이드 재입장 ──
  const [displayList, setDisplayList] = useState(projects)
  const [displayKey, setDisplayKey] = useState(filterKey)
  const [phase, setPhase] = useState<'idle' | 'exit' | 'enter'>('idle')

  useEffect(() => {
    if (projects === displayList) return
    setPhase('exit')                       // 1) 퇴장: 전 카드 위로 페이드아웃
    const t = setTimeout(() => {
      setDisplayList(projects)             // 2) 목록 교체 (key 교체로 카드 리마운트)
      setDisplayKey(filterKey)
      if (containerRef.current) containerRef.current.scrollTop = 0
      setPhase('enter')
    }, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, filterKey])

  // enter → 다음 프레임에 idle로 전환해 기존 revealed 캐스케이드 재생
  useEffect(() => {
    if (phase !== 'enter') return
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setPhase('idle')))
    return () => cancelAnimationFrame(raf)
  }, [phase])

  useEffect(() => {
    const el = cardRefs.current[effectiveHighlight]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [effectiveHighlight])

  return (
    <div
      ref={containerRef}
      className="project-wall-scroll light-panel"
      style={{
        width: '28vw',
        height: '100%',
        flexShrink: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        background: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: '16px 0',
        boxSizing: 'border-box',
      }}
    >
      {displayList.map((project, index) => {
        const isHighlighted = project.id === effectiveHighlight
        const isDimmed = activeSlug !== null && project.id !== activeSlug
        return (
          <WallCard
            key={`${project.id}-${displayKey}`}
            project={project}
            index={index}
            isHighlighted={isHighlighted}
            isDimmed={isDimmed}
            revealed={revealed && phase === 'idle'}
            exiting={phase === 'exit'}
            registerRef={(el) => { cardRefs.current[project.id] = el }}
            onHover={onHover}
            onSelect={onSelect}
          />
        )
      })}
    </div>
  )
}
