# MOBILE_TOPALIGN_CHIP_SPEC

**목적:** 모바일(<768px)의 두 현상을 해결한다.
- **PART 1 (상단 정렬):** 최초 진입·필터 교체 직후, 첫 프로젝트를 화면 상단에 d=0(최대 위계)로 고정한다. 사용자가 첫 스크롤을 시작하면 기존 수직 중앙 위계로 자연 합류한다.
- **PART 2 (칩 마우스 입력):** 데스크톱을 모바일 폭으로 축소했을 때 필터 칩이 클릭되지 않고 마우스 드래그가 끊기는 문제를 해결한다.

**대상 파일**
- `src/components/MobileProjectWall.tsx`

**적용 범위 (절대 조항):**
- 데스크톱·태블릿 코드는 일절 건드리지 않는다.
- v4.1 동결의 **수직 중앙 위계 기준선 자체는 변경하지 않는다.** PART 1은 "첫 화면 한정 상단 고정(topPin) → 첫 스크롤 시 해제"로, 중앙 위계 로직(`updateCenter`)을 수정하지 않고 그 위에 1회성 오버라이드만 얹는다.
- 검증은 `npx tsc --noEmit`만. `npm run dev` / `npm run build` 금지.

---

## 배경 (확정된 구조)

- 콘덴스드 월은 `updateCenter`(`center = scrollTop + clientHeight/2`)로 뷰포트 수직 중앙 최근접 카드를 `centerIdx`로 정하고, `d = |i - centerIdx|`로 3단 위계를 매긴다. `d===0` 카드만 상단 텍스트(`TOP_TEXT_H=24`)와 최대 크기(288×192)를 받는다.
- 피드는 상하 `50vh` 패딩을 가져 첫/마지막 카드도 중앙 도달이 가능하다. 이 때문에 `scrollTop=0`이면 첫 카드가 화면 **중앙**에 온다 → 현재의 "첫 카드가 중앙에서 시작" 현상의 직접 원인.
- 진입·필터 교체 시 `scrollTop=0`으로 리셋된다(L543 등).

**모순:** 현재 구조에서 "첫 카드 d=0(최대) + 물리적 상단"은 동시 성립 불가다. 상단에 붙이면 중앙엔 다른 카드가 와서 첫 카드가 d=0 자격을 잃는다. → PART 1은 첫 화면 한정으로 이 둘을 강제 동시 성립시키고, 첫 스크롤 시 해제한다.

---

## PART 1 — 첫 화면 상단 고정 (topPin)

### 1-1. topPin 상태 도입

컴포넌트 상단 상태부에:
```tsx
// 첫 화면 한정: 첫 카드를 상단에 d=0으로 고정. 첫 사용자 스크롤 시 해제 → 중앙 위계 합류
const [topPin, setTopPin] = useState(false)
const topPinRef = useRef(false)
const setTopPinBoth = (v: boolean) => { topPinRef.current = v; setTopPin(v) }
```

### 1-2. topPin 진입 시점 (최초 진입 + 필터 교체)

**(a) 최초 진입:** `revealed`가 true가 되어 첫 idle에 도달할 때 topPin을 켠다.
기존 최초 진입 처리(MOBILE_ENTRY_FIX_SPEC의 `firstRevealRef` idle 직행 로직이 적용돼 있다면 그 직후, 아니면 pre→unfolding effect 내 최초 분기)에서:
```tsx
setTopPinBoth(true)
```
와 함께 `setCenterIdx(0)` 및 `c.scrollTop = 0` 보장.

**(b) 필터 교체:** 필터 effect(L532)의 `setTimeout` 콜백 내, `setPhase('pre')` 직후 기존:
```tsx
const c = containerRef.current
if (c) c.scrollTop = 0
setCenterIdx(0)
```
에 추가:
```tsx
setTopPinBoth(true)
```

### 1-3. topPin 동안의 위계·정렬 오버라이드

**위계 오버라이드:** d 계산 라인(L701, L1030, 동일 식 2곳)
```tsx
const d = Math.abs(i - Math.min(centerIdx, displayList.length - 1))
```
을 다음으로 변경:
```tsx
const effCenterIdx = topPin ? 0 : Math.min(centerIdx, displayList.length - 1)
const d = Math.abs(i - effCenterIdx)
```
→ topPin 동안 첫 카드(i=0)가 항상 d=0(상단 텍스트 + 288×192), 나머지는 순차 위계.

**물리적 상단 정렬:** topPin 동안 피드 상단 패딩 `50vh`를 제거(또는 0으로)하여 첫 카드가 칩 행 바로 아래(상단)에 붙도록 한다. 피드 패딩 컨테이너(L1024):
```tsx
<div style={{ paddingTop: topPin ? 0 : '50vh', paddingBottom: '50vh' }}>
```
- `paddingBottom: 50vh`는 유지(마지막 카드 중앙 도달용, topPin 해제 후 정상 작동).
- **주의:** topPin에서 `paddingTop: 0`이고 `scrollTop=0`이면 첫 카드가 칩 행(sticky, CHIPS_H) 바로 아래에 온다. 칩 행이 sticky라 첫 카드를 가리지 않는다. 시각 확인 항목.

