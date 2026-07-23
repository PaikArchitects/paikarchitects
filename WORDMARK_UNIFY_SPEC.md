# WORDMARK 통일 명세 (Paik Architects)

## 목적

사이트 명칭을 `Paik Architects` 단일 문자열로 통일한다. 현재 4개 층위가 서로 다르다:

| 층위 | 현재 | 변경 후 |
|---|---|---|
| 도메인 | paikarchitects.com | (불변) |
| 브라우저 탭 | Chang Hyun Paik — Architect, Seoul | Paik Architects |
| 워드마크(히어로=헤더 동일 요소) | Architect Changhyun Paik → ACP 축약 | Paik Architects (축약 없음) |

**핵심 구조 변경**: 현재 워드마크는 `.initial`(A/C/P) + `.rest`(rchitect/hanghyun/aik) 3분할이며, `.collapsed` 클래스가 `.rest`·`.spacer`를 `max-width:0`으로 접어 **ACP만 남기는** 축약 모프다. 새 안은 히어로와 헤더가 동일 문자열이므로 **축약 메커니즘 전체가 불필요**하다. 이 구조를 남긴 채 문자열만 교체하면 헤더에서 `PA`만 표시되는 결함이 발생한다.

---

## 1. `src/components/SiteHeader.tsx`

### 1-1. 워드마크 마크업 교체

**현재 (L60~L86 부근, `<Link href="/" aria-label="Home">` 블록 내부)**

```tsx
<span className="word" style={{ fontWeight: 900 }}>
  <span className="initial">A</span>
  <span className="rest">rchitect</span>
</span>
<span className="spacer">&nbsp;</span>
<span className="word" style={{ fontWeight: 400 }}>
  <span className="initial">C</span>
  <span className="rest">hanghyun</span>
</span>
<span className="spacer">&nbsp;</span>
<span className="word" style={{ fontWeight: 300 }}>
  <span className="initial">P</span>
  <span className="rest">aik</span>
</span>
```

**교체 후**

```tsx
<span className="word" style={{ fontWeight: 700 }}>Paik</span>
<span className="wordmark-gap">&nbsp;</span>
<span className="word" style={{ fontWeight: 300 }}>Architects</span>
```

- `.initial` / `.rest` span 전면 제거 (총 6개)
- `.spacer` → `.wordmark-gap`으로 클래스명 교체 (2개 → 1개). 클래스명을 바꾸는 이유: 구 `.spacer`는 축약 대상이었으므로 잔존 CSS 규칙과의 우연한 매칭을 구조적으로 차단한다.
- 웨이트: Paik **700**, Architects **300**

### 1-2. `wordmarkActive` 변수 및 `collapsed` 클래스 제거

**현재**

```tsx
const layoutVisible = introPhase === 'done'
const wordmarkActive = introPhase !== 'wordmark'
```

**교체 후**

```tsx
const layoutVisible = introPhase === 'done'
const wordmarkMoved = introPhase !== 'wordmark'
```

**현재 (className 배열)**

```tsx
className={[
  'wordmark-intro',
  wordmarkActive ? 'collapsed moved' : '',
  ...
```

**교체 후**

```tsx
className={[
  'wordmark-intro',
  wordmarkMoved ? 'moved' : '',
  ...
```

`collapsed`는 완전 제거한다. 변수명을 `wordmarkActive` → `wordmarkMoved`로 바꾸는 것은 의미 정합 목적이다(더 이상 "축약 활성"이 아니라 "이동 완료"만 의미한다).

### 1-3. 주석 수정

L52 부근 `{/* ── ACP MONOGRAM — 홈 링크 ── */}` →
`{/* ── WORDMARK "Paik Architects" — 히어로 겸 헤더 로고(단일 요소). 홈 링크 ── */}`

---

## 2. `src/app/globals.css`

### 2-1. 삭제 대상 (L106~L133 전체)

아래 4개 블록을 **전부 삭제**한다:

```css
.wordmark-intro .rest,
.wordmark-intro .spacer {
  display: inline-block;
  overflow: hidden;
  opacity: 1;
  white-space: nowrap;
  vertical-align: baseline;
  padding-bottom: 0.25em;
  margin-bottom: -0.25em;
  transition:
    max-width 1600ms cubic-bezier(0.7, 0, 0.3, 1),
    opacity   1600ms cubic-bezier(0.7, 0, 0.3, 1);
}

.wordmark-intro .rest {
  max-width: 400px;
}

.wordmark-intro .spacer {
  width: 0.3em;
  max-width: 0.3em;
}

.wordmark-intro.collapsed .rest,
.wordmark-intro.collapsed .spacer {
  max-width: 0;
  opacity: 0;
}
```

### 2-2. 신규 추가 (삭제 자리에)

```css
.wordmark-intro .wordmark-gap {
  display: inline-block;
  width: 0.28em;
}
```

`0.28em`인 이유: 웨이트가 다른 두 단어 사이 공백은 시각적으로 넓게 읽힌다. 기본 `&nbsp;`(약 0.31em)보다 소폭 조인다. 육안 조정 대상.

### 2-3. `.word` 존치

`.wordmark-intro .word { display: inline-flex; align-items: baseline; }` (L101~104)는 **삭제하지 않는다.** 웨이트 구분 단위로 계속 쓰인다.

### 2-4. 자간 조정

`.wordmark-intro`의 `letter-spacing: -0.01em` (L59)을 `-0.02em`로 변경한다.

