'use client'

// ── GridExperience — 독립 그리드 뷰 (GRID_MODE_PHASE1_SPEC) ──
//
// 링월(/work)·랜딩(/)을 일절 건드리지 않는 완전 독립 라우트(/work-grid)의 루트.
// 물리 엔진 없음 — About 페이지와 같은 세로 문서 스크롤. 밀도 슬라이더가 CSS Grid의
// 열 수(정수 1~6)를 지배하고, 드래그 중에는 정수 열 사이에서 카드 폭을 선형 보간한다.
// flex-wrap 대신 CSS Grid를 쓴다(서브픽셀 밀림 원천 차단). Math.min 클램프로 폭 변화가
// 멈추지 않도록, 카드 폭은 정수 열 폭 사이의 순수 선형 보간으로만 산출한다.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { TYPOLOGY_ORDER, type Project, type ProjectType } from '@/types'
import { sanityThumb } from '@/lib/imageUrl'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"

// ── 단일 정의 상수 (§7) ──
const UI_PAD = 34               // 헤더·컨트롤·밀도바 공유 좌우 여백 (링월 헤더 기준)
const GAP = 16                  // 그리드 셀 간격
const CARD_RATIO = 4 / 3        // 카드 이미지 비율 (4:3)
const SLIDE_H_RATIO = 0.72      // ContentArea 히어로 높이 비율 — 1열 폭 공식에 사용
const FALLBACK_RATIO = 4 / 3
const MIN_COLS = 1              // 하한. 실물 판단 후 1→3 변경은 이 한 줄만 바꾼다.
const COVER_FALLBACK = '#1E1C18'
const AWARD_GOLD = '#b89773'
const HEADER_H = 80             // 전역 헤더 존 회피 상단 여백
const DENSITY_BAR_H = 84        // 하단 고정 밀도바 높이

