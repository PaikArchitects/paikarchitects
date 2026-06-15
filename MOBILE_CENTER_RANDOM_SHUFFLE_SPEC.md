# MOBILE_CENTER_RANDOM_SHUFFLE_SPEC

**목적:** 모바일(<768px) 콘덴스드 월을 다음으로 되돌리고 개선한다.
- **PART 1 (되돌리기):** topPin(상단 정렬) 및 M3 상단 정렬 로직을 전면 제거하고, 진입·필터 교체 시 **첫 프로젝트가 화면 수직 중앙에서 시작**하도록 복귀한다.
- **PART 2 (랜덤 시작):** 진입·필터 교체 시 중앙에 오는 첫 프로젝트를 **랜덤**으로 선택한다. 데스크톱(`LandingExperience`)이 마운트·필터 시 `shuffle()` 큐의 0번을 쓰는 것과 동일한 개념.
- **PART 3 (셔플 스크롤 = 데스크톱 속도):** 셔플 전환 스크롤을 `animateScroll`(600ms 고정) 대신 **데스크톱 프로젝트 월과 동일한 `scrollIntoView({ behavior:'smooth', block:'center' })`** 로 교체한다.

**대상 파일:** `src/components/MobileProjectWall.tsx`

**참조 기준:** 이 스펙은 **GitHub main 최신본(약 1405줄, topPin/firstReveal/chipDrag 반영본)** 기준이다. 라인 번호는 가변이므로 구현 시 코드 내용으로 위치를 식별할 것.

**절대 조항:**
- 데스크톱·태블릿 코드 일절 수정 금지.
- **확장/수축 모프의 `animateScroll(getTarget, MORPH_MS, ...)` 호출 4곳은 절대 건드리지 말 것.** PART 3은 **셔플 호출(advanceShuffle 내 1곳)만** 교체한다.
- 칩 마우스 드래그(chipDrag/onChipsPointer), userSelect 등 기존 반영분은 유지.
- 검증은 `npx tsc --noEmit`만. `npm run dev` / `npm run build` 금지.

---

## PART 1 — topPin / M3 상단 정렬 제거 (중앙 시작 복귀)

topPin과 M3 상단 정렬은 21곳 이상에 분산돼 있다. 다음을 **모두 제거 또는 원복**한다.

### 1-1. 상태·ref 제거
- `const [topPin, setTopPin] = useState(false)` 제거
- `const topPinRef = useRef(false)` 제거
- `const setTopPinBoth = ...` 제거
- `const topPinReleaseRef = useRef(false)` 제거
- `const pendingTopAlignRef = useRef(true)` (M3) 제거

### 1-2. 진입 effect 원복 (firstReveal idle 직행은 유지, topPin만 제거)
최초 진입 effect에서:
- `setTopPinBoth(true)` 호출 제거.
- `setCenterIdx(0)` 및 `c.scrollTop = 0` 라인 **제거** — 중앙 시작 복귀를 위해 첫 car_idx는 PART 2의 랜덤 로직이 설정한다(아래 참조). (firstReveal의 idle 직행 자체는 유지하여 펼침 과도기 없이 진입.)

**주의:** firstReveal idle 직행은 유지하되, 직행 후 중앙 정렬·랜덤 선택은 PART 2가 담당한다. 즉 이 effect에서는 phase만 idle로 보내고, 스크롤/centerIdx 설정은 PART 2의 랜덤 정착 로직으로 일원화한다.

### 1-3. 필터 effect 원복
필터 effect의 `setTimeout` 콜백에서:
- `setTopPinBoth(true)` 제거
- `pendingTopAlignRef.current = true` 제거
- `setCenterIdx(0)` 및 `c.scrollTop = 0`는 PART 2 랜덤 로직으로 대체(아래).

