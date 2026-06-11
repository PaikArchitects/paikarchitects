import { projects } from '@/data/projects'
import { LandingExperience } from '@/components/LandingExperience'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return projects.map((p) => ({ slug: p.id }))
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params
  // slug 유효성은 LandingExperience가 검증 — 없으면 initialSlug 무시되어 idle 랜딩으로 동작
  return <LandingExperience initialSlug={slug} />
}