// 뷰포트 종횡비 → 열 상한 (HdM 방식, §3-1)
function maxColsForAspect(r: number): number {
  if (r < 0.85) return 2        // portrait
  if (r < 1.25) return 4        // ~square
  return 6                      // landscape
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

interface GridExperienceProps {
  projects: Project[]   // Sanity에서 careerNo 내림차순 정렬 상태로 도착 — 재정렬 불요
}

export function GridExperience({ projects }: GridExperienceProps) {
  // ── 필터 (링월과 동일 술어, 그리드 자체 상태) ──
  const FILTER_TYPES = useMemo(() => ['All', ...TYPOLOGY_ORDER.filter(t =>
    projects.some(p => p.type === t || p.subTypes?.includes(t))
  )], [projects])
  const [activeFilter, setActiveFilter] = useState('All')
  const filteredProjects = useMemo(
    () => activeFilter === 'All'
      ? projects
      : projects.filter(p => p.type === activeFilter || p.subTypes?.includes(activeFilter as ProjectType)),
    [activeFilter, projects],
  )

  // ── 뷰포트 치수 — 열 상한·1열 폭 공식이 의존 ──
  const [vp, setVp] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const update = () => setVp({ w: window.innerWidth, h: window.innerHeight })
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const maxCols = useMemo(
    () => (vp.h > 0 ? maxColsForAspect(vp.w / vp.h) : 6),
    [vp.w, vp.h],
  )

  // ── 밀도 상태 — cols는 드래그 중 분수, 정착 시 정수 ──
  const [cols, setCols] = useState(3)
  const [settled, setSettled] = useState(true)   // true=정수 정착(1fr 렌더), false=드래그/트윈 중
  const colsRef = useRef(cols)
  colsRef.current = cols

  // 상한 변경 시 정수로 클램프
  useEffect(() => {
    setCols(c => clamp(Math.round(c), MIN_COLS, maxCols))
    setSettled(true)
  }, [maxCols])

  // ── 릴리스/클릭 시 정수 정착 트윈 (부드러운 스냅) ──
  const rafRef = useRef(0)
  const animateColsTo = useCallback((target: number) => {
    const from = colsRef.current
    cancelAnimationFrame(rafRef.current)
    if (from === target) { setCols(target); setSettled(true); return }
    setSettled(false)
    const start = performance.now()
    const dur = 240
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / dur)
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2   // easeInOutQuad
      setCols(from + (target - from) * e)
      if (t < 1) rafRef.current = requestAnimationFrame(step)
      else { setCols(target); setSettled(true) }
    }
    rafRef.current = requestAnimationFrame(step)
  }, [])
  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  // ── 슬라이더 좌표 매핑 — knob·스냅박스가 공유 (§3-4) ──
  const span = Math.max(1, maxCols - MIN_COLS)
  const colsToPos = useCallback((c: number) => (c - MIN_COLS) / span, [span])
  const posToCols = useCallback((pos: number) => MIN_COLS + clamp(pos, 0, 1) * span, [span])

  const trackRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const posFromEvent = (clientX: number) => {
    const el = trackRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    return clamp((clientX - rect.left) / rect.width, 0, 1)
  }
  const onTrackDown = (e: React.PointerEvent<HTMLDivElement>) => {
    cancelAnimationFrame(rafRef.current)
    draggingRef.current = true
    setSettled(false)
    e.currentTarget.setPointerCapture(e.pointerId)
    setCols(posToCols(posFromEvent(e.clientX)))
  }
  const onTrackMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return
    setCols(posToCols(posFromEvent(e.clientX)))
  }
  const onTrackUp = () => {
    if (!draggingRef.current) return
    draggingRef.current = false
    animateColsTo(clamp(Math.round(colsRef.current), MIN_COLS, maxCols))
  }

  // ── 폭 규칙 (§3-2·§3-3) ──
  const ready = vp.w > 0 && vp.h > 0
  const full = Math.max(0, vp.w - UI_PAD * 2)
  const heroW = CARD_RATIO * (vp.h * SLIDE_H_RATIO)   // 1열 = 콘텐츠 히어로 폭
  // 정수 열 n의 카드 폭. n<=1은 히어로 폭 고정, 2~6은 헤더 전체폭 균등 분할.
  const widthAt = (n: number) => (n <= 1 ? heroW : (full - GAP * (n - 1)) / n)

  const nRounded = clamp(Math.round(cols), MIN_COLS, maxCols)

  // 그리드 템플릿 — 정착 시 1fr(정확 균등 분할), 드래그 중 정수 열 폭 선형 보간
  let template = 'repeat(1, 1fr)'
  if (ready) {
    if (settled) {
      template = nRounded === 1 ? `${heroW}px` : `repeat(${nRounded}, 1fr)`
    } else {
      const f = clamp(Math.floor(cols), MIN_COLS, maxCols)
      const c = clamp(Math.ceil(cols), MIN_COLS, maxCols)
      const t = c === f ? 0 : (cols - f) / (c - f)
      const cardW = lerp(widthAt(f), widthAt(c), t)   // 정수 열 폭 사이 선형 보간 (멈춤 없음)
      // 보간 폭에서 실제로 들어가는 열 수 — 클램프가 아닌 폭 파생(오버플로/팝 방지)
      const n = clamp(Math.floor((full + GAP) / (cardW + GAP)), MIN_COLS, maxCols)
      template = `repeat(${n}, ${cardW}px)`
    }
  }

  // ── 호버 요약 ──
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // 조밀 구간(5열+) 텍스트 축소 — 숨기지 않고 크기만 (§4-2)
  const dense = nRounded >= 5
  const titleSize = dense ? 11 : 13
  const summarySize = dense ? 9 : 11
  const summarySlotH = Math.round(summarySize * 1.5)   // 요약 높이 예약 → reflow 차단

  return (
    <div style={{
      fontFamily: FONT,
      background: '#FFFFFF',
      color: '#080706',
      minHeight: '100vh',
      paddingTop: HEADER_H,
      paddingBottom: DENSITY_BAR_H + 48,   // 하단 고정 밀도바만큼 확보
    }}>
      {/* ── CONTROLS — 필터(좌) + 뷰토글 Ring|Grid(우) ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24,
        paddingLeft: UI_PAD,
        paddingRight: UI_PAD,
        paddingTop: 8,
        paddingBottom: 20,
      }}>
        {/* 필터 칩 — 링월 문법(불릿+대문자+자간), 그리드 자체 상태 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          overflowX: 'auto',
          minWidth: 0,
        }}>
          {FILTER_TYPES.map(t => (
            <button
              key={t}
              onClick={() => setActiveFilter(t)}
              style={{
                background: 'none',
                border: 'none',
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

        {/* 뷰 토글 — 필터와 다른 층위. Ring→/work, Grid=현재(활성) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <Link
            href="/work"
            style={{
              fontFamily: FONT,
              fontSize: 11,
              fontWeight: 300,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#080706',
              opacity: 0.5,
              textDecoration: 'none',
            }}
          >
            Ring
          </Link>
          <span style={{ opacity: 0.25, fontSize: 11 }}>|</span>
          <span style={{
            fontFamily: FONT,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#080706',
          }}>
            Grid
          </span>
        </div>
      </div>

      {/* ── GRID — 밀도에 따라 폭 규칙 상이. 세로 문서 스크롤 ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: template,
        gap: GAP,
        justifyContent: 'center',   // 1열·드래그 중 중앙 정렬 (2~6열 정착 시 free space 0이라 무효)
        paddingLeft: UI_PAD,
        paddingRight: UI_PAD,
      }}>
        {filteredProjects.map(project => {
          const hovered = hoveredId === project.id
          const award = project.awards?.find(a => a.visible !== false)?.title
          const hotspot = project.coverHotspot
          const objectPosition = hotspot ? `${hotspot.x * 100}% ${hotspot.y * 100}%` : 'center'
          return (
            <div key={project.id}>
              {/* 이미지 — 4:3, hotspot 크롭 */}
              <div
                onMouseEnter={() => setHoveredId(project.id)}
                onMouseLeave={() => setHoveredId(prev => (prev === project.id ? null : prev))}
                style={{
                  aspectRatio: '4 / 3',
                  overflow: 'hidden',
                  background: project.coverColor ?? COVER_FALLBACK,
                }}
              >
                {project.coverImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={sanityThumb(project.coverImage, 800)}
                    alt={project.title.en}
                    loading="lazy"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition,
                      display: 'block',
                    }}
                  />
                )}
              </div>

              {/* 하단 텍스트 — 타이틀 상시, 호버 요약 페이드인(높이 예약) */}
              <div style={{ paddingTop: 10 }}>
                <div style={{
                  fontSize: titleSize,
                  fontWeight: 450,
                  color: '#080706',
                  lineHeight: 1.3,
                  wordBreak: 'keep-all',
                }}>
                  {project.title.en}
                </div>
                {/* 요약 슬롯 — min-height로 높이 예약 → reflow 없음. 전 구간 노출(축소만) */}
                <div style={{ minHeight: summarySlotH, marginTop: 4 }}>
                  <div style={{
                    fontSize: summarySize,
                    fontWeight: 300,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    lineHeight: 1.4,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    opacity: hovered ? 1 : 0,
                    transition: 'opacity 200ms ease',
                  }}>
                    <span style={{ color: '#080706', opacity: 0.6 }}>{project.type}</span>
                    {award && (
                      <>
                        <span style={{ opacity: 0.35 }}> · </span>
                        <span style={{ color: AWARD_GOLD }}>{award}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── DENSITY BAR — 하단 고정 전용 바 (카드와 히트 영역 분리) ── */}
      <div style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        height: DENSITY_BAR_H,
        background: '#080706',
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        paddingLeft: UI_PAD,
        paddingRight: UI_PAD,
        zIndex: 40,
      }}>
        {/* DENSITY 라벨 (좌) */}
        <span style={{
          fontSize: 10,
          fontWeight: 400,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.5)',
          flexShrink: 0,
        }}>
          Density
        </span>

        {/* 트랙 (중) — knob + fill + 스냅 박스. knob·박스 동일 좌표계 */}
        <div
          ref={trackRef}
          onPointerDown={onTrackDown}
          onPointerMove={onTrackMove}
          onPointerUp={onTrackUp}
          onPointerCancel={onTrackUp}
          style={{
            position: 'relative',
            flex: 1,
            height: 44,
            cursor: 'pointer',
            touchAction: 'none',
          }}
        >
          {/* 트랙 라인 */}
          <div style={{
            position: 'absolute',
            top: 14,
            left: 0,
            right: 0,
            height: 2,
            background: 'rgba(255,255,255,0.18)',
            borderRadius: 1,
          }} />
          {/* fill */}
          <div style={{
            position: 'absolute',
            top: 14,
            left: 0,
            width: `${colsToPos(cols) * 100}%`,
            height: 2,
            background: 'rgba(255,255,255,0.6)',
            borderRadius: 1,
          }} />
          {/* knob */}
          <div style={{
            position: 'absolute',
            top: 8,
            left: `${colsToPos(cols) * 100}%`,
            transform: 'translateX(-50%)',
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: '#FFFFFF',
            pointerEvents: 'none',
          }} />

          {/* 스냅 박스 — knob과 동일 좌표(colsToPos, left:pos%). 각 스텝은 열 수만큼 미니박스, 숫자 없음 */}
          {Array.from({ length: maxCols - MIN_COLS + 1 }, (_, i) => MIN_COLS + i).map(c => {
            const active = c === nRounded
            return (
              <div
                key={c}
                onClick={() => animateColsTo(c)}
                style={{
                  position: 'absolute',
                  top: 28,
                  left: `${colsToPos(c) * 100}%`,
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  gap: 2,
                  cursor: 'pointer',
                }}
              >
                {Array.from({ length: c }, (_, k) => (
                  <span
                    key={k}
                    style={{
                      width: 3,
                      height: 9,
                      borderRadius: 1,
                      background: active ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                      transition: 'background 200ms ease',
                    }}
                  />
                ))}
              </div>
            )
          })}
        </div>

        {/* 열 수 카운트 (우) — DENSITY와 동일 회색톤·대문자·자간 */}
        <span style={{
          fontSize: 10,
          fontWeight: 400,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.5)',
          flexShrink: 0,
          minWidth: 48,
          textAlign: 'right',
        }}>
          {nRounded} cols
        </span>
      </div>
    </div>
  )
}
