import type { MetadataRoute } from 'next'
import { getEssaySlugs, getProjectSlugs } from '@/lib/sanity/queries'
import { SITE_URL } from '@/lib/seo'

// 제외: /work-grid·/work-grid/*(canonical이 /work 쪽), /studio
// /essays·/essays/*는 게재 에세이가 1건 이상일 때만 (0건이면 /essays는 noindex 스텁)
// lastModified 미기재 — 정확한 값의 원천 없음
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [projectSlugs, essaySlugs] = await Promise.all([getProjectSlugs(), getEssaySlugs()])
  const paths = [
    '/',
    '/work',
    '/about',
    '/contact',
    ...projectSlugs.map((slug) => `/work/${slug}`),
    ...(essaySlugs.length > 0 ? ['/essays', ...essaySlugs.map((slug) => `/essays/${slug}`)] : []),
  ]
  return paths.map((path) => ({ url: `${SITE_URL}${path}` }))
}