### 1-4. 셔플 가드 원복
셔플 타이머 effect:
```tsx
if (!revealed || activeSlug || phase !== 'idle' || topPin) return
```
→ `topPin` 항 제거:
```tsx
if (!revealed || activeSlug || phase !== 'idle') return
```
의존성 배열에서 `topPin` 제거.

### 1-5. d 계산식 원복 (2곳)
```tsx
const effCenterIdx = topPin ? 0 : Math.min(centerIdx, displayList.length - 1)
const d = Math.abs(i - effCenterIdx)
```
→ 원래 형태로 (2곳 모두):
```tsx
const d = Math.abs(i - Math.min(centerIdx, displayList.length - 1))
```

### 1-6. 피드 패딩 원복
```tsx
<div style={{ paddingTop: topPin ? 0 : '50vh', paddingBottom: '50vh' }}>
```
→
```tsx
<div style={{ paddingTop: '50vh', paddingBottom: '50vh' }}>
```

### 1-7. topPin 해제 보정 로직 제거
- `handleFeedScroll` 내 `if (topPinRef.current) { ... setTopPinBoth(false) }` 블록 제거.
- topPin true→false 전이 보정용 `useLayoutEffect([topPin])` 블록 전체 제거.

**1-x 완료 기준:** `grep -i topPin` 및 `pendingTopAlign` 결과 0건. firstReveal(idle 직행)은 남아 있어도 됨.

---

## PART 2 — 진입·필터 시 첫 프로젝트 랜덤 중앙 정착

데스크톱은 마운트 시 `shuffle(sortedProjects)` 큐의 0번을 첫 highlight로 쓰고, 필터 시 `shuffle(filteredProjects)`로 큐를 재생성해 0번을 쓴다. 모바일도 동일 개념을 적용하되, 모바일의 "정착"은 **해당 프로젝트를 화면 수직 중앙으로 스크롤**하는 것이다.

### 2-1. 랜덤 첫 항목 선택 헬퍼
모바일엔 이미 `queueRef`(`shuffleArr`로 섞인 id 큐)와 `queueIdxRef`가 있고, `displayList` 변경 시 큐를 재생성한다(기존 effect 유지). 이 큐의 현재 0번을 "첫 표시 프로젝트"로 사용한다.

진입·필터 후 첫 정착을 위한 함수 추가:
```tsx
// 진입/필터 직후: 셔플 큐의 첫 항목을 화면 수직 중앙으로 정착 (애니메이션 없이 즉시)
const settleInitialRandom = useCallback(() => {
  const c = containerRef.current
  if (!c) return
  // 큐가 비어있으면 재생성
  if (queueRef.current.length === 0) {
    queueRef.current = shuffleArr(displayList.map(p => p.id))
    queueIdxRef.current = 0
  }
  const slug = queueRef.current[0]
  const el = itemEls.current[slug]
  if (!el) return
  // 중앙 정착 (즉시, 셔플 타이머의 6초 시작점도 여기서 리셋)
  c.scrollTop = Math.max(0, Math.min(
    el.offsetTop + el.offsetHeight / 2 - c.clientHeight / 2,
    c.scrollHeight - c.clientHeight
  ))
  // queueIdx는 0번을 "이미 보여준 것"으로 간주하고 1부터 다음 셔플 진행
  queueIdxRef.current = 1
  lastShuffleRef.current = Date.now()   // 진입 직후 즉시 셔플 방지 (6초 간격 확보)
}, [displayList])
```

### 2-2. 정착 호출 시점
**(a) 최초 진입:** firstReveal로 phase가 idle이 된 직후. idle 진입을 감지하는 effect에서 1회 호출. 큐·itemEls(ref)가 준비된 뒤여야 하므로 `requestAnimationFrame` 1~2회 후 호출:
```tsx
// 최초 진입 idle 도달 시 랜덤 중앙 정착
const didInitialSettleRef = useRef(false)
useEffect(() => {
  if (phase !== 'idle' || didInitialSettleRef.current) return
  didInitialSettleRef.current = true
  requestAnimationFrame(() => requestAnimationFrame(() => settleInitialRandom()))
}, [phase, settleInitialRandom])
```

