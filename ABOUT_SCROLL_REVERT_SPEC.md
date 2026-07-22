# ABOUT 스크롤 구조 재전환 — 문서 스크롤 + 헤더 셸 (260722)

## 0. 배경 — 왜 되돌리는가

260721-C에서 About을 WORKS와 동일한 `height: 100vh; overflow: hidden` + 내부 `.about-scroll` 구조로 만들었다. 이는 **판단 착오였다.**

WORKS가 그 구조인 이유는 프로젝트 월의 물리 엔진(`useRingWall`) 때문에 **문서 스크롤을 반드시 차단해야** 하기 때문이다. About은 물리 엔진이 없어 문서 스크롤을 막을 이유가 없다.

불필요하게 이식한 `overflow: hidden` 부모 + 내부 `overflow-y: auto` 자식의 **이중 스크롤 컨테이너**가 iOS Safari에서 히트 테스트 좌표 어긋남을 유발했다. 증상은 두 가지로 나타났다.

1. About 층 내비 클릭 시 앵커 점프가 `.about-page`의 `scrollTop`을 강제 변경 → `absolute`인 `.about-nav`가 화면 밖으로 밀려 사라짐
2. 스크롤 누적 후 터치 위치와 히트 영역이 어긋남. SPA 특성상 About을 거친 뒤 WORKS로 가도 유지됨(WORKS 단독일 때는 없던 문제)

**해결**: About을 평범한 문서 스크롤로 되돌린다. 헤더 침범은 `position: fixed` 흰 셸로 막는다. 이중 스크롤 컨테이너가 사라져 버그의 조건 자체가 없어진다.

**수용된 비일관성**: About은 모바일에서 주소창이 반응하고, WORKS는 반응하지 않는다. 이는 각 페이지의 내용 성격(물리 엔진 유무)이 다른 데서 오는 올바른 차이다.

---

## 1. 범위와 제약

**수정 대상 파일 (이외 파일 수정 금지)**

- `src/app/globals.css` (수정)
- `src/app/about/page.tsx` (수정 — 래퍼 구조 변경)

**금지 사항**

- `LandingExperience.tsx`, `ProjectWall.tsx`, `ContentArea.tsx`, `SiteHeader.tsx`, `AboutNav.tsx` 수정 금지. `AboutNav.tsx`는 260721-E에서 만든 그대로 둔다.
- `mask-image` 계열 금지.
- `npm run dev`, `npm run build` 실행 금지. 검증은 `npx tsc --noEmit`만.
- 측정 반응형 패턴 금지.

---

## 2. `about/page.tsx` 구조 변경 — `.about-scroll` 제거

### 조치 2-A — 래퍼 제거, 셸 추가

`.about-scroll` 래퍼를 제거하고 본문을 `.about-page` 직속으로 되돌린다. 헤더 셸을 추가한다.

**현재 구조 (260721-C):**
```tsx
<div className="about-page">
  <AboutNav />
  <div className="about-scroll">
    <div className="about-inner">
      <section .../>
      ...
    </div>
  </div>
</div>
```

**변경 후:**
```tsx
<div className="about-page">
  <div className="about-header-shell" aria-hidden="true" />
  <AboutNav />
  <div className="about-inner">
    <section className="about-row" id="position">...</section>
    <section className="about-row" id="preoccupations">...</section>
    <section className="about-row about-row--wide" id="cv">...</section>
    {contact && <div className="about-contact">...</div>}
  </div>
</div>
```

- `.about-scroll` 여는/닫는 `<div>`를 제거한다. 그 자식(`.about-inner`)은 유지한다.
- `.about-header-shell`을 최상단에 추가한다(`AboutNav`보다 앞).
- `AboutNav`는 `.about-inner` 바깥, 셸 다음에 둔다.

---

## 3. `globals.css` — `.about-page` 문서 스크롤 복원

### 조치 3-A — `.about-page` 교체

현재(260721-C):
```css
.about-page {
  position: relative;
  background: #FFFFFF;
  color: #080706;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
```

교체 후:
```css
.about-page {
  position: relative;
  background: #FFFFFF;
  color: #080706;
  min-height: 100vh;
  padding: 150px 173px 120px 0;
}
```

`height: 100vh`·`overflow: hidden`·`width: 100vw`를 **제거한다.** 이것이 이번 수정의 핵심이다. `padding`은 `.about-scroll`이 갖던 값을 그대로 가져온다(상단은 셸 높이만큼 확보).

### 조치 3-B — `.about-scroll` 규칙 완전 삭제

`.about-scroll`, `.about-scroll::-webkit-scrollbar` 규칙을 **전부 삭제한다.** D2·M 미디어쿼리 안의 `.about-scroll` 규칙도 삭제한다.

삭제 후, D2·M 구간에서 `.about-scroll`이 갖던 `padding`은 `.about-page`로 이관한다(아래 3-E, 3-F).

### 조치 3-C — `.about-inner` 유지

```css
.about-inner {
  width: 100%;
}
```
변경 없음.

### 조치 3-D — 헤더 셸 신규

```css
/* 헤더 존 불투명 셸 — 문서 스크롤된 본문이 헤더·내비 뒤로 사라지게 한다.
   position:fixed이므로 문서 스크롤과 무관하게 항상 상단 고정. */
.about-header-shell {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 86px;
  background: #FFFFFF;
  z-index: 60;
  pointer-events: none;
}
```

z-index 위계:

| 요소 | z-index |
|---|---|
| `.wordmark-intro` (ACP) | 200 |
| `.site-nav` (헤더 내비) | 100 |
| `.about-nav` (층 내비) | 70 |
| `.about-header-shell` | 60 |
| 본문·sticky 라벨 | 자동 |

