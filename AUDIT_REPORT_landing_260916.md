# AUDIT_REPORT_landing_260916 — 대표 모드 전환 착수 전 현황 감사 결과

감사 대상: `D:\00 Web\paikarchitects`
명세: `AUDIT_landing_switch_260916.md`
실행일: 2026-09-16
검색 제외: `node_modules`, `.next`, `.git`
생성 파일: 본 파일 1개. 소스 파일 수정·삭제·이동·포맷 없음.

---

## 1. 라우팅 현황

### 1-1. `src/app` 디렉터리 트리

```
src/app/
├── about/
│   └── page.tsx                    6342 B
├── contact/
│   └── page.tsx                     523 B
├── essays/
│   └── page.tsx                     519 B
├── studio/
│   └── [[...tool]]/
│       └── page.tsx                 191 B
├── work/
│   ├── [slug]/
│   │   └── page.tsx                 684 B
│   └── page.tsx                     312 B
├── work-grid/
│   ├── [slug]/
│   │   └── page.tsx                1781 B
│   └── page.tsx                     288 B
├── favicon.ico                    25931 B
├── globals.css                    16609 B
├── layout.tsx                      1488 B
└── page.tsx                         293 B
```

디렉터리 4개(`about`, `contact`, `essays`, `studio`) + 2개(`work`, `work-grid`), 파일 12개.

### 1-2. 지정 파일 전문

#### `src/app/page.tsx` — 존재

```tsx
 1  import { getProjects } from '@/lib/sanity/queries'
 2  import { LandingExperience } from '@/components/LandingExperience'
 3
 4  export const dynamic = 'force-static'
 5
 6  export default async function HomePage() {
 7    const projects = await getProjects()
 8    return <LandingExperience projects={projects} />
 9  }
```

#### `src/app/work/page.tsx` — 존재

```tsx
 1  import { getProjects } from '@/lib/sanity/queries'
 2  import { LandingExperience } from '@/components/LandingExperience'
 3
 4  export const dynamic = 'force-static'
 5
 6  export default async function WorkPage() {
 7    const projects = await getProjects()
 8    return <LandingExperience projects={projects} initialShowFilters />
 9  }
```

#### `src/app/work/[slug]/page.tsx` — 존재

```tsx
 1  import { getProjects, getProjectSlugs } from '@/lib/sanity/queries'
 2  import { LandingExperience } from '@/components/LandingExperience'
 3
 4  export const dynamic = 'force-static'
 5
 6  interface Props {
 7    params: Promise<{ slug: string }>
 8  }
 9
10  export async function generateStaticParams() {
11    const slugs = await getProjectSlugs()
12    return slugs.map((slug) => ({ slug }))
13  }
14
15  export default async function ProjectPage({ params }: Props) {
16    const { slug } = await params
17    const projects = await getProjects()
18    // slug 유효성은 LandingExperience가 검증 — 없으면 initialSlug 무시되어 idle 랜딩으로 동작
19    return <LandingExperience projects={projects} initialSlug={slug} />
20  }
```

#### `src/app/work-grid/page.tsx` — 존재

```tsx
 1  import { getProjects } from '@/lib/sanity/queries'
 2  import { GridExperience } from '@/components/GridExperience'
 3
 4  export const dynamic = 'force-static'
 5
 6  export default async function WorkGridPage() {
 7    const projects = await getProjects()
 8    return <GridExperience projects={projects} />
 9  }
```

#### `src/app/work-grid/[slug]/page.tsx` — 존재

```tsx
 1  // ── /work-grid/[slug] — 그리드 뷰 콘텐츠 딥링크 (GRID_URL_split §1) ──
 2  //
 3  // 그리드 콘텐츠 URL을 링월(/work/[slug])과 분리한다. 같은 프로젝트라도 뷰별로 URL이 다르므로
 4  // 새로고침 시 열었던 뷰가 유지되고 링월로 튀지 않는다.
 5  //
 6  // 직접 진입(새로고침·공유)은 initialSlug로 GridExperience에 전달되어 morph 없이 콘텐츠를
 7  // 즉시 표시한다(§2 방법 2). 클릭 진입은 SPA pushState라 이 라우트를 거치지 않는다.
 8  //
 9  // canonical은 /work/[slug]를 가리켜 SEO 중복을 해소한다. 향후 대표 뷰가 그리드로 승격되면
10  // 이 방향을 뒤집는다(§1-2).
11
12  import type { Metadata } from 'next'
13  import { notFound } from 'next/navigation'
14  import { getProjects, getProjectSlugs } from '@/lib/sanity/queries'
15  import { GridExperience } from '@/components/GridExperience'
16
17  export const dynamic = 'force-static'
18
19  interface Props {
20    params: Promise<{ slug: string }>
21  }
22
23  export async function generateStaticParams() {
24    const slugs = await getProjectSlugs()
25    return slugs.map((slug) => ({ slug }))
26  }
27
28  export async function generateMetadata({ params }: Props): Promise<Metadata> {
29    const { slug } = await params
30    return { alternates: { canonical: `/work/${slug}` } }
31  }
32
33  export default async function WorkGridSlugPage({ params }: Props) {
34    const { slug } = await params
35    const projects = await getProjects()
36    // 링월(/work/[slug])과 달리 존재하지 않는 slug는 404로 끊는다 — 그리드 콘텐츠는
37    // slug가 곧 열릴 프로젝트이므로 무시하고 랜딩으로 떨어뜨리면 URL과 화면이 어긋난다
38    if (!projects.some((p) => p.id === slug)) notFound()
39    return <GridExperience projects={projects} initialSlug={slug} />
40  }
```

#### `src/app/works/page.tsx` — 없음

#### `src/app/layout.tsx` — 존재

```tsx
 1  import type { Metadata } from 'next'
 2  import './globals.css'
 3  import { SiteChromeProvider } from '@/components/SiteChromeContext'
 4  import { SiteHeader } from '@/components/SiteHeader'
 5
 6  export const metadata: Metadata = {
 7    title: {
 8      default: 'Paik Architects',
 9      template: '%s — Paik Architects',
10    },
11    description:
12      'Paik Architects is the architecture practice of Chang Hyun Paik, based in Seoul, South Korea. A decade of professional practice spanning culture, infrastructure, and civic work.',
13    openGraph: {
14      title: 'Paik Architects',
15      description:
16        'The architecture practice of Chang Hyun Paik. A decade of professional work spanning culture, infrastructure, and civic projects.',
17      type: 'website',
18      url: 'https://paikarchitects.com',
19    },
20  }
21
22  export default function RootLayout({
23    children,
24  }: {
25    children: React.ReactNode
26  }) {
27    return (
28      <html lang="en">
29        <head>
30          <link rel="preconnect" href="https://fonts.googleapis.com" />
31          <link
32            rel="preconnect"
33            href="https://fonts.gstatic.com"
34            crossOrigin=""
35          />
36          <link
37            href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400&display=swap"
38            rel="stylesheet"
39          />
40        </head>
41        <body>
42          <SiteChromeProvider>
43            <SiteHeader />
44            {children}
45          </SiteChromeProvider>
46        </body>
47      </html>
48    )
49  }
```

### 1-3. export 유무·값 표

| 파일 | `dynamic` | `revalidate` | `generateStaticParams` | `metadata` | `generateMetadata` |
|---|---|---|---|---|---|
| `src/app/page.tsx` | 있음 — `'force-static'` (4행) | 없음 | 없음 | 없음 | 없음 |
| `src/app/work/page.tsx` | 있음 — `'force-static'` (4행) | 없음 | 없음 | 없음 | 없음 |
| `src/app/work/[slug]/page.tsx` | 있음 — `'force-static'` (4행) | 없음 | 있음 (10–13행) | 없음 | 없음 |
| `src/app/work-grid/page.tsx` | 있음 — `'force-static'` (4행) | 없음 | 없음 | 없음 | 없음 |
| `src/app/work-grid/[slug]/page.tsx` | 있음 — `'force-static'` (17행) | 없음 | 있음 (23–26행) | 없음 | 있음 (28–31행), 반환값 `{ alternates: { canonical: '/work/${slug}' } }` |
| `src/app/works/page.tsx` | 파일 없음 | 파일 없음 | 파일 없음 | 파일 없음 | 파일 없음 |
| `src/app/layout.tsx` | 없음 | 없음 | 없음 | 있음 (6–20행) | 없음 |

---

## 2. 대표 모드 토글(landingMode) 구현 여부

### 2-1. 전수 검색 결과

`landingMode` / `siteSettings` / `landing_mode` 통합 검색 — 저장소 전체 5건, **그중 `src/`·`sanity/` 소스 0건**.

