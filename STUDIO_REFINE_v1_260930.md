# STUDIO_REFINE v1 — Sanity Studio 1차 정비 (260930)

> 근거: `AUDIT_REPORT_STUDIO_260930.md` (읽기 전용 감사, 260930)
> 목적: 감사에서 확인된 Studio 불편 요인 6건을 일괄 반영. 이후 사용자 실사용 피드백으로 v2 진행.

---

## 0. 절대 제약 (위반 시 즉시 중단·보고)

1. **데이터 식별자 변경 금지** — 스키마 `name`(타입명·필드명), `_type`, structure `.id(...)`, GROQ 필터 문자열은 한 글자도 바꾸지 않는다. 변경 대상은 **표시용 `title`·`description`·preview 문자열·icon·groups**뿐이다.
2. **필드 순서 변경 금지** — `project.ts` 등 모든 스키마의 `fields` 배열 순서 유지. 그룹은 `group:` 속성 추가로만 구성한다.
3. **수정 허용 파일 (이 외 전부 금지)**
   - `sanity.config.ts`
   - `sanity/schemaTypes/project.ts`
   - `sanity/schemaTypes/slides.ts`
   - `sanity/schemaTypes/siteSettings.ts` · `about.ts` · `contact.ts` · `essay.ts` — **icon 추가만** (title·필드 변경 금지)
   - `src/components/SiteHeader.tsx` — **§P2의 가드 1블록만**
4. **수정 금지 파일** — `src/lib/sanity/*`(사이트 GROQ), `ContentArea.tsx`, `MobileProjectWall.tsx`, `globals.css`, `SiteChromeContext.tsx`, `localeTypes.ts`
5. 패키지 설치 금지. 데이터 마이그레이션 스크립트 작성·실행 금지.
6. 검증은 `npx tsc --noEmit` + 본 문서 §검증의 grep만. `npm run dev` / `npm run build` 금지.

---

## P1. PROJECTS → WORKS 표기 통일

### P1-a. `sanity.config.ts` (감사 §4-a 기준 행번호)

| 행 | 현재 | 변경 |
|---|---|---|
| 65 | `.title('PROJECTS — PUBLISHED')` | `.title('WORKS — PUBLISHED')` |
| 69 | `.title('Published Projects')` | `.title('Published Works')` |
| 74 | `.title('PROJECTS — HIDDEN')` | `.title('WORKS — HIDDEN')` |
| 78 | `.title('Hidden Projects')` | `.title('Hidden Works')` |

`.id('projectsPublished')` · `.id('projectsHidden')` · 두 `.filter(...)`는 **유지**(Studio URL 경로·GROQ).

### P1-b. `sanity/schemaTypes/project.ts`

| 행 | 현재 | 변경 |
|---|---|---|
| 16 | `title: '프로젝트',` | `title: 'WORKS',` |
| 43 | `description: '프로젝트의 목적을 요약하는 한 줄. 타이틀 아래 표시된다',` | `description: '작품의 목적을 요약하는 한 줄. 타이틀 아래 표시된다',` |
| 177 | `description: '기존 게재 프로젝트의 슬러그는 SEO상 변경 금지',` | `description: '기존 게재 작품의 슬러그는 SEO상 변경 금지',` |

**유지 (변경 금지)**
- `project.ts:30` — `'프로젝트 연번'`은 Career 엑셀의 **실제 열 이름**이므로 그대로 둔다
- `about.ts:98` `title: 'PROJECTS'`, `about.ts:78` `'CV Project Entry'`, `about.ts:43` 설명 — CV 경력 하위의 참여 프로젝트 목록으로, 사이트 Works와 다른 개념

---

## P2. Studio 위 사이트 헤더(ACP 워드마크) 겹침 제거

원인(감사 §5 확정): 루트 layout이 `<SiteHeader />`를 경로 가드 없이 렌더 → `/studio`에서도 fixed 워드마크(z-index 200)·nav·모바일 헤더 바·햄버거가 Studio 위에 올라옴.

### 수정 — `src/components/SiteHeader.tsx`

- 컴포넌트 함수 안에서 **마지막 hook 호출(현 48행 부근 `}, [pathname])`로 끝나는 useEffect) 다음**, 최종 `return (` (현 50행) **직전**에 아래 1블록 추가:

```tsx
  // 260930 STUDIO_REFINE v1 — Studio(/studio)에서는 사이트 헤더를 그리지 않는다
  if (pathname?.startsWith('/studio')) return null
```

- **hook 규칙**: 이 early return은 반드시 모든 hook 호출 **이후**에 둔다. hook보다 앞에 두면 안 된다. 삽입 위치 앞뒤 원문을 보고서에 발췌.
- 다른 줄 변경 금지.

