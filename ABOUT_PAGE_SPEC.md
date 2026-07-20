# ABOUT 페이지 전면 재구성 명세 (260720)

## 0. 범위와 제약

**수정 대상 파일 (이외 파일 수정 금지)**

- `sanity/schemaTypes/about.ts` (신규)
- `sanity/schemaTypes/index.ts` (수정)
- `sanity.config.ts` (수정)
- `src/types/index.ts` (수정)
- `src/lib/sanity/queries.ts` (수정)
- `src/app/about/page.tsx` (전면 교체)
- `src/app/globals.css` (수정)

**금지 사항**

- `src/components/SiteHeader.tsx` 수정 금지. `NAV_ITEMS` 4개(ABOUT/WORKS/ESSAYS/CONTACTS) 불변.
- `src/app/contact/`, `src/app/essays/` 손대지 말 것.
- `src/lib/bilingual.tsx` 수정 금지. About 페이지는 이 컴포넌트를 사용하지 않는다(좌우 2열 병기라 상하 스택 구조와 다름). import 하지 말 것.
- `npm run dev`, `npm run build` 실행 금지. 검증은 `npx tsc --noEmit`만.
- 측정 반응형 패턴 금지: `getBoundingClientRect`, `ResizeObserver`, `offsetWidth`를 레이아웃 목적으로 사용하지 않는다. sticky 동작은 CSS `position: sticky`만으로 구현하며 스크롤 리스너·`IntersectionObserver`를 쓰지 않는다.

---

## 1. Sanity 스키마 — `sanity/schemaTypes/about.ts` 신규

About은 단일 문서(singleton)다. `_id`는 `'about'` 고정.

```ts
import { defineType, defineField, defineArrayMember } from 'sanity'

export default defineType({
  name: 'about',
  title: 'ABOUT',
  type: 'document',
  fields: [
    defineField({
      name: 'position',
      title: 'POSITION',
      type: 'localePortableText',
      description: '입장 서술. 문단 단위로 작성한다.',
    }),
    defineField({
      name: 'preoccupations',
      title: 'PREOCCUPATIONS',
      type: 'array',
      description: '반복적으로 되돌아가는 문제들. 순서대로 표시된다.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'preoccupation',
          fields: [
            defineField({ name: 'heading', title: 'HEADING', type: 'localeString' }),
            defineField({ name: 'body', title: 'BODY', type: 'localeText' }),
          ],
          preview: {
            select: { title: 'heading.en', subtitle: 'body.en' },
          },
        }),
      ],
    }),
    defineField({
      name: 'education',
      title: 'EDUCATION',
      type: 'array',
      of: [{ type: 'cvSimpleEntry' }],
    }),
    defineField({
      name: 'employment',
      title: 'EMPLOYMENT',
      type: 'array',
      description: '재직 이력. 각 재직처 아래에 프로젝트 목록이 붙는다.',
      of: [{ type: 'cvEmployment' }],
    }),
    defineField({
      name: 'awards',
      title: 'AWARDS',
      type: 'array',
      of: [{ type: 'cvRankedEntry' }],
    }),
    defineField({
      name: 'exhibitions',
      title: 'EXHIBITIONS AND PUBLICATIONS',
      type: 'array',
      of: [{ type: 'cvVenueEntry' }],
    }),
    defineField({
      name: 'contact',
      title: 'CONTACT',
      type: 'object',
      fields: [
        defineField({ name: 'location', title: 'LOCATION', type: 'string' }),
        defineField({ name: 'email', title: 'EMAIL', type: 'string' }),
        defineField({ name: 'phone', title: 'PHONE', type: 'string' }),
      ],
    }),
  ],
  preview: {
    prepare: () => ({ title: 'ABOUT' }),
  },
})
```

같은 파일에 CV 항목 타입 4종을 함께 정의하고 named export 한다. **모두 영문 전용이다. locale 타입을 쓰지 않는다.**

