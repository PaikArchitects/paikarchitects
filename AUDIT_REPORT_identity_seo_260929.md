# AUDIT REPORT — Identity & SEO
**작성일:** 2026-09-29
**범위:** 읽기 전용 감사. 코드 수정 없음. 본 파일 1개만 생성.
**대상:** 브랜치 `main` (HEAD `a287a9b view toggle`, 작업 트리 clean)
**표기 규칙:** 모든 인용은 `파일경로:줄번호` + 원문 발췌. 파일에서 직접 확인되지 않은 판단은 **[추정]** 으로 표기.

---

## 1. 메타데이터 현황

### 1-1. `src/app/layout.tsx` — metadata export 전문

`src/app/layout.tsx:1-20`

```tsx
import type { Metadata } from 'next'
import './globals.css'
import { SiteChromeProvider } from '@/components/SiteChromeContext'
import { SiteHeader } from '@/components/SiteHeader'

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

동일 파일의 `<head>` 블록 (메타데이터 인접 사실로 기록):

`src/app/layout.tsx:28-40`

```tsx
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400&display=swap"
          rel="stylesheet"
        />
      </head>
```

**관찰된 사실:**
- `metadataBase` **없음** — `src`, `sanity` 전체 grep 결과 `metadataBase` 0건.
- `openGraph.images` **없음** (openGraph 객체에 `images` 키 자체가 부재).
- `twitter` 카드 설정 **없음**.
- `alternates` / `robots` / `keywords` / `icons` 명시 **없음**.
- `openGraph.url`은 `https://paikarchitects.com` 하드코딩. CLAUDE.md 기준 현재 배포 URL은 `https://paikarchitects.vercel.app` 이며 DNS 전환은 미완료 항목으로 기재됨 → OG url과 실제 배포 도메인 불일치.
- CLAUDE.md "알려진 미완성 항목"의 미사용 Google Fonts(Cormorant Garamond, DM Sans) link 태그가 `layout.tsx:36-39`에 **여전히 존재**.

### 1-2. `src/app` 하위 `export const metadata` / `generateMetadata` 전수

grep 패턴: `export const metadata|generateMetadata` (대상 `src`)

| 파일:줄 | 원문 |
|---|---|
| `src/app/layout.tsx:6` | `export const metadata: Metadata = {` (전문은 §1-1) |
| `src/app/about/page.tsx:7` | `export const metadata = { title: 'About' }` |
| `src/app/contact/page.tsx:1` | `export const metadata = { title: 'Contacts' }` |
| `src/app/essays/page.tsx:1` | `export const metadata = { title: 'Essays' }` |
| `src/app/work-grid/[slug]/page.tsx:28-31` | `generateMetadata` (아래 전문) |

`src/app/work-grid/[slug]/page.tsx:28-31`

```tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return { alternates: { canonical: `/work/${slug}` } }
}
```

**metadata / generateMetadata 가 없는 라우트 (확인된 부재):**

| 라우트 | 파일 | 비고 |
|---|---|---|
| `/` | `src/app/page.tsx` (전 9줄) | metadata export 없음 → layout default title `Paik Architects` 사용 |
| `/work` | `src/app/work/page.tsx` (전 9줄) | metadata export 없음 |
| `/work-grid` | `src/app/work-grid/page.tsx` (전 9줄) | metadata export 없음 |
| `/work/[slug]` | `src/app/work/[slug]/page.tsx` (전 20줄) | **generateMetadata 없음** — 프로젝트별 title/description/OG 전무 |
| `/studio/[[...tool]]` | `src/app/studio/[[...tool]]/page.tsx` | metadata 없음, `'use client'` |

`src/app/page.tsx:1-9` (전문)

```tsx
import { getProjects } from '@/lib/sanity/queries'
import { LandingExperience } from '@/components/LandingExperience'

export const dynamic = 'force-static'

export default async function HomePage() {
  const projects = await getProjects()
  return <LandingExperience projects={projects} />
}
```

`src/app/work/page.tsx:1-9` (전문)

```tsx
import { getProjects } from '@/lib/sanity/queries'
import { LandingExperience } from '@/components/LandingExperience'

export const dynamic = 'force-static'

export default async function WorkPage() {
  const projects = await getProjects()
  return <LandingExperience projects={projects} initialShowFilters />
}
```

`src/app/work-grid/page.tsx:1-9` (전문)

```tsx
import { getProjects } from '@/lib/sanity/queries'
import { GridExperience } from '@/components/GridExperience'

export const dynamic = 'force-static'

export default async function WorkGridPage() {
  const projects = await getProjects()
  return <GridExperience projects={projects} />
}
```

**주의 (사실):** `/work-grid/[slug]`는 canonical을 `/work/${slug}`로 선언하지만, canonical 대상인 `/work/[slug]`에는 `generateMetadata`가 없어 자기 자신의 canonical·title·OG를 선언하지 않는다.
`metadataBase` 부재 상태에서 `alternates.canonical`이 상대 경로(`/work/...`)이므로 절대 URL로 해석할 기준 origin이 없다 → **[추정]** 빌드 시 metadataBase 미설정 경고가 발생하고 canonical이 `http://localhost:3000` 기준으로 생성될 가능성. (빌드 실행 금지 지시에 따라 미검증.)

---

## 2. 문자열 전수 검색

**대상:** `src`, `sanity`, `public` / **옵션:** 대소문자 무시(-i), 전체 결과(head_limit 0)

### 2-1. `"Paik Architects"` — **6건**

| 파일:줄 | 원문 |
|---|---|
| `src/app/globals.css:42` | `/* ── WORDMARK INTRO — "Paik Architects" (히어로 겸 헤더 로고, 축약 없음) ── */` |
| `src/app/layout.tsx:8` | `    default: 'Paik Architects',` |
| `src/app/layout.tsx:9` | `    template: '%s — Paik Architects',` |
| `src/app/layout.tsx:12` | `    'Paik Architects is the architecture practice of Chang Hyun Paik, based in Seoul, South Korea. ...'` |
| `src/app/layout.tsx:14` | `    title: 'Paik Architects',` |
| `src/components/SiteHeader.tsx:55` | `      {/* ── WORDMARK "Paik Architects" — 히어로 겸 헤더 로고(단일 요소). 홈 링크 ── */}` |

**참고(대상 디렉터리 밖, 기록만):** `sanity.config.ts:11` 은 `title: 'Paik Architecture'` (Architect**ure**). 검색 대상(`src`/`sanity`/`public`) 밖인 레포 루트 파일이라 위 표에는 미포함. 스튜디오 표기와 사이트 표기가 불일치.

### 2-2. `"practice"` — **2건** (문자열 출현은 3회)

| 파일:줄 | 원문 |
|---|---|
| `src/app/layout.tsx:12` | `'Paik Architects is the architecture practice of Chang Hyun Paik, based in Seoul, South Korea. A decade of professional practice spanning culture, infrastructure, and civic work.'` — 한 줄 내 2회 출현 |
| `src/app/layout.tsx:16` | `'The architecture practice of Chang Hyun Paik. A decade of professional work spanning culture, infrastructure, and civic projects.'` |

→ `practice`는 **layout.tsx 메타데이터 문자열에만 존재**. 화면에 렌더되는 본문 카피에는 0건.

### 2-3. `"Coming Soon"` — **2건**

| 파일:줄 | 원문 |
|---|---|
| `src/app/contact/page.tsx:20` | `        Contact — Coming Soon` |
| `src/app/essays/page.tsx:20` | `        Essays — Coming Soon` |

### 2-4. `"Chang Hyun"` — **2건**

| 파일:줄 | 원문 |
|---|---|
| `src/app/layout.tsx:12` | `'Paik Architects is the architecture practice of Chang Hyun Paik, ...'` |
| `src/app/layout.tsx:16` | `'The architecture practice of Chang Hyun Paik. ...'` |

→ 띄어쓰기형 `Chang Hyun`은 메타데이터에만 존재.

### 2-5. 검색 요약 (0건 항목 명시)

| 문자열 | 결과 |
|---|---|
| `Paik Architects` | **6건** |
| `practice` | **2건** (파일 기준) |
| `Coming Soon` | **2건** |
| `Chang Hyun` | **2건** |
| (교차확인) `Changhyun` 붙여쓰기 | **0건** — `7ef6670`에서 제거됨 (§4) |
| (교차확인) `ACP` in `src`/`sanity`/`public` | **1건**, 주석뿐: `src/components/LandingExperience.tsx:218` |


