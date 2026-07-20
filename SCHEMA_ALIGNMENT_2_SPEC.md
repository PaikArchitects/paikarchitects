# 스키마 정합 2차 명세 — 필드 재배열·`displayOrder` 폐지·`careerNo` 노출·SIZE 자동 단위

작성일 260720. 대상: `sanity/schemaTypes/project.ts`, `src/lib/queries.ts`, `src/lib/projectMeta.ts`, `src/types/index.ts`, `src/components/ContentArea.tsx`, `src/components/MobileProjectWall.tsx`, `src/components/LandingExperience.tsx`.

본 명세는 실제 소스 감사(260720) 위에 작성되었다. 아래 「현황」은 확인된 사실이며 추정이 아니다.

---

## 0. 현황 (감사 확인 사항)

- `queries.ts` `PROJECTS_QUERY`: `*[_type == "project"] | order(displayOrder asc)`. **`displayOrder`는 프로젝트 월의 유일한 정렬 기준이다.**
- `queries.ts`: GROQ 프로젝션·`RawProject` 인터페이스·`getProjects()` 매핑 **3곳 모두**에 `displayOrder`가 있다.
- `LandingExperience.tsx` L16 주석: `projects: Project[] // Sanity에서 displayOrder 정렬 상태로 도착 — 재정렬 불요`.
- `LandingExperience.tsx`의 `shuffle`은 **히어로 배경 순환용 큐**(`shuffleQueue`)이며 목록 정렬이 아니다. L45·114·125·237에서 사용. 목록 순서에 관여하지 않는다.
- `ProjectCard.tsx` L10: `const careerCode = String(project.careerNo).padStart(3, '0')` — **3자리 zero-pad**. `project-card-static-num`(상시 노출)과 `project-card-num`(호버 오버레이) 두 곳에서 사용.
- `projectMeta.ts` `sizeLabel()`: 값에 `㎡|m²|sqm`가 **이미 있을 때만** `AREA`를 반환. 단위를 부착하지 않는다. 순수 숫자는 `SIZE`로 떨어진다.
- `project.ts` `coverColor`: `validation: (Rule) => Rule.required().custom(...)` — 필수값이다.
- 260720 1차 정합 작업으로 `fieldsets`(`display` / `admin`)이 도입된 상태다.

---

## 1. `fieldsets` 폐지 및 필드 재배열

### 1-A. `fieldsets` 제거

`defineType`의 `fieldsets` 배열을 **삭제**하고, 모든 필드 정의에서 `fieldset: 'display'` / `fieldset: 'admin'` 속성을 **삭제**한다. 전 필드가 한 화면에 접힘 없이 노출된다.

관리 항목을 별도 접힘 영역으로 분리했더니 `mainType` 등 자주 쓰는 필드 접근이 불편해졌다. 흐름은 유지하되 물리적 분리는 없앤다.

### 1-B. 목표 필드 순서

```
1.  careerNo      (CAREER NO.)     ← 최상단
2.  title         (TITLE)
3.  subtitle      (SUBTITLE)
4.  awards        (AWARDS)
5.  client        (CLIENT)
6.  location      (LOCATION)
7.  mainType      (TYPOLOGY)
8.  subTypes      (TYPOLOGY (SUB))
9.  size          (SIZE)
10. status        (STATUS)
11. year          (YEAR)
12. role          (ROLE)
13. coverImage    (COVER IMAGE)
14. coverColor    (COVER COLOR)
15. featured      (FEATURED)
16. slug          (SLUG)
17. slides        (SLIDES)
```

`displayOrder`는 3장에서 제거되므로 목록에 없다.

`careerNo`가 최상단인 근거: 정렬 기준이자 프로젝트 식별 코드가 되므로 문서의 첫 항목이 적절하다.

`subTypes`가 `mainType` 바로 아래인 근거: 사이트에 노출되지 않지만 Main을 고를 때 함께 판단하는 필드다.

`slug`가 하단인 근거: 최초 생성 시 자동 부여되며 이후 변경 금지 대상이다. 상시 편집 대상이 아니다.

---

## 2. 라벨 통일

각 필드의 `title`을 다음으로 변경한다. `description`은 현행 한글을 유지한다(라벨은 사이트 대응 식별자, 설명은 입력 지침으로 성격이 다르다).

