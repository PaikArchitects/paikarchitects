# AUDIT REPORT — Sanity Studio (260930)

> 읽기 전용 감사. 본 파일 외 수정 없음.
> 모든 항목은 원문 코드 발췌. 코드로 확인 불가한 사항은 "미확인"으로 표기.
> 표기 규칙: 표의 `—` = 해당 속성이 코드에 없음 (grep 결과 0건으로 확인).

---

## 1. `sanity.config.ts` 전문

위치: `sanity.config.ts` (저장소 루트, 97행)

```ts
'use client'

import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { projectId, dataset } from './sanity/env'
import { schemaTypes } from './sanity/schemaTypes'
import { BarChartIcon } from '@sanity/icons/BarChart'
import AnalyticsTool from './sanity/AnalyticsTool'

// 싱글턴 — 고정 ID 문서 1개만 존재해야 한다. 신규 생성·복제·삭제 경로를 모두 막는다
const SINGLETON_TYPES = new Set(['siteSettings', 'about', 'contact'])

export default defineConfig({
  name: 'paikarchitects',
  title: 'Architect Chang-hyun Paik',
  projectId: projectId!,
  dataset,
  basePath: '/studio',
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            S.listItem()
              .title('SITE SETTINGS')
              .id('siteSettings')
              .child(
                S.document()
                  .schemaType('siteSettings')
                  .documentId('siteSettings')
                  .title('SITE SETTINGS')
              ),
            S.divider(),
            S.listItem()
              .title('ABOUT')
              .id('about')
              .child(
                S.document()
                  .schemaType('about')
                  .documentId('about')
                  .title('ABOUT')
              ),
            S.listItem()
              .title('CONTACT')
              .id('contact')
              .child(
                S.document()
                  .schemaType('contact')
                  .documentId('contact')
                  .title('CONTACT')
              ),
            S.divider(),
            S.listItem()
              .title('ESSAYS')
              .id('essays')
              .child(
                S.documentTypeList('essay')
                  .title('Essays')
                  .defaultOrdering([{ field: 'publishedAt', direction: 'desc' }])
              ),
            S.divider(),
            S.listItem()
              .title('PROJECTS — PUBLISHED')
              .id('projectsPublished')
              .child(
                S.documentList()
                  .title('Published Projects')
                  .filter('_type == "project" && published != false')
                  .defaultOrdering([{ field: 'careerNo', direction: 'desc' }])
              ),
            S.listItem()
              .title('PROJECTS — HIDDEN')
              .id('projectsHidden')
              .child(
                S.documentList()
                  .title('Hidden Projects')
                  .filter('_type == "project" && published == false')
                  .defaultOrdering([{ field: 'careerNo', direction: 'desc' }])
              ),
          ]),
    }),
    visionTool(),
  ],
  tools: [{ name: 'analytics', title: 'ANALYTICS', icon: BarChartIcon, component: AnalyticsTool }],
  schema: { types: schemaTypes },
  document: {
    // 전역 "새 문서" 메뉴에서 싱글턴 템플릿 제외
    newDocumentOptions: (prev) => prev.filter((item) => !SINGLETON_TYPES.has(item.templateId)),
    // 싱글턴 문서에서 복제·삭제 액션 제거
    actions: (prev, { schemaType }) =>
      SINGLETON_TYPES.has(schemaType)
        ? prev.filter(({ action }) => action !== 'duplicate' && action !== 'delete')
        : prev,
  },
})
```

### 1-a. config가 import하는 로컬 파일 전문

`sanity/env.ts`

```ts
export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production'

if (!projectId) {
  throw new Error('NEXT_PUBLIC_SANITY_PROJECT_ID가 설정되지 않았습니다 (.env.local 확인)')
}

export const apiVersion = '2026-07-10'
```

`sanity/AnalyticsTool.tsx`

```tsx
'use client'

const SHARE_URL = 'https://cloud.umami.is/share/3RKmeMF6CDcqrM1A'

// Studio ANALYTICS 툴 — Umami 공유 대시보드를 툴 영역 전체에 임베드
export default function AnalyticsTool() {
  return (
    <div style={{ height: '100%' }}>
      <iframe
        src={SHARE_URL}
        title="Analytics"
        style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
      />
    </div>
  )
}
```

---

## 2. Structure(데스크 구조) 정의

| 항목 | 값 |
|---|---|
| 별도 structure 파일 | **없음** — `sanity/` 하위 파일은 `AnalyticsTool.tsx`, `env.ts`, `schemaTypes/*` 뿐 (`find sanity -type f` 결과) |
| 정의 위치 | `sanity.config.ts:21-83` — `structureTool({ structure: (S) => ... })` 인라인 |
| 전문 | §1 참조 (21–83행) |

`find sanity -type f` 결과 원문:

```
sanity/AnalyticsTool.tsx
sanity/env.ts
sanity/schemaTypes/about.ts
sanity/schemaTypes/contact.ts
sanity/schemaTypes/essay.ts
sanity/schemaTypes/index.ts
sanity/schemaTypes/localeTypes.ts
sanity/schemaTypes/project.ts
sanity/schemaTypes/siteSettings.ts
sanity/schemaTypes/slides.ts
```

---

## 3. `sanity/schemaTypes/` 타입별 명세

### 3-0. 등록 순서 — `sanity/schemaTypes/index.ts` 전문

