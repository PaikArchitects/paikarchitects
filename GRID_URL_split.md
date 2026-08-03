# 그리드 콘텐츠 URL 분리 + 직접 진입 명세 (GRID_URL_split)

> 그리드 콘텐츠 딥링크를 `/work-grid/[slug]`로 분리(링월 `/work/[slug]`와 별개).
> 클릭 진입=morph, 직접 진입(새로고침·공유)=morph 생략·즉시 표시(방법 2).
> 향후 대표 뷰를 `/work` canonical로 승격 가능한 구조. 링월 라우트 무수정.

---

## 0. 확정 결정 (사용자 승인)

- **URL 분리**: 그리드 콘텐츠 = `/work-grid/[slug]`, 링월 콘텐츠 = `/work/[slug]`(기존).
  같은 프로젝트라도 뷰별로 URL이 다름. 새로고침 시 열었던 뷰 유지.
- **canonical**: `/work-grid/[slug]`는 `<link rel="canonical" href="/work/[slug]">`로 SEO 중복 해소.
  (향후 대표 뷰가 정해지면 canonical 방향 재조정.)
- **직접 진입(방법 2)**: `/work-grid/[slug]`를 새로고침·공유로 직접 열면 morph 생략, 콘텐츠
  즉시 표시. 뒤로가기 시 그리드 랜딩 등장. 클릭 진입은 morph 유지.

---

## 1. 라우트 구조

### 1-1. 신설: src/app/work-grid/[slug]/page.tsx
```
import { getProjects } from '@/lib/sanity/queries'
import { GridExperience } from '@/components/GridExperience'
import { notFound } from 'next/navigation'

export const dynamic = 'force-static'

export async function generateStaticParams() {
  const projects = await getProjects()
  return projects.map(p => ({ slug: p.id }))
}

export default async function WorkGridSlugPage({ params }: { params: { slug: string } }) {
  const projects = await getProjects()
  const exists = projects.some(p => p.id === params.slug)
  if (!exists) notFound()
  return <GridExperience projects={projects} initialSlug={params.slug} />
}
```
- `initialSlug`: 직접 진입한 프로젝트 slug. GridExperience가 이를 받아 콘텐츠 즉시 표시(§2).
- 기존 `src/app/work-grid/page.tsx`(랜딩)는 `initialSlug` 없이 렌더(무수정).

### 1-2. canonical (선택 — layout 또는 page metadata)
- Next metadata API로 `/work-grid/[slug]`에 canonical 지정:
  ```
  export async function generateMetadata({ params }): Promise<Metadata> {
    return { alternates: { canonical: `/work/${params.slug}` } }
  }
  ```
- ⚠ 향후 대표 뷰 승격 시 이 canonical 방향을 재검토(대표가 그리드면 반대로).

---

## 2. GridExperience — initialSlug 직접 진입 처리

### 2-1. prop 추가
```
interface GridExperienceProps {
  projects: Project[]
  initialSlug?: string   // 직접 진입 시 즉시 열 프로젝트. 없으면 그리드 랜딩만.
}
```

### 2-2. 직접 진입 = morph 생략 즉시 표시 (방법 2)
```
// 마운트 시 initialSlug 있으면 콘텐츠 즉시 표시(morph 없이)
useEffect(() => {
  if (!initialSlug) return
  const project = projects.find(p => p.id === initialSlug)
  if (!project) return
  enterRectRef.current = null          // 시작 rect 없음 → morph 생략 신호
  setSelected(project)
  setContentMode('active')             // idle 거치지 않고 바로 active(morph 스킵)
  // URL은 이미 /work-grid/[slug] (직접 진입이므로 pushState 불요)
}, [])  // 마운트 1회
```
- `enterRectRef = null` + `contentMode='active'` 직행 → GridContentArea가 morph 시퀀스를
  건너뛰고 콘텐츠를 즉시 렌더(§3).
- ⚠ 클릭 진입(openProject)은 기존대로 `idle→active` morph 유지. 이 effect는 initialSlug가
  있을 때(직접 진입)만 발동.