---

## 3. 헤더 워드마크

### 3-1. `SiteHeader.tsx` 로고/워드마크 렌더 부분 전문

`src/components/SiteHeader.tsx:55-70`

```tsx
      {/* ── WORDMARK "Paik Architects" — 히어로 겸 헤더 로고(단일 요소). 홈 링크 ── */}
      <Link
        href="/"
        aria-label="Home"
        className={[
          'wordmark-intro',
          wordmarkMoved ? 'moved' : '',
          wordmarkOnLight ? 'on-light' : '',
          introSkipped ? 'instant' : '',
          !isLanding ? 'no-color-transition' : '',
        ].filter(Boolean).join(' ')}
      >
        <span className="word" style={{ fontWeight: 700 }}>Paik</span>
        <span className="wordmark-gap">&nbsp;</span>
        <span className="word" style={{ fontWeight: 300 }}>Architects</span>
      </Link>
```

관련 상태 계산부 `src/components/SiteHeader.tsx:36-41`

```tsx
  const isLanding = pathname === '/'
  const wordmarkOnLight = isLanding ? dynamicWordmarkOnLight : isStaticLight(pathname)
  const navOnLight = isLanding ? dynamicNavOnLight : isStaticLight(pathname)

  const layoutVisible = introPhase === 'done'
  const wordmarkMoved = introPhase !== 'wordmark'
```

현재 워드마크 CSS `src/app/globals.css:42-109`

```css
/* ── WORDMARK INTRO — "Paik Architects" (히어로 겸 헤더 로고, 축약 없음) ── */
@keyframes wordmarkFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.wordmark-intro {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 200;
  display: flex;
  flex-direction: row;
  align-items: baseline;
  font-size: 32px;
  line-height: 1;
  letter-spacing: -0.02em;
  white-space: nowrap;
  color: #FFFFFF;
  text-decoration: none;
  user-select: none;
  pointer-events: auto;
  opacity: 0;
  animation: wordmarkFadeIn 0.3s ease-out forwards;
  transition:
    top 1600ms cubic-bezier(0.7, 0, 0.3, 1),
    left 1600ms cubic-bezier(0.7, 0, 0.3, 1),
    transform 1600ms cubic-bezier(0.7, 0, 0.3, 1),
    font-size 1600ms cubic-bezier(0.7, 0, 0.3, 1),
    color 0.3s ease-out;
}

.wordmark-intro.instant {
  animation: none;
  opacity: 1;
}

.wordmark-intro.moved {
  top: 20px;
  left: 24px;
  transform: translate(0, 0);   /* 기존 none → 계산상 동일, 함수형만 통일 (인자별 보간 강제) */
}

.wordmark-intro.on-light {
  color: #080706;
}

/* 컨텐츠 페이지: 배경이 라우트 전환과 동시에 즉시 바뀌므로,
   색상도 즉시 전환해야 모노그램이 일시적으로 배경과 같은 색이 되어
   사라지는 현상을 방지할 수 있음 */
.wordmark-intro.no-color-transition {
  transition:
    top 1600ms cubic-bezier(0.7, 0, 0.3, 1),
    left 1600ms cubic-bezier(0.7, 0, 0.3, 1),
    transform 1600ms cubic-bezier(0.7, 0, 0.3, 1),
    font-size 1600ms cubic-bezier(0.7, 0, 0.3, 1);
}

.wordmark-intro .word {
  display: inline-flex;
  align-items: baseline;
}

.wordmark-intro .wordmark-gap {
  display: inline-block;
  width: 0.28em;
}
```

모바일 오버라이드 `src/app/globals.css:162-180`

```css
  /* 워드마크 수평 중앙 — transform 퍼센트 → auto margin(레이아웃) 이관.
     Safari가 transform 전환 중 퍼센트 참조 박스를 라이브 재해석하지 않아
     폭 수축 시 좌측 쏠림 → 레이아웃 단계 auto margin은 매 프레임 재해석되어 중앙 유지 */
  .wordmark-intro {
    left: 0;
    right: 0;
    width: fit-content;
    margin-left: auto;
    margin-right: auto;
    transform: translate(0, -50%);   /* 수평 성분 제거 — 수평은 auto margin이 담당 */
  }

  /* 워드마크 종착 — 화면 수평 중앙에서 수직 상승 궤적. 데스크톱 종착(left 24px)은 불변 */
  .wordmark-intro.moved {
    top: 16px;
    left: 0;                          /* 기존 left: 50% 대체 — 수평 이동 자체가 없음 */
    transform: translate(0, 0);
    font-size: 22px;
  }
```

**CLAUDE.md와의 불일치 (사실):** CLAUDE.md "랜딩 워드마크" 표는 텍스트 `"Architect Changhyun Paik"`, 웨이트 900/400/300, 56px(모바일 28px), 모노그램 `"ACP"`로 기재. 현재 코드는 `"Paik Architects"`, 웨이트 700/300, 32px(모바일 22px), 모노그램 없음. → CLAUDE.md가 `7ef6670`(2026-07-23) 이후 갱신되지 않음.

### 3-2. 로고 텍스트를 별도 렌더하는 곳 — grep 결과

grep 패턴 `wordmark|logo|Architects|monogram|brand` (대상 `src`, 대소문자 무시, 전체 결과):

| 파일:줄 | 원문 | 로고 렌더 여부 |
|---|---|---|
| `src/components/SiteHeader.tsx:55,60-69` | 워드마크 JSX (§3-1) | **렌더함 (유일)** |
| `src/components/SiteHeader.tsx:32,37,41` | `wordmarkOnLight` / `wordmarkMoved` 상태 | 아니오 |
| `src/components/SiteChromeContext.tsx:6` | `export type IntroPhase = 'wordmark' , 'collapsed' , 'done'` (원문은 유니온 `|` 구분) | 아니오 |
| `src/components/SiteChromeContext.tsx:11,13,20,22,32,34,56,67,69` | `wordmarkOnLight` 컨텍스트 값/세터 | 아니오 |
| `src/components/LandingExperience.tsx:26,221,223` | `setWordmarkOnLight` 사용 | 아니오 |
| `src/app/globals.css:42,43,48,66,75,80,86,93,101,106,165,175` | `.wordmark-intro` CSS | 아니오 (스타일) |
| `src/app/layout.tsx:8,9,12,14,18` | metadata 문자열 | 아니오 |
| `src/components/ContentArea.tsx:411` | YouTube 임베드 URL의 `modestbranding=1` | 아니오 (오탐) |
| `src/components/GridContentArea.tsx:453` | 동일 패턴 | 아니오 (오탐) |
| `src/components/MobileProjectWall.tsx:330` | 동일 패턴 | 아니오 (오탐) |

오탐 3건의 원문 (셋 다 동일 형태):

```tsx
  const src = `https://www.youtube-nocookie.com/embed/${slide.youtubeId}?rel=0&modestbranding=1`
```

**결론 (사실):**
- `MobileProjectWall.tsx` 에서 로고/워드마크 텍스트를 별도로 렌더하는 코드는 **0건**. 유일한 매치 `MobileProjectWall.tsx:330` 은 YouTube 임베드 URL의 `modestbranding` 파라미터로 로고와 무관.
- **전체 코드베이스에서 로고 텍스트를 렌더하는 곳은 `src/components/SiteHeader.tsx:67-69` 단 한 곳.**
- 모바일 전용 별도 로고 렌더 경로 없음 — 모바일은 `globals.css:165-180` CSS 오버라이드로 동일 DOM을 재배치.

---

## 4. 과거 ACP 애니메이션 추적

### 4-1. 요청된 git 조회 결과 (원문)

```
$ git log --all --oneline -i --grep="ACP"
(0건 — 출력 없음)

$ git log --all --oneline -i --grep="logo"
(0건 — 출력 없음)

