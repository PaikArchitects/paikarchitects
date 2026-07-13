# HANDOFF_RACE_FIX_SPEC — 승계 경합 수정 + 태블릿 경계 보정 (2026-07-13)

## 0. 두 가지 결함

### 결함 A — 하이라이트 승계 실패 (경합)

`HIGHLIGHT_HANDOFF_SPEC` 적용 후에도 데스크톱 → 모바일 전환 시 하이라이트가 승계되지 않고 **엉뚱한 프로젝트**가 중앙에 온다.

### 결함 B — iPad 세로에서 모바일 구간 미적용

iPad Pro 11"(세로 834px) / iPad Air(820px) / iPad mini(744px)에서 **세로 회전 시에도 데스크톱 구간이 유지된다.** 현행 경계 `w < 768`이 이들을 포섭하지 못한다.

---

## 1. 결함 A — 원인

`MobileProjectWall.tsx`의 세 effect가 경합한다.

```ts
// L429-430 — orderRef는 effect로 지연 동기화된다
const orderRef = useRef(order)
useEffect(() => { orderRef.current = order }, [order])

// L499-501 — 마운트 후 1회 Fisher-Yates
useEffect(() => { setOrder(prev => shuffle(prev)) }, [])

// L519-540 — 초기 정착
const settledInitRef = useRef(false)
useEffect(() => {
  if (!revealed || settledInitRef.current) return
  settledInitRef.current = true                       // ← 즉시 잠김
  if (activeSlug) return
  const handoff = initialHighlight
    ? orderRef.current.findIndex(p => p.id === initialHighlight)   // ← 셔플 전 배열에서 검색
    : -1
  // ...
  jumpTo(idx)
}, [revealed, jumpTo])
```

**실행 순서 (모바일 마운트 시, `revealed`는 이미 true):**

1. `orderRef.current = order` — **셔플 전 원본**
2. `setOrder(shuffle(prev))` — 큐에 등록만 됨. `order`는 아직 안 바뀜
3. **초기 정착 실행** — `orderRef.current`는 여전히 **셔플 전 배열**
4. `settledInitRef.current = true` — 영구 잠김
5. 이후 `setOrder` 반영 → 리렌더 → `orderRef` 갱신. **그러나 초기 정착은 재실행되지 않음**

결과: `handoff` 인덱스는 **셔플 전 배열의 위치**인데, 실제 렌더는 **셔플 후 배열**이다. 인덱스가 어긋나 전혀 다른 카드가 중앙에 온다.

**딥링크(`activeSlug`)가 정상이었던 이유:** `if (activeSlug) return`이 인덱스를 쓰지 않고 조기 반환하기 때문이다.

**폴백 경로(`initialHighlight` 없음)가 정상으로 보였던 이유:** `queueRef.current`도 같은 effect 사이클에서 셔플 전 `order` 기준으로 생성되므로(L505-506), **둘 다 셔플 전 기준이라 우연히 정합**했다. 승계 값만 외부에서 오므로 이 경우에만 어긋난다.

---

## 2. 결함 A — 수정

**대상 파일:** `src/components/MobileProjectWall.tsx`

**근본 원인은 "셔플이 effect로 지연된다"는 것이다.** SSR/hydration 불일치를 피하려고 마운트 후 셔플하는데(`Math.random`을 초기 렌더에서 쓰지 않는 기존 원칙), 이 때문에 첫 effect 사이클에서 `order`가 아직 원본이다.

`orderRef` 또한 effect로 지연 동기화되므로(`useEffect(() => { orderRef.current = order }, [order])`), **초기 정착 시점에 신뢰할 수 없다.** ref를 쓰는 한 이 경합은 해소되지 않는다.

### 2-1. 해법 — 셔플 완료를 상태로 승격

```ts
const [order, setOrder] = useState<Project[]>(projects)
const [shuffled, setShuffled] = useState(false)   // ← 신설: 마운트 셔플 완료 플래그

// 마운트 후 1회 Fisher-Yates — 인트로가 교체를 가린다
useEffect(() => {
  setOrder(prev => shuffle(prev))
  setShuffled(true)
}, [])
```

`setOrder`와 `setShuffled`는 **같은 배치에서 커밋**되므로, `shuffled === true`인 렌더에서는 `order`가 반드시 셔플 후 값이다.

초기 정착 effect:

```ts
// 초기 정착 — revealed + 마운트 셔플 커밋 이후 1회 (HANDOFF_RACE_FIX_SPEC)
const settledInitRef = useRef(false)
useEffect(() => {
  if (!revealed || !shuffled || settledInitRef.current) return   // ← shuffled 가드
  settledInitRef.current = true
  if (activeSlug) return   // 딥링크 — 활성 카드가 이미 중앙 (§6-4)

  // 승계 우선 — 데스크톱에서 보고 있던 프로젝트를 이어받는다 (HIGHLIGHT_HANDOFF_SPEC)
  const handoff = initialHighlight
    ? order.findIndex(p => p.id === initialHighlight)
    : -1
  const idx = handoff >= 0
    ? handoff
    : Math.max(0, order.findIndex(p => p.id === queueRef.current[0]))

  centerIdxRef.current = idx
  setCenterTick(t => t + 1)
  jumpTo(idx)
  queueIdxRef.current = handoff >= 0 ? 0 : 1
  lastShuffleRef.current = Date.now()
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [revealed, shuffled, order, jumpTo])
```

**`shuffled` 가드가 첫 사이클을 차단하고, 두 번째 렌더(셔플 커밋 후)에서 정착이 실행된다.** 이때 `order`는 셔플 후 배열이므로 `handoff` 인덱스가 실제 렌더와 정합한다.

**`queueRef` 정합성:** 큐 재생성 effect(L504-516)는 `[order, jumpTo]` 의존이므로, `order` 커밋과 함께 재실행되어 **셔플 후 배열 기준으로 큐를 재생성**한다. 초기 정착 effect보다 먼저 선언되어 있으므로 같은 사이클에서 먼저 실행된다. 따라서 `queueRef.current`도 정합하다.

**§5-15(새 useState 추가 금지) 예외:** `HIGHLIGHT_HANDOFF_SPEC`의 해당 조항은 승계 저장소에 관한 것이었다. 여기서는 **경합 해소를 위한 커밋 동기화**가 목적이며, ref로는 달성 불가능하다(ref는 렌더 배치에 참여하지 않는다). **`shuffled` 상태 1개 추가를 허용한다.**

---

## 3. 결함 B — 태블릿 경계 보정

**대상 파일:** `src/components/LandingExperience.tsx`

### 3-1. 문제

현행 경계:
```ts
const m = w < 768
```

| 기기 | 세로 폭 (CSS px) | 현행 구간 | 적정 구간 |
|---|---|---|---|
| iPhone Pro Max | 430 | 모바일 ✅ | 모바일 |
| iPad mini | 744 | 모바일 ✅ | 모바일 |
| **iPad Air** | **820** | **데스크톱 ❌** | 모바일 |
| **iPad Pro 11"** | **834** | **데스크톱 ❌** | 모바일 |
| iPad Pro 12.9" | 1024 | 데스크톱 ✅ | 데스크톱 |

iPad Air / Pro 11" 세로에서 SPA 분할이 유지되면, 좌측 Wall이 `clamp(300px, 28vw, 28vw)`의 하한 300px에 걸리고 우측은 518px만 남는다. **태블릿 세로에 적합한 화면이 아니다.**

### 3-2. 수정

```ts
// mobile detection — 모바일/태블릿세로 <1024, 그 외 데스크탑 분기.
// 1024 경계 근거: iPad Air(820)·iPad Pro 11"(834) 세로를 포섭하고,
// iPad Pro 12.9" 세로(1024)는 SPA 분할이 성립하므로 데스크톱에 남긴다 (HANDOFF_RACE_FIX_SPEC §3)
useEffect(() => {
  const fn = () => {
    const w = window.innerWidth
    const m = w < 1024
    mobileRef.current = m
    setMobile(m)
  }
  fn()
  window.addEventListener('resize', fn)
  return () => window.removeEventListener('resize', fn)
}, [])
```

**`w < 1024`:** iPad Pro 12.9" 세로(정확히 1024)는 조건을 만족하지 않으므로 **데스크톱 유지**. 이는 의도된 것이다 — 1024px에서 좌 300 + 우 708은 SPA로 충분하다.

### 3-3. 파급 영향

**(a) 데스크톱 D2 구간의 하한이 올라간다.**

명세 ①에서 D2(카드 텍스트 하단 배치)의 범위를 `max-width: 1439px`로 잡았다. 이제 데스크톱 구간 자체가 1024px부터 시작하므로, **D2의 실효 범위는 1024~1439px**가 된다. `ProjectWall.tsx`의 `D2_MAX_WIDTH = 1439` 판정은 **수정 불필요**하다 — 1024 미만에서는 `ProjectWall` 자체가 마운트되지 않으므로 하한 검사가 무의미하다.

**(b) `globals.css`의 미디어쿼리는 수정 불필요.**

