# HIGHLIGHT_HANDOFF_SPEC — 구간 전환 하이라이트 승계 (2026-07-13)

## 0. 배경 및 목표

**증상:** 데스크톱 구간(≥768px)에서 특정 프로젝트가 하이라이트된 상태로 뷰포트를 좁혀 모바일 구간(<768px)에 진입하면, **전혀 다른 프로젝트가 하이라이트된다.** 반대 방향도 동일하다.

실사용 재현 경로는 **태블릿 세로↔가로 회전**이다. (브라우저 창 드래그는 개발 중 상황)

**원인:** `LandingExperience`가 두 렌더러를 조건부 렌더링(`{!mobile && ...}` / `{mobile && ...}`)하므로, 경계를 넘는 순간 **한쪽이 언마운트되고 다른 쪽이 새로 마운트**된다. 그런데 하이라이트 상태가 세 곳에 분산되어 있다.

| 소유자 | 상태 | 성격 |
|---|---|---|
| `LandingExperience` | `shuffleQueue` + `shuffleIdx` | 데스크톱 전용 셔플 |
| `LandingExperience` | `hoveredProject` | 데스크톱 전용 (모바일에 hover 없음) |
| `MobileProjectWall` | 자체 셔플 큐 + `centerIdxRef` | 모바일 전용 셔플 |

`activeProject`(탭해서 연 프로젝트)만 부모 소유이므로 유지된다. **하이라이트(idle 셔플 대상)는 각 자식이 독립 소유**하므로 소실된다.

**목표:** 구간 전환 시 하이라이트를 승계한다. 부모가 마지막 하이라이트를 기억했다가 새로 마운트되는 렌더러의 초기값으로 주입한다.

---

## 1. 접근 방식 — 경계면 처리 (근본 재구조화 아님)

**채택하지 않는 안:** 하이라이트 상태를 부모로 승격하고 셔플 타이머를 단일화하는 것(근본 해결). `MobileProjectWall`의 셔플·중앙정렬 계층 전면 재작성이 필요하며, 명세 ①~④로 막 안정화한 파일의 회귀 위험이 크다. 실익 대비 비용이 맞지 않는다.

**채택하는 안:** 부모가 `lastHighlightRef` 하나를 들고 있다가 마운트 시 주입한다. 국소적·자기완결적 변경이며, 다른 로직과 얽히지 않는다. 향후 근본 해결 시 깨끗이 걷어낼 수 있다.

**이는 패치워크가 아니다.** 셔플 삼중 정의라는 진짜 부채는 이 명세를 하든 안 하든 그대로 남으며, 이 변경이 그것을 늘리지 않는다.

**부채 등록:** 셔플 로직 삼중 정의(`LandingExperience` / `ProjectWall` / `MobileProjectWall`) → 향후 `LandingExperience`를 크게 손볼 때(예: `/work/[slug]` 라우팅 도입) 단일화한다.

**대상 파일 (2개):**
- `src/components/LandingExperience.tsx`
- `src/components/MobileProjectWall.tsx`

---

## 2. LandingExperience.tsx — 승계 저장소 신설

### 2-1. 마지막 하이라이트 ref

기존 상태 선언부 근처에 추가한다.

```ts
// 구간 전환 하이라이트 승계 — 언마운트되는 렌더러의 마지막 하이라이트를 기억했다가
// 새로 마운트되는 렌더러의 초기값으로 주입한다 (§1). 렌더 유발 불요이므로 ref
const lastHighlightRef = useRef<string | null>(null)
```

### 2-2. 데스크톱 하이라이트 기록

데스크톱은 `shuffleProject`가 하이라이트 소스다. 이를 매 변경 시 기록한다.

`const shuffleProject = ...` / `const displayProject = ...` 선언 이후에 추가한다.

```ts
// 데스크톱 하이라이트 기록 — 모바일 진입 시 승계될 값
useEffect(() => {
  if (mobile) return
  const h = activeProject?.id ?? hoveredProject?.id ?? shuffleProject?.id ?? null
  if (h) lastHighlightRef.current = h
}, [mobile, activeProject, hoveredProject, shuffleProject])
```

**우선순위 `activeProject > hoveredProject > shuffleProject`:** 데스크톱에서 실제로 화면에 표시되는 프로젝트(`displayProject`)와 동일한 순서다. 사용자가 보고 있던 것이 승계된다.

**`if (mobile) return`:** 모바일 구간에서는 데스크톱 상태가 갱신되지 않으므로 기록하지 않는다. 모바일이 자기 하이라이트를 §3-2의 콜백으로 기록한다.

