# Sanity 스키마 정합 명세 — 필드 순서·라벨 통일 + `result` 잔존 정리

작성일 260720. 대상: `sanity/schemaTypes/project.ts`, `scripts/`.

본 명세는 실제 소스 감사(260720) 위에 작성되었다. 아래 「현황」은 확인된 사실이며 추정이 아니다.

---

## 0. 현황 (감사 확인 사항)

**현행 스키마 필드 순서** (`project.ts`):
title → subtitle → slug → careerNo → year → mainType → subTypes → status → awards → featured → displayOrder → coverImage → coverColor → location → client → size → role → slides

**사이트 정보 슬라이드 표시 순서** (260720 재개편 후):
타이틀 세트(title + subtitle) → AWARDS → CLIENT → LOCATION → TYPOLOGY / SIZE / STATUS / YEAR → ROLE

**불일치 지점**
- `location`이 스키마에서 `client`보다 **앞**에 있으나 사이트에서는 **뒤**다.
- `year`·`status`·`mainType`이 스키마 상단에 흩어져 있으나 사이트에서는 하단 2단 그리드다.
- `awards`가 `status`와 `featured` 사이에 끼어 있어 사이트 순서(CLIENT 직전)와 다르다.

**라벨 불일치**

| 필드 | 현행 Studio 라벨 | 사이트 라벨 |
|---|---|---|
| `mainType` | 용도 (Main) | TYPOLOGY |
| `subTypes` | 용도 (Sub) | (미노출) |
| `size` | 규모 (SIZE) | SIZE / AREA / LENGTH (값에서 파생) |
| `client` | 발주처 (CLIENT) | CLIENT |
| `location` | 위치 | LOCATION |
| `role` | 역할 | ROLE |
| `status` | 상태 | STATUS |
| `year` | 설계 시작 연도 | YEAR |
| `awards` | 수상 | AWARDS |
| `title` | 프로젝트명 | (타이틀) |
| `subtitle` | 한 줄 설명 | (서브타이틀) |

---

## 1. `result` 잔존 진단 및 정리

Studio에서 `Unknown field found` 경고가 발생한다(Cloud Tectonic 확인). 스키마에 없는 필드가 문서에 남아 있다는 뜻이며, 260720 AWARDS 마이그레이션에서 `unset`되지 않은 `result`가 유력한 후보다.

### 1-A. 전수 진단 — 추정하지 말고 조사한다

`scripts/auditUnknownFields.ts`를 작성해 다음을 조사한다. **published와 draft를 모두 포함**해야 한다(마이그레이션이 published만 처리했을 가능성이 있다).

```groq
*[_type == "project"]{
  _id,
  "title": title.en,
  "hasResult": defined(result),
  result
}
```

`_id`가 `drafts.`로 시작하는 문서가 결과에 포함되는지 반드시 확인한다. Sanity 클라이언트의 `perspective` 설정에 따라 draft가 조회에서 누락될 수 있으므로, `perspective: 'raw'`로 조회한다.

`result` 외의 미정의 필드가 있는지도 함께 확인한다. 조사 결과를 콘솔에 출력한다.

### 1-B. 정리

진단 결과에 따라 `scripts/cleanupResult.ts`를 작성해 `result`가 남아 있는 모든 문서(draft 포함)에서 `result`를 `unset`한다.

- `awards`가 이미 존재하는 문서 → `result`만 unset.
- `awards`가 없고 `result`에 유효값(`-`·빈 문자열이 아닌 값)이 있는 문서 → `awards` 배열로 이관 후 `result` unset. `_key`는 고유값으로 생성한다.
- draft 문서는 `drafts.` 접두 `_id`로 별도 patch 대상이 된다. published patch가 draft를 자동 갱신하지 않는다.

실행: `npx tsx --env-file=.env.local scripts/cleanupResult.ts`

환경변수명은 `.env.local`의 실제 키인 **`SANITY_API_TOKEN`**을 사용한다(기존 `migrateAwards.ts` 주석에 `SANITY_WRITE_TOKEN`으로 잘못 기재된 사례가 있다).

### 1-C. 검증

정리 후 다음 GROQ가 빈 배열을 반환해야 한다.