```ts
export const cvSimpleEntry = defineType({
  name: 'cvSimpleEntry',
  title: 'CV Simple Entry',
  type: 'object',
  fields: [
    defineField({ name: 'title', title: 'TITLE', type: 'string' }),
    defineField({ name: 'detail', title: 'DETAIL', type: 'string', description: '학위·전공 등 부제' }),
    defineField({ name: 'period', title: 'PERIOD', type: 'string', description: '예: 2005–2014' }),
  ],
  preview: { select: { title: 'title', subtitle: 'period' } },
})

export const cvProjectEntry = defineType({
  name: 'cvProjectEntry',
  title: 'CV Project Entry',
  type: 'object',
  fields: [
    defineField({ name: 'title', title: 'TITLE', type: 'string' }),
    defineField({ name: 'result', title: 'RESULT', type: 'string', description: '예: Winner, 2nd Prize' }),
    defineField({ name: 'year', title: 'YEAR', type: 'string' }),
  ],
  preview: { select: { title: 'title', subtitle: 'year' } },
})

export const cvEmployment = defineType({
  name: 'cvEmployment',
  title: 'CV Employment',
  type: 'object',
  fields: [
    defineField({ name: 'title', title: 'TITLE', type: 'string' }),
    defineField({ name: 'detail', title: 'DETAIL', type: 'string', description: '직위 범위 등' }),
    defineField({ name: 'period', title: 'PERIOD', type: 'string' }),
    defineField({
      name: 'projects',
      title: 'PROJECTS',
      type: 'array',
      of: [{ type: 'cvProjectEntry' }],
    }),
  ],
  preview: { select: { title: 'title', subtitle: 'period' } },
})

export const cvRankedEntry = defineType({
  name: 'cvRankedEntry',
  title: 'CV Ranked Entry',
  type: 'object',
  fields: [
    defineField({ name: 'title', title: 'TITLE', type: 'string' }),
    defineField({ name: 'result', title: 'RESULT', type: 'string' }),
    defineField({ name: 'year', title: 'YEAR', type: 'string' }),
  ],
  preview: { select: { title: 'title', subtitle: 'year' } },
})

export const cvVenueEntry = defineType({
  name: 'cvVenueEntry',
  title: 'CV Venue Entry',
  type: 'object',
  fields: [
    defineField({ name: 'title', title: 'TITLE', type: 'string' }),
    defineField({ name: 'venue', title: 'VENUE', type: 'string', description: '장소 또는 Published' }),
    defineField({ name: 'year', title: 'YEAR', type: 'string' }),
  ],
  preview: { select: { title: 'title', subtitle: 'venue' } },
})
```

**주의**: `cvRankedEntry`와 `cvProjectEntry`는 필드 구성이 동일하나, 향후 분화 가능성 때문에 분리한다. 하나로 합치지 말 것.

---

## 2. `sanity/schemaTypes/index.ts` 수정

기존 파일:

```ts
import { localeString, localeText, localePortableText } from './localeTypes'
import project from './project'
import { imageSlide, diagramSetSlide, creditsSlide, textSlide, quoteSlide } from './slides'

export const schemaTypes = [
  localeString, localeText, localePortableText,
  project,
  imageSlide, diagramSetSlide, creditsSlide, textSlide, quoteSlide,
]
```

수정 후:

```ts
import { localeString, localeText, localePortableText } from './localeTypes'
import project from './project'
import { imageSlide, diagramSetSlide, creditsSlide, textSlide, quoteSlide } from './slides'
import about, { cvSimpleEntry, cvProjectEntry, cvEmployment, cvRankedEntry, cvVenueEntry } from './about'

export const schemaTypes = [
  localeString, localeText, localePortableText,
  project,
  imageSlide, diagramSetSlide, creditsSlide, textSlide, quoteSlide,
  about, cvSimpleEntry, cvProjectEntry, cvEmployment, cvRankedEntry, cvVenueEntry,
]
```

---

## 3. `sanity.config.ts` 수정 — About을 singleton으로 노출

기존 `plugins: [structureTool(), visionTool()]`를 다음으로 교체한다.

```ts
plugins: [
  structureTool({
    structure: (S) =>
      S.list()
        .title('Content')
        .items([
          S.listItem()
            .title('ABOUT')
            .id('about')
            .child(
              S.document()
                .schemaType('about')
                .documentId('about')
                .title('ABOUT')
            ),
          S.divider(),
          S.documentTypeListItem('project').title('PROJECTS'),
        ]),
  }),
  visionTool(),
],
```