### 1-4. topPin 해제 (첫 사용자 스크롤)

`handleFeedScroll`(L912)에 해제 트리거 추가. **프로그래매틱 스크롤(셔플)이 아닌 실제 사용자 스크롤**일 때만 해제:
```tsx
const handleFeedScroll = () => {
  if (!programmaticRef.current) {
    lastUserRef.current = Date.now()
    if (topPinRef.current) {
      // 첫 사용자 스크롤 → 상단 고정 해제. paddingTop 50vh 복원에 따른 위치 점프 보정.
      const c = containerRef.current
      setTopPinBoth(false)
      if (c) c.scrollTop += /* viewport */ c.clientHeight * 0.5  // 50vh 패딩 복원 보정 (아래 주의)
    }
  }
  if (centerRafRef.current != null) return
  centerRafRef.current = requestAnimationFrame(() => {
    centerRafRef.current = null
    updateCenter()
  })
}
```

**보정 수식 주의 (중요):** topPin 해제 순간 `paddingTop`이 `0 → 50vh`로 복원되면 콘텐츠 전체가 50vh만큼 아래로 밀려, 동일 `scrollTop`에서 보이는 카드가 갑자기 바뀐다. 이를 막기 위해 해제와 동시에 `scrollTop`에 `0.5 * clientHeight`(50vh)를 더해 **시각적 위치를 보존**한다. 단, 이 보정은 레이아웃 반영 타이밍에 민감하므로:
- `setTopPinBoth(false)` 후 `requestAnimationFrame`에서 `scrollTop` 보정을 적용하거나, `useLayoutEffect`로 topPin false 전이를 감지해 보정하는 방식 중 **안정적인 쪽을 구현 시 선택**한다.
- 보정이 어색하면(첫 스크롤 시 미세 점프), 대안으로 **topPin 해제 시 현재 보이는 첫 카드를 기준으로 `updateCenter`가 자연 정착**하도록 두고 보정을 생략하는 방안도 가능. 구현 후 화면 녹화로 어느 쪽이 매끄러운지 판단하고 보고할 것.

### 1-5. topPin 중 셔플 억제

셔플 타이머(L647)는 `phase==='idle'`에서 기동한다. topPin 상태에서 셔플이 돌면 상단 고정이 깨진다. 셔플 가드에 topPin 제외 추가:
```tsx
if (!revealed || activeSlug || phase !== 'idle' || topPinRef.current) return
```
→ topPin 해제(첫 스크롤) 후에야 셔플 타이머가 기동. 진입 직후 6초간 상단 고정이 유지되다가, 사용자가 스크롤하지 않아도 셔플로 깨지지 않는다. **단 이렇게 하면 사용자가 스크롤하지 않는 한 셔플이 영영 시작되지 않는다.** 이게 의도와 맞는지 확인 필요 — 만약 "첫 화면 상단 고정은 유지하되 일정 시간 후 셔플로 자동 전환"을 원하면, topPin에 타임아웃(예: 6초 후 자동 해제)을 추가하는 변형을 제안한다. **기본 구현은 "첫 스크롤까지 상단 고정 유지"로 하고, 타임아웃 자동 해제 여부는 보고 후 결정.**

---

## PART 2 — 칩 마우스 클릭·드래그 (데스크톱 축소 환경)

### 진단 (확정)
- 칩 행(`chipsRef`, L952)은 `overflowX: 'auto'`만 있고 **마우스 드래그-투-스크롤 핸들러가 없다.** 터치 네이티브 스크롤에만 의존 → 마우스로 끌면 브라우저 기본 드래그가 개입해 "끊기고 이상하게 이동".
- 칩은 `<button onClick={() => onFilter(t)}>`(L967)로 클릭 자체는 정상 바인딩. 그라디언트 오버레이는 `pointerEvents:'none'`이라 클릭을 막지 않는다. → "클릭 안 됨"의 원인은 **드래그 시도 중 클릭이 드래그로 흡수**되거나, 마우스 down→up 사이 미세 이동이 click을 취소시키는 것. 드래그 핸들러를 명시적으로 넣고 이동<5px일 때 click을 보존하면 해결된다.

### 2-1. 칩 행 마우스 드래그-투-스크롤

`chipsRef` div에 마우스 전용 Pointer 드래그 추가. 터치는 네이티브 스크롤 유지(이중 스크롤 충돌 방지).

```tsx
const chipDrag = useRef<{ x: number; scroll: number; moved: boolean } | null>(null)

const onChipsPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
  if (e.pointerType !== 'mouse') return
  const el = chipsRef.current
  if (!el) return
  chipDrag.current = { x: e.clientX, scroll: el.scrollLeft, moved: false }
  el.setPointerCapture(e.pointerId)
}
const onChipsPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
  const d = chipDrag.current
  const el = chipsRef.current
  if (!d || !el) return
  const dx = e.clientX - d.x
  if (Math.abs(dx) >= 5) d.moved = true
  el.scrollLeft = d.scroll - dx
}
const onChipsPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
  chipDrag.current = null
}
```