$ git log --all -S "ACP" --oneline
7ef6670 wordmark unify
31fa8ca about scroll revert
e66abdf about align header
ba51eb3 Content Area and Mobile Header
fa9bc9b mobile entry fix
4a55f29 tablet
72bb696 WORK
de822be refinement landing
8c2b9c8 intro fix
afd1dde header
036661a Landing (ref. BIG)
88c681f Rev_Landing (ref. BIG)
46c7706 Update CLAUDE.md
ac3ee98 rev3 (ref.AJN)
1df487b REV 3 (ref. AJN)
474c306 rev2_MARK (ref. AJN)
2046dea Rev_MARK (ref. AJN)
8464b6c Rev_Carousel (ref. AJN)
5048ec5 Rev(ref. AJN)
fa999da Update(ref. AJN)
```

**중요 — 위 `-S "ACP"` 결과의 다수는 SPEC 마크다운 문서에서의 출현이며 코드 변경이 아니다.** 파일 단위 내역 (`--name-only`):

```
7ef6670 wordmark unify        → WORDMARK_UNIFY_SPEC.md, src/app/globals.css, src/components/SiteHeader.tsx
31fa8ca about scroll revert   → ABOUT_SCROLL_REVERT_SPEC.md
e66abdf about align header    → ABOUT_ALIGN_HEADER_SPEC.md
ba51eb3 Content Area…         → MOBILE_HEADER_FIX_SPEC.md
fa9bc9b mobile entry fix      → MOBILE_ENTRY_FIX_SPEC.md
4a55f29 tablet                → TABLET_SPEC.md
72bb696 WORK                  → src/app/page.tsx, src/components/LandingExperience.tsx
de822be refinement landing    → src/app/page.tsx
8c2b9c8 intro fix             → ENTRY_FLASH_FIX.md
afd1dde header                → src/components/SiteHeader.tsx
036661a Landing (ref. BIG)    → LANDING_POLISH_SPEC.md, src/app/globals.css, src/app/page.tsx
88c681f Rev_Landing (ref. BIG)→ src/app/page.tsx
46c7706 Update CLAUDE.md      → CLAUDE.md
ac3ee98 rev3 (ref.AJN)        → DESIGN_SYSTEM_SPEC.md, WORK_SECTION_SPEC.md
1df487b REV 3 (ref. AJN)      → DESIGN_SYSTEM_SPEC.md
474c306 rev2_MARK (ref. AJN)  → WORDMARK_SPEC.md, src/app/page.tsx
2046dea Rev_MARK (ref. AJN)   → WORDMARK_SPEC.md
8464b6c Rev_Carousel (ref.AJN)→ CAROUSEL_SPEC.md
5048ec5 Rev(ref. AJN)         → DESIGN_SYSTEM_SPEC.md
fa999da Update(ref. AJN)      → LANDING_SPEC.md
```

커밋 메시지에 "ACP" 또는 "logo"를 쓴 커밋은 **0건** — 커밋 메시지 기준 추적은 불가능하며, 내용(`-S`) 기준 추적만 유효하다.

### 4-2. 관련 커밋 타임라인

`git show -s --date=short` 결과:

```
fa999da  2026-06-08  Update(ref. AJN)
2046dea  2026-06-08  Rev_MARK (ref. AJN)
474c306  2026-06-08  rev2_MARK (ref. AJN)
036661a  2026-06-10  Landing (ref. BIG)
afd1dde  2026-06-10  header
7ef6670  2026-07-23  wordmark unify      ← 제거 커밋
063bf64  2026-07-24  header adjust
```

`git log --all --reverse -S ".collapsed .rest" --oneline -- src/app/globals.css`
```
2046dea Rev_MARK (ref. AJN)      ← CSS 축약 룰 도입 (2026-06-08)
7ef6670 wordmark unify           ← 제거 (2026-07-23)
```

`git log --all --reverse -S "collapsed" --oneline -- src/app/page.tsx`
```
fa999da Update(ref. AJN)
2046dea Rev_MARK (ref. AJN)
474c306 rev2_MARK (ref. AJN)
88c681f Rev_Landing (ref. BIG)
036661a Landing (ref. BIG)
e4fbd96 Start animation
afd1dde header                   ← page.tsx → SiteHeader.tsx 소유권 이관
```

### 4-3. 애니메이션 구조 — 제거 직전 상태 (`7ef6670^`) 원문

**CSS — `src/app/globals.css` @ `7ef6670^`, 워드마크 블록 (해당 리비전 기준 42~96행)**

```css
/* ── WORDMARK INTRO / ACP MONOGRAM ── */
@keyframes wordmarkFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.wordmark-intro {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 200;
  display: flex;
  flex-direction: row;
  align-items: baseline;
  font-size: 32px;
  line-height: 1;
  letter-spacing: -0.01em;
  white-space: nowrap;
  color: #FFFFFF;
  text-decoration: none;
  user-select: none;
  pointer-events: auto;
  opacity: 0;
  animation: wordmarkFadeIn 0.3s ease-out forwards;
  transition:
    top 1600ms cubic-bezier(0.7, 0, 0.3, 1),
    left 1600ms cubic-bezier(0.7, 0, 0.3, 1),
    transform 1600ms cubic-bezier(0.7, 0, 0.3, 1),
    font-size 1600ms cubic-bezier(0.7, 0, 0.3, 1),
    color 0.3s ease-out;
}

.wordmark-intro.instant {
  animation: none;
  opacity: 1;
}

.wordmark-intro.moved {
  top: 20px;
  left: 24px;
  transform: translate(0, 0);
}

.wordmark-intro.on-light {
  color: #080706;
}

.wordmark-intro.no-color-transition {
  transition:
    top 1600ms cubic-bezier(0.7, 0, 0.3, 1),
    left 1600ms cubic-bezier(0.7, 0, 0.3, 1),
    transform 1600ms cubic-bezier(0.7, 0, 0.3, 1),
    font-size 1600ms cubic-bezier(0.7, 0, 0.3, 1);
}

.wordmark-intro .word {
  display: inline-flex;
  align-items: baseline;
}

/* ★ 축약 애니메이션 핵심 — 아래 4개 룰이 7ef6670에서 삭제됨 */
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

**애니메이션 메커니즘 (원문에서 직접 확인되는 사실):**
- `@keyframes`로 구동되는 것은 `wordmarkFadeIn`(opacity 0→1, 0.3s) **하나뿐**. 축약 자체는 keyframes가 아니라 **CSS transition + 클래스 토글** 방식.
- 축약은 `.rest`/`.spacer`의 `max-width`를 `400px`/`0.3em` → `0` 으로, `opacity`를 `1` → `0` 으로 1600ms `cubic-bezier(0.7, 0, 0.3, 1)` 전환.
- `overflow: hidden` + `white-space: nowrap` 으로 클리핑, `padding-bottom: 0.25em` / `margin-bottom: -0.25em` 으로 디센더 클리핑 방지.
- 이동(`top`/`left`/`transform`/`font-size`)도 동일 1600ms 이징으로 동시 진행 — 중앙 50%/50% → `top:20px, left:24px`.

**컴포넌트 로직 — `src/components/SiteHeader.tsx` @ `7ef6670^` (삭제된 원문, `git show 7ef6670` 의 `-` 행)**

```tsx
      {/* ── ACP MONOGRAM — 홈 링크 ── */}
      <Link
        href="/"
        aria-label="Home"
        className={[
          'wordmark-intro',
          wordmarkActive ? 'collapsed moved' : '',
          wordmarkOnLight ? 'on-light' : '',
          introSkipped ? 'instant' : '',
          !isLanding ? 'no-color-transition' : '',
        ].filter(Boolean).join(' ')}
      >
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
      </Link>
```

구조: 각 단어를 `.initial`(A / C / P, 항상 표시) + `.rest`(rchitect / hanghyun / aik, 축약 대상)로 분할. `.collapsed` 클래스가 붙으면 `.rest` 3개 + `.spacer` 2개가 max-width 0으로 수축 → 남는 글자가 **A C P** 모노그램.

### 4-4. 제거 커밋 특정

**제거 커밋: `7ef6670014acf05b814b3c5a5607e5845ecebcfb` — "wordmark unify" — 2026-07-23 17:13:21 +0900 — author `PaikArchitects`**