```ts
import { localeString, localeText, localePortableText } from './localeTypes'
import project from './project'
import { imageSlide, diagramSetSlide, creditsSlide, textSlide, quoteSlide, videoSlide } from './slides'
import about, { cvSimpleEntry, cvProjectEntry, cvEmployment, cvRankedEntry, cvVenueEntry } from './about'
import contact from './contact'
import essay from './essay'
import siteSettings from './siteSettings'

export const schemaTypes = [
  siteSettings,
  localeString, localeText, localePortableText,
  project,
  imageSlide, diagramSetSlide, creditsSlide, textSlide, quoteSlide, videoSlide,
  about, cvSimpleEntry, cvProjectEntry, cvEmployment, cvRankedEntry, cvVenueEntry,
  contact,
  essay,
]
```

### 3-00. 전 타입 공통 grep 결과

명령: `grep -rnE "icon|groups|group:|fieldsets|fieldset:|hidden|readOnly" sanity/schemaTypes`
결과: **0건** (`(no match)`)

→ 모든 스키마 타입에 `icon`, `groups`, `fieldsets`, 필드 `group`, `hidden`, `readOnly` 정의 없음. 아래 표에서 해당 열은 전부 `—`.

---

### 3-1. `siteSettings` — `sanity/schemaTypes/siteSettings.ts`

| 속성 | 원문 |
|---|---|
| name | `name: 'siteSettings',` |
| title | `title: 'SITE SETTINGS',` |
| type | `type: 'document',` |
| icon | — |
| groups / fieldsets | — |

| name | title | type | group | hidden | readOnly | validation |
|---|---|---|---|---|---|---|
| `landingMode` | `'LANDING MODE'` | `'string'` | — | — | — | 없음 |

preview:
```ts
  preview: {
    prepare: () => ({ title: 'SITE SETTINGS' }),
  },
```
orderings: —

---

### 3-2. `localeString` / `localeText` / `localePortableText` — `sanity/schemaTypes/localeTypes.ts`

| 타입 name | title | type |
|---|---|---|
| `localeString` | `'다국어 문자열'` | `'object'` |
| `localeText` | `'다국어 텍스트'` | `'object'` |
| `localePortableText` | `'다국어 서식 텍스트'` | `'object'` |

icon / groups / fieldsets / preview / orderings: 3개 타입 모두 —

| 소속 타입 | name | title | type | group | hidden | readOnly | validation |
|---|---|---|---|---|---|---|---|
| localeString | `en` | `'English'` | `'string'` | — | — | — | 있음 `(R) => R.required()` |
| localeString | `ko` | `'한국어'` | `'string'` | — | — | — | 없음 |
| localeText | `en` | `'English'` | `'text'` (rows: 3) | — | — | — | 있음 `(R) => R.required()` |
| localeText | `ko` | `'한국어'` | `'text'` (rows: 3) | — | — | — | 없음 |
| localePortableText | `en` | `'English'` | `'array'` of `block` | — | — | — | 있음 `(R) => R.required().min(1)` |
| localePortableText | `ko` | `'한국어'` | `'array'` of `block` | — | — | — | 없음 |

---

### 3-3. `project` — `sanity/schemaTypes/project.ts`

| 속성 | 원문 |
|---|---|
| name | `name: 'project',` |
| title | `title: '프로젝트',` |
| type | `type: 'document',` |
| icon | — |
| groups / fieldsets | — |

| name | title | type | group | hidden | readOnly | validation |
|---|---|---|---|---|---|---|
| `published` | `'PUBLISHED'` | `'boolean'` | — | — | — | 없음 |
| `careerNo` | `'CAREER NO.'` | `'number'` | — | — | — | 있음 `Rule.required().integer().positive()` |
| `title` | `'TITLE'` | `'localeString'` | — | — | — | 있음 `Rule.required()` |
| `subtitle` | `'SUBTITLE'` | `'localeString'` | — | — | — | 없음 |
| `awards` | `'AWARDS'` | `'array'` of object `award` | — | — | — | 없음 (배열 자체) |
| └ `award.title` | `'수상명'` | `'string'` | — | — | — | 있음 `Rule.required()` |
| └ `award.visible` | `'노출'` | `'boolean'` | — | — | — | 없음 |
| `client` | `'CLIENT'` | `'string'` | — | — | — | 없음 |
| `location` | `'LOCATION'` | `'string'` | — | — | — | 없음 |
| `mainType` | `'TYPOLOGY'` | `'string'` | — | — | — | 있음 `Rule.required()` |
| `subTypes` | `'TYPOLOGY (SUB)'` | `'array'` of string | — | — | — | 있음 `Rule.max(2).unique().custom(...)` |
| `size` | `'SIZE'` | `'string'` | — | — | — | 없음 |
| `status` | `'STATUS'` | `'string'` | — | — | — | 있음 `Rule.required()` |
| `year` | `'YEAR'` | `'number'` | — | — | — | 있음 `Rule.required().integer().min(2000).max(2100)` |
| `role` | `'ROLE'` | `'string'` | — | — | — | 없음 |
| `coverImage` | `'COVER IMAGE'` | `'image'` | — | — | — | 없음 |
| `coverCaption` | `'COVER CAPTION'` | `'localeString'` | — | — | — | 없음 |
| `coverColor` | `'COVER COLOR'` | `'string'` | — | — | — | 있음 `Rule.custom(...)` (HEX 검사) |
| `featured` | `'FEATURED'` | `'boolean'` | — | — | — | 없음 |
| `slug` | `'SLUG'` | `'slug'` | — | — | — | 있음 `Rule.required()` |
| `slides` | `'SLIDES'` | `'array'` of imageSlide·diagramSetSlide·creditsSlide·textSlide·quoteSlide·videoSlide | — | — | — | 없음 |

