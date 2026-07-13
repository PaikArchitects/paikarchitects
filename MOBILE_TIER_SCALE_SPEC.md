# MOBILE_TIER_SCALE_SPEC — 모바일 링 티어 폭 파생 + 카드 텍스트 하단 배치 (2026-07-13)

## 0. 배경 및 목표

**두 가지를 동시에 해결한다.**

### 문제 1 — 티어 폭이 고정 px이라 기기별 비율이 흔들린다

현행 `TIERS = { 0: 288×192, 1: 201×134, 2: 114×76 }`는 고정 px이다.
열람 트랙의 히어로 폭은 `calc(100vw - 32px)`이므로:

| 기기 | 화면 폭 | 히어로 폭 | 티어0/히어로 |
|---|---|---|---|
| iPhone SE | 375 | 343 | 84.0% |
| iPhone 15 | 390 | 358 | 80.4% |
| iPhone Pro Max | 430 | 398 | 72.4% |

브라우징(링)에서 열람(트랙)으로 넘어갈 때의 **시각적 연속성**이 기기마다 다르다. 큰 화면일수록 티어0이 상대적으로 작아져 FLIP 모프의 확대폭이 커진다.

**목표:** 티어0 폭을 히어로 폭의 **92%**로 고정해 전 기기에서 동일한 확대감을 보장한다. 동시에 현행(80.4%)보다 절대 크기를 키운다.

### 문제 2 — 태블릿 세로에서 카드가 과대해진다

92%를 무제한 적용하면 767px 화면에서 티어0 = 676px이 되어, 화면을 가득 채운 부담스러운 썸네일이 된다. 수직으로 보이는 프로젝트 수도 줄어 "선택지가 보이는 벽"이라는 Project Wall의 기능이 훼손된다.

**목표:** 절대 상한 **400px**를 둔다. 작은 폰에서는 92%가 적용되고, 폭이 커질수록 자연스럽게 여백이 늘어난다.

**중요:** 이 방식은 브레이크포인트를 신설하지 **않는다.** 티어 폭이 폭의 연속 함수이므로 구간 경계가 없고, 따라서 점프도 없다. "구간이 늘수록 물리 파라미터 분기가 늘고 이는 패치워크 누적"이라는 원칙에 부합한다.

### 문제 3 — 카드 텍스트 배치가 데스크톱 D2와 불일치

현행 모바일 카드는 d=0에서 텍스트가 **이미지 상단**에 있고, 프로젝트명/용도가 **좌우 병기**다.
명세 ①(`WALL_CARD_TEXT_BELOW_SPEC`)에서 데스크톱 D2를 "이미지 하단 + 상하배열"로 통일했으므로, 모바일도 동일 문법으로 맞춘다.

**원칙:** 이미지 상단 / 텍스트 하단은 창현님 포트폴리오의 조판 기본형이며, 세로 화면에서는 예외 없이 적용된다.

---

**대상 파일 (2개):**
- `src/hooks/useRingWall.ts` — **`containerWidth` 노출만.** 물리 일절 불변.
- `src/components/MobileProjectWall.tsx`

---

## 1. useRingWall.ts 수정 — containerWidth 노출

**이것이 이 파일에 가하는 유일한 변경이다.** 물리 상수, 모드 판정식, 슬롯 배치 수학, 블록 클램프, 입력 계층은 **일절 건드리지 않는다.**

### 1-1. API 인터페이스에 필드 추가

```ts
export interface RingWallApi {
  containerRef: RefObject<HTMLDivElement | null>
  offset: number
  heights: number[]
  slots: RingSlot[]
  isLoop: boolean
  containerWidth: number                     // ← 신설. 렌더러의 폭 파생용 (물리 무관)
  moveTo: (index: number) => void
  jumpTo: (index: number) => void
  isSettled: boolean
}
```

### 1-2. 상태 추가

기존 `const [containerHeight, setContainerHeight] = useState(0)` 아래에 추가한다.

```ts
const [containerWidth, setContainerWidth] = useState(0)
```

**`containerWidthRef` 미러는 만들지 않는다.** 입력 핸들러(비-리액트 클로저)가 폭을 참조하지 않으므로 불필요하다.

