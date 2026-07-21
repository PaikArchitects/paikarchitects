# ABOUT 구조 정합 명세 (260721-C)

260721-B 4절(mask-image)이 배경까지 오려내 검은 영역을 만들었다. 롤백하고, About의 스크롤 구조를 WORKS와 동일한 형식으로 전환한다. 총 5건.

## 0. 범위와 제약

**수정 대상 파일 (이외 파일 수정 금지)**

- `src/app/globals.css` (수정)
- `src/app/about/page.tsx` (수정 — 래퍼 1겹 추가)

**금지 사항**

- `LandingExperience.tsx`, `ProjectWall.tsx`, `ContentArea.tsx`, `SiteHeader.tsx` 수정 금지. 260721-B에서 변경한 `INFO_SLIDE_W = 240`, `TITLE_SET_MIN_H = 175`는 그대로 둔다.
- `mask-image`·`mask-attachment`·`-webkit-mask-*` 계열 속성을 **어떤 요소에도 사용하지 않는다.**
- `npm run dev`, `npm run build` 실행 금지. 검증은 `npx tsc --noEmit`만.
- 측정 반응형 패턴 금지.

---

## 1. 마스크 전량 제거 (롤백)

### 배경

마스크는 요소를 **오려내는** 도구이므로 배경 흰색까지 함께 사라져 body의 `#080706`이 노출됐다. `mask-size: 100% 100vh` + `no-repeat` 탓에 100vh를 넘는 구간은 전부 잘려 하단이 검게 뚫렸다.

### 조치 1-A — `.about-page` 기본 규칙에서 마스크 선언 삭제

다음 8개 선언을 **전부 삭제한다.**

```
-webkit-mask-image
mask-image
-webkit-mask-repeat
mask-repeat
-webkit-mask-size
mask-size
-webkit-mask-attachment
mask-attachment
```

### 조치 1-B — M 구간 마스크 선언 삭제

`@media (max-width: 1023px)` 블록의 `.about-page`에서 `-webkit-mask-image`·`mask-image` 선언을 삭제한다.

---

## 2. 스크롤 구조 전환 — WORKS와 동일 형식

### 배경 — WORKS의 실제 구조

`LandingExperience.tsx` 최상위는 다음과 같다.

```tsx
<div style={{
  background: '#FFFFFF',
  width: '100vw',
  height: '100vh',
  overflow: 'hidden',
  position: 'relative',
}}>
```

**문서 자체가 스크롤되지 않는다.** 프로젝트 월은 그 안에서 자체 물리 엔진으로 카드를 움직이며, 월 컨테이너에도 `overflow: hidden`이 걸려 있어 카드가 밖으로 나가지 못한다. 필터 바(`position: absolute; top: 50`)에 배경이 없는 이유도 이것이다 — 콘텐츠가 헤더 영역에 **도달할 경로 자체가 없다.**

About도 같은 구조로 전환한다. 헤더를 흰 판으로 덮는 것이 아니라, 스크롤 영역을 헤더 아래로 한정해 침범 자체를 차단한다.

### 조치 2-A — `about/page.tsx`에 스크롤 래퍼 추가

기존 구조:
```tsx
<div className="about-page">
  <div className="about-inner">
    <nav className="about-nav">...</nav>
    <section className="about-row" id="position">...</section>
    ...
  </div>
</div>
```

교체 후 — `.about-nav`를 스크롤 영역 **밖으로** 빼고, 본문만 `.about-scroll`로 감싼다:
```tsx
<div className="about-page">
  <nav className="about-nav">
    <div className="about-nav-row">
      <a href="#position" className="about-nav-link">Position</a>
      <a href="#preoccupations" className="about-nav-link">Preoccupations</a>
      <a href="#cv" className="about-nav-link">Curriculum Vitae</a>
    </div>
  </nav>

  <div className="about-scroll">
    <div className="about-inner">
      <section className="about-row" id="position">...</section>
      <section className="about-row" id="preoccupations">...</section>
      <section className="about-row about-row--wide" id="cv">...</section>
      {contact && <div className="about-contact">...</div>}
    </div>
  </div>
</div>
```

**중요**: `.about-nav`는 `.about-scroll` 바깥에 있어야 한다. 안에 있으면 함께 스크롤된다.