근거: 구 문자열은 24자로 좌우로 뻗어 자간이 느슨해도 무방했으나, `Paik Architects`(15자)는 덩어리로 읽혀야 컴팩트한 인상을 준다. 32px 크기에서 -0.02em이 통상적인 조임 폭이다.

### 2-5. 크기·위치 — 변경 없음

- 데스크톱: 히어로 32px → 헤더 32px (동일 크기, 위치만 이동)
- 모바일: 히어로 32px → 헤더 22px (`@media (max-width:1023px)`의 `.wordmark-intro.moved { font-size: 22px }`, L203)

**이 값들은 건드리지 않는다.**

---

## 3. `src/app/layout.tsx`

### 3-1. metadata 교체

**현재 (L6~L18)**

```tsx
export const metadata: Metadata = {
  title: 'Chang Hyun Paik — Architect, Seoul',
  description:
    'Chang Hyun Paik is an architect based in Seoul, South Korea. A decade of professional practice spanning culture, infrastructure, and civic work.',
  openGraph: {
    title: 'Chang Hyun Paik — Architect, Seoul',
    description:
      'A decade of professional practice spanning culture, infrastructure, and civic work.',
    type: 'website',
    url: 'https://paikarchitects.com',
  },
}
```

**교체 후**

```tsx
export const metadata: Metadata = {
  title: {
    default: 'Paik Architects',
    template: '%s — Paik Architects',
  },
  description:
    'Paik Architects is the architecture practice of Chang Hyun Paik, based in Seoul, South Korea. A decade of professional practice spanning culture, infrastructure, and civic work.',
  openGraph: {
    title: 'Paik Architects',
    description:
      'The architecture practice of Chang Hyun Paik. A decade of professional work spanning culture, infrastructure, and civic projects.',
    type: 'website',
    url: 'https://paikarchitects.com',
  },
}
```

`title`을 객체(default + template)로 바꾸는 이유: 하위 페이지가 `title: 'About'`만 선언하면 `About — Paik Architects`가 자동 생성된다. 개인명 `Chang Hyun Paik`은 description에 유지되어 검색 연결이 끊기지 않는다.

---

## 4. 하위 페이지 metadata 추가

### 4-1. `src/app/about/page.tsx`

파일 상단(`export default` 위)에 추가:

```tsx
export const metadata = { title: 'About' }
```

이미 `metadata` export가 존재하면 `title` 필드만 추가한다. 서버 컴포넌트이므로 `'use client'`가 없어야 한다(현재 서버 컴포넌트로 확인됨).

### 4-2. `src/app/contact/page.tsx`

동일 방식으로 `export const metadata = { title: 'Contacts' }` 추가.

**단, 해당 페이지가 클라이언트 컴포넌트(`'use client'`)라면 metadata export가 불가하다.** 이 경우 같은 디렉토리에 `layout.tsx`를 신설하고 거기에 metadata를 둔다:

```tsx
export const metadata = { title: 'Contacts' }
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
```

### 4-3. `src/app/essays/page.tsx`

라우트가 존재하면 `title: 'Essays'`를 4-2와 동일 방식으로 추가한다. **존재하지 않으면 건너뛴다** (NAV_ITEMS에는 있으나 페이지 미구현일 수 있음 — 실제 파일 유무를 확인한 뒤 판단할 것).

### 4-4. `/work` 계열 — 처리하지 않음

`/work`와 `/work/[slug]`는 SPA 딥링크 구조로 `LandingExperience`를 렌더한다. 프로젝트별 동적 title은 이번 작업 범위 밖이다. 기본 title(`Paik Architects`)이 적용되며 이는 의도된 동작이다.

---

## 5. 검증

### 5-1. 컴파일 검증

```
npx tsc --noEmit
```

**진단 기법**: 1-2에서 `wordmarkActive` 변수를 먼저 삭제(rename)하면, 잔존 참조가 있을 경우 tsc가 전부 오류로 드러낸다. `collapsed` 문자열은 tsc가 잡지 못하므로 **전체 검색으로 직접 확인**한다:

```
grep -rn "collapsed\|\.initial\|\.rest\|\bspacer\b" src/
```

결과가 0건이어야 한다. (globals.css 포함)

### 5-2. 육안 확인 항목

1. 최초 진입 시 화면 중앙에 `Paik Architects` 표시 (Paik 두껍게, Architects 얇게)
2. 그대로 좌상단(데스크톱) / 상단 중앙(모바일)으로 이동, **문자 축약 없음**
3. 데스크톱 이동 후에도 32px 유지
4. 모바일 이동 후 22px로 축소
5. 브라우저 탭: `Paik Architects` / `/about`에서 `About — Paik Architects`
6. 두 단어 사이 공백이 과하거나 붙어 보이지 않는지

---

## 제약

- **크기·위치 상수(32px, 22px, top:20px, left:24px, top:16px)는 변경하지 않는다.**
- `.wordmark-intro`의 transition 목록에서 `max-width` 관련 항목은 원래 `.rest`/`.spacer` 쪽에만 있었으므로 `.wordmark-intro` 본체 transition(L67~72, L94~98)은 **수정하지 않는다.**
- `introPhase` 상태 머신(`SiteChromeContext`)은 수정하지 않는다. `wordmark` → `done` 전환 타이밍은 불변이다.
- 새 useState·useEffect를 추가하지 않는다. 이번 작업은 마크업·CSS·문자열 교체만으로 완결된다.
