import { getProjects } from '@/lib/sanity/queries'
import { GridExperience } from '@/components/GridExperience'
import { pageMetadata } from '@/lib/seo'

export const dynamic = 'force-static'

export const metadata = pageMetadata({ title: 'Works', path: '/work-grid', canonical: '/work' })

export default async function WorkGridPage() {
  const projects = await getProjects()
  return <GridExperience projects={projects} />
}