260721-B에서 넣은 `<div className="about-header-shell" />`이 있다면 **삭제한다**(이번 구조에서 불필요).

### 조치 2-B — `.about-page` 규칙 교체

```css
/* WORKS(LandingExperience.tsx)와 동일 — 문서 스크롤 없음.
   콘텐츠가 헤더 영역에 도달할 경로 자체를 차단한다. */
.about-page {
  position: relative;
  background: #FFFFFF;
  color: #080706;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
```

기존의 `min-height`, `padding`을 **전부 삭제한다.** padding은 `.about-scroll`이 갖는다.

### 조치 2-C — `.about-scroll` 신규

```css
/* 실제 스크롤 영역 — 헤더 존(0~110px) 아래에서 시작.
   sticky 라벨의 스크롤 컨테이너가 된다. */
.about-scroll {
  position: absolute;
  top: 110px;
  left: 0;
  right: 0;
  bottom: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 173px 120px 0;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.about-scroll::-webkit-scrollbar {
  display: none;
}
```

`padding-right: 173px`은 4절(본문 폭 90%)에서 산출한 값이다. `padding-left: 0`은 라벨 월 좌변을 프로젝트 월 좌변과 맞추기 위함이다.

### 조치 2-D — `.about-label` top 원복

sticky 컨테이너가 `.about-scroll`이 되었으므로 `top`은 스크롤 영역 내부 기준이다. 헤더 오프셋을 더할 필요가 없다.

```css
.about-label {
  top: 24px;
}
```

M 구간:
```css
.about-label {
  top: 12px;
}
```

M 구간 `.about-label`의 `background: #FFFFFF`는 유지한다(본문이 라벨 뒤로 지나가므로 필요).

### 조치 2-E — `scroll-margin-top` 조정

앵커 점프는 `.about-scroll` 내부에서 일어난다. 헤더 오프셋이 이미 `top: 110px`으로 반영되었으므로 여유만 준다.

```css
.about-row {
  scroll-margin-top: 24px;
}
```

M 구간:
```css
.about-row {
  scroll-margin-top: 12px;
}
```

### 조치 2-F — M 구간 `.about-scroll` 조정

```css
@media (max-width: 1023px) {
  .about-scroll {
    top: 92px;              /* 모바일 헤더 바 56px + 층 내비 36px */
    padding: 0 20px 80px;   /* 라벨 월이 없으므로 좌우 대칭 */
  }
}
```

### 조치 2-G — D2 구간 `.about-scroll` 조정

```css
@media (max-width: 1439px) {
  .about-scroll {
    padding: 0 110px 100px 0;
  }
}
```

기존 D2 블록의 `.about-page` padding 선언은 삭제한다.

---

## 3. 층 내비 중앙 정렬

### 배경

현재 `.about-nav`는 좌측 정렬이고 `top: 68px`라 헤더 내비(ABOUT/WORKS/ESSAYS/CONTACTS)와 겹친다.

WORKS 필터 바의 중앙 정렬 방식을 따른다: `left: 0; right: 0` 컨테이너 + **내부 행 `margin: 0 auto`**. `justify-content: center`를 쓰지 않는 이유는 좁은 폭 가로 스크롤 시 좌측 항목이 잘리기 때문이다.

### 조치 3-A — `.about-nav` 규칙 교체

기존 `.about-nav` 규칙을 **전량 삭제**하고 대체한다.

```css
/* 층 내비 — WORKS 필터 바(top:50)와 동일 문법.
   .about-scroll 바깥에 있으므로 스크롤되지 않는다. */
.about-nav {
  position: absolute;
  top: 82px;
  left: 0;
  right: 0;
  height: 24px;
  z-index: 50;
  display: flex;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
  touch-action: pan-x;
}

.about-nav::-webkit-scrollbar {
  display: none;
}

.about-nav-row {
  display: flex;
  align-items: center;
  gap: 28px;
  margin: 0 auto;
  flex-shrink: 0;
}
```

`position: fixed`가 아니라 `absolute`다. 부모 `.about-page`가 `position: relative`이고 화면 전체를 덮으므로 결과가 동일하며, WORKS 필터 바와 같은 방식이다.

`gap: 28px`는 WORKS 필터 바와 동일한 값이다.

