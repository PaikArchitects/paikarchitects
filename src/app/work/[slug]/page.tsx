import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProjects, getProjectSlugs } from '@/lib/sanity/queries'
import { LandingExperience } from '@/components/LandingExperience'
import { projectMetadata } from '@/lib/seo'

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
  const projects = await getProjects()
  const p = projects.find((p) => p.id === slug)
  if (!p) return {}
  return projectMetadata(p, { path: `/work/${slug}`, canonical: `/work/${slug}` })
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params
  const projects = await getProjects()
  // 존재하지 않는 slug는 404 — /work-grid/[slug]와 동일 규칙
  if (!projects.some((p) => p.id === slug)) notFound()
  return <LandingExperience projects={projects} initialSlug={slug} />
}
