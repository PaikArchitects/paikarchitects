# LANDINGMODE P1 — 첫 화면 선택(Ring / Grid / Random) (260929)

근거: `AUDIT_REPORT_landingmode_260929.md`
목표: Studio에서 `/` 첫 화면을 **Ring / Grid / Random** 중 선택. 재배포 없이 60초 내 반영.
확정 사항(사용자, 2026-09-29): Random 선택지 포함. Grid가 첫 화면일 때도 ACP 인트로 재생.

---

## 0. 절대 제약

- `npm run dev` / `npm run build` 금지. 검증은 `npx tsc --noEmit`.
- **수정 금지**: `LandingExperience.tsx`, `GridExperience.tsx`, `SiteHeader.tsx`, `SiteChromeContext.tsx`, `ViewToggle.tsx`, `ContentArea.tsx`, `MobileProjectWall.tsx`, `globals.css`.
- `/work`, `/work-grid` 및 하위 경로의 동작·URL·canonical 변경 금지.
- 측정 기반 레이아웃 금지(DOM 측정 없음).

## 1. 사전 확인 (불일치 시 중단·보고)

1. `git status` — 추적 파일 변경이 없어야 한다(P3·P3.1 커밋 완료 상태). 미커밋 변경이 있으면 중단.
2. `SiteChromeContext.tsx`에서 컴포넌트가 `introPhase`, `introSkipped`, 헤더 색 세터(`setWordmarkOnLight` 및 nav 색 세터)를 읽는 **공개 훅/컨텍스트 이름**을 보고. §3-4는 이 이름을 사용한다.
3. `LandingExperience.tsx:221-222`의 헤더 색 설정 호출 원문과, `layoutVisible` 게이트에 쓰인 opacity 트랜지션 값(`:244` 부근) 원문을 보고. §3-4의 그리드 게이트는 같은 값을 쓴다.
4. `src/app/about/page.tsx`에 `force-static`과 `revalidate = 60`이 함께 있는지 보고(같은 조합을 `/`에 적용하기 위함).

## 2. Sanity — `siteSettings` 싱글턴

`sanity/schemaTypes/siteSettings.ts` (신설)

| 필드 | 타입 | 값 |
|---|---|---|
| `landingMode` | string, `options.list` + `layout: 'radio'` | `ring`(Ring) / `grid`(Grid) / `random`(Random — 방문마다 무작위) |
| | `initialValue` | `'ring'` |
| | description | `첫 화면(/) 표시 모드. 저장 후 1분 내 반영` |

- title `SITE SETTINGS`, preview title 고정 `SITE SETTINGS`.
- `schemaTypes/index.ts`에 등록.
- `sanity.config.ts`:
  - 루트 목록 **맨 위**에 `SITE SETTINGS` 항목(`S.document().schemaType('siteSettings').documentId('siteSettings')`) + divider.
  - 싱글턴 집합(`SINGLETON_TYPES`)에 `siteSettings` 추가 → 새 문서 메뉴 제외·복제/삭제 차단이 자동 적용되는지 확인.

## 3. 사이트

### 3-1. 조회 (`src/lib/sanity/queries.ts`)

```ts
export type LandingMode = 'ring' | 'grid' | 'random'
const SITE_SETTINGS_QUERY = `*[_type == "siteSettings" && _id == "siteSettings"][0]{ landingMode }`
export async function getLandingMode(): Promise<LandingMode>
```
- 문서가 없거나 값이 세 값 중 하나가 아니면 `'ring'`(현행 유지).

### 3-2. `src/app/page.tsx`

- `force-static` 유지 + `export const revalidate = 60` 추가.
- `getProjects()`와 `getLandingMode()`를 `Promise.all`로 병렬 조회.
- `return <LandingSwitch projects={projects} mode={mode} />`
- `pageMetadata({ path: '/' })` 유지.

### 3-3. `src/components/LandingSwitch.tsx` (신설, `'use client'`)

| mode | 렌더 |
|---|---|
| `ring` | `<LandingExperience projects={projects} />` — 현행과 동일 |
| `grid` | `<LandingGrid projects={projects} />` (§3-4) |
| `random` | 마운트 후 ring/grid 중 하나를 결정해 위 둘 중 하나를 렌더 |

Random 결정 규칙:
- sessionStorage 키 `landing-random-mode`에 값이 있으면 그것을 쓴다(같은 세션에서는 `/`로 돌아와도 같은 모드).
- 없으면 `Math.random() < 0.5 ? 'ring' : 'grid'`로 정하고 저장.
- 결정은 `useLayoutEffect`에서 한다. 결정 전 첫 렌더는 `null`(서버 HTML도 `null`) — hydration 불일치 없음.
- sessionStorage 접근은 전부 `try/catch`. 실패 시 저장 없이 매번 무작위.

### 3-4. `LandingGrid` (같은 파일 내부 컴포넌트) — 그리드 첫 화면 + ACP 인트로

GridExperience를 수정하지 않고 바깥에서 두 가지만 보완한다.

1. **헤더 색**: `/`에서 헤더 색은 컨텍스트 값을 따르는데(`SiteHeader.tsx:38-39`), 컨텍스트를 설정하는 곳은 LandingExperience뿐이다. 따라서 LandingGrid가 `useLayoutEffect`에서 §1-3의 LandingExperience 호출과 **동일한 값**으로 워드마크·내비 색을 설정한다(흰 배경용). 첫 페인트 전에 설정해야 흰 배경 위 흰 글씨 프레임이 생기지 않는다.
2. **인트로 동안 숨김**: `<div style={{ opacity: introPhase === 'done' ? 1 : 0, transition: <§1-3에서 보고된 값> }}>` 로 `<GridExperience projects={projects} />`를 감싼다. 인트로가 스킵된 경우(`introSkipped` 또는 phase가 이미 `done`)에는 처음부터 opacity 1, 트랜지션 없이.
   - 래퍼에 `transform`·`filter`·`will-change`를 넣지 않는다(내부 fixed 요소의 기준 박스가 바뀌지 않도록).

### 3-5. sitemap·메타

변경 없음(`/` 그대로).

## 4. 검증

1. `npx tsc --noEmit` 오류 0.
2. grep `landingMode` → 스키마·queries·(LandingSwitch 내부 prop명 `mode` 제외) 외 출현 없음을 목록으로 보고.
3. `git diff --stat` — §0 수정 금지 파일이 목록에 없어야 한다.

## 5. 보고 (커밋 전)

§1 사전 확인 결과(훅 이름, 트랜지션 값), 파일별 변경 요약, §4 원문, 커밋 메시지 제안 `landing mode: ring / grid / random`.

## 6. 배포 후 사용자 확인

1. Studio > SITE SETTINGS에서 Grid 선택·Publish → 1분 후 시크릿 창으로 `/` 진입: ACP 인트로 → 그리드 등장. 워드마크가 처음부터 검은색으로 보이는지.
2. Random 선택 → 시크릿 창을 여러 번 새로 열어 링/그리드가 섞여 나오는지. 같은 창에서 새로고침하면 같은 모드 유지.
3. Ring으로 되돌리면 현행과 동일.
