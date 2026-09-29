import { getProjects } from '@/lib/sanity/queries'
import { LandingExperience } from '@/components/LandingExperience'
import { pageMetadata } from '@/lib/seo'

export const dynamic = 'force-static'

export const metadata = pageMetadata({ path: '/' })

export default async function HomePage() {
  const projects = await getProjects()
  return <LandingExperience projects={projects} />
}