`structureTool`의 import는 기존 그대로 `from 'sanity/structure'`를 쓴다. `S`의 타입은 추론되므로 명시하지 않는다. 타입 오류가 나면 `import type { StructureResolver } from 'sanity/structure'`를 추가해 `structure` 값에 타입을 붙인다.

**중요**: CV 항목 타입(`cvSimpleEntry` 등)과 슬라이드 타입은 object 타입이므로 문서 목록에 원래 뜨지 않는다. `project`만 명시적으로 노출한다.

---

## 4. `src/types/index.ts` 수정 — 타입 추가

파일 **최하단**에 다음을 추가한다. 기존 타입은 일절 수정하지 않는다.

```ts
// ── ABOUT 페이지 ──

/** CV 공통 — 명칭 + 부제 + 기간. Education·Employment 헤더 행 */
export interface CvSimpleEntry {
  title: string
  detail?: string
  period?: string
}

/** CV — 명칭 + 결과 + 연도. Employment 하위 프로젝트, Awards */
export interface CvRankedEntry {
  title: string
  result?: string
  year?: string
}

/** CV — 명칭 + 장소 + 연도. Exhibitions and Publications */
export interface CvVenueEntry {
  title: string
  venue?: string
  year?: string
}

/** CV — 재직 이력. 하위에 프로젝트 목록을 갖는다 */
export interface CvEmployment extends CvSimpleEntry {
  projects?: CvRankedEntry[]
}

/** PREOCCUPATIONS 항목 — 제목·본문 모두 병기 */
export interface Preoccupation {
  heading: LocaleString
  body: LocaleText
}

export interface AboutContact {
  location?: string
  email?: string
  phone?: string
}

export interface About {
  position?: LocalePortableText
  preoccupations?: Preoccupation[]
  education?: CvSimpleEntry[]
  employment?: CvEmployment[]
  awards?: CvRankedEntry[]
  exhibitions?: CvVenueEntry[]
  contact?: AboutContact
}
```

---

## 5. `src/lib/sanity/queries.ts` 수정 — About 쿼리 추가

기존 `PROJECTS_QUERY`·`SLUGS_QUERY`·`getProjects`·`normalizeSlide`·`getProjectSlugs`는 일절 수정하지 않는다.

import 문에 `About` 타입을 추가한다:

```ts
import type { About, Award, LocaleString, Project, ProjectSlide, ProjectStatus, ProjectType } from '@/types'
```

파일 **최하단**에 추가:

```ts
const ABOUT_QUERY = `*[_type == "about" && _id == "about"][0]{
  position,
  "preoccupations": preoccupations[]{ heading, body },
  "education": education[]{ title, detail, period },
  "employment": employment[]{
    title, detail, period,
    "projects": projects[]{ title, result, year }
  },
  "awards": awards[]{ title, result, year },
  "exhibitions": exhibitions[]{ title, venue, year },
  contact
}`

/** About 단일 문서. 문서가 없으면 null */
export async function getAbout(): Promise<About | null> {
  return sanityClient.fetch<About | null>(ABOUT_QUERY)
}
```

**주의**: GROQ의 `[0]`은 결과가 없으면 `null`을 반환한다. 페이지에서 반드시 null 처리를 해야 한다.

---

## 6. `src/app/globals.css` 수정 — About 레이아웃 클래스 추가

파일 **최하단**(`::selection` 블록 뒤)에 추가한다. 기존 규칙은 일절 수정하지 않는다.

