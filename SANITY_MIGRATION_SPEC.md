# SANITY_MIGRATION_SPEC — 기존 30건 데이터·이미지 이관 스크립트

> **단계 위치:** Sanity 이관 4단계 중 2단계.
> `src/data/projects.ts`(30건) + `src/data/projectSlides.ts`의 데이터와 Cloudinary 이미지 전량을 Sanity로 옮겨 담는 **1회성 스크립트**를 작성·실행한다.
> 이 단계에서도 사이트가 데이터를 읽는 경로는 일절 변경하지 않는다 — 실행 후에도 사이트는 여전히 `projects.ts`를 읽으며 화면 변화가 없어야 한다. 데이터가 두 곳(코드·Sanity)에 병존하는 과도기이며, 정본 전환은 3단계에서 수행한다.

---

## 0. 실행 전제 (사용자가 브라우저에서 먼저 수행)

**쓰기 토큰 발급** — 스크립트가 Sanity에 데이터를 써넣기 위한 열쇠:

1. https://www.sanity.io/manage → `paikarchitects` 프로젝트 → **API** 탭 → 좌측 **Tokens** → **Add API token**.
2. Name: `migration` / Permissions: **Editor** 선택 → Save.
3. 생성 직후 한 번만 표시되는 토큰 문자열을 복사.
4. 메모장으로 레포 루트의 `.env.local`을 열어 **세 번째 줄을 추가**하고 저장:
   ```
   SANITY_API_WRITE_TOKEN=복사한토큰문자열
   ```
   - 이 값은 비밀 열쇠다. Vercel에는 등록하지 않는다(사이트 운영에 불필요 — 이관 스크립트가 로컬에서만 사용). 어디에도 붙여넣어 공유하지 않는다.
   - 앞의 두 줄(`NEXT_PUBLIC_...`)은 그대로 둔다.

---

## 1. 의존성 설치

```
npm install -D tsx
```

- `tsx`: TypeScript 스크립트를 즉석 실행하는 도구 (개발 전용 의존성).
- `@sanity/client`는 1단계 설치분의 동반 패키지로 이미 존재 — `package.json`에 명시가 없으면 `npm install @sanity/client@^7.23.0`으로 명시 추가.

---

## 2. 파일 매니페스트

**신설:** `scripts/migrate-to-sanity.ts`
**수정:** `package.json` / `package-lock.json` (devDependencies에 한함)
**금지 변경:** `src/**` 전체, `sanity/**` 전체, `sanity.config.ts`, `globals.css` — 이 스펙은 scripts 폴더 밖의 기존 코드를 한 줄도 수정하지 않는다.

---

## 3. 스크립트 설계 — `scripts/migrate-to-sanity.ts`

### 3-1. 클라이언트 초기화

```ts
import { createClient } from '@sanity/client'
import { projects } from '../src/data/projects'
import { projectSlides } from '../src/data/projectSlides'

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  token: process.env.SANITY_API_WRITE_TOKEN,
  apiVersion: '2026-07-10',
  useCdn: false,
})
```

- `.env.local` 판독: `tsx` 실행 시 자동 로드되지 않으므로 스크립트 최상단에서 직접 파싱한다(외부 패키지 추가 없이 — `fs.readFileSync('.env.local')` 후 `KEY=VALUE` 행 파싱하여 `process.env`에 주입). projectId 또는 token 부재 시 안내 메시지와 함께 즉시 종료.

### 3-2. 이미지 자산 업로드 (중복 방지 캐시)

- 모듈 레벨 `Map<string, string>` (Cloudinary URL → Sanity asset `_id`).
- 업로드 함수: URL을 `fetch`로 내려받아(Node 전역 fetch) `client.assets.upload('image', Buffer, { filename })`로 업로드, 반환된 `_id`를 캐시에 저장. 동일 URL 재등장 시(커버=첫 슬라이드인 경우 다수) 캐시 재사용.
- filename은 URL 마지막 세그먼트를 디코딩해 사용.
- 개별 이미지 실패 시: 1회 재시도 → 재실패 시 해당 이미지만 건너뛰고 경고 로그(프로젝트 전체를 중단하지 않음).

### 3-3. 문서 변환 규칙

