# SANITY_STUDIO_SPEC — Sanity Studio 내장 + 콘텐츠 스키마 정의

> **단계 위치:** Sanity 이관 4단계 중 1단계.
> 이 스펙은 **Studio(관리 화면)와 스키마(입력 폼 설계도)를 신설**하는 것까지만 수행한다.
> 사이트가 데이터를 읽는 경로는 일절 변경하지 않는다 — `src/data/projects.ts` / `src/data/projectSlides.ts`가 계속 정본이며, 사이트 화면은 이 스펙 전후로 완전히 동일하게 동작해야 한다.
> 후속: 2단계(기존 데이터·이미지 이관 스크립트) → 3단계(프론트 데이터 계층 전환 + 비율 선로드 삭제) → 4단계(상세 콘텐츠 확장).

---

## 0. 실행 전제 (사용자가 브라우저에서 먼저 수행 — Claude Code 작업 아님)

1. https://www.sanity.io 에서 계정 생성(구글 계정 연동 가능) 후 https://www.sanity.io/manage 접속.
2. **Create project** — 프로젝트명 `paikarchitects`. 생성 후 표시되는 **Project ID**(짧은 영숫자 문자열)를 메모.
3. Dataset은 `production` 이름으로 생성(생성 마법사 기본값).
4. Manage → 해당 프로젝트 → **API 탭 → CORS origins**에 아래 2건 추가(Allow credentials 체크):
   - `http://localhost:3000`
   - `https://paikarchitects.vercel.app`
> **5·6번의 배경 — 환경변수란:** 코드 파일에 직접 적지 않고, 사이트가 실행되는 각 컴퓨터에 따로 보관해 두는 설정값이다. 이번에 보관할 값은 "Sanity 프로젝트 ID"와 "데이터셋 이름" 두 개뿐이며, 코드는 실행 시 이 보관함에서 값을 꺼내 읽는다. 사이트가 실행되는 컴퓨터가 두 대(사용자 로컬 PC / Vercel 서버)이므로 같은 값을 두 군데에 한 번씩 넣는다. 로컬의 보관함인 `.env.local` 파일은 관례상 GitHub에 커밋되지 않는 파일이라 push해도 Vercel에 전달되지 않기 때문에, Vercel 쪽은 대시보드에서 별도 입력이 필요하다. 두 절차 모두 최초 1회로 끝난다.

5. **Vercel 서버 쪽 등록:** https://vercel.com 로그인 → `paikarchitects` 프로젝트 클릭 → 상단 **Settings** 탭 → 좌측 **Environment Variables** 메뉴. 입력 칸은 "이름표(Key)"와 "내용물(Value)"의 쌍이다 — Key는 코드가 값을 찾을 때 부르는 이름이므로 한 글자도 바꾸지 말고 그대로 복사하고, Value에 실제 값을 넣는다. 아래 2건을 등록하고 저장(환경 선택 항목이 나오면 Production/Preview/Development 전부 체크):
   - Key: `NEXT_PUBLIC_SANITY_PROJECT_ID` / Value: 2번에서 메모한 Project ID (계정마다 다른 고유값)
   - Key: `NEXT_PUBLIC_SANITY_DATASET` / Value: `production` — 대입할 자리가 아니라 **글자 그대로 production 열 글자를 입력**한다. 3번에서 데이터셋을 만들 때 붙인 이름 그 자체이며, "어떤 데이터셋에 접속할까"라는 코드의 질문에 이름으로 답해주는 값이다.
6. **로컬 PC 쪽 등록:** 메모장을 열어 아래 두 줄을 적고(첫 줄의 값만 메모한 Project ID로 교체, 둘째 줄은 그대로), 레포 루트(`D:\00 Web\paikarchitects`)에 파일명 `.env.local`로 저장:
   ```
   NEXT_PUBLIC_SANITY_PROJECT_ID=메모한ProjectID
   NEXT_PUBLIC_SANITY_DATASET=production
   ```
   - 메모장 저장 시 파일 형식을 "모든 파일"로 두고 저장해야 `.env.local.txt`가 되지 않는다.
   - 이 파일은 커밋 대상이 아니므로 GitHub Desktop의 변경 목록에 나타나지 않는 것이 정상이다.
   - Claude Code 실행 후에는 레포에 견본 파일 `.env.local.example`이 생기므로, 그것을 복제해 이름을 `.env.local`로 바꾸고 값만 채우는 방법도 동일하게 유효하다.

---

## 1. 의존성 설치

```
npm install sanity@^6.4.0 next-sanity@^13.1.1 @sanity/vision@^6.4.0 @sanity/image-url@^2.1.1 styled-components@^6.1.15
```

- `styled-components`는 sanity 6의 peer dependency — 누락 시 Studio가 구동되지 않는다.
- 설치 후 `package.json` diff에 위 5개 외 다른 의존성 변화가 없어야 한다.

---

## 2. 파일 매니페스트 (이 스펙이 접촉하는 파일 전부)

**신설:**

