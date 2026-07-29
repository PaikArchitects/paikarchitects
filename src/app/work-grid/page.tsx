import { getProjects } from '@/lib/sanity/queries'
import { GridExperience } from '@/components/GridExperience'

export const dynamic = 'force-static'

export default async function WorkGridPage() {
  const projects = await getProjects()
  return <GridExperience projects={projects} />
}