### 1-3. ResizeObserver 콜백에 한 줄 추가

기존 코드:
```ts
const ro = new ResizeObserver(() => {
  containerHeightRef.current = el.clientHeight
  setContainerHeight(el.clientHeight)
})
ro.observe(el)
containerHeightRef.current = el.clientHeight
setContainerHeight(el.clientHeight)
```

변경 후:
```ts
const ro = new ResizeObserver(() => {
  containerHeightRef.current = el.clientHeight
  setContainerHeight(el.clientHeight)
  setContainerWidth(el.clientWidth)          // ← 추가
})
ro.observe(el)
containerHeightRef.current = el.clientHeight
setContainerHeight(el.clientHeight)
setContainerWidth(el.clientWidth)            // ← 추가
```

### 1-4. 반환문에 추가

```ts
return { containerRef, offset, heights, slots, isLoop, containerWidth, moveTo, jumpTo, isSettled: settled }
```

**데스크톱 `ProjectWall.tsx`는 수정하지 않는다.** 반환 객체에 필드가 추가될 뿐이며, 소비하지 않으면 거동 변화가 없다.

**`slots` useMemo의 의존 배열에 `containerWidth`를 추가하지 않는다.** 슬롯 배치는 폭과 무관하다. 추가하면 불필요한 재계산이 발생한다.

---

## 2. MobileProjectWall.tsx — 티어 기하 파생화

### 2-1. 상수 교체

기존 상수부를 다음과 같이 교체한다.

**제거 대상:**
```ts
const TIERS = { 0: { w: 288, h: 192 }, 1: { w: 201, h: 134 }, 2: { w: 114, h: 76 } } as const
const TOP_TEXT_H = 24
const SLOT_H = { 0: TIERS[0].h + TOP_TEXT_H, 1: TIERS[1].h, 2: TIERS[2].h } as const
const PAIR_TEXT_W = 130
const PAIR_GAP = 8
const MIN_SLOT = 76
```

**신설:**
```ts
// ── 링 티어 기하 — 폭의 연속 함수로 파생. 브레이크포인트 없음 ──
// 티어0 = 히어로 폭 × 92%, 단 절대 상한 400px (태블릿 세로 과대화 방지)
const HERO_INSET = 32          // 트랙 히어로의 좌우 인셋 — HERO_W = 100vw - 32px와 일치
const TIER0_RATIO = 0.92       // 히어로 대비 티어0 폭
const TIER0_MAX = 400          // 절대 상한 (px)
const TIER0_MIN = 240          // 절대 하한 — 초소형 뷰포트 안전판
// 티어1·2는 티어0에 대한 고정 비율 (현행 201/288, 114/288 승계)
const TIER1_RATIO = 0.698
const TIER2_RATIO = 0.396
const TIER_ASPECT = 3 / 2      // 전 티어 3:2 유지
const BELOW_TEXT_H = 40        // 이미지 하단 텍스트 행 (프로젝트명 + 용도 상하 배열)
const GAP = 14                 // ITEM_GAP 승계
const OPACITY = { 0: 1, 1: 0.45, 2: 0.3 } as const

// 티어 폭 파생 — 컨테이너 폭(px)이 유일한 입력. 순수 함수
const tierWidths = (cw: number) => {
  const hero = Math.max(cw - HERO_INSET, 0)
  const w0 = Math.min(Math.max(hero * TIER0_RATIO, TIER0_MIN), TIER0_MAX)
  return [w0, w0 * TIER1_RATIO, w0 * TIER2_RATIO] as const
}
// 슬롯 높이 = 이미지 높이(폭/1.5) + 텍스트 행. 전 티어 텍스트 하단 배치이므로 일괄 가산
const tierSlotHeights = (cw: number) => {
  const [w0, w1, w2] = tierWidths(cw)
  return [
    w0 / TIER_ASPECT + BELOW_TEXT_H,
    w1 / TIER_ASPECT + BELOW_TEXT_H,
    w2 / TIER_ASPECT + BELOW_TEXT_H,
  ] as const
}
```

**`TIER0_MIN = 240` 근거:** 이론상 도달하지 않으나(가장 작은 실사용 폭 320px → 92% 적용 시 265px), 폭 관찰 이전 프레임(`containerWidth === 0`)에서 0 나눗셈이나 음수 높이가 발생하지 않도록 하는 안전판이다.

