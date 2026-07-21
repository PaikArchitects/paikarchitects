# ABOUT 2차 조정 및 INFO SLIDE 폭 확대 명세 (260721-B)

4건. About 3건 + WORKS 1건.

## 0. 범위와 제약

**수정 대상 파일 (이외 파일 수정 금지)**

- `src/app/globals.css` (수정)
- `src/app/about/page.tsx` (수정)
- `src/components/ContentArea.tsx` (수정 — 상수 2개 값만)

**금지 사항**

- `ContentArea.tsx`에서 수정 허용 범위는 **`INFO_SLIDE_W`와 `TITLE_SET_MIN_H` 두 상수의 숫자 값뿐이다.** 물리·모프 로직, rects 계산식, 렌더 구조는 일절 손대지 않는다.
- `ProjectWall.tsx`, `useRingWall.ts`, `MobileProjectWall.tsx` 수정 금지.
- `npm run dev`, `npm run build` 실행 금지. 검증은 `npx tsc --noEmit`만.
- 측정 반응형 패턴 금지: `getBoundingClientRect`, `ResizeObserver`, `offsetWidth`를 레이아웃 목적으로 쓰지 않는다. 상단 내비의 현재 층 판정은 아래 3절에 명시된 방식만 사용한다.

---

## 1. 열 폭 정상화 — `.about-inner` max-width 제거

### 배경

현재 `.about-inner { max-width: 1200px; margin: 0 auto; }`이고 `.about-row`의 첫 열이 `var(--wall-width)` = `clamp(300px, 28vw, 28vw)`다.

1920px 화면에서 라벨 월은 28vw = 538px를 점유하는데, 이 값은 **화면 폭** 기준으로 계산되고 남은 공간은 **1200px 컨테이너** 안에서 배분된다. 결과적으로 EN/KO가 각각 307px로 붕괴하고, `.about-inner`가 중앙 정렬이라 라벨 월 좌변이 프로젝트 월 좌변(화면 좌단)과 어긋난다.

프로젝트 월과 폭·좌변을 일치시키려면 About도 **화면 전폭 기준**이어야 한다.

### 조치 1-A — `.about-inner`에서 max-width 제거

```css
.about-inner {
  /* max-width 없음 — 라벨 월이 프로젝트 월과 동일한 vw 기준으로 계산되어야 한다.
     1200px 컨테이너 안에서 28vw를 계산하면 EN/KO 열이 붕괴한다. */
}
```

`max-width: 1200px`과 `margin: 0 auto`를 **모두 삭제**한다. 규칙이 비게 되면 `.about-inner` 규칙 자체를 삭제하고 `about/page.tsx`의 `<div className="about-inner">`도 함께 제거해도 되나, **이번에는 규칙만 비우고 요소는 유지한다**(향후 조정 여지).

빈 규칙이 되므로 다음과 같이 남긴다.

```css
.about-inner {
  width: 100%;
}
```

### 조치 1-B — `.about-page` 좌우 padding을 프로젝트 월 기준선과 정렬

프로젝트 월은 화면 좌단에서 시작한다(`ProjectWall.tsx` 컨테이너에 좌측 여백 없음). About도 동일하게 하려면 `.about-page`의 좌측 padding이 0이어야 하나, 그러면 라벨 텍스트가 화면 모서리에 붙는다.

라벨은 **우측 정렬**로 바뀌므로(2절) 좌측 padding은 시각적으로 무의미해진다. 다음으로 교체한다.

```css
.about-page {
  background: #FFFFFF;
  color: #080706;
  min-height: 100vh;
  padding: 140px 44px 120px 0;   /* 좌측 0 — 라벨 월 좌변 = 프로젝트 월 좌변 */
}
```

D2 블록:
```css
.about-page {
  padding: 120px 32px 100px 0;
}
```

