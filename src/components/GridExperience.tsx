'use client'

// ── GridExperience — 독립 그리드 뷰 (GRID_REFLOW_anchor) ──
//
// 링월(/work)·랜딩(/)·ContentArea를 일절 건드리지 않는 완전 독립 라우트(/work-grid)의 루트.
//
// 밀도 전환 모델 — **앵커 보존 배치**(GRID_REFLOW_anchor §0~§2).
//
// 폐기된 모델 2종:
//   (a) 정수 A·B 격자 매칭 + stay/in/out 교차 페이드 — 같은 카드가 out+in으로 분리돼 교체처럼 보임.
//   (b) plomp식 연속 wrap(col = flow % rowWidth) 및 순수 행우선(col = k % n) — 열이 바뀌면
//       보이던 카드의 (row,col)이 달라진다(4번 카드가 (1,0)→(0,3)). film movement의 원인.
//
// 현재 모델 — "셀 고정, 폭만 변형":
//   1) 각 카드는 (row,col) 셀을 점유한다(placement Map). 열 수가 바뀌어도 **보이는 카드의
//      (row,col)은 유지**되고 폭·높이만 변한다. 4:3 프레임비는 항상 고정.
//   2) 연속 앵커 — 직전 정수 열을 앵커로 한 단계씩 누적한다. 3→4 확정 후 그 4열이 다음 앵커.
//   3) 열 증가(grow): 각 행 끝에 새 셀이 생기고, **안 보이던 대기 카드(순서 무관)**가 그 자리에
//      놓여 opacity 0→1로 페이드인한다. 좌표는 처음부터 목표값이라 이동이 보이지 않는다.
//   4) 열 감소(shrink): 각 행 끝 셀 카드가 제자리에서 opacity 1→0으로 빠지고, 남은 카드는
//      (row,col)을 유지한다. 빠진 카드는 화면 아래 빈 셀로 되돌아간다.
//   5) 전환 중(분수 열): 폭·gap·origin만 연속 보간한다. 셀 좌표는 목표 정수 격자에 고정이고
//      보간하지 않는다. 즉 폭은 연속, 셀 등장/퇴장은 정수 스냅 — 이원 구조.
//   6) 렌더는 CSS Grid가 아니라 절대좌표(position:absolute + transform translate, px 정수 전용).
//      좌우 오버플로는 overflow-x: clip으로 잘라 가로 스크롤을 만들지 않는다.
//
// ⚠ 핵심 불변식: **어떤 보이는 카드도 밀도 전환 중 다른 셀로 이동하지 않는다.**
//
// 필터는 카드를 숨기지 않는다. 해당 카드를 좌상단부터 앞쪽에, 비해당 카드를 그 뒤에 이어
// 배치해 그리드를 항상 꽉 채우고, 비해당만 opacity를 낮춘다(§4).
//
// 카드 프레임은 열 수와 무관하게 항상 4:3 균등폭이다. 원본 이미지 비율은 카드 폭에 일절
// 반영하지 않고 object-fit:cover + coverHotspot으로 크롭한다(§2).

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
// Link는 뷰토글 "Ring"(/work) 링크가 계속 쓴다 — 카드만 <div role="button">로 바뀐다
import Link from 'next/link'
import { TYPOLOGY_ORDER, type Project, type ProjectType } from '@/types'
import { sanityThumb } from '@/lib/imageUrl'
import { GridContentArea } from './GridContentArea'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"

// ── 단일 정의 상수 ──
const UI_PAD = 34               // 헤더·컨트롤·그리드 공유 좌우 여백 (링월 헤더 기준)
const GAP = 16                  // 카드 간격 (수평·수직 공통)
const CARD_RATIO = 4 / 3        // 카드 프레임 비율 — 원본 비율과 무관하게 고정 (§2)
const SLIDE_H_RATIO = 0.72      // ContentArea 히어로 높이 비율 — 1열 폭 공식 (§6)
const MIN_COLS = 1              // 하한. 실물 판단 후 1→3 변경은 이 한 줄만 바꾼다 (§6)
const MAX_COLS = 6              // 절대 상한 (뷰포트 종횡비가 실제 상한을 더 낮출 수 있다)
const DEFAULT_COLS = 3
const COVER_FALLBACK = '#1E1C18'
const AWARD_GOLD = '#b89773'
const HEADER_H = 80             // 전역 헤더(워드마크·nav) 존 회피 상단 여백
const BAR_RESERVE = 120         // 하단 플로팅 밀도바 회피 여백
const TWEEN_MS = 420            // 릴리스 후 정수 정착 트윈 (§1-4)
const DIM_OPACITY = 0.15        // 필터 비해당 카드 (§4)
const FLOW_MS = 560             // 필터 재정렬 트랜지션 지속 — 이 시간만 transition 활성
const FADE_MS = 280             // 셀 등장/퇴장 페이드 (§2-1). 카드 상시 opacity transition과 동일값
const ICON_W = 34               // 스냅 아이콘 고정 폭 — 트랙 좌표계의 양단 인셋 기준 (§6)
// 콘텐츠 오버레이 언마운트 지연 — GridContentArea의 역-morph(MORPH_MS 700 + 여유 60)가
// 끝난 뒤에 언마운트되도록 한다 (GRID_CONTENT_AREA_SPEC §3-1 (c))
const CONTENT_EXIT_MS = 760