`subTypes` validation 원문 (107–115행):
```ts
      validation: (Rule) =>
        Rule.max(2)
          .unique()
          .custom((subTypes, context) => {
            const mainType = (context.document as { mainType?: string } | undefined)?.mainType
            if (Array.isArray(subTypes) && mainType && subTypes.includes(mainType)) {
              return '용도 (Main)에서 선택한 값과 중복될 수 없습니다'
            }
            return true
          }),
```

`award` 배열 멤버 preview (71–76행):
```ts
          preview: {
            select: { title: 'title', visible: 'visible' },
            prepare({ title, visible }) {
              return { title, subtitle: visible === false ? '숨김' : '노출' }
            },
          },
```

문서 preview (198–200행):
```ts
  preview: {
    select: { title: 'title.en', subtitle: 'title.ko', media: 'coverImage' },
  },
```

orderings (201–217행):
```ts
  orderings: [
    {
      title: '연번 (최신순)',
      name: 'careerNoDesc',
      by: [{ field: 'careerNo', direction: 'desc' }],
    },
    {
      title: '연번',
      name: 'careerNoAsc',
      by: [{ field: 'careerNo', direction: 'asc' }],
    },
    {
      title: '연도',
      name: 'yearDesc',
      by: [{ field: 'year', direction: 'desc' }],
    },
  ],
```

---

### 3-4. 슬라이드 타입 — `sanity/schemaTypes/slides.ts`

icon / groups / fieldsets / orderings: 6개 타입 모두 —

#### `imageSlide`
| 속성 | 원문 |
|---|---|
| name / title / type | `name: 'imageSlide',` / `title: '이미지 슬라이드',` / `type: 'object',` |

| name | title | type | group | hidden | readOnly | validation |
|---|---|---|---|---|---|---|
| `image` | `'이미지'` | `'image'` | — | — | — | 있음 `Rule.required()` |
| `caption` | `'캡션'` | `'localeString'` | — | — | — | 없음 |
| `diagram` | `'다이어그램 취급'` | `'boolean'` | — | — | — | 없음 |

```ts
  preview: {
    select: { media: 'image', caption: 'caption' },
    prepare({ media, caption }) {
      return { media, title: (caption as { en?: string } | undefined)?.en ?? '(캡션 없음)' }
    },
  },
```

#### `diagramSetSlide`
| 속성 | 원문 |
|---|---|
| name / title / type | `name: 'diagramSetSlide',` / `title: '다이어그램 묶음 (자동 넘김)',` / `type: 'object',` |

| name | title | type | group | hidden | readOnly | validation |
|---|---|---|---|---|---|---|
| `items` | `'다이어그램 항목'` | `'array'` of object `diagramItem` | — | — | — | 있음 `Rule.required().min(2)` |
| └ `diagramItem.image` | `'이미지'` | `'image'` | — | — | — | 있음 `Rule.required()` |
| └ `diagramItem.label` | `'라벨'` | `'localeString'` | — | — | — | 있음 `Rule.required()` |
| └ `diagramItem.description` | `'설명'` | `'localeText'` | — | — | — | 있음 `Rule.required()` |
| `autoAdvanceMs` | `'자동 넘김 간격 (ms)'` | `'number'` | — | — | — | 없음 |

```ts
          preview: {
            select: { media: 'image', title: 'label.en', subtitle: 'description.en' },
          },
```
```ts
  preview: {
    select: { firstLabel: 'items.0.label.en' },
    prepare({ firstLabel }) {
      return { title: '다이어그램 묶음', subtitle: firstLabel }
    },
  },
```

#### `creditsSlide`
| 속성 | 원문 |
|---|---|
| name / title / type | `name: 'creditsSlide',` / `title: '크레딧',` / `type: 'object',` |

| name | title | type | group | hidden | readOnly | validation |
|---|---|---|---|---|---|---|
| `rows` | `'크레딧 행'` | `'array'` of object `creditRow` | — | — | — | 있음 `Rule.required()` |
| └ `creditRow.label` | `'라벨'` | `'string'` | — | — | — | 있음 `Rule.required()` |
| └ `creditRow.value` | `'내용'` | `'string'` | — | — | — | 있음 `Rule.required()` |

```ts
          preview: {
            select: { title: 'label', subtitle: 'value' },
          },
```
```ts
  preview: {
    prepare() {
      return { title: '크레딧' }
    },
  },
```

#### `textSlide`
| 속성 | 원문 |
|---|---|
| name / title / type | `name: 'textSlide',` / `title: '본문 텍스트',` / `type: 'object',` |

| name | title | type | group | hidden | readOnly | validation |
|---|---|---|---|---|---|---|
| `body` | `'본문'` | `'localePortableText'` | — | — | — | 있음 `Rule.required()` |

```ts
  preview: {
    select: { body: 'body.en' },
    prepare({ body }) {
      const first = Array.isArray(body) ? body[0] : undefined
      const text = first?.children?.map((c: { text?: string }) => c.text ?? '').join('') ?? ''
      return {
        title: text ? text.slice(0, 50) : '(본문 없음)',
        subtitle: '본문 텍스트',
      }
    },
  },
```

