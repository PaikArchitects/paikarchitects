# ABOUT 모바일 마감 및 스크롤 연동 내비 명세 (260722-D)

3건. 햄버거 언더라인 형태 · 라벨 사이드 라인 길이 · 스크롤 연동 불릿.

## 0. 범위와 제약

**수정 대상 파일 (이외 파일 수정 금지)**

- `src/app/globals.css` (수정)
- `src/components/SiteHeader.tsx` (수정 — 모바일 패널 링크 텍스트 래핑)
- `src/components/AboutNav.tsx` (수정 — IntersectionObserver 도입)
- `src/app/about/page.tsx` (수정 — 라벨 텍스트를 span으로 감싸 라인 높이 제어)

**금지 사항**

- 데스크톱 `.site-nav` 관련 로직·인트로·워드마크 변경 금지.
- `LandingExperience.tsx`, `ProjectWall.tsx`, `ContentArea.tsx`, `useRingWall.ts` 수정 금지.
- IntersectionObserver는 **`AboutNav.tsx`에만** 도입한다. 다른 파일에 관찰 API를 넣지 않는다.
- `npm run dev`, `npm run build` 실행 금지. 검증은 `npx tsc --noEmit`만.

### 0-1. IntersectionObserver 도입의 원칙적 근거

이 프로젝트는 "측정 반응형 패턴 금지"(getBoundingClientRect·ResizeObserver·스크롤 리스너로 레이아웃 결정 금지)를 원칙으로 한다. 그 취지는 **레이아웃 치수를 측정에 의존하지 않는 것**이며, 물리 엔진의 렌더 배칭 충돌을 막기 위함이다.

스크롤 연동 불릿은 레이아웃을 결정하지 않는다. 어느 층이 보이는지 관찰해 **불릿 위치라는 순수 시각 표시만** 갱신한다. 레이아웃 치수는 건드리지 않는다. IntersectionObserver는 경계 교차 시에만 콜백하므로 스크롤 리스너와 달리 매 프레임 돌지 않고 배칭과 무관하다.

따라서 이 도입은 원칙 위반이 아니라 **원칙의 적용 범위 밖**이다. 단, 오남용을 막기 위해 AboutNav 한 곳으로 국한한다.

---

## 1. 햄버거 패널 언더라인 — 데스크톱과 동일 형태로

### 배경

현재 모바일 패널 링크는 `display: block` + `padding: 14px 0`이라 밑줄이 패널 전폭에 그어지고 텍스트와 간격이 크다. 데스크톱은 텍스트 폭에만 밑줄이 붙는다(`border-bottom` + 텍스트 폭). 동일하게 만든다.

### 조치 1-A — `SiteHeader.tsx` 모바일 패널 링크 구조 변경

밑줄이 텍스트 폭에만 붙도록, 링크 안의 라벨을 `<span>`으로 감싸고 밑줄을 그 span에 건다.

기존:
```tsx
<Link
  key={label}
  href={href}
  onClick={() => setMenuOpen(false)}
  className={current ? 'mobile-menu-link is-current' : 'mobile-menu-link'}
  style={{
    display: 'block',
    padding: '14px 0',
    fontFamily: FONT,
    fontSize: 13,
    fontWeight: current ? 500 : 300,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    textDecoration: 'none',
    color: '#0a0908',
  }}
>
  {label}
</Link>
```

교체 후:
```tsx
<Link
  key={label}
  href={href}
  onClick={() => setMenuOpen(false)}
  className={current ? 'mobile-menu-link is-current' : 'mobile-menu-link'}
  style={{
    display: 'block',
    padding: '14px 0',
    fontFamily: FONT,
    fontSize: 13,
    fontWeight: current ? 500 : 300,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    textDecoration: 'none',
    color: '#0a0908',
  }}
>
  <span className="mobile-menu-label">{label}</span>
</Link>
```

`{label}`을 `<span className="mobile-menu-label">{label}</span>`으로 감싼다. 링크의 인라인 style은 그대로 둔다.

### 조치 1-B — `globals.css` 규칙 교체

