import { getProjects } from '@/lib/sanity/queries'
import { LandingExperience } from '@/components/LandingExperience'
import { pageMetadata } from '@/lib/seo'

export const dynamic = 'force-static'

export const metadata = pageMetadata({ title: 'Works', path: '/work' })

export default async function WorkPage() {
  const projects = await getProjects()
  return <LandingExperience projects={projects} initialShowFilters />
}