### 사전 확인 (구현 전)
- `.mobile-header-bar`·`.mobile-menu-btn`을 렌더하는 컴포넌트가 `SiteHeader.tsx`인지 grep으로 확인. **다른 파일에서 렌더된다면 수정하지 말고 그 파일·행을 보고만** 한다(v2에서 처리).

### 비고 (수정하지 않음)
- `SiteChromeProvider`는 `/studio` 방문 시 인트로 재생 기록을 세션에 남긴다. Studio 사용 후 같은 탭에서 사이트로 가면 인트로가 생략되는 부수효과가 있으나 운영자 본인에게만 해당하므로 이번 범위에서 제외.

---

## P3. WORKS 입력 화면 탭(그룹) 구성 — `project.ts`

### P3-a. 문서에 `groups` 추가 (`fields` 앞)

```ts
  groups: [
    { name: 'basic', title: 'BASIC', default: true },
    { name: 'info', title: 'INFO' },
    { name: 'cover', title: 'COVER' },
    { name: 'slides', title: 'SLIDES' },
  ],
```

### P3-b. 최상위 필드 20개 전부에 `group:` 추가 (순서 변경 금지)

| group | 필드 name |
|---|---|
| `basic` | `published`, `careerNo`, `title`, `subtitle`, `slug`, `year`, `status`, `featured` |
| `info` | `client`, `location`, `mainType`, `subTypes`, `size`, `role`, `awards` |
| `cover` | `coverImage`, `coverCaption`, `coverColor` |
| `slides` | `slides` |

- `awards` 내부 `award` 객체의 하위 필드(title·visible)에는 group을 달지 않는다(최상위만).
- 20개 중 누락이 있으면 그 필드는 기본 탭(BASIC)에서 보이지 않게 된다 → §검증 V3로 개수 확인 필수.

---

## P4. 라벨 언어 통일 (영문 대문자)

원칙: **라벨(`title`) = 영문 대문자**, **안내문(`description`) = 한국어 유지**. 기존 WORKS 필드 라벨(TITLE, CLIENT 등) 체계에 맞춘다.

### P4-a. `slides.ts` — 타입·필드 title

| 위치 | 현재 | 변경 |
|---|---|---|
| imageSlide 타입 | `'이미지 슬라이드'` | `'IMAGE'` |
| imageSlide.image | `'이미지'` | `'IMAGE'` |
| imageSlide.caption | `'캡션'` | `'CAPTION'` |
| imageSlide.diagram | `'다이어그램 취급'` | `'DIAGRAM'` |
| diagramSetSlide 타입 | `'다이어그램 묶음 (자동 넘김)'` | `'DIAGRAM SET (AUTO)'` |
| diagramSetSlide.items | `'다이어그램 항목'` | `'ITEMS'` |
| diagramItem.image | `'이미지'` | `'IMAGE'` |
| diagramItem.label | `'라벨'` | `'LABEL'` |
| diagramItem.description | `'설명'` | `'DESCRIPTION'` |
| diagramSetSlide.autoAdvanceMs | `'자동 넘김 간격 (ms)'` | `'AUTO-ADVANCE (MS)'` |
| creditsSlide 타입 | `'크레딧'` | `'CREDITS'` |
| creditsSlide.rows | `'크레딧 행'` | `'ROWS'` |
| creditRow.label | `'라벨'` | `'LABEL'` |
| creditRow.value | `'내용'` | `'VALUE'` |
| textSlide 타입 | `'본문 텍스트'` | `'TEXT'` |
| textSlide.body | `'본문'` | `'BODY'` |
| quoteSlide 타입 | `'인용구'` | `'QUOTE'` |
| quoteSlide.text | `'인용문'` | `'TEXT'` |
| quoteSlide.attribution | `'출처'` | `'ATTRIBUTION'` |
| videoSlide 타입 | `'영상 (YouTube)'` | `'VIDEO (YOUTUBE)'` |
| videoSlide.youtubeId | `'YouTube 영상 ID'` | `'YOUTUBE ID'` |
| videoSlide.caption | `'캡션'` | `'CAPTION'` |

기존 `description`이 없는 필드에 새 description을 추가하지 않는다. 기존 description은 유지.

### P4-b. `slides.ts` — preview 표시 문자열

| 위치 | 현재 | 변경 |
|---|---|---|
| diagramSetSlide preview title | `'다이어그램 묶음'` | `'DIAGRAM SET'` |
| creditsSlide preview title | `'크레딧'` | `'CREDITS'` |
| textSlide preview subtitle | `'본문 텍스트'` | `'TEXT'` |
| videoSlide preview 대체 title | `'영상'` | `'VIDEO'` |

빈 값 안내 문구(`'(캡션 없음)'`, `'(본문 없음)'`, `'(인용문 없음)'`, `'(ID 없음)'`)는 유지.

