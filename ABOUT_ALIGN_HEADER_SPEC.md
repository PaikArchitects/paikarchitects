# ABOUT 수직 정렬 및 헤더 내비 현재 페이지 표시 명세 (260721-D)

3건. About 2건 + 전역 헤더 1건.

## 0. 범위와 제약

**수정 대상 파일 (이외 파일 수정 금지)**

- `src/app/globals.css` (수정)
- `src/components/SiteHeader.tsx` (수정 — 데스크톱 내비 링크에 현재 페이지 판정 추가)

`about/page.tsx`는 수정하지 않는다.

**금지 사항**

- `SiteHeader.tsx`에서 수정 허용 범위는 **데스크톱 `<nav className="site-nav">` 블록의 `<Link>` 렌더 부분뿐이다.** 워드마크, 모바일 햄버거, 스크림, 모바일 패널, `NAV_ITEMS` 배열, `STATIC_LIGHT_PATHS`, `isStaticLight`, 인트로 관련 로직은 일절 손대지 않는다.
- `LandingExperience.tsx`, `ProjectWall.tsx`, `ContentArea.tsx` 수정 금지.
- `npm run dev`, `npm run build` 실행 금지. 검증은 `npx tsc --noEmit`만.
- 측정 반응형 패턴 금지.

---

## 1. 층 내비 수직 위치 — WORKS 필터 바와 일치

### 배경

`LandingExperience.tsx`의 필터 바는 다음과 같다.

```tsx
<div style={{
  position: 'absolute',
  top: 50,
  left: 0,
  right: 0,
  height: 24,
  ...
}}>
```

About의 `.about-nav`는 현재 `top: 82px`이며 WORKS보다 32px 아래에 있다.

### 조치 1-A — `.about-nav`의 top 교체

```css
.about-nav {
  top: 50px;
}
```

기존 `top: 82px`를 교체한다. 나머지 선언(`position`·`left`·`right`·`height`·`z-index`·`display`·`overflow`·스크롤바 숨김·`touch-action`)은 그대로 둔다.

### 조치 1-B — `.about-scroll` 상단 오프셋 재계산

내비가 32px 위로 올라갔으므로 스크롤 영역 시작점도 함께 올린다.

기존 `.about-scroll { top: 110px }` → 다음으로 교체:

```css
.about-scroll {
  top: 86px;   /* 내비 top 50 + 높이 24 + 여백 12 */
}
```

### 조치 1-C — M 구간 확인

M 구간(`max-width: 1023px`)의 `.about-nav { top: 60px }`는 모바일 헤더 바(56px) 바로 아래이므로 **변경하지 않는다.** WORKS 모바일은 필터 바가 아니라 월 칩 행이 전담하므로 비교 대상이 없다.

M 구간 `.about-scroll { top: 92px }`도 그대로 둔다(60 + 32 = 92).

---

## 2. 라벨 상단 정렬 및 sticky 정지점

### 배경

두 개의 별개 문제가 있다.

**문제 A — 초기 상단선 어긋남.** 라벨은 20px / line-height 1.25, 본문은 14px / line-height 1.75다. `align-items: start`로 상단 정렬되어 있으나 폰트 크기 차이로 첫 줄의 시각적 상단선이 어긋난다. 20px 폰트의 half-leading은 (25 − 20)/2 = 2.5px, 14px 폰트는 (24.5 − 14)/2 = 5.25px이므로 라벨이 본문보다 약 2.75px 위에 있어야 정상인데, 실제로는 아래로 보인다. 이는 Pretendard의 ascender 비율이 개입한 결과다.

**문제 B — sticky 정지점.** 현재 `top: 24px`라 스크롤 시 라벨이 스크롤 영역 상단에서 24px 아래에 멈춘다. 스크롤 영역 최상단에 붙어야 한다.

### 조치 2-A — sticky 정지점을 0으로

```css
.about-label {
  top: 0;
}
```

기본 규칙의 `top: 24px`를 교체한다.

M 구간의 `top: 12px`도 `top: 0`으로 교체한다.

### 조치 2-B — 초기 상단선 보정

`.about-label`에 다음을 추가한다.

```css
.about-label {
  /* 20px 라벨과 14px 본문의 첫 줄 시각적 상단선을 맞춘다.
     폰트 메트릭 의존값이므로 육안 확인 후 조정 대상. */
  margin-top: -3px;
}
```

**이 값은 추정이다.** 배포 후 라벨이 본문보다 위로 튀어나오면 값을 줄이고(예: -1px), 여전히 아래면 늘린다(예: -5px).

M 구간은 라벨이 16px이고 본문 위에 블록으로 놓이므로 보정이 불필요하다. M 구간 `.about-label`에 `margin-top: 0`을 명시해 상속을 차단한다.