**`BELOW_TEXT_H = 40` 산출 근거:**
- paddingTop 6
- 프로젝트명: 13px × 1.3 = 16.9 → 17
- marginTop 2
- 용도: 9px × 1.35 = 12.2 → 13
- 합계: 6 + 17 + 2 + 13 = 38, 여유 2 → **40**

(데스크톱 D2의 44px와 다른 이유: 모바일 용도 폰트가 9px로 더 작다. 현행 값 승계.)

### 2-2. minSlotHeight 파생

`useRingWall`의 `minSlotHeight` 옵션은 **런타임 값**이 되어야 한다. 티어2 슬롯 높이가 폭에 의존하기 때문이다.

```ts
const ring = useRingWall({
  count: N,
  getSlotHeight,
  gap: GAP,
  minSlotHeight: minSlot,   // 폭 파생 — 아래 참조
})
```

**순환 의존 문제:** `minSlot`은 `ring.containerWidth`에서 파생되는데, `ring`은 `minSlot`을 인자로 받는다.

**해법 — 1프레임 지연 수용:**

```ts
// 컨테이너 폭 — 훅이 관찰. 첫 프레임은 0이며, ResizeObserver가 즉시 실측값을 커밋한다
const [cw, setCw] = useState(0)
const cwRef = useRef(0)
cwRef.current = cw

// 티어 슬롯 높이 — cw 파생. cw=0이면 하한(TIER0_MIN)이 적용되어 유효한 값이 나온다
const slotHs = useMemo(() => tierSlotHeights(cw), [cw])
const minSlot = slotHs[2]

const getSlotHeight = useCallback((i: number) => {
  const c = centerIdxRef.current
  const d = isLoopRef.current ? circDist(i, c, N) : Math.abs(i - c)
  return slotHs[Math.min(d, 2)]
}, [N, centerTick, slotHs])

const ring = useRingWall({ count: N, getSlotHeight, gap: GAP, minSlotHeight: minSlot })
isLoopRef.current = ring.isLoop
const { moveTo, jumpTo } = ring

// 훅이 관찰한 폭을 상태로 승격 — 다음 렌더에서 티어가 재파생된다
useEffect(() => {
  if (ring.containerWidth !== cwRef.current) setCw(ring.containerWidth)
}, [ring.containerWidth])
```

**거동:** 마운트 첫 프레임은 `cw=0` → 티어0=240px(하한). `ResizeObserver`가 즉시 발화 → `cw` 갱신 → 티어 재파생 → `getSlotHeight` 재생성 → 훅의 기존 `useEffect(() => wake(), [getSlotHeight, ...])`가 웨이크 → 높이 수렴 루프가 `HEIGHT_TAU`(0.12s)로 부드럽게 보간한다.

**이 1프레임 지연은 시각적으로 감지되지 않는다.** 인트로(`revealed=false`) 구간이 이를 완전히 가린다. 별도 보정 코드를 넣지 않는다.

**리사이즈(회전) 시:** `ResizeObserver` → `cw` 갱신 → 티어 재파생 → 높이 수렴. 자동으로 처리되며 추가 코드가 필요 없다.

### 2-3. 렌더 시 티어 폭 파생

카드 렌더 루프 내부에서 현재 티어 폭을 계산한다.

```ts
const tws = useMemo(() => tierWidths(cw), [cw])
```

각 카드에서:
```ts
const tierIdx = Math.min(d, 2) as 0 | 1 | 2
const thumbW = tws[tierIdx]
const thumbH = thumbW / TIER_ASPECT
const tierOpacity = OPACITY[tierIdx]
```

**주의:** 기존 코드는 `textRowH`(d=0 전용 상단 텍스트 행 높이)를 연속 보간하고 있었다. 텍스트가 전 티어 하단 배치로 통일되므로 **이 보간 로직은 제거한다.** 텍스트 행 높이는 전 티어에서 `BELOW_TEXT_H` 상수로 동일하다.