#### `quoteSlide`
| 속성 | 원문 |
|---|---|
| name / title / type | `name: 'quoteSlide',` / `title: '인용구',` / `type: 'object',` |

| name | title | type | group | hidden | readOnly | validation |
|---|---|---|---|---|---|---|
| `text` | `'인용문'` | `'localeString'` | — | — | — | 있음 `Rule.required()` |
| `attribution` | `'출처'` | `'string'` | — | — | — | 없음 |

```ts
  preview: {
    select: { text: 'text', attribution: 'attribution' },
    prepare({ text, attribution }) {
      const en = (text as { en?: string } | undefined)?.en
      return {
        title: en ? en.slice(0, 40) : '(인용문 없음)',
        subtitle: attribution,
      }
    },
  },
```

#### `videoSlide`
| 속성 | 원문 |
|---|---|
| name / title / type | `name: 'videoSlide',` / `title: '영상 (YouTube)',` / `type: 'object',` |

| name | title | type | group | hidden | readOnly | validation |
|---|---|---|---|---|---|---|
| `youtubeId` | `'YouTube 영상 ID'` | `'string'` | — | — | — | 있음 `Rule.required()` |
| `caption` | `'캡션'` | `'localeString'` | — | — | — | 없음 |

```ts
  preview: {
    select: { youtubeId: 'youtubeId', caption: 'caption' },
    prepare({ youtubeId, caption }) {
      const cap = (caption as { en?: string } | undefined)?.en
      return { title: cap ?? '영상', subtitle: `YouTube: ${youtubeId ?? '(ID 없음)'}` }
    },
  },
```

---

### 3-5. `about` 및 CV 객체 타입 — `sanity/schemaTypes/about.ts`

icon / groups / fieldsets / orderings: 6개 타입 모두 —

#### `about`
| 속성 | 원문 |
|---|---|
| name / title / type | `name: 'about',` / `title: 'ABOUT',` / `type: 'document',` |

| name | title | type | group | hidden | readOnly | validation |
|---|---|---|---|---|---|---|
| `position` | `'POSITION'` | `'localePortableText'` | — | — | — | 없음 |
| `preoccupations` | `'PREOCCUPATIONS'` | `'array'` of object `preoccupation` | — | — | — | 없음 |
| └ `preoccupation.heading` | `'HEADING'` | `'localeString'` | — | — | — | 없음 |
| └ `preoccupation.body` | `'BODY'` | `'localeText'` | — | — | — | 없음 |
| `education` | `'EDUCATION'` | `'array'` of `cvSimpleEntry` | — | — | — | 없음 |
| `employment` | `'EMPLOYMENT'` | `'array'` of `cvEmployment` | — | — | — | 없음 |
| `awards` | `'AWARDS'` | `'array'` of `cvRankedEntry` | — | — | — | 없음 |
| `exhibitions` | `'EXHIBITIONS AND PUBLICATIONS'` | `'array'` of `cvVenueEntry` | — | — | — | 없음 |

`preoccupation` 배열 멤버: `title` 속성 없음 (원문 21–30행 — `type: 'object', name: 'preoccupation', fields: [...]`).

```ts
          preview: {
            select: { title: 'heading.en', subtitle: 'body.en' },
          },
```
```ts
  preview: {
    prepare: () => ({ title: 'ABOUT' }),
  },
```

#### `cvSimpleEntry` / `cvProjectEntry` / `cvEmployment` / `cvRankedEntry` / `cvVenueEntry`

| 타입 name | title | type |
|---|---|---|
| `cvSimpleEntry` | `'CV Simple Entry'` | `'object'` |
| `cvProjectEntry` | `'CV Project Entry'` | `'object'` |
| `cvEmployment` | `'CV Employment'` | `'object'` |
| `cvRankedEntry` | `'CV Ranked Entry'` | `'object'` |
| `cvVenueEntry` | `'CV Venue Entry'` | `'object'` |

| 소속 타입 | name | title | type | group | hidden | readOnly | validation |
|---|---|---|---|---|---|---|---|
| cvSimpleEntry | `title` | `'TITLE'` | `'localeString'` | — | — | — | 없음 |
| cvSimpleEntry | `detail` | `'DETAIL'` | `'localeString'` | — | — | — | 없음 |
| cvSimpleEntry | `period` | `'PERIOD'` | `'localeString'` | — | — | — | 없음 |
| cvProjectEntry | `title` | `'TITLE'` | `'localeString'` | — | — | — | 없음 |
| cvProjectEntry | `result` | `'RESULT'` | `'localeString'` | — | — | — | 없음 |
| cvProjectEntry | `year` | `'YEAR'` | `'string'` | — | — | — | 없음 |
| cvEmployment | `title` | `'TITLE'` | `'localeString'` | — | — | — | 없음 |
| cvEmployment | `detail` | `'DETAIL'` | `'localeString'` | — | — | — | 없음 |
| cvEmployment | `period` | `'PERIOD'` | `'localeString'` | — | — | — | 없음 |
| cvEmployment | `projects` | `'PROJECTS'` | `'array'` of `cvProjectEntry` | — | — | — | 없음 |
| cvRankedEntry | `title` | `'TITLE'` | `'localeString'` | — | — | — | 없음 |
| cvRankedEntry | `result` | `'RESULT'` | `'localeString'` | — | — | — | 없음 |
| cvRankedEntry | `year` | `'YEAR'` | `'string'` | — | — | — | 없음 |
| cvVenueEntry | `title` | `'TITLE'` | `'localeString'` | — | — | — | 없음 |
| cvVenueEntry | `venue` | `'VENUE'` | `'localeString'` | — | — | — | 없음 |
| cvVenueEntry | `year` | `'YEAR'` | `'string'` | — | — | — | 없음 |