| 필드 | 변경 후 `title` |
|---|---|
| `careerNo` | CAREER NO. |
| `title` | TITLE |
| `subtitle` | SUBTITLE |
| `awards` | AWARDS |
| `client` | CLIENT |
| `location` | LOCATION |
| `mainType` | TYPOLOGY |
| `subTypes` | TYPOLOGY (SUB) |
| `size` | SIZE |
| `status` | STATUS |
| `year` | YEAR |
| `role` | ROLE |
| `coverImage` | COVER IMAGE |
| `coverColor` | COVER COLOR |
| `featured` | FEATURED |
| `slug` | SLUG |
| `slides` | SLIDES |

`description`이 없는 필드에는 새로 추가하지 않는다. 단 다음 두 필드는 라벨 영문화로 정보가 소실되므로 `description`을 추가한다(1차 명세에서 지시된 사항이며 이미 반영되어 있으면 유지한다).

- `subtitle`: `'프로젝트의 목적을 요약하는 한 줄. 타이틀 아래 표시된다'`
- `year`: `'설계 시작 연도'`

`careerNo`의 기존 `description`(`"Career 엑셀 '프로젝트 연번' 기준"`)은 유지하고 다음을 덧붙인다: `' — 사이트 정렬 기준(내림차순) 및 표시 코드'`.

---

## 3. `displayOrder` 폐지 — `careerNo` 내림차순 정렬로 대체

프로젝트 월의 정렬을 `careerNo` 내림차순(최신작 우선)으로 바꾸고 `displayOrder` 필드를 제거한다. 정렬 기준이 데이터에 내재된 값이 되어 신규 프로젝트 추가 시 순서 부여가 불필요해진다.

### 3-A. 삭제·변경 지점 전수 (부분 이행 방지)

`displayOrder`는 다음 **6개 지점**에 존재한다. 하나라도 남으면 부분 이행이다.

| # | 파일 | 지점 |
|---|---|---|
| 1 | `sanity/schemaTypes/project.ts` | `displayOrder` 필드 정의 |
| 2 | `sanity/schemaTypes/project.ts` | `orderings`의 `displayOrderAsc` 항목 |
| 3 | `src/lib/queries.ts` | `PROJECTS_QUERY`의 `order(displayOrder asc)` |
| 4 | `src/lib/queries.ts` | `PROJECTS_QUERY` 프로젝션의 `displayOrder` |
| 5 | `src/lib/queries.ts` | `RawProject` 인터페이스의 `displayOrder: number` |
| 6 | `src/lib/queries.ts` | `getProjects()` 매핑의 `displayOrder: r.displayOrder` |

추가로 `src/types/index.ts`의 `Project` 인터페이스에 `displayOrder`가 있으면 삭제한다.

### 3-B. 정렬 변경

`queries.ts`:

```
*[_type == "project"] | order(displayOrder asc) {
```
→
```
*[_type == "project"] | order(careerNo desc) {
```

### 3-C. `orderings` 조정

`project.ts`의 `orderings`에서 `displayOrderAsc`를 삭제하고, `careerNo` 내림차순을 첫 항목으로 추가한다. 기존 `careerNoAsc`·`yearDesc`는 유지한다.

```ts
{
  title: '연번 (최신순)',
  name: 'careerNoDesc',
  by: [{ field: 'careerNo', direction: 'desc' }],
},
```

Studio 문서 목록의 기본 정렬이 사이트 표시 순서와 일치하게 된다.

### 3-D. 주석 정정

`LandingExperience.tsx` L16:

```
projects: Project[]         // Sanity에서 displayOrder 정렬 상태로 도착 — 재정렬 불요
```
→
```
projects: Project[]         // Sanity에서 careerNo 내림차순 정렬 상태로 도착 — 재정렬 불요
```

### 3-E. 데이터 정리

`displayOrder` 필드를 스키마에서 삭제하면 기존 문서에 남은 값이 Studio에서 `Unknown field found` 경고를 유발한다. `scripts/cleanupDisplayOrder.ts`를 작성해 전 문서(draft 포함, `perspective: 'raw'`)에서 `displayOrder`를 `unset`한다.

기존 `scripts/cleanupResult.ts`의 패턴을 따른다. 환경변수는 `SANITY_API_TOKEN`이다.

