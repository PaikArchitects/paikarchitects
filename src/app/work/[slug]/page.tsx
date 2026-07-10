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
