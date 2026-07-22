# ABOUT 마무리 및 Studio 폴더 분리 명세 (260722-B)

4건. CV 한 줄 · 모바일 좌측 라인 · 햄버거 패널 현재 페이지 표시 · Studio 폴더 트리 분리.

## 0. 범위와 제약

**수정 대상 파일 (이외 파일 수정 금지)**

- `src/app/about/page.tsx` (수정 — CV 라벨 `<br/>` 제거)
- `src/app/globals.css` (수정 — 모바일 라벨 좌측 라인, 햄버거 패널 표시)
- `src/components/SiteHeader.tsx` (수정 — 모바일 패널 현재 페이지 클래스)
- `sanity.config.ts` (수정 — 문서 목록 published 분리)

**금지 사항**

- `LandingExperience.tsx`, `ProjectWall.tsx`, `ContentArea.tsx`, `AboutNav.tsx` 수정 금지.
- `SiteHeader.tsx`는 **모바일 패널 `<Link>` className 부분만** 수정. 데스크톱 내비·워드마크·햄버거 버튼·스크림·NAV_ITEMS·STATIC_LIGHT_PATHS·인트로 로직 불변.
- `npm run dev`, `npm run build` 실행 금지. 검증은 `npx tsc --noEmit`만.

---

## 1. CV 라벨 한 줄

### 조치 1-A — `about/page.tsx`

CV 층 라벨의 `<br />`를 제거한다.

교체 전:
```tsx
<div className="about-label">Curriculum<br />Vitae</div>
```

교체 후:
```tsx
<div className="about-label">Curriculum Vitae</div>
```

라벨 월 폭(`--wall-width`, 최소 300px)에 20px 폰트로 "Curriculum Vitae"가 한 줄에 들어간다.

---

## 2. 모바일 라벨 좌측 라인

### 배경

데스크톱은 `.about-label`에 `border-right`로 우측 라인이 있다(라벨이 우측 정렬이라 텍스트 오른쪽 끝에 선이 옴). 모바일은 라벨이 좌측 정렬·본문 위 블록이므로, 대칭적으로 텍스트 **왼쪽**에 세로선을 둔다.

### 조치 2-A — `globals.css` M 구간 `.about-label`

`@media (max-width: 1023px)` 블록의 `.about-label`에서 현재 `border-right: none`(또는 우측 라인 해제 관련 선언)을 좌측 라인으로 교체한다.

M 구간 `.about-label`에 다음을 반영한다(기존 `display:block`·`top`·`background`·`padding`·`margin-bottom`·`font-size`·`text-align:left`·`margin-top:0`은 유지, padding-left와 border만 조정).

```css
@media (max-width: 1023px) {
  .about-label {
    /* 기존 선언 유지 */
    text-align: left;
    border-right: none;
    border-left: 1px solid rgba(8, 7, 6, 0.18);
    padding-left: 12px;
    padding-right: 0;
  }
}
```

`border-left` 두께·색은 데스크톱 `border-right`와 동일(`1px solid rgba(8,7,6,0.18)`)하게 맞춘다. `padding-left: 12px`로 세로선과 라벨 텍스트 사이 간격을 준다.

**주의**: 데스크톱 기본 규칙의 `border-right`·`padding-right`·`text-align: right`는 건드리지 않는다. M 구간에서만 좌우가 반전된다.

---

## 3. 햄버거 패널 현재 페이지 표시

### 배경

데스크톱 내비는 260721-D에서 `is-current` + `border-bottom` 밑줄이 적용됐다. 모바일 햄버거 패널은 `fontWeight`(500/300)로만 구분해 시각적으로 약하다. 데스크톱과 통일한다.

### 조치 3-A — `SiteHeader.tsx` 모바일 패널 수정

모바일 패널의 `<Link>`는 이미 `current` 판정을 갖고 있다.

```tsx
const current = pathname === href || (href === '/work' && pathname.startsWith('/work'))
```

현재 이 값은 `fontWeight`에만 쓰인다. 여기에 밑줄용 클래스를 추가한다.

기존 (모바일 패널 내부):
```tsx
<Link
  key={label}
  href={href}
  onClick={() => setMenuOpen(false)}
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

교체 후 — `className` 추가, 인라인 style은 유지:
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

`fontWeight: current ? 500 : 300`은 그대로 둔다(밑줄과 굵기 이중 표시). 데스크톱 내비도 굵기 변화는 없지만, 모바일 패널은 항목이 세로로 나열되어 굵기+밑줄 병행이 자연스럽다.

### 조치 3-B — `globals.css`에 패널 링크 밑줄 규칙 추가

`@media (max-width: 1023px)` 블록 안, `.mobile-menu-panel` 관련 규칙 근처에 추가한다.

```css
.mobile-menu-link {
  border-bottom: 1px solid transparent;
}