실행: `npx tsx --env-file=.env.local scripts/cleanupDisplayOrder.ts`

**배포 순서: 데이터 정리 먼저, 빌드 나중.**

### 3-F. `shuffle`은 건드리지 않는다

`LandingExperience.tsx`의 `shuffle`·`shuffleQueue`는 **히어로 배경 프로젝트 순환용**이며 목록 정렬과 무관하다. L45·113·114·125·209·237·383의 셔플 관련 코드를 일절 수정하지 않는다. `src/lib/shuffle.ts`도 그대로 둔다.

---

## 4. `coverColor` required 해제

### 4-A. 스키마

`project.ts`의 `coverColor` `validation`에서 `.required()`를 제거하고 HEX 형식 검사만 남긴다.

```ts
validation: (Rule) =>
  Rule.custom((value) => {
    if (value == null) return true
    if (typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value)) return true
    return '＃ 포함 6자리 HEX 색상으로 입력 (예: #1E1C18)'
  }),
```

### 4-B. `initialValue` 부여

신규 문서 생성 시 값을 신경 쓰지 않아도 되도록 기본값을 준다.

```ts
initialValue: '#1E1C18',
```

### 4-C. 타입

`src/types/index.ts`의 `Project.coverColor`가 `string`이면 `string | undefined`(즉 `coverColor?: string`)로 완화한다. `queries.ts`의 `RawProject.coverColor`도 동일하게 완화하고, `getProjects()` 매핑을 `coverColor: r.coverColor ?? undefined`로 바꾼다.

### 4-D. 렌더러 fallback

`ProjectCard.tsx`의 `style={{ backgroundColor: project.coverColor }}`는 `undefined`일 때 배경이 투명해진다. 다음으로 바꾼다.

```tsx
style={{ backgroundColor: project.coverColor ?? '#1E1C18' }}
```

`coverColor`를 참조하는 다른 지점이 있으면 동일하게 처리한다. `tsc`가 옵셔널화로 인한 타입 오류로 전부 드러낸다.

---

## 5. SIZE 자동 단위 부착

### 5-A. `projectMeta.ts` 수정

값이 순수 숫자(쉼표·소수점 허용)이면 면적으로 간주해 `㎡`를 자동 부착하고 라벨을 `AREA`로 판정한다. 판정 정규식을 **단일 상수로 공유**해 라벨과 값의 desync를 구조적으로 차단한다.

```ts
// src/lib/projectMeta.ts

/** 순수 숫자 판정 — 쉼표 구분·소수점 허용. 단위 없는 입력은 면적으로 간주한다 */
const BARE_NUMBER = /^[\d,]+(\.\d+)?$/

/** SIZE 라벨 파생 — 값의 순수 함수. Career 엑셀 Size 열은 면적·러닝타임·판형을 모두 담는다 */
export function sizeLabel(size: string): string {
  const s = size.trim()
  if (/\d\s*(min|sec)\b/i.test(s)) return 'LENGTH'
  if (/㎡|m²|sqm/i.test(s)) return 'AREA'
  if (BARE_NUMBER.test(s)) return 'AREA'
  return 'SIZE'
}

/** SIZE 값 파생 — 단위 없는 순수 숫자에 ㎡를 부착. 그 외는 원문 그대로 */
export function sizeValue(size: string): string {
  const s = size.trim()
  if (BARE_NUMBER.test(s)) return `${s} ㎡`
  return s
}
```

`A2`(판형)·`5 min.`(러닝타임)은 `BARE_NUMBER`에 걸리지 않아 원문 그대로 통과한다.

### 5-B. 렌더러 적용

`sizeLabel`을 쓰는 모든 지점에서 값 출력에 `sizeValue`를 함께 적용한다.

**데스크톱** `ContentArea.tsx`:
```tsx
<MetaField
  label={project.size ? sizeLabel(project.size) : 'SIZE'}
  value={project.size ? sizeValue(project.size) : undefined}
/>
```

**모바일** `MobileProjectWall.tsx`:
```tsx
<MobileMetaField
  label={project.size ? sizeLabel(project.size) : 'SIZE'}
  value={project.size ? sizeValue(project.size) : undefined}
/>
```