**(b) 필터 교체:** 필터 effect의 `setTimeout` 콜백에서 `setPhase('pre')` 후 펼침을 거쳐 idle에 도달한다. 필터 교체도 랜덤 정착이 필요하므로, 필터 교체 시 `didInitialSettleRef`를 리셋해 위 effect가 다시 1회 발동하게 한다:
```tsx
// 필터 effect setTimeout 콜백 내부, setDisplayList 후:
didInitialSettleRef.current = false   // 다음 idle 도달 시 settleInitialRandom 재실행
```
- 단, 큐 재생성 effect(`[displayList]` 의존)가 `setDisplayList` 후 새 displayList로 큐를 다시 섞으므로, settleInitialRandom이 호출될 때 큐 0번은 새 필터 결과의 랜덤 항목이 된다. (데스크톱 동작과 일치)

### 2-3. centerIdx 동기화
`settleInitialRandom`이 스크롤을 옮긴 직후 `updateCenter()`를 호출해 `centerIdx`가 중앙(랜덤 첫 항목)으로 잡히도록 한다. settleInitialRandom 끝에 추가:
```tsx
updateCenter()
```
(updateCenter는 scrollTop 기준 중앙 최근접을 centerIdx로 설정하므로, 랜덤 항목이 d=0이 된다.)

### 2-4. 중복 정착 방지
- `firstFilterRef`(첫 마운트 시 필터 effect skip)는 유지. 최초 진입 정착은 2-2(a)가, 이후 필터 정착은 2-2(b)가 담당하므로 충돌 없음.

---

## PART 3 — 셔플 스크롤을 scrollIntoView로 교체 (데스크톱 속도)

데스크톱 프로젝트 월은 `el.scrollIntoView({ behavior:'smooth', block:'center' })`로 셔플 대상 카드를 중앙 정렬한다(이동 시간은 브라우저 네이티브, 거리 가변, 재빠름). 모바일 셔플도 이와 동일하게 교체한다.

### 3-1. advanceShuffle의 스크롤 교체
현재 `advanceShuffle` 내부:
```tsx
animateScroll(
  () => el.offsetTop + el.offsetHeight / 2 - c.clientHeight / 2,
  SHUFFLE_SCROLL_MS,
)
```
교체:
```tsx
// 셔플 스크롤을 사용자 스크롤로 오인하지 않도록 프로그래매틱 플래그 설정
programmaticRef.current = true
el.scrollIntoView({ behavior: 'smooth', block: 'center' })
// scrollIntoView는 완료 콜백이 없으므로, 네이티브 smooth 스크롤 종료 추정 시간 후 플래그 해제
// (데스크톱과 동일 메커니즘. 600ms면 대부분의 거리에서 충분)
if (shuffleFlagTimerRef.current) clearTimeout(shuffleFlagTimerRef.current)
shuffleFlagTimerRef.current = setTimeout(() => { programmaticRef.current = false }, 700)
```

상단에 ref 추가:
```tsx
const shuffleFlagTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
```

언마운트 정리 effect에 추가:
```tsx
if (shuffleFlagTimerRef.current) clearTimeout(shuffleFlagTimerRef.current)
```

### 3-2. programmaticRef 처리 근거
- 기존 `animateScroll`은 실행 중 `programmaticRef.current=true`를 세워 `handleFeedScroll`이 셔플 스크롤을 사용자 조작으로 오인하지 않게 했다. `scrollIntoView`는 이 플래그를 세우지 않으므로, **수동으로 true 설정 후 종료 추정 시간(700ms) 뒤 false** 로 동일 보호를 재현한다.
- 700ms는 네이티브 smooth 스크롤이 대부분 끝나는 시간. 정확한 종료 시점을 잡으려면 `scrollend` 이벤트(지원 브라우저)를 쓸 수 있으나, iOS Safari 호환을 위해 타이머 방식을 기본으로 한다. **구현 후 셔플 직후 셔플 타이머가 사용자 조작으로 오인돼 멈추는지 확인하고, 멈추면 타이머 값 조정 또는 scrollend 병용을 보고할 것.**