```css
/* ══════════════════════════════════════════════════════
   ABOUT PAGE
   3층 구조(POSITION / PREOCCUPATIONS / CURRICULUM VITAE).
   좌측 라벨 월은 position:sticky로 상단 고정 → 다음 층 라벨이
   물리적으로 밀어낸다(push-out). JS 스크롤 계산 없음.
   반응형 경계는 WORKS와 동일: 1440 / 1024
   ══════════════════════════════════════════════════════ */

.about-page {
  background: #FFFFFF;
  color: #080706;
  min-height: 100vh;
  padding: 140px 44px 120px;
}

.about-inner {
  max-width: 1200px;
  margin: 0 auto;
}

/* 한 층 = [라벨 월 | EN | KO] 3열. CV 층만 .about-row--wide로 2열 */
.about-row {
  display: grid;
  grid-template-columns: 200px 1fr 1fr;
  column-gap: 48px;
  padding-bottom: 120px;
  align-items: start;
}

.about-row--wide {
  grid-template-columns: 200px 1fr;
}

/* 라벨: sticky. top에 붙었다가 다음 라벨에 밀려난다.
   부모(.about-row)가 grid item이므로 sticky 컨테이닝 블록은
   그 grid item 자신 → 층 높이만큼만 고정되고 이후 밀려난다. */
.about-label {
  position: sticky;
  top: 24px;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  line-height: 1.4;
  color: #080706;
}

.about-body-en,
.about-body-ko {
  font-size: 14px;
  font-weight: 300;
  line-height: 1.75;
  color: rgba(8, 7, 6, 0.72);
}

.about-body-ko {
  line-height: 1.85;
}

.about-body-en p + p,
.about-body-ko p + p {
  margin-top: 14px;
}

/* PREOCCUPATIONS 항목 */
.about-preocc-item + .about-preocc-item {
  margin-top: 24px;
}

.about-preocc-heading {
  font-weight: 500;
  color: #080706;
  margin-bottom: 4px;
}

/* ── CURRICULUM VITAE ── */
.about-cv-section + .about-cv-section {
  margin-top: 32px;
}

.about-cv-heading {
  font-size: 14px;
  font-weight: 500;
  color: #080706;
  margin-bottom: 14px;
}

.about-cv-line {
  font-size: 13px;
  font-weight: 300;
  line-height: 1.7;
  color: rgba(8, 7, 6, 0.72);
}

.about-cv-detail {
  color: rgba(8, 7, 6, 0.45);
}

/* Education·Employment 헤더 행: 명칭 바로 뒤에 기간이 붙는다 (우측 정렬 아님) */
.about-cv-period {
  margin-left: 20px;
  color: rgba(8, 7, 6, 0.45);
}

/* 프로젝트 목록·Awards: [명칭 | 결과 | 연도] 3열, 연도 우변 통일 */
.about-cv-ranked {
  display: grid;
  grid-template-columns: 1fr 96px 56px;
  font-size: 13px;
  font-weight: 300;
  line-height: 1.7;
  color: rgba(8, 7, 6, 0.60);
}

/* Exhibitions: [명칭 | 장소 | 연도] 3열. 연도 우변은 위와 동일 */
.about-cv-venue {
  display: grid;
  grid-template-columns: 1fr 260px 56px;
  font-size: 13px;
  font-weight: 300;
  line-height: 1.7;
  color: rgba(8, 7, 6, 0.60);
}

.about-cv-year {
  text-align: right;
}

.about-cv-projects {
  margin-top: 10px;
}

/* Contact — CV 층 아래, 라벨 열을 비우고 본문 열에서 시작 */
.about-contact {
  display: grid;
  grid-template-columns: 200px 1fr;
  column-gap: 48px;
  padding-top: 20px;
  border-top: 0.5px solid rgba(8, 7, 6, 0.10);
  font-size: 13px;
  font-weight: 300;
  color: rgba(8, 7, 6, 0.60);
}

.about-contact a {
  color: inherit;
  text-decoration: none;
}

.about-contact a:hover {
  text-decoration: underline;
}

/* ── D2 (1024–1439px) — 3열 유지, 여백만 축소 ── */
@media (max-width: 1439px) {
  .about-page {
    padding: 120px 32px 100px;
  }
  .about-row {
    grid-template-columns: 160px 1fr 1fr;
    column-gap: 32px;
    padding-bottom: 96px;
  }
  .about-row--wide {
    grid-template-columns: 160px 1fr;
  }
  .about-contact {
    grid-template-columns: 160px 1fr;
    column-gap: 32px;
  }
  .about-cv-venue {
    grid-template-columns: 1fr 200px 56px;
  }
}

/* ── M (<1024px) — 라벨 월 소멸. 라벨이 본문 위로 접히고 sticky 유지.
       병기는 상하(EN 위 / KO 아래). 헤더 바 56px 회피 ── */
@media (max-width: 1023px) {
  .about-page {
    padding: 88px 20px 80px;
  }

  .about-row,
  .about-row--wide {
    display: block;
    padding-bottom: 64px;
  }

  .about-label {
    display: block;
    top: 56px;                  /* 모바일 헤더 바(56px) 바로 아래 */
    background: #FFFFFF;        /* 본문이 라벨 뒤로 지나가므로 불투명 필요 */
    padding: 12px 0 10px;
    margin-bottom: 6px;
    font-size: 10px;
    z-index: 10;
  }

  /* 상하 병기 — EN 아래 KO */
  .about-body-ko {
    margin-top: 20px;
  }

  .about-cv-ranked {
    grid-template-columns: 1fr 84px 48px;
    font-size: 12px;
  }

  .about-cv-venue {
    display: block;
    font-size: 12px;
  }

  .about-cv-venue .about-cv-year {
    text-align: left;
    margin-left: 12px;
  }

  .about-contact {
    display: block;
    font-size: 12px;
  }
}
```

