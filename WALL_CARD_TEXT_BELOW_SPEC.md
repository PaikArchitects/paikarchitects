# WALL_CARD_TEXT_BELOW_SPEC — 데스크톱 월 카드 텍스트 하단 배치 (2026-07-13)

## 0. 배경 및 목표

**원칙:** 가로 화면은 가로답게, 세로 화면은 세로답게.

- **D1 (≥1440px):** 가로폭 여유 있음 → 좌→우 읽기 흐름 활용. 텍스트를 썸네일 **좌측**에 우정렬 배치. **현행 유지, 변경 없음.**
- **D2 (768~1439px):** 가로폭 부족 → 텍스트를 썸네일 **하단**으로 이동, 프로젝트명/용도를 **상하 배열**. 이로써 Project Wall 폭을 늘리지 않고도 가독성을 확보한다.

**핵심 제약:** Project Wall의 폭(`clamp(300px, 28vw, 28vw)`)은 **절대 늘리지 않는다.** 우측 ContentArea의 가로 여유가 이 사이트의 존재 이유이므로, 좌측 확장은 금지다.

**대상 파일 (2개):**
- `src/components/ProjectWall.tsx`
- `src/app/globals.css`

`useRingWall.ts`는 **수정하지 않는다.** 카드 높이는 이미 `getSlotHeight` 콜백으로 렌더러가 주입하는 구조이므로, 물리 코어는 무관하다.

---

## 1. 현행 구조 (변경 전)

`WallCard` 내피는 `display: flex` (가로) 이며 자식이 2개다.

```
[wall-card-text (우정렬)] [wall-card-img (aspectRatio 2/1)]
```

- `justifyContent: 'flex-end'` — 우측 정렬
- `.wall-card-text`: width 180px (D1) / 150px (≤1439)
- `.wall-card-img`: max-width calc(100% - 188px) / calc(100% - 158px)
- 카드 높이 = `TIER_HEIGHTS = { 0: 150, 1: 120, 2: 96 }`
- 썸네일 높이 = 카드 높이 100%

---

## 2. 변경 사항

### 2-1. 티어 높이 상수 분리

D2에서는 텍스트가 이미지 하단으로 내려가므로 **카드 높이 = 이미지 높이 + 텍스트 행 높이**가 된다.
이미지 높이는 D1과 동일하게 유지하고, 텍스트 행 높이만 가산한다.

`ProjectWall.tsx` 상단 상수부를 다음과 같이 교체한다.

```ts
// 티어 중심과의 거리(d) 기반 3단 이미지 높이 — D1/D2 공통
const TIER_IMG_HEIGHTS: Record<0 | 1 | 2, number> = { 0: 150, 1: 120, 2: 96 }
// D2 전용 — 이미지 하단 텍스트 행 (프로젝트명 + 용도 상하 배열)
const BELOW_TEXT_H = 44
const GAP = 16
// D1/D2 경계 — globals.css의 1439px 미디어쿼리와 반드시 동일
const D2_MAX_WIDTH = 1439
```

기존 `TIER_HEIGHTS` 상수는 **제거**한다.

### 2-2. 레이아웃 모드 판정

`ProjectWall` 컴포넌트 내부에 뷰포트 폭 기반 모드 상태를 신설한다.
`LandingExperience`는 수정하지 않는다 (768 경계 로직 불변).

```ts
// D2 판정 — 텍스트 하단 배치 모드. matchMedia로 globals.css와 경계 동기
const [below, setBelow] = useState(false)
useEffect(() => {
  const mq = window.matchMedia(`(max-width: ${D2_MAX_WIDTH}px)`)
  const fn = () => setBelow(mq.matches)
  fn()
  mq.addEventListener('change', fn)
  return () => mq.removeEventListener('change', fn)
}, [])
```

**SSR 안전:** 초기값 `false`(D1) 고정. `useEffect`는 마운트 후에만 실행되므로 hydration 불일치가 발생하지 않는다. `Math.random`이나 `window` 참조를 초기 렌더에 절대 사용하지 않는 기존 원칙과 동일하다.