### 3-3. SHUFFLE_SCROLL_MS 처리
- `SHUFFLE_SCROLL_MS` 상수는 advanceShuffle에서 더 이상 쓰이지 않게 된다. 다른 참조가 없으면 제거하거나, 3-1의 플래그 해제 타이머 값(700)으로 의미를 재정의해 재사용해도 무방. **다른 참조 여부 확인 후 처리하고, 제거 시 보고.**

---

## 검증 체크리스트 (`npx tsc --noEmit` 통과 후, 모바일 폭 화면 녹화 검증)

PART 1·2 — 중앙 랜덤 시작:
- [ ] C1. 최초 진입 시 첫 프로젝트가 **화면 수직 중앙**에서 시작 (상단 정렬·점프 없음)
- [ ] C2. 진입 시 중앙 첫 프로젝트가 **랜덤**으로 매번 달라짐 (새로고침 반복 확인)
- [ ] C3. 필터 프로그램 선택 시 첫 프로젝트가 중앙에서 시작하며 **랜덤**
- [ ] C4. 중앙 첫 항목이 d=0(상단 텍스트 + 최대 크기)로 정상 강조

PART 3 — 셔플 스크롤 속도:
- [ ] C5. 6초 무조작 후 셔플 발동, 랜덤 프로젝트로 **데스크톱처럼 재빠르게** 스크롤 (600ms 고정 대비 빠름·가변)
- [ ] C6. 셔플 직후 셔플 타이머가 사용자 조작으로 오인돼 멈추지 않음 (다음 6초 주기 정상)
- [ ] C7. 셔플 중/직후 사용자가 터치 스크롤하면 셔플 정지(8초 후 재개) 정상

회귀 0:
- [ ] R1. 카드 탭→확장 모프, active 중앙 정렬, 트랙 스냅 등 v4.1 동작 무변화 (모프 animateScroll 4곳 미수정 확인)
- [ ] R2. 칩 마우스 드래그·클릭(기존 반영분) 정상 유지
- [ ] R3. 데스크톱·태블릿 무영향

---

## Claude Code 입력 프롬프트

```
MOBILE_CENTER_RANDOM_SHUFFLE_SPEC.md 파일을 읽고 명세대로 구현해줘.

핵심 제약:
- 모바일(<768px) MobileProjectWall.tsx 만 수정. 데스크톱·태블릿 코드는 일절 건드리지 말 것.
- PART 1: topPin과 M3 상단 정렬 관련 상태/ref/effect/렌더 분기를 전면 제거(grep topPin, pendingTopAlign 결과 0건). firstReveal의 idle 직행 자체는 유지.
- PART 2: 진입·필터 시 셔플 큐 0번(랜덤)을 화면 수직 중앙으로 정착. 데스크톱 LandingExperience의 shuffle 큐 0번 사용 개념과 동일.
- PART 3: 셔플 스크롤만 scrollIntoView({behavior:'smooth',block:'center'})로 교체. 확장/수축 모프의 animateScroll(getTarget, MORPH_MS,...) 4곳은 절대 건드리지 말 것. programmaticRef를 수동 set/해제(타이머 700ms)해 셔플 스크롤이 사용자 조작으로 오인되지 않게 할 것.
- 칩 드래그/userSelect 등 기존 반영분 유지.
- 검증은 npx tsc --noEmit 만 사용. npm run dev / npm run build 금지.
- PART 3의 programmaticRef 해제 타이밍(셔플 직후 타이머 멈춤 여부), SHUFFLE_SCROLL_MS 제거 여부는 구현 후 확인·보고할 것.
```
