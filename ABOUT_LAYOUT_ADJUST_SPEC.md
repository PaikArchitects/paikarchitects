# ABOUT 레이아웃 조정 명세 (260721)

`ABOUT_PAGE_SPEC.md`로 구현된 About 페이지의 후속 조정. 3건.

## 0. 범위와 제약

**수정 대상 파일 (이외 파일 수정 금지)**

- `src/app/globals.css` (수정)

TSX·스키마·쿼리·타입은 **일절 수정하지 않는다.** 이번 조정은 전부 CSS로 처리된다.

**금지 사항**

- `src/components/ProjectWall.tsx` 수정 금지.
- `npm run dev`, `npm run build` 실행 금지. 검증은 `npx tsc --noEmit`만.
- 측정 반응형 패턴 금지.

---

## 1. 라벨 월 폭 — 프로젝트 월과 동일화

### 배경

`ProjectWall.tsx` 최하단 컨테이너의 폭은 다음과 같다.

```tsx
style={{
  width: 'clamp(300px, 28vw, 28vw)',
  ...
}}
```

기존 About 명세는 라벨 월을 `200px`(D1) / `160px`(D2)로 잡았다. 이를 프로젝트 월과 동일하게 맞춘다.

### 조치 — `globals.css`에 공용 토큰 신설

동일 값을 두 곳에 문자열로 복제하면 desync가 발생한다. 커스텀 프로퍼티로 단일화한다.

`globals.css`의 `/* ── Base ── */` 블록 안, `html { height: 100%; }` **바로 위**에 다음을 추가한다.

```css
/* 프로젝트 월 / About 라벨 월 공용 폭.
   ProjectWall.tsx의 인라인 width와 동일해야 한다.
   변경 시 ProjectWall.tsx도 이 변수를 참조하도록 함께 수정할 것. */
:root {
  --wall-width: clamp(300px, 28vw, 28vw);
}
```

### 조치 — About 그리드 열 폭 교체

`ABOUT PAGE` 블록에서 다음 4개 규칙의 첫 번째 열 값을 교체한다.

**D1 (미디어쿼리 밖, 기본 규칙)**

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

**D2 (`@media (max-width: 1439px)` 블록 안)**

기존의 `160px` 지정 3곳을 **전부 삭제한다.** `--wall-width`가 vw 기반이므로 D2에서 자동으로 축소되며, 별도 지정은 오히려 프로젝트 월과의 동기를 깬다.

삭제 대상:

```css
/* 삭제 */
.about-row {
  grid-template-columns: 160px 1fr 1fr;   ← 이 선언만 삭제. column-gap·padding-bottom은 유지
}
.about-row--wide {
  grid-template-columns: 160px 1fr;        ← 규칙 전체 삭제
}
.about-contact {
  grid-template-columns: 160px 1fr;        ← 이 선언만 삭제. column-gap은 유지
}
```

삭제 후 D2 블록은 다음과 같아야 한다.

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

`.about-row--wide` 규칙은 D2 블록에서 완전히 사라진다(기본 규칙의 `var(--wall-width) 1fr`이 그대로 적용된다).

M 구간(`max-width: 1023px`)은 `display: block`이므로 열 지정 자체가 무효다. 손대지 않는다.

---

## 2. 라벨 타이포그래피 — A2안 적용

### 배경

기존 라벨은 `11px / weight 500 / uppercase / letter-spacing 0.08em`이다. 이는 정보 슬라이드의 메타 라벨(TYPOLOGY·CLIENT 등) 문법인데, 그것은 값에 종속된 라벨이라 작아야 맞다. About의 3층 라벨은 종속 라벨이 아니라 섹션 제목이므로 다른 문법을 쓴다.

**대문자 변환을 버린다.** 소문자 혼용으로 전환한다.

### 조치 — `.about-label` 교체

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

기존 규칙에서 `text-transform: uppercase`를 **삭제**한다(속성 자체를 제거하는 것이지 `none`으로 덮어쓰는 것이 아니다).

### 조치 — M 구간 라벨 크기 조정

`@media (max-width: 1023px)` 블록의 `.about-label`에서 `font-size: 10px`를 `font-size: 16px`로 교체한다. 나머지 선언(`display`·`top`·`background`·`padding`·`margin-bottom`·`z-index`)은 유지한다.

### 조치 — 라벨 텍스트 확인

`src/app/about/page.tsx`의 라벨 텍스트는 이미 `Position`·`Preoccupations`·`Curriculum Vitae`(소문자 혼용)로 작성되어 있다. **TSX 수정은 불필요하다.** CSS에서 `text-transform`을 제거하는 것만으로 소문자 혼용이 표시된다.

`Curriculum<br />Vitae`의 `<br />`는 유지한다. 20px에서 300px 열에는 한 줄로 들어가지만, D2에서 열이 좁아질 때 강제 개행이 위계를 안정시킨다.

---

## 3. 문단 간격 — 데스크톱·모바일 공통 적용

### 배경

현재 문단 사이 간격(`margin-top: 14px`)과 영↔한 사이 간격(M 구간 `margin-top: 20px`)의 차이가 6px에 불과해 위계가 성립하지 않는다. 문단들이 하나의 텍스트 박스로 인지되지 않는다.

**데스크톱에도 적용한다.** 좌우 병치로 언어가 구분되더라도, 각 언어 블록 내부의 문단 응집도는 별개 문제다.

### 조치 — 문단 간격 축소

```css
.about-body-en p + p,
.about-body-ko p + p {
  margin-top: 10px;
}
```

기존 `14px`에서 교체한다.

### 조치 — PREOCCUPATIONS 항목 간격 조정

문단 간격이 10px로 줄었으므로, 항목 간 간격도 함께 조정해 위계를 유지한다.

```css
.about-preocc-item + .about-preocc-item {
  margin-top: 28px;
}
```

기존 `24px`에서 교체한다.

### 조치 — M 구간 영↔한 간격 확대

`@media (max-width: 1023px)` 블록에서:

```css
.about-body-ko {
  margin-top: 32px;
}
```

기존 `20px`에서 교체한다. 문단 간격 10px 대비 3.2배가 되어 언어 블록 경계가 명확해진다.

---

## 4. 검증

```
npx tsc --noEmit
```

CSS만 수정했으므로 타입 오류는 발생하지 않아야 한다. 오류가 나면 CSS 외 파일을 건드린 것이다.

`npm run dev`·`npm run build`는 실행하지 않는다.

---

## 5. 실행 후 육안 확인 사항 (Claude Code 범위 밖)

배포 후 다음을 확인한다.

1. D1에서 About 라벨 월 좌변이 WORKS 프로젝트 월 좌변과 정확히 같은 x좌표인가
2. D2(1024–1439px)에서 EN/KO 열이 읽을 수 있는 폭을 유지하는가 — 좁으면 `.about-page`의 좌우 padding을 24px로 더 줄이는 조치가 추가로 필요할 수 있다
3. 20px 라벨이 sticky로 밀려날 때 다음 라벨과 겹치지 않는가