import 문에 `sizeValue`를 추가한다. **`src/lib/`의 공유 헬퍼를 컴포넌트 안에 복제하지 않는다.**

### 5-C. 스키마 description 갱신

`size` 필드의 `description`을 다음으로 교체한다.

```
'숫자만 입력하면 ㎡가 자동으로 붙는다 (예: "14,296.89"). 면적이 아닌 경우 단위를 포함해 입력한다 — 영상: "5 min." / 판형: "A2". 라벨(AREA·LENGTH·SIZE)은 값에서 자동 파생된다.'
```

### 5-D. 데이터 변경 불필요

기존에 `㎡`가 포함된 값은 `BARE_NUMBER`에 걸리지 않아 그대로 통과한다. 단위 없이 입력된 값만 자동 부착 대상이 된다. 마이그레이션 없이 양쪽 입력이 공존한다.

---

## 6. `careerNo` 정보 슬라이드 노출

프로젝트 코드를 정보 슬라이드 타이틀 위에 작고 흐리게 표시한다. 아카이브의 깊이를 드러내되 타이틀 인지를 방해하지 않는 위계로 둔다.

### 6-A. 표기 형식

`ProjectCard.tsx`의 기존 규약을 따라 **3자리 zero-pad**를 쓴다.

```tsx
String(project.careerNo).padStart(3, '0')
```

### 6-B. 데스크톱 (`ContentArea.tsx`)

타이틀 세트 고정 슬롯(`minHeight: TITLE_SET_MIN_H`) **안**, 타이틀 `BilingualText` **바로 위**에 배치한다.

```tsx
<div style={{
  fontSize: 9,
  fontWeight: 300,
  letterSpacing: '0.15em',
  opacity: 0.35,
  marginBottom: 6,
}}>
  {String(project.careerNo).padStart(3, '0')}
</div>
```

**`TITLE_SET_MIN_H`를 상향한다.** 코드 행 높이(9 × 1.0 ≈ 9) + `marginBottom` 6 = 15가 추가되므로:

```
const TITLE_SET_MIN_H = 197   // 기존 182 + 15
```

기존 값이 182가 아니면 그 값에 15를 더한다.

### 6-C. 모바일 (`MobileProjectWall.tsx`)

모바일 영문 타이틀은 `MobileInfoSlide` **바깥**(`titleRef`, 모프 종착점)에 있다. **`titleRef` 요소의 위치·구조를 이동하지 않는다.**

코드 행은 `titleRef` 요소 **바로 위**, 히어로와 타이틀 사이에 별도 `<div>`로 삽입한다.

```tsx
<div style={{
  fontFamily: FONT,
  fontSize: 8,
  fontWeight: 300,
  letterSpacing: '0.15em',
  opacity: 0.35,
  color: '#080706',
  marginTop: -SLIDE_GAP + 12,
  marginBottom: 4,
}}>
  {String(project.careerNo).padStart(3, '0')}
</div>
```

삽입 후 기존 `titleRef` 요소의 `marginTop: -SLIDE_GAP + 12`를 **`marginTop: 0`으로 변경**한다. 히어로와의 간격 제어 책임이 새 코드 행으로 이전되므로, 그대로 두면 간격이 이중으로 적용된다.

### 6-D. 카드는 변경하지 않는다

`ProjectCard.tsx`는 이미 `careerCode`를 상시 노출(`project-card-static-num`)과 호버 오버레이 양쪽에 표시하고 있다. 수정하지 않는다.

---

## 7. 검증

`npx tsc --noEmit` 만 실행한다. `npm run dev` / `npm run build`는 실행하지 않는다.

### 7-A. 컴파일러를 진단 수단으로 사용

`displayOrder` 제거 시 다음 순서를 지킨다.

1. `src/types/index.ts`의 `Project`에서 `displayOrder`를 **먼저 삭제**한다(존재할 경우).
2. `npx tsc --noEmit` → 참조 지점이 전부 오류로 드러난다.
3. 드러난 지점을 처리한 뒤 다시 `tsc`.

`coverColor` 옵셔널화도 동일하다. 타입을 먼저 완화하면 `undefined` 처리가 필요한 지점이 오류로 드러난다.

### 7-B. `tsc`가 잡지 못하는 것 — 수동 확인 필수

