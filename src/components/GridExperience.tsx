'use client'

// ── GridExperience — 독립 그리드 뷰 (GRID_MODE_V2_SPEC) ──
//
// 링월(/work)·랜딩(/)을 일절 건드리지 않는 완전 독립 라우트(/work-grid)의 루트.
// V2의 핵심은 밀도 전환 모델이다. 1차의 CSS Grid + `col = i % ncol` 방식은 열 수가 바뀌는
// 순간 전체 카드의 (행,열)을 재계산해 "보이던 카드가 순간이동"하는 결함이 있었다(§0).
//
// V2 모델:
//   1) 정수 열 레이아웃 L(n)을 단일 규칙 deriveUp으로만 파생한다. L(n+1)은 L(n)의 상위
//      ceil(N/(n+1))개 행을 (row,col) 그대로 보존하고, 새로 생긴 마지막 열만 L(n)의 하단
//      잔여 카드(=대기 카드)로 채운다. → 인접 두 정수 열 사이에서 "보이는 카드는 자기
//      (행,열)을 절대 바꾸지 않는다"가 구조적으로 보장된다(§2-3).
//   2) 렌더는 CSS Grid가 아니라 절대좌표(position:absolute + transform translate, px 전용).
//      드래그 진행도 t(0=A열, 1=B열)에 따라 매 프레임 x·y·width·opacity를 직접 세팅한다.
//   3) 기존 열(0..A-1)은 폭만 wA→wB로 수렴하고, 새 열은 폭 0→wB로 열리며 opacity 0→1
//      페이드인한다. 새 열로 끌어올려지는 대기 카드는 원래 하단 자리에서 opacity 1→0으로
//      빠지므로 어떤 카드도 화면에서 날아다니지 않는다(§2-4 대칭).
//
// 카드 프레임은 열 수와 무관하게 항상 4:3 균등폭이다. 원본 이미지 비율은 카드 폭에 일절
// 반영하지 않고 object-fit:cover + coverHotspot으로 크롭한다(§1).

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { TYPOLOGY_ORDER, type Project, type ProjectType } from '@/types'
import { sanityThumb } from '@/lib/imageUrl'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"

// ── 단일 정의 상수 ──
const UI_PAD = 34               // 헤더·컨트롤·그리드 공유 좌우 여백 (링월 헤더 기준)
const GAP = 16                  // 카드 간격 (수평·수직 공통)
const CARD_RATIO = 4 / 3        // 카드 프레임 비율 — 원본 비율과 무관하게 고정 (§1)
const SLIDE_H_RATIO = 0.72      // ContentArea 히어로 높이 비율 — 1열 폭 공식 (§3)
const MIN_COLS = 1              // 하한. 실물 판단 후 1→3 변경은 이 한 줄만 바꾼다 (§3)
const MAX_COLS = 6              // 절대 상한 (뷰포트 종횡비가 실제 상한을 더 낮출 수 있다)
const BASE_COLS = 3             // 레이아웃 파생 기저 — 이 열에서 카드가 careerNo 순 행우선 배열
const DEFAULT_COLS = 3
const COVER_FALLBACK = '#1E1C18'
const AWARD_GOLD = '#b89773'
const HEADER_H = 80             // 전역 헤더(워드마크·nav) 존 회피 상단 여백
const BAR_RESERVE = 120         // 하단 플로팅 밀도바 회피 여백
const TWEEN_MS = 420            // 릴리스 후 정수 정착 트윈 (§2-5)

// 카드 하단 텍스트 — 폭에 연동한 연속 스케일. 정수 열 경계에서 행 피치가 튀지 않게
// 이산 분기(dense 플래그) 대신 폭의 연속 함수로 둔다 (§5).
const META_PT = 10              // 이미지 ↔ 타이틀
const TITLE_LH = 1.35
const TITLE_LINES = 2           // 2행 예약 — 타이틀 줄바꿈이 행 피치를 흔들지 않도록
const SUM_MT = 4
const SUM_LH = 1.5

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

const titlePx = (w: number) => clamp(w * 0.030, 10, 13)
const sumPx = (w: number) => clamp(w * 0.024, 8.5, 11)
/** 카드 하단 텍스트 블록 높이 — 폭의 연속 함수 */
const metaH = (w: number) =>
  META_PT + titlePx(w) * TITLE_LH * TITLE_LINES + SUM_MT + sumPx(w) * SUM_LH