### 2-3. getSlotHeight 수정

슬롯 높이는 이미지 높이에 `below`일 때만 텍스트 행을 가산한다.

```ts
const getSlotHeight = useCallback((i: number) => {
  const extra = belowRef.current ? BELOW_TEXT_H : 0
  if (tierCenterIdx < 0) return TIER_IMG_HEIGHTS[2] + extra
  const d = isLoopRef.current ? circDist(i, tierCenterIdx, N) : Math.abs(i - tierCenterIdx)
  return TIER_IMG_HEIGHTS[Math.min(d, 2) as 0 | 1 | 2] + extra
}, [tierCenterIdx, N, belowTick])
```

`belowRef`는 `below` 상태의 ref 미러이며, `belowTick`은 `below` 변경 시 `getSlotHeight`를 재생성해 훅을 웨이크시키기 위한 카운터다. `useRingWall`의 기존 `useEffect(() => wake(), [getSlotHeight, isLoop, wake])`가 이를 받아 높이 수렴 루프를 자동 기동한다.

```ts
const belowRef = useRef(false)
belowRef.current = below
const [belowTick, setBelowTick] = useState(0)
useEffect(() => { setBelowTick(t => t + 1) }, [below])
```

**모드 전환 시 거동:** 폭 리사이즈로 `below`가 토글되면 전 카드 높이가 `HEIGHT_TAU`(0.12s) 시상수로 부드럽게 수렴한다. 별도 애니메이션 코드 불필요.

**루프 판정 영향:** `useRingWall`의 `isLoop = count * (minSlotHeight + gap) >= containerHeight + LOOP_BUFFER`에서 `minSlotHeight`는 옵션 기본값 96을 그대로 쓴다. D2에서 실제 최소 슬롯은 96+44=140이므로, 루프 판정이 **보수적**(실제보다 루프 성립을 늦게 판정)이 된다. 이는 안전한 방향이며 — 유한 스택 모드는 블록 클램프로 어떤 N에서도 정상 동작하므로 — **`minSlotHeight` 옵션을 전달하지 않는다.**

### 2-4. WallCard 렌더 구조

`WallCard`에 `below: boolean` prop을 추가하고, `imgHeight`를 별도로 전달한다.

```ts
interface WallCardProps {
  project: Project
  slot: number
  yCenter: number
  height: number        // 슬롯 전체 높이 (이미지 + below 시 텍스트 행)
  imgHeight: number     // 이미지 영역 높이 — height - (below ? BELOW_TEXT_H : 0)
  below: boolean
  isHighlighted: boolean
  isDimmed: boolean
  revealed: boolean
  exiting: boolean
  onHover: (project: Project | null) => void
  onSelect: (project: Project) => void
}
```

**외피(위치 계층)는 변경하지 않는다.** `transform: translateY(yCenter - height/2)`, `height` 그대로.

**내피(현출 계층)** 의 `flexDirection`을 모드에 따라 분기한다.

```tsx
<div
  onPointerEnter={...}   // 기존 그대로
  onPointerLeave={...}
  onClick={() => onSelect(project)}
  style={{
    display: 'flex',
    height: '100%',
    // D1: 가로 [텍스트][이미지], 우측 정렬 / D2: 세로 [이미지][텍스트]
    flexDirection: below ? 'column' : 'row',
    justifyContent: below ? 'flex-start' : 'flex-end',
    alignItems: below ? 'flex-end' : 'stretch',
    cursor: 'pointer',
    boxSizing: 'border-box',
    opacity: exiting ? 0 : revealed ? 1 : 0,
    transform: ...,      // 기존 그대로
    transition: ...,     // 기존 그대로
  }}
>
```

`alignItems: 'flex-end'` (D2) — 이미지와 텍스트 블록이 카드 **우측 모서리에 flush** 정렬된다. Project Wall이 우측 ContentArea와 맞닿는 구조이므로, 우측 기준 정렬이 시각 축을 유지한다.

