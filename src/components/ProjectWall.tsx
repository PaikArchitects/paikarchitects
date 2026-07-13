'use client'

// ── ProjectWall — 가상 링 렌더러 (WALL_RING_SPEC 개정판) ──
//
// 네이티브 스크롤 모델 폐기. 위치·티어·불투명도는 useRingWall의 offset과
// props로부터의 순수 함수 파생이다. 이중 모드: N이 뷰포트를 채우면 순환
// 루프(원형 거리), 그 미만이면 중앙 정렬 유한 스택(선형 거리) — 분기는
// 거리 함수 한 지점뿐, 배치 수학은 동일하다 (§3). 컨테이너는 overflow
// hidden — 어떤 카드든 d=0이 되는 순간 정확히 세로 중앙에 위치한다.
//
// D1(≥1440px): 텍스트를 썸네일 좌측에 우정렬. D2(≤1439px): 텍스트를
// 썸네일 하단으로 이동, 프로젝트명/용도 상하 배열 (WALL_CARD_TEXT_BELOW_SPEC).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Project } from '@/types'
import { sanityThumb } from '@/lib/imageUrl'
import { shuffle } from '@/lib/shuffle'
import { circDist, useRingWall } from '@/hooks/useRingWall'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"

// 티어 중심과의 거리(d) 기반 3단 이미지 높이 — D1/D2 공통
const TIER_IMG_HEIGHTS: Record<0 | 1 | 2, number> = { 0: 150, 1: 120, 2: 96 }
// D2 전용 — 이미지 하단 텍스트 행 (프로젝트명 + 용도 상하 배열)
const BELOW_TEXT_H = 44
const GAP = 16
// D1/D2 경계 — globals.css의 1439px 미디어쿼리와 반드시 동일
const D2_MAX_WIDTH = 1439

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
  slot: number
  yCenter: number
  height: number        // 슬롯 전체 높이 (이미지 + below 시 텍스트 행)
  imgHeight: number     // 이미지 영역 높이 — height - (below ? BELOW_TEXT_H : 0)
  below: boolean
  isHighlighted: boolean
  isDimmed: boolean
  revealed: boolean
  exiting: boolean
  onHover: (project: Project | null) => void
  onSelect: (project: Project) => void
}

function WallCardImage({ project, height, opacity, below }: {
  project: Project
  height: number | string
  opacity: number
  below: boolean
}) {
  return (
    <div
      className={below ? undefined : 'wall-card-img'}
      style={{
        height,
        aspectRatio: '2 / 1',
        flexShrink: below ? 0 : 1,
        minWidth: 0,
        overflow: 'hidden',
        opacity,
        transition: 'opacity 0.3s ease',
      }}
    >
      {project.coverImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={sanityThumb(project.coverImage, 480)}
          alt={project.title}
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', background: project.coverColor }} />
      )}
    </div>
  )
}

function WallCardText({ project, opacity, below, width }: {
  project: Project
  opacity: number
  below: boolean
  width?: number   // D2 — 이미지 폭과 동일하게 맞춤
}) {
  return (
    <div
      className={below ? undefined : 'wall-card-text'}
      style={{
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: below ? 'flex-start' : 'flex-end',
        textAlign: below ? 'left' : 'right',
        width: below ? width : undefined,
        height: below ? BELOW_TEXT_H : undefined,
        paddingTop: below ? 6 : 2,
        paddingLeft: below ? 0 : 20,
        paddingRight: below ? 0 : 8,
        boxSizing: 'border-box',
        opacity,
        transition: 'opacity 0.3s ease',
        overflow: 'hidden',
      }}
    >
      {/* 프로젝트명 — D2는 1줄 ellipsis (텍스트 행 높이 고정 보장) */}
      <div style={{
        fontFamily: FONT,
        fontSize: 13,
        fontWeight: 450,
        color: '#080706',
        lineHeight: 1.3,
        wordBreak: 'keep-all' as const,
        width: '100%',
        ...(below ? {
          whiteSpace: 'nowrap' as const,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        } : {}),
      }}>
        {project.title}
      </div>
      {/* 용도 — D2는 1줄 클램프 (D1은 기존 2줄 유지) */}
      <div style={{
        fontFamily: FONT,
        fontSize: 11,
        fontWeight: 300,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: '#080706',
        opacity: 0.6,
        marginTop: below ? 2 : 4,
        lineHeight: 1.35,
        wordBreak: 'keep-all' as const,
        width: '100%',
        display: '-webkit-box',
        WebkitBoxOrient: 'vertical' as const,
        WebkitLineClamp: below ? 1 : 2,
        overflow: 'hidden',
      }}>
        {project.type}
      </div>
    </div>
  )
}