260722-B에서 추가한 `.mobile-menu-link` / `.mobile-menu-link.is-current` 규칙을 **삭제**하고 다음으로 대체한다.

```css
/* 밑줄은 텍스트 폭에만 — 데스크톱 .site-nav-link와 동일 형태.
   링크가 display:block이라 밑줄을 링크가 아닌 내부 span에 건다. */
.mobile-menu-label {
  display: inline-block;
  border-bottom: 1px solid transparent;
  padding-bottom: 2px;
}

.mobile-menu-link.is-current .mobile-menu-label {
  border-bottom-color: currentColor;
}
```

밑줄이 `inline-block`인 span의 텍스트 폭에만 그어지고, `padding-bottom: 2px`으로 텍스트와의 간격이 데스크톱과 같아진다.

---

## 2. 라벨 사이드 라인 길이 — 대문자 높이에 맞춤

### 배경

데스크톱 `.about-label`의 `border-right`, 모바일의 `border-left`는 **요소 전체 높이**를 따라 그어진다. 라벨이 sticky 블록이고 line-height·padding을 포함하므로 라인이 글자보다 길다. 라인을 대문자 글자 높이(cap height)와 같거나 약간 크게 제한한다.

### 배경 — 왜 border로는 안 되는가

`border`는 요소 박스 높이를 따르므로 길이를 글자 높이로 줄일 수 없다. 라벨 텍스트를 `<span>`으로 감싸고, 그 span에 라인을 걸어 span의 높이(≈글자 높이)만큼만 그어지게 한다.

### 조치 2-A — `about/page.tsx` 라벨 텍스트 span 래핑

3개 `.about-label`의 텍스트를 각각 `<span className="about-label-text">`로 감싼다.

```tsx
<div className="about-label"><span className="about-label-text">Position</span></div>
<div className="about-label"><span className="about-label-text">Preoccupations</span></div>
<div className="about-label"><span className="about-label-text">Curriculum Vitae</span></div>
```

### 조치 2-B — `globals.css` 라인을 border에서 span으로 이관

**데스크톱 기본 규칙** `.about-label`에서 `border-right`·`padding-right`를 **제거한다.** `text-align: right`·`top`·`font-size` 등은 유지.

라인을 span에 건다.

```css
.about-label-text {
  display: inline-block;
  border-right: 1px solid rgba(8, 7, 6, 0.18);
  padding-right: 20px;
  line-height: 1;   /* 라인 길이를 글자 높이에 근접시킴 */
}
```

`line-height: 1`이 핵심이다. 이것이 span 높이를 글자 높이에 가깝게 만들어 라인이 짧아진다.

**주의**: `.about-label` 자체의 `line-height: 1.25`는 유지하되, 내부 span은 `line-height: 1`로 덮는다. 라벨이 2줄이 될 일은 없으므로(모두 1줄) 문제없다.

### 조치 2-C — M 구간 좌측 라인 이관

M 구간 `.about-label`에서 `border-left`·`padding-left`를 **제거**하고, span에 건다.

```css
@media (max-width: 1023px) {
  .about-label-text {
    border-right: none;
    border-left: 1px solid rgba(8, 7, 6, 0.18);
    padding-right: 0;
    padding-left: 12px;
  }
}
```

M 구간 `.about-label`의 `text-align: left`·`background` 등은 유지. border 관련만 span으로 옮긴다.

**주의**: `line-height: 1`은 기본 규칙의 `.about-label-text`에서 상속되므로 M 구간에 다시 쓰지 않는다.

---

## 3. 스크롤 연동 불릿 — IntersectionObserver

### 배경

현재 불릿은 클릭한 항목에 고정된다. 스크롤로 다른 층에 진입해도 갱신되지 않는다. 현재 화면에 보이는 층으로 불릿이 따라가야 한다.

### 조치 3-A — `AboutNav.tsx` 전면 교체