```css
@media (max-width: 1023px) {
  .about-label {
    margin-top: 0;
  }
}
```

### 조치 2-C — sticky 배경 확인

기본 규칙(D1·D2)의 `.about-label`에는 배경이 없다. `top: 0`이 되면 라벨이 스크롤 영역 최상단에 붙는데, 본문이 그 뒤로 지나가지 않으므로(좌우 별개 열) 배경이 불필요하다. **추가하지 않는다.**

M 구간의 `background: #FFFFFF`는 본문이 라벨 뒤로 지나가므로 유지한다.

---

## 3. 헤더 내비 현재 페이지 언더라인

### 배경

`SiteHeader.tsx`의 모바일 패널은 이미 현재 페이지를 판정하고 있다.

```tsx
const current = pathname === href || (href === '/work' && pathname.startsWith('/work'))
```

데스크톱 내비(`<nav className="site-nav">`)에는 이 판정이 없다. 동일 로직을 적용한다.

### 조치 3-A — `SiteHeader.tsx` 데스크톱 내비 수정

기존:
```tsx
{NAV_ITEMS.map(({ label, href }) => (
  <Link
    key={label}
    href={href}
    className="site-nav-link"
    style={{ color: navOnLight ? '#0a0908' : '#ffffff' }}
  >
    {label}
  </Link>
))}
```

교체 후:
```tsx
{NAV_ITEMS.map(({ label, href }) => {
  const current = pathname === href || (href === '/work' && pathname.startsWith('/work'))
  return (
    <Link
      key={label}
      href={href}
      className={current ? 'site-nav-link is-current' : 'site-nav-link'}
      style={{ color: navOnLight ? '#0a0908' : '#ffffff' }}
    >
      {label}
    </Link>
  )
})}
```

**주의**: 모바일 패널의 동일 로직은 이미 존재하므로 건드리지 않는다. `current` 변수명이 두 곳에서 쓰이나 스코프가 분리되어 충돌하지 않는다.

### 조치 3-B — `globals.css`에 현재 페이지 스타일 추가

기존 `.site-nav-link:hover` 규칙 **바로 아래**에 추가한다.

```css
/* 현재 보고 있는 페이지 표시 — 호버 밑줄(text-decoration)과 구분하기 위해
   border-bottom을 쓴다. 둘이 같은 속성이면 현재 페이지에서 호버 피드백이 사라진다. */
.site-nav-link.is-current {
  border-bottom: 1px solid currentColor;
  padding-bottom: 2px;
}
```

`currentColor`를 쓰므로 `navOnLight` 인라인 color 전환에 자동으로 따라간다. 별도 색상 지정이 불필요하다.

### 조치 3-C — 랜딩(`/`)에서의 동작

`NAV_ITEMS`에 `/`가 없으므로 랜딩에서는 어느 항목에도 밑줄이 생기지 않는다. 이것이 의도된 동작이다 — 랜딩은 내비 항목이 아니라 워드마크(ACP)가 대표한다.

`/work`와 `/work/[slug]`는 `startsWith('/work')` 판정으로 둘 다 WORKS에 밑줄이 붙는다.

---

## 4. 검증

```
npx tsc --noEmit
```

오류가 없어야 한다. `SiteHeader.tsx`는 map 콜백을 화살표 함수 본문으로 바꾸는 변경이므로 `return`을 빠뜨리면 타입 오류가 난다.

`npm run dev`·`npm run build`는 실행하지 않는다.

---

## 5. 실행 후 육안 확인 사항 (Claude Code 범위 밖)

1. **About 층 내비와 WORKS 필터 바의 수직 위치가 일치하는가** — 두 페이지를 번갈아 열어 확인한다.
2. **라벨 첫 줄과 본문 첫 줄의 상단선이 맞는가** — 어긋나면 `.about-label`의 `margin-top` 값을 조정한다(현재 -3px).
3. **스크롤 시 라벨이 스크롤 영역 최상단에 붙는가** — 내비 아래 여백 없이 정확히 붙어야 한다.
4. **헤더 내비 밑줄이 현재 페이지에만 표시되는가** — `/about`, `/work`, `/work/[slug]`, `/essays`, `/contact`, `/` 전부 확인.
5. **밑줄이 다크 배경(랜딩 인트로)에서도 흰색으로 보이는가** — `currentColor`가 정상 작동하는지.
6. **호버 시 밑줄(text-decoration)이 border-bottom과 별개로 나타나는가** — 현재 페이지에서 호버하면 두 줄이 겹쳐 보일 수 있다. 어색하면 `.site-nav-link.is-current:hover { text-decoration: none }` 추가를 검토한다.