**슬롯 높이와 렌더 높이의 정합:** `ring.heights[index]`는 물리 루프가 보간 중인 **실측 높이**이며, 위에서 계산한 `thumbH + BELOW_TEXT_H`와 수렴 중에는 다를 수 있다. 이미지 높이는 **`ring.heights[index] - BELOW_TEXT_H`를 사용**해야 카드 외피 높이와 어긋나지 않는다.

```ts
const h = ring.heights[index] ?? slotHs[2]      // 물리 루프가 보간 중인 슬롯 높이
const thumbH = Math.max(h - BELOW_TEXT_H, 0)    // 이미지 높이 — 슬롯에서 텍스트 행 차감
const thumbW = thumbH * TIER_ASPECT             // 폭은 3:2에서 파생 (측정 없음)
```

**이것이 정답이다.** `tierWidths(cw)`는 **목표값** 산출에만 쓰이고(`getSlotHeight` 경유), 실제 렌더 치수는 **물리 루프가 공급하는 `heights` 배열에서 파생**한다. 이로써 티어 전환(호버·셔플) 시 폭과 높이가 함께 부드럽게 보간된다.

따라서 §2-3 첫머리의 `tws` useMemo는 **불필요하며 만들지 않는다.** `tierWidths` 함수는 `tierSlotHeights` 내부에서만 소비된다.

---

## 3. MobileProjectWall.tsx — 카드 텍스트 하단 상하배열

### 3-1. 현행 구조 (제거 대상)

```
[상단 텍스트 행 (d=0 전용, 프로젝트명 ← → 용도 좌우 병기)]
[썸네일]
  └ [측면 텍스트 (d≥1, 썸네일 좌측 바깥, 우정렬)]   ← position: absolute
```

- 상단 행과 측면 텍스트가 `opacity` 크로스페이드(150ms)로 교대
- `topTitleEls` ref — FLIP 타이틀 모프의 시작점 캡처용

### 3-2. 신규 구조

```
[썸네일]
[텍스트 행 (전 티어 공통)]
  ├ 프로젝트명 (13px, w400)
  └ 용도       (9px, w300, uppercase, opacity 0.45)
```

- **좌우 병기 폐지 → 상하 배열**
- **d=0 전용 폐지 → 전 티어 표시**
- **측면 텍스트 폐지** — `PAIR_TEXT_W`, `PAIR_GAP` 상수 제거
- **크로스페이드 폐지** — 티어별 표시 차이는 `tierOpacity`(전체 카드)가 이미 담당한다

### 3-3. 렌더 코드

티어 불투명도 계층 내부를 다음으로 교체한다.

```tsx
{/* 티어 불투명도 계층 — 이산 d 기준 */}
<div style={{
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  opacity: tierOpacity,
  transition: 'opacity 300ms ease',
}}>
  {/* 썸네일 — 전 구간 3:2, 커버 부재 시 단색 폴백 */}
  <div
    ref={el => { thumbEls.current[p.id] = el }}
    style={{
      width: thumbW,
      height: thumbH,
      opacity: morphSlug === p.id ? 0 : 1,
    }}
  >
    {p.coverImage ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={sanityCard(p.coverImage, 480, p.coverHotspot)}
        alt={p.title}
        loading="lazy"
        draggable={false}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    ) : (
      <div style={{ width: '100%', height: '100%', background: p.coverColor }} />
    )}
  </div>

  {/* 텍스트 행 — 전 티어 공통. 썸네일 하단, 폭 일치, 좌측 정렬 */}
  <div style={{
    width: thumbW,
    height: BELOW_TEXT_H,
    paddingTop: 6,
    boxSizing: 'border-box',
    overflow: 'hidden',
    textAlign: 'left',
  }}>
    {/* 프로젝트명 — 1줄 ellipsis (텍스트 행 높이 고정 보장) */}
    <div
      ref={el => { topTitleEls.current[p.id] = el }}
      style={{
        fontSize: 13,
        fontWeight: 400,
        lineHeight: 1.3,
        color: '#080706',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        visibility: titleMorphing ? 'hidden' : 'visible',
      }}
    >
      {p.title}
    </div>
    {/* 용도 — 1줄 ellipsis */}
    <div style={{
      marginTop: 2,
      fontSize: 9,
      fontWeight: 300,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: '#080706',
      opacity: 0.45,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }}>
      {p.type}
    </div>
  </div>
</div>
```