```tsx
'use client'

import { useEffect, useState } from 'react'

const ITEMS = [
  { id: 'position',       label: 'Position'         },
  { id: 'preoccupations', label: 'Preoccupations'   },
  { id: 'cv',             label: 'Curriculum Vitae' },
] as const

export function AboutNav() {
  const [active, setActive] = useState<string>('position')

  useEffect(() => {
    const sections = ITEMS
      .map(({ id }) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)

    if (sections.length === 0) return

    // 헤더 셸(86px) 아래를 판정 기준선으로. 화면 상단부에 걸친 섹션을 활성으로 본다.
    const observer = new IntersectionObserver(
      (entries) => {
        // 교차 중인 섹션 중 가장 위(문서 순서상 먼저)를 활성으로
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) {
          setActive(visible[0].target.id)
        }
      },
      {
        // 상단 96px(셸+여백) 지점을 기준선으로, 하단은 넉넉히 잘라
        // "상단에 막 진입한 섹션"이 활성이 되게 한다.
        rootMargin: '-96px 0px -60% 0px',
        threshold: 0,
      }
    )

    sections.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <nav className="about-nav">
      <div className="about-nav-row">
        {ITEMS.map(({ id, label }) => (
          <a
            key={id}
            href={`#${id}`}
            onClick={() => setActive(id)}
            className="about-nav-link"
            style={{ fontWeight: id === active ? 500 : 300 }}
          >
            <span
              className="about-nav-bullet"
              style={{ opacity: id === active ? 1 : 0 }}
            >
              ●
            </span>
            {label}
          </a>
        ))}
      </div>
    </nav>
  )
}
```

**동작 설명**:
- `rootMargin: '-96px 0px -60% 0px'` — 뷰포트 상단에서 96px 아래(헤더 셸 하단)를 판정 상단선으로, 하단 60%를 잘라 판정 영역을 화면 상부로 좁힌다. 이렇게 하면 "상단에 막 도달한 섹션"이 활성이 된다.
- `onClick`의 `setActive(id)`는 유지한다. 클릭 즉시 불릿이 반응하고, 스크롤이 끝나면 Observer가 같은 값으로 확정한다.
- 관찰 대상은 `#position`·`#preoccupations`·`#cv` 세 섹션. 이 id는 `about/page.tsx`의 `<section>`에 이미 부여되어 있다.

**주의**: 이 컴포넌트는 레이아웃 치수를 읽지 않는다. `boundingClientRect.top`을 쓰나 이는 정렬 순서 판정용이며 레이아웃 결정이 아니다. 원칙(0-1)에 부합한다.

### 조치 3-B — 다른 파일에 관찰 API 도입 금지 재확인

IntersectionObserver는 이 파일에만 존재해야 한다. `ContentArea`·`ProjectWall` 등에 파급하지 않는다.

---

## 4. 검증

```
npx tsc --noEmit
```

오류가 없어야 한다. `AboutNav.tsx`의 타입 가드 `(el): el is HTMLElement`가 정확해야 한다.

`npm run dev`·`npm run build`는 실행하지 않는다.

---

## 5. 실행 후 육안 확인 (Claude Code 범위 밖)

1. **햄버거 패널 현재 페이지 밑줄이 텍스트 폭에만, 데스크톱과 같은 간격으로 붙는가.**
2. **라벨 사이드 라인이 대문자 글자 높이와 같거나 약간 큰 정도인가** — 여전히 길면 `line-height: 1`이 span에 적용됐는지 확인.
3. **데스크톱 우측 라인·모바일 좌측 라인 모두 짧아졌는가.**
4. **스크롤 시 상단 내비 불릿이 현재 보이는 층으로 이동하는가** — Position→Preoccupations→CV 순으로 스크롤하며 불릿 추적 확인.
5. **불릿 이동이 너무 이르거나 늦지 않은가** — 어긋나면 `rootMargin`의 상단(-96px)·하단(-60%) 값을 조정. 상단값을 키우면 더 늦게, 하단 %를 키우면 더 이르게 전환된다.
6. **클릭 시에도 불릿이 정상 반응하는가** — 클릭 즉시 이동 후 스크롤 정착 시 유지.