### 2-3. 클릭 진입 URL = /work-grid/[slug]
openProject의 pushState를 `/work-grid/`로 변경:
```
window.history.pushState({ gridContent: project.id }, '', `/work-grid/${project.id}`)
```
- ⚠ 기존 잔재 `href="/work/${project.id}"`(L593) 제거 — 카드는 div+onClick(GRID_CONTENT_v3 §5).
  `/work/`가 아니라 `/work-grid/`.

### 2-4. 닫기 URL 원복
closeProject의 replaceState를 `/work-grid`로:
```
if (window.location.pathname !== '/work-grid') {
  window.history.replaceState({}, '', '/work-grid')
}
```

### 2-5. 직접 진입 시 뒤로가기 = 그리드 랜딩
- 직접 진입(`/work-grid/[slug]`)에서 뒤로가기(popstate) → 브라우저가 이전 히스토리로.
  단 직접 진입은 이전 히스토리가 없을 수 있음(새 탭). 이 경우 뒤로가기는 브라우저 기본
  동작(빈 히스토리면 아무 일 없음). back 버튼(UI)은 `/work-grid`로 replaceState 후
  closeProject → 그리드 랜딩 표시.
- ⚠ 직접 진입 시 back 버튼은 "그리드 랜딩으로" 이동해야 자연스러움(뒤로 갈 히스토리 없어도).
  closeProject가 `/work-grid`로 replaceState하고 콘텐츠 닫으면 그리드 랜딩이 드러남.

---

## 3. GridContentArea — enterRect null 시 morph 생략

### 3-1. morph 스킵 분기
```
// contentMode active 진입 effect:
if (mode === 'active') {
  if (enterRect === null) {
    // 직접 진입 — morph 생략, 콘텐츠 즉시 표시
    setMorphVisible(false)
    setTrackIn(true)
    setInfoIn(true)
    // 초기 scrollPos = 히어로 중앙(§ GRID_CONTENT_v3 2-4)
    setScrollPos(clampScroll(centers[1] - vpSize.w / 2))
  } else {
    // 클릭 진입 — 기존 morph 시퀀스(enterRect에서 히어로로)
    ...기존 morph...
  }
}
```
- `enterRect === null`: 트랙·정보슬라이드를 즉시 표시(페이드인 정도만, morph 확대 없음).
- `enterRect` 있음: 기존 카드→히어로 morph.
- ⚠ 초기 scrollPos 중앙정렬은 양쪽 공통(직접·클릭 모두 히어로 중앙 정착).

### 3-2. 역-morph도 enterRect 의존
- 직접 진입(enterRect null)은 되돌아갈 카드 rect가 없음 → 닫기 시 역-morph 생략, 콘텐츠
  페이드아웃 후 그리드 랜딩 표시.
- 클릭 진입은 기존 역-morph(카드 rect로 축소).

---

## 4. 검증
- `npx tsc --noEmit`만. dev·build 금지.
- 무수정: 링월 라우트(src/app/work/**), ContentArea.tsx(이 명세 범위 아님), LandingExperience.tsx,
  useRingWall.ts.
- 수정: GridExperience.tsx(initialSlug·URL), GridContentArea.tsx(morph 스킵).
- 신설: src/app/work-grid/[slug]/page.tsx.
- 기존 src/app/work-grid/page.tsx: 무수정(initialSlug 없이 GridExperience 렌더).
- tsc 안 잡히는 것: generateStaticParams 빌드 동작, canonical 렌더 → 배포 확인.

## 5. 배포 후 확인
1. 그리드 카드 클릭 → URL이 /work-grid/[slug]로 변경(링월 /work/[slug]와 다름).
2. 그 상태 새로고침 → 그리드 콘텐츠 유지(링월로 안 튐). morph 없이 콘텐츠 즉시 표시.
3. /work-grid/[slug] 공유 링크 새 탭 진입 → 콘텐츠 즉시 표시, back 버튼 → 그리드 랜딩.
4. 클릭 진입은 여전히 카드→히어로 morph.
5. 링월 /work/[slug]는 기존대로(회귀 없음).
6. canonical이 /work/[slug]를 가리킴(페이지 소스 확인).
