# ABOUT 내비 인터랙션 및 CV 정렬 명세 (260721-E)

4건.

## 0. 범위와 제약

**수정 대상 파일 (이외 파일 수정 금지)**

- `src/app/globals.css` (수정)
- `src/app/about/page.tsx` (수정 — 내비를 클라이언트 컴포넌트로 분리)
- `src/components/AboutNav.tsx` (신규)

`SiteHeader.tsx`는 **수정하지 않는다**(1절은 CSS만으로 해결된다).

**금지 사항**

- `LandingExperience.tsx`, `ProjectWall.tsx`, `ContentArea.tsx`, `SiteHeader.tsx` 수정 금지.
- 스크롤 위치 측정 금지. `IntersectionObserver`·스크롤 리스너·`getBoundingClientRect`를 쓰지 않는다. 활성 항목은 **클릭 상태로만** 판정한다.
- `npm run dev`, `npm run build` 실행 금지. 검증은 `npx tsc --noEmit`만.

---

## 1. 헤더 내비 밑줄 — 두 상태를 같은 속성으로 통일

### 배경

현재 페이지는 `border-bottom`, 호버는 `text-decoration: underline`이다. 두 선은 **위치를 결정하는 기준이 다르므로 원리적으로 일치할 수 없다.**

- `text-decoration`은 폰트가 정의한 밑줄 위치·두께를 따르고, 텍스트 글리프 폭에 그어진다
- `border-bottom`은 요소 박스 하단에 그어지고 `padding-bottom`만큼 밀린다

`letter-spacing: 0.08em`이 적용되어 있어 길이도 어긋난다. `text-decoration`은 마지막 글자 뒤 letter-spacing 여백까지 포함하지만 `border-bottom`은 박스 폭 전체를 긋는다.

따라서 한쪽을 끄는 것으로는 해결되지 않는다. **두 상태를 모두 `border-bottom`으로 통일한다.**

### 조치 1-A — `.site-nav-link` 규칙 수정

기존 규칙에서 `text-decoration: none`은 유지하고, 밑줄 자리를 투명으로 미리 확보한다.

```css
.site-nav-link {
  font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif;
  font-weight: 300;
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-decoration: none;
  border-bottom: 1px solid transparent;
  padding-bottom: 2px;
  transition: color 0.3s ease-out, border-bottom-color 0.3s ease-out;
}
```

`border-bottom`을 투명으로 항상 두므로 상태 전환 시 레이아웃이 흔들리지 않는다.

### 조치 1-B — 호버·현재 페이지 규칙 통합

기존 `.site-nav-link:hover` 규칙과 `.site-nav-link.is-current` 규칙을 **둘 다 삭제**하고 다음 하나로 대체한다.

```css
/* 호버와 현재 페이지가 같은 표현을 쓴다 — 서로 다른 속성이면 위치·길이가 어긋난다.
   현재 페이지에서 호버해도 변화가 없는 것은 의도된 동작이다(클릭해도 이동이 없으므로). */
.site-nav-link:hover,
.site-nav-link.is-current {
  border-bottom-color: currentColor;
}
```

**삭제 대상 확인** — 다음 두 규칙이 `globals.css`에 잔존하지 않아야 한다.

```css
/* 삭제 */
.site-nav-link:hover {
  text-decoration: underline;
}

/* 삭제 */
.site-nav-link.is-current {
  border-bottom: 1px solid currentColor;
  padding-bottom: 2px;
}
```

`SiteHeader.tsx`는 수정하지 않는다. `is-current` 클래스 부여는 260721-D에서 이미 구현되었다.

---

## 2. 층 내비 불릿 — WORKS 필터와 동일 문법

### 배경

`LandingExperience.tsx` 필터 버튼의 구조는 다음과 같다.

```tsx
<button style={{
  fontWeight: t === activeFilter ? 500 : 300,
  display: 'flex', alignItems: 'center', gap: 6,
  ...
}}>
  <span style={{
    fontSize: 7, lineHeight: 1,
    opacity: t === activeFilter ? 1 : 0,
    transition: 'opacity 200ms',
  }}>●</span>
  {t}
</button>
```

불릿은 **항상 렌더되고 opacity만 전환**한다. 이래야 활성 전환 시 레이아웃 폭이 흔들리지 않는다. About도 동일하게 한다.

### 배경 — 활성 판정 방식

