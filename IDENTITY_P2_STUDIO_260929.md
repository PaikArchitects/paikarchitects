# IDENTITY P2 — Studio: Contacts·Essays 구축 (260929)

근거: `AUDIT_REPORT_identity_seo_260929.md` §5, 부록 A7·A17·A18·A6
전제: P1(`IDENTITY_P1_META_SEO_260929.md`) 배포 완료 — `src/lib/seo.ts`의 `pageMetadata`가 존재해야 함.
목표: 연락처와 에세이를 Sanity Studio에서 편집하고, `/contact`·`/essays`가 그 내용을 표시한다.

---

## 0. 절대 제약

- `npm run dev` / `npm run build` 금지. 검증은 `npx tsc --noEmit`.
- 수정 금지: `ContentArea.tsx`, `MobileProjectWall.tsx`, `SiteHeader.tsx`, `LandingExperience.tsx`, `GridExperience.tsx`.
- URL 유지: `/contact`(단수 경로), nav 라벨 `CONTACTS` 유지.
- 연락처 데이터 원천은 **하나**로 한다(§2 설계). 두 곳에 같은 값을 저장하는 구조 금지.

## 1. 사전 확인 (불일치 시 중단·보고)

1. `src/lib/seo.ts`에 `pageMetadata` export 존재. 없으면 P1 미배포 → 중단.
2. `src/app/about/page.tsx` 전문을 읽고 보고:
   (a) 본문 컨테이너의 클래스명·좌우 여백·상단 오프셋 값(데스크톱/모바일),
   (b) `position`(localePortableText)을 렌더하는 컴포넌트/함수 이름과 위치,
   (c) `.about-contact` 스타일이 정의된 파일·줄.
3. `src/lib/bilingual.tsx`의 export 목록(ko/en 병기 렌더 유틸) 보고.
4. `scripts/` 내 기존 마이그레이션 스크립트 1개를 골라 클라이언트 생성·`--dry-run` 처리 패턴을 보고. §4 스크립트는 그 패턴을 따른다.

## 2. 설계

### 2-1. 연락처 — 신규 싱글턴 `contact`로 이관, `about.contact` 폐지

| 항목 | 값 |
|---|---|
| 문서 타입 | `contact` (title `CONTACT`) |
| 고정 ID | `'contact'` |
| 필드 | `email`(string), `phone`(string), `location`(string), `instagram`(url, `https://www.instagram.com/<handle>/` 형식) |
| 사용처 | `/contact` 페이지 본문, `/about` 하단 연락처 줄 — **둘 다 같은 조회 함수 `getContact()` 사용** |

### 2-2. 에세이 — 신규 문서 타입 `essay`

| 필드 | 타입 | 제약 |
|---|---|---|
| `title` | `localeString` | required |
| `slug` | `slug` (source: `title.en`) | required |
| `publishedAt` | `date` | required |
| `excerpt` | `localeText` | optional |
| `body` | `localePortableText` | optional |
| `published` | `boolean` | `initialValue: true` — 조회 필터는 반드시 `published != false` |

preview: `title.en` / `publishedAt`.

### 2-3. Studio 구조 (`sanity.config.ts`)

1. `title: 'Paik Architecture'` → `'Architect Chang-hyun Paik'`.
2. 루트 목록 순서: `ABOUT`(기존) → **`CONTACT`**(신규, `S.document().schemaType('contact').documentId('contact')`) → divider → **`ESSAYS`**(신규, `S.documentTypeList('essay')`, `publishedAt desc`) → divider → 기존 PROJECTS 2개.
3. 싱글턴 보호(A18 해소): `document.newDocumentOptions`에서 `about`·`contact` 템플릿 제외, `document.actions`에서 두 타입의 `duplicate`·`delete` 제외.

## 3. 구현

### 3-1. 스키마

- 신설 `sanity/schemaTypes/contact.ts`, `sanity/schemaTypes/essay.ts`.
- `sanity/schemaTypes/index.ts`에 두 타입 등록.
- `sanity/schemaTypes/about.ts:58-67` **`contact` 필드 삭제** — §5의 마이그레이션 실행이 끝난 뒤 이 커밋이 배포되어야 한다(순서는 §6).

### 3-2. 조회·타입

`src/lib/sanity/queries.ts`
- 추가: `CONTACT_QUERY = *[_type == "contact" && _id == "contact"][0]{ email, phone, location, instagram }`, `getContact()`.
- 추가: `ESSAYS_QUERY`(목록: title, slug, publishedAt, excerpt / 필터 `published != false` / `order(publishedAt desc)`), `ESSAY_QUERY`(단건, body 포함), `getEssays()`, `getEssay(slug)`, `getEssaySlugs()`.
- **삭제: `ABOUT_QUERY`의 `contact` 줄(`queries.ts:153`).**

`src/types/index.ts`
- `AboutContact` → `Contact`로 개명하고 `instagram?: string` 추가.
- **`About` 인터페이스에서 `contact?: AboutContact` 줄 삭제.**
- `Essay`, `EssaySummary` 타입 추가.