preview 원문:
```ts
// cvSimpleEntry (73행)
  preview: { select: { title: 'title.en', subtitle: 'period.en' } },
// cvProjectEntry (85행)
  preview: { select: { title: 'title.en', subtitle: 'year' } },
// cvEmployment (103행)
  preview: { select: { title: 'title.en', subtitle: 'period.en' } },
// cvRankedEntry (115행)
  preview: { select: { title: 'title.en', subtitle: 'year' } },
// cvVenueEntry (127행)
  preview: { select: { title: 'title.en', subtitle: 'venue.en' } },
```

---

### 3-6. `contact` — `sanity/schemaTypes/contact.ts`

| 속성 | 원문 |
|---|---|
| name / title / type | `name: 'contact',` / `title: 'CONTACT',` / `type: 'document',` |
| icon / groups / fieldsets / orderings | — |

| name | title | type | group | hidden | readOnly | validation |
|---|---|---|---|---|---|---|
| `email` | `'EMAIL'` | `'string'` | — | — | — | 없음 |
| `phone` | `'PHONE'` | `'string'` | — | — | — | 없음 |
| `location` | `'LOCATION'` | `'string'` | — | — | — | 없음 |
| `instagram` | `'INSTAGRAM'` | `'url'` | — | — | — | 없음 |

```ts
  preview: {
    prepare: () => ({ title: 'CONTACT' }),
  },
```

---

### 3-7. `essay` — `sanity/schemaTypes/essay.ts`

| 속성 | 원문 |
|---|---|
| name / title / type | `name: 'essay',` / `title: 'ESSAY',` / `type: 'document',` |
| icon / groups / fieldsets / orderings | — (단, structure에서 `.defaultOrdering([{ field: 'publishedAt', direction: 'desc' }])` — `sanity.config.ts:61`) |

| name | title | type | group | hidden | readOnly | validation |
|---|---|---|---|---|---|---|
| `published` | `'PUBLISHED'` | `'boolean'` | — | — | — | 없음 |
| `title` | `'TITLE'` | `'localeString'` | — | — | — | 있음 `Rule.required()` |
| `slug` | `'SLUG'` | `'slug'` | — | — | — | 있음 `Rule.required()` |
| `publishedAt` | `'PUBLISHED AT'` | `'date'` | — | — | — | 있음 `Rule.required()` |
| `excerpt` | `'EXCERPT'` | `'localeText'` | — | — | — | 없음 |
| `body` | `'BODY'` | `'localePortableText'` | — | — | — | 없음 |

```ts
  preview: {
    select: { title: 'title.en', subtitle: 'publishedAt' },
  },
```

---

## 4. "Project" / "Projects" / "project" 사용 위치 전수

명령 1: `grep -rnE "Project|project" sanity sanity.config.ts src/app/studio src/lib/sanity`
명령 2 (대문자): `grep -rn "PROJECT" sanity sanity.config.ts src/app/studio`
(`src/lib/sanity`는 Studio 화면이 아니라 사이트 측 GROQ이나, `_type == "project"` 의존 확인용으로 포함)

명령 2 결과 원문:
```
sanity/env.ts:1:export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
sanity/env.ts:5:  throw new Error('NEXT_PUBLIC_SANITY_PROJECT_ID가 설정되지 않았습니다 (.env.local 확인)')
sanity/schemaTypes/about.ts:98:      title: 'PROJECTS',
sanity.config.ts:65:              .title('PROJECTS — PUBLISHED')
sanity.config.ts:74:              .title('PROJECTS — HIDDEN')
```

### 4-a. 표시용 (Studio 화면에 노출되는 title·라벨)

| 위치 | 원문 | 노출 지점 |
|---|---|---|
| `sanity.config.ts:65` | `.title('PROJECTS — PUBLISHED')` | 데스크 루트 목록 항목 |
| `sanity.config.ts:69` | `.title('Published Projects')` | 하위 문서 목록 패널 제목 |
| `sanity.config.ts:74` | `.title('PROJECTS — HIDDEN')` | 데스크 루트 목록 항목 |
| `sanity.config.ts:78` | `.title('Hidden Projects')` | 하위 문서 목록 패널 제목 |
| `sanity/schemaTypes/about.ts:78` | `title: 'CV Project Entry',` | 객체 타입 title (배열 항목 추가 메뉴 등) |
| `sanity/schemaTypes/about.ts:98` | `title: 'PROJECTS',` | `cvEmployment.projects` 필드 라벨 (About 문서 EMPLOYMENT 항목 편집 시) |

참고 — 한글 '프로젝트' (`grep -rn "프로젝트" sanity sanity.config.ts src/app/studio`):