### P4-c. `project.ts` — awards 하위

| 위치 | 현재 | 변경 |
|---|---|---|
| award.title | `'수상명'` | `'TITLE'` |
| award.visible | `'노출'` | `'VISIBLE'` |
| award preview subtitle | `visible === false ? '숨김' : '노출'` | `visible === false ? 'HIDDEN' : 'VISIBLE'` |

`subTypes` validation의 한국어 오류 메시지는 유지(안내문 성격).

---

## P5. WORKS 목록 미리보기 정보 보강 — `project.ts` 문서 preview

현재:
```ts
  preview: {
    select: { title: 'title.en', subtitle: 'title.ko', media: 'coverImage' },
  },
```

변경:
```ts
  preview: {
    select: {
      titleEn: 'title.en',
      titleKo: 'title.ko',
      careerNo: 'careerNo',
      year: 'year',
      status: 'status',
      media: 'coverImage',
    },
    prepare({ titleEn, titleKo, careerNo, year, status, media }) {
      const meta = [careerNo, year, status, titleKo].filter(Boolean).join(' · ')
      return { title: titleEn, subtitle: meta, media }
    },
  },
```

표시 예: `Gwangju Suwan District Mixed-Use Complex` / `52 · 2024 · Idea · 광주 수완지구 복합시설`

---

## P6. 아이콘

`@sanity/icons`(5.0.0, 이미 설치)에서 import. 기존 `BarChartIcon`과 **같은 import 방식**(`@sanity/icons/<Name>` 경로)을 따른다.

| 대상 | 아이콘(1순위) |
|---|---|
| SITE SETTINGS (structure 항목 + `siteSettings` 타입) | `CogIcon` |
| ABOUT (structure + `about` 타입) | `UserIcon` |
| CONTACT (structure + `contact` 타입) | `EnvelopeIcon` |
| ESSAYS (structure + `essay` 타입) | `DocumentTextIcon` |
| WORKS — PUBLISHED (structure) + `project` 타입 | `ImagesIcon` |
| WORKS — HIDDEN (structure) | `EyeClosedIcon` |

- structure: `S.listItem()....icon(X)`
- 스키마 타입: `defineType({ ..., icon: X })`
- **각 아이콘이 `node_modules/@sanity/icons`에 실제로 존재하는지 먼저 확인.** 없으면 의미가 가장 가까운 기존 아이콘으로 대체하고 대체 내역을 보고. 존재하지 않는 이름으로 import하지 않는다.

---

## 검증

| # | 명령 | 기대 결과 |
|---|---|---|
| V1 | `npx tsc --noEmit` | 오류 0 |
| V2 | `grep -nE "PROJECTS —\|Projects'" sanity.config.ts` | 0건 |
| V3 | `project.ts`에서 최상위 필드의 `group: '` 개수 | 정확히 20 (awards 하위 제외) — 필드별 group 대응표를 보고서에 첨부 |
| V4 | `grep -nE "title: '[^']*[가-힣]" sanity/schemaTypes/slides.ts` | 0건 |
| V5 | `grep -nE "title: '(수상명\|노출)'" sanity/schemaTypes/project.ts` | 0건 |
| V6 | `grep -rn "name: '" sanity/schemaTypes` 결과를 작업 전후 비교 | **완전히 동일** (식별자 무변경 증명) |
| V7 | `grep -n "_type ==" sanity.config.ts` 결과 작업 전후 비교 | 완전히 동일 |
| V8 | `SiteHeader.tsx` 가드 삽입 위치 앞 5줄·뒤 3줄 원문 발췌 | 가드가 모든 hook 이후, `return (` 직전 |

## 보고

1. 사전 확인 결과(모바일 헤더 바 렌더 위치, 아이콘 존재 여부)
2. 파일별 변경 줄 목록
3. V1–V8 결과 원문
4. 아이콘 대체 내역(있을 경우)

## 배포 후 사용자 육안 확인 항목

1. `/studio` — 데스크톱·모바일 모두 ACP 워드마크·햄버거·흰 헤더 바가 사라졌는지
2. 좌측 목록이 WORKS — PUBLISHED / HIDDEN 으로 바뀌고 아이콘이 붙었는지
3. 작품 하나를 열었을 때 상단에 BASIC · INFO · COVER · SLIDES 탭이 보이고, BASIC이 기본으로 열리는지
4. 목록 각 행 부제에 `연번 · 연도 · 상태 · 한글명`이 보이는지
5. 슬라이드 추가 메뉴가 IMAGE / DIAGRAM SET (AUTO) / CREDITS / TEXT / QUOTE / VIDEO (YOUTUBE)로 보이는지
6. 사이트(`/`, `/work`, `/about`) 헤더가 그대로인지(가드가 사이트에 영향 없음 확인)
