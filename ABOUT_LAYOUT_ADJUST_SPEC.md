# ABOUT 레이아웃 조정 명세 (260721)

`ABOUT_PAGE_SPEC.md`로 구현된 About 페이지의 후속 조정. 4건.

## 0. 범위와 제약

**수정 대상 파일 (이외 파일 수정 금지)**

- `src/app/globals.css` (수정)
- `src/components/ProjectWall.tsx` (수정 — 인라인 width 1줄만)

TSX 중 `about/page.tsx`, 스키마·쿼리·타입은 **일절 수정하지 않는다.**

**금지 사항**

- `ProjectWall.tsx`에서 수정 허용 범위는 **최하단 컨테이너의 `width` 값 한 줄뿐이다.** 물리 엔진(`useRingWall`), 슬롯 계산, 티어 상수, 셔플, 필터 시퀀스는 일절 손대지 않는다.
- `npm run dev`, `npm run build` 실행 금지. 검증은 `npx tsc --noEmit`만.
- 측정 반응형 패턴 금지.

---

## 1. 월 폭 토큰 신설 및 단일화

### 배경

`ProjectWall.tsx` 최하단 컨테이너의 폭은 다음과 같다.

```tsx
style={{
  width: 'clamp(300px, 28vw, 28vw)',
  ...
}}
```

About 라벨 월을 이와 동일하게 맞춘다. 다만 동일 값을 두 곳에 문자열로 복제하면 desync가 발생하므로, CSS 커스텀 프로퍼티로 단일화하고 **양쪽이 모두 그것을 참조**하게 한다.

### 조치 1-A — `globals.css`에 토큰 신설

`/* ── Base ── */` 블록 안, `html { height: 100%; }` **바로 위**에 추가한다.

```css
/* 프로젝트 월(WORKS) / 라벨 월(About) 공용 폭 — 두 지면의 좌변이 일치해야 한다.
   ProjectWall.tsx와 .about-row 계열이 모두 이 변수를 참조한다.
   clamp의 선호값과 상한이 같아 실질적으로 max(300px, 28vw)로 동작한다. */
:root {
  --wall-width: clamp(300px, 28vw, 28vw);
}
```

### 조치 1-B — `ProjectWall.tsx` 인라인 값 교체

파일 최하단 `ProjectWall` 컴포넌트의 return 문 안, `ref={ring.containerRef}` 를 가진 `<div>`의 style 객체에서 다음 한 줄만 교체한다.

교체 전:
```tsx
width: 'clamp(300px, 28vw, 28vw)',
```

교체 후:
```tsx
width: 'var(--wall-width)',
```

**동일 파일 내 다른 어떤 것도 변경하지 않는다.** 특히 `height`, `flexShrink`, `overflow`, `touchAction`, `boxSizing`은 그대로 둔다.

### 조치 1-C — About 그리드 열 폭 교체

`ABOUT PAGE` 블록의 기본 규칙(미디어쿼리 밖) 3곳:

```css
.about-row {
  grid-template-columns: var(--wall-width) 1fr 1fr;
}

.about-row--wide {
  grid-template-columns: var(--wall-width) 1fr;
}

.about-contact {
  grid-template-columns: var(--wall-width) 1fr;
}
```

기존 `200px` 지정을 전부 이것으로 교체한다.

### 조치 1-D — D2 블록에서 고정 폭 지정 삭제

`@media (max-width: 1439px)` 블록에서 `160px` 지정을 **전부 삭제한다.** `--wall-width`가 vw 기반이므로 D2에서 자동 축소되며, 별도 지정은 프로젝트 월과의 동기를 깬다.

삭제 후 D2 블록은 정확히 다음과 같아야 한다.

```css
@media (max-width: 1439px) {
  .about-page {
    padding: 120px 32px 100px;
  }
  .about-row {
    column-gap: 32px;
    padding-bottom: 96px;
  }
  .about-contact {
    column-gap: 32px;
  }
  .about-cv-venue {
    grid-template-columns: 1fr 200px 56px;
  }
  /* 라벨 월이 300px을 점유하므로 EN/KO 열 폭 보상 */
  .about-body-en,
  .about-body-ko {
    font-size: 13px;
  }
}
```