### 2-3. 모바일 하이라이트 수신

`MobileProjectWall`이 중앙 카드 변경을 알리는 콜백을 받는다.

```ts
// 모바일 하이라이트 수신 — 데스크톱 진입 시 승계될 값
const handleHighlight = useCallback((slug: string) => {
  lastHighlightRef.current = slug
}, [])
```

### 2-4. 데스크톱 셔플 큐 초기 위치 승계

데스크톱은 `shuffleQueue[shuffleIdx]`가 하이라이트다. 모바일에서 넘어올 때, **승계 대상이 큐의 현재 위치가 되도록** 큐를 재정렬한다.

`mobile` 상태 전환을 감지하는 effect를 신설한다.

```ts
// 구간 전환 — 모바일 → 데스크톱 진입 시 승계 하이라이트를 셔플 큐 선두로 정렬
const prevMobileRef = useRef<boolean | null>(null)
useEffect(() => {
  const prev = prevMobileRef.current
  prevMobileRef.current = mobile
  if (prev === null || prev === mobile) return   // 초기 마운트 / 변화 없음
  if (mobile) return                              // 데스크톱 → 모바일: §3-1이 처리

  // 모바일 → 데스크톱: 승계 하이라이트를 큐 선두에 놓는다
  const h = lastHighlightRef.current
  if (!h) return
  const target = filteredRef.current.find(p => p.id === h)
  if (!target) return                             // 필터에서 제외됨 — 승계 포기
  const rest = shuffle(filteredRef.current.filter(p => p.id !== h))
  setShuffleQueue([target, ...rest])
  setShuffleIdx(0)
}, [mobile])
```

**`filteredRef.current` 사용 이유:** `filteredProjects`를 의존 배열에 넣으면 필터 변경 시에도 이 effect가 발화한다. 구간 전환에만 반응해야 하므로 ref로 읽는다.

**승계 실패 시 거동:** 승계 대상이 현재 필터에 없으면(예: 모바일에서 필터를 바꾼 뒤 전환) 아무것도 하지 않는다. 기존 셔플 큐가 그대로 쓰이며, 이는 현행 거동과 동일하다.

### 2-5. MobileProjectWall에 props 전달

```tsx
<MobileProjectWall
  projects={filteredProjects}
  filterTypes={FILTER_TYPES}
  activeFilter={activeFilter}
  onFilter={handleFilter}
  activeSlug={activeProject?.id ?? null}
  onActivate={handleActivate}
  onDeactivate={handleBack}
  revealed={layoutVisible}
  showFilters={showFilters}
  initialHighlight={lastHighlightRef.current}   // ← 신설
  onHighlight={handleHighlight}                 // ← 신설
/>
```

**`initialHighlight`는 마운트 시점의 ref 값이다.** 모바일이 새로 마운트될 때 데스크톱의 마지막 하이라이트가 담겨 있다. 이후 변경은 무시된다(§3-1의 `settledInitRef` 가드).

---

## 3. MobileProjectWall.tsx — 승계 수신 및 통보

### 3-1. Props 확장 및 초기 정착 승계

```ts
interface MobileProjectWallProps {
  // ... 기존 필드 전부 유지 ...
  initialHighlight?: string | null   // 구간 전환 승계 — 초기 정착 시 이 카드를 중앙에 놓는다
  onHighlight?: (slug: string) => void   // 중앙 카드 변경 통보 — 부모가 승계용으로 기억
}
```

**초기 정착 effect(`settledInitRef` 블록)를 다음과 같이 개정한다.**

```ts
// 초기 정착 — revealed 직후 1회. 승계 하이라이트가 있으면 그것을, 없으면 랜덤 큐 첫 항목을 중앙으로 (§4)
const settledInitRef = useRef(false)
useEffect(() => {
  if (!revealed || settledInitRef.current) return
  settledInitRef.current = true
  if (activeSlug) return   // 딥링크 — 활성 카드가 이미 중앙 (§6-4)

  // 승계 우선 — 데스크톱에서 보고 있던 프로젝트를 이어받는다 (HIGHLIGHT_HANDOFF_SPEC)
  const handoff = initialHighlight
    ? orderRef.current.findIndex(p => p.id === initialHighlight)
    : -1
  const idx = handoff >= 0
    ? handoff
    : Math.max(0, orderRef.current.findIndex(p => p.id === queueRef.current[0]))

  centerIdxRef.current = idx
  setCenterTick(t => t + 1)
  jumpTo(idx)
  // 승계 시에도 큐는 정상 진행 — 다음 셔플이 큐 첫 항목부터 시작하지 않도록 인덱스 보정
  queueIdxRef.current = handoff >= 0 ? 0 : 1
  lastShuffleRef.current = Date.now()
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [revealed])
```