```
 WORDMARK_UNIFY_SPEC.md        | 274 ++++++++++++++++++++++++++++++++++++++++++
 src/app/about/page.tsx        |   2 +
 src/app/contact/page.tsx      |   2 +
 src/app/essays/page.tsx       |   2 +
 src/app/globals.css           |  32 +----
 src/app/layout.tsx            |  11 +-
 src/components/SiteHeader.tsx |  23 +---
 7 files changed, 297 insertions(+), 49 deletions(-)
```

제거 diff 핵심 — `git show 7ef6670 -- src/components/SiteHeader.tsx`:

```diff
-      {/* ── ACP MONOGRAM — 홈 링크 ── */}
+      {/* ── WORDMARK "Paik Architects" — 히어로 겸 헤더 로고(단일 요소). 홈 링크 ── */}
@@
-          wordmarkActive ? 'collapsed moved' : '',
+          wordmarkMoved ? 'moved' : '',
@@
-        <span className="word" style={{ fontWeight: 900 }}>
-          <span className="initial">A</span>
-          <span className="rest">rchitect</span>
-        </span>
-        <span className="spacer">&nbsp;</span>
-        <span className="word" style={{ fontWeight: 400 }}>
-          <span className="initial">C</span>
-          <span className="rest">hanghyun</span>
-        </span>
-        <span className="spacer">&nbsp;</span>
-        <span className="word" style={{ fontWeight: 300 }}>
-          <span className="initial">P</span>
-          <span className="rest">aik</span>
-        </span>
+        <span className="word" style={{ fontWeight: 700 }}>Paik</span>
+        <span className="wordmark-gap">&nbsp;</span>
+        <span className="word" style={{ fontWeight: 300 }}>Architects</span>
```

`git show 7ef6670 -- src/app/globals.css`:

```diff
-/* ── WORDMARK INTRO / ACP MONOGRAM ── */
+/* ── WORDMARK INTRO — "Paik Architects" (히어로 겸 헤더 로고, 축약 없음) ── */
@@
-  letter-spacing: -0.01em;
+  letter-spacing: -0.02em;
@@
-.wordmark-intro .rest,
-.wordmark-intro .spacer {
+.wordmark-intro .wordmark-gap {
   display: inline-block;
-  overflow: hidden;
-  opacity: 1;
-  white-space: nowrap;
-  vertical-align: baseline;
-  padding-bottom: 0.25em;
-  margin-bottom: -0.25em;
-  transition:
-    max-width 1600ms cubic-bezier(0.7, 0, 0.3, 1),
-    opacity   1600ms cubic-bezier(0.7, 0, 0.3, 1);
-}
-
-.wordmark-intro .rest {
-  max-width: 400px;
-}
-
-.wordmark-intro .spacer {
-  width: 0.3em;
-  max-width: 0.3em;
-}
-
-.wordmark-intro.collapsed .rest,
-.wordmark-intro.collapsed .spacer {
-  max-width: 0;
-  opacity: 0;
+  width: 0.28em;
 }
```

**도입 커밋 (추적된 최초):** `2046dea "Rev_MARK (ref. AJN)"` (2026-06-08) — `.collapsed .rest` CSS 최초 등장. 해당 커밋의 변경 파일은 `WORDMARK_SPEC.md`, `src/app/globals.css`, `src/app/page.tsx` 로, 당시 워드마크는 `src/app/page.tsx` 에 있었다. `afd1dde "header"` (2026-06-10) 에서 `src/components/SiteHeader.tsx` 로 이관.

### 4-5. ACP 애니메이션 잔존물 (현 HEAD 기준)

- `src/components/SiteChromeContext.tsx:6`

  ```ts
  export type IntroPhase = 'wordmark' | 'collapsed' | 'done'
  ```

  `'collapsed'` phase 값이 타입에 **여전히 남아 있음**. `SiteHeader.tsx:41` 은 `introPhase !== 'wordmark'` 로만 판정하므로 `'collapsed'` 와 `'done'` 을 구분하지 않는다. **[추정]** ACP 축약 단계의 잔재로 보이나, `SiteChromeContext.tsx` 전문을 본 감사 범위에서 전량 검토하지 않았으므로 실제 사용 여부는 미확정.

- `src/components/LandingExperience.tsx:218`

  ```tsx
  // 전역 헤더(ACP 모노그램 / 내비게이션) 색상 전환 — 랜딩은 셸이 항상 흰색이므로
  ```

  코드가 아닌 **주석에만 ACP 표현 잔존**. 실제 모노그램은 부재.

- `CLAUDE.md` — 워드마크 텍스트/웨이트/크기/모노그램 표가 모두 ACP 시절 기준으로 남아 현재 코드와 불일치 (§3-1).

---

## 5. Contacts · Essays

### 5-1. `src/app/contact/page.tsx` — 전문 (24줄)

```tsx
export const metadata = { title: 'Contacts' }

export default function ContactPage() {
  return (
    <main style={{
      minHeight: '100vh',
      backgroundColor: '#FFFFFF',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <p style={{
        color: '#080706',
        fontFamily: 'sans-serif',
        fontSize: '14px',
        fontWeight: 300,
        letterSpacing: '0.1em',
        opacity: 0.4,
      }}>
        Contact — Coming Soon
      </p>
    </main>
  );
}
```

### 5-2. `src/app/essays/page.tsx` — 전문 (24줄)

```tsx
export const metadata = { title: 'Essays' }

export default function EssaysPage() {
  return (
    <main style={{
      minHeight: '100vh',
      backgroundColor: '#FFFFFF',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <p style={{
        color: '#080706',
        fontFamily: 'sans-serif',
        fontSize: '14px',
        fontWeight: 300,
        letterSpacing: '0.1em',
        opacity: 0.4,
      }}>
        Essays — Coming Soon
      </p>
    </main>
  );
}
```

**두 페이지의 공통 사실:**
- 내용이 완전히 동일한 스텁. `metadata.title` 과 본문 문자열만 다름.
- `fontFamily: 'sans-serif'` — CLAUDE.md의 `FONT` 상수 규약(`'Pretendard Variable', Pretendard, …`)을 **따르지 않음**. 다른 파일은 `SiteHeader.tsx:8` 처럼 FONT 상수를 사용.
- nav 라벨 `CONTACTS`(복수, `SiteHeader.tsx:14`) / 경로 `/contact`(단수) / metadata title `Contacts`(복수) / 본문 `Contact`(단수) — **4곳 표기 불일치**.
- `description` / OG 없음 → layout의 사이트 전역 description이 그대로 상속됨.
- `noindex` 지정 없음 → Coming Soon 스텁 2개가 색인 대상 (§6 참조).

### 5-3. `sanity/schemaTypes/index.ts` — 전문 (11줄)

```ts
import { localeString, localeText, localePortableText } from './localeTypes'
import project from './project'
import { imageSlide, diagramSetSlide, creditsSlide, textSlide, quoteSlide, videoSlide } from './slides'
import about, { cvSimpleEntry, cvProjectEntry, cvEmployment, cvRankedEntry, cvVenueEntry } from './about'

export const schemaTypes = [
  localeString, localeText, localePortableText,
  project,
  imageSlide, diagramSetSlide, creditsSlide, textSlide, quoteSlide, videoSlide,
  about, cvSimpleEntry, cvProjectEntry, cvEmployment, cvRankedEntry, cvVenueEntry,
]
```

**사실:** 등록된 document 타입은 `project` 와 `about` **2개뿐**. `contact` 전용 스키마, `essay`/`post` 스키마, `siteSettings`(사이트 제목·기본 description·OG 이미지 보관용) 스키마는 **존재하지 않음**.

### 5-4. `sanity/schemaTypes/about.ts` — 전문 (138줄)