### 조치 3-B — `.about-nav-link`에 nowrap 추가

```css
.about-nav-link {
  font-size: 11px;
  font-weight: 300;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-decoration: none;
  white-space: nowrap;
  color: rgba(8, 7, 6, 0.55);
  transition: color 0.2s ease-out;
}

.about-nav-link:hover {
  color: #080706;
}
```

### 조치 3-C — M 구간 내비 조정

기존 M 구간 `.about-nav` 규칙을 교체한다.

```css
@media (max-width: 1023px) {
  .about-nav {
    top: 60px;
    height: 32px;
  }

  .about-nav-row {
    gap: 18px;
    padding: 0 16px;
  }

  .about-nav-link {
    font-size: 10px;
  }
}
```

`overflow-x`와 스크롤바 숨김은 기본 규칙에서 상속되므로 다시 쓰지 않는다.

### 조치 3-D — `html { scroll-behavior: smooth }` 유지

260721-B에서 `html` 규칙에 추가한 `scroll-behavior: smooth`는 그대로 둔다. `.about-scroll` 내부 앵커 점프에도 적용된다.

---

## 4. 본문 폭 90% 축소

### 배경

현재 EN/KO 열이 각각 600px대로 한 줄이 지나치게 길다. 90%로 줄인다. **라벨 월 폭(`--wall-width`)은 프로젝트 월과 동일해야 하므로 건드리지 않는다.**

1920px 기준 산출:
- 현재 본문 영역 = 1920 − 538(라벨 월) − 44(우 padding) − 48(gap) = 1290px
- 90% = 1161px → 추가 여백 129px → 우 padding 44 + 129 = 173px

이 값은 조치 2-C의 `.about-scroll { padding: 0 173px 120px 0 }`에 이미 반영되어 있다. **별도 조치 불필요.**

D2는 조치 2-G의 `110px`에 반영되어 있다.

---

## 5. `.about-inner` 정리

`.about-inner`는 조치 2-A 이후 `.about-scroll` 안에 있으며 폭 제한이 없어야 한다.

```css
.about-inner {
  width: 100%;
}
```

기존에 `max-width`가 남아 있다면 삭제한다.

---

## 6. 검증

```
npx tsc --noEmit
```

오류가 없어야 한다.

`npm run dev`·`npm run build`는 실행하지 않는다.

---

## 7. sticky 동작에 관한 기술 주석 (구현 시 확인)

`.about-page`가 `overflow: hidden`이고 `.about-label`이 sticky다. 일반적으로 `overflow: hidden` 조상은 sticky를 무력화하지만, 여기서는 sticky 요소와 `.about-page` 사이에 `.about-scroll`(`overflow-y: auto`)이 있다. sticky의 스크롤 컨테이너는 **가장 가까운 스크롤 가능 조상**이므로 `.about-scroll`이 되고 정상 작동한다.

`.about-scroll`에 `overflow-x: hidden`을 준 것은 가로 스크롤 방지 목적이며, 세로가 `auto`이므로 sticky에 영향이 없다.

---

## 8. 실행 후 육안 확인 사항 (Claude Code 범위 밖)

1. **검은 영역이 완전히 사라졌는가** — 남아 있으면 마스크 선언이 잔존한 것이다.
2. **스크롤 시 본문이 헤더 존(0~110px)에 진입하지 않는가** — 진입한다면 `.about-nav`가 `.about-scroll` 안에 들어간 것이다.
3. **sticky 라벨이 스크롤 영역 상단에서 멈추고 다음 라벨에 밀려나는가**
4. **층 내비 3항목이 화면 정중앙에 오는가** — 헤더 내비와 수직으로 겹치지 않는가.
5. **본문 한 줄 길이가 읽을 만한가** — 여전히 길면 `.about-scroll`의 `padding-right`를 더 늘린다.
6. **앵커 클릭 시 해당 층이 스크롤 영역 상단에 착지하는가**
7. **CV 층 끝까지 스크롤이 도달하는가** — `.about-scroll`의 `padding-bottom: 120px`이 충분한가.
8. **WORKS 화면이 260721-B 이후 정상인가** — 모프 궤적, AWARDS 시작 y. 이번 명세는 WORKS를 건드리지 않으나 이전 변경분 확인이 남아 있다.
