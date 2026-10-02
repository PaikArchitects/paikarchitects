# AUDIT — 모바일 그리드 열 수 변경 시 썸네일 가장자리 1px 떨림 (261002)

> 읽기 전용 감사. 소스 파일 수정 없음. 이 문서 외 생성/변경 파일 없음.
> 행번호는 감사 시점(HEAD `86bc079`) 기준.

---

## 0. 대상 컴포넌트 확인

| 항목 | 결과 |
|---|---|
| 라우트 | `src/app/work-grid/page.tsx` → `<GridExperience projects={projects} />` (11행) |
| 썸네일 카드 렌더 | `src/components/GridExperience.tsx` — `.gm-card` (548–602행) |
| 모바일 전용 카드 분기 | **없음.** 모바일(<1024)도 동일한 `.gm-card` DOM·동일한 `paint()`를 쓴다 |
| `MobileGridContent.tsx` | 카드 클릭 후 상세 오버레이(733–734행)이며 그리드 썸네일과 무관 |
| `GridContentArea.tsx` | 데스크톱 상세 오버레이(morph). 그리드 썸네일과 무관 |
| `globals.css` | `.gm-*` / `.gx-*` 규칙 **없음**. `img`·`*` 전역 규칙·전역 transition 없음 |

모바일에서 달라지는 값은 아래뿐이다.

```tsx
// GridExperience.tsx:51
const MIN_COLS_MOBILE = 1       // 모바일(<1024) 하한 유지
// GridExperience.tsx:96-100
function maxColsForAspect(r: number): number {
  if (r < 0.85) return 5        // portrait — 260916: 3→5 (모바일 밀도 상한 상향, 좁은 카드는 텍스트 숨김 §5-4)
  if (r < 1.25) return 4        // ~square
  return 6                      // landscape
}
// GridExperience.tsx:170-180
const [isMobile, setIsMobile] = useState(false)
useLayoutEffect(() => {
  const mq = window.matchMedia('(max-width: 1023px)')
  ...
const minCols = isMobile ? MIN_COLS_MOBILE : MIN_COLS_DESKTOP
```

`UI_PAD`(34)·`GAP`(16)은 모바일/데스크톱 공통이다 (46–47행).

---

## a. 매 상태마다 지정되는 style 속성

### 카드(`.gm-card`) — `paint()` 내부 인라인 쓰기

```tsx
// GridExperience.tsx:269-275
el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`
el.style.width = `${wPx}px`
el.style.height = `${hPx}px`
el.style.opacity = `${dim ? DIM_OPACITY : 1}`
el.style.setProperty('--ts', `${titlePx(cardW)}px`)
el.style.setProperty('--ss', `${sumPx(cardW)}px`)
el.dataset.meta = showMeta ? '1' : '0'
```

| 속성 | 열 수에 따라 바뀌는가 | 근거 |
|---|---|---|
| `transform` (translate x,y) | **예** — `nr`(정수)로 row/col 재배정, `c`(분수)로 stride·originX·pitch 연속 변화 | 263–266행 |
| `width` | **예** — `cardW`는 분수 `c`의 연속 함수 | 242, 253행 |
| `height` | **예** — `cardH + mH`, 둘 다 `cardW` 함수 | 243, 247, 254행 |
| `opacity` | 아니오 (필터 dim만) | 272행 |
| `--ts`, `--ss` | **예** — `cardW` 연속 함수, 반올림 없음 | 273–274행 |
| `data-meta` | `nr` 기준 카드 폭이 80 미만이면 0 | 245–246, 275행 |
| `left`, `top` | 인라인 쓰기 없음. CSS에서 `top:0; left:0` 고정 (434–435행) | |

### 스테이지(`.gm-stage`)

```tsx
// GridExperience.tsx:278-281
if (gridRef.current) {
  // 말미 GAP은 pitch에 포함돼 있어 한 번 뺀다
  gridRef.current.style.height = `${Math.max(0, Math.round((maxRow + 1) * pitch - GAP))}px`
}
```

### 프레임(`.gm-frame`)·img — 인라인 지오메트리 없음

```tsx
// GridExperience.tsx:574-584
<div className="gm-frame" style={{ background: project.coverColor ?? COVER_FALLBACK }}>
  {project.coverImage && (
    <img
      src={gridThumb43(project.coverImage, 800, hotspot)}
      alt={project.title.en}
      loading="lazy"
      decoding="async"
    />
  )}