```ts
import { defineType, defineField, defineArrayMember } from 'sanity'

export default defineType({
  name: 'about',
  title: 'ABOUT',
  type: 'document',
  fields: [
    defineField({
      name: 'position',
      title: 'POSITION',
      type: 'localePortableText',
      description: '입장 서술. 문단 단위로 작성한다.',
    }),
    defineField({
      name: 'preoccupations',
      title: 'PREOCCUPATIONS',
      type: 'array',
      description: '반복적으로 되돌아가는 문제들. 순서대로 표시된다.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'preoccupation',
          fields: [
            defineField({ name: 'heading', title: 'HEADING', type: 'localeString' }),
            defineField({ name: 'body', title: 'BODY', type: 'localeText' }),
          ],
          preview: {
            select: { title: 'heading.en', subtitle: 'body.en' },
          },
        }),
      ],
    }),
    defineField({
      name: 'education',
      title: 'EDUCATION',
      type: 'array',
      of: [{ type: 'cvSimpleEntry' }],
    }),
    defineField({
      name: 'employment',
      title: 'EMPLOYMENT',
      type: 'array',
      description: '재직 이력. 각 재직처 아래에 프로젝트 목록이 붙는다.',
      of: [{ type: 'cvEmployment' }],
    }),
    defineField({
      name: 'awards',
      title: 'AWARDS',
      type: 'array',
      of: [{ type: 'cvRankedEntry' }],
    }),
    defineField({
      name: 'exhibitions',
      title: 'EXHIBITIONS AND PUBLICATIONS',
      type: 'array',
      of: [{ type: 'cvVenueEntry' }],
    }),
    defineField({
      name: 'contact',
      title: 'CONTACT',
      type: 'object',
      fields: [
        defineField({ name: 'location', title: 'LOCATION', type: 'string' }),
        defineField({ name: 'email', title: 'EMAIL', type: 'string' }),
        defineField({ name: 'phone', title: 'PHONE', type: 'string' }),
      ],
    }),
  ],
  preview: {
    prepare: () => ({ title: 'ABOUT' }),
  },
})

export const cvSimpleEntry = defineType({
  name: 'cvSimpleEntry',
  title: 'CV Simple Entry',
  type: 'object',
  fields: [
    defineField({ name: 'title', title: 'TITLE', type: 'string' }),
    defineField({ name: 'detail', title: 'DETAIL', type: 'string', description: '학위·전공 등 부제' }),
    defineField({ name: 'period', title: 'PERIOD', type: 'string', description: '예: 2005–2014' }),
  ],
  preview: { select: { title: 'title', subtitle: 'period' } },
})

export const cvProjectEntry = defineType({
  name: 'cvProjectEntry',
  title: 'CV Project Entry',
  type: 'object',
  fields: [
    defineField({ name: 'title', title: 'TITLE', type: 'string' }),
    defineField({ name: 'result', title: 'RESULT', type: 'string', description: '예: Winner, 2nd Prize' }),
    defineField({ name: 'year', title: 'YEAR', type: 'string' }),
  ],
  preview: { select: { title: 'title', subtitle: 'year' } },
})

export const cvEmployment = defineType({
  name: 'cvEmployment',
  title: 'CV Employment',
  type: 'object',
  fields: [
    defineField({ name: 'title', title: 'TITLE', type: 'string' }),
    defineField({ name: 'detail', title: 'DETAIL', type: 'string', description: '직위 범위 등' }),
    defineField({ name: 'period', title: 'PERIOD', type: 'string' }),
    defineField({
      name: 'projects',
      title: 'PROJECTS',
      type: 'array',
      of: [{ type: 'cvProjectEntry' }],
    }),
  ],
  preview: { select: { title: 'title', subtitle: 'period' } },
})

export const cvRankedEntry = defineType({
  name: 'cvRankedEntry',
  title: 'CV Ranked Entry',
  type: 'object',
  fields: [
    defineField({ name: 'title', title: 'TITLE', type: 'string' }),
    defineField({ name: 'result', title: 'RESULT', type: 'string' }),
    defineField({ name: 'year', title: 'YEAR', type: 'string' }),
  ],
  preview: { select: { title: 'title', subtitle: 'year' } },
})

export const cvVenueEntry = defineType({
  name: 'cvVenueEntry',
  title: 'CV Venue Entry',
  type: 'object',
  fields: [
    defineField({ name: 'title', title: 'TITLE', type: 'string' }),
    defineField({ name: 'venue', title: 'VENUE', type: 'string', description: '장소 또는 Published' }),
    defineField({ name: 'year', title: 'YEAR', type: 'string' }),
  ],
  preview: { select: { title: 'title', subtitle: 'venue' } },
})
```

**핵심:** 연락처 필드는 `about` 문서 내부의 `contact` 오브젝트(`about.ts:58-67`)에만 존재 — `location`, `email`, `phone` 3개 string.

### 5-5. `sanity.config.ts` — structure(싱글턴 처리) 전문 (54줄)

```ts
'use client'

import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { projectId, dataset } from './sanity/env'
import { schemaTypes } from './sanity/schemaTypes'

export default defineConfig({
  name: 'paikarchitects',
  title: 'Paik Architecture',
  projectId: projectId!,
  dataset,
  basePath: '/studio',
  plugins: [
    structureTool({
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
    }),
    visionTool(),
  ],
  schema: { types: schemaTypes },
})
```

**싱글턴 처리 방식 (사실):**
- `about` 은 `S.document().schemaType('about').documentId('about')` — **고정 문서 ID `'about'`** 으로 강제. 목록을 거치지 않고 단일 문서를 바로 연다.
- `S.list().items([...])` 로 루트를 **명시적 화이트리스트**로 구성 — `about` 아이템 + divider + published/hidden 프로젝트 목록. 등록된 타입이라도 이 목록에 없으면 스튜디오 루트에 노출되지 않는다.
- `document.newDocumentOptions` / `actions` 를 이용한 "about 신규 생성·삭제 차단"은 **설정되어 있지 않음**. 싱글턴 보장은 structure 레벨에서만 이뤄진다.
  → **[추정]** 스튜디오의 다른 경로(Vision, 글로벌 검색, 직접 URL)로 두 번째 `about` 문서를 만드는 것이 기술적으로 차단되지 않을 수 있다. 다만 조회 쿼리가 `_id == "about"` 로 고정되어 있어(§5-6) 사이트 렌더에는 영향이 없다.
- 스튜디오 `title` 이 `'Paik Architecture'` — 사이트 메타데이터의 `'Paik Architects'` 와 불일치.

### 5-6. About 하단 연락처(email · phone · location)의 출처

**결론: 하드코딩이 아니라 Sanity `about` 싱글턴 문서의 `contact` 오브젝트에서 온다.** 경로는 4단계.

**① 스키마 정의** — `sanity/schemaTypes/about.ts:58-67`

```ts
    defineField({
      name: 'contact',
      title: 'CONTACT',
      type: 'object',
      fields: [
        defineField({ name: 'location', title: 'LOCATION', type: 'string' }),
        defineField({ name: 'email', title: 'EMAIL', type: 'string' }),
        defineField({ name: 'phone', title: 'PHONE', type: 'string' }),
      ],
    }),
```

**② GROQ 쿼리** — `src/lib/sanity/queries.ts:142-158`

```ts
const ABOUT_QUERY = `*[_type == "about" && _id == "about"][0]{
  position,
  "preoccupations": preoccupations[]{ heading, body },
  "education": education[]{ title, detail, period },
  "employment": employment[]{
    title, detail, period,
    "projects": projects[]{ title, result, year }
  },
  "awards": awards[]{ title, result, year },
  "exhibitions": exhibitions[]{ title, venue, year },
  contact
}`

/** About 단일 문서. 문서가 없으면 null */
export async function getAbout(): Promise<About | null> {
  return sanityClient.fetch<About | null>(ABOUT_QUERY)
}
```

`contact` 는 서브필드 투영 없이 오브젝트 통째로 가져온다. 문서 선택은 `_id == "about"` 고정 — §5-5 싱글턴 구조와 일치.

**③ 타입** — `src/types/index.ts:174-188`

```ts
export interface AboutContact {
  location?: string
  email?: string
  phone?: string
}

export interface About {
  position?: LocalePortableText
  preoccupations?: Preoccupation[]
  education?: CvSimpleEntry[]
  employment?: CvEmployment[]
  awards?: CvRankedEntry[]
  exhibitions?: CvVenueEntry[]
  contact?: AboutContact
}
```

세 필드 모두 optional — 값이 없으면 렌더 생략.

**④ 렌더** — `src/app/about/page.tsx:147-162`

```tsx
        {/* ── CONTACT — 층이 아니다. 라벨 없음 ── */}
        {contact && (
          <div className="about-contact">
            <div />
            <div>
              {contact.location}
              {contact.email && (
                <>
                  {contact.location && ' · '}
                  <a href={`mailto:${contact.email}`}>{contact.email}</a>
                </>
              )}
              {contact.phone && <>{' · '}{contact.phone}</>}
            </div>
          </div>
        )}
```