**자식 순서를 모드에 따라 바꾼다.** DOM 순서 자체를 조건 분기한다.

```tsx
{below ? (
  <>
    <WallCardImage project={project} height={imgHeight} opacity={opacity} below />
    <WallCardText project={project} opacity={opacity} below />
  </>
) : (
  <>
    <WallCardText project={project} opacity={opacity} below={false} />
    <WallCardImage project={project} height="100%" opacity={opacity} below={false} />
  </>
)}
```

### 2-5. WallCardImage — 신설 서브컴포넌트

기존 `.wall-card-img` div를 분리한다.

```tsx
function WallCardImage({ project, height, opacity, below }: {
  project: Project
  height: number | string
  opacity: number
  below: boolean
}) {
  return (
    <div
      className={below ? undefined : 'wall-card-img'}
      style={{
        height,
        aspectRatio: '2 / 1',
        flexShrink: below ? 0 : 1,
        minWidth: 0,
        overflow: 'hidden',
        opacity,
        transition: 'opacity 0.3s ease',
      }}
    >
      {project.coverImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={sanityThumb(project.coverImage, 480)}
          alt={project.title}
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', background: project.coverColor }} />
      )}
    </div>
  )
}
```

**D2에서 `.wall-card-img` 클래스를 붙이지 않는다.** 해당 클래스의 `max-width: calc(100% - 158px)`는 좌측 텍스트 블록 공간을 확보하기 위한 것인데, D2에는 좌측 텍스트가 없으므로 불필요하다. 대신 `aspectRatio: 2/1` + `height: imgHeight`가 폭을 결정한다.

**썸네일 종횡비 2:1은 D1/D2 공통 유지.** 변경하지 않는다.

### 2-6. WallCardText — 신설 서브컴포넌트

```tsx
function WallCardText({ project, opacity, below, width }: {
  project: Project
  opacity: number
  below: boolean
  width?: number   // D2 — 이미지 폭과 동일하게 맞춤
}) {
  return (
    <div
      className={below ? undefined : 'wall-card-text'}
      style={{
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: below ? 'flex-start' : 'flex-end',
        textAlign: below ? 'left' : 'right',
        width: below ? width : undefined,
        height: below ? BELOW_TEXT_H : undefined,
        paddingTop: below ? 6 : 2,
        paddingLeft: below ? 0 : 20,
        paddingRight: below ? 0 : 8,
        boxSizing: 'border-box',
        opacity,
        transition: 'opacity 0.3s ease',
        overflow: 'hidden',
      }}
    >
      {/* 프로젝트명 — D2는 1줄 ellipsis (텍스트 행 높이 고정 보장) */}
      <div style={{
        fontFamily: FONT,
        fontSize: 13,
        fontWeight: 450,
        color: '#080706',
        lineHeight: 1.3,
        wordBreak: 'keep-all' as const,
        width: '100%',
        ...(below ? {
          whiteSpace: 'nowrap' as const,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        } : {}),
      }}>
        {project.title}
      </div>
      {/* 용도 — D2는 1줄 클램프 (D1은 기존 2줄 유지) */}
      <div style={{
        fontFamily: FONT,
        fontSize: 11,
        fontWeight: 300,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: '#080706',
        opacity: 0.6,
        marginTop: below ? 2 : 4,
        lineHeight: 1.35,
        wordBreak: 'keep-all' as const,
        width: '100%',
        display: '-webkit-box',
        WebkitBoxOrient: 'vertical' as const,
        WebkitLineClamp: below ? 1 : 2,
        overflow: 'hidden',
      }}>
        {project.type}
      </div>
    </div>
  )
}
```

**D2 텍스트 행 높이 산출 근거 (BELOW_TEXT_H = 44):**
- paddingTop 6
- 프로젝트명: 13px × 1.3 = 16.9 → 17
- marginTop 2
- 용도: 11px × 1.35 = 14.85 → 15
- 합계: 6 + 17 + 2 + 15 = **40**, 여유 4 → **44**

