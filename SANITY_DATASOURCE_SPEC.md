# SANITY_DATASOURCE_SPEC — 정본 전환: 사이트 데이터 소스를 Sanity로 교체

> **단계 위치:** Sanity 이관 4단계 중 3단계. **동결 재개방 승인분(260710·실장님 확인)** — 재개방 범위는 아래 금지 목록으로 엄격 제한.
> 사이트가 빌드 시점에 `src/data/*` 대신 **Sanity에서 데이터를 읽도록** 수급 경로를 교체하고, Sanity의 이미지 치수 메타데이터로 ContentArea의 **비율 선로드 서브시스템을 삭제**하며, Cloudinary 전용 이미지 변환 헬퍼를 **Sanity 동등 변환으로 교체**한다.
> 완료 기준: 배포 후 사이트가 현재와 **시각·동작 완전 동일** + Studio에서 게시한 수정이 자동 재빌드로 반영(§0 웹훅).

---

## 0. 실행 전제 (사용자가 브라우저에서 수행 — 웹훅 연결)

Studio에서 "Publish"를 누르면 Vercel이 자동 재빌드하도록 두 서비스를 연결한다. 코드 작업과 독립이므로 Claude Code 실행 전후 어느 시점이든 무방하다.

1. **Vercel에서 훅 주소 발급:** Vercel 대시보드 → `paikarchitects` → Settings → **Git** → 아래로 스크롤해 **Deploy Hooks** 섹션 → Create Hook. Name: `sanity-publish` / Branch: `main` → 생성된 URL(`https://api.vercel.com/v1/integrations/deploy/...`)을 복사.
2. **Sanity에 훅 등록:** https://www.sanity.io/manage → 프로젝트 → **API** 탭 → 좌측 **Webhooks** → Create webhook. Name: `vercel-rebuild` / URL: 복사한 주소 붙여넣기 / Dataset: `production` / Trigger on: **Create·Update·Delete 전부 체크** / 나머지 기본값 → Save.
3. 이후 게시할 때마다 1~2분 뒤 사이트에 반영된다. (참고: 이 자동 빌드는 Vercel 무료 플랜 한도 내에서 충분.)

---

## 1. 파일 매니페스트

**신설:**

| 경로 | 역할 |
|---|---|
| `src/lib/sanity/client.ts` | 읽기 전용 Sanity 클라이언트 (토큰 불필요 — 공개 데이터셋 읽기) |
| `src/lib/sanity/queries.ts` | GROQ 쿼리 + `Project[]` 매핑 |
| `src/lib/imageUrl.ts` | Sanity 이미지 URL 변환 헬퍼 (`cloudinary.ts` 대체) |

**수정 (동결 재개방 — 데이터 입구에 한정):**

| 경로 | 허용 변경 |
|---|---|
| `src/types/index.ts` | **추가만**: 기존 필드·타입 변경 금지 (§2) |
| `src/app/page.tsx` | async 서버 컴포넌트화 + fetch + props 전달 |
| `src/app/work/[slug]/page.tsx` | 동일 + `generateStaticParams`의 Sanity 전환 |
| `src/components/LandingExperience.tsx` | §4-1의 5개 변경점만 |
| `src/components/ContentArea.tsx` | §4-2의 변경점만 |
| `src/components/MobileProjectWall.tsx` | §4-3의 3개 변경점만 |
| `src/components/ProjectWall.tsx` | import 1줄 + 호출 1곳 교체만 |

**금지 변경 (절대 접촉 금지):**
`src/hooks/useRingWall.ts`, `src/lib/shuffle.ts`, `src/app/globals.css`, `src/components/SiteHeader.tsx`, `sanity/**`, `sanity.config.ts`, `scripts/**` — 그리고 **수정 허용 파일 안에서도 링·트랙의 물리, 배치 수학, 관성·트위닝, 애니메이션, 상태 설계, 레이아웃 상수는 한 줄도 변경 금지.** 이 스펙의 변경은 "데이터가 어디서 오는가"에만 국한된다.

**삭제 없음:** `src/data/projects.ts` / `src/data/projectSlides.ts` / `src/lib/cloudinary.ts`는 이 스펙 완료 시 **어디서도 import되지 않는 상태**가 되지만 파일은 남긴다. 삭제는 사용자 화면 검증 통과 후 별도 지시로 수행(§6).

---

## 2. 타입 확장 — `src/types/index.ts` (추가만)

```ts
// Project에 추가 (전부 optional):
slides?: ProjectSlide[]          // Sanity에서 문서와 함께 로드
client?: string                  // 발주처 (4단계에서 표시)
size?: string                    // 규모 (4단계에서 표시)
coverHotspot?: { x: number; y: number }   // 커버 크롭 초점 (Studio hotspot)

// ImageSlide에 추가:
ratio?: number                   // 이미지 w/h — Sanity metadata 공급

// DiagramItem에 추가:
ratio?: number
```