M 블록(`max-width: 1023px`)은 라벨 월이 사라지므로 좌측 padding을 되살린다.
```css
.about-page {
  padding: 88px 20px 80px;
}
```
(기존과 동일 — 변경 없음)

---

## 2. 좌측 라벨 우측 정렬 + 수직선

### 배경

라벨을 라벨 월 영역의 **우측 끝**에 우측 정렬하고, 각 라벨 우측에 가느다란 수직선을 둔다. 이는 본문 좌변과 라벨 사이에 명확한 경계를 만든다.

### 조치 2-A — `.about-label` 교체

```css
.about-label {
  position: sticky;
  top: 24px;
  font-size: 20px;
  font-weight: 400;
  letter-spacing: -0.01em;
  line-height: 1.25;
  color: #080706;
  text-align: right;
  padding-right: 20px;
  border-right: 1px solid rgba(8, 7, 6, 0.18);
}
```

`text-transform: uppercase`가 아직 남아 있다면 삭제한다(260721 1차 명세에서 이미 제거했어야 한다).

**주의**: `border-right`는 라벨 텍스트의 높이만큼만 그려진다. 층 전체 높이를 관통하는 선이 아니다. 이것이 의도된 동작이다 — sticky로 라벨이 이동하면 선도 함께 이동해야 한다.

### 조치 2-B — M 구간에서 우측 정렬·수직선 해제

`@media (max-width: 1023px)` 블록의 `.about-label`에 다음을 추가한다(기존 선언 유지).

```css
.about-label {
  /* 기존 선언들 유지 */
  text-align: left;
  padding-right: 0;
  border-right: none;
  font-size: 16px;
}
```

M 구간은 라벨이 본문 위로 접히므로 우측 정렬과 수직선이 성립하지 않는다.

---

## 3. 상단 층 내비게이션 신설

### 배경

WORKS의 필터 칩 행과 동일한 위치에 `Position / Preoccupations / Curriculum Vitae` 3항목을 고정 배치한다. 클릭 시 해당 층으로 스크롤한다. 좌측 sticky 라벨은 **그대로 유지한다**(좌측은 층 제목, 상단은 점프 컨트롤로 기능이 다르다).

### 조치 3-A — `about/page.tsx`에 내비 마크업 추가

`<div className="about-inner">` **바로 안쪽 최상단**, 첫 `<section>` 앞에 추가한다.

```tsx
<nav className="about-nav">
  <a href="#position" className="about-nav-link">Position</a>
  <a href="#preoccupations" className="about-nav-link">Preoccupations</a>
  <a href="#cv" className="about-nav-link">Curriculum Vitae</a>
</nav>
```

**앵커 방식을 쓴다.** `scroll-behavior: smooth`와 `scroll-margin-top`으로 처리되므로 JS·스크롤 리스너·`IntersectionObserver`가 전혀 필요 없다. 현재 층 하이라이트(active 표시)는 이번 범위에서 **구현하지 않는다** — 측정 없이는 불가능하며, 좌측 sticky 라벨이 이미 현재 층을 알려준다.

### 조치 3-B — 각 section에 id 부여

기존 3개 `<section>`에 id를 추가한다. 다른 속성은 건드리지 않는다.

```tsx
<section className="about-row" id="position">
<section className="about-row" id="preoccupations">
<section className="about-row about-row--wide" id="cv">
```

### 조치 3-C — CSS 추가

`ABOUT PAGE` 블록 안에 추가한다.

```css
/* 상단 층 내비 — WORKS 필터 칩 행과 동일 위치·문법 */
.about-nav {
  position: fixed;
  top: 68px;
  left: 0;
  right: 0;
  z-index: 80;
  display: flex;
  gap: 32px;
  padding: 0 44px 0 24px;
  background: #FFFFFF;
  height: 32px;
  align-items: center;
}

.about-nav-link {
  font-size: 11px;
  font-weight: 300;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-decoration: none;
  color: rgba(8, 7, 6, 0.55);
  transition: color 0.2s ease-out;
}

.about-nav-link:hover {
  color: #080706;
}

/* 앵커 점프 시 헤더+내비 아래로 정확히 착지 */
.about-row {
  scroll-margin-top: 108px;
}

html {
  scroll-behavior: smooth;
}
```

