import { AboutNav } from '@/components/AboutNav'
import { getAbout } from '@/lib/sanity/queries'
import type { PortableTextBlock } from '@/types'

export const revalidate = 60

function renderBlocks(blocks: PortableTextBlock[] | undefined) {
  if (!blocks || blocks.length === 0) return null
  return blocks.map((b, i) => (
    <p key={b._key ?? i} style={{ whiteSpace: 'pre-line' }}>
      {b.children?.map(c => c.text).join('') ?? ''}
    </p>
  ))
}

export default async function AboutPage() {
  const about = await getAbout()
  if (!about) {
    return (
      <div className="about-page">
        <div className="about-inner" />
      </div>
    )
  }

  const { position, preoccupations, education, employment, awards, exhibitions, contact } = about

  return (
    <div className="about-page">

      {/* 상단 층 내비 — 앵커 점프. scroll-behavior/scroll-margin-top으로 처리, JS 없음.
          .about-scroll 바깥에 둔다 — 안에 있으면 본문과 함께 스크롤된다 */}
      <AboutNav />

      <div className="about-scroll">
        <div className="about-inner">

        {/* ── 층 1: POSITION ── */}
        <section className="about-row" id="position">
          <div className="about-label">Position</div>
          <div className="about-body-en">{renderBlocks(position?.en)}</div>
          <div className="about-body-ko">{renderBlocks(position?.ko)}</div>
        </section>

        {/* ── 층 2: PREOCCUPATIONS ── */}
        <section className="about-row" id="preoccupations">
          <div className="about-label">Preoccupations</div>
          <div className="about-body-en">
            {preoccupations?.map((p, i) => (
              <div key={i} className="about-preocc-item">
                <div className="about-preocc-heading">{p.heading.en}</div>
                <div>{p.body.en}</div>
              </div>
            ))}
          </div>
          <div className="about-body-ko">
            {preoccupations?.map((p, i) => (
              <div key={i} className="about-preocc-item">
                <div className="about-preocc-heading">{p.heading.ko}</div>
                <div>{p.body.ko}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 층 3: CURRICULUM VITAE — 병기 없음, 전폭 단일 열 ── */}
        <section className="about-row about-row--wide" id="cv">
          <div className="about-label">Curriculum<br />Vitae</div>
          <div>

            {education && education.length > 0 && (
              <div className="about-cv-section">
                <div className="about-cv-heading">Education</div>
                {education.map((e, i) => (
                  <div key={i} className="about-cv-line">
                    <div>
                      {e.title}
                      {e.period && <span className="about-cv-period">{e.period}</span>}
                    </div>
                    {e.detail && <div className="about-cv-detail">{e.detail}</div>}
                  </div>
                ))}
              </div>
            )}

            {employment && employment.length > 0 && (
              <div className="about-cv-section">
                <div className="about-cv-heading">Professional Experience</div>
                {employment.map((emp, i) => (
                  <div key={i}>
                    <div className="about-cv-line">
                      <div>
                        {emp.title}
                        {emp.period && <span className="about-cv-period">{emp.period}</span>}
                      </div>
                      {emp.detail && <div className="about-cv-detail">{emp.detail}</div>}
                    </div>
                    {emp.projects && emp.projects.length > 0 && (
                      <div className="about-cv-projects">
                        {emp.projects.map((p, j) => (
                          <div key={j} className="about-cv-ranked">
                            <span>{p.title}</span>
                            <span className="about-cv-mid">{p.result}</span>
                            <span className="about-cv-year">{p.year}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {awards && awards.length > 0 && (
              <div className="about-cv-section">
                <div className="about-cv-heading">Awards</div>
                {awards.map((a, i) => (
                  <div key={i} className="about-cv-ranked">
                    <span>{a.title}</span>
                    <span className="about-cv-mid">{a.result}</span>
                    <span className="about-cv-year">{a.year}</span>
                  </div>
                ))}
              </div>
            )}

            {exhibitions && exhibitions.length > 0 && (
              <div className="about-cv-section">
                <div className="about-cv-heading">Exhibitions and Publications</div>
                {exhibitions.map((x, i) => (
                  <div key={i} className="about-cv-venue">
                    <span>{x.title}</span>
                    <span className="about-cv-mid">{x.venue}</span>
                    <span className="about-cv-year">{x.year}</span>
                  </div>
                ))}
              </div>
            )}

          </div>
        </section>

        {/* ── CONTACT — 층이 아니다. 라벨 없음 ── */}
        {contact && (
          <div className="about-contact">
            <div />
            <div>
              {contact.location}
              {contact.email && (
                <>
                  {contact.location && ' · '}
                  <a href={`mailto:${contact.email}`}>{contact.email}</a>
                </>
              )}
              {contact.phone && <>{' · '}{contact.phone}</>}
            </div>
          </div>
        )}

        </div>
      </div>
    </div>
  )
}