- `QuoteSlide`는 이번 단계에서 타입·유니언에 **추가하지 않는다** (렌더러가 4단계 소관 — §3의 쿼리에서 원천 차단).

---

## 3. 데이터 계층 신설

### 3-1. `src/lib/sanity/client.ts`

```ts
import { createClient } from '@sanity/client'

export const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2026-07-10',
  useCdn: false,   // 빌드 시점 1회 조회 — 캐시 계층 불개입 (결정론)
})
```

### 3-2. `src/lib/sanity/queries.ts`

`getProjects(): Promise<Project[]>` 단일 함수. GROQ 쿼리로 전 프로젝트를 `displayOrder` 오름차순 조회하고 기존 `Project` 타입 형태로 매핑해 반환한다(프론트 계약 유지). 핵심 매핑:

```groq
*[_type == "project"] | order(displayOrder asc) {
  "id": slug.current,
  careerNo, title, titleKr, year,
  "type": mainType,
  subTypes, status, result, featured, displayOrder,
  "coverImage": coverImage.asset->url,
  "coverHotspot": coverImage.hotspot{ x, y },
  coverColor, location, client, size,
  "slides": slides[_type != "quoteSlide"]{
    _type == "imageSlide" => {
      "kind": "image",
      "src": image.asset->url,
      "ratio": image.asset->metadata.dimensions.aspectRatio,
      caption, diagram
    },
    _type == "diagramSetSlide" => {
      "kind": "diagramSet",
      autoAdvanceMs,
      "items": items[]{
        "src": image.asset->url,
        "ratio": image.asset->metadata.dimensions.aspectRatio,
        label, description
      }
    },
    _type == "creditsSlide" => {
      "kind": "credits",
      "rows": rows[]{ label, value }
    }
  }
}
```

- 매핑 후처리: `slides`가 null 또는 빈 배열이면 필드 자체를 undefined로 정리. null 필드(subTypes·location 등)는 undefined로 정규화하여 기존 optional 계약과 일치시킨다.
- `getProjectSlugs(): Promise<string[]>` — `generateStaticParams`용 경량 쿼리(`*[_type == "project"].slug.current`).

### 3-3. `src/lib/imageUrl.ts` — `cloudinary.ts` 대체

Sanity CDN(`cdn.sanity.io`)은 URL 쿼리 파라미터로 실시간 변환을 지원한다. 기존 헬퍼와 **동일한 호출 형태**(string in → string out, 비대상 URL은 원본 반환)를 유지한다:

```ts
/** 데스크톱 월 썸네일 — cldThumb 대체 */
export function sanityThumb(src: string, width = 480): string {
  if (!src.includes('cdn.sanity.io')) return src
  return `${src}?w=${width}&q=75&auto=format`
}

/** 모바일 카드 3:2 크롭 — cldCard 대체. hotspot 있으면 초점 크롭 */
export function sanityCard(
  src: string,
  width = 800,
  hotspot?: { x: number; y: number },
): string {
  if (!src.includes('cdn.sanity.io')) return src
  const h = Math.round((width * 2) / 3)
  const fp = hotspot ? `&crop=focalpoint&fp-x=${hotspot.x}&fp-y=${hotspot.y}` : ''
  return `${src}?w=${width}&h=${h}&fit=crop${fp}&q=75&auto=format`
}
```

- 이관된 이미지에는 아직 hotspot이 없으므로 당분간 중앙 크롭(fit=crop 기본) — 이후 Studio에서 이미지별 hotspot을 찍으면 즉시 초점 크롭으로 승격된다(cldCard의 g_auto 승계 완료).

---

## 4. 소비 지점 전환

### 4-1. `src/app/page.tsx` / `src/app/work/[slug]/page.tsx` / `LandingExperience.tsx`

**page.tsx (홈):**
```tsx
import { getProjects } from '@/lib/sanity/queries'
import { LandingExperience } from '@/components/LandingExperience'

export const dynamic = 'force-static'

export default async function HomePage() {
  const projects = await getProjects()
  return <LandingExperience projects={projects} />
}
```

**work/[slug]/page.tsx:** 동일 패턴 + `generateStaticParams`가 `getProjectSlugs()` 사용 + `export const dynamic = 'force-static'`. `<LandingExperience projects={projects} initialSlug={slug} />`.

