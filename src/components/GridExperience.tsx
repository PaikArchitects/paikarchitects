'use client'

// ── GridExperience — 독립 그리드 뷰 (GRID_REFLOW_film) ──
//
// 링월(/work)·랜딩(/)·ContentArea를 일절 건드리지 않는 완전 독립 라우트(/work-grid)의 루트.
//
// 밀도 전환 모델 — **film movement**(GRID_REFLOW_film §0~§1).
//
// 폐기된 모델 2종:
//   (a) 정수 A·B 격자 매칭 + stay/in/out 교차 페이드 — 같은 카드가 out+in으로 분리돼 교체처럼 보임.
//   (b) 앵커 보존(셀 고정) — 열이 늘 때 대기 카드를 행 끝에 끼워넣으므로 order가 깨진다.
//       총 카드 수 보존이라는 물리적 귀결로 최하단 편입이 생기고, 이는 제거 불가.
//
// 현재 모델 — "순수 행우선 재배치":
//   1) 열 수 nr에서 order 인덱스 k인 카드는 항상 `row = floor(k/nr), col = k % nr`에 놓인다.
//      밀도가 바뀌면 **전 카드가 새 (row,col)로 재배치**된다. 3→4열 시 4열 첫 행은 1·2·3·4번
//      (4번이 (1,0)→(0,3)으로 상승). 이건 결함이 아니라 단일 일관 규칙이다(§0).
//   2) 근거: 순서가 항상 careerNo 역순이라 예측 가능하다 — 620번은 언제나 619번 앞, 줄바꿈
//      시 윗줄 맨 우측. 어디서 봐도 같은 규칙이므로 학습 가능.
//   3) 전환 중(분수 열): **폭 보간은 연속(c), 격자 열 수는 정수(nr = round(c))**. c가 3.0→3.5
//      →4.0으로 흐르면 nr은 3→4로 스냅한다. 폭은 부드럽게, 재배치는 스냅 시점에 트윈 이동.
//   4) 트윈은 CSS가 담당한다 — .gm-card에 transform·width·height·opacity transition을 상시
//      걸어두고 paint는 목표값만 쓴다(§1 하단 주석).
//   5) 렌더는 CSS Grid가 아니라 절대좌표(position:absolute + transform translate, px 정수 전용).
//      좌우 오버플로는 overflow-x: clip으로 잘라 가로 스크롤을 만들지 않는다.
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
import { GridContentArea } from './GridContentArea'
// 모바일(<1024) 콘텐츠는 가로 트랙이 아니라 세로 스크롤이다 (GRID_MOBILE §2)
import { MobileGridContent } from './MobileGridContent'
// 4:3 크롭은 GridContentArea의 morph 하위 레이어와 공유한다 — 동일 URL이어야 캐시가 맞는다
import { gridThumb43 } from '@/lib/imageUrl'

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
const FADE_MS = 280             // dim 전환 페이드 — 카드 opacity transition 지속
const ICON_W = 34               // 스냅 아이콘 고정 폭 — 트랙 좌표계의 양단 인셋 기준 (§6)
// 콘텐츠 오버레이 언마운트 지연 — GridContentArea의 역-morph(MORPH_MS 700 + 여유 60)가
// 끝난 뒤에 언마운트되도록 한다 (GRID_CONTENT_AREA_SPEC §3-1 (c))
const CONTENT_EXIT_MS = 760

// 카드 하단 텍스트 — 폭에 연동한 연속 스케일. 정수 열 경계에서 행 피치가 튀지 않게
// 이산 분기(dense 플래그) 대신 폭의 연속 함수로 둔다.
// 타이틀은 1행만 예약한다 — 2행 예약이 요약을 타이틀에서 멀리 밀어내던 결함(§0-2)의 원인.
const META_PT = 10              // 이미지 ↔ 타이틀
const TITLE_LH = 1.35
const TITLE_LINES = 1           // 영문 타이틀 예약 줄 수
const KO_SCALE = 0.82           // 카드 한글 타이틀 크기 비 — 영문 대비 위계를 낮춘다 (260804)
const SUM_MT = 5                // 타이틀 ↔ 요약 (§5: 4~6px)
const SUM_LH = 1.5

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