| 경로 | 역할 |
|---|---|
| `sanity/env.ts` | 환경변수 판독 + 누락 시 명시적 에러 |
| `sanity/schemaTypes/index.ts` | 스키마 목록 집결 |
| `sanity/schemaTypes/project.ts` | project document 스키마 |
| `sanity/schemaTypes/slides.ts` | 슬라이드 4종 object 스키마 |
| `sanity.config.ts` (레포 루트) | Studio 구성 |
| `src/app/studio/[[...tool]]/page.tsx` | Studio 내장 라우트 |
| `.env.local.example` | 환경변수 견본 |

**수정:** `package.json` / `package-lock.json` (의존성 추가에 한함)

**금지 변경 (절대 접촉 금지):**
`src/components/**`, `src/hooks/**`, `src/lib/**`, `src/data/**`, `src/types/index.ts`, `src/app/globals.css`, `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/work/**`

---

## 3. `sanity/env.ts`

```ts
export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production'

if (!projectId) {
  throw new Error('NEXT_PUBLIC_SANITY_PROJECT_ID가 설정되지 않았습니다 (.env.local 확인)')
}

export const apiVersion = '2026-07-10'
```

---

## 4. 스키마 설계

### 4-1. 공통 원칙

- 필드 `title`(라벨)은 **전부 한국어**로 작성한다. Studio 골격 UI는 영어 유지(언어 팩 미설치).
- 타이폴로지 선택지는 하드코딩하지 않고 `src/types/index.ts`의 `TYPOLOGY_ORDER`를 import하여 파생한다(정본 단일화):
  ```ts
  import { TYPOLOGY_ORDER } from '../../src/types'
  const TYPE_OPTIONS = TYPOLOGY_ORDER.map(t => ({ title: t, value: t }))
  ```
- 모든 필드는 `defineType` / `defineField` / `defineArrayMember` 헬퍼로 정의한다.

### 4-2. `project` document (`sanity/schemaTypes/project.ts`)

현행 `Project` 타입(src/types/index.ts)의 필드를 1:1로 승계하고, 이번 확정에 따라 `client` / `size` 2개 필드를 신설한다.

| name | type | 라벨(한국어) | 규칙 |
|---|---|---|---|
| `title` | string | 프로젝트명 (EN) | required |
| `titleKr` | string | 프로젝트명 (KR) | required |
| `slug` | slug | URL 슬러그 | required. `options.source: 'title'`, maxLength 96. **설명문에 "기존 게재 프로젝트의 슬러그는 SEO상 변경 금지" 명기** (`description` 속성) |
| `careerNo` | number | 프로젝트 연번 | required, integer, positive. 설명: "Career 엑셀 '프로젝트 연번' 기준" |
| `year` | number | 설계 시작 연도 | required, integer, min 2000 max 2100 |
| `mainType` | string | 용도 (Main) | required. `options.list: TYPE_OPTIONS`, `options.layout: 'dropdown'`. 설명: "카드·메타에 노출되는 유일한 라벨" |
| `subTypes` | array of string | 용도 (Sub) | optional. `of: [{type:'string'}]`, `options.list: TYPE_OPTIONS`. validation: `Rule.max(2).unique()` + custom rule로 mainType과의 중복 금지. 설명: "필터 매칭 전용 — 화면에 표기되지 않음. 최대 2개" |
| `status` | string | 상태 | required. options.list: `Completed / In Progress / Competition / Published / Under Construction` (value=title 동일) |
| `result` | string | 결과 | required. 설명: "예: Winner, 2nd Prize, Honorable Mention" |
| `featured` | boolean | Featured (2배 폭 카드) | initialValue: false |
| `displayOrder` | number | 배치 순서 | required, integer, positive |
| `coverImage` | image | 커버 이미지 | optional. `options.hotspot: true` |
| `coverColor` | string | 커버 대체 색상 | required. custom validation: `/^#[0-9A-Fa-f]{6}$/` 불일치 시 "＃ 포함 6자리 HEX 색상으로 입력 (예: #1E1C18)" |
| `location` | string | 위치 | optional. 설명: "예: Seoul, KR" |
| `client` | string | 발주처 (CLIENT) | optional — **신설** |
| `size` | string | 규모 (SIZE) | optional — **신설**. 설명: "연면적 등 자유 서식. 예: 137,000㎡" |
| `slides` | array | 슬라이드 | optional. of: `imageSlide`, `diagramSetSlide`, `creditsSlide`, `quoteSlide` (아래 4-3) |

**preview:** `select: { title, subtitle: titleKr, media: coverImage }`.
**orderings:** ① 배치 순서(`displayOrder` asc, 기본) ② 연번(`careerNo` asc) ③ 연도(`year` desc).

### 4-3. 슬라이드 object 4종 (`sanity/schemaTypes/slides.ts`)

현행 `ProjectSlide` 유니언(image / diagramSet / credits)을 1:1 승계 + `quoteSlide` 신설.

