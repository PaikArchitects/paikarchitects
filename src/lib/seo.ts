import type { Metadata } from 'next'
import type { Project } from '@/types'

export const SITE_URL = 'https://paikarchitects.com'
export const SITE_NAME = 'Architect Chang-hyun Paik'
export const SITE_DESCRIPTION =
  'Chang-hyun Paik is an architect based in Seoul. Since 2015 at SPACE GROUP, his work spans competitions and projects across culture, workplace, infrastructure, and civic programs.'
export const DEFAULT_OG_IMAGE = { url: '/og-default.png', width: 1200, height: 630, alt: SITE_NAME }

interface OgImage {
  url: string
  width: number
  height: number
  alt: string
}

interface PageMetaInput {
  title?: string            // 미지정 = 사이트 기본(홈)
  path: string              // '/about' 등 — canonical·og:url 겸용
  canonical?: string        // 있으면 alternates.canonical에만 사용 (og:url은 path 유지)
  description?: string
  image?: OgImage
  noindex?: boolean
}

// Next.js는 openGraph를 하위 세그먼트에서 얕게 교체한다 — 페이지별 개별 선언 금지, 이 헬퍼만 경유
export function pageMetadata({ title, path, canonical, description, image, noindex }: PageMetaInput): Metadata {
  const fullTitle = title ? `${title} — ${SITE_NAME}` : SITE_NAME
  const desc = description ?? SITE_DESCRIPTION
  const img = image ?? DEFAULT_OG_IMAGE
  return {
    title: title ?? { absolute: SITE_NAME },
    description: desc,
    alternates: { canonical: canonical ?? path },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      locale: 'en_US',
      title: fullTitle,
      description: desc,
      url: path,
      images: [img],
    },
    twitter: { card: 'summary_large_image', title: fullTitle, description: desc, images: [img.url] },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  }
}

/**
 * 프로젝트 OG 이미지 1200×630. imageUrl.ts와 같은 방식으로 hotspot → crop=focalpoint&fp-x/fp-y.
 * fm=jpg 고정 — 카카오톡 등 일부 크롤러가 WebP를 처리하지 못하므로 auto=format 금지.
 * Sanity CDN이 아닌 커버는 크기를 보장할 수 없으므로 기본 OG 이미지로 폴백.
 */
function projectOgImage(project: Project): OgImage {
  const src = project.coverImage
  if (!src || !src.includes('cdn.sanity.io')) return DEFAULT_OG_IMAGE
  const hs = project.coverHotspot
  const fp = hs ? `&crop=focalpoint&fp-x=${hs.x}&fp-y=${hs.y}` : ''
  return {
    url: `${src}?w=1200&h=630&fit=crop${fp}&fm=jpg&q=80`,
    width: 1200,
    height: 630,
    alt: project.title.en,
  }
}

export function projectMetadata(project: Project, opts: { path: string; canonical: string }): Metadata {
  return pageMetadata({
    title: project.title.en,
    path: opts.path,
    canonical: opts.canonical,
    description: project.subtitle?.en || `${project.type} · ${project.year}`,
    image: projectOgImage(project),
  })
}