**주의**: `html { scroll-behavior: smooth }`는 전역이다. `globals.css`의 기존 `html { height: 100%; }` 규칙에 `scroll-behavior: smooth;`를 추가하는 방식으로 병합한다. 별도 규칙을 만들지 말 것.

### 조치 3-D — M 구간 내비 조정

```css
@media (max-width: 1023px) {
  .about-nav {
    top: 56px;
    height: 36px;
    gap: 18px;
    padding: 0 16px;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .about-nav::-webkit-scrollbar {
    display: none;
  }

  .about-nav-link {
    font-size: 10px;
    white-space: nowrap;
  }

  .about-row {
    scroll-margin-top: 92px;
  }
}
```

### 조치 3-E — 본문 상단 여백 확보

내비가 fixed로 추가되었으므로 본문이 그 아래에서 시작해야 한다.

D1: `.about-page`의 `padding-top`을 `140px` → `150px`
D2: `120px` → `130px`
M: `88px` → `104px`

각 미디어쿼리의 `.about-page` padding 첫 값만 교체한다.

---

## 4. 헤더 하부 페이드 — mask-image

### 배경

스크롤 시 텍스트가 헤더 영역을 그대로 통과해 겹쳐 보인다. 상단 일정 구간에 투명도 그라데이션을 걸어 텍스트가 헤더 아래로 스며드는 것처럼 보이게 한다.

### 조치 4-A — `.about-page`에 mask 추가

```css
.about-page {
  /* 기존 선언 유지 */
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0,
    transparent 100px,
    #000 140px
  );
  mask-image: linear-gradient(
    to bottom,
    transparent 0,
    transparent 100px,
    #000 140px
  );
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-size: 100% 100vh;
  mask-size: 100% 100vh;
  -webkit-mask-attachment: fixed;
  mask-attachment: fixed;
}
```

`mask-attachment: fixed`가 핵심이다. 이것이 없으면 마스크가 문서 전체 높이에 늘어나 페이드 구간이 화면 밖으로 벗어난다.

### 조치 4-B — M 구간 마스크 구간 조정

```css
@media (max-width: 1023px) {
  .about-page {
    -webkit-mask-image: linear-gradient(
      to bottom,
      transparent 0,
      transparent 78px,
      #000 108px
    );
    mask-image: linear-gradient(
      to bottom,
      transparent 0,
      transparent 78px,
      #000 108px
    );
  }
}
```

### 위험 고지

`mask-image`는 새로운 스태킹 컨텍스트를 만든다. `.about-label`의 `position: sticky`는 마스크가 걸린 요소의 **자손**이므로 sticky 자체는 정상 작동하나, sticky된 라벨도 마스크의 영향을 받아 상단에서 페이드된다.

**이것이 문제인지 육안 확인이 필요하다.** 라벨이 top 24px에 고정되는데 마스크 페이드 구간이 100~140px이므로, 라벨은 완전히 투명한 구간(0~100px)에 있게 되어 **보이지 않을 수 있다.**

따라서 `.about-label`의 `top` 값을 마스크 불투명 구간 아래로 내린다.

```css
.about-label {
  top: 150px;   /* 마스크 완전 불투명 구간(140px) 아래 */
}
```

M 구간:
```css
.about-label {
  top: 112px;   /* 마스크 불투명 구간(108px) 아래 */
}
```

M 구간 `.about-label`의 기존 `background: #FFFFFF`는 유지한다.

---

## 5. WORKS 정보 슬라이드 폭 120% 확대

### 배경 — 감사 결과