**sticky 관련 주의**: `.about-label`의 sticky가 작동하려면 조상 요소에 `overflow: hidden`·`overflow: auto`가 없어야 한다. `.about-page`·`.about-inner`에 overflow 속성을 절대 추가하지 말 것.

---

## 7. `src/app/about/page.tsx` — 전면 교체

기존 파일 내용을 **전량 삭제**하고 아래로 대체한다.

기존 파일에서 제거되는 것들(잔존 금지):

- `import Link from 'next/link'`
- `FONT` 상수
- `maxWidth: 680` 중앙 정렬 컨테이너
- 영문 3문단 하드코딩 전체
- `<h1>Chang Hyun Paik</h1>`
- `id="contact"` 앵커 블록과 `mailto:` `Link`

```tsx
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
      <div className="about-inner">

        {/* ── 층 1: POSITION ── */}
        <section className="about-row">
          <div className="about-label">Position</div>
          <div className="about-body-en">{renderBlocks(position?.en)}</div>
          <div className="about-body-ko">{renderBlocks(position?.ko)}</div>
        </section>

        {/* ── 층 2: PREOCCUPATIONS ── */}
        <section className="about-row">
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
        <section className="about-row about-row--wide">
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
                            <span>{p.result}</span>
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
                    <span>{a.result}</span>
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
                    <span>{x.venue}</span>
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
  )
}
```

**주의 1**: `BilingualText`를 import 하지 않는다. About의 병기는 좌우 2열이라 상하 스택인 `BilingualText`와 구조가 다르다.

**주의 2**: 라벨 텍스트는 코드에 `Position`·`Preoccupations`·`Curriculum Vitae`로 쓰고, 대문자 변환은 CSS `text-transform: uppercase`가 담당한다. 하드코딩으로 대문자를 쓰지 말 것.

**주의 3**: `renderBlocks`는 소프트 줄바꿈 보존을 위해 `whiteSpace: 'pre-line'`을 쓴다. `pre-wrap`이 아니다(연속 공백까지 보존되면 CMS 우발 공백이 드러난다). 기존 텍스트 슬라이드 처리와 동일한 원칙이다.

---

## 8. 검증

```
npx tsc --noEmit
```

오류가 없어야 한다. 특히 다음을 확인한다.

- `src/types/index.ts`에 추가한 타입이 `queries.ts`·`page.tsx` 양쪽에서 해석되는가
- `sanity.config.ts`의 structure 콜백 매개변수 `S`가 타입 추론되는가

`npm run dev`·`npm run build`는 실행하지 않는다.

---

## 9. 실행 후 남는 수작업 (Claude Code 범위 밖)

Studio에 About 문서가 아직 없으므로 화면이 비어 보인다. 사용자가 `/studio`에서 ABOUT 문서를 열고 내용을 입력해야 한다. 이는 명세 범위가 아니다.