`.wall-card-text` / `.wall-card-img`의 `max-width: 1439px` 규칙은 명세 ①에서 삭제되었다. `.slide-img`의 1439px 규칙은 `ContentArea` 소관이며, 데스크톱 구간(≥1024)에서만 렌더되므로 정상 동작한다.

`.mobile-header-bar` / `.mobile-menu-*` / `.wordmark-intro`의 `max-width: 767px` 미디어쿼리는 **문제가 된다.** 모바일 구간이 1023px까지 확장되었는데, 헤더 CSS는 767px에서 끊긴다.

**→ `globals.css`의 `767px` 미디어쿼리를 `1023px`로 상향한다.**

**(c) `.site-nav`의 태블릿 규칙 (768~1439px).**

```css
@media (min-width: 768px) and (max-width: 1439px) {
  .site-nav { left: auto; right: 24px; ... }
}
```

모바일 구간(<1024)에서는 `.site-nav { display: none }`이 적용되어야 하는데, 현재 이 규칙이 `max-width: 767px`에 걸려 있다. 상향 시 자동으로 정합된다. 다만 위 태블릿 규칙의 하한 `768px`도 **`1024px`로 상향**해야 중첩이 없다.

### 3-4. globals.css 수정

**대상 파일:** `src/app/globals.css`

다음 3개 미디어쿼리의 경계를 상향한다.

| 현행 | 변경 | 대상 규칙 |
|---|---|---|
| `@media (max-width: 767px)` | **`@media (max-width: 1023px)`** | `.mobile-header-bar`, `.wordmark-intro`(모바일 종착), `.site-nav { display:none }` |
| `@media (max-width: 767px)` | **`@media (max-width: 1023px)`** | `.mobile-menu-btn`, `.mobile-menu-scrim`, `.mobile-menu-panel` |
| `@media (min-width: 768px) and (max-width: 1439px)` | **`@media (min-width: 1024px) and (max-width: 1439px)`** | `.site-nav` 태블릿 우측 정렬 |

**다른 규칙은 건드리지 않는다.** `.wall-card-text` / `.wall-card-img` / `.slide-img` / 디자인 토큰 / base 스타일 일체 불변.

---

## 4. 검증 항목

### 결함 A (승계)

1. **데스크톱 → 모바일:** 데스크톱에서 A가 하이라이트된 상태로 폭을 1024px 미만으로 줄이면, 모바일 링 중앙 카드가 **A**여야 한다.
2. **모바일 → 데스크톱:** 모바일에서 B가 중앙인 상태로 폭을 1024px 이상으로 늘리면, 데스크톱 하이라이트가 **B**여야 한다.
3. **hover 승계:** 데스크톱에서 C에 hover한 채 모바일 진입 시 중앙 카드가 **C**.
4. **초기 진입 랜덤성 유지:** 처음 사이트 진입 시(승계 값 없음) 매번 다른 프로젝트가 중앙에 온다. **항상 같은 프로젝트가 나오면 실패다.**
5. **셔플 정상성:** 승계 직후에도 셔플이 정상 진행. 승계 카드가 즉시 다시 바뀌거나 셔플이 멈추지 않는다.
6. **딥링크:** `/work/[slug]` 직접 진입 시 해당 프로젝트가 활성 상태로 열린다.
7. **왕복:** 데스크톱 ↔ 모바일 3회 왕복 시 매번 승계된다.

### 결함 B (경계)

8. **iPad Pro 11" 세로(834px):** 모바일 구간(링 + 세로 스택)이 적용된다.
9. **iPad Pro 11" 가로(1194px):** 데스크톱 구간(SPA 분할)이 적용된다.
10. **회전 승계:** iPad 세로↔가로 회전 시 하이라이트가 유지된다 (결함 A 수정과 결합).
11. **모바일 헤더:** 834px 폭에서 컴팩트 헤더(56px 바 + 중앙 워드마크 + 햄버거/필터 글리프)가 정상 표시된다. **데스크톱 내비게이션이 남아 있으면 실패다.**
12. **햄버거 메뉴:** 834px에서 좌상단 햄버거가 표시되고 패널이 정상 슬라이드한다.
13. **1024px 경계:** 정확히 1024px에서 데스크톱, 1023px에서 모바일.
14. **데스크톱 회귀:** 1440px 이상에서 명세 ①~⑤ 결과가 모두 유지된다.

15. **컴파일:** `npx tsc --noEmit` 무오류.

---

## 5. 금지 사항 (Forbidden Changes)