각 `Project` → Sanity `project` document. **`createOrReplace`** + 결정적 `_id`로 멱등성 확보(재실행 시 중복 생성 없이 덮어씀):

| Sanity 필드 | 원천 | 비고 |
|---|---|---|
| `_id` | `` `project-${p.id}` `` | 결정적 — 재실행 안전 |
| `_type` | `'project'` | |
| `title` / `titleKr` | 동명 필드 | |
| `slug` | `{ _type: 'slug', current: p.id }` | **title에서 재생성하지 않는다** — 기존 URL 보존(SEO) |
| `careerNo` / `year` | 동명 필드 | |
| `mainType` | `p.type` | 필드명 변경 주의 |
| `subTypes` | `p.subTypes` | 없으면 필드 생략 |
| `status` / `result` / `featured` / `displayOrder` / `location` | 동명 필드 | location 없으면 생략 |
| `coverColor` | 동명 필드 | |
| `coverImage` | `p.coverImage` 업로드 → `{ _type: 'image', asset: { _type: 'reference', _ref: assetId } }` | coverImage 없는 8건(신규분)은 필드 생략 |
| `client` / `size` | — | 이번 이관에서는 생략(원천 데이터 없음 — 추후 Studio에서 수기 입력) |
| `slides` | `projectSlides[p.id]` 변환 (3-4) | 미등록 프로젝트는 필드 생략 |

### 3-4. 슬라이드 변환

배열의 모든 항목·하위 항목에 **결정적 `_key`**를 부여한다(Sanity 배열 필수 요건이자 멱등성 조건): `` `${p.id}-s${슬라이드인덱스}` ``, 다이어그램 항목은 `` `-i${항목인덱스}` `` 접미.

- `{ kind: 'image', src, caption?, diagram? }` → `{ _type: 'imageSlide', _key, image: 업로드참조, caption?, diagram? }`
- `{ kind: 'diagramSet', items, autoAdvanceMs? }` → `{ _type: 'diagramSetSlide', _key, autoAdvanceMs, items: [{ _type: 'diagramItem', _key, image: 업로드참조, label, description }] }`
- `{ kind: 'credits', rows }` → `{ _type: 'creditsSlide', _key, rows: [{ _type: 'creditRow', _key, label, value }] }`

> 스키마의 실제 object `name`(diagramItem·creditRow 등)은 구현 전 `sanity/schemaTypes/slides.ts`를 열어 대조·일치시킬 것.

### 3-5. 실행 흐름·로그

- 프로젝트 30건을 **순차** 처리(병렬 금지 — 요청 폭주 방지). 건별 로그: `[3/30] cheongju-culture-factory — 이미지 5건 업로드, 문서 저장 완료`.
- 종료 시 요약: 성공 N건 / 이미지 업로드 M건 / 건너뛴 이미지 목록 / 실패 프로젝트 목록.
- 실패가 1건이라도 있으면 종료 코드 1.

---

## 4. 실행·검증

1. `npx tsc --noEmit` 통과 확인.
2. 스크립트 실행: `npx tsx scripts/migrate-to-sanity.ts` (Claude Code 세션에서 실행 — 이미지 다운로드·업로드로 수 분 소요 가능).
3. 실패 프로젝트가 있으면 로그 확인 후 **동일 명령 재실행**(멱등 설계이므로 안전).

**사용자 검증(브라우저):** `/studio` 접속 → "프로젝트" 목록에 30건 표시 → 임의 항목(예: Cheongju Culture Factory) 열어 커버 이미지·슬라이드·전 필드가 채워져 있는지 확인 → 사이트 홈은 변화 없음 확인.

---

## 5. Claude Code 실행 프롬프트

```
SANITY_MIGRATION_SPEC.md 파일을 읽고 명세대로 구현해줘.
구현 전에 sanity/schemaTypes/slides.ts를 읽어 object 이름을 스크립트와 일치시켜.
src/ 와 sanity/ 아래 기존 파일은 절대 수정하지 마 — 신설은 scripts/migrate-to-sanity.ts 하나다.
구현 후 npx tsc --noEmit으로 검증하고, 통과하면 npx tsx scripts/migrate-to-sanity.ts를 실행해서
30건 이관 로그와 최종 요약을 보여줘. npm run dev / npm run build는 실행 금지.
```