`chipsRef` div에 부착 + 기본 드래그 억제:
```tsx
<div
  ref={chipsRef}
  className="mpw-chips"
  onScroll={updateChipFade}
  onPointerDown={onChipsPointerDown}
  onPointerMove={onChipsPointerMove}
  onPointerUp={onChipsPointerUp}
  style={{
    height: '100%', display: 'flex', alignItems: 'center', gap: 24,
    overflowX: 'auto', padding: '0 16px',
    touchAction: 'pan-x',          // 터치 가로 스크롤 명시
    userSelect: 'none',            // 마우스 드래그 시 텍스트 선택 방지 (끊김/이상 이동 원인 제거)
  }}
>
```

### 2-2. 드래그와 클릭 공존

- 칩 `<button onClick={() => onFilter(t)}>`의 onClick은 유지.
- 마우스로 5px 이상 드래그한 경우(`chipDrag.current?.moved`)에만 클릭을 억제한다. 버튼 onClick 래핑:
```tsx
onClick={() => { if (chipDrag.current?.moved) return; onFilter(t) }}
```
  - 단 `onPointerUp`에서 `chipDrag.current`가 null로 초기화되므로, 클릭 판정용 `moved`는 별도 ref(`lastChipMovedRef`)에 pointerup 직전 값을 저장해 onClick에서 참조한다:
```tsx
const lastChipMovedRef = useRef(false)
// onChipsPointerUp 내부, null 대입 전:
const onChipsPointerUp = () => {
  lastChipMovedRef.current = chipDrag.current?.moved ?? false
  chipDrag.current = null
}
// 버튼:
onClick={() => { if (lastChipMovedRef.current) { lastChipMovedRef.current = false; return } onFilter(t) }}
```

### 2-3. userSelect 부작용 점검
- `userSelect: 'none'`은 칩 텍스트 선택을 막아 마우스 드래그 끊김을 제거한다. 터치·접근성에 부작용 없음(칩은 선택 대상 텍스트가 아님).

---

## 검증 체크리스트 (`npx tsc --noEmit` 통과 후, 화면 녹화 검증)

PART 1 — 상단 정렬:
- [ ] 1a. 최초 진입 시 첫 프로젝트가 **상단**에 d=0(상단 텍스트 + 최대 크기)로 표시
- [ ] 1b. 필터 프로그램 선택 직후에도 첫 프로젝트가 상단 d=0로 표시 (중앙 배치·점프 소멸)
- [ ] 1c. 첫 사용자 스크롤 시 상단 고정이 풀리고 중앙 위계로 자연 합류 (해제 시 위치 점프 없음 또는 최소)
- [ ] 1d. topPin 동안 셔플이 상단 고정을 깨지 않음
- [ ] 1e. 스크롤 후의 중앙 기준 위계·셔플·확장 모프 등 v4.1 동작 회귀 없음

PART 2 — 칩 마우스 입력 (데스크톱 모바일 폭):
- [ ] 2a. 마우스로 칩 클릭 시 필터 정상 적용 (클릭 불가 해소)
- [ ] 2b. 마우스로 칩 행 좌우 드래그 시 부드럽게 가로 스크롤 (끊김·이상 이동 해소)
- [ ] 2c. 5px 미만 클릭은 필터 선택, 5px 이상 드래그는 스크롤로 구분
- [ ] 2d. 실기기 터치에서 칩 가로 스크롤·선택 현행 동일 (회귀 0)

---

## Claude Code 입력 프롬프트

```
MOBILE_TOPALIGN_CHIP_SPEC.md 파일을 읽고 명세대로 구현해줘.

핵심 제약:
- 모바일(<768px) MobileProjectWall.tsx 만 수정. 데스크톱·태블릿 코드는 일절 건드리지 말 것.
- PART 1: v4.1 동결의 수직 중앙 위계 기준선(updateCenter) 자체는 수정 금지. "첫 화면 한정 topPin 오버라이드 → 첫 사용자 스크롤 시 해제"로만 구현. topPin 해제 시 paddingTop 50vh 복원에 따른 위치 점프 보정을 넣되, 어색하면 보정 생략안과 비교해 보고할 것.
- PART 1-5: 기본은 "첫 스크롤까지 상단 고정 유지". 셔플 타임아웃 자동 해제 여부는 임의 결정 말고 보고할 것.
- PART 2: 칩 마우스 드래그는 pointerType==='mouse'에만. 터치는 네이티브 스크롤 유지. 5px 임계로 클릭/드래그 구분. userSelect:none으로 드래그 끊김 제거.
- 검증은 npx tsc --noEmit 만 사용. npm run dev / npm run build 금지.
- d 계산식 변경(L701, L1030 동일식 2곳)은 두 곳 모두 일관 적용할 것.
```