1. **`src/hooks/useRingWall.ts` — 파일 전체 수정 금지.**
2. **`src/components/ProjectWall.tsx` — 파일 전체 수정 금지.** `D2_MAX_WIDTH = 1439` 불변 (§3-3-a).
3. **`src/components/ContentArea.tsx` — 파일 전체 수정 금지.**
4. **`src/app/layout.tsx` — 파일 전체 수정 금지.**
5. **`src/lib/*`, `src/types/*` — 파일 전체 수정 금지.**
6. **셔플 로직 삼중 정의를 통합하지 마라.** 이번은 경합 수정이며 재구조화가 아니다.
7. **`shuffled` 외 새 `useState` 추가 금지.** 경합 해소에 필요한 최소 1개만 허용한다.
8. **`orderRef` 제거 금지.** 다른 곳(셔플 폴링, 통보 effect 등)에서 계속 소비한다. **초기 정착 effect에서만 `order` 렌더 값으로 교체**한다.
9. **`queueRef` / `queueIdxRef` / `lastUserRef` / `lastShuffleRef` / `pendingJumpRef` 구조 수정 금지.**
10. **`centerIdxRef` / `centerTick` 구조 수정 금지.** 통보 effect(§3-2 of HIGHLIGHT_HANDOFF_SPEC) 불변.
11. **브라우징 레이어(링) 렌더 수정 금지.** 티어 파생식, 카드 렌더 체인, 텍스트 하단 배치 일체 불변.
12. **열람 레이어 수정 금지.** 세로 스택, 핀치 줌, 슬라이드 렌더러 일체 불변.
13. **FLIP 모프 로직 수정 금지.**
14. **필터 패널·필터 바 수정 금지.**
15. **URL/히스토리 동기화 수정 금지.**
16. **조건부 렌더링 구조(`{!mobile && ...}` / `{mobile && ...}`) 수정 금지.**
17. **`globals.css`에서 §3-4에 명시된 3개 미디어쿼리 경계 외 일체 수정 금지.** `.wall-card-text` / `.wall-card-img` / `.slide-img` / 디자인 토큰 / base 스타일 / 워드마크 데스크톱 규칙 불변.
18. **`npm run dev` / `npm run build` 실행 금지.** 검증은 `npx tsc --noEmit`만 사용한다.

---

## 6. 완료 조건

- `npx tsc --noEmit` 무오류
- `MobileProjectWall.tsx`, `LandingExperience.tsx`, `globals.css` 외 파일 변경 없음
- 새 `useState` 추가 1개(`shuffled`)만
- §4 검증 항목 전항 통과, 특히 **4번(초기 랜덤성)** 과 **11번(모바일 헤더)**

---

## 7. Claude Code 실행 프롬프트

```
HANDOFF_RACE_FIX_SPEC.md 파일을 읽고 명세대로 구현해줘.

두 가지 결함을 수정한다.

[결함 A — 승계 경합]
MobileProjectWall.tsx의 초기 정착 effect가 마운트 셔플이 커밋되기 전에 실행되어,
orderRef.current(셔플 전 배열)에서 initialHighlight를 찾는다. 인덱스가 실제 렌더
(셔플 후 배열)와 어긋나 엉뚱한 카드가 중앙에 온다.

해법:
1) shuffled 상태(useState)를 신설한다. 마운트 셔플 effect에서 setOrder와 함께
   setShuffled(true)를 호출한다 — 같은 배치에서 커밋되므로 shuffled===true인 렌더에서는
   order가 반드시 셔플 후 값이다.
2) 초기 정착 effect에 shuffled 가드를 추가하고, orderRef.current 대신 order(렌더 값)를
   사용한다. 의존 배열에 shuffled와 order를 추가한다.

[결함 B — 태블릿 경계]
iPad Air(820)·iPad Pro 11"(834) 세로에서 모바일 구간이 적용되지 않는다.
1) LandingExperience.tsx의 모바일 경계를 w < 768 → w < 1024로 상향한다.
2) globals.css의 미디어쿼리 3개 경계를 상향한다:
   - @media (max-width: 767px) 두 블록 → (max-width: 1023px)
   - @media (min-width: 768px) and (max-width: 1439px) → (min-width: 1024px) and (max-width: 1439px)
   그 외 CSS 규칙은 일절 건드리지 마라.

§5 금지 사항을 반드시 준수할 것. 특히 useRingWall.ts, ProjectWall.tsx,
ContentArea.tsx는 절대 수정하지 마라. 셔플 로직을 통합하려 하지도 마라.

구현 후 npx tsc --noEmit로 검증하고, npm run dev나 npm run build는 실행하지 마라.
```
