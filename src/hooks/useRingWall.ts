'use client'

// ── useRingWall — 가상 링(Virtual Ring) 물리 코어 (WALL_RING_SPEC 개정판) ──
//
// 월을 스크롤 문서가 아닌 "N개 카드가 가상의 원 위에 배열된 링"으로 다룬다.
// 유일한 위치 상태는 연속 실수 offset (단위: 인덱스) 하나이며, 모든 카드의
// 위치는 offset과 애니메이션 중인 높이 배열로부터의 순수 함수 파생이다.
//
// 이중 모드 (§1): 최악 조건(전 카드 d>=2)에서도 순환 둘레가 뷰포트+버퍼를
// 채우는 N에서만 루프. 그 미만이면 순환 항을 제거한 유한 스택(축퇴형) —
// 유한 모드 배치는 스택 블록 클램프(수용 시 블록 중앙 정렬, 오버플로 시
// 가장자리 클램프)이며, 휠·드래그는 스택 오버플로 시에만 허용한다 (§3).
//
// 입력 리스너(휠·포인터·click 캡처)와 ResizeObserver는 containerRef에 직접
// 등록한다 — React 합성 wheel 이벤트는 루트에 passive로 부착되어
// preventDefault가 불가능하므로 non-passive 직접 등록이 필수다.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'

// ── 원형 산술 (순수 함수) ──

export const mod = (a: number, n: number) => ((a % n) + n) % n

/** 부호 있는 원형 델타 — 결과 범위 (-n/2, n/2] */
export const signedCircDelta = (from: number, to: number, n: number) => {
  let d = mod(to - from, n)
  if (d > n / 2) d -= n
  return d
}

/** 무부호 원형 거리 (티어 계산용) */
export const circDist = (a: number, b: number, n: number) =>
  Math.min(mod(a - b, n), mod(b - a, n))

// ── 물리 상수 ──

const MIN_SLOT_HEIGHT = 96   // 기본 최소 티어 높이 — minSlotHeight 옵션 미지정 시 사용 (데스크톱)
const LOOP_BUFFER = 150      // px — 루프 성립 판정 안전 버퍼 (§1)
const VELOCITY_MAX = 12      // idx/s
const VELOCITY_EPS = 0.02    // idx/s — 미만이면 0 스냅
const VELOCITY_TAU = 0.18    // s — 관성 감쇠 시상수
const HEIGHT_TAU = 0.12      // s — 높이 수렴 시상수 (기존 400ms ease 체감 등가)
const HEIGHT_EPS = 0.5       // px — 미만이면 목표값 스냅
const WHEEL_GAIN = 2.5
const TAP_THRESHOLD = 8      // px — 총 이동이 이상이면 탭이 아니라 드래그
const FLICK_SAMPLES = 3      // 플릭 속도 산출에 쓰는 최근 move 샘플 수
const MAX_DT = 0.1           // s — 탭 복귀 등 거대 프레임 간격 클램프

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

// ── API ──

export interface RingWallOptions {
  count: number                              // N (표시 목록 길이)
  getSlotHeight: (index: number) => number   // 인덱스 → 목표 티어 높이 (렌더러가 주입)
  gap: number                                // 16
  minSlotHeight?: number                     // 기본값 96 — 데스크톱 호출부 무수정, 거동 완전 동일
}

export interface RingSlot {
  slot: number      // 중앙 기준 슬롯 번호 ∈ [-Rlo, +Rhi]
  index: number     // 루프: mod(base + slot, N) / 유한: base + slot (유효 범위만 렌더)
  turn: number      // 회전수 — React key용. 유한 모드에서는 항상 0
  yCenter: number   // 카드 세로 중심의 컨테이너 좌표 (px)
}

export interface RingWallApi {
  containerRef: RefObject<HTMLDivElement | null>
  offset: number                             // 현재 오프셋 (매 프레임 갱신)
  heights: number[]                          // 애니메이션 중인 실측 높이 배열 (length N)
  slots: RingSlot[]
  isLoop: boolean                            // §1 모드 판정 — false면 유한 스택
  containerWidth: number                     // ← 신설. 렌더러의 폭 파생용 (물리 무관)
  moveTo: (index: number) => void            // 루프: 최단 원형 경로 / 유한: 선형 트위닝
  jumpTo: (index: number) => void            // 즉시 이동 (필터 스왑용)
  isSettled: boolean
}

interface Tween {
  from: number
  to: number
  start: number
  duration: number
}

interface DragState {
  active: boolean
  captured: boolean
  pointerId: number
  lastY: number
  moved: number
  samples: { t: number; y: number }[]
}