`ContentArea.tsx`의 `INFO_SLIDE_W = 200` 참조 지점은 3곳이며 **전부 상수를 참조**한다(하드코딩된 중복 값 없음).

- L553 `rects` 배열 첫 원소
- L641 모프 종착 좌표 `left: TRACK_INSET + INFO_SLIDE_W + SLIDE_GAP_PX`
- L897 정보 슬라이드 렌더 `width`

따라서 상수 값만 바꾸면 rects·모프·렌더가 일관되게 따라온다. 기록상의 "폭 상수 변경 금지"는 rects와 모프가 별개 하드코딩 값을 쓸 경우를 우려한 것이나, 실제 코드는 단일 상수를 공유하므로 해당하지 않는다.

### 조치 5-A — `INFO_SLIDE_W` 교체

```ts
const INFO_SLIDE_W = 240     // 세로 스택 — 수평 4열 폐기 (260714-B). 260721 200→240 (120%)
```

### 조치 5-B — `TITLE_SET_MIN_H` 재산출

`TITLE_SET_MIN_H`는 주석에 "INFO_SLIDE_W(200) 기준"으로 명시된 **파생값**이다. 폭이 20% 늘면 영문 타이틀이 더 적은 줄 수로 들어가므로 197px는 과대해지고 AWARDS 위에 빈 공간이 생긴다.

비례 축소(197 × 200/240 ≈ 164)에 여유를 더해 다음으로 교체한다.

```ts
// 타이틀 세트 고정 슬롯 높이 — AWARDS 시작 y를 전 프로젝트 동일화. INFO_SLIDE_W(240) 기준
// 260721: 폭 200→240 확대에 따른 재산출. 기존 197 → 175 (비례 164 + 여유 11)
const TITLE_SET_MIN_H = 175
```

**이 값은 추정이다.** 배포 후 가장 긴 영문 타이틀(약 63자) 프로젝트에서 타이틀이 슬롯을 넘치는지, 혹은 AWARDS 위에 과도한 빈 공간이 생기는지 육안 확인해야 한다. 넘치면 값을 올리고, 빈 공간이 크면 내린다.

### 조치 5-C — 그 외 상수 불변

`TEXT_SLIDE_W(560)`, `QUOTE_SLIDE_W(460)`, `CREDITS_SLIDE_W(420)`, `SLIDE_GAP_PX(24)`, `TRACK_INSET(24)`는 **변경하지 않는다.**

---

## 6. 검증

```
npx tsc --noEmit
```

오류가 없어야 한다. `ContentArea.tsx`는 숫자 리터럴 교체이므로 타입에 영향이 없다.

`npm run dev`·`npm run build`는 실행하지 않는다.

---

## 7. 실행 후 육안 확인 사항 (Claude Code 범위 밖)

우선순위 순으로 확인한다.

1. **WORKS 모프 애니메이션** — 프로젝트 클릭 시 커버 이미지가 히어로 위치로 이동하는 궤적이 어긋나지 않는가. `INFO_SLIDE_W` 변경의 최대 위험 지점이다.
2. **가장 긴 타이틀 프로젝트의 AWARDS 시작 y** — `TITLE_SET_MIN_H = 175`가 적정한가. 타이틀이 넘치거나 빈 공간이 과하면 값 조정이 필요하다.
3. **About 라벨 월 좌변** — 프로젝트 월 좌변과 동일한 x좌표인가.
4. **About EN/KO 열 폭** — 1920px에서 각 600px 내외를 확보하는가.
5. **sticky 라벨이 마스크 페이드 구간에서 사라지지 않는가** — `top: 150px`이 적정한지 확인.
6. **상단 내비 앵커 점프 착지 위치** — 층 라벨이 내비 바로 아래에 오는가. 어긋나면 `scroll-margin-top` 조정.
7. **모바일에서 내비 3항목이 가로 스크롤 없이 들어가는가** — 넘치면 `gap`을 더 줄인다.