```
AUDIT_landing_switch_260916.md:42:## 2. 대표 모드 토글(landingMode) 구현 여부
AUDIT_landing_switch_260916.md:45:- `landingMode`
AUDIT_landing_switch_260916.md:46:- `siteSettings`
AUDIT_landing_switch_260916.md:47:- `landing_mode`
GRID_MODE_PHASE1_SPEC.md:185:- Sanity `landingMode` 싱글턴, canonical 강등, 실제 뷰 전환.
```

식별자별 내역:

| 식별자 | 소스(`src/`, `sanity/`, `scripts/`) | 문서(`.md`) |
|---|---|---|
| `landingMode` | 없음(0건) | 2건 — `AUDIT_landing_switch_260916.md:42`, `GRID_MODE_PHASE1_SPEC.md:185` |
| `siteSettings` | 없음(0건) | 1건 — `AUDIT_landing_switch_260916.md:46` |
| `landing_mode` | 없음(0건) | 1건 — `AUDIT_landing_switch_260916.md:47` |

(`AUDIT_landing_switch_260916.md` 4건은 본 감사 명세 자신의 항목 제목·검색어 목록이다.)

### 2-2. `sanity/schemaTypes/` 파일 목록 및 `index.ts` 전문

파일 목록 (5개):

| 파일 | 크기 |
|---|---|
| `sanity/schemaTypes/about.ts` | 4351 B |
| `sanity/schemaTypes/index.ts` | 573 B |
| `sanity/schemaTypes/localeTypes.ts` | 1853 B |
| `sanity/schemaTypes/project.ts` | 6911 B |
| `sanity/schemaTypes/slides.ts` | 6291 B |

(`sanity/` 최상위에는 그 외 `sanity/env.ts` 309 B가 있다.)

`sanity/schemaTypes/index.ts` 전문:

```ts
 1  import { localeString, localeText, localePortableText } from './localeTypes'
 2  import project from './project'
 3  import { imageSlide, diagramSetSlide, creditsSlide, textSlide, quoteSlide, videoSlide } from './slides'
 4  import about, { cvSimpleEntry, cvProjectEntry, cvEmployment, cvRankedEntry, cvVenueEntry } from './about'
 5
 6  export const schemaTypes = [
 7    localeString, localeText, localePortableText,
 8    project,
 9    imageSlide, diagramSetSlide, creditsSlide, textSlide, quoteSlide, videoSlide,
10    about, cvSimpleEntry, cvProjectEntry, cvEmployment, cvRankedEntry, cvVenueEntry,
11  ]
```

### 2-3. Studio 구조 설정 파일

`structure` 문자열 전수 검색 — 저장소 전체 10개 파일. 이 중 소스 파일은 2개(`src/types/index.ts`, `src/app/layout.tsx`)이며 **둘 다 `Infrastructure`/`infrastructure` 부분 일치로, Studio 구조와 무관**:

```
src\types\index.ts:10:  | 'Infrastructure'
src\types\index.ts:21:  'Infrastructure', 'Healthcare', 'Remodeling', 'Interior',
src\app\layout.tsx:12:    'Paik Architects is the architecture practice of Chang Hyun Paik, based in Seoul, South Korea. A decade of professional practice spanning culture, infrastructure, and civic work.',
src\app\layout.tsx:16:      'The architecture practice of Chang Hyun Paik. A decade of professional work spanning culture, infrastructure, and civic projects.',
```

나머지 7개는 `.md` 문서(`AUDIT_landing_switch_260916.md`, `WORDMARK_UNIFY_SPEC.md`, `ABOUT_FINISH_STUDIO_SPEC.md`, `ABOUT_PAGE_SPEC.md`, `SANITY_STUDIO_SPEC.md`, `CATEGORY_SPEC_260707.md`, `AGENTS.md`).

**Studio 구조를 실제로 정의하는 파일은 `sanity.config.ts` 1개다.** 전문:

```ts
 1  'use client'
 2
 3  import { defineConfig } from 'sanity'
 4  import { structureTool } from 'sanity/structure'
 5  import { visionTool } from '@sanity/vision'
 6  import { projectId, dataset } from './sanity/env'
 7  import { schemaTypes } from './sanity/schemaTypes'
 8
 9  export default defineConfig({
10    name: 'paikarchitects',
11    title: 'Paik Architecture',
12    projectId: projectId!,
13    dataset,
14    basePath: '/studio',
15    plugins: [
16      structureTool({
17        structure: (S) =>
18          S.list()
19            .title('Content')
20            .items([
21              S.listItem()
22                .title('ABOUT')
23                .id('about')
24                .child(
25                  S.document()
26                    .schemaType('about')
27                    .documentId('about')
28                    .title('ABOUT')
29                ),
30              S.divider(),
31              S.listItem()
32                .title('PROJECTS — PUBLISHED')
33                .id('projectsPublished')
34                .child(
35                  S.documentList()
36                    .title('Published Projects')
37                    .filter('_type == "project" && published != false')
38                    .defaultOrdering([{ field: 'careerNo', direction: 'desc' }])
39                ),
40              S.listItem()
41                .title('PROJECTS — HIDDEN')
42                .id('projectsHidden')
43                .child(
44                  S.documentList()
45                    .title('Hidden Projects')
46                    .filter('_type == "project" && published == false')
47                    .defaultOrdering([{ field: 'careerNo', direction: 'desc' }])
48                ),
49            ]),
50      }),
51      visionTool(),
52    ],
53    schema: { types: schemaTypes },
54  })
```

싱글턴 처리 부분 발췌 (21–29행) — 고정 `documentId('about')` 1건:

```ts
21              S.listItem()
22                .title('ABOUT')
23                .id('about')
24                .child(
25                  S.document()
26                    .schemaType('about')
27                    .documentId('about')
28                    .title('ABOUT')
29                ),
```

ABOUT 외 싱글턴 항목: 없음(0건).

---

## 3. 뷰 전환 링크·URL 문자열 전수

### 3-1. 패턴별 전수 검색 결과 (검색 범위 `src/`)

#### `/work-grid` — 11건

```
src\components\GridContentArea.tsx:3:// ── GridContentArea — 그리드 뷰(/work-grid) 전용 콘텐츠 영역 (GRID_CONTENT_AREA_SPEC §3-2) ──
src\components\GridContentArea.tsx:815:      // 새로고침·공유로 /work-grid/[slug]를 열면 출발 카드 rect가 존재하지 않는다. 모프 레이어를
src\components\GridExperience.tsx:5:// 링월(/work)·랜딩(/)·ContentArea를 일절 건드리지 않는 완전 독립 라우트(/work-grid)의 루트.
src\components\GridExperience.tsx:101:  // 직접 진입(/work-grid/[slug] 새로고침·공유) 시 즉시 열 프로젝트 slug. 없으면 그리드 랜딩만
src\components\GridExperience.tsx:124:  // URL은 이미 /work-grid/[slug]이므로 pushState 불요.
src\components\GridExperience.tsx:310:    // 브라우저 뒤로가기 = 닫기. URL은 그리드 전용 /work-grid/[slug] — 링월 /work/[slug]와
src\components\GridExperience.tsx:312:    window.history.pushState({ gridContent: project.id }, '', `/work-grid/${project.id}`)
src\components\GridExperience.tsx:337:    if (window.location.pathname !== '/work-grid') {
src\components\GridExperience.tsx:338:      window.history.replaceState({}, '', '/work-grid')
src\components\GridExperience.tsx:404:        전역 헤더는 /work-grid를 light 경로로 모르므로(SiteHeader의 STATIC_LIGHT_PATHS 미포함,
src\app\work-grid\[slug]\page.tsx:1:// ── /work-grid/[slug] — 그리드 뷰 콘텐츠 딥링크 (GRID_URL_split §1) ──
```

실행 코드(주석 제외) 3건: `GridExperience.tsx:312`, `:337`, `:338`.

#### `'/work'` · `"/work"` · `` `/work `` (따옴표·백틱 선행 리터럴) — 18건

```
src\components\GridExperience.tsx:312:    window.history.pushState({ gridContent: project.id }, '', `/work-grid/${project.id}`)
src\components\GridExperience.tsx:337:    if (window.location.pathname !== '/work-grid') {
src\components\GridExperience.tsx:338:      window.history.replaceState({}, '', '/work-grid')
src\components\GridExperience.tsx:539:            href="/work"
src\components\LandingExperience.tsx:144:    window.history.pushState({}, '', mobileRef.current || showFilters ? '/work' : '/')
src\components\LandingExperience.tsx:161:      if (path.startsWith('/work/')) {
src\components\LandingExperience.tsx:162:        const slug = path.slice('/work/'.length)
src\components\LandingExperience.tsx:166:      } else if (path === '/work') {
src\components\LandingExperience.tsx:187:    window.history.pushState({}, '', `/work/${p.id}`)
src\components\LandingExperience.tsx:196:    window.history.pushState({}, '', `/work/${slug}`)
src\components\LandingExperience.tsx:205:    window.history.pushState({}, '', '/work')
src\components\ProjectCard.tsx:15:      href={`/work/${project.id}`}
src\components\SiteHeader.tsx:12:  { label: 'WORKS',    href: '/work'    },
src\components\SiteHeader.tsx:19:const STATIC_LIGHT_PATHS = new Set(['/about', '/work', '/essays', '/contact'])
src\components\SiteHeader.tsx:22:  return STATIC_LIGHT_PATHS.has(pathname) || pathname.startsWith('/work/')
src\components\SiteHeader.tsx:79:          const current = pathname === href || (href === '/work' && pathname.startsWith('/work'))
src\components\SiteHeader.tsx:130:          const current = pathname === href || (href === '/work' && pathname.startsWith('/work'))
src\app\work-grid\[slug]\page.tsx:30:    return { alternates: { canonical: `/work/${slug}` } }
```