### 조치 3-E — `.about-nav`를 fixed로

현재 `position: absolute`(부모 `.about-page` 기준)인데, `.about-page`가 더 이상 스크롤 컨테이너가 아니므로 문서 스크롤 시 함께 밀려 올라간다. `fixed`로 바꿔 고정한다.

현재:
```css
.about-nav {
  position: absolute;
  top: 50px;
  ...
  z-index: 50;
}
```

교체:
```css
.about-nav {
  position: fixed;
  top: 50px;
  left: 0;
  right: 0;
  height: 24px;
  z-index: 70;
  display: flex;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
  touch-action: pan-x;
}
```

`position`을 `fixed`로, `z-index`를 `70`으로(셸 위) 바꾼다. 나머지는 유지.

### 조치 3-F — `.about-label` sticky top 복원

문서 스크롤이 부활했으므로 sticky 라벨은 문서 뷰포트 기준으로 동작한다. 헤더 셸(86px) 아래에서 멈춰야 한다.

```css
.about-label {
  top: 96px;   /* 셸 86px + 여백 10 */
}
```

현재 `top: 0`을 교체한다.

M 구간:
```css
.about-label {
  top: 84px;   /* 모바일 셸 72px + 여백 12 */
}
```

M 구간 `.about-label`의 `background: #FFFFFF`는 유지한다.

### 조치 3-G — `.about-row` scroll-margin 복원

앵커 점프가 문서 스크롤이 되었으므로, 착지 시 헤더 셸에 가리지 않도록 여백을 준다.

```css
.about-row {
  scroll-margin-top: 96px;
}
```

M 구간:
```css
.about-row {
  scroll-margin-top: 84px;
}
```

### 조치 3-H — 스무스 스크롤 위치 이동

260721-E에서 `.about-scroll`에 넣은 `scroll-behavior: smooth`가 삭제됐으므로, 문서 레벨로 옮긴다.

`globals.css`의 `html` 규칙에 추가한다.
```css
html {
  height: 100%;
  scroll-behavior: smooth;
}
```

**주의**: 260721-E 3-A에서 `html`의 `scroll-behavior`를 제거했었다. 지금은 문서 스크롤이 부활했으므로 다시 넣는다. 이번엔 실제로 문서가 스크롤되므로 정상 작동한다.

### 조치 3-I — D2 구간 padding 이관

`@media (max-width: 1439px)` 블록에서 삭제된 `.about-scroll { padding: 0 110px 100px 0 }` 대신 `.about-page`에 지정한다.

```css
@media (max-width: 1439px) {
  .about-page {
    padding: 130px 110px 100px 0;
  }
  .about-header-shell {
    height: 86px;
  }
  /* 기존 .about-row column-gap, padding-bottom 등은 유지 */
}
```

### 조치 3-J — M 구간 조정

`@media (max-width: 1023px)` 블록:

```css
@media (max-width: 1023px) {
  .about-page {
    padding: 104px 20px 80px;
  }
  .about-header-shell {
    height: 72px;   /* 모바일 헤더 바 56 + 층 내비 16 여유 */
  }
  .about-nav {
    top: 60px;
    height: 32px;
  }
  /* .about-label top:84, background 유지 / .about-row scroll-margin-top:84 */
}
```

기존 M 구간의 `.about-scroll { top, padding }`은 삭제되었고, 그 역할을 `.about-page` padding이 대신한다.

---

## 4. 왜 이 구조가 버그를 해소하는가 (구현 시 참고)

- **이중 스크롤 컨테이너 제거**: `.about-page`가 더 이상 `overflow` 스크롤 컨테이너가 아니다. 스크롤 컨테이너는 문서(html/body) 하나뿐이다. iOS 히트 테스트 어긋남의 조건이 사라진다.
- **내비 소실 해소**: `.about-nav`가 `fixed`라 문서 스크롤·앵커 점프와 무관하게 항상 `top: 50px`에 고정된다. 클릭해도 사라지지 않는다.
- **앵커 점프 안전**: 문서 스크롤이므로 조상 `scrollTop` 강제 변경 문제가 없다. `scroll-margin-top`으로 착지 위치만 조정된다.

---

## 5. 검증

```
npx tsc --noEmit
```

CSS·JSX 구조 변경이므로 타입 오류는 없어야 한다.

`npm run dev`·`npm run build`는 실행하지 않는다.

---

## 6. 실행 후 육안 확인 (Claude Code 범위 밖)

**모바일 우선 확인:**

1. **About 층 내비 클릭 후에도 내비가 상단에 유지되는가** — 이번 수정의 1차 목표.
2. **모바일에서 스크롤을 오래 한 뒤 햄버거·프로젝트 터치가 정확한 위치에 반응하는가** — 2차 목표. About을 거친 뒤 WORKS로 가서도 확인.
3. **About에서 주소창이 스크롤에 반응하는가** — 반응이 정상(문서 스크롤 부활의 증거).
4. **WORKS는 여전히 주소창 무반응·물리 스크롤 정상인가** — WORKS를 건드리지 않았으므로 종전과 동일해야 함.

**데스크톱 확인:**

5. 헤더 셸이 스크롤된 본문을 완전히 가리는가.
6. sticky 라벨이 셸 아래(top 96px)에서 멈추는가.
7. 층 내비 클릭 시 스무스 스크롤로 이동하고 해당 층이 셸 아래 착지하는가.
8. 라벨 첫 줄과 본문 첫 줄 상단선 정렬(260721-D `margin-top: -3px`)이 유지되는가.