// 카드 하단 텍스트 — 폭에 연동한 연속 스케일. 정수 열 경계에서 행 피치가 튀지 않게
// 이산 분기(dense 플래그) 대신 폭의 연속 함수로 둔다.
// 타이틀은 1행만 예약한다 — 2행 예약이 요약을 타이틀에서 멀리 밀어내던 결함(§0-2)의 원인.
const META_PT = 10              // 이미지 ↔ 타이틀
const TITLE_LH = 1.35
const TITLE_LINES = 1
const SUM_MT = 5                // 타이틀 ↔ 요약 (§5: 4~6px)
const SUM_LH = 1.5

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

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

/** 카드가 점유하는 격자 셀 (§1-1) */
interface Cell { row: number; col: number }

/**
 * 초기 배치 (§1-1) — 첫 진입에는 "이동" 개념이 없으므로 행우선이 정답이다.
 * 이후의 밀도 전환에서는 행우선을 절대 재계산하지 않는다(불변식 위반).
 * 키는 order 인덱스(배치 위치)다 — 필터가 order를 바꾸면 같은 셀에 다른 프로젝트가 들어온다.
 */
function initialPlacement(n: number, count: number): Map<number, Cell> {
  const cols = Math.max(1, Math.round(n))
  const m = new Map<number, Cell>()
  for (let k = 0; k < count; k++) m.set(k, { row: Math.floor(k / cols), col: k % cols })
  return m
}

interface GridExperienceProps {
  projects: Project[]   // Sanity에서 careerNo 내림차순 정렬 상태로 도착 — 재정렬 불요
}