**`queueIdxRef` 보정 이유:** 승계 없이 마운트되면 큐 0번을 중앙에 놓았으므로 다음 셔플은 1번부터다(`queueIdxRef = 1`). 승계 시에는 큐 0번을 아직 쓰지 않았으므로 **0으로 둔다.** 이로써 다음 셔플이 큐를 처음부터 소비한다.

**승계 실패 시(`handoff < 0`):** 승계 대상이 현재 필터에 없으면 기존 동작(랜덤 큐 첫 항목)으로 폴백한다.

**의존 배열에 `initialHighlight`를 추가하지 않는다.** 이 effect는 `revealed` 직후 1회만 실행되며, `settledInitRef`가 재실행을 막는다. 마운트 시점의 값만 쓰면 된다.

### 3-2. 중앙 카드 변경 통보

`centerIdxRef` 갱신 지점에서 부모에게 알린다. **기존 `liveCenter` 계산 블록 직후**에 effect를 추가한다.

```ts
// 중앙 카드 변경 통보 — 부모가 구간 전환 승계용으로 기억한다 (HIGHLIGHT_HANDOFF_SPEC)
useEffect(() => {
  if (!onHighlight) return
  const p = orderRef.current[centerIdxRef.current]
  if (p) onHighlight(p.id)
}, [centerTick, onHighlight])
```

**`centerTick`을 의존으로 삼는 이유:** `centerIdxRef`는 ref이므로 변경이 렌더를 유발하지 않는다. 기존 코드가 `setCenterTick(t => t + 1)`로 렌더를 트리거하고 있으므로, 이를 그대로 활용한다. **새 상태를 만들지 않는다.**

**`activeSlug` 중에도 통보한다.** 열람 중이더라도 중앙 카드는 그 프로젝트이므로, 승계 값으로 유효하다.

---

## 4. 검증 항목

1. **데스크톱 → 모바일:** 데스크톱에서 A 프로젝트가 하이라이트된 상태로 창 폭을 768px 미만으로 줄이면, 모바일 링의 중앙 카드도 **A**여야 한다.
2. **모바일 → 데스크톱:** 모바일에서 B 프로젝트가 중앙인 상태로 창 폭을 768px 이상으로 늘리면, 데스크톱 하이라이트가 **B**여야 한다.
3. **hover 승계:** 데스크톱에서 C 프로젝트에 hover한 상태로 모바일 진입 시, 중앙 카드가 **C**여야 한다.
4. **active 승계:** 데스크톱에서 D 프로젝트를 열어둔 상태로 모바일 진입 시, 열람 레이어가 **D**를 표시해야 한다 (기존에도 동작하나 회귀 없음 확인).
5. **필터 불일치 폴백:** 모바일에서 필터를 바꿔 승계 대상이 제외된 뒤 데스크톱 진입 시, 오류 없이 기존 셔플 큐로 폴백한다.
6. **왕복:** 데스크톱 ↔ 모바일을 3회 왕복해도 하이라이트가 계속 승계되고, 셔플이 정상 동작한다.
7. **셔플 정상성:** 승계 직후에도 6초 뒤 셔플이 정상 진행된다. 승계 카드가 즉시 다시 바뀌거나, 셔플이 멈추는 현상이 없어야 한다.
8. **초기 진입 회귀 없음:** 처음 사이트에 진입할 때(승계 값 없음) 데스크톱·모바일 모두 랜덤 하이라이트로 시작한다. 항상 같은 프로젝트가 나오는 현상이 없어야 한다.
9. **딥링크 회귀 없음:** `/work/[slug]`로 직접 진입 시 해당 프로젝트가 활성 상태로 열리며, 승계 로직이 이를 방해하지 않는다.
10. **태블릿 회전:** 실기기(또는 에뮬레이터)에서 세로↔가로 회전 시 하이라이트가 유지된다.
11. **컴파일:** `npx tsc --noEmit` 무오류.

---

## 5. 금지 사항 (Forbidden Changes)