WORKS 필터는 클릭이 곧 상태 변경이지만, 층 내비는 스크롤 위치에 따라 활성 항목이 정해지는 것이 자연스럽다. 그러나 스크롤 위치 판정은 측정이 필요하므로 금지 원칙에 걸린다.

**클릭한 항목을 활성으로 기억하는 방식**을 쓴다. 초기값은 첫 항목(`position`)이다. 앵커 내비의 통상적 동작이며 측정이 불필요하다.

### 조치 2-A — `src/components/AboutNav.tsx` 신규

```tsx
'use client'

import { useState } from 'react'

const ITEMS = [
  { id: 'position',       label: 'Position'         },
  { id: 'preoccupations', label: 'Preoccupations'   },
  { id: 'cv',             label: 'Curriculum Vitae' },
] as const

export function AboutNav() {
  const [active, setActive] = useState<string>('position')

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

`onClick`은 기본 앵커 동작을 막지 않는다(`preventDefault` 없음). 브라우저가 앵커 점프를 처리하고, 상태는 시각 표시용으로만 쓴다.

### 조치 2-B — `about/page.tsx`에서 내비 교체

기존 인라인 `<nav className="about-nav">...</nav>` 블록을 **전량 삭제**하고 다음으로 대체한다.

```tsx
<AboutNav />
```

파일 상단에 import를 추가한다.

```tsx
import { AboutNav } from '@/components/AboutNav'
```

`AboutNav`는 `.about-scroll` **바깥**에 있어야 한다. 기존 `<nav>`가 있던 위치 그대로다.

### 조치 2-C — CSS 조정

`.about-nav-link`에 flex 배치와 gap을 추가한다.

```css
.about-nav-link {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-decoration: none;
  white-space: nowrap;
  color: #080706;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  transition: opacity 0.2s ease-out;
}
```

기존의 `font-weight: 300`과 `color: rgba(8, 7, 6, 0.55)`를 **삭제한다.** font-weight는 인라인이 담당하고, color는 WORKS 필터와 동일하게 `#080706` 불투명으로 통일한다(위계는 weight가 만든다).

`.about-nav-link:hover` 규칙은 삭제한다(색이 이미 불투명이므로 호버 색 변화가 무의미하다).

불릿 규칙을 추가한다.

```css
.about-nav-bullet {
  font-size: 7px;
  line-height: 1;
  transition: opacity 200ms;
}
```

M 구간의 `.about-nav-link { font-size: 10px }`는 유지한다.

---

## 3. 스크롤 애니메이션 — `scroll-behavior` 위치 교정

### 배경

260721-B에서 `html { scroll-behavior: smooth }`를 추가했으나, 260721-C에서 스크롤 구조를 `.about-scroll`로 옮기면서 **`html`은 더 이상 스크롤되지 않는다.** 따라서 그 선언이 아무 일도 하지 않고 앵커 점프가 즉시 일어난다.

라우터·SPA와 무관한 문제다. 층 내비는 `href="#id"` 앵커이며 라우트를 바꾸지 않는다.

### 조치 3-A — `html`에서 `scroll-behavior` 제거

`globals.css`의 `html` 규칙에서 `scroll-behavior: smooth;`를 **삭제한다.** `height: 100%`는 유지한다.

### 조치 3-B — `.about-scroll`에 추가

```css
.about-scroll {
  scroll-behavior: smooth;
}
```

기존 `.about-scroll` 규칙에 이 한 줄을 추가한다. 다른 선언은 그대로 둔다.

---

## 4. CV 연도 우측 정렬 폐기

### 배경

현재 Professional Experience 프로젝트 목록·Awards는 `1fr 96px 56px` 3열, Exhibitions는 `1fr 260px 56px` 3열로 연도가 우변에 고정된다. 구획마다 중간 열 성격이 달라(결과 / 장소) 같은 x좌표에 이질적 정보가 놓인다.

**전 구획을 좌측 흐름으로 통일한다.** 항목 길이에 따라 결과·연도 위치가 자연히 달라진다.

### 조치 4-A — `.about-cv-ranked` 교체

```css
/* 프로젝트 목록·Awards — 좌측 흐름. 명칭 길이에 따라 결과·연도 위치가 달라진다 */
.about-cv-ranked {
  font-size: 13px;
  font-weight: 300;
  line-height: 1.7;
  color: rgba(8, 7, 6, 0.60);
}
```