(위 18건 중 `GridExperience.tsx:312`, `:337`, `:338` 3건은 `/work-grid` 접두 일치분이다. `/work-grid`를 제외한 `'/work'` 계열은 15건.)

#### `/works` — 없음(0건)

#### `router.push` — 없음(0건)
#### `router.replace` — 없음(0건)

#### `history.pushState` — 6건

```
src\components\LandingExperience.tsx:144:    window.history.pushState({}, '', mobileRef.current || showFilters ? '/work' : '/')
src\components\LandingExperience.tsx:187:    window.history.pushState({}, '', `/work/${p.id}`)
src\components\LandingExperience.tsx:196:    window.history.pushState({}, '', `/work/${slug}`)
src\components\LandingExperience.tsx:205:      window.history.pushState({}, '', '/work')
src\components\GridExperience.tsx:312:    window.history.pushState({ gridContent: project.id }, '', `/work-grid/${project.id}`)
```

(실제 5건. `LandingExperience.tsx` 4건 + `GridExperience.tsx` 1건.)

#### `history.replaceState` — 1건

```
src\components\GridExperience.tsx:338:      window.history.replaceState({}, '', '/work-grid')
```

#### `usePathname` — 4건

```
src\components\SiteHeader.tsx:4:import { usePathname } from 'next/navigation'
src\components\SiteHeader.tsx:26:  const pathname = usePathname()
src\components\SiteChromeContext.tsx:4:import { usePathname } from 'next/navigation'
src\components\SiteChromeContext.tsx:31:  const pathname = usePathname()
```

#### `href=` — 13건