`about.contact` 참조 지점 전수(삭제 누락 방지 — 이 5곳이 전부 사라져야 함):
| # | 위치 | 조치 |
|---|---|---|
| 1 | `sanity/schemaTypes/about.ts:58-67` | 필드 삭제 |
| 2 | `src/lib/sanity/queries.ts:153` `contact` | 투영 삭제 |
| 3 | `src/types/index.ts:174-178,187` | 개명·필드 삭제 |
| 4 | `src/app/about/page.tsx:28` 구조분해의 `contact` | 제거 |
| 5 | `src/app/about/page.tsx:147-162` 렌더 블록 | §3-3 공용 컴포넌트로 교체 |

타입 변경을 먼저 하고 `npx tsc --noEmit`을 돌리면 남은 참조가 오류로 드러난다 — 이것으로 전수 확인한다. 문자열 `about.contact`·`AboutContact`는 grep 0건 확인.

### 3-3. 공용 연락처 렌더 — `src/components/ContactLine.tsx` (신설)

- props: `contact: Contact`, `variant: 'inline' | 'list'`.
- `inline`(About 하단용): 존재하는 값만 배열로 모아 ` · `로 join — **선행 구분자 버그(A17) 구조적 해소**. 순서 location · email · phone · instagram. email은 `mailto:`, phone은 `tel:`(공백·하이픈 제거), instagram은 새 탭(`target="_blank" rel="noopener noreferrer"`), 표시 텍스트는 `@handle`.
- `list`(Contacts 페이지용): 라벨-값 행. 라벨 `EMAIL` / `PHONE` / `LOCATION` / `INSTAGRAM`. 값 없는 행은 렌더하지 않음.
- 폰트는 프로젝트 `FONT` 상수 사용(`'sans-serif'` 금지 — A9).

`about/page.tsx`: `getContact()`를 `getAbout()`과 병렬 호출(`Promise.all`), `:147-162` 블록을 `{contact && <ContactLine contact={contact} variant="inline" />}`로 교체. 기존 `.about-contact` 래퍼 div 구조·클래스는 유지해 스타일 변화가 없게 한다.

### 3-4. `/contact` 페이지 (`src/app/contact/page.tsx` 전면 교체)

- `export const revalidate = 60` (about과 동일 정책).
- metadata: `pageMetadata({ title: 'Contacts', path: '/contact' })` — **noindex 해제**.
- 레이아웃: §1-2(a)에서 보고된 About 본문 컨테이너와 같은 여백·오프셋. 페이지 제목 `Contacts` + `ContactLine variant="list"`.
- contact 문서가 없으면: 제목 아래 `Contacts — Coming soon`.

### 3-5. `/essays` 및 `/essays/[slug]`

`src/app/essays/page.tsx` (전면 교체)
- `revalidate = 60`.
- 에세이 0건: 본문 `Essays — Coming soon` (**s 소문자**), metadata `noindex: true`.
- 1건 이상: 목록(날짜 · 영문 제목 / 국문 제목 병기는 `bilingual.tsx` 유틸 사용, excerpt). 항목은 `/essays/{slug}` 링크. metadata noindex 해제. `generateMetadata`로 건수에 따라 분기.
- 스타일: `FONT` 상수, About 컨테이너 여백 재사용.

`src/app/essays/[slug]/page.tsx` (신설)
- `generateStaticParams` = `getEssaySlugs()`, `revalidate = 60`, 없는 slug → `notFound()`.
- 제목·날짜·본문. 본문은 §1-2(b)의 About portable text 렌더러를 **재사용**(새 렌더러 작성 금지 — 재사용 불가 구조면 중단·보고).
- `generateMetadata`: `pageMetadata({ title: essay.title.en, path: '/essays/'+slug, description: excerpt.en })`.

### 3-6. sitemap (`src/app/sitemap.ts`)

- `/contact` 추가.
- 에세이가 1건 이상이면 `/essays`와 각 `/essays/{slug}` 추가.

## 4. 마이그레이션 스크립트 — `scripts/migrate-contact-260929.ts`

1. `about` 문서(`_id == "about"`)의 `contact` 값을 읽는다.
2. `createIfNotExists({ _id: 'contact', _type: 'contact', email, phone, location, instagram: 'https://www.instagram.com/archipaik/' })`.
3. `--dry-run`이면 읽은 값과 생성할 문서를 출력만.
4. `--unset` 플래그를 줄 때만 `about` 문서에서 `contact` 필드 `unset`. (기본 실행은 복사만 — 되돌릴 수 있게 분리)

## 5. 검증

1. `npx tsc --noEmit` 오류 0.
2. grep `AboutContact`, `about.contact`, `Coming Soon`(대문자 S) → 각 0건.
3. grep `'sans-serif'` in `src/app/contact`, `src/app/essays` → 0건.
4. grep `newDocumentOptions` → `sanity.config.ts` 1건.

## 6. 실행·배포 순서 (사용자)

1. `npx tsx --env-file=.env.local scripts/migrate-contact-260929.ts --dry-run` → 출력 확인
2. 같은 명령에서 `--dry-run` 제거하고 실행 → Studio에서 CONTACT 문서 확인
3. 코드 커밋·푸시 → Vercel 배포 → `/about` 하단, `/contact` 표시 확인
4. 이상 없으면 `--unset`으로 about의 구 필드 정리

## 7. 보고 (커밋 전)

§1 사전 확인 결과, 파일별 변경 요약, §5 검증 원문, 커밋 메시지 제안 `identity P2: contact singleton, essays`.