| 위치 | 원문 | 구분 |
|---|---|---|
| `sanity/schemaTypes/project.ts:16` | `title: '프로젝트',` | 표시용 — 문서 타입 title |
| `sanity/schemaTypes/project.ts:30` | `description: "Career 엑셀 '프로젝트 연번' 기준 — 사이트 정렬 기준(내림차순) 및 표시 코드",` | 표시용 — 필드 설명 |
| `sanity/schemaTypes/project.ts:43` | `description: '프로젝트의 목적을 요약하는 한 줄. 타이틀 아래 표시된다',` | 표시용 — 필드 설명 |
| `sanity/schemaTypes/project.ts:177` | `description: '기존 게재 프로젝트의 슬러그는 SEO상 변경 금지',` | 표시용 — 필드 설명 |
| `sanity/schemaTypes/about.ts:43` | `description: '재직 이력. 각 재직처 아래에 프로젝트 목록이 붙는다.',` | 표시용 — 필드 설명 |
| `sanity/schemaTypes/slides.ts:140` | `/** 서술문 — 좌정렬 본문. 프로젝트 설명 텍스트 */` | 코드 주석 (비노출) |

### 4-b. 내부 식별자 (_type, name, id, GROQ, import)

| 위치 | 원문 | 종류 |
|---|---|---|
| `sanity/schemaTypes/project.ts:15` | `name: 'project',` | 스키마 `_type` |
| `sanity/schemaTypes/about.ts:76` | `export const cvProjectEntry = defineType({` | TS 식별자 |
| `sanity/schemaTypes/about.ts:77` | `name: 'cvProjectEntry',` | 스키마 `_type` |
| `sanity/schemaTypes/about.ts:97` | `name: 'projects',` | 필드 name |
| `sanity/schemaTypes/about.ts:100` | `of: [{ type: 'cvProjectEntry' }],` | 타입 참조 |
| `sanity/schemaTypes/index.ts:2` | `import project from './project'` | import |
| `sanity/schemaTypes/index.ts:4` | `import about, { cvSimpleEntry, cvProjectEntry, cvEmployment, cvRankedEntry, cvVenueEntry } from './about'` | import |
| `sanity/schemaTypes/index.ts:12` | `project,` | 스키마 등록 |
| `sanity/schemaTypes/index.ts:14` | `about, cvSimpleEntry, cvProjectEntry, cvEmployment, cvRankedEntry, cvVenueEntry,` | 스키마 등록 |
| `sanity.config.ts:66` | `.id('projectsPublished')` | structure 항목 id (URL 경로 세그먼트) |
| `sanity.config.ts:70` | `.filter('_type == "project" && published != false')` | GROQ |
| `sanity.config.ts:75` | `.id('projectsHidden')` | structure 항목 id (URL 경로 세그먼트) |
| `sanity.config.ts:79` | `.filter('_type == "project" && published == false')` | GROQ |
| `src/lib/sanity/queries.ts:4` | ``const PROJECTS_QUERY = `*[_type == "project" && published != false] \| order(careerNo desc) {`` | GROQ (사이트) |
| `src/lib/sanity/queries.ts:49` | ``const SLUGS_QUERY = `*[_type == "project" && published != false].slug.current` `` | GROQ (사이트) |
| `src/lib/sanity/queries.ts:148` | `"projects": projects[]{ title, result, year }` | GROQ 프로젝션 (about.employment.projects) |
| `src/lib/sanity/queries.ts:2,52,58-60,72,75-77,102,138` | `Project`, `ProjectSlide`, `ProjectStatus`, `ProjectType`, `RawProject`, `getProjects`, `getProjectSlugs` | TS 타입·함수명 |

### 4-c. 오검출 (Sanity 프로젝트 ID — 도메인 "project"와 무관)

| 위치 | 원문 |
|---|---|
| `sanity/env.ts:1` | `export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID` |
| `sanity/env.ts:4` | `if (!projectId) {` |
| `sanity/env.ts:5` | `throw new Error('NEXT_PUBLIC_SANITY_PROJECT_ID가 설정되지 않았습니다 (.env.local 확인)')` (env 누락 시 에러 메시지) |
| `sanity.config.ts:6` | `import { projectId, dataset } from './sanity/env'` |
| `sanity.config.ts:17` | `projectId: projectId!,` |
| `src/lib/sanity/client.ts:4` | `projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,` |

### 4-d. Sanity 기본 UI가 자동 생성하는 "Project" 문자열

미확인 — 스키마 title이 `'프로젝트'`이므로 "Create new" 메뉴·문서 타입 라벨은 코드상 `'프로젝트'`가 사용되나, Studio 런타임 UI 화면에서 실제 표시 문자열은 브라우저 확인하지 않았음.

---

## 5. `/studio` 라우트 구성 및 전역 크롬 렌더 여부

### 5-a. `src/app/studio` 파일 구성

`find src/app/studio -type f` 결과:
```
src/app/studio/[[...tool]]/page.tsx
```
→ `src/app/studio/layout.tsx` **없음**, `src/app/studio/[[...tool]]/layout.tsx` **없음**.
→ `page.tsx`에 `metadata` / `viewport` export **없음** (파일 전문 아래).

`src/app/studio/[[...tool]]/page.tsx` 전문:
```tsx
'use client'

import { NextStudio } from 'next-sanity/studio'
import config from '../../../../sanity.config'

export default function StudioPage() {
  return <NextStudio config={config} />
}
```

### 5-b. 루트 layout — `src/app/layout.tsx` 전문

```tsx
import type { Metadata } from 'next'
import './globals.css'
import { SiteChromeProvider } from '@/components/SiteChromeContext'
import { SiteHeader } from '@/components/SiteHeader'
import UmamiScript from '@/components/UmamiScript'
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, DEFAULT_OG_IMAGE } from '@/lib/seo'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s — ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: 'Chang-hyun Paik' }],
  openGraph: { type: 'website', siteName: SITE_NAME, locale: 'en_US', title: SITE_NAME, description: SITE_DESCRIPTION, url: '/', images: [DEFAULT_OG_IMAGE] },
  twitter: { card: 'summary_large_image', title: SITE_NAME, description: SITE_DESCRIPTION, images: [DEFAULT_OG_IMAGE.url] },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <SiteChromeProvider>
          <SiteHeader />
          {children}
        </SiteChromeProvider>
        <UmamiScript />
      </body>
    </html>
  )
}
```

→ `<SiteHeader />`는 조건 없이 렌더. route group(`(site)` 등) 분리 없음 (`ls src/app` 결과: `about apple-icon.png contact essays globals.css icon.png layout.tsx page.tsx robots.ts sitemap.ts studio work work-grid`).

### 5-c. 경로 가드 유무 — grep

명령: `grep -rn "studio\|pathname\|usePathname" src/components/SiteHeader.tsx src/components/SiteChromeContext.tsx src/components/UmamiScript.tsx src/app/globals.css`

```
src/components/SiteHeader.tsx:4:import { usePathname } from 'next/navigation'
src/components/SiteHeader.tsx:21:function isStaticLight(pathname: string): boolean {
src/components/SiteHeader.tsx:22:  return STATIC_LIGHT_PATHS.has(pathname)
src/components/SiteHeader.tsx:23:    || pathname.startsWith('/work/')
src/components/SiteHeader.tsx:24:    || pathname.startsWith('/work-grid/')
src/components/SiteHeader.tsx:25:    || pathname.startsWith('/essays/')   // 260929 P2 승인 — 에세이 상세 흰 배경
src/components/SiteHeader.tsx:29:  const pathname = usePathname()
src/components/SiteHeader.tsx:37:  const isLanding = pathname === '/'
src/components/SiteHeader.tsx:38:  const wordmarkOnLight = isLanding ? dynamicWordmarkOnLight : isStaticLight(pathname)
src/components/SiteHeader.tsx:39:  const navOnLight = isLanding ? dynamicNavOnLight : isStaticLight(pathname)
src/components/SiteHeader.tsx:48:  }, [pathname])
src/components/SiteHeader.tsx:93:          const current = pathname === href || (href === '/work' && pathname.startsWith('/work'))
src/components/SiteHeader.tsx:144:          const current = pathname === href || (href === '/work' && pathname.startsWith('/work'))
src/components/SiteChromeContext.tsx:4:import { usePathname } from 'next/navigation'
src/components/SiteChromeContext.tsx:31:  const pathname = usePathname()
src/components/SiteChromeContext.tsx:47:    if (played || pathname !== '/') {
src/components/UmamiScript.tsx:4:import { usePathname } from 'next/navigation'
src/components/UmamiScript.tsx:11:  const pathname = usePathname()
src/components/UmamiScript.tsx:12:  if (pathname?.startsWith('/studio')) return null
```

| 컴포넌트 | `/studio` 가드 | 근거 |
|---|---|---|
| `UmamiScript` | **있음** | `UmamiScript.tsx:12` `if (pathname?.startsWith('/studio')) return null` |
| `SiteHeader` | **없음** | 파일 내 `studio` 문자열 0건. early return 없음 — `return (` (50행)에서 워드마크·nav·햄버거·스크림·메뉴패널 무조건 반환 |
| `SiteChromeProvider` | **없음** | 파일 내 `studio` 문자열 0건. `/studio`는 `pathname !== '/'` 분기(47행)로 `introPhase 'done'`·`introSkipped true` |
| `globals.css` | **없음** | `studio` 문자열 0건 |

### 5-d. `/studio`에서 SiteHeader가 산출하는 상태 (코드 경로)

`SiteChromeContext.tsx:47-51`:
```ts
    if (played || pathname !== '/') {
      try { sessionStorage.setItem(INTRO_STORAGE_KEY, '1') } catch {}
      setIntroPhase('done')
      setIntroSkipped(true)
      return
    }
```

`SiteHeader.tsx:37-42`:
```ts
  const isLanding = pathname === '/'
  const wordmarkOnLight = isLanding ? dynamicWordmarkOnLight : isStaticLight(pathname)
  const navOnLight = isLanding ? dynamicNavOnLight : isStaticLight(pathname)

  const layoutVisible = introPhase === 'done'
  const wordmarkMoved = introPhase !== 'wordmark'
```

`SiteHeader.tsx:19` — `/studio`는 목록에 없음:
```ts
const STATIC_LIGHT_PATHS = new Set(['/about', '/work', '/work-grid', '/essays', '/contact'])
```

→ 코드상 `/studio`에서 워드마크 className: `wordmark-intro collapsed moved instant no-color-transition` (`on-light` 없음 → `color: #FFFFFF`), nav `opacity: 1`, nav 링크 `color: '#ffffff'`.

### 5-e. 겹침 관련 CSS·Studio 컨테이너 원문

`src/app/globals.css` — 워드마크 (48–53, 86–90행):
```css
.wordmark-intro {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 200;
```
```css
.wordmark-intro.moved {
  top: 20px;
  left: 24px;
  transform: translate(0, 0);   /* 기존 none → 계산상 동일, 함수형만 통일 (인자별 보간 강제) */
}
```

`src/app/globals.css` — nav (164–169행):
```css
.site-nav {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
```

`src/app/globals.css` — 모바일(`max-width: 1023px`) 전용 fixed 요소:
```css
  .mobile-header-bar {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 56px;
    background: #FFFFFF;
    z-index: 90; /* 워드마크·글리프 아래, 콘텐츠 위 */
  }
```
```css
  .mobile-menu-btn {
    display: flex;
    position: fixed;
    top: 0;
    left: 0;
    width: 56px;
    height: 56px;
    ...
    z-index: 100;
```

`NextStudio` 컨테이너 — `node_modules/next-sanity/dist/NextStudioNoScript.js` (next-sanity 13.1.1):
```js
const style = {
	height: "100vh",
	maxHeight: "100dvh",
	overscrollBehavior: "none",
	WebkitFontSmoothing: "antialiased",
	overflow: "auto"
};
/** @public */
const NextStudioLayout = ({ children }) => {
	return /* @__PURE__ */ jsx("div", {
		id: "sanity",
		"data-ui": "NextStudioLayout",
		style,
		children
	});
};
```
→ `NextStudioLayout` 루트 div에 `position`·`zIndex` 지정 없음.

| 확인 항목 | 결과 |
|---|---|
| `/studio`에서 SiteChromeProvider 렌더 | 예 (루트 layout, 가드 없음) |
| `/studio`에서 SiteHeader(ACP 워드마크·nav·모바일 바·햄버거) 렌더 | 예 (루트 layout, 가드 없음) |
| 워드마크 z-index vs Studio 컨테이너 | `200` (fixed) vs 지정 없음 |
| Studio 내부 Sanity UI 요소의 z-index·실제 화면 겹침 모습 | 미확인 (브라우저 미확인, `npm run dev` 금지) |
| `NextStudio`(index.js)가 `NextStudioLayout`을 실제로 감싸는지 | 미확인 — `dist/studio/index.js`가 `NextStudioLayout`을 import함은 확인(`import { n as NextStudioLayout, t as NextStudioNoScript } from "../NextStudioNoScript.js"`), 클라이언트 컴포넌트 내부 구성은 미열람 |

---

## 6. 설치된 sanity / @sanity/* 패키지 버전

### 6-a. `package.json` 선언 (grep 원문)

```
12:    "@sanity/image-url": "^2.1.1",
13:    "@sanity/vision": "^6.4.0",
14:    "next": "16.2.6",
15:    "next-sanity": "^13.1.1",
18:    "sanity": "^6.4.0",
```

### 6-b. `node_modules` 실제 설치 버전 (각 `package.json`의 `version`)

| 패키지 | 버전 |
|---|---|
| sanity | 6.4.0 |
| next-sanity | 13.1.1 |
| @sanity/asset-utils | 2.3.0 |
| @sanity/bifur-client | 1.0.0 |
| @sanity/blueprints | 0.20.2 |
| @sanity/blueprints-parser | 0.4.0 |
| @sanity/cli | 7.7.1 |
| @sanity/cli-build | 3.0.0 |
| @sanity/cli-core | 2.2.1 |
| @sanity/client | 7.23.0 |
| @sanity/codegen | 7.0.3 |
| @sanity/color | 3.0.6 |
| @sanity/comlink | 4.0.1 |
| @sanity/descriptors | 1.3.0 |
| @sanity/diff | 6.4.0 |
| @sanity/diff-match-patch | 3.2.0 |
| @sanity/diff-patch | 5.0.0 |
| @sanity/eventsource | 5.0.2 |
| @sanity/export | 6.2.0 |
| @sanity/generate-help-url | 4.0.0 |
| @sanity/icons | 5.0.0 |
| @sanity/id-utils | 1.0.0 |
| @sanity/image-url | 2.1.1 |
| @sanity/import | 6.0.3 |
| @sanity/insert-menu | 3.0.9 |
| @sanity/json-match | 1.0.5 |
| @sanity/lezer-groq | 1.0.4 |
| @sanity/logos | 2.2.2 |
| @sanity/media-library-types | 1.5.0 |
| @sanity/message-protocol | 0.23.0 |
| @sanity/migrate | 7.0.3 |
| @sanity/mutate | 0.18.1 |
| @sanity/mutator | 6.4.0 |
| @sanity/presentation-comlink | 2.1.0 |
| @sanity/preview-url-secret | 4.0.8 |
| @sanity/prism-groq | 1.1.2 |
| @sanity/runtime-cli | 17.1.0 |
| @sanity/schema | 6.4.0 |
| @sanity/sdk | 2.15.0 |
| @sanity/signed-urls | 2.0.4 |
| @sanity/telemetry | 1.1.0 |
| @sanity/template-validator | 3.1.0 |
| @sanity/types | 6.4.0 |
| @sanity/util | 6.4.0 |
| @sanity/uuid | 3.0.3 |
| @sanity/vision | 6.4.0 |
| @sanity/visual-editing-csm | 3.0.10 |
| @sanity/visual-editing-types | 1.1.8 |
| @sanity/webhook | 4.0.4 |
| @sanity/workbench-cli | 1.2.0 |
| @sanity/worker-channels | 2.0.0 |

참고: `@sanity/ui` — `node_modules/@sanity/ui` 최상위 설치 없음(위 목록에 미포함). 중첩(`node_modules/*/node_modules/@sanity/ui`) 설치 여부는 미확인.