export function GridExperience({ projects }: GridExperienceProps) {
  const total = projects.length

  // ── 필터 — 숨김이 아니라 재정렬 + dim (§4) ──
  const FILTER_TYPES = useMemo(() => ['All', ...TYPOLOGY_ORDER.filter(t =>
    projects.some(p => p.type === t || p.subTypes?.includes(t))
  )], [projects])
  const [activeFilter, setActiveFilter] = useState('All')

  // ── 콘텐츠 오버레이 상태 (GRID_CONTENT_AREA_SPEC §3-1 (b)) ──
  // selected: 열린 프로젝트. null이면 그리드만 표시
  // contentMode: GridContentArea의 morph 모드. 진입 시 idle→active로 전환해 morph를 발동한다
  // enterRectRef: 클릭된 카드의 화면 좌표 — morph 시작 rect이자 역-morph 도착 rect
  const [selected, setSelected] = useState<Project | null>(null)
  const [contentMode, setContentMode] = useState<'idle' | 'active'>('idle')
  const enterRectRef = useRef<{ top: number; left: number; width: number; height: number } | null>(null)

  /** order: 배치 위치 → projects 인덱스. 해당 카드가 앞, 비해당이 뒤. 항상 total개 전량 유지 */
  const { order, dimSet } = useMemo(() => {
    if (activeFilter === 'All') {
      return {
        order: Array.from({ length: total }, (_, i) => i),
        dimSet: new Set<number>(),
      }
    }
    const hit: number[] = []
    const miss: number[] = []
    projects.forEach((p, i) => {
      const ok = p.type === activeFilter || p.subTypes?.includes(activeFilter as ProjectType)
      if (ok) hit.push(i)
      else miss.push(i)
    })
    return { order: [...hit, ...miss], dimSet: new Set(miss) }
  }, [activeFilter, projects, total])

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

  // ── 밀도 상태 ──
  // cols(분수)는 매 프레임 갱신되므로 ref가 정본이다. React state는 라벨(nLabel)처럼
  // 프레임 단위로 바뀌지 않는 것만 보유한다 — 렌더는 order를 직접 map하므로 인스턴스
  // 목록이나 보간 구간(pair) 같은 파생 state가 없다.
  const colsRef = useRef<number>(clamp(DEFAULT_COLS, MIN_COLS, MAX_COLS))
  const [nLabel, setNLabel] = useState(clamp(DEFAULT_COLS, MIN_COLS, MAX_COLS))
  const nLabelRef = useRef(nLabel)

  // ── 배치 상태 (§1-1) ──
  // placement: order 인덱스 → 점유 셀. anchorRef: 현재 정수 앵커 열.
  // newlyPlaced: 새 셀에 놓인 카드(1프레임 transition-none 후 opacity 페이드인).
  // fadingOut: 사라진 셀 카드(제자리에서 페이드아웃 후 하단 빈 셀로 스냅 이동).
  const anchorRef = useRef(clamp(DEFAULT_COLS, MIN_COLS, MAX_COLS))
  const placementRef = useRef<Map<number, Cell>>(new Map())
  if (placementRef.current.size === 0 && total > 0) {
    placementRef.current = initialPlacement(anchorRef.current, total)
  }
  const newlyPlacedRef = useRef<Set<number>>(new Set())
  const fadingOutRef = useRef<Set<number>>(new Set())
  const freshPendingRef = useRef(false)
  const freshRafRef = useRef(0)
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // paint는 매 렌더 새로 만들어지므로 rAF·타이머·포인터 핸들러는 ref를 경유해 최신 것을 부른다.
  // reflow가 지연 스냅을 위해 paint를 되부르므로 선언 순서상 여기서 먼저 만든다.
  const paintRef = useRef<(cols: number) => void>(() => {})

  // 필터 재정렬 구간에만 transform/width transition을 켠다 (드래그 중에는 매 프레임 좌표를
  // 직접 쓰므로 꺼둔다). opacity transition은 셀 등장/퇴장 때문에 항상 켜져 있다.
  const [flow, setFlow] = useState(false)
  const flowTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startFlow = useCallback(() => {
    setFlow(true)
    if (flowTimer.current) clearTimeout(flowTimer.current)
    flowTimer.current = setTimeout(() => setFlow(false), FLOW_MS)
  }, [])
  useEffect(() => () => { if (flowTimer.current) clearTimeout(flowTimer.current) }, [])

  // ── DOM 참조 ──
  const cardEls = useRef(new Map<string, HTMLElement>())
  const gridRef = useRef<HTMLDivElement>(null)
  const fillRef = useRef<HTMLDivElement>(null)
  const knobRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  const span = Math.max(1, maxCols - MIN_COLS)
  // knob·fill·스냅 아이콘이 공유하는 유일한 좌표 함수. 기준은 트랙의 레일 폭이다 (§6)
  const colsToPos = useCallback((c: number) => clamp((c - MIN_COLS) / span, 0, 1), [span])
  const posToCols = useCallback((pos: number) => MIN_COLS + clamp(pos, 0, 1) * span, [span])

  // ── grow(n → m): 열 증가 (§1-2) ──
  // 각 행 끝에 col ∈ [n, m-1] 셀이 새로 생긴다. **기존 placement의 (row,col)은 전부 유지.**
  // 대기 풀은 (1) 미배치 카드, (2) 없으면 최하단(비가시) 셀 카드를 뒤에서부터 끌어올린 것이다.
  // 초기 배치가 전 카드를 채우므로 실전 공급원은 (2)다. 목표 행보다 아래 행의 카드만 꺼내므로
  // "안 보이던 카드가 제자리에 나타난다"는 불변식은 유지된다(같은/위쪽 행이면 즉시 중단).
  const grow = useCallback((n: number, m: number) => {
    const placement = placementRef.current
    let maxRow = 0
    placement.forEach(c => { if (c.row > maxRow) maxRow = c.row })

    const unplaced: number[] = []
    for (let k = 0; k < total; k++) if (!placement.has(k)) unplaced.push(k)
    // 하단부터 꺼내려고 (row,col) 오름차순으로 쌓아두고 pop한다
    const tail = Array.from(placement.entries())
      .sort((a, b) => (a[1].row - b[1].row) || (a[1].col - b[1].col))
      .map(e => e[0])

    /** 대기 카드 하나 꺼내기. 순서 무관. 더 못 꺼내면 null */
    const take = (targetRow: number): number | null => {
      if (unplaced.length) return unplaced.pop() as number
      const cand = tail[tail.length - 1]
      if (cand === undefined) return null
      const cell = placement.get(cand)
      // 목표 행과 같거나 위쪽 행의 카드를 끌어오면 '보이는 카드의 이동'이 된다 → 중단
      if (!cell || cell.row <= targetRow) return null
      tail.pop()
      placement.delete(cand)
      return cand
    }

    let exhausted = false
    for (let r = 0; r <= maxRow && !exhausted; r++) {
      for (let c = n; c <= m - 1; c++) {
        const pick = take(r)
        if (pick === null) { exhausted = true; break }
        placement.set(pick, { row: r, col: c })
        fadingOutRef.current.delete(pick)
        newlyPlacedRef.current.add(pick)
      }
    }

    // 아직 남은 대기 카드 = 화면 아래 추가 행에 행우선으로 이어붙임 (스크롤로 노출)
    if (unplaced.length) {
      let nextRow = 0
      placement.forEach(c => { if (c.row >= nextRow) nextRow = c.row + 1 })
      while (unplaced.length) {
        for (let c = 0; c < m && unplaced.length; c++) {
          const pick = unplaced.pop() as number
          placement.set(pick, { row: nextRow, col: c })
          fadingOutRef.current.delete(pick)
          newlyPlacedRef.current.add(pick)
        }
        nextRow++
      }
    }
  }, [total])

  // ── shrink(n → m): 열 감소 (§1-2) ──
  // 각 행에서 col ∈ [m, n-1] 셀이 사라진다. 그 카드는 제자리에서 페이드아웃 후 대기 풀로
  // 돌아가 아래쪽 빈 셀에 재적재된다. 남은 카드는 (row,col) 고정.
  const shrink = useCallback((n: number, m: number) => {
    const placement = placementRef.current
    const removed: number[] = []
    placement.forEach((cell, idx) => { if (cell.col >= m) removed.push(idx) })
    removed.forEach(idx => {
      placement.delete(idx)
      newlyPlacedRef.current.delete(idx)
      fadingOutRef.current.add(idx)
    })

    const pool: number[] = []
    for (let k = 0; k < total; k++) if (!placement.has(k)) pool.push(k)

    const occupied = new Set<string>()
    placement.forEach(c => occupied.add(`${c.row},${c.col}`))

    // 위에서부터 빈 셀을 스캔해 채운다. 상단은 이미 꽉 차 있으므로 실제 적재는 하단부터다.
    let r = 0
    let guard = 0
    while (pool.length && guard++ < total * 2 + 8) {
      for (let c = 0; c < m; c++) {
        if (occupied.has(`${r},${c}`)) continue
        if (!pool.length) break
        const pick = pool.pop() as number
        placement.set(pick, { row: r, col: c })
        occupied.add(`${r},${c}`)
        // 페이드아웃 중인 카드는 페이드가 끝난 뒤에 새 좌표로 스냅한다(§2-1)
        if (!fadingOutRef.current.has(pick)) newlyPlacedRef.current.add(pick)
      }
      r++
    }
  }, [total])

  // 페이드아웃이 끝나면 그 카드들을 새 좌표로 스냅(transition-none)시킨 뒤 다시 켠다
  const scheduleFadeSettle = useCallback(() => {
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    fadeTimerRef.current = setTimeout(() => {
      fadeTimerRef.current = null
      const ids = Array.from(fadingOutRef.current)
      fadingOutRef.current.clear()
      ids.forEach(idx => newlyPlacedRef.current.add(idx))
      paintRef.current(colsRef.current)
    }, FADE_MS)
  }, [])

  // ── 앵커 열 전환 (§1-2). 연속 앵커 — 정수 한 단계씩 누적한다 (§1-3) ──
  const reflowTo = useCallback((m: number) => {
    let a = anchorRef.current
    if (m === a) return
    while (a < m) { grow(a, a + 1); a += 1 }
    while (a > m) { shrink(a, a - 1); a -= 1 }
    anchorRef.current = a
    if (fadingOutRef.current.size) scheduleFadeSettle()
  }, [grow, shrink, scheduleFadeSettle])

  // ── 매 프레임 페인트 — 절대좌표 px 정수 전용 (transform 퍼센트 금지, Safari 대비) (§2) ──
  // 셀 좌표는 정수 앵커 격자에 고정이고, 폭·stride·origin만 분수 열 n의 연속 함수다.
  const paint = useCallback((cols: number) => {
    const n = clamp(cols, MIN_COLS, maxCols)              // 연속(분수) 열 수
    const nr = clamp(Math.round(n), MIN_COLS, maxCols)    // 앵커·라벨용 정수
    if (nr !== anchorRef.current) reflowTo(nr)
    if (nr !== nLabelRef.current) {
      nLabelRef.current = nr
      setNLabel(nr)
    }

    // 슬라이더 크롬 — 아이콘과 동일한 레일 좌표계 (fill·knob은 레일 안의 %)
    const pos = colsToPos(n) * 100
    if (fillRef.current) fillRef.current.style.width = `${pos}%`
    if (knobRef.current) knobRef.current.style.left = `${pos}%`

    if (!ready) return

    const full = Math.max(1, vp.w - UI_PAD * 2)
    // 1열은 히어로 폭 상한, 그 외는 연속 축소. 폭은 n의 연속 함수다.
    const heroW = Math.min(full, CARD_RATIO * vp.h * SLIDE_H_RATIO)   // 1열 = 히어로 폭 (§6)
    const cardW = n <= 1 ? heroW : Math.max(1, (full - GAP * (n - 1)) / n)
    const cardH = cardW / CARD_RATIO
    const pitch = cardH + metaH(cardW) + GAP
    const stride = cardW + GAP                    // 셀 하나의 수평 간격
    // 전환 중 origin은 분수 n 기준 행 폭으로 잡는다 — n>1이면 정확히 UI_PAD가 되어 좌측이
    // 잘리지 않고, 새 열은 콘텐츠 우측 밖에서 폭이 줄며 들어온다(overflow-x: clip으로 절단).
    const rowW = n * cardW + (n - 1) * GAP
    const originX = UI_PAD + (full - rowW) / 2
    const wPx = Math.round(cardW)                 // 정수화 → 전 카드 clientWidth 완전 동일

    const placement = placementRef.current
    const fresh = newlyPlacedRef.current
    const fading = fadingOutRef.current

    const elAt = (idx: number): HTMLElement | null => {
      const p = projects[order[idx]]
      if (!p) return null
      return cardEls.current.get(p.id) ?? null
    }
    const targetOpacity = (idx: number) => (dimSet.has(order[idx]) ? DIM_OPACITY : 1)

    // (a) 새 셀 카드 — 이동이 보이면 안 되므로 transition을 끈 채 목표 좌표에 세운다 (§2-1)
    fresh.forEach(idx => {
      const el = elAt(idx)
      if (!el) return
      el.style.transition = 'none'
      el.style.opacity = '0'
    })

    // (b) 배치된 카드 — 정수 격자 셀 × 연속 폭
    let maxRow = 0
    placement.forEach((cell, idx) => {
      if (cell.row > maxRow) maxRow = cell.row
      const el = elAt(idx)
      if (!el) return
      // 페이드아웃 중인 카드는 좌표를 건드리지 않는다 — 제자리에서 사라져야 한다.
      // 새 좌표로의 이동은 페이드 종료 후 스냅(fresh 경로)으로 처리한다.
      if (fading.has(idx)) {
        el.style.opacity = '0'
        el.style.pointerEvents = 'none'
        return
      }
      const x = originX + cell.col * stride
      const y = cell.row * pitch
      el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`
      el.style.width = `${wPx}px`
      el.style.pointerEvents = 'auto'
      el.style.setProperty('--ts', `${titlePx(cardW)}px`)
      el.style.setProperty('--ss', `${sumPx(cardW)}px`)
      // fresh는 다음 프레임에 페이드인하므로 여기서 opacity를 덮지 않는다
      if (!fresh.has(idx)) el.style.opacity = `${targetOpacity(idx)}`
    })

    // (c) 미배치 대기 카드 — 현 모델에서는 발생하지 않지만 방어적으로 화면 밖 하단에 둔다
    for (let idx = 0; idx < order.length; idx++) {
      if (placement.has(idx)) continue
      const el = elAt(idx)
      if (!el) continue
      el.style.opacity = '0'
      el.style.pointerEvents = 'none'
      el.style.transform = `translate(${Math.round(originX)}px, ${Math.round((maxRow + 1) * pitch)}px)`
      el.style.width = `${wPx}px`
    }

    // (d) 다음 프레임에 transition 복원 + opacity만 페이드인 (§2-1)
    if (fresh.size && !freshPendingRef.current) {
      freshPendingRef.current = true
      freshRafRef.current = requestAnimationFrame(() => {
        freshPendingRef.current = false
        const ids = Array.from(newlyPlacedRef.current)
        newlyPlacedRef.current.clear()
        ids.forEach(idx => {
          const el = elAt(idx)
          if (!el) return
          el.style.transition = ''
          el.style.opacity = `${targetOpacity(idx)}`
        })
      })
    }

    if (gridRef.current) {
      // 말미 GAP은 pitch에 포함돼 있어 한 번 뺀다
      gridRef.current.style.height = `${Math.max(0, (maxRow + 1) * pitch - GAP)}px`
    }
  }, [colsToPos, dimSet, maxCols, order, projects, ready, reflowTo, vp.w, vp.h])

  // 렌더 직후 즉시 페인트 — 필터 재정렬(order)·리사이즈(vp)·마운트가 전부 여기서 수렴한다
  useLayoutEffect(() => {
    paintRef.current = paint
    paint(colsRef.current)
  })

  useEffect(() => () => {
    cancelAnimationFrame(freshRafRef.current)
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
  }, [])

  // ── 릴리스/클릭 시 정수 정착 트윈 (§1-4) ──
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

  // ── 카드 클릭 → 콘텐츠 오버레이 (딥링크 대신 SPA morph) (§3-1 (c)) ──
  const openProject = useCallback((project: Project, el: HTMLElement) => {
    const r = el.getBoundingClientRect()
    enterRectRef.current = { top: r.top, left: r.left, width: r.width, height: r.height }
    setSelected(project)
    setContentMode('idle')
    // 브라우저 뒤로가기 = 닫기
    window.history.pushState({ gridContent: project.id }, '', `/work/${project.id}`)
    // idle→active morph 발동 (다음 프레임)
    requestAnimationFrame(() => requestAnimationFrame(() => setContentMode('active')))
  }, [])

  const closeProject = useCallback(() => {
    setContentMode('idle')
    // 역-morph 재생이 끝난 뒤 언마운트
    setTimeout(() => setSelected(null), CONTENT_EXIT_MS)
    // URL 원복 — pushState 되돌림 없이 replaceState로 그리드 URL 복원
    if (window.location.pathname !== '/work-grid') {
      window.history.replaceState({}, '', '/work-grid')
    }
  }, [])

  // 브라우저 뒤로가기 → 닫기
  useEffect(() => {
    const onPop = () => { if (selected) closeProject() }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [selected, closeProject])

  // 상한 변경(리사이즈·회전) 시 현재 열 클램프
  useEffect(() => {
    const c = clamp(colsRef.current, MIN_COLS, maxCols)
    if (Math.abs(c - colsRef.current) > 1e-4) {
      colsRef.current = Math.round(c)
      paintRef.current(colsRef.current)
    }
  }, [maxCols])

  // ── 드래그 ── 레일 좌표계(양단 ICON_W/2 인셋) = 스냅 아이콘 중심 좌표계
  const draggingRef = useRef(false)
  const posFromEvent = (clientX: number) => {
    const el = trackRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    const railW = rect.width - ICON_W
    if (railW <= 0) return 0
    return clamp((clientX - rect.left - ICON_W / 2) / railW, 0, 1)
  }
  const onTrackDown = (e: React.PointerEvent<HTMLDivElement>) => {
    cancelAnimationFrame(rafRef.current)
    if (flowTimer.current) { clearTimeout(flowTimer.current); flowTimer.current = null }
    setFlow(false)
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
        /* 전환 중 새 열 카드는 콘텐츠 우측 밖에서 대기한다 — 잘라내되 가로 스크롤은 금지 (§1-2) */
        html, body { overflow-x: hidden; }
        .gm-stage { overflow-x: clip; }
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
          /* 셀 등장/퇴장 페이드. transform·width는 트랜지션하지 않는다 — 드래그가 매 프레임
             좌표를 직접 쓰므로 지연이 생기고, 새 셀 카드가 '이동'해 보이게 된다 (§2-1) */
          transition: opacity ${FADE_MS}ms ease;
        }
        /* 필터 재정렬 구간에만 좌표 트랜지션을 켠다 — 밀도 전환에는 켜지 않는다 (§4) */
        .gm-flow .gm-card {
          transition: transform ${FLOW_MS - 40}ms cubic-bezier(0.22, 0.61, 0.36, 1),
                      width ${FLOW_MS - 40}ms cubic-bezier(0.22, 0.61, 0.36, 1),
                      opacity ${FADE_MS}ms ease;
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
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          height: calc(var(--ts, 13px) * ${TITLE_LH * TITLE_LINES});
        }
        /* 요약은 타이틀 바로 아래(${SUM_MT}px). 높이를 예약해 호버 시 reflow가 없다 (§5) */
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
              onClick={() => { if (t !== activeFilter) { startFlow(); setActiveFilter(t) } }}
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

      {/* ── GRID — 절대좌표. height는 paint가 placement의 maxRow에 맞춰 갱신 ── */}
      <div
        ref={gridRef}
        className={`gm-stage${flow ? ' gm-flow' : ''}`}
        style={{ position: 'relative', width: '100%' }}
      >
        {/* 카드 DOM은 order 인덱스 하나당 하나. key는 프로젝트 id 고정이라 밀도가 바뀌어도
            DOM이 재사용되고, 필터 재정렬 시에는 같은 DOM이 새 셀로 gm-flow 트랜지션을 탄다 */}
        {order.map((projIdx) => {
          const project = projects[projIdx]
          if (!project) return null
          const award = project.awards?.find(a => a.visible !== false)?.title
          const hotspot = project.coverHotspot
          const objectPosition = hotspot ? `${hotspot.x * 100}% ${hotspot.y * 100}%` : 'center'
          return (
            <div
              key={project.id}
              role="button"
              tabIndex={0}
              className="gm-card"
              aria-label={project.title.en}
              // ref 콜백 유지 — cardEls가 클릭 시 morph 시작 rect 획득에 필수다
              ref={(el: HTMLDivElement | null) => {
                if (el) cardEls.current.set(project.id, el)
                else cardEls.current.delete(project.id)
              }}
              onClick={() => {
                const el = cardEls.current.get(project.id)
                if (el) openProject(project, el)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  const el = cardEls.current.get(project.id)
                  if (el) openProject(project, el)
                }
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

              {/* 하단 텍스트 — 타이틀 상시, 요약은 호버 시 타이틀 바로 아래에 페이드인 */}
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
            </div>
          )
        })}
      </div>

      {/* ── DENSITY BAR — 하단 전용 컴팩트 바. width: min(440px, 64vw) 고정 (§6) ── */}
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

        {/*
          트랙 — 바 폭을 늘리지 않고, 스냅 아이콘이 트랙 안에 완전히 들어오도록 좌표계를
          레일(양단 ICON_W/2 인셋)로 통일한다. 아이콘은 폭 ICON_W 박스를 left:
          calc(pos * (100% - ICON_W))로 놓아 첫 아이콘 좌변 = 트랙 좌단, 마지막 아이콘
          우변 = 트랙 우단이 되고, 그 중심은 레일의 pos와 정확히 일치한다 (§6, §7).
        */}
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
          {/* 레일 — fill·knob의 % 기준. 아이콘 중심 좌표계와 동일 */}
          <div style={{
            position: 'absolute',
            left: ICON_W / 2,
            right: ICON_W / 2,
            top: 0,
            height: 16,
            pointerEvents: 'none',
          }}>
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
            }} />
          </div>

          {/* 스냅 아이콘 — 박스만(숫자 없음). 트랙 안에 정렬 */}
          {snapCols.map(c => {
            const active = c === nLabel
            return (
              <div
                key={c}
                onPointerDown={e => { e.stopPropagation(); animateTo(c) }}
                style={{
                  position: 'absolute',
                  top: 18,
                  left: `calc(${colsToPos(c)} * (100% - ${ICON_W}px))`,
                  width: ICON_W,
                  display: 'flex',
                  justifyContent: 'center',
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

      {/* ── 콘텐츠 오버레이 — fixed inset:0, z-index 100으로 그리드 전체를 덮는다 (§3-1 (f)) ── */}
      {selected && (
        <GridContentArea
          project={selected}
          mode={contentMode}
          enterRect={enterRectRef.current}
          onBack={closeProject}
        />
      )}
    </div>
  )
}
