import { AboutNav } from '@/components/AboutNav'
import { ContactLine } from '@/components/ContactLine'
import { getAbout, getContact } from '@/lib/sanity/queries'
import { renderBlocks } from '@/lib/portableText'
import { pageMetadata } from '@/lib/seo'
import type { ReactNode } from 'react'
import type { LocaleString } from '@/types'

export const revalidate = 60

export const metadata = pageMetadata({ title: 'About', path: '/about' })

// ── CV 좌우 병기 (260929 v2) ──
// 항목 하나 = EN 칸 + KO 칸 한 쌍. 데스크톱은 subgrid로 두 칸을 같은 행에 놓아 시작 높이를 맞추고,
// 모바일은 order로 EN 전체 → KO 전체 순으로 쌓는다 (Position·Preoccupations와 같은 규칙)

type Lang = 'en' | 'ko'

/** ko가 비어 있으면 en으로 대체 — KO 열에 빈칸을 만들지 않는다 */
const pick = (v: LocaleString | undefined, lang: Lang) =>
  v ? (lang === 'ko' ? v.ko || v.en : v.en) : undefined

const CV_HEADINGS = {
  education: { en: 'Education', ko: '학력' },
  employment: { en: 'Professional Experience', ko: '경력' },
  awards: { en: 'Awards', ko: '수상' },
  exhibitions: { en: 'Exhibitions and Publications', ko: '전시 및 출판' },
} satisfies Record<string, LocaleString>

/** start: 섹션 첫 줄(소제목) 또는 프로젝트 목록 첫 줄 — 위 여백을 두 칸에 똑같이 준다 */
function CvPair({ className, start, render }: {
  className: string
  start?: 'section' | 'projects'
  render: (lang: Lang) => ReactNode
}) {
  const mod = start ? ` about-cv-cell--${start}` : ''
  return (
    <div className="about-cv-pair">
      <div className={`${className} about-cv-cell about-cv-cell--en${mod}`}>{render('en')}</div>
      <div className={`${className} about-cv-cell about-cv-cell--ko${mod}`} lang="ko">{render('ko')}</div>
    </div>
  )
}

export default async function AboutPage() {
  const [about, contact] = await Promise.all([getAbout(), getContact()])
  if (!about) {
    return (
      <div className="about-page">
        <div className="about-inner" />
      </div>
    )
  }

  const { position, preoccupations, education, employment, awards, exhibitions } = about

  /** 명칭 + 기간 행, 그 아래 부제. Education·Employment 헤더 */
  const simpleLine = (e: { title: LocaleString; period?: LocaleString; detail?: LocaleString }) =>
    (lang: Lang) => (
      <>
        <div>
          {pick(e.title, lang)}
          {e.period && <span className="about-cv-period">{pick(e.period, lang)}</span>}
        </div>
        {e.detail && <div className="about-cv-detail">{pick(e.detail, lang)}</div>}
      </>
    )

  /** 명칭 + 결과·장소 + 연도 — 좌측 흐름. year는 양 열 동일 */
  const flowLine = (title: LocaleString, mid: LocaleString | undefined, year: string | undefined) =>
    (lang: Lang) => (
      <>
        <span>{pick(title, lang)}</span>
        <span className="about-cv-mid">{pick(mid, lang)}</span>
        <span className="about-cv-year">{year}</span>
      </>
    )

  const heading = (h: LocaleString, first: boolean) => (
    <CvPair className="about-cv-heading" start={first ? undefined : 'section'} render={lang => h[lang]} />
  )

  // 첫 섹션만 위 여백 없음
  let sectionIndex = 0
  const nextIsFirst = () => sectionIndex++ === 0

  return (
    <div className="about-page">

      {/* 헤더 존 불투명 셸 — 문서 스크롤된 본문이 헤더·내비 뒤로 사라지게 한다 */}
      <div className="about-header-shell" aria-hidden="true" />

      {/* 상단 층 내비 — 앵커 점프. scroll-behavior/scroll-margin-top으로 처리, JS 없음.
          position:fixed이므로 문서 스크롤·앵커 점프와 무관하게 항상 상단 고정 */}
      <AboutNav />

      <div className="about-inner">

        {/* ── 층 1: POSITION ── */}
        <section className="about-row" id="position">
          <div className="about-label"><span className="about-label-text">Position</span></div>
          <div className="about-body-en">{renderBlocks(position?.en)}</div>
          <div className="about-body-ko">{renderBlocks(position?.ko)}</div>
        </section>

        {/* ── 층 2: PREOCCUPATIONS ── */}
        <section className="about-row" id="preoccupations">
          <div className="about-label"><span className="about-label-text">Preoccupations</span></div>
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

        {/* ── 층 3: CURRICULUM VITAE — [라벨 | EN | KO] 3열. 항목 단위로 EN·KO 칸이 같은 행에서 시작 ── */}
        <section className="about-row" id="cv">
          <div className="about-label"><span className="about-label-text">Curriculum Vitae</span></div>
          <div className="about-cv-body">

            {education && education.length > 0 && (
              <>
                {heading(CV_HEADINGS.education, nextIsFirst())}
                {education.map((e, i) => (
                  <CvPair key={i} className="about-cv-line" render={simpleLine(e)} />
                ))}
              </>
            )}

            {employment && employment.length > 0 && (
              <>
                {heading(CV_HEADINGS.employment, nextIsFirst())}
                {employment.map((emp, i) => (
                  <div key={i} className="about-cv-group">
                    <CvPair className="about-cv-line" render={simpleLine(emp)} />
                    {emp.projects?.map((p, j) => (
                      <CvPair
                        key={j}
                        className="about-cv-ranked"
                        start={j === 0 ? 'projects' : undefined}
                        render={flowLine(p.title, p.result, p.year)}
                      />
                    ))}
                  </div>
                ))}
              </>
            )}

            {awards && awards.length > 0 && (
              <>
                {heading(CV_HEADINGS.awards, nextIsFirst())}
                {awards.map((a, i) => (
                  <CvPair key={i} className="about-cv-ranked" render={flowLine(a.title, a.result, a.year)} />
                ))}
              </>
            )}

            {exhibitions && exhibitions.length > 0 && (
              <>
                {heading(CV_HEADINGS.exhibitions, nextIsFirst())}
                {exhibitions.map((x, i) => (
                  <CvPair key={i} className="about-cv-venue" render={flowLine(x.title, x.venue, x.year)} />
                ))}
              </>
            )}

          </div>
        </section>

        {/* ── CONTACT — 층이 아니다. 라벨 없음. 원천은 contact 싱글턴(/contact와 공용) ── */}
        {contact && <ContactLine contact={contact} variant="inline" />}

      </div>
    </div>
  )
}