**`imageSlide`** — 라벨 "이미지 슬라이드"
- `image` (image, hotspot, required) — 라벨 "이미지"
- `caption` (string, optional) — 라벨 "캡션". 설명: `"형식: LABEL — description (예: SECTION — Public spine through the building)"`
- `diagram` (boolean, initialValue false) — 라벨 "다이어그램 취급". 설명: "체크 시 트랙에서 48% 높이로 표시"
- preview: media=image, title=caption ?? '(캡션 없음)'

**`diagramSetSlide`** — 라벨 "다이어그램 묶음 (자동 넘김)"
- `items` (array, required, `Rule.min(2)`) — 라벨 "다이어그램 항목". 각 항목 object:
  - `image` (image, required) — 라벨 "이미지"
  - `label` (string, required) — 라벨 "라벨". 설명: "대문자, 예: MASS 01"
  - `description` (string, required) — 라벨 "한 줄 설명"
  - 항목 preview: media=image, title=label, subtitle=description
- `autoAdvanceMs` (number, initialValue 3000) — 라벨 "자동 넘김 간격 (ms)"
- preview: title='다이어그램 묶음', subtitle=항목 수 (`items.length + '컷'` 형태는 select 제약상 items의 0번 label 표시로 갈음 가능 — 구현 단순한 쪽 선택)

**`creditsSlide`** — 라벨 "크레딧"
- `rows` (array, required) — 각 항목 object: `label` (string, required) / `value` (string, required)
- preview: title='크레딧'

**`quoteSlide`** — 라벨 "인용구" — **신설**
- `text` (text, rows 3, required) — 라벨 "인용문"
- `attribution` (string, optional) — 라벨 "출처". 설명: "예: 심사평, 매체명, 발화자"
- preview: title=text 앞 40자, subtitle=attribution

> quoteSlide는 이번 단계에서 **스키마에만 존재**한다. 프론트 렌더러(트랙의 인용구 슬라이드 표현)는 4단계(상세 콘텐츠 확장) 스펙에서 구현하며, 이 스펙에서는 어떤 프론트 코드도 만들지 않는다.

### 4-4. `sanity/schemaTypes/index.ts`

```ts
import project from './project'
import { imageSlide, diagramSetSlide, creditsSlide, quoteSlide } from './slides'

export const schemaTypes = [project, imageSlide, diagramSetSlide, creditsSlide, quoteSlide]
```

---

## 5. `sanity.config.ts` (레포 루트)

```ts
'use client'

import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { projectId, dataset } from './sanity/env'
import { schemaTypes } from './sanity/schemaTypes'

export default defineConfig({
  name: 'paikarchitects',
  title: 'Paik Architecture',
  projectId: projectId!,
  dataset,
  basePath: '/studio',
  plugins: [structureTool(), visionTool()],
  schema: { types: schemaTypes },
})
```

- `visionTool`은 Studio 안에서 데이터 조회 쿼리를 시험하는 개발 보조 탭 — 유지한다.

---

## 6. Studio 내장 라우트 — `src/app/studio/[[...tool]]/page.tsx`

`next-sanity` 공식 패턴을 따른다:

```tsx
'use client'

import { NextStudio } from 'next-sanity/studio'
import config from '../../../../sanity.config'

export default function StudioPage() {
  return <NextStudio config={config} />
}
```

- 라우트 폴더명은 정확히 `[[...tool]]` (optional catch-all).
- 접근 제어는 Sanity 로그인 계층이 담당한다 — `/studio` URL 자체는 공개되지만, 프로젝트 멤버 계정으로 로그인하지 않으면 어떤 콘텐츠에도 접근할 수 없다.
- `next-sanity/studio`가 별도의 `metadata`/`viewport` export를 제공하는 버전일 경우 공식 README 패턴에 맞춰 포함해도 된다(선택). 단 `'use client'` 파일에서는 metadata export가 불가하므로, 포함하려면 서버 컴포넌트 분리 패턴을 따를 것 — 불확실하면 위 최소형 그대로 간다.

---

## 7. `.env.local.example`

```
NEXT_PUBLIC_SANITY_PROJECT_ID=여기에ProjectID입력
NEXT_PUBLIC_SANITY_DATASET=production
```

---

## 8. 검증

1. `npx tsc --noEmit` 통과 (유일한 허용 검증 수단 — `npm run dev` / `npm run build` 금지).
2. `git status`로 §2 매니페스트 외 파일 변경이 없음을 확인.

배포 후 사용자 검증 절차(참고): `https://paikarchitects.vercel.app/studio` 접속 → Sanity 계정 로그인 → 좌측에 "프로젝트" 문서 유형이 보이고, 신규 문서 생성 화면에서 §4-2의 한국어 라벨 필드들이 순서대로 나타나면 정상.

---

## 9. Claude Code 실행 프롬프트

```
SANITY_STUDIO_SPEC.md 파일을 읽고 명세대로 구현해줘.
이 스펙은 Sanity Studio와 스키마 신설만 수행한다.
src/components, src/hooks, src/lib, src/data, src/types/index.ts, globals.css, 기존 라우트는 절대 수정하지 마.
구현 완료 후 npx tsc --noEmit으로 검증해줘. npm run dev / npm run build는 실행 금지.
```
