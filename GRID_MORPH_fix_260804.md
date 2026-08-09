# GRID_MORPH_fix_260804 — 그리드 morph 3결함 (진입 깜빡임 · 복귀 대칭 · 출발 rect)

대상: `src/components/GridContentArea.tsx`, `src/components/GridExperience.tsx`
`ContentArea.tsx`(링월) **절대 수정 금지.**
검증: `npx tsc --noEmit`만. dev/build 금지.

---

## 0. 진단 요약 (감사 확정, 라인 근거)

| # | 증상 | 원인 | 위치 |
|---|---|---|---|
| ① | 진입 시 흰색 깜빡임(최초 클릭) | morph 레이어가 **원본 URL**을 새로 로드 — 카드는 크롭 썸네일이라 캐시 불일치 | GridContentArea 1315행 `src={project.coverImage}` |
| ② | 복귀 시 다른 카드가 이미 깔린 위로 morph | 배경이 **300ms**에 걷히는데 역-morph는 **700ms** — 배경이 먼저 사라져 그리드 노출 | GridContentArea 1166~1167행 |
| ③ | 복귀 시 커버가 좌측 밖에서 날아옴 | 역-morph 출발 rect를 **커버(rc[1])** 로 고정 — 슬라이드를 넘기면 화면 밖 좌표 | GridContentArea 852~854행 |

---

## 작업 ① — 진입 깜빡임 제거 (썸네일 선표시 → 원본 교체)

### 원인
morph 레이어(1311~1345행)가 `src={project.coverImage}`(원본 풀사이즈)를 쓴다.
그리드 카드는 `gridThumb43(coverImage, 800)` 크롭 썸네일을 쓰므로 **다른 URL = 캐시 미스**.
최초 클릭 시 원본이 로드될 때까지 빈 영역이 노출된다(흰색 깜빡임).

### 해법 (사용자 확정: 썸네일 깔고 원본 로드되면 교체)
morph 레이어를 **2겹**으로 만든다.
- 하위 레이어: 카드와 **동일한 썸네일 URL**(`gridThumb43(project.coverImage, 800)`) — 이미 캐시되어 즉시 표시.
- 상위 레이어: 원본(`project.coverImage`) — `onLoad` 전까지 `opacity: 0`, 로드되면 크로스페이드.

두 레이어는 **동일한 rect·objectFit**을 공유해야 교체 시 어긋나지 않는다.

### 구현
컴포넌트 본문에 상태 추가:
```jsx
// morph 원본 이미지 로드 완료 여부 — 완료 전까지 썸네일이 표시된다(깜빡임 차단)
const [morphFullLoaded, setMorphFullLoaded] = useState(false)
```
`morphRect`가 null로 리셋될 때 함께 초기화(다음 morph에서 재사용되지 않도록):
- `setMorphRect(null)`을 호출하는 모든 지점(828행, 868행, 880행)에서 `setMorphFullLoaded(false)`도 호출.

morph 레이어(1311~1345행) 교체:
```jsx
{morphRect && (
  project.coverImage ? (
    <>
      {/* 하위 — 카드와 동일 썸네일. 캐시 히트로 즉시 그려져 깜빡임을 막는다 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={gridThumb43(project.coverImage, 800)}
        alt=""
        draggable={false}
        style={{
          position: 'absolute',
          top: morphRect.top, left: morphRect.left,
          width: morphRect.width, height: morphRect.height,
          objectFit: 'cover',
          opacity: morphVisible ? 1 : 0,
          transition: `all ${MORPH_MS}ms ${EASE}, opacity ${MORPH_FADE_MS}ms ease-out`,
          pointerEvents: 'none',
          zIndex: 6,
        }}
      />
      {/* 상위 — 원본. 로드 완료 시 크로스페이드로 교체 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={project.coverImage}
        alt=""
        draggable={false}
        onLoad={() => setMorphFullLoaded(true)}
        style={{
          position: 'absolute',
          top: morphRect.top, left: morphRect.left,
          width: morphRect.width, height: morphRect.height,
          objectFit: 'cover',
          opacity: morphVisible && morphFullLoaded ? 1 : 0,
          transition: `all ${MORPH_MS}ms ${EASE}, opacity 200ms ease-out`,
          pointerEvents: 'none',
          zIndex: 7,
        }}
      />
    </>
  ) : (
    <div style={{ /* 기존 coverColor 폴백 그대로 — 변경 없음 */ }} />
  )
)}
```
**주의**: `gridThumb43`가 GridContentArea에 import되어 있는지 확인. 없으면 import 추가
(그리드 카드가 쓰는 것과 동일한 함수·동일 인자 800·hotspot이어야 캐시가 맞는다).
그리드 카드의 실제 호출부를 grep해 인자를 **정확히 일치**시킬 것:
`grep -n "gridThumb43" GridExperience.tsx`

