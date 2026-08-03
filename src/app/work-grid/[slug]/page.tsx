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