function WallCard({ project, slot, yCenter, height, imgHeight, below, isHighlighted, isDimmed, revealed, exiting, onHover, onSelect }: WallCardProps) {
  const [hover, setHover] = useState(false)
  const active = isHighlighted || hover
  const opacity = active ? 1 : isDimmed ? 0.3 : 0.45
  // 캐스케이드 지연 — 중앙(슬롯 0)에서 바깥으로 방사형
  const delay = Math.abs(slot) * (exiting ? 15 : 40)

  // D2 텍스트 폭 = 이미지 폭 = imgHeight × 2 (aspectRatio 2/1). 측정 불필요.
  const textWidth = below ? imgHeight * 2 : undefined

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
          // D1: 가로 [텍스트][이미지], 우측 정렬 / D2: 세로 [이미지][텍스트]
          flexDirection: below ? 'column' : 'row',
          justifyContent: below ? 'flex-start' : 'flex-end',
          alignItems: below ? 'flex-end' : 'stretch',
          cursor: 'pointer',
          boxSizing: 'border-box',
          opacity: exiting ? 0 : revealed ? 1 : 0,
          transform: exiting ? 'translateY(-16px)' : revealed ? 'translateY(0)' : 'translateY(8px)',
          transition: exiting
            ? `opacity 250ms ease-in ${delay}ms, transform 250ms ease-in ${delay}ms`
            : `opacity 0.4s ease ${delay}ms, transform 0.4s ease ${delay}ms`,
        }}
      >
        {below ? (
          <>
            <WallCardImage project={project} height={imgHeight} opacity={opacity} below />
            <WallCardText project={project} opacity={opacity} below width={textWidth} />
          </>
        ) : (
          <>
            <WallCardText project={project} opacity={opacity} below={false} />
            <WallCardImage project={project} height="100%" opacity={opacity} below={false} />
          </>
        )}
      </div>
    </div>
  )
}

export function ProjectWall({ projects, filterKey, highlightSlug, activeSlug, revealed, onHover, onSelect }: ProjectWallProps) {
  // 표시 순서 — 초기값은 projects 그대로 (SSR/hydration 불일치 방지:
  // Math.random을 초기 렌더에서 절대 사용하지 않는다). 셔플은 마운트 후에만.
  const [order, setOrder] = useState<Project[]>(projects)
  const [phase, setPhase] = useState<'idle' | 'exit' | 'enter'>('idle')

  // D2 판정 — 텍스트 하단 배치 모드. matchMedia로 globals.css와 경계 동기.
  // SSR 안전: 초기값 false(D1) 고정, useEffect는 마운트 후에만 실행.
  const [below, setBelow] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${D2_MAX_WIDTH}px)`)
    const fn = () => setBelow(mq.matches)
    fn()
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])

  // getSlotHeight는 순수 콜백이므로 below를 ref로 읽고, 변경 시 tick으로 재생성.
  const belowRef = useRef(false)
  belowRef.current = below
  const [belowTick, setBelowTick] = useState(0)
  useEffect(() => { setBelowTick(t => t + 1) }, [below])

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

  // 거리 함수 — 루프: 원형 / 유한: 선형 (§3-A). 모드는 훅 반환 후에야 확정되므로
  // ref 미러로 읽는다. 모드 전환 시 훅이 스스로 웨이크해 높이를 재수렴시킨다.
  const isLoopRef = useRef(true)
  const getSlotHeight = useCallback((i: number) => {
    const extra = belowRef.current ? BELOW_TEXT_H : 0
    if (tierCenterIdx < 0) return TIER_IMG_HEIGHTS[2] + extra
    const d = isLoopRef.current ? circDist(i, tierCenterIdx, N) : Math.abs(i - tierCenterIdx)
    return TIER_IMG_HEIGHTS[Math.min(d, 2) as 0 | 1 | 2] + extra
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tierCenterIdx, N, belowTick])

  const ring = useRingWall({ count: N, getSlotHeight, gap: GAP })
  isLoopRef.current = ring.isLoop
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

  // 프로그래매틱 이동 — 필터 스왑 직후엔 jumpTo(즉시), 그 외엔 모드별 트위닝
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
      className="light-panel"
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
        const h = ring.heights[index] ?? (TIER_IMG_HEIGHTS[2] + (below ? BELOW_TEXT_H : 0))
        return (
          <WallCard
            // 같은 회전수에 머무는 동안 key 안정 → 이미지 재로드 없음.
            // 루프는 슬롯 수 ≤ N, 유한은 turn 고정 0 — 어느 모드든 클론 없음 (§2·§3)
            key={`${project.id}#${turn}`}
            project={project}
            slot={slot}
            yCenter={yCenter}
            height={h}
            imgHeight={below ? h - BELOW_TEXT_H : h}
            below={below}
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