---

## 작업 ② — 복귀 대칭 (배경을 morph 도착까지 유지)

### 원인
1166~1167행:
```
background: mode === 'active' ? '#FFFFFF' : 'transparent',
transition: 'background-color 0.3s ease-out',
```
복귀 시 `mode`가 idle이 되는 즉시 배경이 **300ms**에 걷힌다. 그런데 역-morph는 **700ms**(MORPH_MS).
→ 배경이 먼저 사라져 그리드가 전부 드러나고, 남은 400ms 동안 morph만 허공에서 축소된다.
이것이 "다른 카드가 이미 깔린 상태에서 morph가 진행되는" 어색함의 원인이다.

### 해법 (사용자 확정: 진입의 역재생)
배경이 걷히는 시점을 **morph 도착에 맞춘다.** 역-morph가 진행되는 동안 배경을 유지하다가,
카드 자리에 도착할 무렵 걷어 그리드가 드러나게 한다.

### 구현
배경 유지 플래그 추가:
```jsx
// 역-morph 동안 배경을 유지해 그리드 노출을 막는다 — 진입(카드→확대)의 역재생 대칭
const [holdBackdrop, setHoldBackdrop] = useState(false)
```
역-morph 블록(835행 `if (mode === 'idle' && prev === 'active')`) 내부, `enterRect && rootRef.current`
분기 안에서:
- `setMorphVisible(true)` 직전에 `setHoldBackdrop(true)` 추가.
- 배경을 걷는 타이머 추가 — morph 도착 직전부터 걷히기 시작해 도착과 함께 완료되도록,
  `MORPH_MS - BACKDROP_FADE_MS` 시점에 해제:
```jsx
timersRef.current.push(setTimeout(() => {
  if (cancelled) return
  setHoldBackdrop(false)
}, Math.max(0, MORPH_MS - BACKDROP_FADE_MS)))
```
상수 추가(46행 `MORPH_MS` 근처):
```
const BACKDROP_FADE_MS = 300   // 배경 페이드 지속 — 역-morph 도착에 맞춰 걷힌다
```

루트 배경(1166~1167행) 교체:
```
background: (mode === 'active' || holdBackdrop) ? '#FFFFFF' : 'transparent',
transition: `background-color ${BACKDROP_FADE_MS}ms ease-out`,
```

직접 진입 닫기(874~886행, `enterRect === null` 경로)는 `holdBackdrop`을 켜지 않으므로
기존 페이드아웃 동작 그대로다. **변경 없음.**

### 정리
`holdBackdrop`은 언마운트·재진입 시 반드시 false로 돌아가야 한다. `mode === 'active'` 진입
블록(759행) 시작 지점에서 `setHoldBackdrop(false)`를 호출해 잔존을 차단할 것.

---

## 작업 ③ — 역-morph 출발 rect = 현재 보이는 슬라이드

