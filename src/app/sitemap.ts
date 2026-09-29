import type { MetadataRoute } from 'next'
import { getProjectSlugs } from '@/lib/sanity/queries'
import { SITE_URL } from '@/lib/seo'

// 제외: /work-grid·/work-grid/*(canonical이 /work 쪽), /contact·/essays(noindex — P2에서 추가), /studio
// lastModified 미기재 — 정확한 값의 원천 없음
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await getProjectSlugs()
  const paths = ['/', '/work', '/about', ...slugs.map((slug) => `/work/${slug}`)]
  return paths.map((path) => ({ url: `${SITE_URL}${path}` }))
}
