# IDENTITY P1 — 메타·SEO 기반 정비 (260929)

근거: `AUDIT_REPORT_identity_seo_260929.md` (HEAD `a287a9b`)
목표: 사이트 아이덴티티를 "Architect Chang-hyun Paik"으로 전환하고, 공유 미리보기·검색 기반을 갖춘다.
범위 외: 워드마크/ACP(→ P3), Contacts·Essays 콘텐츠(→ P2), canonical 방향 역전(→ 대표모드 P2).

---

## 0. 절대 제약

- `npm run dev` / `npm run build` 실행 금지. 검증은 `npx tsc --noEmit` 전용.
- 수정 허용 파일은 §2의 목록뿐. 그 외 파일 수정 금지. 특히 `ContentArea.tsx`, `MobileProjectWall.tsx`, `SiteHeader.tsx`, `globals.css` 수정 금지.
- canonical 방향은 현행 유지: `/work-grid/[slug]` → `/work/[slug]`.
- URL·slug 변경 금지.

## 1. 사전 확인 (하나라도 불일치하면 구현하지 말고 중단·보고)

1. `git status` clean, HEAD가 `a287a9b` 또는 그 후손.
2. 저장소 루트에 `og-default.png`(1200×630)가 있다 — 사용자가 이 명세와 함께 넣은 파일. 없으면 중단.
3. `src/app/layout.tsx:6-20` metadata 블록이 감사 보고서 §1-1 원문과 동일.
4. `src/lib/sanity/queries.ts`에서 **정규화된 Project 타입**의 필드명을 읽어 보고서에 기록: 영문/국문 타이틀, subtitle, coverImage(URL), coverHotspot, mainType(타이폴로지), year, status, slug(`id`). 이후 §3-3은 이 실제 필드명으로 구현한다.
5. `src/lib/imageUrl.ts`의 Sanity CDN 파라미터 조립 방식(특히 hotspot → `fp-x`/`fp-y` 처리)을 읽고 보고. §3-3의 OG 이미지 URL은 이 방식과 일관되게 만든다.
6. `Cormorant` / `DM Sans` / `DM+Sans` 문자열을 `src` 전체에서 grep. `layout.tsx:36-39` 외 출현 0건인지 확인(→ §3-6 전제).

## 2. 수정 대상 파일 (이 목록 외 금지)

| 구분 | 파일 |
|---|---|
| 신설 | `src/lib/seo.ts`, `src/app/robots.ts`, `src/app/sitemap.ts`, `public/og-default.png`(루트에서 이동) |
| 수정 | `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/work/page.tsx`, `src/app/work-grid/page.tsx`, `src/app/work/[slug]/page.tsx`, `src/app/work-grid/[slug]/page.tsx`, `src/app/about/page.tsx`(metadata 1줄만), `src/app/contact/page.tsx`(metadata 1줄만), `src/app/essays/page.tsx`(metadata 1줄만) |

## 3. 구현

### 3-1. `src/lib/seo.ts` (신설) — 메타데이터 단일 소유

Next.js는 `openGraph` 객체를 하위 세그먼트에서 **얕게 교체**한다(부모 openGraph의 images·url이 상속되지 않음). 따라서 페이지마다 개별 선언하지 말고 이 헬퍼만 사용한다.

```ts
import type { Metadata } from 'next'

export const SITE_URL = 'https://paikarchitects.com'
export const SITE_NAME = 'Architect Chang-hyun Paik'
export const SITE_DESCRIPTION =
  'Chang-hyun Paik is an architect based in Seoul. Since 2015 at SPACE GROUP, his work spans competitions and projects across culture, workplace, infrastructure, and civic programs.'
export const DEFAULT_OG_IMAGE = { url: '/og-default.png', width: 1200, height: 630, alt: SITE_NAME }

interface PageMetaInput {
  title?: string            // 미지정 = 사이트 기본(홈)
  path: string              // '/about' 등 — canonical·og:url 겸용
  description?: string
  image?: { url: string; width: number; height: number; alt: string }
  noindex?: boolean
}

export function pageMetadata({ title, path, description, image, noindex }: PageMetaInput): Metadata {
  const fullTitle = title ? `${title} — ${SITE_NAME}` : SITE_NAME
  const desc = description ?? SITE_DESCRIPTION
  const img = image ?? DEFAULT_OG_IMAGE
  return {
    title: title ?? { absolute: SITE_NAME },
    description: desc,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      locale: 'en_US',
      title: fullTitle,
      description: desc,
      url: path,
      images: [img],
    },
    twitter: { card: 'summary_large_image', title: fullTitle, description: desc, images: [img.url] },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  }
}
```

`canonicalOverride`가 필요한 경우(§3-4 그리드)를 위해 `path`와 별개로 canonical을 줄 수 있도록 선택 인자 `canonical?: string`을 추가하고, 있으면 `alternates.canonical`에만 사용한다(`og:url`은 `path` 유지).

### 3-2. `src/app/layout.tsx`

`:6-20` metadata 전체를 아래로 교체한다. `practice`·`Paik Architects`·`Chang Hyun` 문자열은 이 파일에서 0건이 되어야 한다.

```ts
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s — ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: 'Chang-hyun Paik' }],
  openGraph: { type: 'website', siteName: SITE_NAME, locale: 'en_US', title: SITE_NAME, description: SITE_DESCRIPTION, url: '/', images: [DEFAULT_OG_IMAGE] },
  twitter: { card: 'summary_large_image', title: SITE_NAME, description: SITE_DESCRIPTION, images: [DEFAULT_OG_IMAGE.url] },
}
```

### 3-3. 프로젝트 메타 — `seo.ts`에 `projectMetadata()` 추가