### 원인
852~854행이 출발 left를 **커버(rc[1])** 기준으로 계산한다:
```
const heroScreenLeft = rc.length >= 2 ? Math.round(TRACK_INSET + rc[1].x - sp) : ...
```
슬라이드를 우측으로 넘겨 `sp`가 커지면 이 값은 **큰 음수**(화면 밖 좌측)가 된다.
커버는 이미 화면 밖인데 거기서 출발하니 "좌측 어딘가에서 날아오는" 모습이 된다.

### 해법 (사용자 확정: 현재 보이는 슬라이드가 축소되어 카드로)
출발 rect를 **현재 화면 중앙에 가장 가까운 슬라이드**로 잡는다.

### 구현
역-morph 블록에서 `rc[1]` 고정 대신 현재 슬라이드 인덱스를 구해 사용한다.
현재 인덱스는 이미 컴포넌트가 추적 중일 가능성이 높다 — **먼저 grep으로 확인**:
`grep -n "currentIndex\|activeIndex\|nearestIndex\|curIdx" GridContentArea.tsx`
있으면 그 값을 쓰고, 없으면 scrollPos로 산출한다:
```jsx
// 현재 화면 중앙에 가장 가까운 콘텐츠 슬라이드(인덱스 1..) — 역-morph 출발점
let curIdx = 1
if (rc.length >= 2) {
  let best = Infinity
  for (let k = 1; k < rc.length; k++) {
    const centerX = TRACK_INSET + rc[k].x - sp + rc[k].w / 2
    const d = Math.abs(centerX - vpSize.w / 2)
    if (d < best) { best = d; curIdx = k }
  }
}
```
출발 rect를 `curIdx` 기준으로 교체:
```jsx
const tw = rc.length >= 2
  ? rc[curIdx].w
  : th * (project.coverRatio && project.coverRatio > 0 ? project.coverRatio : FALLBACK_RATIO)
const heroScreenLeft = rc.length >= 2
  ? Math.round(TRACK_INSET + rc[curIdx].x - sp)
  : Math.round(vpSize.w / 2 - tw / 2)
```
**주의**: 슬라이드마다 높이가 다를 수 있다. `th`(= `rh * SLIDE_H_RATIO`)를 그대로 쓰되,
`rc[curIdx]`에 높이 정보(`h`)가 있으면 그것을 우선 사용할 것. rects 구조를 grep으로 확인:
`grep -n "rects = useMemo" -A 25 GridContentArea.tsx`

### 이미지 전환 처리 (필수)
출발이 커버가 아닌 슬라이드이므로, morph 레이어에 표시되는 이미지도 **그 슬라이드 이미지**여야
자연스럽다. 도착(카드)에서는 커버 썸네일이 되어야 하므로 도착 시점에 크로스페이드한다.
작업 ①의 2겹 구조를 재사용한다:
- 역-morph 시작 시: 하위 레이어 = **현재 슬라이드 이미지 URL**, 상위 = 커버 썸네일(opacity 0).
- morph 도착 직전(`MORPH_MS - 200`)에 상위를 opacity 1로 올려 커버 썸네일로 전환.

구현을 단순화하기 위해 morph 이미지 소스를 상태로 둔다:
```jsx
// 역-morph 출발 이미지 — 현재 보이는 슬라이드. 진입 시에는 null(커버 사용)
const [morphFromSrc, setMorphFromSrc] = useState<string | null>(null)
```
역-morph 시작 시 `setMorphFromSrc(현재 슬라이드 image URL)`, 도착 타이머에서 `setMorphFromSrc(null)`.
morph 레이어 하위 src를 `morphFromSrc ?? gridThumb43(project.coverImage, 800)`로 한다.

**현재 슬라이드의 image URL 획득**: `getSlides`가 반환한 슬라이드 배열에서 `curIdx`에 해당하는
항목의 image URL을 쓴다. 슬라이드 배열 변수명을 grep으로 확인해 사용할 것:
`grep -n "getSlides\|const slides" GridContentArea.tsx`
해당 슬라이드가 image 타입이 아니면(텍스트·크레딧 슬라이드) `morphFromSrc`를 null로 두어
커버 썸네일에서 출발한다 — 이 경우는 rect만 현재 슬라이드 위치를 쓴다.