구조분해 — `src/app/about/page.tsx:28`

```tsx
  const { position, preoccupations, education, employment, awards, exhibitions, contact } = about
```

페치·캐시 — `src/app/about/page.tsx:5,19`

```tsx
export const revalidate = 60
...
  const about = await getAbout()
```

**렌더 규칙 (원문 기준):** `location · email · phone` 순, 구분자 ` · `. `email` 은 `mailto:` 링크. `location` 이 없으면 email 앞 구분자가 생략되지만, phone 앞 구분자는 `contact.phone &&` 조건만 보므로 `location`·`email` 이 모두 비어 있어도 `' · '` 가 선행 출력된다 → **선행 구분자 노출 가능**(location·email 동시 부재 + phone만 존재 시). 실제 데이터에 그런 조합이 있는지는 Sanity 콘텐츠에 달려 있어 코드만으로는 미확정.

**연락처 하드코딩 여부:** `src/app/contact/page.tsx` 에는 이메일·전화·주소 문자열이 **전혀 없다**(§5-1 전문 — "Contact — Coming Soon" 한 줄뿐). 즉 `/contact` 라우트는 연락처를 표시하지 않으며, 실제 연락처는 `/about` 하단에만 존재한다.

---

## 6. SEO 파일 존재 여부

파일시스템 직접 확인 (`src`, `public` 전수 + 파일명 패턴 find):

| 파일 | 상태 |
|---|---|
| `src/app/robots.ts` | **없음** |
| `src/app/robots.txt` | **없음** |
| `public/robots.txt` | **없음** |
| `src/app/sitemap.ts` | **없음** |
| `src/app/sitemap.xml` | **없음** |
| `public/sitemap.xml` | **없음** |
| `src/app/opengraph-image.{tsx,png,jpg,jpeg,gif}` | **없음** |
| `src/app/twitter-image.*` | **없음** |
| 라우트별 `opengraph-image.*` (about/contact/essays/work/work-grid/[slug]) | **없음** |
| `public` 내 OG 이미지 | **없음** |
| `src/app/icon.*` | **없음** |
| `src/app/apple-icon.*` | **없음** |
| `src/app/manifest.ts` | **없음** |
| `src/app/favicon.ico` | **존재** (25,931 bytes, 2026-06-01) |

`find src public -iname "*opengraph*" -o -iname "*og-*" -o -iname "*og.*" -o -iname "*twitter-image*" -o -iname "favicon*" -o -iname "icon.*" -o -iname "apple-icon*" -o -iname "robots*" -o -iname "sitemap*" -o -iname "manifest*"` 결과 **전체**:

```
src/app/favicon.ico
```

`public/` 전체 (5개 파일, 전부 create-next-app 기본 에셋, 2026-06-01):

```
public/file.svg      (391 bytes)
public/globe.svg     (1035 bytes)
public/next.svg      (1375 bytes)
public/vercel.svg    (128 bytes)
public/window.svg    (385 bytes)
```

`src/app/` 최상위 전체:

```
about/  contact/  essays/  studio/  work/  work-grid/
favicon.ico   globals.css   layout.tsx   page.tsx
```

**요약:** robots·sitemap·OG 이미지·아이콘 세트 **전부 부재**. favicon.ico 1개만 존재하며 **[추정]** 생성 일자(2026-06-01, 레포 초기화일)와 크기로 미루어 create-next-app 기본 파비콘일 가능성이 높으나 바이너리를 비교하지 않았으므로 미확정.

`next.config.ts` 전문 (SEO 관련 설정 없음 확인):

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
```

**부가 관찰 (사실):** `remotePatterns` 에 `res.cloudinary.com` 만 등록되어 있다. 반면 현재 프로젝트 이미지는 Sanity CDN에서 온다 (`queries.ts:9` `"coverImage": coverImage.asset->url`) → **[추정]** `next/image` 를 쓴다면 `cdn.sanity.io` 미등록이 문제가 되겠으나, 이미지 렌더 경로(`src/lib/imageUrl.ts`)를 본 감사에서 검증하지 않았으므로 미확정.

---

## 7. 동적 라우트

### 7-1. `src/app/work/[slug]/page.tsx` — 전문 (20줄)

```tsx
import { getProjects, getProjectSlugs } from '@/lib/sanity/queries'
import { LandingExperience } from '@/components/LandingExperience'

export const dynamic = 'force-static'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const slugs = await getProjectSlugs()
  return slugs.map((slug) => ({ slug }))
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params
  const projects = await getProjects()
  // slug 유효성은 LandingExperience가 검증 — 없으면 initialSlug 무시되어 idle 랜딩으로 동작
  return <LandingExperience projects={projects} initialSlug={slug} />
}
```

| 항목 | 상태 | 근거 |
|---|---|---|
| `generateStaticParams` | **있음** | `work/[slug]/page.tsx:10-13` |
| `dynamicParams` | **없음** (미선언 → Next.js 기본값 `true`) | grep 0건 |
| `notFound()` | **없음** | grep 0건 |
| `generateMetadata` | **없음** | grep 0건 |
| `dynamic` | `'force-static'` | `:4` |

**동작상의 사실:** 존재하지 않는 slug로 진입해도 404가 아니라 `initialSlug` 가 무시된 랜딩 화면이 렌더된다 (`:18` 주석이 이를 명시). `dynamicParams` 미선언 + `dynamic = 'force-static'` 조합이므로 **[추정]** 빌드 시점 slug 목록 밖의 경로가 200 OK + 랜딩 화면으로 응답 → 검색엔진 관점의 **soft 404** 발생 가능. 실제 응답 코드는 빌드/런타임 검증이 필요하나 빌드 실행 금지 지시에 따라 미검증.

### 7-2. `src/app/work-grid/[slug]/page.tsx` — 전문 (40줄)

```tsx
// ── /work-grid/[slug] — 그리드 뷰 콘텐츠 딥링크 (GRID_URL_split §1) ──
//
// 그리드 콘텐츠 URL을 링월(/work/[slug])과 분리한다. 같은 프로젝트라도 뷰별로 URL이 다르므로
// 새로고침 시 열었던 뷰가 유지되고 링월로 튀지 않는다.
//
// 직접 진입(새로고침·공유)은 initialSlug로 GridExperience에 전달되어 morph 없이 콘텐츠를
// 즉시 표시한다(§2 방법 2). 클릭 진입은 SPA pushState라 이 라우트를 거치지 않는다.
//
// canonical은 /work/[slug]를 가리켜 SEO 중복을 해소한다. 향후 대표 뷰가 그리드로 승격되면
// 이 방향을 뒤집는다(§1-2).

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProjects, getProjectSlugs } from '@/lib/sanity/queries'
import { GridExperience } from '@/components/GridExperience'

export const dynamic = 'force-static'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const slugs = await getProjectSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return { alternates: { canonical: `/work/${slug}` } }
}

export default async function WorkGridSlugPage({ params }: Props) {
  const { slug } = await params
  const projects = await getProjects()
  // 링월(/work/[slug])과 달리 존재하지 않는 slug는 404로 끊는다 — 그리드 콘텐츠는
  // slug가 곧 열릴 프로젝트이므로 무시하고 랜딩으로 떨어뜨리면 URL과 화면이 어긋난다
  if (!projects.some((p) => p.id === slug)) notFound()
  return <GridExperience projects={projects} initialSlug={slug} />
}
```

| 항목 | 상태 | 근거 |
|---|---|---|
| `generateStaticParams` | **있음** | `work-grid/[slug]/page.tsx:23-26` |
| `dynamicParams` | **없음** (미선언 → 기본값 `true`) | grep 0건 |
| `notFound()` | **있음** | `:13` import, `:38` `if (!projects.some((p) => p.id === slug)) notFound()` |
| `generateMetadata` | **있음** (canonical만) | `:28-31` |
| `dynamic` | `'force-static'` | `:17` |

### 7-3. 두 동적 라우트 대조 (사실)

| | `/work/[slug]` | `/work-grid/[slug]` |
|---|---|---|
| generateStaticParams | 있음 | 있음 |
| dynamicParams | 미선언 | 미선언 |
| notFound | **없음** | 있음 |
| generateMetadata | **없음** | 있음 (canonical) |
| 잘못된 slug 처리 | 랜딩으로 폴백 | 404 |

**불일치:** 같은 slug 집합을 쓰는 두 라우트가 잘못된 slug에 대해 서로 다르게 동작한다. 또한 canonical 대상인 `/work/[slug]` 가 자기 자신의 metadata를 선언하지 않아 canonical 관계가 한쪽에서만 선언된 상태다.

---

## 8. `project` 스키마에서 OG에 쓸 수 있는 필드

`sanity/schemaTypes/project.ts` 발췌. OG(title / description / image / url) 구성에 직접 쓸 수 있는 필드만.

### 8-1. title (en / ko)

`sanity/schemaTypes/project.ts:33-38`

```ts
    defineField({
      name: 'title',
      title: 'TITLE',
      type: 'localeString',
      validation: (Rule) => Rule.required(),
    }),