// 썸네일 4:3 크롭(gridThumb43)은 imageUrl.ts로 이동했다 — GridContentArea의 morph 하위
// 레이어가 같은 함수·같은 인자를 써야 캐시가 맞기 때문이다 (GRID_MORPH_fix 작업 ①).
// 콘텐츠 morph의 **도착** 이미지는 여전히 원본 URL이다 — 원본 비율 morph의 소스 (§4-3).

const titlePx = (w: number) => clamp(w * 0.030, 10, 13)
const sumPx = (w: number) => clamp(w * 0.024, 8.5, 11)
/** 타이틀 블록 예약 높이 — 영문 TITLE_LINES줄 + 한글 1줄. .gm-title의 CSS height와 동일 식이어야
 *  격자 배치(paint의 hPx)와 실제 DOM 높이가 어긋나지 않는다. 한글 유무와 무관하게 항상 예약한다 */
const titleBlockH = (w: number) =>
  titlePx(w) * TITLE_LH * TITLE_LINES + titlePx(w) * KO_SCALE * TITLE_LH
/** 카드 하단 텍스트 블록 높이 — 폭의 연속 함수 */
const metaH = (w: number) =>
  META_PT + titleBlockH(w) + SUM_MT + sumPx(w) * SUM_LH

/** 뷰포트 종횡비 → 열 상한 (§6) */
function maxColsForAspect(r: number): number {
  if (r < 0.85) return 3        // portrait — 260804: 2→3 (모바일 밀도 상한 상향)
  if (r < 1.25) return 4        // ~square
  return 6                      // landscape
}

interface GridExperienceProps {
  projects: Project[]   // Sanity에서 careerNo 내림차순 정렬 상태로 도착 — 재정렬 불요
  // 직접 진입(/work-grid/[slug] 새로고침·공유) 시 즉시 열 프로젝트 slug. 없으면 그리드 랜딩만
  // (GRID_URL_split §2-1)
  initialSlug?: string
}

