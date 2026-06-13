'use client'

import { useEffect, useRef, useState } from 'react'
import type { Project } from '@/types'
import { cldThumb } from '@/lib/cloudinary'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"

// 하이라이트와의 리스트 거리(d) 기반 3단 높이: d=0 선택 / d=1 인접 / d>=2 그 외
const TIER_HEIGHTS: Record<0 | 1 | 2, number> = { 0: 150, 1: 120, 2: 96 }

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
  tier: 0 | 1 | 2
  isHighlighted: boolean
  isDimmed: boolean
  revealed: boolean
  exiting: boolean
  registerRef: (el: HTMLDivElement | null) => void
  onHover: (project: Project | null) => void
  onSelect: (project: Project) => void
}

function WallCard({ project, index, tier, isHighlighted, isDimmed, revealed, exiting, registerRef, onHover, onSelect }: WallCardProps) {
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
        height: TIER_HEIGHTS[tier],
        flexShrink: 0,
        justifyContent: 'flex-end',
        cursor: 'pointer',
        boxSizing: 'border-box',
        opacity: exiting ? 0 : revealed ? 1 : 0,
        transform: exiting ? 'translateY(-16px)' : revealed ? 'translateY(0)' : 'translateY(8px)',
        transition: exiting
          ? `opacity 250ms ease-in ${index * 15}ms, transform 250ms ease-in ${index * 15}ms, height 400ms ease`
          : `opacity 0.4s ease ${index * 50}ms, transform 0.4s ease ${index * 50}ms, height 400ms ease`,
      }}
    >
      <div className="wall-card-text" style={{
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        textAlign: 'right',
        paddingTop: 2,
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
      <div className="wall-card-img" style={{
        height: '100%',
        aspectRatio: '2 / 1',
        flexShrink: 1,
        minWidth: 0,
        overflow: 'hidden',
        opacity,
        transition: 'opacity 0.3s ease',
      }}>
        {project.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cldThumb(project.coverImage, 480)}
            alt={project.title}
            loading="lazy"
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

  // 호버 시 크기 위계 중심을 호버 카드가 우선 점유 (scrollIntoView·불투명도는 비반응)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const handleHover = (p: Project | null) => {
    setHoveredId(p?.id ?? null)
    onHover(p)
  }

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

  // 크기 위계 중심 카드의 리스트 인덱스 — 필터로 제외된 경우 -1 (전 카드 d>=2 취급)
  const tierCenter = activeSlug ?? hoveredId ?? highlightSlug
  const highlightIdx = displayList.findIndex(p => p.id === tierCenter)

  return (
    <div
      ref={containerRef}
      className="project-wall-scroll light-panel"
      style={{
        width: 'clamp(300px, 28vw, 28vw)',
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
        const d = highlightIdx < 0 ? 2 : Math.abs(index - highlightIdx)
        const tier = Math.min(d, 2) as 0 | 1 | 2
        return (
          <WallCard
            key={`${project.id}-${displayKey}`}
            project={project}
            index={index}
            tier={tier}
            isHighlighted={isHighlighted}
            isDimmed={isDimmed}
            revealed={revealed && phase === 'idle'}
            exiting={phase === 'exit'}
            registerRef={(el) => { cardRefs.current[project.id] = el }}
            onHover={handleHover}
            onSelect={onSelect}
          />
        )
      })}
    </div>
  )
}