```

- `localeString` 타입 → en/ko 구조. **required** 이므로 항상 값이 있음 (OG title 원천으로 안전).
- `title.en` / `title.ko` 경로는 동일 파일 `project.ts:198-200` preview가 증명:
  ```ts
  preview: {
    select: { title: 'title.en', subtitle: 'title.ko', media: 'coverImage' },
  },
  ```
- 쿼리 노출 — `src/lib/sanity/queries.ts:6` `careerNo, title, subtitle, year,`
- 타입 — `src/lib/sanity/queries.ts:55` `title: LocaleString`

### 8-2. slug (OG url 구성용)

`sanity/schemaTypes/project.ts:173-183`

```ts
    defineField({
      name: 'slug',
      title: 'SLUG',
      type: 'slug',
      description: '기존 게재 프로젝트의 슬러그는 SEO상 변경 금지',
      options: {
        source: (doc) => (doc as { title?: { en?: string } }).title?.en ?? '',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
```

- **required**. `title.en` 에서 자동 생성. description에 "SEO상 변경 금지" 명시.
- 쿼리에서 `id` 로 별칭 — `src/lib/sanity/queries.ts:5` `"id": slug.current,`
- 슬러그 전용 경량 쿼리 — `src/lib/sanity/queries.ts:49`
  ```ts
  const SLUGS_QUERY = `*[_type == "project" && published != false].slug.current`
  ```

### 8-3. coverImage (OG image 원천)

`sanity/schemaTypes/project.ts:143-148`

```ts
    defineField({
      name: 'coverImage',
      title: 'COVER IMAGE',
      type: 'image',
      options: { hotspot: true },
    }),
```

- **optional** (validation 없음) → OG image 폴백 필요.
- `hotspot: true` — 1200×630 크롭 시 기준점으로 활용 가능.
- 쿼리에서 URL·핫스팟·비율까지 이미 투영됨 — `src/lib/sanity/queries.ts:9-11`
  ```
  "coverImage": coverImage.asset->url,
  "coverHotspot": coverImage.hotspot{ x, y },
  "coverRatio": coverImage.asset->metadata.dimensions.aspectRatio,
  ```
- 타입 — `queries.ts:63` `coverImage: string | null`, 정규화 `queries.ts:88` `coverImage: r.coverImage ?? undefined,`

**보조 필드** — `project.ts:155-166`

```ts
    defineField({
      name: 'coverColor',
      title: 'COVER COLOR',
      type: 'string',
      initialValue: '#1E1C18',
      validation: (Rule) =>
        Rule.custom((value) => {
          if (value == null) return true
          if (typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value)) return true
          return '＃ 포함 6자리 HEX 색상으로 입력 (예: #1E1C18)'
        }),
    }),
```

→ `initialValue: '#1E1C18'` 가 있어 coverImage 부재 시 **OG 폴백 배경색**으로 활용 가능.

### 8-4. 설명(description) 후보 필드

**(a) `subtitle` — 가장 적합**

`sanity/schemaTypes/project.ts:39-44`

```ts
    defineField({
      name: 'subtitle',
      title: 'SUBTITLE',
      type: 'localeString',
      description: '프로젝트의 목적을 요약하는 한 줄. 타이틀 아래 표시된다',
    }),
```

- `localeString` (en/ko), optional. 스키마 description "프로젝트의 목적을 요약하는 한 줄" 이 OG description 의도와 정확히 부합.
- 쿼리 노출 `queries.ts:6`, 타입 `queries.ts:56` `subtitle: LocaleString | null`, 정규화 `queries.ts:81`.

**(b) `coverCaption`**

`sanity/schemaTypes/project.ts:149-154`

```ts
    defineField({
      name: 'coverCaption',
      title: 'COVER CAPTION',
      type: 'localeString',
      description: '커버 이미지 하단 캡션. 형식: LABEL — description. 미입력 시 캡션 없이 이미지만 표시된다',
    }),
```

- `LABEL — description` 형식이 섞여 있어 OG description으로 쓰려면 가공 필요. **[추정]** subtitle보다 부적합.

**(c) description 조립용 메타 필드 (전부 쿼리에 이미 투영됨)**

| 필드 | 위치 | 타입 / 제약 |
|---|---|---|
| `mainType` (TYPOLOGY) | `project.ts:91-98` | string, dropdown, **required** — "카드·메타에 노출되는 유일한 라벨" |
| `location` | `project.ts:85-90` | string, optional — "예: Seoul, KR" |
| `year` | `project.ts:130-136` | number, **required**, 2000–2100 — "설계 시작 연도" |
| `status` | `project.ts:123-129` | string, **required**, list: Idea / In progress / Under construction / Completed / Published |
| `client` | `project.ts:80-84` | string, optional |
| `size` | `project.ts:117-122` | string, optional |
| `role` | `project.ts:137-142` | string, optional |
| `awards[]` | `project.ts:45-79` | `{ title, visible }` 배열, optional |

→ required 조합 `mainType` + `year` + `status` 만으로도 subtitle 부재 시 기계 생성 description 폴백이 가능하다. (**[추정]** 구현 방안이며 현재 그런 코드는 없다.)

**(d) 게재 여부 게이트 — sitemap 생성 시 필수 고려**

`sanity/schemaTypes/project.ts:19-25`

```ts
    defineField({
      name: 'published',
      title: 'PUBLISHED',
      type: 'boolean',
      description: '체크 해제 시 사이트에 표시되지 않는다 (Studio에는 남는다)',
      initialValue: true,
    }),
```

`src/lib/sanity/queries.ts:4` 와 `:49` 의 두 쿼리 모두 `published != false` 필터를 이미 적용 중.

### 8-5. 정렬·우선순위 기준

`sanity/schemaTypes/project.ts:26-32`

```ts
    defineField({
      name: 'careerNo',
      title: 'CAREER NO.',
      type: 'number',
      description: "Career 엑셀 '프로젝트 연번' 기준 — 사이트 정렬 기준(내림차순) 및 표시 코드",
      validation: (Rule) => Rule.required().integer().positive(),
    }),
```

`sanity/schemaTypes/project.ts:167-172`

```ts
    defineField({
      name: 'featured',
      title: 'FEATURED',
      type: 'boolean',
      initialValue: false,
    }),
```

→ **[추정]** `featured: true` 프로젝트를 sitemap `priority` 상향 또는 사이트 대표 OG 이미지 선정에 쓸 수 있으나, 현재 그런 코드는 없다.

### 8-6. 8절 요약 — OG 구성 가능 여부

| OG 항목 | 사용 가능 필드 | 보장 여부 |
|---|---|---|
| `og:title` | `title.en` / `title.ko` | **항상 존재** (required) |
| `og:description` | `subtitle.en`/`.ko` → 폴백 `mainType`+`year`+`status` | subtitle은 optional, 폴백 소스는 required |
| `og:image` | `coverImage.asset->url` (+hotspot) | **optional** — 폴백 필요 (`coverColor` initialValue 존재) |
| `og:url` | `slug.current` | **항상 존재** (required) — 단 `metadataBase` 부재 (§1-1) |

---

## 9. `prefers-reduced-motion` 사용처

**grep 결과: 0건.**

대상 `src`, `sanity`, `public` / 패턴 `prefers-reduced-motion` / 대소문자 무시 / 전체 결과 → **No matches found**.

교차 확인으로 `matchMedia|reduced` 를 `src` 전체에 grep한 결과 (전 5건, 전부 무관):

| 파일:줄 | 원문 |
|---|---|
| `src/components/GridExperience.tsx:166` | `  // vp.w에서 파생하지 않는다: vp는 resize 이벤트만 따르고 matchMedia는 초기값도 정확하다.` |
| `src/components/GridExperience.tsx:172` | `    const mq = window.matchMedia('(max-width: 1023px)')` |
| `src/components/ProjectWall.tsx:253` | `  // D2 판정 — 텍스트 하단 배치 모드. matchMedia로 globals.css와 경계 동기.` |
| `src/components/ProjectWall.tsx:257` | `    const mq = window.matchMedia(...D2_MAX_WIDTH 템플릿 리터럴...)` |
| `src/hooks/useFinePointer.ts:14` | `    const mq = window.matchMedia('(hover: hover) and (pointer: fine)')` |

→ 기존 `matchMedia` 사용은 전부 뷰포트 폭 / 포인터 종류 판정이며, 모션 선호도 감지는 **없다**.

**영향 범위 (사실):** 모션 저감 대응 없이 동작하는 애니메이션이 최소한 아래에 존재한다.

| 위치 | 애니메이션 |
|---|---|
| `src/app/globals.css:43-46, 66` | `wordmarkFadeIn` 0.3s opacity |
| `src/app/globals.css:67-72` | 워드마크 top/left/transform/font-size **1600ms** cubic-bezier 이동 |
| `src/app/globals.css:93-98` | `no-color-transition` 변형 1600ms |
| `src/app/globals.css:122` | `.site-nav` `transition: opacity 400ms ease-out` |
| `src/app/globals.css:134` | `.site-nav-link` color / border-bottom-color 0.3s |
| `src/components/SiteHeader.tsx:61,63` | `moved` / `instant` 클래스 토글로 위 전환 구동 |

`instant` 클래스(`globals.css:75-78`, `SiteHeader.tsx:63`)가 `introSkipped` 시 애니메이션을 끄는 경로로 이미 존재한다 — **[추정]** 이 기존 메커니즘을 `prefers-reduced-motion` 에 연결하는 것이 최소 변경 경로로 보이나, `introSkipped` 의 설정 주체(`SiteChromeContext.tsx`)를 본 감사에서 전량 검토하지 않았으므로 미확정.

---

## 부록 A — 감사 중 관찰된 정합성 이슈 목록

| # | 이슈 | 근거 |
|---|---|---|
| A1 | `metadataBase` 부재 상태에서 상대 canonical 사용 | grep 0건 + `work-grid/[slug]/page.tsx:30` |
| A2 | OG 이미지 전무 (`openGraph.images` 없음, 파일도 없음) | `layout.tsx:13-19` + §6 |
| A3 | `/work/[slug]` 에 `generateMetadata` 없음 — 프로젝트 상세가 전부 동일 title/description/OG | `work/[slug]/page.tsx` 전 20줄 |
| A4 | robots·sitemap 전무 | §6 |
| A5 | OG url(`paikarchitects.com`)과 실제 배포 도메인(`paikarchitects.vercel.app`) 불일치 | `layout.tsx:18` + CLAUDE.md |
| A6 | 브랜드 표기 3종: `Paik Architects`(사이트) / `Paik Architecture`(스튜디오) / `Architect Changhyun Paik`(CLAUDE.md) | `layout.tsx:8`, `sanity.config.ts:11`, CLAUDE.md |
| A7 | Contact 표기 4종 불일치: nav `CONTACTS` / 경로 `/contact` / title `Contacts` / 본문 `Contact` | `SiteHeader.tsx:14`, `contact/page.tsx:1,20` |
| A8 | Coming Soon 스텁 2개에 noindex 없음 | §5-1, §5-2 |
| A9 | 스텁 2개가 FONT 상수 대신 `'sans-serif'` 사용 | `contact/page.tsx:14`, `essays/page.tsx:14` |
| A10 | 미사용 Google Fonts link 잔존 (CLAUDE.md 기재 미완료 항목) | `layout.tsx:36-39` |
| A11 | `IntroPhase` 에 `'collapsed'` 값 잔존 — ACP 제거 후 미정리 | `SiteChromeContext.tsx:6` vs `SiteHeader.tsx:41` |
| A12 | `LandingExperience.tsx:218` 주석이 존재하지 않는 "ACP 모노그램" 지칭 | `LandingExperience.tsx:218` |
| A13 | CLAUDE.md 워드마크 사양 전체가 `7ef6670`(2026-07-23) 이전 기준 | §3-1 대조 |
| A14 | `/work/[slug]` 와 `/work-grid/[slug]` 의 잘못된 slug 처리 불일치 (폴백 vs 404) | §7-3 |
| A15 | `prefers-reduced-motion` 미대응 (1600ms 이동 전환 포함) | §9 |
| A16 | `next.config.ts` `remotePatterns` 에 Cloudinary만 등록, Sanity CDN 미등록 | `next.config.ts` + `queries.ts:9` |
| A17 | About `contact` 렌더에서 phone 앞 구분자가 무조건 선행 | `about/page.tsx:159` |
| A18 | `about` 싱글턴이 structure 레벨로만 보장 (`newDocumentOptions`/`actions` 미설정) | `sanity.config.ts:22-29` |

---

## 부록 B — 본 감사에서 검토하지 않은 파일 (범위 한계 명시)

아래 파일은 요청 항목에 해당하지 않아 열지 않았다. 위 **[추정]** 항목 중 일부는 이 파일들을 읽어야 확정된다.

```
src/components/SiteChromeContext.tsx   (전문 미검토 — introSkipped / IntroPhase 'collapsed' 실사용 여부)
src/components/LandingExperience.tsx   (218행 주변만 확인)
src/components/GridExperience.tsx      (166·172행만 확인)
src/components/ProjectWall.tsx         (253·257행만 확인)
src/components/MobileProjectWall.tsx   (330행만 확인 — grep 목적)
src/components/ContentArea.tsx, GridContentArea.tsx, ControlBar.tsx,
src/components/ViewToggle.tsx, AboutNav.tsx, MobileFilterPanel.tsx, MobileGridContent.tsx
src/lib/imageUrl.ts, src/lib/projectMeta.ts, src/lib/bilingual.tsx, src/lib/shuffle.ts
src/lib/sanity/client.ts, sanity/env.ts
sanity/schemaTypes/localeTypes.ts, sanity/schemaTypes/slides.ts
src/app/about/page.tsx                 (1-32행, 143-163행만 확인)
src/app/globals.css                    (40-184행만 확인, 총 16,609 bytes)
src/types/index.ts                     (174-188행만 확인)
scripts/                               (전체 미검토)
```

---

## 부록 C — 실행한 명령 (전부 읽기 전용)

```
git log --all --oneline -i --grep="ACP"
git log --all --oneline -i --grep="logo"
git log --all --oneline -i --grep="wordmark"
git log --all -S "ACP" --oneline
git log --all -S "ACP" --oneline --name-only
git log --all -S "monogram" -i --oneline --name-only
git log --all -S "collapse" --oneline --name-only -- src/app/globals.css src/components/SiteHeader.tsx src/app/page.tsx
git log --all --reverse -S ".collapsed .rest" --oneline -- src/app/globals.css
git log --all --reverse -S "collapsed" --oneline -- src/app/page.tsx
git log --all --oneline -- src/app/globals.css
git show --stat --format="%H%n%ad%n%s" 7ef6670
git show 7ef6670 -- src/app/globals.css
git show 7ef6670 -- src/components/SiteHeader.tsx
git show 036661a -- src/app/globals.css
git show 7ef6670^:src/app/globals.css
git show -s --format=... --date=short <각 커밋>
git grep -n "ACP" -- src sanity public
git grep -c "ACP" -- .
git grep -n -i "metadataBase|canonical|alternates|noindex|robots" -- src sanity
git grep -n -i "matchMedia|reduced" -- src
ls -la / find   (파일 존재 확인)
Read / Grep     (파일 열람·검색)
```

`npm run dev`, `npm run build`, `npx tsc` 는 실행하지 않았다. git은 `log` / `show` / `grep` 만 사용했다. 이 보고서 파일 외에 생성·수정·삭제한 파일은 없다.