```
src\components\AboutNav.tsx:50:            href={`#${id}`}
src\components\Header.tsx:6:      <Link href="/" className="site-header-name">
src\components\Header.tsx:10:        <Link href="/" className="site-header-link">Work</Link>
src\components\Header.tsx:11:        <Link href="/about" className="site-header-link">About</Link>
src\components\Header.tsx:12:        <Link href="/about#contact" className="site-header-link">Contact</Link>
src\components\GridExperience.tsx:539:            href="/work"
src\components\ProjectCard.tsx:15:      href={`/work/${project.id}`}
src\app\layout.tsx:30:        <link rel="preconnect" href="https://fonts.googleapis.com" />
src\app\layout.tsx:33:          href="https://fonts.gstatic.com"
src\app\layout.tsx:37:          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400&display=swap"
src\components\SiteHeader.tsx:55:        href="/"
src\components\SiteHeader.tsx:83:              href={href}
src\components\SiteHeader.tsx:134:              href={href}
src\app\about\page.tsx:156:                  <a href={`mailto:${contact.email}`}>{contact.email}</a>
```

### 3-2. 뷰 토글 UI 컴포넌트 특정

3-1 결과 중 뷰 간 이동 링크는 `src/components/GridExperience.tsx:539`의 `href="/work"` 1건이다. 해당 JSX 블록 발췌 (`GridExperience.tsx` 524–565행):

```tsx
524            }
525          >
526            <span style={{
527              fontSize: 7,
528              lineHeight: 1,
529              opacity: t === activeFilter ? 1 : 0,
530              transition: 'opacity 200ms',
531            }}>●</span>
532            {t}
533          </button>
534        ))}
535      </div>
536
537      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
538        <Link
539          href="/work"
540          style={{
541            fontFamily: FONT,
542            fontSize: 11,
543            fontWeight: 300,
544            letterSpacing: '0.12em',
545            textTransform: 'uppercase',
546            color: '#080706',
547            opacity: 0.5,
548            textDecoration: 'none',
549          }}
550        >
551          Ring
552        </Link>
553        <span style={{ opacity: 0.25, fontSize: 11 }}>|</span>
554        <span style={{
555          fontFamily: FONT,
556          fontSize: 11,
557          fontWeight: 500,
558          letterSpacing: '0.12em',
559          textTransform: 'uppercase',
560          color: '#080706',
561        }}>
562          Grid
563        </span>
564      </div>
565    </div>
```

토글 요소 구성: `Link href="/work"` (라벨 `Ring`, 538–552행) + 구분자 `|` (553행) + `span` (라벨 `Grid`, 554–563행). `Grid` 쪽은 `Link`가 아닌 `span`이다.

**링월(`LandingExperience.tsx`) 측에서 `/work-grid`로 이동하는 링크·버튼: 없음(0건).** (3-1 `/work-grid` 검색 11건 중 `LandingExperience.tsx` 출현 0건.)

### 3-3. 헤더·워드마크·내비게이션의 WORKS 링크 대상 경로

`src/components/SiteHeader.tsx` — NAV_ITEMS 정의 (10–15행):

```tsx
10  const NAV_ITEMS = [
11    { label: 'ABOUT',    href: '/about'   },
12    { label: 'WORKS',    href: '/work'    },
13    { label: 'ESSAYS',   href: '/essays'  },
14    { label: 'CONTACTS', href: '/contact' },
15  ] as const
```

light 경로 판정 (17–23행):

```tsx
17  // 랜딩(/) 외 페이지 중 흰 배경(light) 레이아웃을 사용하는 경로
18  // /work 계열(/work, /work/[slug])은 LandingExperience 흰 셸을 렌더하므로 항상 light
19  const STATIC_LIGHT_PATHS = new Set(['/about', '/work', '/essays', '/contact'])
20
21  function isStaticLight(pathname: string): boolean {
22    return STATIC_LIGHT_PATHS.has(pathname) || pathname.startsWith('/work/')
23  }
```

워드마크 링크 대상 (54–56행):

```tsx
54      <Link
55        href="/"
56        aria-label="Home"
```

데스크톱 nav 렌더 (78–90행):

```tsx
78        {NAV_ITEMS.map(({ label, href }) => {
79          const current = pathname === href || (href === '/work' && pathname.startsWith('/work'))
80          return (
81            <Link
82              key={label}
83              href={href}
84              className={current ? 'site-nav-link is-current' : 'site-nav-link'}
85              style={{ color: navOnLight ? '#0a0908' : '#ffffff' }}
86            >
87              {label}
88            </Link>
89          )
90        })}
```

모바일 메뉴 패널 렌더 (129–136행):

```tsx
129        {NAV_ITEMS.map(({ label, href }) => {
130          const current = pathname === href || (href === '/work' && pathname.startsWith('/work'))
131          return (
132            <Link
133              key={label}
134              href={href}
135              onClick={() => setMenuOpen(false)}
136              className={current ? 'mobile-menu-link is-current' : 'mobile-menu-link'}
```

`src/components/Header.tsx` — Work 링크 대상 (6–12행):

```tsx
 6      <Link href="/" className="site-header-name">
...
10        <Link href="/" className="site-header-link">Work</Link>
11        <Link href="/about" className="site-header-link">About</Link>
12        <Link href="/about#contact" className="site-header-link">Contact</Link>
```

---

## 4. SEO·정규 URL

### 4-1. 파일 존재 여부 및 전문

| 파일 | 존재 여부 |
|---|---|
| `src/app/sitemap.ts` | **없음** |
| `src/app/robots.ts` | **없음** |
| `public/sitemap.xml` | **없음** |
| `public/robots.txt` | **없음** |

전문: 4개 파일 모두 없으므로 없음(0건).

`public/` 디렉터리 실제 내용 (5개, 전부 `.svg`): `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`.

### 4-2. 전수 검색 결과 (검색 범위 `src/`)

| 패턴 | 건수 |
|---|---|
| `canonical` | 2건 |
| `alternates` | 1건 |
| `metadataBase` | 없음(0건) |
| `noindex` | 없음(0건) |
| `robots:` | 없음(0건) |

```
src\app\work-grid\[slug]\page.tsx:9:// canonical은 /work/[slug]를 가리켜 SEO 중복을 해소한다. 향후 대표 뷰가 그리드로 승격되면
src\app\work-grid\[slug]\page.tsx:30:  return { alternates: { canonical: `/work/${slug}` } }
```

(9행은 주석, 30행은 실행 코드. `alternates`는 30행 1건뿐이다.)

---

## 5. 딥링크 진입·복귀 동작

### 5-1. `src/components/GridExperience.tsx` (총 780행)

#### `initialSlug` — 6건 (99–131행)

```tsx
 99  interface GridExperienceProps {
100    projects: Project[]   // Sanity에서 careerNo 내림차순 정렬 상태로 도착 — 재정렬 불요
101    // 직접 진입(/work-grid/[slug] 새로고침·공유) 시 즉시 열 프로젝트 slug. 없으면 그리드 랜딩만
102    // (GRID_URL_split §2-1)
103    initialSlug?: string
104  }
105
106  export function GridExperience({ projects, initialSlug }: GridExperienceProps) {
107    const total = projects.length
108
109    // ── 필터 — 숨김이 아니라 재정렬 + dim (§4) ──
110    const FILTER_TYPES = useMemo(() => ['All', ...TYPOLOGY_ORDER.filter(t =>
111      projects.some(p => p.type === t || p.subTypes?.includes(t))
112    )], [projects])
113    const [activeFilter, setActiveFilter] = useState('All')
114
115    // ── 콘텐츠 오버레이 상태 (GRID_CONTENT_AREA_SPEC §3-1 (b)) ──
116    // selected: 열린 프로젝트. null이면 그리드만 표시
117    // contentMode: GridContentArea의 morph 모드. 진입 시 idle→active로 전환해 morph를 발동한다
118    // enterRectRef: 클릭된 카드의 화면 좌표 — morph 시작 rect이자 역-morph 도착 rect
119    //
120    // 직접 진입(initialSlug) = morph 생략 즉시 표시 (GRID_URL_split §2-2).
121    // 마운트 후 effect로 열면 그리드가 한 프레임 비쳤다가 콘텐츠가 덮는 깜빡임이 생기므로
122    // 최초 state 자체를 열린 상태로 둔다 — enterRectRef는 초기값 null 그대로이고(= morph 생략
123    // 신호), contentMode는 idle을 거치지 않고 바로 active다. 결과는 §2-2의 effect와 동일하다.
124    // URL은 이미 /work-grid/[slug]이므로 pushState 불요.
125    const initialProject = useMemo(
126      () => (initialSlug ? projects.find(p => p.id === initialSlug) ?? null : null),
127      [initialSlug, projects],
128    )
129    const [selected, setSelected] = useState<Project | null>(initialProject)
130    const [contentMode, setContentMode] = useState<'idle' | 'active'>(initialProject ? 'active' : 'idle')
131    const enterRectRef = useRef<{ top: number; left: number; width: number; height: number } | null>(null)
```

추가 출현 (160–168행, 모바일 판정 주석 내 언급):

```tsx
160    const maxCols = ready ? maxColsForAspect(vp.w / vp.h) : MAX_COLS
161
162    // ── 모바일 판정 — 링월(LandingExperience 74행)과 동일 경계 1024 (GRID_MOBILE §2-3) ──
163    // vp.w에서 파생하지 않는다: vp는 resize 이벤트만 따르고 matchMedia는 초기값도 정확하다.
164    // 초기값 false + useLayoutEffect: SSR/하이드레이션 출력은 false로 일치시키되 판정은 페인트
165    // 전에 끝낸다 — 직접 진입(initialSlug)이 열린 상태로 마운트되므로, useEffect였다면 모바일에서
166    // GridContentArea(가로 트랙)가 한 프레임 그려진 뒤 교체되는 깜빡임이 생긴다.
167    const [isMobile, setIsMobile] = useState(false)
168    useLayoutEffect(() => {
```

#### `enterRect` / `enterRectRef` — 8건

정의 131행(위 발췌 포함). 진입 시 기록 (300–315행):

```tsx
300    useEffect(() => () => cancelAnimationFrame(rafRef.current), [])
301
302    // ── 카드 클릭 → 콘텐츠 오버레이 (딥링크 대신 SPA morph) (§3-1 (c)) ──
303    const openProject = useCallback((project: Project, el: HTMLElement) => {
304      const r = el.getBoundingClientRect()
305      // 카드 rect만 넘긴다 = morph 출발 rect(4:3). 도착 rect의 원본 aspect는 img가 아니라
306      // Sanity metadata(project.coverRatio)에서 온다 — 썸네일은 크롭되어 원본비를 모른다 (§5·§4-4)
307      enterRectRef.current = { top: r.top, left: r.left, width: r.width, height: r.height }
308      setSelected(project)
309      setContentMode('idle')
310      // 브라우저 뒤로가기 = 닫기. URL은 그리드 전용 /work-grid/[slug] — 링월 /work/[slug]와
311      // 별개 경로라 새로고침해도 그리드 콘텐츠가 유지된다 (GRID_URL_split §2-3)
312      window.history.pushState({ gridContent: project.id }, '', `/work-grid/${project.id}`)
313      // idle→active morph 발동 (다음 프레임)
314      requestAnimationFrame(() => requestAnimationFrame(() => setContentMode('active')))
315    }, [])
```

props 전달 (760–780행):

```tsx
760        </div>
761
762        {/* ── 콘텐츠 오버레이 — fixed inset:0, z-index 100으로 그리드 전체를 덮는다 (§3-1 (f)) ── */}
763        {selected && (
764          // 모바일은 morph 없이 세로 스크롤로 즉시 표시한다 — contentMode·enterRect를 넘기지 않는다
765          // (가로 트랙 morph는 세로 스택 진입에 성립하지 않는다, GRID_MOBILE §2-3)
766          isMobile ? (
767            <MobileGridContent project={selected} onBack={closeProject} />
768          ) : (
769            <GridContentArea
770              project={selected}
771              mode={contentMode}
772              enterRect={enterRectRef.current}
773              onBack={closeProject}
774            />
775          )
776        )}
777      </div>
778    )
779  }
780
```

#### 콘텐츠 닫기(close) 핸들러 — `closeProject` (317–347행)

```tsx
317    const closeProject = useCallback(() => {
318      // 복귀 도착 rect를 카드의 **현재** 위치로 갱신 — 열려 있는 동안 밀도 변경(film movement)·
319      // 리사이즈로 클릭 당시 rect와 달라졌을 수 있다. ref 변경은 setContentMode보다 먼저 해야
320      // idle 렌더가 갱신된 enterRect를 받는다 (GRID_MORPH_fix 작업 ④).
321      // 직접 진입(enterRectRef.current === null)은 **갱신하지 않는다** — 그리드 카드는 오버레이
322      // 아래에 그대로 마운트돼 있어 el은 존재한다. 여기서 채우면 null 신호가 사라져 페이드아웃
323      // 경로가 역-morph로 바뀌므로, null일 때는 건드리지 않는다 (GRID_URL_split §3-2 유지).
324      if (selected && enterRectRef.current) {
325        const el = cardEls.current.get(selected.id)
326        if (el) {
327          const r = el.getBoundingClientRect()
328          enterRectRef.current = { top: r.top, left: r.left, width: r.width, height: r.height }
329        }
330      }
331      setContentMode('idle')
332      // 역-morph 재생이 끝난 뒤 언마운트. 모바일은 morph 자체가 없으므로 대기 없이 즉시 닫는다
333      // — 760ms 잔류는 재생할 애니메이션이 없는 순수 지연이다 (GRID_MOBILE §2-4)
334      if (isMobile) setSelected(null)
335      else setTimeout(() => setSelected(null), CONTENT_EXIT_MS)
336      // URL 원복 — pushState 되돌림 없이 replaceState로 그리드 URL 복원
337      if (window.location.pathname !== '/work-grid') {
338        window.history.replaceState({}, '', '/work-grid')
339      }
340    }, [selected, isMobile])
341
342    // 브라우저 뒤로가기 → 닫기
343    useEffect(() => {
344      const onPop = () => { if (selected) closeProject() }
345      window.addEventListener('popstate', onPop)
346      return () => window.removeEventListener('popstate', onPop)
347    }, [selected, closeProject])
```

#### 닫을 때 URL을 되돌리는 코드 — 336–339행

```tsx
336      // URL 원복 — pushState 되돌림 없이 replaceState로 그리드 URL 복원
337      if (window.location.pathname !== '/work-grid') {
338        window.history.replaceState({}, '', '/work-grid')
339      }
```

### 5-2. `src/components/LandingExperience.tsx`

#### `initialSlug` — 4건 (15–36행)

```tsx
15  interface LandingExperienceProps {
16    projects: Project[]         // Sanity에서 careerNo 내림차순 정렬 상태로 도착 — 재정렬 불요
17    initialSlug?: string        // /work/[slug] 딥링크
18    initialShowFilters?: boolean
19  }
20
21  export function LandingExperience({ projects, initialSlug, initialShowFilters = false }: LandingExperienceProps) {
22    const [mobile, setMobile] = useState(false)
23    const mobileRef = useRef(false)   // popstate 등 마운트 시 1회 등록 핸들러의 stale closure 방지
24    const { introPhase, setWordmarkOnLight, setNavOnLight } = useSiteChrome()
25
26    const FILTER_TYPES = useMemo(() => ['All', ...TYPOLOGY_ORDER.filter(t =>
27      projects.some(p => p.type === t || p.subTypes?.includes(t))
28    )], [projects])
29
30    // 딥링크: 마운트 시 해당 프로젝트를 active로 설정 (projects에 없으면 무시)
31    const [activeProject, setActiveProject] = useState<Project | null>(() =>
32      initialSlug ? projects.find(p => p.id === initialSlug) ?? null : null
33    )
34    const [showFilters, setShowFilters] = useState(
35      initialShowFilters || (initialSlug ? projects.some(p => p.id === initialSlug) : false)
36    )
```

`enterRect`에 해당하는 prop: `LandingExperience.tsx` 내 `enterRect` 문자열 없음(0건).

#### close 시 URL 복원 코드 — `handleBack` (140–145행)

```tsx
140    const handleBack = useCallback(() => {
141      setActiveProject(null)
142      // 모바일은 수축 시 항상 /work (모바일에서 /와 /work는 동일 화면)
143      // 데스크톱: 필터 브라우징 상태에서 닫으면 /work, 아니면 /
144      window.history.pushState({}, '', mobileRef.current || showFilters ? '/work' : '/')
145    }, [showFilters])
```

ESC 처리 및 popstate 동기화 (147–176행):

```tsx
147    // ESC → active 종료 (Back과 동일 경로 처리)
148    useEffect(() => {
149      const onKey = (e: KeyboardEvent) => {
150        if (e.key !== 'Escape') return
151        if (activeProject) handleBack()
152      }
153      window.addEventListener('keydown', onKey)
154      return () => window.removeEventListener('keydown', onKey)
155    }, [activeProject, handleBack])
156
157    // 브라우저 뒤로가기/앞으로가기 → URL과 active/필터 상태 동기화
158    useEffect(() => {
159      const onPopState = () => {
160        const path = window.location.pathname
161        if (path.startsWith('/work/')) {
162          const slug = path.slice('/work/'.length)
163          const p = projects.find(p => p.id === slug) ?? null
164          setActiveProject(p)
165          if (p) setShowFilters(true)
166        } else if (path === '/work') {
167          setActiveProject(null)
168          setShowFilters(true)
169        } else {
170          setActiveProject(null)
171          setShowFilters(false)
172        }
173      }
174      window.addEventListener('popstate', onPopState)
175      return () => window.removeEventListener('popstate', onPopState)
176    }, [])
```

열기 시 URL push (183–207행):

```tsx
183    const handleSelect = (p: Project) => {
184      setActiveProject(p)
185      setHoveredProject(null)
186      setShowFilters(true)
187      window.history.pushState({}, '', `/work/${p.id}`)
188    }
189
190    // 모바일 월: 카드 탭 → 인라인 확장 + URL push
191    const handleActivate = useCallback((slug: string) => {
192      const p = projects.find(p => p.id === slug)
193      if (!p) return
194      setActiveProject(p)
195      setShowFilters(true)
196      window.history.pushState({}, '', `/work/${slug}`)
197    }, [])
198
199    const handleFilter = (t: string) => {
200      if (t === activeFilter) return
201      setActiveFilter(t)
202      // active 프로젝트가 열려 있으면 닫고 필터 브라우징 상태로 복귀
203      if (activeProject) {
204        setActiveProject(null)
205        window.history.pushState({}, '', '/work')
206      }
207    }
```

### 5-3. `src/components/GridContentArea.tsx` 내 라우팅·URL 관련 코드

검색 패턴 `pushState` / `replaceState` / `popstate` / `useRouter` / `usePathname` / `next/navigation` / `next/link` / `href` / `location.` — **없음(0건)**.

3-1의 `/work-grid` 검색에서 이 파일에 잡힌 2건은 모두 주석이다 (`:3`, `:815`). `:815` 주변 발췌 (806–826행):

```tsx
806        // 초기 scrollPos = 히어로 실제 폭(rects[1].width) 기준 중앙정렬 역산
807        // (GRID_CONTENT_center_fix §1-1). goToSlide·리사이즈 재중앙과 동일 함수를 쓴다.
808        // 직접 진입·클릭 진입 공통이다: 양쪽 모두 히어로 중앙에 정착한다 (GRID_URL_split §3-1)
809        const initScroll = hasHero ? Math.round(cs(ccs(1))) : 0
810
811        setScrollPos(initScroll)
812        setAnimated(false)
813
814        // ── 직접 진입(enterRect === null) — morph 생략, 콘텐츠 즉시 표시 (GRID_URL_split §3-1) ──
815        // 새로고침·공유로 /work-grid/[slug]를 열면 출발 카드 rect가 존재하지 않는다. 모프 레이어를
816        // 아예 띄우지 않고 트랙·정보 슬라이드만 켠다(직후 trackIn/infoIn effect가 페이드인 처리).
817        if (enterRect === null) {
818          setMorphing(false)
819          setMorphVisible(false)
820          setMorphRect(null)
821          setMorphFullLoaded(false)
822          setTrackIn(true)
823          setInfoIn(true)
824          return
825        }
826
```

---

## 6. Sanity 변경 반영 경로

### 6-1. 전수 검색 결과 (검색 범위: 저장소 전체, `.md` 제외)

| 패턴 | 건수 |
|---|---|
| `revalidatePath` | 없음(0건) |
| `revalidateTag` | 없음(0건) |
| `next: {` | 없음(0건) |
| `useCdn` | 8건 |

`useCdn` 8건:

```
scripts\migrateAwards.ts:34:  useCdn: false,
scripts\cleanupResult.ts:37:  useCdn: false,
scripts\auditUnknownFields.ts:25:  useCdn: false,
scripts\migrate-status.ts:23:  useCdn: false,
scripts\migrate-title.ts:35:  useCdn: false,
scripts\cleanupDisplayOrder.ts:31:  useCdn: false,
scripts\migrate-slide-locales.ts:37:  useCdn: false,
src\lib\sanity\client.ts:7:  useCdn: false,   // 빌드 시점 1회 조회 — 캐시 계층 불개입 (결정론)
```

(`src/` 내 `useCdn` 1건. 나머지 7건은 `scripts/` 마이그레이션 스크립트.)

### 6-2. `src/app/api/` 디렉터리

**없음** — `src/app/api` 디렉터리가 존재하지 않는다.
revalidate·webhook 관련 route 파일: 없음(0건).

### 6-3. Sanity 클라이언트 생성 파일

`createClient` 전수 검색 — 16건(8개 파일에서 import 1건 + 호출 1건씩).

애플리케이션 클라이언트는 `src/lib/sanity/client.ts` 1개다. 전문:

```ts
1  import { createClient } from '@sanity/client'
2
3  export const sanityClient = createClient({
4    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
5    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
6    apiVersion: '2026-07-10',
7    useCdn: false,   // 빌드 시점 1회 조회 — 캐시 계층 불개입 (결정론)
8  })
```

그 외 `createClient` 호출 파일 (전부 `scripts/`, 각 파일 import행:호출행):

```
scripts\migrateAwards.ts:20 / :29
scripts\cleanupResult.ts:21 / :32
scripts\auditUnknownFields.ts:12 / :20
scripts\migrate-status.ts:10 / :18
scripts\migrate-title.ts:16 / :30
scripts\cleanupDisplayOrder.ts:16 / :26
scripts\migrate-slide-locales.ts:18 / :32
```

---

## 7. 그리드 잔여 과제 관련 상수·레거시 실측

### 7-1. 상수 정의 위치·값

| 상수 | 파일:행 | 값 | 원문 |
|---|---|---|---|
| `INFO_SLIDE_W` | `src/components/ContentArea.tsx:11` | `270` | `const INFO_SLIDE_W = 270     // 세로 스택 — 수평 4열 폐기 (260714-B). 260721 200→240. 260804 240→270` |
| `INFO_SLIDE_W` | `src/components/GridContentArea.tsx:30` | `270` | `const INFO_SLIDE_W = 270     // 세로 스택 — 수평 4열 폐기 (260714-B). 260721 200→240. 260804 240→270` |
| `META_SLOT_W` | `src/components/GridContentArea.tsx:36` | `INFO_SLIDE_W + META_PAD_X * 2` (= 302) | `const META_SLOT_W = INFO_SLIDE_W + META_PAD_X * 2` |
| `META_PAD_X` | `src/components/GridContentArea.tsx:33` | `16` | `const META_PAD_X = 16` |
| `TITLE_SET_MIN_H` | `src/components/ContentArea.tsx:16` | `160` | `const TITLE_SET_MIN_H = 160` |
| `TITLE_SET_MIN_H` | `src/components/GridContentArea.tsx:41` | `160` | `const TITLE_SET_MIN_H = 160` |
| `META_MARGIN` | `src/components/GridContentArea.tsx:68` | `24` | `const META_MARGIN = 24    // sticky 최좌측 고정선 — 뷰포트 좌측 여백 (TRACK_INSET과 동일값)` |
| `KO_SCALE` | `src/components/GridExperience.tsx:72` | `0.82` | `const KO_SCALE = 0.82           // 카드 한글 타이틀 크기 비 — 영문 대비 위계를 낮춘다 (260804)` |
| `BELOW_TEXT_H` | `src/components/MobileProjectWall.tsx:36` | `40` | `const BELOW_TEXT_H = 40        // 이미지 하단 텍스트 행 (프로젝트명 + 용도 상하 배열)` |
| `BELOW_TEXT_H` | `src/components/ProjectWall.tsx:27` | `58` | `const BELOW_TEXT_H = 58` |
| `GAP` | `src/components/GridExperience.tsx:47` | `16` | `const GAP = 16                  // 카드 간격 (수평·수직 공통)` |
| `GAP` | `src/components/MobileProjectWall.tsx:37` | `14` | `const GAP = 14                 // ITEM_GAP 승계` |
| `GAP` | `src/components/ProjectWall.tsx:28` | `16` | `const GAP = 16` |
| `FULL_FADE_MS` | `src/components/GridContentArea.tsx:59` | `120` | `const FULL_FADE_MS = 120` |

중복 정의 요약: `INFO_SLIDE_W` 2곳(동일값 270), `TITLE_SET_MIN_H` 2곳(동일값 160), `BELOW_TEXT_H` 2곳(값 상이 40/58), `GAP` 3곳(값 상이 16/14/16).
단일 정의: `META_SLOT_W`, `META_PAD_X`, `META_MARGIN`, `KO_SCALE`, `FULL_FADE_MS`.

참고 — `META_SLOT_W` 산출 근거 주석 (`GridContentArea.tsx` 30–36행):

```ts
30  const INFO_SLIDE_W = 270     // 세로 스택 — 수평 4열 폐기 (260714-B). 260721 200→240. 260804 240→270
31  // 260804: 메타 좌우 내부 여백. 폭 예약을 INFO_SLIDE_W + META_PAD_X*2로 확장하여
32  // border-box 기준 텍스트 실폭은 INFO_SLIDE_W(270)로 유지된다 (스크롤 재발 없음)
33  const META_PAD_X = 16
...
36  const META_SLOT_W = INFO_SLIDE_W + META_PAD_X * 2
```

### 7-2. 그리드 열 수 상한·하한

`cols` / `COLS` / `minCols` / `maxCols` 식별자는 **`src/components/GridExperience.tsx` 한 파일에만 존재**한다. 그 외 `src/` 전체(모바일 컴포넌트 `MobileProjectWall.tsx`, `MobileGridContent.tsx` 포함): 없음(0건).

정의 (`GridExperience.tsx` 44–52행):

```ts
44
45  // ── 단일 정의 상수 ──
46  const UI_PAD = 34               // 헤더·컨트롤·그리드 공유 좌우 여백 (링월 헤더 기준)
47  const GAP = 16                  // 카드 간격 (수평·수직 공통)
48  const CARD_RATIO = 4 / 3        // 카드 프레임 비율 — 원본 비율과 무관하게 고정 (§2)
49  const SLIDE_H_RATIO = 0.72      // ContentArea 히어로 높이 비율 — 1열 폭 공식 (§6)
50  const MIN_COLS = 1              // 하한. 실물 판단 후 1→3 변경은 이 한 줄만 바꾼다 (§6)
51  const MAX_COLS = 6              // 절대 상한 (뷰포트 종횡비가 실제 상한을 더 낮출 수 있다)
52  const DEFAULT_COLS = 3
```

뷰포트 종횡비별 실제 상한 (`GridExperience.tsx` 92–97행):

```ts
92  /** 뷰포트 종횡비 → 열 상한 (§6) */
93  function maxColsForAspect(r: number): number {
94    if (r < 0.85) return 3        // portrait — 260804: 2→3 (모바일 밀도 상한 상향)
95    if (r < 1.25) return 4        // ~square
96    return 6                      // landscape
97  }
```

적용 지점 (`GridExperience.tsx:160`):

```ts
160    const maxCols = ready ? maxColsForAspect(vp.w / vp.h) : MAX_COLS
```

`MIN_COLS` / `MAX_COLS` / `maxCols` 사용처 전수 (`GridExperience.tsx`):

```
50:const MIN_COLS = 1              // 하한. 실물 판단 후 1→3 변경은 이 한 줄만 바꾼다 (§6)
51:const MAX_COLS = 6              // 절대 상한 (뷰포트 종횡비가 실제 상한을 더 낮출 수 있다)
93:function maxColsForAspect(r: number): number {
160:  const maxCols = ready ? maxColsForAspect(vp.w / vp.h) : MAX_COLS
180:  const colsRef = useRef<number>(clamp(DEFAULT_COLS, MIN_COLS, MAX_COLS))
181:  const [nLabel, setNLabel] = useState(clamp(DEFAULT_COLS, MIN_COLS, MAX_COLS))
205:  const span = Math.max(1, maxCols - MIN_COLS)
207:  const colsToPos = useCallback((c: number) => clamp((c - MIN_COLS) / span, 0, 1), [span])
208:  const posToCols = useCallback((pos: number) => MIN_COLS + clamp(pos, 0, 1) * span, [span])
214:    const c = clamp(cols, MIN_COLS, maxCols)              // 연속(분수) 열 수 — 폭 보간용
215:    const nr = clamp(Math.round(c), MIN_COLS, maxCols)    // 격자·라벨용 정수 열 수
351:    const c = clamp(colsRef.current, MIN_COLS, maxCols)
387:    animateTo(clamp(Math.round(colsRef.current), MIN_COLS, maxCols))
390:  const snapCols = Array.from({ length: maxCols - MIN_COLS + 1 }, (_, i) => MIN_COLS + i)
```

모바일/데스크톱 구분 관련 — 별도의 모바일 전용 열 수 상수는 없음(0건). 모바일 판정 자체는 `isMobile`(`GridExperience.tsx:167–174`, `matchMedia('(max-width: 1023px)')`)로 하며, 이 값은 열 수 계산이 아니라 콘텐츠 오버레이 분기(763–776행)에 쓰인다.

### 7-3. `ProjectCard.tsx`

- **존재 여부: 존재.** 경로 `src/components/ProjectCard.tsx` (53행, 기본 export `ProjectCard`).

- `ProjectCard` 문자열 전수 검색 — `src/` 4건:

```
src\components\GridContentArea.tsx:1135:        {/* 프로젝트 코드 — ProjectCard와 동일한 3자리 zero-pad 규약 */}
src\components\ContentArea.tsx:987:                      {/* 프로젝트 코드 — ProjectCard와 동일한 3자리 zero-pad 규약 */}
src\components\ProjectCard.tsx:5:interface ProjectCardProps {
src\components\ProjectCard.tsx:9:export default function ProjectCard({ project }: ProjectCardProps) {
```

내역 분류:

| 분류 | 건수 | 위치 |
|---|---|---|
| 자기 파일 내 정의 | 2건 | `ProjectCard.tsx:5`(인터페이스명), `:9`(함수 선언) |
| 주석 내 언급 | 2건 | `GridContentArea.tsx:1135`, `ContentArea.tsx:987` |
| **import 문** | **없음(0건)** | — |
| **JSX 사용처** | **없음(0건)** | — |

`ProjectCard.tsx` 전문:

```tsx
 1  import Link from 'next/link'
 2  import Image from 'next/image'
 3  import { Project } from '@/types'
 4
 5  interface ProjectCardProps {
 6    project: Project
 7  }
 8
 9  export default function ProjectCard({ project }: ProjectCardProps) {
10    const careerCode = String(project.careerNo).padStart(3, '0')
11    const topAward = project.awards?.find(a => a.visible !== false)?.title
12
13    return (
14      <Link
15        href={`/work/${project.id}`}
16        className="project-card"
17        aria-label={project.title.en}
18      >
19        {/* Background: real image or placeholder color */}
20        {project.coverImage ? (
21          <div className="project-card-bg">
22            <Image
23              src={project.coverImage}
24              alt={project.title.en}
25              fill
26              className="object-cover"
27              sizes="(max-width: 768px) 100vw, 50vw"
28            />
29          </div>
30        ) : (
31          <div
32            className="project-card-bg"
33            style={{ backgroundColor: project.coverColor ?? '#1E1C18' }}
34          />
35        )}
36
37        {/* Static career number — very dim, always visible */}
38        <span className="project-card-static-num">{careerCode}</span>
39
40        {/* Hover overlay — fades in */}
41        <div className="project-card-overlay">
42          <p className="project-card-num">
43            {careerCode} — {project.year} — {project.type}
44          </p>
45          <h2 className="project-card-title">{project.title.en}</h2>
46          <p className="project-card-meta">
47            {topAward ? `${topAward} · ` : ''}{project.status}
48            {project.location ? ` · ${project.location}` : ''}
49          </p>
50        </div>
51      </Link>
52    )
53  }
```

### 7-4. 중앙정렬 산식 적용 여부

#### `targetScroll` 전수 검색 — 없음(0건)

#### `centerScroll` 전수 검색 — 7건 (전부 `GridContentArea.tsx`)

```
src\components\GridContentArea.tsx:729:  const centerScroll = (i: number) =>
src\components\GridContentArea.tsx:735:  // centerScroll 최소/최대를 경계로 삼는다. 양 끝 슬라이드에서 반대편 여백은 허용한다.
src\components\GridContentArea.tsx:738:    ? Array.from({ length: rects.length - 1 }, (_, k) => centerScroll(k + 1))
src\components\GridContentArea.tsx:762:  const geomRef = useRef({ rects, centers, scrollPos, clampScroll, centerScroll })
src\components\GridContentArea.tsx:763:  geomRef.current = { rects, centers, scrollPos, clampScroll, centerScroll }
src\components\GridContentArea.tsx:774:    setScrollPos(clampScroll(centerScroll(idx)))
src\components\GridContentArea.tsx:1020:    setScrollPos(clampScroll(centerScroll(i)))
```

#### `clampScroll` 전수 검색 — 14건 (`ContentArea.tsx` 5건 + `GridContentArea.tsx` 9건)

```
src\components\ContentArea.tsx:666:  const clampScroll = (v: number) => Math.min(maxScroll, Math.max(0, v))
src\components\ContentArea.tsx:682:    setScrollPos(clampScroll(centers[idx] - vpSize.w / 2))
src\components\ContentArea.tsx:781:    setScrollPos(clampScroll(centers[i] - viewportW / 2))
src\components\ContentArea.tsx:830:    setScrollPos(clampScroll(d.startScroll - dx))
src\components\ContentArea.tsx:841:        setScrollPos(clampScroll(scrollPos - d.v * FLICK_COEF))
src\components\GridContentArea.tsx:750:  const clampScroll = (v: number) => Math.min(maxScroll, Math.max(minScroll, v))
src\components\GridContentArea.tsx:762:  const geomRef = useRef({ rects, centers, scrollPos, clampScroll, centerScroll })
src\components\GridContentArea.tsx:763:  geomRef.current = { rects, centers, scrollPos, clampScroll, centerScroll }
src\components\GridContentArea.tsx:774:    setScrollPos(clampScroll(centerScroll(idx)))
src\components\GridContentArea.tsx:801:    const { rects: rc, clampScroll: cs, centerScroll: ccs } = geomRef.current
src\components\GridContentArea.tsx:1020:    setScrollPos(clampScroll(centerScroll(i)))
src\components\GridContentArea.tsx:1069:    setScrollPos(clampScroll(d.startScroll - dx))
src\components\GridContentArea.tsx:1080:        setScrollPos(clampScroll(scrollPos - d.v * FLICK_COEF))
```

#### `GridContentArea.tsx`의 `clampScroll` 함수 전문 (750행)

```ts
750    const clampScroll = (v: number) => Math.min(maxScroll, Math.max(minScroll, v))
```

경계값 `minScroll`·`maxScroll` 및 `centerScroll` 정의 문맥 (725–754행):

```ts
725    // 이를 (viewportW - rects[i].w)/2 (= 정중앙)에 맞추는 scrollPos가 중앙정렬 값이다.
726    // ⚠ centers[i](슬롯 중심) 기준 역산은 실제 이미지 폭을 반영하지 못한다 — 폐기.
727    //   초기 진입·화살표·리사이즈 재중앙 전부 이 한 함수를 쓴다(경로 간 24px 어긋남 방지).
728    //   반환값 px 정수. transform 퍼센트 정렬은 쓰지 않는다(Safari).
729    const centerScroll = (i: number) =>
730      i >= 0 && i < rects.length
731        ? Math.round((TRACK_INSET + rects[i].x) - (viewportW / 2 - rects[i].w / 2))
732        : 0
733
734    // 모든 슬라이드를 뷰포트 정중앙에 스냅 가능하게 — 콘텐츠 슬라이드(인덱스 1..)의
735    // centerScroll 최소/최대를 경계로 삼는다. 양 끝 슬라이드에서 반대편 여백은 허용한다.
736    // (인덱스 0 = 정보 슬라이드는 스냅 대상이 아니므로 제외)
737    const contentCenterScrolls = rects.length >= 2
738      ? Array.from({ length: rects.length - 1 }, (_, k) => centerScroll(k + 1))
739      : [0]
740    const minScroll = Math.min(...contentCenterScrolls)
741    const maxScroll = Math.max(...contentCenterScrolls)
742
743    // 뷰포트 중심을 트랙 좌표계로 환산 — 트랙은 TRACK_INSET만큼 우측에서 시작한다
744    const viewportCenter = scrollPos - TRACK_INSET + viewportW / 2
745    let nearest = 0
746    for (let i = 1; i < centers.length; i++) {
747      if (Math.abs(centers[i] - viewportCenter) < Math.abs(centers[nearest] - viewportCenter)) nearest = i
748    }
749
750    const clampScroll = (v: number) => Math.min(maxScroll, Math.max(minScroll, v))
```

비교 — `ContentArea.tsx:666`의 `clampScroll`은 하한이 `minScroll`이 아니라 `0`이고(`Math.max(0, v)`), 682·781행은 `centerScroll` 대신 `centers[i] - viewportW / 2` 산식을 직접 사용한다:

```ts
666    const clampScroll = (v: number) => Math.min(maxScroll, Math.max(0, v))
...
682      setScrollPos(clampScroll(centers[idx] - vpSize.w / 2))
...
781      setScrollPos(clampScroll(centers[i] - viewportW / 2))
```

---

## 8. 저장소 상태

### 8-1. `git status` 출력 전문

```
On branch main
Your branch is up to date with 'origin/main'.

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	AUDIT_landing_switch_260916.md

nothing added to commit but untracked files present (use "git add" to track)
```

(본 감사 실행 시점 출력. 보고서 파일 `AUDIT_REPORT_landing_260916.md`는 이 출력 이후 생성되었다.)

### 8-2. `git log --oneline -20` 출력 전문

```
85604cf grid mobile
267ddea grid morph crop match
d52d90f grid morph rect height
d024248 grid morph crossfade fix
ada2df5 grid moprh fix
bae711e grid conttent meta padding
c88680c grid content meta width 2740
c021134 grid content meta sticky v2
1778b0a grid content fix
dcf8442 grid content sticky
767dc50 grid content center fix
70aa1c2 grid url
269eb97 grid content
dfb29fe grid content v2 & relow film
5517a87 grid reflow
6ccb255 grid fix
dec9806 grid content area
d1cba4e grid fix empty
59b120c grid mode v3
72417f1 grid mode v2
```

### 8-3. 저장소 루트 `.md` 파일 목록 (총 89개)

| 파일명 | 최종 수정 |
|---|---|
| ABOUT_ALIGN_HEADER_SPEC.md | 2026-07-21 12:06 |
| ABOUT_FINISH_STUDIO_SPEC.md | 2026-07-22 16:42 |
| ABOUT_LAYOUT_ADJUST_SPEC.md | 2026-07-21 10:30 |
| ABOUT_MOBILE_FINISH_SPEC.md | 2026-07-23 08:39 |
| ABOUT_NAV_INFOWIDTH_SPEC.md | 2026-07-21 10:59 |
| ABOUT_NAV_INTERACTION_SPEC.md | 2026-07-21 12:40 |
| ABOUT_PAGE_SPEC.md | 2026-07-20 17:51 |
| ABOUT_SCROLL_REVERT_SPEC.md | 2026-07-22 10:37 |
| ABOUT_SCROLL_STRUCTURE_SPEC.md | 2026-07-21 11:32 |
| AGENTS.md | 2026-06-01 15:42 |
| ARCHIVE_SLIDES_SPEC.md | 2026-06-11 09:32 |
| AUDIT_landing_switch_260916.md | 2026-09-16 09:15 |
| BACK_MORPH_FIX_SPEC.md | 2026-07-13 12:28 |
| CAROUSEL_SPEC.md | 2026-06-08 16:49 |
| CATEGORY_SPEC_260707.md | 2026-07-07 11:58 |
| CLAUDE.md | 2026-06-09 12:20 |
| CONTENT_AREA_FIX_SPEC.md | 2026-07-09 00:16 |
| CONTENT_FLOW_SPEC.md | 2026-06-11 19:51 |
| CONTENT_POLISH_SPEC.md | 2026-06-11 20:29 |
| CONTENT_TRACK_REDESIGN_SPEC.md | 2026-07-09 13:54 |
| DESIGN_SYSTEM_SPEC.md | 2026-06-09 09:50 |
| ENTRY_FLASH_FIX.md | 2026-06-11 06:02 |
| ENTRY_SPEC.md | 2026-06-09 09:07 |
| FINITE_STACK_CLAMP_SPEC.md | 2026-07-10 15:58 |
| GRID_CONTENT_AREA_SPEC.md | 2026-07-31 14:55 |
| GRID_CONTENT_center_fix.md | 2026-08-04 09:09 |
| GRID_CONTENT_meta_padding_260804.md | 2026-08-05 14:28 |
| GRID_CONTENT_meta_sticky_260804.md | 2026-08-04 14:14 |
| GRID_CONTENT_meta_sticky_fix_260804.md | 2026-08-05 12:37 |
| GRID_CONTENT_meta_sticky_v2_260804.md | 2026-08-05 13:15 |
| GRID_CONTENT_meta_width_270_260804.md | 2026-08-05 14:13 |
| GRID_CONTENT_v2.md | 2026-08-03 10:29 |
| GRID_CONTENT_v3.md | 2026-08-03 13:06 |
| GRID_FIX_empty_cells.md | 2026-07-30 15:13 |
| GRID_FIX_reflow_content.md | 2026-07-31 14:55 |
| GRID_MOBILE_260804.md | 2026-08-10 14:19 |
| GRID_MODE_PHASE1_SPEC.md | 2026-07-29 10:17 |
| GRID_MODE_V2_SPEC.md | 2026-07-30 09:04 |
| GRID_MODE_V3_SPEC.md | 2026-07-30 13:42 |
| GRID_MORPH_crop_match_260804.md | 2026-08-10 12:53 |
| GRID_MORPH_crossfade_fix_260804.md | 2026-08-10 09:07 |
| GRID_MORPH_fix_260804.md | 2026-08-10 08:28 |
| GRID_MORPH_rect_height_fix_260804.md | 2026-08-10 12:02 |
| GRID_REFLOW_anchor.md | 2026-08-03 08:32 |
| GRID_REFLOW_film.md | 2026-08-03 10:29 |
| GRID_URL_split.md | 2026-08-04 08:23 |
| HANDOFF_RACE_FIX_SPEC.md | 2026-07-14 08:28 |
| HEADER_INFO_SPEC.md | 2026-06-11 23:12 |
| HIGHLIGHT_HANDOFF_SPEC.md | 2026-07-13 16:52 |
| I18N_BILINGUAL_SPEC_260716.md | 2026-07-16 13:05 |
| INFO_SLIDE_AWARDS_SPEC.md | 2026-07-20 08:34 |
| INFO_SLIDE_LAYOUT_SPEC_260714B.md | 2026-07-14 17:14 |
| INFO_SLIDE_MORPH_SPEC_260714.md | 2026-07-14 16:12 |
| LANDING_POLISH_SPEC.md | 2026-06-10 14:35 |
| LANDING_REDESIGN_SPEC.md | 2026-06-10 13:14 |
| LANDING_REFINEMENT_SPEC.md | 2026-06-11 10:22 |
| LANDING_SPEC.md | 2026-06-08 14:11 |
| MIGRATE_SLIDE_LOCALE_SPEC_260716.md | 2026-07-16 14:45 |
| MOBILE_CENTER_RANDOM_SHUFFLE_SPEC.md | 2026-06-15 16:22 |
| MOBILE_CODEROW_PUBLISH_SPEC.md | 2026-07-20 14:07 |
| MOBILE_ENTRY_FIX_SPEC.md | 2026-06-15 12:33 |
| MOBILE_FIX_SPEC.md | 2026-06-15 08:38 |
| MOBILE_HEADER_FIX_SPEC.md | 2026-07-09 00:16 |
| MOBILE_MOUSE_SPEC.md | 2026-06-15 09:52 |
| MOBILE_RING_SPEC.md | 2026-07-08 09:33 |
| MOBILE_SPEC.md | 2026-06-13 09:00 |
| MOBILE_TIER_SCALE_SPEC.md | 2026-07-13 10:59 |
| MOBILE_TOPALIGN_CHIP_SPEC.md | 2026-06-15 15:40 |
| ORION_SLIDES_SPEC.md | 2026-06-11 07:34 |
| README.md | 2026-06-01 15:48 |
| RESPONSIVE_UNIFY_SPEC.md | 2026-06-15 08:38 |
| SANITY_DATASOURCE_SPEC.md | 2026-07-10 15:04 |
| SANITY_MIGRATION_SPEC.md | 2026-07-10 13:57 |
| SANITY_SCHEMA_ALIGNMENT_SPEC.md | 2026-07-20 11:41 |
| SANITY_STUDIO_SPEC.md | 2026-07-10 12:57 |
| SCHEMA_ALIGNMENT_2_SPEC.md | 2026-07-20 13:28 |
| TABLET_SPEC.md | 2026-06-13 16:17 |
| TEXT_QUOTE_SLIDE_SPEC_260714.md | 2026-07-14 14:38 |
| TEXT_SLIDE_LINEBREAK_SPEC.md | 2026-07-20 09:59 |
| VERTICAL_STACK_SPEC.md | 2026-07-13 16:31 |
| VIDEO_SLIDE_SPEC.md | 2026-07-22 16:42 |
| WALL_CARD_TEXT_BELOW_SPEC.md | 2026-07-13 10:29 |
| WALL_RING_SPEC.md | 2026-07-07 09:46 |
| WALL_TRACK_REFINE_SPEC.md | 2026-06-12 07:48 |
| WORDMARK_FIX_SPEC.md | 2026-07-08 09:33 |
| WORDMARK_SPEC.md | 2026-06-08 17:12 |
| WORDMARK_UNIFY_SPEC.md | 2026-07-23 17:09 |
| WORK_FILTER_SPEC.md | 2026-06-11 19:51 |
| WORK_SECTION_SPEC.md | 2026-06-09 09:50 |

(89개는 본 보고서 생성 전 시점 기준. `AUDIT_REPORT_landing_260916.md`는 미포함.)

### 8-4. `npx tsc --noEmit` 실행 결과

**통과.** 종료 코드 0, 출력 없음(오류 0건).

---

## 9. 미확인 항목

1. **`src/app/works/page.tsx` (명세 1-2·1-3)** — 파일이 존재하지 않아 전문·export 표를 채울 수 없다. 1-1 트리 조사 결과 `src/app` 아래 `works` 디렉터리 자체가 없다.

2. **`src/app/sitemap.ts`·`src/app/robots.ts`·`public/sitemap.xml`·`public/robots.txt` (명세 4-1)** — 4개 모두 존재하지 않아 전문을 실을 수 없다.

3. **`src/app/api/` (명세 6-2)** — 디렉터리가 존재하지 않아 트리·route 전문을 실을 수 없다.

4. **명세 5-2의 "`initialSlug`에 해당하는 prop" 중 `enterRect` 대응물** — `LandingExperience.tsx`에 `enterRect` 문자열이 0건이다. 이름이 다른 대응 prop이 있는지는 식별자 검색만으로 판정되지 않으므로, 본 보고서는 검색 결과 0건만 기록하고 대응 관계는 판단하지 않았다.

5. **명세 7-2의 "모바일·데스크톱 각각"의 열 수 상한·하한** — `cols`/`minCols`/`maxCols`/`COLS` 식별자가 `GridExperience.tsx` 단일 파일에만 존재하며, 모바일 전용으로 분기된 별도 상수는 0건이다. 모바일 대응물이 `maxColsForAspect`의 portrait 분기(94행, `return 3`)인지 여부는 명세가 요구한 "이에 준하는 식별자" 판정에 해석이 개입하므로, 사실만(식별자 0건 + 종횡비 분기 함수 원문) 기록했다.

6. **명세 4-2의 `robots:` 패턴** — 콜론을 포함한 리터럴로 검색했으며 0건이다. `robots` (콜론 없음) 단독 검색은 명세 범위 밖이라 수행하지 않았다.

7. **검색 도구 출력의 주석 기호 표시 문제** — 초기 grep 출력 일부에서 `//` 주석이 `\`로 표시되는 현상이 있었다. 해당 구간(`GridExperience.tsx` 93–97, 115–131, 160–166, 302–315, 762–776행)은 파일을 직접 읽어 재확인했으며, 실제 파일 내용은 `//`다. 본 보고서의 코드 발췌는 모두 파일 직접 읽기 결과를 옮긴 것이다.

8. **명세 3-1의 건수 표기** — `history.pushState` 항목은 검색 도구가 6건으로 집계했으나 출력된 고유 행은 5건이다. 본 보고서는 실제 출력 행(5건)을 기준으로 적었다.