`.about-row--wide` 규칙은 D2 블록에서 완전히 사라진다(기본 규칙이 그대로 적용된다).

M 구간(`max-width: 1023px`)은 `display: block`이므로 열 지정이 무효다. 손대지 않는다.

---

## 2. 라벨 타이포그래피 — A2안 적용

### 배경

기존 라벨은 `11px / weight 500 / uppercase / letter-spacing 0.08em`이다. 이는 정보 슬라이드의 메타 라벨(TYPOLOGY·CLIENT 등) 문법인데, 그것은 값에 종속된 라벨이라 작아야 맞다. About의 3층 라벨은 종속 라벨이 아니라 섹션 제목이므로 다른 문법을 쓴다.

**대문자 변환을 버린다.** 소문자 혼용으로 전환한다.

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
}
```

기존 규칙에서 `text-transform: uppercase`를 **삭제**한다(속성 자체 제거이지 `none`으로 덮어쓰는 것이 아니다).

### 조치 2-B — M 구간 라벨 크기

`@media (max-width: 1023px)` 블록의 `.about-label`에서 `font-size: 10px`를 `font-size: 16px`로 교체한다. 나머지 선언(`display`·`top`·`background`·`padding`·`margin-bottom`·`z-index`)은 유지한다.

### 조치 2-C — TSX 수정 불필요

`src/app/about/page.tsx`의 라벨 텍스트는 이미 `Position`·`Preoccupations`·`Curriculum Vitae`(소문자 혼용)로 작성되어 있다. CSS에서 `text-transform`을 제거하는 것만으로 소문자 혼용이 표시된다. **`about/page.tsx`를 열지 말 것.**

`Curriculum<br />Vitae`의 `<br />`는 그대로 둔다.

---

## 3. 문단 간격 — 데스크톱·모바일 공통

### 배경

문단 사이 간격(`14px`)과 M 구간 영↔한 간격(`20px`)의 차이가 6px에 불과해 위계가 성립하지 않는다. 데스크톱에도 적용한다 — 좌우 병치로 언어가 구분되더라도 각 언어 블록 내부의 문단 응집도는 별개 문제다.

### 조치 3-A — 문단 간격 축소

```css
.about-body-en p + p,
.about-body-ko p + p {
  margin-top: 10px;
}
```

기존 `14px`에서 교체.

### 조치 3-B — PREOCCUPATIONS 항목 간격 확대

문단 간격이 줄었으므로 항목 간 간격을 늘려 위계를 유지한다.

```css
.about-preocc-item + .about-preocc-item {
  margin-top: 28px;
}
```

기존 `24px`에서 교체.

### 조치 3-C — M 구간 영↔한 간격 확대

`@media (max-width: 1023px)` 블록에서:

```css
.about-body-ko {
  margin-top: 32px;
}
```

기존 `20px`에서 교체. 문단 간격 10px 대비 3.2배가 되어 언어 블록 경계가 명확해진다.

---

## 4. 검증

```
npx tsc --noEmit
```

오류가 없어야 한다. `ProjectWall.tsx`는 문자열 리터럴 교체이므로 타입에 영향이 없다. 오류가 난다면 허용 범위를 벗어난 수정을 한 것이다.

`npm run dev`·`npm run build`는 실행하지 않는다.

---

## 5. 실행 후 육안 확인 사항 (Claude Code 범위 밖)

배포 후 다음을 확인한다.

1. **WORKS 프로젝트 월이 종전과 동일한 폭인가** — `var(--wall-width)`가 해석되지 않으면 width가 auto가 되어 월이 무너진다. 이것이 이번 변경의 최대 위험이다.
2. D1에서 About 라벨 월 좌변이 프로젝트 월 좌변과 같은 x좌표인가
3. D2(1024–1439px)에서 EN/KO 열이 읽을 수 있는 폭을 유지하는가 — 좁으면 `.about-page` 좌우 padding을 24px로 더 줄이는 조치가 추가로 필요할 수 있다
4. 20px 라벨이 sticky로 밀려날 때 다음 라벨과 겹치지 않는가
