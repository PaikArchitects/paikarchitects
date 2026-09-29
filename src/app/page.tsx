import { getLandingMode, getProjects } from '@/lib/sanity/queries'
import { LandingSwitch } from '@/components/LandingSwitch'
import { pageMetadata } from '@/lib/seo'

// Studio SITE SETTINGS의 landingMode를 재배포 없이 60초 내 반영 (about과 같은 방식)
export const revalidate = 60

export const metadata = pageMetadata({ path: '/' })

export default async function HomePage() {
  const [projects, mode] = await Promise.all([getProjects(), getLandingMode()])
  return <LandingSwitch projects={projects} mode={mode} />
}