**D2 프로젝트명 1줄 강제 이유:** 텍스트 행 높이가 고정(44px)이므로, 2줄 허용 시 오버플로가 발생한다. 슬롯 높이는 물리 루프가 파생하므로 텍스트 높이 가변은 허용되지 않는다. 긴 제목은 ellipsis 처리한다.

### 2-7. 텍스트 블록 폭 = 이미지 폭

D2에서 텍스트가 이미지 좌측 모서리와 정렬되려면 폭이 같아야 한다.
이미지 폭은 `imgHeight × 2` (aspectRatio 2/1)이므로 **계산으로 파생 가능하다.** 측정 불필요.

`WallCard` 내부에서:

```ts
const imgHeight = below ? height - BELOW_TEXT_H : height
const textWidth = below ? imgHeight * 2 : undefined
```

**측정 반응형(measurement-reactive) 금지 원칙 준수.** `getBoundingClientRect`, `ResizeObserver`, `offsetWidth` 등을 사용하지 않는다. 폭은 높이로부터의 결정적 파생이다.

**폭 상한 처리:** 티어 0의 이미지 폭은 150×2 = 300px. Project Wall 폭은 최소 300px(`clamp(300px, 28vw, 28vw)`)이므로 정확히 맞닿는다. 넘치지 않는다.

단, 28vw가 300px을 초과하는 구간(1072~1439px)에서는 Wall 폭이 300px보다 크므로 여유가 생긴다. 이미지는 우측 flush이므로 좌측에 여백이 남는다 — **의도된 결과이며 보정하지 않는다.**

### 2-8. ProjectWall 렌더부 수정

```tsx
{ring.slots.map(({ slot, index, turn, yCenter }) => {
  const project = order[index]
  if (!project) return null
  const h = ring.heights[index] ?? (TIER_IMG_HEIGHTS[2] + (below ? BELOW_TEXT_H : 0))
  return (
    <WallCard
      key={`${project.id}#${turn}`}
      project={project}
      slot={slot}
      yCenter={yCenter}
      height={h}
      imgHeight={below ? h - BELOW_TEXT_H : h}
      below={below}
      isHighlighted={project.id === effectiveHighlight}
      isDimmed={activeSlug !== null && project.id !== activeSlug}
      revealed={revealed && phase === 'idle'}
      exiting={phase === 'exit'}
      onHover={handleHover}
      onSelect={onSelect}
    />
  )
})}
```

### 2-9. 고아 className 제거

`ProjectWall` 루트 div의 `className="project-wall-scroll light-panel"`에서 **`project-wall-scroll`을 제거**한다.

```tsx
className="light-panel"
```

**근거:** `globals.css`에 `.project-wall-scroll` 정의가 존재하지 않는다. 네이티브 스크롤 폐기 시점에 CSS는 제거되었으나 className만 잔존한 것이다. (`light-panel`은 다른 파일에 정의되어 있을 수 있으므로 **유지한다.**)

### 2-10. globals.css 수정

D2에서 `.wall-card-text` / `.wall-card-img` 클래스가 붙지 않으므로, **1439px 미디어쿼리의 두 규칙은 사문화된다.** 제거한다.

```css
/* ── PROJECT WALL CARD — D1(≥1440) 전용. D2 이하는 인라인 세로 배치 (ProjectWall.tsx) ── */
.wall-card-text {
  width: 180px;
}