---

## 작업 ④ — 복귀 도착 rect 갱신 (GridExperience)

### 원인
`closeProject`(GridExperience 304행)가 `enterRectRef`를 갱신하지 않는다. 도착 rect가
**클릭 당시 카드 rect**로 고정이라, 그 사이 밀도 변경(film movement)·스크롤이 있었으면 어긋난다.

### 수정
`closeProject`에서 해당 카드의 **현재 rect를 재측정**해 `enterRectRef`를 갱신한다.
카드 엘리먼트는 `cardEls`(544행 주석에 언급된 ref 맵)로 접근 가능하다 — 실제 변수명을
grep으로 확인: `grep -n "cardEls" GridExperience.tsx`

```jsx
const closeProject = useCallback(() => {
  // 복귀 도착 rect를 현재 카드 위치로 갱신 — 밀도 변경·스크롤로 클릭 당시와 달라졌을 수 있다
  if (selected) {
    const el = cardEls.current?.get(selected.id)     // 실제 자료구조에 맞춰 조정
    if (el) {
      const r = el.getBoundingClientRect()
      enterRectRef.current = { top: r.top, left: r.left, width: r.width, height: r.height }
    }
  }
  setContentMode('idle')
  setTimeout(() => setSelected(null), CONTENT_EXIT_MS)
  if (window.location.pathname !== '/work-grid') {
    window.history.replaceState({}, '', '/work-grid')
  }
}, [selected])
```
**주의**: 의존성 배열에 `selected` 추가 필요(현재 `[]`). popstate effect(315~319행)가
`closeProject`를 의존하므로 재생성이 전파되는지 확인 — 문제되면 `selectedRef` 미러를 쓴다.

---

## 작업 순서
1. GridContentArea: `BACKDROP_FADE_MS` 상수 추가, `morphFullLoaded`·`holdBackdrop`·`morphFromSrc` 상태 추가.
2. 작업 ③ — 역-morph 출발 rect를 `curIdx` 기준으로 교체(grep으로 rects·slides 구조 확인 선행).
3. 작업 ② — `holdBackdrop` 도입, 루트 배경 조건·transition 교체, 진입 블록에서 false 리셋.
4. 작업 ① — morph 레이어 2겹 구조로 교체(`gridThumb43` import·인자 일치 확인).
5. GridExperience: 작업 ④ — `closeProject`에서 rect 재측정.
6. `npx tsc --noEmit` — 오류 0.
7. `grep -n "src={project.coverImage}" GridContentArea.tsx` → 상위 레이어 1건만 남아야 함.

## 절대 불변
- `ContentArea.tsx`(링월) — 일절 수정 금지.
- 메타 sticky 구조(트랙 자식 0의 `transform: translateX(metaShift)` + 트랙 동일 transition),
  `metaShift`·`META_SLOT_W`·`META_PAD_X` — **불변. 회귀 금지.**
- `INFO_SLIDE_W = 270`, `TITLE_SET_MIN_H = 160` — 불변.
- `centerScroll`·`clampScroll`·`min/maxScroll`·캡션·슬라이드 카운터 — 불변.
- 직접 진입(enterRect === null) 경로 — 기존 페이드아웃 동작 그대로 유지.
- film movement 리플로우 로직 — 불변.

## 검증 (육안)
1. 최초 클릭(캐시 없는 상태): 흰색 깜빡임 없이 카드 이미지가 그대로 확대된다.
2. 커버 상태에서 뒤로가기: 배경이 유지된 채 축소되다가, 카드 자리 도착과 함께 그리드가 드러난다.
3. 07/16 등으로 넘긴 뒤 뒤로가기: **현재 보고 있던 슬라이드**가 그 자리에서 축소되어 카드로 들어간다.
   좌측 밖에서 날아오지 않는다.
4. 밀도를 바꾼 뒤 뒤로가기: morph가 카드의 **현재** 위치로 정확히 도착한다.