/** 뷰포트 종횡비 → 열 상한 (§6) */
function maxColsForAspect(r: number): number {
  if (r < 0.85) return 2        // portrait
  if (r < 1.25) return 4        // ~square
  return 6                      // landscape
}

// ── 정수 열 레이아웃 ─────────────────────────────────────────────────────────
// Layout = 행 × 열 격자. 값은 projectOrder 인덱스, 빈 슬롯은 null.

type Layout = (number | null)[][]

function rowMajor(order: number[], cols: number): Layout {
  const rows: Layout = []
  for (let i = 0; i < order.length; i += cols) {
    const row: (number | null)[] = []
    for (let c = 0; c < cols; c++) row.push(i + c < order.length ? order[i + c] : null)
    rows.push(row)
  }
  return rows
}

/**
 * n열 → n+1열. 상위 ceil(total/(n+1))개 행의 기존 카드는 (row,col)을 그대로 보존하고,
 * 새로 생긴 마지막 열과(있다면) 기존 빈 슬롯만 하단 잔여 카드(=대기 카드)로 위에서부터
 * 순서대로 채운다 (§2-3, §2-6).
 *
 * 빈 슬롯까지 채우는 이유: 신규 열만 채우면 수용량이 `보존행 카드 수 + 행 수`로 제한돼
 * 필터로 카드 수가 적을 때 카드가 배치되지 못하고 유실된다(총량 rows×(n+1)로 채우면 항상 수용).
 * 빈 슬롯은 A에서도 비어 있던 자리이므로, 여기에 카드가 들어와도 "보이던 카드는 이동하지
 * 않는다"는 불변식은 유지된다 — 새 카드가 빈자리에 페이드인할 뿐이다.
 *
 * 이 규칙이 위치 고정의 유일한 근거이므로 다른 경로로 레이아웃을 만들지 않는다.
 */
function deriveUp(prev: Layout, n: number, total: number): Layout {
  const rows = Math.max(1, Math.ceil(total / (n + 1)))
  const next: Layout = []
  for (let r = 0; r < rows; r++) {
    const src = prev[r] ?? []
    const row: (number | null)[] = []
    for (let c = 0; c < n; c++) row.push(src[c] ?? null)
    row.push(null)                                   // 새로 열리는 열
    next.push(row)
  }
  const pool: number[] = []
  for (let r = rows; r < prev.length; r++) {
    for (const v of prev[r]) if (v !== null) pool.push(v)
  }
  let k = 0
  for (let r = 0; r < rows && k < pool.length; r++) {
    for (let c = 0; c <= n && k < pool.length; c++) {
      if (next[r][c] === null) next[r][c] = pool[k++]
    }
  }
  return next
}

/** deriveUp의 역 — 마지막 열을 떼어 하단 신규 행으로 되돌린다. 기저 순서 산출에만 쓴다. */
function deriveDown(prev: Layout, n: number): Layout {
  const nn = n - 1
  const out: Layout = prev.map(r => r.slice(0, nn))
  const tail: number[] = []
  for (const r of prev) {
    const v = r[nn]
    if (v !== null && v !== undefined) tail.push(v)
  }
  for (let i = 0; i < tail.length; i += nn) {
    const row: (number | null)[] = []
    for (let c = 0; c < nn; c++) row.push(i + c < tail.length ? tail[i + c] : null)
    out.push(row)
  }
  return out
}

/**
 * MIN_COLS..MAX_COLS 전 레이아웃을 만든다.
 * 1) BASE_COLS(3열) 행우선 배열을 MIN_COLS까지 역파생해 기저 순서(seed)를 얻는다.
 * 2) seed에서 deriveUp만으로 상향 파생한다 → 인접 열 간 (row,col) 보존이 전 구간 성립하고,
 *    카드 수가 열 수로 정확히 나뉘는 일반 경우 BASE_COLS는 careerNo 순 행우선으로 복원된다.
 */
function buildLayouts(total: number): Record<number, Layout> {
  const out: Record<number, Layout> = {}
  if (total <= 0) {
    for (let n = MIN_COLS; n <= MAX_COLS; n++) out[n] = []
    return out
  }
  const order = Array.from({ length: total }, (_, i) => i)
  let seedLayout = rowMajor(order, Math.max(BASE_COLS, MIN_COLS))
  for (let n = Math.max(BASE_COLS, MIN_COLS); n > MIN_COLS; n--) seedLayout = deriveDown(seedLayout, n)
  const seed: number[] = []
  for (const row of seedLayout) for (const v of row) if (v !== null) seed.push(v)

  out[MIN_COLS] = rowMajor(seed, MIN_COLS)
  for (let n = MIN_COLS; n < MAX_COLS; n++) out[n + 1] = deriveUp(out[n], n, total)
  return out
}

