import { sanityClient } from './client'
import type { About, Award, Contact, Essay, EssaySummary, LocaleString, Project, ProjectSlide, ProjectStatus, ProjectType } from '@/types'

const PROJECTS_QUERY = `*[_type == "project" && published != false] | order(careerNo desc) {
  "id": slug.current,
  careerNo, title, subtitle, year,
  "type": mainType,
  subTypes, status, "awards": awards[]{ title, visible }, featured,
  "coverImage": coverImage.asset->url,
  "coverHotspot": coverImage.hotspot{ x, y },
  "coverRatio": coverImage.asset->metadata.dimensions.aspectRatio,
  coverCaption,
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
    },
    _type == "videoSlide" => {
      "kind": "video",
      youtubeId, caption
    }
  }
}`

const SLUGS_QUERY = `*[_type == "project" && published != false].slug.current`

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
  awards: Award[] | null
  featured: boolean
  coverImage: string | null
  coverHotspot: { x: number; y: number } | null
  coverRatio: number | null
  coverCaption: LocaleString | null
  coverColor: string | null
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
    awards: r.awards ?? undefined,
    featured: r.featured,
    coverImage: r.coverImage ?? undefined,
    coverHotspot: r.coverHotspot ?? undefined,
    // 0·null은 비율로 쓸 수 없다 — undefined로 떨궈 FALLBACK_RATIO 폴백에 맡긴다
    coverRatio: r.coverRatio && r.coverRatio > 0 ? r.coverRatio : undefined,
    coverCaption: r.coverCaption ?? undefined,
    coverColor: r.coverColor ?? undefined,
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
    case 'video':
      return {
        kind: 'video',
        youtubeId: slide.youtubeId,
        caption: slide.caption ?? undefined,
      }
  }
}

/** generateStaticParams용 경량 쿼리 */
export async function getProjectSlugs(): Promise<string[]> {
  return sanityClient.fetch<string[]>(SLUGS_QUERY)
}

const ABOUT_QUERY = `*[_type == "about" && _id == "about"][0]{
  position,
  "preoccupations": preoccupations[]{ heading, body },
  "education": education[]{ title, detail, period },
  "employment": employment[]{
    title, detail, period,
    "projects": projects[]{ title, result, year }
  },
  "awards": awards[]{ title, result, year },
  "exhibitions": exhibitions[]{ title, venue, year }
}`

/** About 단일 문서. 문서가 없으면 null */
export async function getAbout(): Promise<About | null> {
  return sanityClient.fetch<About | null>(ABOUT_QUERY)
}

const CONTACT_QUERY = `*[_type == "contact" && _id == "contact"][0]{ email, phone, location, instagram }`

/** 연락처 싱글턴 — /contact 본문과 /about 하단이 함께 쓴다. 문서가 없으면 null */
export async function getContact(): Promise<Contact | null> {
  return sanityClient.fetch<Contact | null>(CONTACT_QUERY)
}

const ESSAYS_QUERY = `*[_type == "essay" && published != false && defined(slug.current)] | order(publishedAt desc) {
  "slug": slug.current, title, publishedAt, excerpt
}`

const ESSAY_QUERY = `*[_type == "essay" && published != false && slug.current == $slug][0]{
  "slug": slug.current, title, publishedAt, excerpt, body
}`

const ESSAY_SLUGS_QUERY = `*[_type == "essay" && published != false && defined(slug.current)].slug.current`

// GROQ는 부재 필드를 null로 반환 — optional 계약(undefined)에 맞춰 정규화
type RawEssay = Omit<Essay, 'excerpt' | 'body'> & {
  excerpt: Essay['excerpt'] | null
  body?: Essay['body'] | null
}

function normalizeEssay(r: RawEssay): Essay {
  return {
    slug: r.slug,
    title: r.title,
    publishedAt: r.publishedAt,
    excerpt: r.excerpt ?? undefined,
    body: r.body ?? undefined,
  }
}

/** 게재 에세이 목록 — 최신순 */
export async function getEssays(): Promise<EssaySummary[]> {
  const raw = await sanityClient.fetch<RawEssay[]>(ESSAYS_QUERY)
  return raw.map((r): EssaySummary => ({
    slug: r.slug,
    title: r.title,
    publishedAt: r.publishedAt,
    excerpt: r.excerpt ?? undefined,
  }))
}

/** 에세이 단건. 없거나 비게재면 null */
export async function getEssay(slug: string): Promise<Essay | null> {
  const raw = await sanityClient.fetch<RawEssay | null>(ESSAY_QUERY, { slug })
  return raw ? normalizeEssay(raw) : null
}

/** generateStaticParams용 경량 쿼리 */
export async function getEssaySlugs(): Promise<string[]> {
  return sanityClient.fetch<string[]>(ESSAY_SLUGS_QUERY)
}

export type LandingMode = 'ring' | 'grid' | 'random'

const LANDING_MODES: readonly LandingMode[] = ['ring', 'grid', 'random']

const SITE_SETTINGS_QUERY = `*[_type == "siteSettings" && _id == "siteSettings"][0]{ landingMode }`

/** 첫 화면(/) 모드. 문서가 없거나 값이 세 값 중 하나가 아니면 'ring'(현행 유지) */
export async function getLandingMode(): Promise<LandingMode> {
  const settings = await sanityClient.fetch<{ landingMode?: string | null } | null>(SITE_SETTINGS_QUERY)
  const mode = settings?.landingMode
  return LANDING_MODES.includes(mode as LandingMode) ? (mode as LandingMode) : 'ring'
}