1. **`src/hooks/useRingWall.ts` — 파일 전체 수정 금지.**
2. **`src/components/ProjectWall.tsx` — 파일 전체 수정 금지.** 데스크톱 월은 `highlightSlug` prop을 그대로 소비하며, 변경이 필요 없다.
3. **`src/components/ContentArea.tsx` — 파일 전체 수정 금지.**
4. **`src/app/globals.css`, `src/app/layout.tsx` — 파일 전체 수정 금지.**
5. **`src/lib/*`, `src/types/*` — 파일 전체 수정 금지.**
6. **768px 모바일 경계 수정 금지.** `const m = w < 768` 불변.
7. **셔플 로직 단일화 금지.** 이번 명세는 **경계면 처리**이며, 근본 재구조화가 아니다(§1). `LandingExperience` / `ProjectWall` / `MobileProjectWall`의 셔플 삼중 정의를 통합하려 하지 마라. 이는 별도 명세의 범위다.
8. **`shuffleQueue` / `shuffleIdx` / `advanceShuffle` / 셔플 타이머 구조 수정 금지.** §2-4에서 큐 **내용**을 재정렬할 뿐, 구조는 불변이다.
9. **`MobileProjectWall`의 셔플 큐 계층 수정 금지.** `queueRef` / `queueIdxRef` / `lastUserRef` / `lastShuffleRef` / `pendingJumpRef` / 셔플 폴링 타이머 구조 불변. §3-1에서 `queueIdxRef` 초기값만 조건 분기한다.
10. **브라우징 레이어(링) 렌더 수정 금지.** 티어 파생식, 카드 렌더 체인, 텍스트 하단 배치 일체 불변 (명세 ①~③ 결과).
11. **열람 레이어 수정 금지.** 세로 스택, 핀치 줌, 슬라이드 렌더러 일체 불변 (명세 ④ 결과).
12. **FLIP 모프 로직 수정 금지.** `startMorph` / `MorphState` / 역모프 목표 산식 일체 불변.
13. **필터 패널·필터 바 수정 금지.**
14. **URL/히스토리 동기화 수정 금지.** `pushState` / `popstate` / ESC 핸들러 / `handleBack` / `handleSelect` / `handleActivate` 일체 불변.
15. **새 상태(useState) 추가 금지.** 승계는 `useRef` + 기존 `centerTick`으로 처리한다. 렌더 유발이 불필요하다.
16. **`centerIdxRef` 소유권 이전 금지.** 모바일이 계속 소유하며, 부모에게는 **통보만** 한다.
17. **조건부 렌더링(`{!mobile && ...}` / `{mobile && ...}`) 구조 수정 금지.** 두 렌더러를 동시 마운트하려 하지 마라. 두 물리 루프와 두 셔플 타이머가 동시에 도는 것은 성능·복잡도 모두 악화다.
18. **`npm run dev` / `npm run build` 실행 금지.** 검증은 `npx tsc --noEmit`만 사용한다.

---

## 6. 완료 조건

- `npx tsc --noEmit` 무오류
- `LandingExperience.tsx`, `MobileProjectWall.tsx` 외 파일 변경 없음
- 새 `useState` 추가 0건 (§5-15)
- §4 검증 항목 전항 통과

---

## 7. Claude Code 실행 프롬프트

```
HIGHLIGHT_HANDOFF_SPEC.md 파일을 읽고 명세대로 구현해줘.

수정 대상은 src/components/LandingExperience.tsx와 src/components/MobileProjectWall.tsx
두 파일뿐이다.

목적은 데스크톱(≥768px)과 모바일(<768px) 구간을 오갈 때 하이라이트된 프로젝트가
승계되도록 하는 것이다. 현재는 두 렌더러가 조건부 렌더링으로 언마운트/재마운트되면서
각자 독립된 셔플 상태를 갖기 때문에 하이라이트가 소실된다.

해법은 부모(LandingExperience)에 lastHighlightRef를 두고, 언마운트되는 쪽의 마지막
하이라이트를 기억했다가 새로 마운트되는 쪽에 주입하는 것이다.

- 데스크톱 → 모바일: initialHighlight prop으로 주입, 모바일의 초기 정착(settledInitRef)
  블록에서 이를 우선 사용한다.
- 모바일 → 데스크톱: onHighlight 콜백으로 부모가 중앙 카드를 기억하고, 구간 전환 시
  셔플 큐 선두에 배치한다.

§5 금지 사항을 반드시 준수할 것. 특히:
- 셔플 로직 삼중 정의를 통합하려 하지 마라. 이번은 경계면 처리이지 재구조화가 아니다.
- 새 useState를 추가하지 마라. useRef와 기존 centerTick으로 충분하다.
- 두 렌더러를 동시 마운트하려 하지 마라.
- useRingWall.ts, ProjectWall.tsx, ContentArea.tsx는 절대 수정하지 마라.

구현 후 npx tsc --noEmit로 검증하고, npm run dev나 npm run build는 실행하지 마라.
```