.wall-card-img {
  max-width: calc(100% - 188px);
}
```

**삭제 대상 (globals.css 상단):**

```css
@media (max-width: 1439px) {
  .wall-card-text {
    width: 150px;
  }
  .wall-card-img {
    max-width: calc(100% - 158px);
  }
}
```

**`.slide-img`의 1439px 미디어쿼리는 유지한다.** ContentArea 소관이며 이번 명세 범위 밖이다.

---

## 3. 검증 항목

1. **1440px 이상:** 카드 텍스트가 이미지 좌측에 우정렬. 현행과 픽셀 동일해야 한다.
2. **1439px 이하:** 카드 텍스트가 이미지 하단으로 이동, 프로젝트명(위) / 용도(아래) 상하 배열, 좌측 정렬. 이미지와 텍스트가 우측 모서리에 flush.
3. **경계 리사이즈:** 1440 ↔ 1439를 오갈 때 카드 높이가 부드럽게 수렴(약 0.12s). 점프·깜빡임 없음.
4. **호버:** D2에서도 호버 시 티어 중심이 이동하고 카드 높이가 150+44=194로 확대되어야 한다.
5. **필터:** D2에서 필터 변경 시 exit/enter 캐스케이드가 정상 동작.
6. **유한 스택:** 프로젝트 1~3개만 남는 필터(예: Landscape)에서도 D2 블록 클램프 정상. 카드 잘림 없음.
7. **긴 제목:** D2에서 긴 프로젝트명이 1줄 ellipsis 처리되고 카드 높이가 변하지 않아야 한다.
8. **커버 부재:** `coverColor` 단색 폴백이 D2에서도 정상 표시.

---

## 4. 금지 사항 (Forbidden Changes)

다음은 **절대 수정하지 않는다.**

1. **`src/hooks/useRingWall.ts` — 파일 전체.** 물리 상수, 모드 판정식, 블록 클램프(§3-C), 슬롯 배치 수학, 입력 계층, 공개 API 시그니처 일체.
2. **`src/components/LandingExperience.tsx` — 파일 전체.** 768px 모바일 경계, 필터 바, 셔플 큐, URL/히스토리 동기화 일체.
3. **`src/components/ContentArea.tsx` — 파일 전체.**
4. **`src/components/MobileProjectWall.tsx` — 파일 전체.**
5. **`src/lib/imageUrl.ts`, `src/lib/shuffle.ts` — 파일 전체.**
6. **Project Wall 폭.** `clamp(300px, 28vw, 28vw)`를 **늘리지 않는다.** 이번 변경의 전제는 "폭을 늘리지 않고 가독성을 확보한다"이다.
7. **썸네일 종횡비.** `aspectRatio: 2 / 1` 유지.
8. **티어 이미지 높이.** `{0: 150, 1: 120, 2: 96}` 유지. D2에서 이미지 자체는 축소하지 않는다.
9. **`GAP = 16`** 유지.
10. **외피(위치 계층) div.** `position/top/left/right/height/transform` 구조와 "위치·높이에 CSS transition 없음" 원칙 유지. 모든 운동은 물리 루프가 공급한다.
11. **`key={`${project.id}#${turn}`}`** 패턴 유지.
12. **호버 게이트.** `e.pointerType !== 'mouse'` 조기 반환 유지 (stuck hover 방지).
13. **`globals.css`의 `.slide-img`, 워드마크, 내비게이션, 모바일 헤더/햄버거 관련 규칙 일체.**
14. **측정 반응형 도입 금지.** `getBoundingClientRect` / `ResizeObserver` / `offsetWidth` 등으로 텍스트나 이미지 폭을 측정하지 않는다. 모든 치수는 상수와 높이로부터의 결정적 파생이어야 한다.
15. **`npm run dev` / `npm run build` 실행 금지.** 검증은 `npx tsc --noEmit`만 사용한다.

---

## 5. 완료 조건

- `npx tsc --noEmit` 무오류
- `ProjectWall.tsx`, `globals.css` 외 파일 변경 없음
- §3 검증 항목 전항 통과

---

## 6. Claude Code 실행 프롬프트

```
WALL_CARD_TEXT_BELOW_SPEC.md 파일을 읽고 명세대로 구현해줘.

수정 대상은 src/components/ProjectWall.tsx와 src/app/globals.css 두 파일뿐이다.
§4 금지 사항을 반드시 준수할 것. 특히 useRingWall.ts, LandingExperience.tsx,
ContentArea.tsx, MobileProjectWall.tsx는 절대 수정하지 마라.

구현 후 npx tsc --noEmit로 검증하고, npm run dev나 npm run build는 실행하지 마라.
```