`display: grid`와 `grid-template-columns`를 **삭제한다.**

### 조치 4-B — `.about-cv-venue` 교체

```css
/* Exhibitions — 좌측 흐름. 위와 동일 문법 */
.about-cv-venue {
  font-size: 13px;
  font-weight: 300;
  line-height: 1.7;
  color: rgba(8, 7, 6, 0.60);
}
```

`display: grid`와 `grid-template-columns`를 **삭제한다.**

두 규칙이 완전히 동일해졌으므로 다음과 같이 병합해도 된다.

```css
.about-cv-ranked,
.about-cv-venue {
  font-size: 13px;
  font-weight: 300;
  line-height: 1.7;
  color: rgba(8, 7, 6, 0.60);
}
```

### 조치 4-C — `.about-cv-year` 교체

```css
/* 좌측 흐름이므로 우측 정렬을 폐기하고, 앞 요소와의 간격만 준다 */
.about-cv-year {
  margin-left: 16px;
  color: rgba(8, 7, 6, 0.45);
}
```

`text-align: right`를 **삭제한다.**

### 조치 4-D — 결과 요소 간격 추가

`about/page.tsx`의 `.about-cv-ranked` 내부 `<span>{p.result}</span>`와 `<span>{a.result}</span>`, `.about-cv-venue` 내부 `<span>{x.venue}</span>`는 좌측 흐름에서 명칭에 바로 붙는다. 간격을 위해 클래스를 부여한다.

`about/page.tsx`에서 다음 3곳의 `<span>`에 `className="about-cv-mid"`를 추가한다.

```tsx
{/* Professional Experience 프로젝트 */}
<span className="about-cv-mid">{p.result}</span>

{/* Awards */}
<span className="about-cv-mid">{a.result}</span>

{/* Exhibitions */}
<span className="about-cv-mid">{x.venue}</span>
```

CSS:
```css
.about-cv-mid {
  margin-left: 16px;
  color: rgba(8, 7, 6, 0.45);
}
```

### 조치 4-E — D2·M 구간 CV 열 지정 삭제

`@media (max-width: 1439px)` 블록에서:
```css
/* 삭제 */
.about-cv-venue {
  grid-template-columns: 1fr 200px 56px;
}
```
규칙 전체를 삭제한다.

`@media (max-width: 1023px)` 블록에서:
```css
/* 삭제 */
.about-cv-ranked {
  grid-template-columns: 1fr 84px 48px;
  font-size: 12px;    ← font-size만 남긴다
}
.about-cv-venue {
  display: block;
  font-size: 12px;    ← font-size만 남긴다
}
.about-cv-venue .about-cv-year {
  text-align: left;
  margin-left: 12px;
}                      ← 규칙 전체 삭제
```

정리 후 M 구간에는 다음만 남는다.
```css
.about-cv-ranked,
.about-cv-venue {
  font-size: 12px;
}
```

---

## 5. 검증

```
npx tsc --noEmit
```

오류가 없어야 한다. `AboutNav.tsx`는 `'use client'` 지시어가 필요하다(useState 사용).

`npm run dev`·`npm run build`는 실행하지 않는다.

---

## 6. 실행 후 육안 확인 사항 (Claude Code 범위 밖)

1. **헤더 내비 호버 밑줄과 현재 페이지 밑줄의 수직 위치·길이·두께가 완전히 같은가** — 다른 항목에 호버하며 현재 페이지 밑줄과 비교한다. 어긋나면 `text-decoration: underline`이 잔존한 것이다.
2. **층 내비 불릿이 WORKS 필터 불릿과 같은 크기·위치인가** — 두 페이지를 번갈아 확인.
3. **층 내비 클릭 시 스크롤이 부드럽게 이동하는가** — 즉시 점프하면 `scroll-behavior`가 `.about-scroll`에 들어가지 않은 것이다.
4. **불릿 전환 시 내비 항목 폭이 흔들리지 않는가** — 흔들리면 불릿이 조건부 렌더된 것이다(opacity 전환이어야 한다).
5. **CV 각 구획의 연도가 명칭 길이에 따라 자연스럽게 흐르는가**
6. **CV 항목 간격(`margin-left: 16px`)이 적정한가** — 좁으면 늘린다.
7. **`fontWeight: 500` 활성 항목의 폭 변화가 레이아웃을 밀지 않는가** — WORKS 필터도 같은 방식이므로 동일하게 동작해야 한다.