.mobile-menu-link.is-current {
  border-bottom-color: currentColor;
}
```

`display: block`인 링크라 `border-bottom`이 패널 폭 전체에 그어진다. 이는 데스크톱의 텍스트 폭 밑줄과 다르나, 세로 목록에서는 전폭 밑줄이 오히려 명확하다.

**만약 전폭 밑줄이 과하면**, 링크 텍스트에만 밑줄을 주기 위해 `<Link>`를 `<span>` 래핑해야 하나, 이는 구조 변경이므로 이번 범위에서 제외한다. 우선 전폭으로 적용하고 육안 판단한다.

---

## 4. Sanity Studio 문서 목록 published 분리

### 배경

현재 `sanity.config.ts`의 structure는 `S.documentTypeListItem('project')` 하나로 전체 프로젝트를 한 목록에 표시한다. published 켜짐/꺼짐을 분리해 보고 싶다는 요구다.

`project.ts`에 `published` 불리언 필드가 이미 있다(`initialValue: true`).

### 조치 4-A — `sanity.config.ts` structure 교체

현재:
```ts
structure: (S) =>
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .title('ABOUT')
        .id('about')
        .child(
          S.document()
            .schemaType('about')
            .documentId('about')
            .title('ABOUT')
        ),
      S.divider(),
      S.documentTypeListItem('project').title('PROJECTS'),
    ]),
```

교체 후 — PROJECTS를 두 그룹으로 분리:
```ts
structure: (S) =>
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .title('ABOUT')
        .id('about')
        .child(
          S.document()
            .schemaType('about')
            .documentId('about')
            .title('ABOUT')
        ),
      S.divider(),
      S.listItem()
        .title('PROJECTS — PUBLISHED')
        .id('projectsPublished')
        .child(
          S.documentList()
            .title('Published Projects')
            .filter('_type == "project" && published != false')
            .defaultOrdering([{ field: 'careerNo', direction: 'desc' }])
        ),
      S.listItem()
        .title('PROJECTS — HIDDEN')
        .id('projectsHidden')
        .child(
          S.documentList()
            .title('Hidden Projects')
            .filter('_type == "project" && published == false')
            .defaultOrdering([{ field: 'careerNo', direction: 'desc' }])
        ),
    ]),
```

**필터 정합성 주의**: 사이트 GROQ(`queries.ts`)는 `published != false`로 게재 여부를 판정한다. 여기서도 PUBLISHED 그룹은 `published != false`(필드 부재 문서 포함), HIDDEN 그룹은 `published == false`(명시적으로 꺼진 것만)로 맞춘다. 이래야 사이트에 보이는 집합과 Studio의 PUBLISHED 목록이 정확히 일치한다.

**신규 문서 생성 주의**: `documentList`는 목록 뷰라 상단 `+` 신규 생성 시 필터 조건이 자동 주입되지 않을 수 있다. `published`의 `initialValue: true`가 있으므로 새 문서는 PUBLISHED에 들어간다. 만약 Studio에서 새 프로젝트가 어느 목록에도 안 보이면 `initialValue` 동작을 확인한다.

---

## 5. 검증

```
npx tsc --noEmit
```

오류가 없어야 한다. `sanity.config.ts`의 `documentList().filter()` 체인은 타입이 추론된다.

`npm run dev`·`npm run build`는 실행하지 않는다.

---

## 6. 실행 후 육안 확인 (Claude Code 범위 밖)

1. About CV 라벨이 한 줄로 표시되는가 (데스크톱·모바일 모두).
2. 모바일 About 라벨 왼쪽에 세로선이 붙는가. 데스크톱 우측 라인과 두께·색이 같은가.
3. 햄버거 패널에서 현재 페이지 항목에 밑줄이 표시되는가.
4. Studio 좌측에 ABOUT / PROJECTS — PUBLISHED / PROJECTS — HIDDEN 세 항목이 보이는가.
5. published 꺼진 프로젝트가 HIDDEN에만, 켜진 것이 PUBLISHED에만 나타나는가.
6. Studio에서 새 프로젝트 생성 시 PUBLISHED 목록에 들어가는가.