`tsc`는 GROQ 문자열·스키마 필드 순서·라벨 문자열·데이터 상태를 검증하지 못한다.

- `grep -rn "displayOrder" src/ sanity/ scripts/` → GROQ 문자열 포함 잔존 없음
- 정리 스크립트 실행 후 `*[_type == "project" && defined(displayOrder)]{_id}` → 빈 배열
- Studio 새로고침 → `Unknown field found` 경고 없음
- Studio 필드가 1-B 순서대로, 접힘 없이 한 화면에 나타나는가
- 사이트 프로젝트 월이 careerNo 내림차순(최신작 먼저)으로 표시되는가
- SIZE에 `14,296.89`만 입력된 프로젝트에서 `14,296.89 ㎡` / 라벨 `AREA`로 표시되는가
- SIZE가 `A2`인 프로젝트(The Whale)에서 `A2` / 라벨 `SIZE`로 표시되는가
- 정보 슬라이드 타이틀 위에 3자리 코드가 작고 흐리게 표시되는가 (데스크톱·모바일)
- 데스크톱에서 코드 행 추가 후에도 AWARDS 시작 y가 전 프로젝트 동일한가
- 모바일에서 히어로↔코드행↔타이틀 간격이 이중 적용되지 않았는가

---

## 8. 변경 파일 목록

| 파일 | 변경 |
|---|---|
| `sanity/schemaTypes/project.ts` | fieldsets 제거, 필드 재배열, 라벨 통일, `displayOrder` 삭제, `orderings` 조정, `coverColor` required 해제 + initialValue, `size`·`careerNo` description 갱신 |
| `src/lib/queries.ts` | `order(careerNo desc)`, `displayOrder` 3지점 삭제, `coverColor` 옵셔널화 |
| `src/lib/projectMeta.ts` | `BARE_NUMBER` 상수, `sizeLabel` 보강, `sizeValue` 신설 |
| `src/types/index.ts` | `displayOrder` 삭제, `coverColor` 옵셔널화 |
| `src/components/ContentArea.tsx` | careerNo 코드 행 추가, `TITLE_SET_MIN_H` 상향, `sizeValue` 적용 |
| `src/components/MobileProjectWall.tsx` | careerNo 코드 행 추가, `titleRef` marginTop 조정, `sizeValue` 적용 |
| `src/components/LandingExperience.tsx` | L16 주석 정정만 (동작 변경 없음) |
| `src/components/ProjectCard.tsx` | `coverColor` fallback |
| `scripts/cleanupDisplayOrder.ts` | 신규 |

---

## 9. 제약

- 필드의 `name`은 일절 변경하지 않는다. 본 명세의 스키마 변경은 순서·`title`·`validation`·`initialValue`·`description`·`orderings`에 한정된다.
- `preview.select`를 수정하지 않는다. `title.en`이 아닌 `title` 객체를 가리키면 `[object Object]`가 표시된다.
- `src/lib/shuffle.ts`와 `LandingExperience.tsx`의 셔플 로직(L45·113·114·125·209·237·383)을 수정하지 않는다. 히어로 배경 순환용이며 목록 정렬과 무관하다.
- `INFO_SLIDE_W`(200) / `TEXT_SLIDE_W`(560) / `QUOTE_SLIDE_W`(460) / `SLIDE_GAP`(24) 상수 변경 금지.
- `useRingWall.ts` 수정 금지.
- 모바일 영문 타이틀(`titleRef`) 요소 자체의 위치·구조를 이동하지 않는다(모프 종착점). 코드 행은 그 위에 **별도 요소로 삽입**한다.
- `sanity/schemaTypes/slides.ts`, `localeTypes.ts`, `index.ts` 수정 금지.
- `src/lib/`의 공유 헬퍼(`sizeLabel`, `sizeValue`, `splitRole`, `shuffle`, `BilingualText`)를 컴포넌트 안에 복제하지 않는다.
- 측정 반응형 패턴 금지 — `getBoundingClientRect`, 콘텐츠 측정용 `ResizeObserver`, `offsetWidth` 기반 레이아웃을 도입하지 않는다. `TITLE_SET_MIN_H`는 상수에서 결정론적으로 파생된다.
- 정리 스크립트는 `displayOrder`만 unset한다. 다른 필드를 건드리지 않는다.