**LandingExperience.tsx — 허용 변경 5점 (그 외 무변경):**
1. `import { sortedProjects } from '@/data/projects'` 제거.
2. Props에 `projects: Project[]` 추가.
3. 모듈 레벨 `FILTER_TYPES` 상수 → 컴포넌트 내부 `useMemo`로 이동(`projects` 의존, 동일 산식).
4. 컴포넌트 내 모든 `sortedProjects` 참조 → `projects` prop으로 기계적 치환 (검증: 치환 후 파일 내 `sortedProjects` 문자열 0건).
5. `projects`는 이미 displayOrder 정렬 상태로 도착하므로 재정렬 불요.

### 4-2. `ContentArea.tsx` — 선로드 서브시스템 삭제

1. `import { projectSlides } from '@/data/projectSlides'` 제거.
2. `getSlides(project)` 교체: `project.slides ?? (project.coverImage ? [{ kind: 'image', src: project.coverImage }] : [])`.
3. **선로드 서브시스템 전체 삭제:** `ratioCache`, `loadRatio()`, `PRELOAD_TIMEOUT_MS`, 그리고 이를 구동하는 이펙트(현행 368~382행 부근). 삭제 전 해당 이펙트가 **슬라이드별로 어떤 src를 선택하는지의 로직을 그대로 보존**하여, 같은 선택 규칙으로 슬라이드의 `ratio` 필드를 읽는 **동기 순수 계산**(useMemo)으로 대체한다. `ratio` 부재 시 `FALLBACK_RATIO`(4/3) — 기존 폴백 경로와 동일. `FALLBACK_RATIO` 상수와 이후의 폭 계산·rects 파생 로직은 무변경.
4. 결과: 트랙 폭이 마운트 즉시 결정 — 비동기 대기 상태 자체가 소멸.

### 4-3. `MobileProjectWall.tsx` — 3점

1. `import { projectSlides } from '@/data/projectSlides'` 제거 → 49~52행 부근의 슬라이드 취득을 `project.slides ?? []`로 교체(첫 슬라이드=커버 중복 제거 로직은 무변경 — Sanity URL도 동일 자산이면 동일 문자열이므로 그대로 작동).
2. `import { cldCard } from '@/lib/cloudinary'` → `import { sanityCard } from '@/lib/imageUrl'`, 호출 전부 치환. 호출부에 세 번째 인자로 해당 프로젝트의 `coverHotspot` 전달.
3. 그 외 무변경.

### 4-4. `ProjectWall.tsx` — 최소 접촉

`import { cldThumb } from '@/lib/cloudinary'` → `import { sanityThumb } from '@/lib/imageUrl'`, 호출 1곳(`cldThumb(project.coverImage, 480)`) 치환. **그 외 한 줄도 변경 금지.**

---

## 5. 검증

1. `npx tsc --noEmit` 통과.
2. `git diff --stat`으로 §1 매니페스트 외 파일 접촉이 없음을 확인해 보고.
3. 전환 완전성 검사: `src/components`와 `src/app` 안에 `@/data/projects`·`@/data/projectSlides`·`@/lib/cloudinary` import가 **0건**임을 grep으로 확인해 보고.

**사용자 검증(배포 후):**
- 데스크톱·모바일에서 월·필터·셔플·트랙·상세 진입이 현재와 동일하게 동작하는지 화면 녹화로 확인 (특히: 트랙 진입 시 슬라이드 폭이 첫 프레임부터 안정적인지 — 선로드 삭제의 효과 지점).
- **종단 검증:** Studio에서 임의 프로젝트의 결과(result) 필드 등 사소한 값 하나 수정 → Publish → 1~2분 후 사이트 반영 확인 → 원복 후 재게시. 이것이 통과하면 CMS 체계 전체(입력→게시→재빌드→반영)가 완결된 것이다.

---

## 6. 검증 통과 후 정리 (별도 지시로 실행 — 이 스펙 범위 아님)

사용자 화면 검증·종단 검증 통과 후, Claude Code에 다음 한 줄로 잔재를 정리한다:
```
src/data/projects.ts, src/data/projectSlides.ts, src/lib/cloudinary.ts를 삭제하고,
어디서도 import되지 않음을 grep으로 확인한 뒤 npx tsc --noEmit으로 검증해줘.
```

---

## 7. Claude Code 실행 프롬프트

```
SANITY_DATASOURCE_SPEC.md 파일을 읽고 명세대로 구현해줘.
동결 재개방 범위는 스펙 §1 매니페스트가 전부다 — 수정 허용 파일 안에서도
물리·배치 수학·애니메이션·상태 설계는 한 줄도 바꾸지 마라. 변경은 데이터 수급 경로에만 국한된다.
구현 후 npx tsc --noEmit 검증, git diff --stat 보고,
src/components·src/app 내 @/data/*·@/lib/cloudinary import 0건을 grep으로 확인해서 보고해줘.
npm run dev / npm run build는 실행 금지.
```
