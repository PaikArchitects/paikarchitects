import { getProjects } from '@/lib/sanity/queries'
import { LandingExperience } from '@/components/LandingExperience'

export const dynamic = 'force-static'

export default async function HomePage() {
  const projects = await getProjects()
  return <LandingExperience projects={projects} />
}