</div>
```

프레임 높이는 JS가 아니라 CSS `aspect-ratio: 4 / 3`이 카드의 (트랜지션 중인) 폭에서 산출한다.

### paint 호출 경로 (= 인라인 값이 다시 쓰이는 시점)

| 경로 | 위치 | 빈도 |
|---|---|---|
| `useLayoutEffect` (모든 렌더 후) | 285–288행 | 렌더마다 |
| 드래그 `onTrackDown` / `onTrackMove` | 383–398행 | **pointermove 이벤트마다** |
| 릴리스·아이콘 탭 `animateTo` → rAF `step` | 292–314행 | **TWEEN_MS(420ms) 동안 매 프레임** |
| 상한 변경 클램프 | 365–371행 | 리사이즈·회전 시 |

```tsx
// GridExperience.tsx:301-307 — JS 트윈: 매 프레임 분수 c로 paint
const step = (now: number) => {
  const p = Math.min(1, (now - start) / TWEEN_MS)
  const e = 1 - Math.pow(1 - p, 3)          // easeOutCubic
  const v = from + (target - from) * e
  colsRef.current = v
  paintRef.current(v)
```

---

## b. transition 선언 전부

### 카드 — `<style>` 블록(인라인 시트, GridExperience.tsx 내부)

```css
/* GridExperience.tsx:432-448 */
.gm-card {
  position: absolute;
  top: 0;
  left: 0;
  display: block;
  opacity: 0;
  ...
  will-change: transform, width, height, opacity;
  transition: transform ${TWEEN_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1),
              width ${TWEEN_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1),
              height ${TWEEN_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1),
              opacity ${FADE_MS}ms ease;
}
/* GridExperience.tsx:450-455 — 필터 재정렬 구간만 */
.gm-flow .gm-card {
  transition: transform ${FLOW_MS - 40}ms cubic-bezier(0.22, 0.61, 0.36, 1),
              width ${FLOW_MS - 40}ms cubic-bezier(0.22, 0.61, 0.36, 1),
              height ${FLOW_MS - 40}ms cubic-bezier(0.22, 0.61, 0.36, 1),
              opacity ${FADE_MS}ms ease;
}
```

상수: `TWEEN_MS = 420` (59행), `FLOW_MS = 560` (61행), `FADE_MS = 280` (62행).

| 대상 | duration | easing | 비고 |
|---|---|---|---|
| transform | 420ms (flow 시 520ms) | cubic-bezier(0.22, 0.61, 0.36, 1) | 상시 활성 |
| width | 420ms (flow 시 520ms) | 동일 | 상시 활성 |
| height | 420ms (flow 시 520ms) | 동일 | 상시 활성 |
| opacity | 280ms | ease | |

### 기타 그리드 내 transition

```css
/* GridExperience.tsx:468 */  .gm-meta { transition: opacity ${FADE_MS}ms ease; }
/* GridExperience.tsx:509 */  .gm-sum  { ... transition: opacity 200ms ease; }
```

- `.gm-frame`, `.gm-frame img`: transition **없음** (456–466행).
- 인라인 style의 transition: 밀도바 아이콘 막대 `transition: 'background 200ms ease'`(706행)뿐 — 카드와 무관.
- `globals.css`: 그리드 관련 transition **없음**.

### 주목할 구조 (사실)

- JS rAF 트윈(easeOutCubic 420ms)과 CSS transition(cubic-bezier 420ms)이 **동시에** 걸린다. rAF가 매 프레임 새 목표값을 인라인에 쓰므로, CSS transition은 매 프레임 "현재 보간값 → 새 목표값"으로 재시작된다.
- 드래그 중에도 transition은 꺼지지 않는다 (`onTrackDown`은 `setFlow(false)`만 하고 기본 transition은 유지, 386행).
- transform·width·height는 각각 독립 속성으로 보간된다.

---

## c. 좌표·크기 산출식과 반올림

```tsx
// GridExperience.tsx:224-254
const paint = useCallback((cols: number) => {
  const c = clamp(cols, minCols, maxCols)              // 연속(분수) 열 수 — 폭 보간용
  const nr = clamp(Math.round(c), minCols, maxCols)    // 격자·라벨용 정수 열 수
  ...
  const full = Math.max(1, vp.w - UI_PAD * 2)
  const heroW = Math.min(full, CARD_RATIO * vp.h * SLIDE_H_RATIO)   // 1열 = 히어로 폭 (§6)
  const cardW = c <= 1 ? heroW : Math.max(1, (full - GAP * (c - 1)) / c)
  const cardH = cardW / CARD_RATIO
  const cardWAtNr = nr <= 1 ? heroW : Math.max(1, (full - GAP * (nr - 1)) / nr)
  const showMeta = cardWAtNr >= META_MIN_W
  const mH = showMeta ? metaH(cardW) : 0
  const pitch = cardH + mH + GAP
  const stride = cardW + GAP                    // 셀 하나의 수평 간격
  const rowW = nr * cardW + (nr - 1) * GAP
  const originX = UI_PAD + (full - rowW) / 2
  const wPx = Math.round(cardW)                 // 정수화 → 전 카드 clientWidth 완전 동일
  const hPx = Math.round(cardH + mH)            // 프레임 + 메타 = 카드 실제 높이
```

```tsx
// GridExperience.tsx:263-269
const row = Math.floor(k / nr)
const col = k - row * nr
const x = originX + col * stride
const y = row * pitch
...
el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`
```

### 반올림 지점 정리

| 값 | 반올림 | 비고 |
|---|---|---|
| `cardW`, `cardH`, `stride`, `pitch`, `originX`, `rowW` | **없음** (분수) | |
| `x`, `y` | 최종 `Math.round` | 카드별 개별 반올림 |
| `wPx` | `Math.round(cardW)` | x와 **별도로** 반올림 |
| `hPx` | `Math.round(cardH + mH)` | |
| 프레임 높이 | JS 반올림 없음 — CSS `aspect-ratio: 4/3`이 카드 폭에서 산출 | |
| `--ts`, `--ss` | **없음** (분수 px) | |
| 스테이지 높이 | `Math.round` | |

### 정지 상태 산술 예 (추정 아님 — 위 식에 값을 대입한 계산)

뷰포트 폭 390(예: iPhone 계열), `full = 390 − 68 = 322`.

**3열:** `cardW = (322 − 32)/3 = 96.667` → `wPx = 97`, `stride = 112.667`, `originX = 34`

| col | x | round(x) | 우변 = round(x)+97 | 다음 카드와의 간격 |
|---|---|---|---|---|
| 0 | 34 | 34 | 131 | 16 |
| 1 | 146.667 | 147 | 244 | **15** |
| 2 | 259.333 | 259 | 356 | — |

**4열:** `cardW = (322 − 48)/4 = 68.5` → `wPx = 69`, `stride = 84.5`

| col | x | round(x) | 우변 = round(x)+69 | 다음 카드와의 간격 |
|---|---|---|---|---|
| 0 | 34 | 34 | 103 | 16 |
| 1 | 118.5 | 119 | 188 | **15** |
| 2 | 203 | 203 | 272 | 16 |
| 3 | 287.5 | 288 | **357** | — (설계 우단 356보다 1px 초과) |

→ 좌변(round(x))과 폭(round(cardW))을 따로 반올림하므로, 카드 간 간격이 15/16px로 섞이고 우단이 설계값과 1px 어긋날 수 있다. 열 수가 바뀌면 이 15/16 패턴의 위치가 달라진다.

---

## d. img의 object-fit, width/height

```css
/* GridExperience.tsx:456-466 */
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
```

- img에 `width`/`height` HTML 속성 없음, 인라인 style 없음 (577–582행).
- `object-position` 지정 없음 — hotspot은 URL 크롭으로 처리(545–546행 주석).
- 소스는 항상 `w=800&h=600&fit=crop` 4:3 고정 (`src/lib/imageUrl.ts:16-25`, 호출 578행). 즉 원본 비율 = 프레임 비율이라 cover 크롭량은 이론상 0, 매 프레임 스케일만 변한다.
- 프레임 폭 = 카드 폭(transition 중 분수), 프레임 높이 = 그 폭 × 3/4 (분수). 카드 `height` transition과 프레임 높이는 **서로 독립적으로** 결정된다.

```ts
// src/lib/imageUrl.ts:16-25
export function gridThumb43(src: string, width: number, hotspot?: { x: number; y: number }): string {
  if (!src.includes('cdn.sanity.io')) return src
  const h = Math.round((width * 3) / 4)
  const fp = hotspot ? `&crop=focalpoint&fp-x=${hotspot.x}&fp-y=${hotspot.y}` : ''
  return `${src}?w=${width}&h=${h}&fit=crop${fp}&q=75&auto=format`
}
```

(비-Sanity URL이면 원본 그대로 반환 → 그 경우 원본 비율이 4:3이 아니면 cover 크롭이 발생한다.)

---

## e. 합성 레이어 관련 선언

| 선언 | 유무 | 위치 |
|---|---|---|
| `will-change` | **있음** — `transform, width, height, opacity` | `.gm-card`, 441행 |
| `translateZ` / `translate3d` | **없음** — 2D `translate()`만 사용 | 269행 |
| `backface-visibility` | **없음** | 전체 검색 결과 0건 |
| `contain` / `isolation` | **없음** | |
| `.gm-frame` / img의 will-change | **없음** | |
| `.gm-stage` | `overflow-x: clip` (431행), `html, body { overflow-x: hidden }` (430행) | |
| `globals.css` | 위 항목 전부 **0건** | |

---

## f. 원인 후보 (전부 추정 — 실기기 검증 전)

1. **추정 — x와 width의 독립 반올림.** c절 산술처럼 `round(x) + round(cardW) ≠ round(x + cardW)`라서 정지 상태에서도 간격이 15/16px로 섞인다. 드래그·트윈 중엔 `c`가 매 프레임 변해 각 카드의 좌변과 폭이 **서로 다른 프레임에** 정수 경계를 넘으므로, 가장자리가 1px씩 따로 튀는 모습으로 보일 수 있다.
2. **추정 — JS rAF 트윈 + CSS transition 이중 보간.** paint가 매 프레임 정수 px를 쓰더라도, 브라우저에 보이는 값은 CSS transition이 재시작하며 만드는 **분수** 보간값이다. transform·width·height가 독립 보간되므로 좌변(transform)과 우변(transform+width)이 서로 다른 서브픽셀 위상을 갖고, DPR 2/3 기기에서는 디바이스 픽셀 스냅이 프레임마다 다르게 잡힐 수 있다.
3. **추정 — width/height 트랜지션은 합성 불가.** `will-change`에 `width, height`가 있지만 이 둘은 합성 스레드에서 처리되지 않아 매 프레임 layout+paint를 유발한다. 반면 `will-change: transform`으로 카드는 별도 레이어로 승격돼 있어, 레이어 위치(transform, 서브픽셀 가능)와 레이어 내부 래스터(분수 폭에서 다시 그려진 내용)의 픽셀 정렬이 매 프레임 달라질 수 있다.
4. **추정 — img의 연속 리스케일.** 프레임 크기가 매 프레임 분수 폭 × 3/4로 바뀌고 img가 `100%/100% + object-fit: cover`로 매번 리샘플링된다. 이미지 가장자리의 안티앨리어싱 열이 프레임마다 다르게 나올 수 있다.
5. **추정 — 모바일 특유 증폭 요인.** 모바일은 `full`이 작아(예: 322px) `cardW`의 분수부가 크고, 열 범위가 1–5로 넓으며, 고DPR이라 1 CSS px 차이가 2–3 디바이스 px로 보인다. 터치 드래그 시 `pointermove`마다 paint가 실행돼 transition 재시작 빈도도 높다.

### 검증 제안 (미실행)

- DevTools Rendering → "Layer borders" / "Paint flashing"으로 카드 레이어 경계와 리페인트 확인.
- 정지 상태 3열·4열에서 각 카드 `getBoundingClientRect()`의 `left`·`right`를 기록해 c절 표의 15/16px 패턴이 실제로 재현되는지 확인.
- 트윈 중 `getComputedStyle(el).transform` / `width`를 rAF로 샘플링해 분수 값이 나오는지 확인.
