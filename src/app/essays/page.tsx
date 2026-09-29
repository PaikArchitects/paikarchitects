import type { Metadata } from 'next'
import Link from 'next/link'
import { BilingualText } from '@/lib/bilingual'
import { getEssays } from '@/lib/sanity/queries'
import { pageMetadata } from '@/lib/seo'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"

export const revalidate = 60

// 게재 에세이가 없으면 Coming soon 스텁이므로 noindex, 1건 이상이면 색인 허용
export async function generateMetadata(): Promise<Metadata> {
  const essays = await getEssays()
  return pageMetadata({ title: 'Essays', path: '/essays', noindex: essays.length === 0 })
}

/** 2026-09-29 → 2026.09.29 */
function formatDate(date: string): string {
  return date.replace(/-/g, '.')
}

// About 본문 컨테이너(.about-page / .about-inner / .about-row)를 그대로 재사용 — 여백·오프셋·반응형 동일
export default async function EssaysPage() {
  const essays = await getEssays()

  return (
    <div className="about-page" style={{ fontFamily: FONT }}>
      <div className="about-header-shell" aria-hidden="true" />
      <div className="about-inner">
        <section className="about-row about-row--wide">
          <div className="about-label">
            <h1 className="about-label-text" style={{ margin: 0, fontSize: 'inherit', fontWeight: 'inherit' }}>
              Essays
            </h1>
          </div>
          <div className="about-body-en">
            {essays.length === 0 ? (
              <p>Essays — Coming soon</p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {essays.map((e) => (
                  <li key={e.slug} style={{ borderTop: '0.5px solid rgba(8, 7, 6, 0.10)' }}>
                    <Link
                      href={`/essays/${e.slug}`}
                      style={{ display: 'block', padding: '20px 0', color: 'inherit', textDecoration: 'none' }}
                    >
                      <div style={{ fontSize: 12, color: 'rgba(8, 7, 6, 0.45)', marginBottom: 6 }}>
                        {formatDate(e.publishedAt)}
                      </div>
                      <BilingualText
                        value={e.title}
                        order="en-first"
                        primaryStyle={{ fontSize: 18, fontWeight: 500, lineHeight: 1.35, color: '#080706' }}
                        secondaryStyle={{ fontSize: 14, fontWeight: 300, lineHeight: 1.5, color: 'rgba(8, 7, 6, 0.60)' }}
                      />
                      {e.excerpt?.en && (
                        <p style={{ marginTop: 10, marginBottom: 0 }}>{e.excerpt.en}</p>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