```groq
*[_type == "project" && defined(result)]{_id}
```

Studio를 새로고침해 `Unknown field found` 경고가 사라졌는지 육안 확인한다.

---

## 2. 필드 순서 재배열 — 사이트 표시 순서 기준

### 2-A. 배열 원칙

노출 필드군을 사이트 표시 순서대로 먼저 배치하고, 사이트에 노출되지 않는 관리 필드군을 그 뒤에 모은다. 관리 필드를 노출 필드 사이에 섞으면 "입력 중 결과물 예측"이라는 목적이 훼손된다. `slides`는 최하단이다.

### 2-B. 목표 순서

```
[노출 필드군 — 사이트 표시 순서]
1.  title        (타이틀)
2.  subtitle     (서브타이틀)
3.  awards       (AWARDS)
4.  client       (CLIENT)
5.  location     (LOCATION)
6.  mainType     (TYPOLOGY)
7.  size         (SIZE)
8.  status       (STATUS)
9.  year         (YEAR)
10. role         (ROLE)

[관리 필드군 — 미노출]
11. subTypes     (필터 매칭 전용)
12. slug
13. careerNo
14. displayOrder
15. featured
16. coverImage
17. coverColor

[슬라이드]
18. slides
```

`subTypes`는 사이트에 표시되지 않으므로 관리 필드군에 둔다. 다만 `mainType`과 논리적으로 인접하므로 관리 필드군의 **첫 항목**에 배치해 접근성을 확보한다.

### 2-C. fieldsets 분리

`defineType`에 `fieldsets`을 추가해 두 군을 시각적으로 구분한다.

```ts
fieldsets: [
  { name: 'display', title: '사이트 노출 항목', options: { collapsible: false } },
  { name: 'admin', title: '관리 항목', options: { collapsible: true, collapsed: true } },
],
```

노출 필드(1~10)에 `fieldset: 'display'`, 관리 필드(11~17)에 `fieldset: 'admin'`을 지정한다. `slides`는 fieldset 없이 최하단에 둔다(분량이 크고 성격이 다르다).

관리 필드군은 기본 접힘(`collapsed: true`)으로 두어 일상적 편집 시 노출 항목에 집중되게 한다.

### 2-D. 필드 정의 자체는 변경하지 않는다

순서와 `fieldset` 지정, 라벨(3장)만 변경한다. `type`·`validation`·`options`·`description`·`initialValue`는 **일절 수정하지 않는다.** 특히 다음은 그대로 유지한다.

- `slug.options.source` 함수 (`doc.title?.en`)
- `subTypes.validation`의 mainType 중복 검사 custom 함수
- `coverColor.validation`의 HEX 검사
- `TYPE_OPTIONS` / `STATUS_OPTIONS` 상수

---

## 3. 라벨 통일 — 사이트 라벨 기준

### 3-A. 변경표

| 필드 | 현행 `title` | 변경 후 `title` |
|---|---|---|
| `title` | 프로젝트명 | TITLE |
| `subtitle` | 한 줄 설명 | SUBTITLE |
| `awards` | 수상 | AWARDS |
| `client` | 발주처 (CLIENT) | CLIENT |
| `location` | 위치 | LOCATION |
| `mainType` | 용도 (Main) | TYPOLOGY |
| `size` | 규모 (SIZE) | SIZE |
| `status` | 상태 | STATUS |
| `year` | 설계 시작 연도 | YEAR |
| `role` | 역할 | ROLE |
| `subTypes` | 용도 (Sub) | TYPOLOGY (SUB) |
| `slug` | URL 슬러그 | SLUG |
| `careerNo` | 프로젝트 연번 | CAREER NO. |
| `displayOrder` | 배치 순서 | DISPLAY ORDER |
| `featured` | Featured (2배 폭 카드) | FEATURED |
| `coverImage` | 커버 이미지 | COVER IMAGE |
| `coverColor` | 커버 대체 색상 | COVER COLOR |
| `slides` | 슬라이드 | SLIDES |

### 3-B. description은 한글 유지

