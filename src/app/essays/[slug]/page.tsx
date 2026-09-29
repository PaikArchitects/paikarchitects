import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BilingualText } from '@/lib/bilingual'
import { renderBlocks } from '@/lib/portableText'
import { getEssay, getEssaySlugs } from '@/lib/sanity/queries'
import { pageMetadata } from '@/lib/seo'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"

export const revalidate = 60

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const slugs = await getEssaySlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const essay = await getEssay(slug)
  if (!essay) return {}
  return pageMetadata({ title: essay.title.en, path: `/essays/${slug}`, description: essay.excerpt?.en })
}

/** 2026-09-29 → 2026.09.29 */
function formatDate(date: string): string {
  return date.replace(/-/g, '.')
}

// About 본문 컨테이너와 층 문법 재사용 — 헤더 층(날짜 | 제목), 본문 층(빈 라벨 | EN | KO)
export default async function EssayPage({ params }: Props) {
  const { slug } = await params
  const essay = await getEssay(slug)
  if (!essay) notFound()

  return (
    <div className="about-page" style={{ fontFamily: FONT }}>
      <div className="about-header-shell" aria-hidden="true" />
      <div className="about-inner">
        <section className="about-row about-row--wide">
          <div className="about-label">
            <span className="about-label-text">{formatDate(essay.publishedAt)}</span>
          </div>
          <h1 style={{ margin: 0, fontSize: 'inherit', fontWeight: 'inherit' }}>
            <BilingualText
              value={essay.title}
              order="en-first"
              primaryStyle={{ fontSize: 28, fontWeight: 500, lineHeight: 1.25, letterSpacing: '-0.01em', color: '#080706' }}
              secondaryStyle={{ fontSize: 18, fontWeight: 300, lineHeight: 1.4, color: 'rgba(8, 7, 6, 0.60)' }}
              gap={6}
            />
          </h1>
        </section>
        {essay.body && (
          <section className="about-row">
            <div />
            <div className="about-body-en">{renderBlocks(essay.body.en)}</div>
            <div className="about-body-ko">{renderBlocks(essay.body.ko)}</div>
          </section>
        )}
      </div>
    </div>
  )
}
