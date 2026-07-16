import { sanityClient } from './client'
import type { LocaleString, Project, ProjectSlide, ProjectStatus, ProjectType } from '@/types'

const PROJECTS_QUERY = `*[_type == "project"] | order(displayOrder asc) {
  "id": slug.current,
  careerNo, title, subtitle, year,
  "type": mainType,
  subTypes, status, result, featured, displayOrder,
  "coverImage": coverImage.asset->url,
  "coverHotspot": coverImage.hotspot{ x, y },
  coverColor, location, client, size, role,
  "slides": slides[]{
    _type == "imageSlide" => {
      "kind": "image",
      "src": image.asset->url,
      "ratio": image.asset->metadata.dimensions.aspectRatio,
      caption, diagram
    },
    _type == "diagramSetSlide" => {
      "kind": "diagramSet",
      autoAdvanceMs,
      "items": items[]{
        "src": image.asset->url,
        "ratio": image.asset->metadata.dimensions.aspectRatio,
        label, description
      }
    },
    _type == "creditsSlide" => {
      "kind": "credits",
      "rows": rows[]{ label, value }
    },
    _type == "textSlide" => {
      "kind": "text",
      body
    },
    _type == "quoteSlide" => {
      "kind": "quote",
      text, attribution
    }
  }
}`

const SLUGS_QUERY = `*[_type == "project"].slug.current`

// GROQ는 부재 필드를 null로 반환 — 기존 optional 계약(undefined)에 맞춰 정규화
interface RawProject {
  id: string
  careerNo: number
  title: LocaleString
  subtitle: LocaleString | null
  year: number
  type: ProjectType
  subTypes: ProjectType[] | null
  status: ProjectStatus
  result: string | null
  featured: boolean
  displayOrder: number
  coverImage: string | null
  coverHotspot: { x: number; y: number } | null
  coverColor: string
  location: string | null
  client: string | null
  size: string | null
  role: string | null
  slides: ProjectSlide[] | null
}

export async function getProjects(): Promise<Project[]> {
  const raw = await sanityClient.fetch<RawProject[]>(PROJECTS_QUERY)
  return raw.map((r): Project => ({
    id: r.id,
    careerNo: r.careerNo,
    title: r.title,
    subtitle: r.subtitle ?? undefined,
    year: r.year,
    type: r.type,
    subTypes: r.subTypes ?? undefined,
    status: r.status,
    result: r.result ?? undefined,
    featured: r.featured,
    displayOrder: r.displayOrder,
    coverImage: r.coverImage ?? undefined,
    coverHotspot: r.coverHotspot ?? undefined,
    coverColor: r.coverColor,
    location: r.location ?? undefined,
    client: r.client ?? undefined,
    size: r.size ?? undefined,
    role: r.role ?? undefined,
    slides: r.slides && r.slides.length > 0 ? r.slides.map(normalizeSlide) : undefined,
  }))
}

function normalizeSlide(slide: ProjectSlide): ProjectSlide {
  switch (slide.kind) {
    case 'image':
      return {
        kind: 'image',
        src: slide.src,
        ratio: slide.ratio ?? undefined,
        caption: slide.caption ?? undefined,
        diagram: slide.diagram ?? undefined,
      }
    case 'diagramSet':
      return {
        kind: 'diagramSet',
        items: slide.items.map(it => ({ ...it, ratio: it.ratio ?? undefined })),
        autoAdvanceMs: slide.autoAdvanceMs ?? undefined,
      }
    case 'credits':
      return slide
    case 'text':
      return slide
    case 'quote':
      return {
        kind: 'quote',
        text: slide.text,
        attribution: slide.attribution ?? undefined,
      }
  }
}

/** generateStaticParams용 경량 쿼리 */
export async function getProjectSlugs(): Promise<string[]> {
  return sanityClient.fetch<string[]>(SLUGS_QUERY)
}