```ts
export function projectMetadata(project: <정규화 Project 타입>, opts: { path: string; canonical: string }): Metadata
```

- title: 영문 타이틀. (template이 ` — Architect Chang-hyun Paik`을 붙인다)
- description: `subtitle.en`이 있으면 그것. 없으면 `${mainType} · ${year}` (둘 다 required 필드).
- image: coverImage가 있으면 Sanity CDN URL에 `w=1200&h=630&fit=crop&fm=jpg&q=80`을 붙이고, hotspot이 있으면 `crop=focalpoint&fp-x=<x>&fp-y=<y>`를 추가(§1-5 방식과 일관). `fm=jpg` 고정 — 카카오톡 등 일부 크롤러가 WebP를 처리하지 못하므로 `auto=format` 금지. alt는 영문 타이틀.
  coverImage가 없으면 `DEFAULT_OG_IMAGE`.
- 반환은 `pageMetadata({ title, path, description, image, canonical })`를 경유.

### 3-4. 라우트별 적용

| 파일 | 추가 내용 |
|---|---|
| `src/app/page.tsx` | `export const metadata = pageMetadata({ path: '/' })` |
| `src/app/work/page.tsx` | `pageMetadata({ title: 'Works', path: '/work' })` |
| `src/app/work-grid/page.tsx` | `pageMetadata({ title: 'Works', path: '/work-grid', canonical: '/work' })` |
| `src/app/about/page.tsx` | `:7` 을 `pageMetadata({ title: 'About', path: '/about' })`로 교체. **그 외 줄 수정 금지** |
| `src/app/contact/page.tsx` | `:1` 을 `pageMetadata({ title: 'Contacts', path: '/contact', noindex: true })`로 교체 (P2에서 콘텐츠 채울 때 noindex 해제) |
| `src/app/essays/page.tsx` | `:1` 을 `pageMetadata({ title: 'Essays', path: '/essays', noindex: true })`로 교체 |

### 3-5. 동적 라우트

**`src/app/work/[slug]/page.tsx`**
1. `generateMetadata` 추가: `getProjects()`에서 `id === slug`인 프로젝트를 찾아 `projectMetadata(p, { path: '/work/'+slug, canonical: '/work/'+slug })`. 없으면 `{}` 반환.
2. 페이지 본문에 `/work-grid/[slug]/page.tsx:38`과 **동일한 형태**의 `if (!projects.some((p) => p.id === slug)) notFound()` 추가. `notFound` import 추가.
3. `:18`의 주석(“slug 유효성은 LandingExperience가 검증…”)을 “존재하지 않는 slug는 404 — /work-grid/[slug]와 동일 규칙”으로 교체. `LandingExperience` 내부의 initialSlug 검증 로직은 건드리지 않는다(방어 코드로 존치).

**`src/app/work-grid/[slug]/page.tsx`**
- `:28-31` `generateMetadata`를 `projectMetadata(p, { path: '/work-grid/'+slug, canonical: '/work/'+slug })`로 교체. 프로젝트 부재 시 `{ alternates: { canonical: '/work/'+slug } }` 유지. 상단 주석 블록은 유지.

### 3-6. 미사용 폰트 링크 제거

§1-6에서 layout 외 출현 0건이 확인된 경우에만: `layout.tsx:30-39`의 Google Fonts `preconnect` 2개 + `stylesheet` link 1개 삭제. 이후 `<head>`가 비면 `<head>` 요소도 삭제. (1건이라도 다른 곳에서 쓰이면 삭제하지 말고 보고)

### 3-7. `src/app/robots.ts` (신설)

```ts
import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/studio'] }], sitemap: `${SITE_URL}/sitemap.xml` }
}
```

### 3-8. `src/app/sitemap.ts` (신설)

- 포함: `/`, `/work`, `/about`, 그리고 `getProjectSlugs()`의 각 `/work/{slug}`.
- 제외: `/work-grid`, `/work-grid/*`(canonical이 /work 쪽), `/contact`·`/essays`(현재 noindex — P2에서 추가), `/studio`.
- 절대 URL(`SITE_URL` + 경로). `lastModified`는 넣지 않는다(정확한 값 원천 없음).

### 3-9. 에셋

`og-default.png`를 저장소 루트에서 `public/og-default.png`로 이동(`git mv`가 아닌 신규 파일이면 단순 이동).

## 4. 검증

1. `npx tsc --noEmit` 오류 0.
2. grep(대소문자 무시, 대상 `src`): `practice` **0건**, `Paik Architects` → `globals.css:42`, `SiteHeader.tsx:55` 주석 2건만 잔존(P3에서 처리), `Chang Hyun` **0건**.
3. grep `openGraph` — `src/lib/seo.ts`와 `layout.tsx` 외 출현 0건(헬퍼 경유 원칙).
4. grep `metadataBase` — `layout.tsx` 1건.
5. `public/og-default.png` 존재, 루트에서 제거됨.

## 5. 보고 (커밋 전 사용자에게)

- §1 사전 확인 결과(특히 §1-4 필드명 매핑, §1-5 hotspot 처리 방식, §1-6 grep 결과)
- 파일별 변경 요약(줄 범위)
- §4 검증 결과 원문
- 커밋 메시지 제안: `identity P1: meta, OG, robots, sitemap`

## 6. 배포 후 사용자 확인 항목

- `https://paikarchitects.com/robots.txt`, `/sitemap.xml` 응답
- 카카오톡에 `https://paikarchitects.com` 및 프로젝트 URL 1개 전송 → 이미지·제목 미리보기
  (카카오 캐시가 남아 있으면 카카오 개발자 사이트의 공유 디버거에서 캐시 초기화)
- 존재하지 않는 `/work/zzz` → 404