`title`(라벨)만 영문 대문자로 바꾸고, `description`(설명문)은 **현행 한글을 그대로 유지**한다. 라벨은 사이트와의 대응을 위한 식별자이고, 설명은 입력 지침이므로 성격이 다르다.

`description`이 없는 필드에는 새로 추가하지 않는다. 단 다음 두 필드는 라벨이 영문화되면서 의미가 모호해지므로 `description`을 추가한다.

- `subtitle`: `'프로젝트의 목적을 요약하는 한 줄. 타이틀 아래 표시된다'`
- `year`: `'설계 시작 연도'` (기존 라벨의 정보가 라벨에서 사라지므로 설명으로 이전)

### 3-C. `size` 라벨 주의

사이트는 값에서 `SIZE`·`AREA`·`LENGTH`를 자동 파생한다(`sizeLabel()`). Studio 라벨은 대표값인 `SIZE`로 고정한다. 현행 `description`에 파생 규칙이 이미 기술되어 있으므로 그대로 유지한다.

### 3-D. slides.ts는 변경하지 않는다

`imageSlide`·`diagramSetSlide`·`creditsSlide`·`textSlide`·`quoteSlide`의 라벨은 사이트 노출 항목이 아니라 슬라이드 유형 식별자다. 본 명세의 적용 대상이 아니다.

---

## 4. preview·orderings 유지

`preview.select`(`title.en` / `title.ko` / `coverImage`)와 `orderings`(displayOrderAsc / careerNoAsc / yearDesc)는 **변경하지 않는다.** `preview.select`가 `title.en`이 아닌 `title` 객체를 가리키면 `[object Object]`가 표시되므로, 경로를 건드리지 않는다.

---

## 5. 검증

`npx tsc --noEmit` 만 실행한다. `npm run dev` / `npm run build`는 실행하지 않는다.

`tsc`는 스키마 필드 순서·라벨 문자열을 검증하지 못한다. 다음을 육안 확인한다.

- Studio에서 프로젝트 문서를 열어 필드가 목표 순서(2-B)대로 나타나는가.
- `사이트 노출 항목` fieldset이 펼쳐진 상태, `관리 항목` fieldset이 접힌 상태로 표시되는가.
- 문서 목록의 preview에 영문 타이틀·한글 타이틀·커버 이미지가 정상 표시되는가(`[object Object]`가 아닌지).
- `Unknown field found` 경고가 사라졌는가.
- 슬러그 자동 생성이 여전히 영문 타이틀 기반으로 동작하는가(신규 문서 생성 테스트).

---

## 6. 변경 파일 목록

| 파일 | 변경 |
|---|---|
| `sanity/schemaTypes/project.ts` | 필드 순서 재배열, `fieldsets` 추가, 라벨 영문 대문자 통일, `subtitle`·`year` description 추가 |
| `scripts/auditUnknownFields.ts` | 신규 — `result` 등 미정의 필드 전수 진단 (draft 포함) |
| `scripts/cleanupResult.ts` | 신규 — `result` 잔존 정리 (draft 포함) |

프론트엔드 컴포넌트·타입·GROQ 변경 없음. 스키마 필드의 `name`은 하나도 바뀌지 않으므로 데이터·쿼리에 영향이 없다.

---

## 7. 제약

- 필드의 `name`은 **일절 변경하지 않는다.** `name` 변경은 데이터 마이그레이션을 유발한다. 본 명세는 순서·`title`(라벨)·`fieldset`만 다룬다.
- `type`·`validation`·`options`·`initialValue`를 수정하지 않는다.
- `preview`·`orderings`를 수정하지 않는다.
- `sanity/schemaTypes/slides.ts`, `localeTypes.ts`, `index.ts`를 수정하지 않는다.
- 프론트엔드 컴포넌트(`ContentArea.tsx`, `MobileProjectWall.tsx`)를 수정하지 않는다.
- `src/types/index.ts`를 수정하지 않는다.
- 정리 스크립트는 `result` 및 진단에서 확인된 미정의 필드만 대상으로 한다. 다른 필드를 unset하지 않는다.
- 스크립트 실행 전 진단(1-A)을 반드시 선행한다. 조사 없이 일괄 patch하지 않는다.