**`position: relative`를 썸네일 div에서 제거한다.** 측면 텍스트(absolute 자식)가 사라졌으므로 불필요하다.

**`topTitleEls` ref는 유지한다.** FLIP 타이틀 모프(§6-2)의 시작점 캡처에 여전히 쓰인다. 위치만 상단→하단으로 바뀔 뿐이다.

### 3-4. FLIP 타이틀 모프 영향

기존 모프는 **d=0 카드의 상단 텍스트 → 열람 레이어 타이틀**로 보간한다.
텍스트가 하단으로 이동하면 **시작 좌표만 바뀐다.** `getBoundingClientRect()`로 실측하는 구조이므로 **코드 수정이 불필요하다.**

단, 시각적으로 검토할 점이 있다: 썸네일 하단 텍스트가 열람 레이어 상단 타이틀로 **위로 이동**하게 된다(기존은 썸네일 상단 → 열람 상단, 거의 수직 이동 없음). 이동 거리가 늘어나 모프가 더 극적으로 보인다.

**이는 의도된 개선으로 수용한다.** 별도 보정을 넣지 않는다. 실기기 확인 후 과하다고 판단되면 후속 명세에서 조정한다.

### 3-5. 카드 정렬

현행 `alignItems: 'center'` (카드 내 수평 중앙 정렬)를 **유지한다.**
썸네일과 텍스트 행이 동일 폭(`thumbW`)이므로, 두 요소는 자동으로 좌측 모서리가 정렬된다.

---

## 4. 검증 항목

1. **티어0 비율:** iPhone 15(390px) 기준 티어0 폭 ≈ 330px (히어로 358px의 92%). 개발자 도구 측정.
2. **상한 클램프:** 뷰포트 폭 767px에서 티어0 폭 = 400px (상한 고정). 92% 미적용 확인.
3. **경계 연속성:** 폭을 320px → 767px로 연속 리사이즈 시 티어 폭이 점프 없이 증가하다가 400px에서 정지.
4. **텍스트 배치:** 전 티어(d=0/1/2) 카드에서 텍스트가 썸네일 **하단**에 위치, 프로젝트명(위)/용도(아래) 상하 배열, 좌측 정렬, 썸네일과 좌측 모서리 정렬.
5. **티어 전환:** 셔플로 티어가 바뀔 때 썸네일 폭·높이가 함께 부드럽게 보간(0.12s). 폭만 점프하는 현상 없음.
6. **탭 모프:** 카드 탭 시 FLIP 모프가 썸네일 → 히어로로 정상 확대. 티어0이 커졌으므로 확대폭이 줄어 더 자연스러워야 한다.
7. **타이틀 모프:** d=0 카드 탭 시 하단 텍스트 → 열람 타이틀 보간 정상.
8. **BACK 복귀:** 열람 → 링 복귀 모프 정상.
9. **필터:** exit/enter 캐스케이드 정상. 필터 변경 후 티어 폭 유지.
10. **유한 스택:** 프로젝트 1~3개 필터에서 블록 클램프 정상, 카드 잘림 없음.
11. **회전:** 세로 ↔ 가로 회전 시 티어 폭이 재파생되어 부드럽게 수렴.
12. **긴 제목:** 1줄 ellipsis 처리, 카드 높이 불변.
13. **커버 부재:** `coverColor` 단색 폴백 정상.
14. **데스크톱 회귀:** 1440px 이상 / 768~1439px 모두 명세 ① 결과와 동일. `useRingWall` 변경이 데스크톱에 영향을 주지 않았음을 확인.

---

## 5. 금지 사항 (Forbidden Changes)