export function useRingWall({ count, getSlotHeight, gap, minSlotHeight = MIN_SLOT_HEIGHT }: RingWallOptions): RingWallApi {
  const containerRef = useRef<HTMLDivElement | null>(null)

  // 루프 내부 계산은 ref 미러로 수행 — stale closure 방지 (§2-C)
  const countRef = useRef(count)
  countRef.current = count
  const gapRef = useRef(gap)
  gapRef.current = gap
  const minSlotHeightRef = useRef(minSlotHeight)
  minSlotHeightRef.current = minSlotHeight
  const getSlotHeightRef = useRef(getSlotHeight)
  getSlotHeightRef.current = getSlotHeight

  const offsetRef = useRef(0)
  const velocityRef = useRef(0)
  const tweenRef = useRef<Tween | null>(null)
  const heightsRef = useRef<number[]>([])
  const dragRef = useRef<DragState | null>(null)
  const suppressClickRef = useRef(false)
  const rafRef = useRef<number | null>(null)
  const lastTimeRef = useRef(0)

  // count 변경 시 높이 배열을 목표값으로 즉시 재구성
  if (heightsRef.current.length !== count) {
    heightsRef.current = Array.from({ length: count }, (_, i) => getSlotHeight(i))
  }

  // 초기값은 결정적(getSlotHeight는 props 파생) — SSR/hydration 안전
  const [frame, setFrame] = useState(() => ({
    offset: 0,
    heights: Array.from({ length: count }, (_, i) => getSlotHeight(i)),
    settled: true,
  }))
  const [containerHeight, setContainerHeight] = useState(0)
  const [containerWidth, setContainerWidth] = useState(0)
  // 입력 핸들러(비-리액트 클로저)의 유한 오버플로 판정용 ref 미러 (§2-A)
  const containerHeightRef = useRef(0)

  // ── 모드 판정 (§1) — count·containerHeight 변경 시에만 재평가 ──
  // 최악 조건(전 카드 d>=2 = minSlotHeight)에서도 뷰포트+버퍼가 채워질 때만 루프
  const isLoop = count * (minSlotHeight + gap) >= containerHeight + LOOP_BUFFER
  const isLoopRef = useRef(isLoop)
  isLoopRef.current = isLoop

  // ── 단일 rAF 물리 루프: 관성 + 트위닝 + 높이 수렴 (§2-C) ──
  const tick = useCallback((now: number) => {
    const dt = clamp((now - lastTimeRef.current) / 1000, 0, MAX_DT)
    lastTimeRef.current = now
    const n = countRef.current
    let active = false

    const tween = tweenRef.current
    if (tween) {
      const p = tween.duration <= 0 ? 1 : Math.min((now - tween.start) / tween.duration, 1)
      offsetRef.current = tween.from + (tween.to - tween.from) * easeInOutCubic(p)
      if (p >= 1) tweenRef.current = null
      else active = true
    } else if (dragRef.current?.active) {
      active = true   // 오프셋은 pointermove가 직접 갱신 — 루프는 커밋만 담당
    } else if (velocityRef.current !== 0) {
      offsetRef.current += velocityRef.current * dt
      velocityRef.current *= Math.exp(-dt / VELOCITY_TAU)
      if (Math.abs(velocityRef.current) < VELOCITY_EPS) velocityRef.current = 0
      else active = true
    }

    // 유한 모드 offset 클램프 [0, N-1] (§3-A) — 모드 전환 잔여 운동 흡수
    if (!isLoopRef.current && n > 0) {
      const max = n - 1
      if (offsetRef.current < 0 || offsetRef.current > max) {
        offsetRef.current = clamp(offsetRef.current, 0, max)
        velocityRef.current = 0
      }
    }

    const heights = heightsRef.current
    const ease = 1 - Math.exp(-dt / HEIGHT_TAU)
    for (let i = 0; i < n; i++) {
      const target = getSlotHeightRef.current(i)
      const diff = target - heights[i]
      if (diff === 0) continue
      if (Math.abs(diff) < HEIGHT_EPS) {
        heights[i] = target
      } else {
        heights[i] += diff * ease
        active = true
      }
    }

    setFrame({ offset: offsetRef.current, heights: heights.slice(), settled: !active })
    // 슬립: 트위닝 없음 ∧ velocity 0 ∧ 전 높이 수렴 ∧ 드래그 아님 → rAF 취소
    if (active) rafRef.current = requestAnimationFrame(tick)
    else rafRef.current = null
  }, [])

  const wake = useCallback(() => {
    if (rafRef.current !== null) return
    lastTimeRef.current = performance.now()
    rafRef.current = requestAnimationFrame(tick)
  }, [tick])

  // ── 프로그래매틱 이동 ──

  const moveTo = useCallback((index: number) => {
    const n = countRef.current
    if (n <= 0) return
    const from = offsetRef.current
    // 루프: 최단 원형 경로 / 유한: 클램프된 인덱스로 선형 이동 (§3-A)
    const to = isLoopRef.current
      ? from + signedCircDelta(mod(from, n), index, n)
      : clamp(index, 0, n - 1)
    const delta = to - from
    velocityRef.current = 0
    if (Math.abs(delta) < 1e-3) {
      tweenRef.current = null
      offsetRef.current = to
      wake()   // 스냅 커밋 1프레임
      return
    }
    tweenRef.current = {
      from,
      to,
      start: performance.now(),
      duration: clamp(250 + 90 * Math.abs(delta), 350, 900),
    }
    wake()
  }, [wake])

  const jumpTo = useCallback((index: number) => {
    const n = countRef.current
    tweenRef.current = null
    velocityRef.current = 0
    offsetRef.current = n > 0
      ? (isLoopRef.current ? mod(index, n) : clamp(index, 0, n - 1))
      : 0
    heightsRef.current = Array.from({ length: n }, (_, i) => getSlotHeightRef.current(i))
    setFrame({ offset: offsetRef.current, heights: heightsRef.current.slice(), settled: true })
  }, [])

  // 티어 목표 변경(호버 등)·모드 전환 시 웨이크 — 높이 수렴 루프만 동작, 오프셋 부동
  useEffect(() => {
    wake()
  }, [getSlotHeight, isLoop, wake])

  // ── 입력 계층 + ResizeObserver (§2-D) ──
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const pxPerIdx = minSlotHeightRef.current + gapRef.current   // 최소 슬롯 간격 px→idx 환산 (기본 96+16=112)

    // 유한 모드 오버플로 판정 (§2-B) — 스택 총높이(실측 높이 합 + (N-1)·gap)가
    // 컨테이너를 넘칠 때만 true. 입력 게이트에서 스크롤 허용 여부를 결정한다.
    const finiteOverflow = () => {
      const n = countRef.current
      if (n <= 0) return false
      const heights = heightsRef.current
      let sum = 0
      for (let i = 0; i < n; i++) sum += heights[i] ?? minSlotHeightRef.current
      return sum + (n - 1) * gapRef.current > containerHeightRef.current
    }

    // 휠 (마우스 전담) — 페이지 스크롤 차단을 위해 non-passive 필수.
    // 유한 모드는 스택이 뷰포트를 넘칠 때만 스크롤 허용 — 수용 시에는
    // preventDefault도 하지 않고 통과 (§3-B 개정 — 페이지가 overflow hidden)
    const onWheel = (e: WheelEvent) => {
      if (!isLoopRef.current && !finiteOverflow()) return
      e.preventDefault()
      tweenRef.current = null   // 입력 우선 — 트위닝 즉시 취소
      velocityRef.current = clamp(
        velocityRef.current + (e.deltaY / pxPerIdx) * WHEEL_GAIN,
        -VELOCITY_MAX,
        VELOCITY_MAX,
      )
      wake()
    }

    // 드래그 (터치/펜 전용 — 마우스는 휠 전담, 클릭 선택과의 충돌 방지)
    // 유한 모드는 오버플로 시에만 드래그 허용 — 수용 시 캡처하지 않으므로
    // 탭 click 선택은 그대로 발화 (§3-B 개정)
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return
      if (!isLoopRef.current && !finiteOverflow()) return
      suppressClickRef.current = false
      tweenRef.current = null
      velocityRef.current = 0
      dragRef.current = {
        active: true,
        captured: false,
        pointerId: e.pointerId,
        lastY: e.clientY,
        moved: 0,
        samples: [{ t: e.timeStamp, y: e.clientY }],
      }
      wake()
    }

    const onPointerMove = (e: PointerEvent) => {
      const drag = dragRef.current
      if (!drag?.active || e.pointerId !== drag.pointerId) return
      const dy = e.clientY - drag.lastY
      drag.lastY = e.clientY
      drag.moved += Math.abs(dy)
      if (drag.moved >= TAP_THRESHOLD && !drag.captured) {
        // 드래그 확정 시점에야 캡처 — 미리 캡처하면 탭의 click이 컨테이너로
        // 리타기팅되어 카드 onClick(선택)이 발화하지 않는다
        el.setPointerCapture(e.pointerId)
        drag.captured = true
        suppressClickRef.current = true
      }
      if (drag.captured) offsetRef.current -= dy / pxPerIdx
      drag.samples.push({ t: e.timeStamp, y: e.clientY })
      if (drag.samples.length > FLICK_SAMPLES + 1) drag.samples.shift()
      wake()
    }

    const endDrag = (e: PointerEvent, flick: boolean) => {
      const drag = dragRef.current
      if (!drag?.active || e.pointerId !== drag.pointerId) return
      drag.active = false
      if (flick && drag.captured && drag.samples.length >= 2) {
        // 최근 샘플 평균 속도로 velocity 부여 (플릭 관성)
        const first = drag.samples[0]
        const last = drag.samples[drag.samples.length - 1]
        const dtMs = last.t - first.t
        if (dtMs > 0) {
          const vPx = (last.y - first.y) / (dtMs / 1000)
          velocityRef.current = clamp(-vPx / pxPerIdx, -VELOCITY_MAX, VELOCITY_MAX)
        }
      }
      wake()
    }
    const onPointerUp = (e: PointerEvent) => endDrag(e, true)
    const onPointerCancel = (e: PointerEvent) => endDrag(e, false)

    // 이동 ≥ 8px였던 제스처의 잔여 click을 캡처 단계에서 차단 (탭만 선택 발화)
    const onClickCapture = (e: MouseEvent) => {
      if (!suppressClickRef.current) return
      suppressClickRef.current = false
      e.preventDefault()
      e.stopPropagation()
    }

    const ro = new ResizeObserver(() => {
      containerHeightRef.current = el.clientHeight
      setContainerHeight(el.clientHeight)
      setContainerWidth(el.clientWidth)
    })
    ro.observe(el)
    containerHeightRef.current = el.clientHeight
    setContainerHeight(el.clientHeight)
    setContainerWidth(el.clientWidth)

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerCancel)
    el.addEventListener('click', onClickCapture, true)

    return () => {
      ro.disconnect()
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointercancel', onPointerCancel)
      el.removeEventListener('click', onClickCapture, true)
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [wake])

  // ── 슬롯 배치 — 중앙 대칭 누적 (§2-B) ──
  const { offset, heights, settled } = frame
  const slots = useMemo<RingSlot[]>(() => {
    const n = count
    if (n <= 0 || containerHeight <= 0) return []
    // 윈도 반경 — 리사이즈 시 재계산
    const R = Math.ceil(containerHeight / 2 / (minSlotHeight + gap)) + 2
    const base = Math.floor(offset)
    const frac = offset - base
    // 슬롯 범위 — 루프: Rlo+Rhi+1 ≤ N으로 제한해 프로젝트당 최대 1회 렌더 (§2)
    //           유한: 유효 인덱스 0..N-1 전체를 슬롯으로 — N이 작아 가상화
    //           불필요, 블록 클램프에서 전 카드가 가시 범위에 든다 (§3-A 개정)
    const lo = isLoop ? Math.min(R, Math.floor((n - 1) / 2)) : base
    const hi = isLoop ? Math.min(R, Math.ceil((n - 1) / 2)) : n - 1 - base
    // idxOf: 루프는 mod 순환, 유한은 클램프(간격 계산용 — 범위 밖 슬롯은 미렌더)
    const idxOf = (s: number) => (isLoop ? mod(base + s, n) : clamp(base + s, 0, n - 1))
    const hAt = (i: number) => heights[i] ?? minSlotHeight
    const spacing = (a: number, b: number) => (hAt(idxOf(a)) + hAt(idxOf(b))) / 2 + gap
    // frac=0이고 높이가 수렴하면 슬롯 0은 수학적으로 정중앙 — 높이 변화는
    // 중앙에서 바깥으로 대칭 전파되므로 별도 보정이 없다
    const y: Record<number, number> = { 0: containerHeight / 2 - frac * spacing(0, 1) }
    for (let s = 1; s <= hi; s++) y[s] = y[s - 1] + spacing(s - 1, s)
    for (let s = -1; s >= -lo; s--) y[s] = y[s + 1] - spacing(s, s + 1)
    // ── 유한 모드 블록 클램프 (§3-C 신설) ──
    // 스택 상·하단 실좌표에서 보정 Δ를 파생한다. 수용(H ≤ containerH) 시
    // Δ가 offset 기여분을 정확히 상쇄해 블록 중앙 정렬이 되고(배치의 offset
    // 독립성), 오버플로 시 가장자리가 뷰포트 안쪽으로 들어오지 않게 클램프한다.
    let delta = 0
    if (!isLoop) {
      const yTop = y[-lo] - hAt(idxOf(-lo)) / 2
      const yBot = y[hi] + hAt(idxOf(hi)) / 2
      const stackH = yBot - yTop
      delta = stackH <= containerHeight
        ? (containerHeight - stackH) / 2 - yTop          // 블록 중앙 정렬
        : clamp(0, containerHeight - yBot, -yTop)         // 가장자리 클램프
    }
    const out: RingSlot[] = []
    for (let s = -lo; s <= hi; s++) {
      out.push({
        slot: s,
        index: idxOf(s),
        turn: isLoop ? Math.floor((base + s) / n) : 0,
        yCenter: y[s] + delta,   // 루프 모드는 delta === 0
      })
    }
    return out
  }, [offset, heights, containerHeight, count, gap, minSlotHeight, isLoop])

  return { containerRef, offset, heights, slots, isLoop, containerWidth, moveTo, jumpTo, isSettled: settled }
}