interface Slot { row: number; col: number }

function slotMap(l: Layout): Map<number, Slot> {
  const m = new Map<number, Slot>()
  l.forEach((row, r) => row.forEach((v, c) => { if (v !== null) m.set(v, { row: r, col: c }) }))
  return m
}

// ── 전환 인스턴스 ────────────────────────────────────────────────────────────
// stay : A·B에서 (row,col)이 동일 — 위치 고정(열 불변), 폭만 보간, opacity 1
// out  : A에만 남는 자리 — 그 자리에서 opacity 1→0 (역방향에선 0→1)
// in   : B의 새 열 자리 — 폭 0→wB로 열리며 opacity 0→1 (§2-3, §2-4)
type InstKind = 'stay' | 'out' | 'in'
interface Inst { key: string; idx: number; row: number; col: number; kind: InstKind }

/** 드래그·트윈 중의 분수 cols → 보간 구간 (A=정수 하한, B=A+1, t=진행도) (§2-5) */
function pairFor(cols: number, maxCols: number) {
  const hi = Math.max(MIN_COLS, maxCols)
  const c = clamp(cols, MIN_COLS, hi)
  let a = Math.floor(c + 1e-6)
  if (a >= hi) a = hi - 1
  a = Math.max(MIN_COLS, a)
  const b = Math.min(hi, a + 1)
  const t = b === a ? 1 : clamp(c - a, 0, 1)
  return { a, b, t }
}

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
  const total = filteredProjects.length

  // ── 뷰포트 치수 — 열 상한·1열 히어로 폭이 의존 ──
  const [vp, setVp] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const update = () => setVp({ w: window.innerWidth, h: window.innerHeight })
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  const ready = vp.w > 0 && vp.h > 0
  const maxCols = ready ? maxColsForAspect(vp.w / vp.h) : MAX_COLS

  // ── 레이아웃 테이블 — 필터(카드 수) 변경 시에만 재계산 ──
  const layouts = useMemo(() => buildLayouts(total), [total])

  // ── 밀도 상태 ──
  // cols(분수)는 매 프레임 갱신되므로 ref가 정본이다. React state는 인스턴스 목록(pair)과
  // 라벨(nLabel)처럼 프레임 단위로 바뀌지 않는 것만 보유한다.
  const colsRef = useRef<number>(clamp(DEFAULT_COLS, MIN_COLS, MAX_COLS))
  const [pair, setPair] = useState(() => {
    const p = pairFor(clamp(DEFAULT_COLS, MIN_COLS, MAX_COLS), MAX_COLS)
    return { a: p.a, b: p.b }
  })
  const pairRef = useRef(pair)
  const [nLabel, setNLabel] = useState(clamp(DEFAULT_COLS, MIN_COLS, MAX_COLS))
  const nLabelRef = useRef(nLabel)

  // ── 인스턴스 목록 — 현재 보간 구간(A,B)에서만 유효 ──
  const instances = useMemo<Inst[]>(() => {
    const la = layouts[pair.a] ?? []
    const lb = layouts[pair.b] ?? []
    const sa = slotMap(la)
    const sb = slotMap(lb)
    const list: Inst[] = []
    for (let i = 0; i < total; i++) {
      const A = sa.get(i)
      const B = sb.get(i)
      // key 규칙: 'in'과 'stay'가 같은 key('-p')를 공유해 정수 경계를 넘을 때 DOM 재사용
      if (A && B) {
        if (A.row === B.row && A.col === B.col) {
          list.push({ key: `${i}-p`, idx: i, row: A.row, col: A.col, kind: 'stay' })
        } else {
          list.push({ key: `${i}-o`, idx: i, row: A.row, col: A.col, kind: 'out' })
          list.push({ key: `${i}-p`, idx: i, row: B.row, col: B.col, kind: 'in' })
        }
      } else if (B) {
        list.push({ key: `${i}-p`, idx: i, row: B.row, col: B.col, kind: 'in' })
      } else if (A) {
        list.push({ key: `${i}-o`, idx: i, row: A.row, col: A.col, kind: 'out' })
      }
    }
    return list
  }, [layouts, pair, total])

  // ── DOM 참조 ──
  const cardEls = useRef(new Map<string, HTMLElement>())
  const gridRef = useRef<HTMLDivElement>(null)
  const fillRef = useRef<HTMLDivElement>(null)
  const knobRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const instRef = useRef<{ a: number; b: number; list: Inst[] }>({ a: pair.a, b: pair.b, list: [] })

  const span = Math.max(1, maxCols - MIN_COLS)
  // knob·fill·스냅 아이콘이 공유하는 유일한 좌표 함수. 기준 폭은 항상 '트랙 폭'이다 (§4)
  const colsToPos = useCallback((c: number) => clamp((c - MIN_COLS) / span, 0, 1), [span])
  const posToCols = useCallback((pos: number) => MIN_COLS + clamp(pos, 0, 1) * span, [span])

  // ── 매 프레임 페인트 — 절대좌표 px 전용 (퍼센트 금지, Safari 대비) ──
  const paint = useCallback((cols: number) => {
    const { a, b, t } = pairFor(cols, maxCols)

    // 보간 구간이 바뀌면 인스턴스 목록을 갱신해야 한다 → state 반영 후 재렌더 시 페인트
    if (a !== pairRef.current.a || b !== pairRef.current.b) {
      pairRef.current = { a, b }
      setPair({ a, b })
    }
    const nr = clamp(Math.round(cols), MIN_COLS, maxCols)
    if (nr !== nLabelRef.current) {
      nLabelRef.current = nr
      setNLabel(nr)
    }

    // 슬라이더 크롬 — 트랙 폭 기준 동일 좌표계
    const pos = colsToPos(cols) * 100
    if (fillRef.current) fillRef.current.style.width = `${pos}%`
    if (knobRef.current) knobRef.current.style.left = `${pos}%`

    if (!ready) return
    const cur = instRef.current
    if (cur.a !== a || cur.b !== b) return   // 목록이 아직 이 구간이 아님 — 재렌더 후 페인트

    const full = Math.max(0, vp.w - UI_PAD * 2)
    const heroW = Math.min(full, CARD_RATIO * vp.h * SLIDE_H_RATIO)
    const widthAt = (n: number) => (n <= 1 ? heroW : Math.max(1, (full - GAP * (n - 1)) / n))
    const wA = widthAt(a)
    const wB = widthAt(b)

    const opening = b > a
    const wMain = lerp(wA, wB, t)          // 기존 열 — 폭만 A→B로 수렴
    const wNew = opening ? t * wB : 0      // 새 열 — 폭 0→wB로 열린다
    const gapNew = opening ? t * GAP : 0
    // 행 총폭이 t 전 구간에서 콘텐츠 폭과 정확히 일치한다(오버플로·팝 없음).
    // a*wA+(a-1)*GAP = b*wB+(b-1)*GAP = full 이므로 신규 열·간격 증가분이 기존 열 축소분과 상쇄된다.
    const rowW = a * wMain + (a - 1) * GAP + gapNew + wNew
    const originX = UI_PAD + (full - rowW) / 2
    const newColX = originX + a * wMain + (a - 1) * GAP + gapNew

    const pitch = wMain / CARD_RATIO + metaH(wMain) + GAP

    for (const inst of cur.list) {
      const el = cardEls.current.get(inst.key)
      if (!el) continue
      const isNew = inst.col >= a
      const w = isNew ? wNew : wMain
      const x = isNew
        ? newColX + (inst.col - a) * (wNew + GAP)
        : originX + inst.col * (wMain + GAP)
      const y = inst.row * pitch
      const op = inst.kind === 'stay' ? 1 : inst.kind === 'in' ? t : 1 - t

      el.style.transform = `translate(${x}px, ${y}px)`
      el.style.width = `${Math.round(w)}px`   // 정수화 → 같은 열 수에서 전 카드 clientWidth 동일
      el.style.opacity = `${op}`
      // 완전 투명한 유령은 display로 빼야 한다 — absolute 요소라도 문서 스크롤 범위에는
      // 기여하므로, 남겨두면 최대 밀도에서 빈 스크롤 영역이 생긴다.
      el.style.display = op <= 0.001 ? 'none' : 'block'
      el.style.pointerEvents = op > 0.85 ? 'auto' : 'none'
      el.style.setProperty('--ts', `${titlePx(w)}px`)
      el.style.setProperty('--ss', `${sumPx(w)}px`)
    }

    if (gridRef.current) {
      const rowsA = (layouts[a] ?? []).length
      const rowsB = (layouts[b] ?? []).length
      const h = pitch * lerp(rowsA, rowsB, t) - GAP
      gridRef.current.style.height = `${Math.max(0, h)}px`
    }
  }, [colsToPos, layouts, maxCols, ready, vp.w, vp.h])

  // paint는 매 렌더 새로 만들어지므로 rAF·포인터 핸들러는 ref를 경유해 최신 것을 호출한다
  const paintRef = useRef(paint)

  // 렌더 직후: 인스턴스 목록을 확정하고 즉시 페인트(필터·리사이즈·구간 변경 전부 여기서 수렴)
  useLayoutEffect(() => {
    instRef.current = { a: pair.a, b: pair.b, list: instances }
    paintRef.current = paint
    paint(colsRef.current)
  })

  // ── 릴리스/클릭 시 정수 정착 트윈 (§2-5) ──
  const rafRef = useRef(0)
  const animateTo = useCallback((target: number) => {
    cancelAnimationFrame(rafRef.current)
    const from = colsRef.current
    if (Math.abs(from - target) < 1e-4) {
      colsRef.current = target
      paintRef.current(target)
      return
    }
    const start = performance.now()
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / TWEEN_MS)
      const e = 1 - Math.pow(1 - p, 3)          // easeOutCubic
      const v = from + (target - from) * e
      colsRef.current = v
      paintRef.current(v)
      if (p < 1) rafRef.current = requestAnimationFrame(step)
      else {
        colsRef.current = target
        paintRef.current(target)
      }
    }
    rafRef.current = requestAnimationFrame(step)
  }, [])
  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  // 상한 변경(리사이즈·회전) 시 현재 열 클램프
  useEffect(() => {
    const c = clamp(colsRef.current, MIN_COLS, maxCols)
    if (Math.abs(c - colsRef.current) > 1e-4) {
      colsRef.current = Math.round(c)
      paintRef.current(colsRef.current)
    }
  }, [maxCols])

  // ── 드래그 ──
  const draggingRef = useRef(false)
  const posFromEvent = (clientX: number) => {
    const el = trackRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    return rect.width > 0 ? clamp((clientX - rect.left) / rect.width, 0, 1) : 0
  }
  const onTrackDown = (e: React.PointerEvent<HTMLDivElement>) => {
    cancelAnimationFrame(rafRef.current)
    draggingRef.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    const v = posToCols(posFromEvent(e.clientX))
    colsRef.current = v
    paintRef.current(v)
  }
  const onTrackMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return
    const v = posToCols(posFromEvent(e.clientX))
    colsRef.current = v
    paintRef.current(v)
  }
  const onTrackUp = () => {
    if (!draggingRef.current) return
    draggingRef.current = false
    animateTo(clamp(Math.round(colsRef.current), MIN_COLS, maxCols))
  }

  const snapCols = Array.from({ length: maxCols - MIN_COLS + 1 }, (_, i) => MIN_COLS + i)

  return (
    <div style={{
      fontFamily: FONT,
      background: '#FFFFFF',
      color: '#080706',
      minHeight: '100vh',
      paddingTop: HEADER_H,
      paddingBottom: BAR_RESERVE,
    }}>
      {/*
        이 라우트 전용 CSS. 카드 지오메트리는 JS가 매 프레임 인라인으로 쓰고, 이 시트는
        변하지 않는 규칙(4:3 프레임·호버 요약·타이포 변수)만 담는다.
        전역 헤더는 /work-grid를 light 경로로 모르므로(SiteHeader의 STATIC_LIGHT_PATHS 미포함,
        해당 파일은 수정 금지 대상) 흰 배경 위에서 흰 글자가 된다. 이 라우트에서만 색을 덮는다.
      */}
      <style>{`
        .gm-card {
          position: absolute;
          top: 0;
          left: 0;
          display: block;
          opacity: 0;
          color: inherit;
          text-decoration: none;
          cursor: pointer;
          will-change: transform, width, opacity;
        }
        .gm-frame {
          width: 100%;
          aspect-ratio: 4 / 3;
          overflow: hidden;
        }
        .gm-frame img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .gm-meta { padding-top: ${META_PT}px; }
        .gm-title {
          font-size: var(--ts, 13px);
          font-weight: 450;
          line-height: ${TITLE_LH};
          word-break: keep-all;
          display: -webkit-box;
          -webkit-line-clamp: ${TITLE_LINES};
          -webkit-box-orient: vertical;
          overflow: hidden;
          height: calc(var(--ts, 13px) * ${TITLE_LH * TITLE_LINES});
        }
        .gm-sum {
          margin-top: ${SUM_MT}px;
          font-size: var(--ss, 11px);
          font-weight: 300;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          line-height: ${SUM_LH};
          height: calc(var(--ss, 11px) * ${SUM_LH});
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          opacity: 0;
          transition: opacity 200ms ease;
        }
        .gm-card:hover .gm-sum { opacity: 1; }
        .wordmark-intro { color: #080706 !important; }
        .site-nav-link { color: #0a0908 !important; }
      `}</style>

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, overflowX: 'auto', minWidth: 0 }}>
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

      {/* ── GRID — 절대좌표. height는 paint가 t에 맞춰 연속 갱신 ── */}
      <div ref={gridRef} style={{ position: 'relative', width: '100%' }}>
        {instances.map(inst => {
          const project = filteredProjects[inst.idx]
          if (!project) return null
          const award = project.awards?.find(a => a.visible !== false)?.title
          const hotspot = project.coverHotspot
          const objectPosition = hotspot ? `${hotspot.x * 100}% ${hotspot.y * 100}%` : 'center'
          return (
            <Link
              key={inst.key}
              href={`/work/${project.id}`}
              prefetch={false}
              className="gm-card"
              aria-label={project.title.en}
              ref={(el: HTMLAnchorElement | null) => {
                if (el) cardEls.current.set(inst.key, el)
                else cardEls.current.delete(inst.key)
              }}
            >
              {/* 이미지 — 항상 4:3. 원본 비율은 폭에 반영하지 않고 cover + hotspot으로 크롭 */}
              <div className="gm-frame" style={{ background: project.coverColor ?? COVER_FALLBACK }}>
                {project.coverImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={sanityThumb(project.coverImage, 800)}
                    alt={project.title.en}
                    loading="lazy"
                    decoding="async"
                    style={{ objectPosition }}
                  />
                )}
              </div>

              {/* 하단 텍스트 — 타이틀 상시, 호버 요약은 전 구간 노출(높이 예약으로 reflow 없음) */}
              <div className="gm-meta">
                <div className="gm-title">{project.title.en}</div>
                <div className="gm-sum">
                  <span style={{ color: '#080706', opacity: 0.6 }}>{project.type}</span>
                  {award && (
                    <>
                      <span style={{ opacity: 0.35 }}> · </span>
                      <span style={{ color: AWARD_GOLD }}>{award}</span>
                    </>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* ── DENSITY BAR — 하단 전용 컴팩트 바. width: min(440px, 64vw) 고정 (§4) ── */}
      <div style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(440px, 64vw)',
        height: 56,
        background: '#080706',
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        paddingLeft: 20,
        paddingRight: 20,
        zIndex: 60,
      }}>
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

        {/* 트랙 — knob·fill·스냅 아이콘이 모두 이 요소의 폭을 좌표계로 쓴다 (§4 정렬 수정) */}
        <div
          ref={trackRef}
          onPointerDown={onTrackDown}
          onPointerMove={onTrackMove}
          onPointerUp={onTrackUp}
          onPointerCancel={onTrackUp}
          style={{
            position: 'relative',
            flex: 1,
            minWidth: 0,
            height: 30,
            cursor: 'pointer',
            touchAction: 'none',
          }}
        >
          <div style={{
            position: 'absolute', top: 6, left: 0, right: 0, height: 2,
            background: 'rgba(255,255,255,0.18)',
          }} />
          <div ref={fillRef} style={{
            position: 'absolute', top: 6, left: 0, width: '0%', height: 2,
            background: 'rgba(255,255,255,0.6)',
          }} />
          <div ref={knobRef} style={{
            position: 'absolute', top: 1, left: '0%',
            transform: 'translateX(-50%)',
            width: 12, height: 12, borderRadius: '50%',
            background: '#FFFFFF',
            pointerEvents: 'none',
          }} />

          {/* 스냅 아이콘 — knob과 동일한 colsToPos(트랙 폭 기준). 첫/마지막 중심 = 트랙 좌/우 끝 */}
          {snapCols.map(c => {
            const active = c === nLabel
            return (
              <div
                key={c}
                onPointerDown={e => { e.stopPropagation(); animateTo(c) }}
                style={{
                  position: 'absolute',
                  top: 18,
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
                      background: active ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                      transition: 'background 200ms ease',
                    }}
                  />
                ))}
              </div>
            )
          })}
        </div>

        <span style={{
          fontSize: 10,
          fontWeight: 400,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.5)',
          flexShrink: 0,
          minWidth: 44,
          textAlign: 'right',
        }}>
          {nLabel} cols
        </span>
      </div>
    </div>
  )
}