1. **`useRingWall.ts`에서 §1에 명시된 4개 지점 외 일체 수정 금지.**
   - 물리 상수(`LOOP_BUFFER`, `VELOCITY_*`, `HEIGHT_*`, `WHEEL_GAIN`, `TAP_THRESHOLD`, `FLICK_SAMPLES`, `MAX_DT`) 불변
   - 모드 판정식 `isLoop = count * (minSlotHeight + gap) >= containerHeight + LOOP_BUFFER` 불변
   - 슬롯 배치 수학(중앙 대칭 누적, `spacing`, `y` 체인) 불변
   - 유한 스택 블록 클램프(§3-C, `delta` 파생) 불변
   - 입력 계층(휠·포인터·click 캡처, `finiteOverflow`) 불변
   - `mod` / `signedCircDelta` / `circDist` 순수 함수 불변
   - `moveTo` / `jumpTo` 시그니처·구현 불변
   - **`slots` useMemo 의존 배열에 `containerWidth` 추가 금지**
2. **`src/components/ProjectWall.tsx` — 파일 전체 수정 금지.** 명세 ① 결과가 확정 상태다.
3. **`src/components/LandingExperience.tsx` — 파일 전체 수정 금지.** 768px 모바일 경계 불변.
4. **`src/components/ContentArea.tsx` — 파일 전체 수정 금지.**
5. **`src/app/globals.css` — 파일 전체 수정 금지.**
6. **`src/lib/imageUrl.ts`, `src/lib/shuffle.ts` — 파일 전체 수정 금지.**
7. **열람 레이어(`ExpandedBlock`) 수정 금지.** 트랙 구조, 히어로, 정보 슬라이드, 캡션, 카운터 일체 불변. 세로 스택 전환은 **명세 ③의 범위**다.
8. **FLIP 모프 로직(§6-2) 수정 금지.** `morph` / `morphGo` / `MorphState` / 오버레이 렌더 일체 불변. 시작 좌표는 `getBoundingClientRect`가 자동 반영한다.
9. **셔플 큐(§4) 수정 금지.** `SHUFFLE_INTERVAL_MS`, `SHUFFLE_RESUME_MS`, `advanceShuffle`, 타이머 폴링 불변.
10. **필터 패널(§7) 수정 금지.**
11. **티어 종횡비 3:2 불변.** `TIER_ASPECT = 3 / 2` 유지.
12. **`GAP = 14` 불변.**
13. **`OPACITY = { 0: 1, 1: 0.45, 2: 0.3 }` 불변.**
14. **측정 반응형 도입 금지.** `getBoundingClientRect` / `offsetWidth`로 티어 폭이나 텍스트 폭을 측정하지 않는다. 유일한 측정은 `useRingWall`의 기존 `ResizeObserver`(컨테이너 폭·높이)뿐이며, 그로부터 모든 치수를 결정적으로 파생한다. (FLIP 모프의 rect 캡처는 예외 — 기존 로직이며 §8에 의해 불변)
15. **브레이크포인트 신설 금지.** 티어 폭은 폭의 연속 함수다. `matchMedia`나 `window.innerWidth < X` 분기를 만들지 않는다.
16. **`npm run dev` / `npm run build` 실행 금지.** 검증은 `npx tsc --noEmit`만 사용한다.

---

## 6. 완료 조건

- `npx tsc --noEmit` 무오류
- `useRingWall.ts`, `MobileProjectWall.tsx` 외 파일 변경 없음
- `useRingWall.ts` 변경이 §1의 4개 지점(인터페이스 1행, 상태 1행, ResizeObserver 2행, 반환문 1행)에 국한
- §4 검증 항목 전항 통과

---

## 7. Claude Code 실행 프롬프트

```
MOBILE_TIER_SCALE_SPEC.md 파일을 읽고 명세대로 구현해줘.

수정 대상은 src/hooks/useRingWall.ts와 src/components/MobileProjectWall.tsx 두 파일뿐이다.

useRingWall.ts는 §1에 명시된 4개 지점(API 인터페이스에 containerWidth 필드 추가,
containerWidth 상태 추가, ResizeObserver 콜백에 setContainerWidth 2행 추가, 반환문에 추가)만
수정한다. 물리 상수·모드 판정식·슬롯 배치 수학·블록 클램프·입력 계층은 절대 건드리지 마라.

§5 금지 사항을 반드시 준수할 것. 특히 ExpandedBlock(열람 레이어)과 FLIP 모프 로직은
명세 ③의 범위이므로 이번에 수정하지 마라.

구현 후 npx tsc --noEmit로 검증하고, npm run dev나 npm run build는 실행하지 마라.
```