export function GridExperience({ projects, initialSlug }: GridExperienceProps) {
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
  //
  // 직접 진입(initialSlug) = morph 생략 즉시 표시 (GRID_URL_split §2-2).
  // 마운트 후 effect로 열면 그리드가 한 프레임 비쳤다가 콘텐츠가 덮는 깜빡임이 생기므로
  // 최초 state 자체를 열린 상태로 둔다 — enterRectRef는 초기값 null 그대로이고(= morph 생략
  // 신호), contentMode는 idle을 거치지 않고 바로 active다. 결과는 §2-2의 effect와 동일하다.
  // URL은 이미 /work-grid/[slug]이므로 pushState 불요.
  const initialProject = useMemo(
    () => (initialSlug ? projects.find(p => p.id === initialSlug) ?? null : null),
    [initialSlug, projects],
  )
  const [selected, setSelected] = useState<Project | null>(initialProject)
  const [contentMode, setContentMode] = useState<'idle' | 'active'>(initialProject ? 'active' : 'idle')
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

  // ── 모바일 판정 — 링월(LandingExperience 74행)과 동일 경계 1024 (GRID_MOBILE §2-3) ──
  // vp.w에서 파생하지 않는다: vp는 resize 이벤트만 따르고 matchMedia는 초기값도 정확하다.
  // 초기값 false + useLayoutEffect: SSR/하이드레이션 출력은 false로 일치시키되 판정은 페인트
  // 전에 끝낸다 — 직접 진입(initialSlug)이 열린 상태로 마운트되므로, useEffect였다면 모바일에서
  // GridContentArea(가로 트랙)가 한 프레임 그려진 뒤 교체되는 깜빡임이 생긴다.
  const [isMobile, setIsMobile] = useState(false)
  useLayoutEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const fn = () => setIsMobile(mq.matches)
    fn()
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])

  // ── 밀도 상태 ──
  // cols(분수)는 매 프레임 갱신되므로 ref가 정본이다. React state는 라벨(nLabel)처럼
  // 프레임 단위로 바뀌지 않는 것만 보유한다 — 렌더는 order를 직접 map하므로 인스턴스
  // 목록이나 보간 구간(pair) 같은 파생 state가 없다.
  const colsRef = useRef<number>(clamp(DEFAULT_COLS, MIN_COLS, MAX_COLS))
  const [nLabel, setNLabel] = useState(clamp(DEFAULT_COLS, MIN_COLS, MAX_COLS))
  const nLabelRef = useRef(nLabel)

  // paint는 매 렌더 새로 만들어지므로 rAF·타이머·포인터 핸들러는 ref를 경유해 최신 것을 부른다.
  const paintRef = useRef<(cols: number) => void>(() => {})

  // 필터 재정렬 구간에는 좌표 트랜지션을 더 긴 곡선으로 덮어쓴다. 기본 트랜지션은 상시
  // 켜져 있다 — 밀도 스냅(nr 변경) 시 재배치를 CSS가 트윈해야 하기 때문이다 (§1).
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

  // ── 매 프레임 페인트 — 절대좌표 px 정수 전용 (transform 퍼센트 금지, Safari 대비) (§1) ──
  // 격자 열 수는 정수 nr, 폭·stride·origin은 분수 열 c의 연속 함수다. 배치는 매번
  // order를 행우선으로 새로 계산한다 — 상태를 들고 있지 않으므로 항상 규칙과 일치한다.
  const paint = useCallback((cols: number) => {
    const c = clamp(cols, MIN_COLS, maxCols)              // 연속(분수) 열 수 — 폭 보간용
    const nr = clamp(Math.round(c), MIN_COLS, maxCols)    // 격자·라벨용 정수 열 수
    if (nr !== nLabelRef.current) {
      nLabelRef.current = nr
      setNLabel(nr)
    }

    // 슬라이더 크롬 — 아이콘과 동일한 레일 좌표계 (fill·knob은 레일 안의 %)
    const posPct = colsToPos(c) * 100
    if (fillRef.current) fillRef.current.style.width = `${posPct}%`
    if (knobRef.current) knobRef.current.style.left = `${posPct}%`

    if (!ready) return

    const full = Math.max(1, vp.w - UI_PAD * 2)
    // 1열은 히어로 폭 상한, 그 외는 연속 축소. 폭은 c의 연속 함수다.
    const heroW = Math.min(full, CARD_RATIO * vp.h * SLIDE_H_RATIO)   // 1열 = 히어로 폭 (§6)
    const cardW = c <= 1 ? heroW : Math.max(1, (full - GAP * (c - 1)) / c)
    const cardH = cardW / CARD_RATIO
    const mH = metaH(cardW)
    const pitch = cardH + mH + GAP
    const stride = cardW + GAP                    // 셀 하나의 수평 간격
    // 목표 정수열 nr 기준 중앙정렬 — 폭은 c(연속), 열 수는 nr(정수) (§1)
    const rowW = nr * cardW + (nr - 1) * GAP
    const originX = UI_PAD + (full - rowW) / 2
    const wPx = Math.round(cardW)                 // 정수화 → 전 카드 clientWidth 완전 동일
    const hPx = Math.round(cardH + mH)            // 프레임 + 메타 = 카드 실제 높이

    let maxRow = 0
    for (let k = 0; k < total; k++) {
      const project = projects[order[k]]
      if (!project) continue
      const el = cardEls.current.get(project.id)
      if (!el) continue
      // ── 순수 행우선: 열 수 nr 기준 정수 격자 (§1) ──
      const row = Math.floor(k / nr)
      const col = k - row * nr
      const x = originX + col * stride
      const y = row * pitch
      if (row > maxRow) maxRow = row
      const dim = dimSet.has(order[k])
      el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`
      el.style.width = `${wPx}px`
      el.style.height = `${hPx}px`
      el.style.opacity = `${dim ? DIM_OPACITY : 1}`
      el.style.setProperty('--ts', `${titlePx(cardW)}px`)
      el.style.setProperty('--ss', `${sumPx(cardW)}px`)
    }

    if (gridRef.current) {
      // 말미 GAP은 pitch에 포함돼 있어 한 번 뺀다
      gridRef.current.style.height = `${Math.max(0, Math.round((maxRow + 1) * pitch - GAP))}px`
    }
  }, [colsToPos, dimSet, maxCols, order, projects, ready, total, vp.w, vp.h])

  // 렌더 직후 즉시 페인트 — 필터 재정렬(order)·리사이즈(vp)·마운트가 전부 여기서 수렴한다
  useLayoutEffect(() => {
    paintRef.current = paint
    paint(colsRef.current)
  })

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
    // 카드 rect만 넘긴다 = morph 출발 rect(4:3). 도착 rect의 원본 aspect는 img가 아니라
    // Sanity metadata(project.coverRatio)에서 온다 — 썸네일은 크롭되어 원본비를 모른다 (§5·§4-4)
    enterRectRef.current = { top: r.top, left: r.left, width: r.width, height: r.height }
    setSelected(project)
    setContentMode('idle')
    // 브라우저 뒤로가기 = 닫기. URL은 그리드 전용 /work-grid/[slug] — 링월 /work/[slug]와
    // 별개 경로라 새로고침해도 그리드 콘텐츠가 유지된다 (GRID_URL_split §2-3)
    window.history.pushState({ gridContent: project.id }, '', `/work-grid/${project.id}`)
    // idle→active morph 발동 (다음 프레임)
    requestAnimationFrame(() => requestAnimationFrame(() => setContentMode('active')))
  }, [])

  const closeProject = useCallback(() => {
    // 복귀 도착 rect를 카드의 **현재** 위치로 갱신 — 열려 있는 동안 밀도 변경(film movement)·
    // 리사이즈로 클릭 당시 rect와 달라졌을 수 있다. ref 변경은 setContentMode보다 먼저 해야
    // idle 렌더가 갱신된 enterRect를 받는다 (GRID_MORPH_fix 작업 ④).
    // 직접 진입(enterRectRef.current === null)은 **갱신하지 않는다** — 그리드 카드는 오버레이
    // 아래에 그대로 마운트돼 있어 el은 존재한다. 여기서 채우면 null 신호가 사라져 페이드아웃
    // 경로가 역-morph로 바뀌므로, null일 때는 건드리지 않는다 (GRID_URL_split §3-2 유지).
    if (selected && enterRectRef.current) {
      const el = cardEls.current.get(selected.id)
      if (el) {
        const r = el.getBoundingClientRect()
        enterRectRef.current = { top: r.top, left: r.left, width: r.width, height: r.height }
      }
    }
    setContentMode('idle')
    // 역-morph 재생이 끝난 뒤 언마운트. 모바일은 morph 자체가 없으므로 대기 없이 즉시 닫는다
    // — 760ms 잔류는 재생할 애니메이션이 없는 순수 지연이다 (GRID_MOBILE §2-4)
    if (isMobile) setSelected(null)
    else setTimeout(() => setSelected(null), CONTENT_EXIT_MS)
    // URL 원복 — pushState 되돌림 없이 replaceState로 그리드 URL 복원
    if (window.location.pathname !== '/work-grid') {
      window.history.replaceState({}, '', '/work-grid')
    }
  }, [selected, isMobile])

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
          will-change: transform, width, height, opacity;
          /* film movement의 "부드러운 재배치"가 사는 곳 — paint는 목표값만 쓰고 CSS가 트윈한다.
             정수 열 스냅(nr 변경) 순간 전 카드가 새 (row,col)로 이 곡선을 타고 이동한다 (§1) */
          transition: transform ${TWEEN_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1),
                      width ${TWEEN_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1),
                      height ${TWEEN_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1),
                      opacity ${FADE_MS}ms ease;
        }
        /* 필터 재정렬 구간만 더 긴 곡선으로 덮는다 — 이동 거리가 밀도 전환보다 크다 (§4) */
        .gm-flow .gm-card {
          transition: transform ${FLOW_MS - 40}ms cubic-bezier(0.22, 0.61, 0.36, 1),
                      width ${FLOW_MS - 40}ms cubic-bezier(0.22, 0.61, 0.36, 1),
                      height ${FLOW_MS - 40}ms cubic-bezier(0.22, 0.61, 0.36, 1),
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
        /* 타이틀 — 영문 위/한글 아래(en-first). 높이는 한글 유무와 무관하게 2줄분을 예약한다.
           metaH의 titleBlockH와 동일 식이어야 격자 피치와 DOM 높이가 어긋나지 않는다 (260804) */
        .gm-title {
          height: calc(var(--ts, 13px) * ${TITLE_LH * TITLE_LINES} + var(--ts, 13px) * ${KO_SCALE * TITLE_LH});
        }
        .gm-title-en {
          display: block;
          font-size: var(--ts, 13px);
          font-weight: 450;
          line-height: ${TITLE_LH};
          word-break: keep-all;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .gm-title-ko {
          display: block;
          font-size: calc(var(--ts, 13px) * ${KO_SCALE});
          font-weight: 350;
          line-height: ${TITLE_LH};
          opacity: 0.55;
          word-break: keep-all;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
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

      {/* ── GRID — 절대좌표. height는 paint가 행우선 maxRow에 맞춰 갱신 ── */}
      <div
        ref={gridRef}
        className={`gm-stage${flow ? ' gm-flow' : ''}`}
        style={{ position: 'relative', width: '100%' }}
      >
        {/* 카드 DOM은 order 인덱스 하나당 하나. key는 프로젝트 id 고정이라 밀도가 바뀌어도
            DOM이 재사용되고, 같은 DOM이 새 (row,col)로 CSS 트랜지션을 타고 이동한다 (§3) */}
        {order.map((projIdx) => {
          const project = projects[projIdx]
          if (!project) return null
          const award = project.awards?.find(a => a.visible !== false)?.title
          // hotspot은 CSS objectPosition이 아니라 Sanity 크롭 URL로 전달한다 (§4-2 — 이중 크롭 방지)
          const hotspot = project.coverHotspot
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
              {/* 이미지 — 항상 4:3. 원본 비율은 폭에 반영하지 않고 Sanity 크롭(hotspot 반영)으로 잘라낸다.
                  원본 비율이 필요한 곳은 콘텐츠 커버뿐이며, 그 소스는 img가 아니라
                  Sanity metadata(project.coverRatio)다 (§4-4) */}
              <div className="gm-frame" style={{ background: project.coverColor ?? COVER_FALLBACK }}>
                {project.coverImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={gridThumb43(project.coverImage, 800, hotspot)}
                    alt={project.title.en}
                    loading="lazy"
                    decoding="async"
                  />
                )}
              </div>

              {/* 하단 텍스트 — 타이틀 상시, 요약은 호버 시 타이틀 바로 아래에 페이드인 */}
              <div className="gm-meta">
                <div className="gm-title">
                  <span className="gm-title-en">{project.title.en}</span>
                  {project.title.ko && <span className="gm-title-ko">{project.title.ko}</span>}
                </div>
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
        // 모바일은 morph 없이 세로 스크롤로 즉시 표시한다 — contentMode·enterRect를 넘기지 않는다
        // (가로 트랙 morph는 세로 스택 진입에 성립하지 않는다, GRID_MOBILE §2-3)
        isMobile ? (
          <MobileGridContent project={selected} onBack={closeProject} />
        ) : (
          <GridContentArea
            project={selected}
            mode={contentMode}
            enterRect={enterRectRef.current}
            onBack={closeProject}
          />
        )
      )}
    </div>
  )
}
