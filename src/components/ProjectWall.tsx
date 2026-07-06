'use client'

// ── ProjectWall — 가상 링 렌더러 (WALL_RING_SPEC §3) ──
//
// 네이티브 스크롤 모델 폐기. 위치·티어·불투명도는 useRingWall의 offset과
// props로부터의 순수 함수 파생이며, 거리 함수는 선형 |i−j|가 아니라 원형
// 거리(circDist)다. 컨테이너는 overflow hidden — 어떤 카드든 d=0이 되는
// 순간 정확히 세로 중앙에 위치한다.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Project } from '@/types'
import { cldThumb } from '@/lib/cloudinary'
import { circDist, useRingWall } from '@/hooks/useRingWall'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"

// 티어 중심과의 원형 거리(d) 기반 3단 높이: d=0 선택 / d=1 인접 / d>=2 그 외
const TIER_HEIGHTS: Record<0 | 1 | 2, number> = { 0: 150, 1: 120, 2: 96 }
const GAP = 16

interface ProjectWallProps {
  projects: Project[]
  filterKey: string
  highlightSlug: string
  activeSlug: string | null
  revealed: boolean
  onHover: (project: Project | null) => void
  onSelect: (project: Project) => void
}

function shuffle<T>(list: T[]): T[] {
  const out = list.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

interface WallCardProps {
  project: Project
  slot: number
  yCenter: number
  height: number
  isHighlighted: boolean
  isDimmed: boolean
  revealed: boolean
  exiting: boolean
  onHover: (project: Project | null) => void
  onSelect: (project: Project) => void
}

function WallCard({ project, slot, yCenter, height, isHighlighted, isDimmed, revealed, exiting, onHover, onSelect }: WallCardProps) {
  const [hover, setHover] = useState(false)
  const active = isHighlighted || hover
  const opacity = active ? 1 : isDimmed ? 0.3 : 0.45
  // 캐스케이드 지연 — 중앙(슬롯 0)에서 바깥으로 방사형
  const delay = Math.abs(slot) * (exiting ? 15 : 40)

  return (
    // 외피(위치 계층) — 위치·높이에 CSS transition 없음: 모든 운동은 물리 루프가 공급
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height,
        transform: `translateY(${yCenter - height / 2}px)`,
      }}
    >
      {/* 내피(현출 계층) — reveal/exit 캐스케이드만 담당 (위치 transform과 분리) */}
      <div
        onPointerEnter={(e) => {
          if (e.pointerType !== 'mouse') return   // 터치/펜은 hover 미발생 (stuck hover 방지)
          setHover(true)
          onHover(project)
        }}
        onPointerLeave={(e) => {
          if (e.pointerType !== 'mouse') return
          setHover(false)
          onHover(null)
        }}
        onClick={() => onSelect(project)}
        style={{
          display: 'flex',
          height: '100%',
          justifyContent: 'flex-end',
          cursor: 'pointer',
          boxSizing: 'border-box',
          opacity: exiting ? 0 : revealed ? 1 : 0,
          transform: exiting ? 'translateY(-16px)' : revealed ? 'translateY(0)' : 'translateY(8px)',
          transition: exiting
            ? `opacity 250ms ease-in ${delay}ms, transform 250ms ease-in ${delay}ms`
            : `opacity 0.4s ease ${delay}ms, transform 0.4s ease ${delay}ms`,
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
    </div>
  )
}

export function ProjectWall({ projects, filterKey, highlightSlug, activeSlug, revealed, onHover, onSelect }: ProjectWallProps) {
  // 표시 순서 — 초기값은 projects 그대로 (SSR/hydration 불일치 방지:
  // Math.random을 초기 렌더에서 절대 사용하지 않는다). 셔플은 마운트 후에만.
  const [order, setOrder] = useState<Project[]>(projects)
  const [phase, setPhase] = useState<'idle' | 'exit' | 'enter'>('idle')

  // 호버 시 크기 위계 중심을 호버 카드가 우선 점유 (오프셋·불투명도는 비반응)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const handleHover = (p: Project | null) => {
    setHoveredId(p?.id ?? null)
    onHover(p)
  }

  const effectiveHighlight = activeSlug ?? highlightSlug
  // 크기 위계 중심 — 필터로 제외된 경우 -1 (전 카드 d>=2 취급)
  const tierCenter = activeSlug ?? hoveredId ?? highlightSlug
  const N = order.length
  const tierCenterIdx = useMemo(() => order.findIndex(p => p.id === tierCenter), [order, tierCenter])

  const getSlotHeight = useCallback((i: number) => (
    tierCenterIdx < 0
      ? TIER_HEIGHTS[2]
      : TIER_HEIGHTS[Math.min(circDist(i, tierCenterIdx, N), 2) as 0 | 1 | 2]
  ), [tierCenterIdx, N])

  const ring = useRingWall({ count: N, getSlotHeight, gap: GAP })
  const { moveTo, jumpTo } = ring

  // 마운트 후 1회 Fisher-Yates 셔플 — 인트로(revealed=false)가 교체를 가림
  useEffect(() => {
    setOrder(prev => shuffle(prev))
  }, [])

  // ── 필터 2단 시퀀스: 전 카드 퇴장 → 셔플 스왑 + jumpTo → 캐스케이드 재입장 ──
  const sourceRef = useRef(projects)
  const pendingJumpRef = useRef(false)

  useEffect(() => {
    if (projects === sourceRef.current) return
    setPhase('exit')                         // 1) 퇴장: 페이드아웃, 중앙에서 바깥으로
    const t = setTimeout(() => {
      sourceRef.current = projects
      pendingJumpRef.current = true          // 새 order에서 하이라이트로 즉시 점프
      setOrder(shuffle(projects))            // 2) 필터마다 새로 셔플 (부모 셔플 큐와 독립)
      setPhase('enter')
    }, 350)
    return () => clearTimeout(t)
  }, [projects, filterKey])

  // enter → 더블 rAF 후 idle로 전환해 재입장 캐스케이드 재생
  useEffect(() => {
    if (phase !== 'enter') return
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setPhase('idle')))
    return () => cancelAnimationFrame(raf)
  }, [phase])

  // 프로그래매틱 이동 — 필터 스왑 직후엔 jumpTo(즉시), 그 외엔 최단 원형 트위닝
  useEffect(() => {
    const idx = order.findIndex(p => p.id === effectiveHighlight)
    if (pendingJumpRef.current) {
      pendingJumpRef.current = false
      jumpTo(idx >= 0 ? idx : 0)             // 하이라이트가 중앙에 놓인 채로 재입장
      return
    }
    if (idx >= 0) moveTo(idx)
  }, [effectiveHighlight, order, moveTo, jumpTo])

  return (
    <div
      ref={ring.containerRef}
      className="project-wall-scroll light-panel"
      style={{
        width: 'clamp(300px, 28vw, 28vw)',
        height: '100%',
        flexShrink: 0,
        overflow: 'hidden',
        position: 'relative',
        background: '#FFFFFF',
        touchAction: 'none',
        boxSizing: 'border-box',
      }}
    >
      {ring.slots.map(({ slot, index, turn, yCenter }) => {
        const project = order[index]
        if (!project) return null
        return (
          <WallCard
            // 같은 회전수에 머무는 동안 key 안정 → 이미지 재로드 없음.
            // N < 윈도면 동일 프로젝트가 turn 다른 클론으로 복수 렌더링 (§3-F)
            key={`${project.id}#${turn}`}
            project={project}
            slot={slot}
            yCenter={yCenter}
            height={ring.heights[index] ?? TIER_HEIGHTS[2]}
            isHighlighted={project.id === effectiveHighlight}
            isDimmed={activeSlug !== null && project.id !== activeSlug}
            revealed={revealed && phase === 'idle'}
            exiting={phase === 'exit'}
            onHover={handleHover}
            onSelect={onSelect}
          />
        )
      })}
    </div>
  )
}
