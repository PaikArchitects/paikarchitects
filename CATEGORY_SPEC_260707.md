# CATEGORY_SPEC — 타이폴로지 체계 개편 + 월 30개 확장

> **작성일:** 2026.07.07
> **정본:** Career_260707.xlsx (Typology 시트 = 종류·순서 / 본 시트 = 프로젝트별 Main·Sub 배정)
> **성격:** 데이터 레이어 개편. 인터랙션 레이어(직전 재동결)는 접촉하지 않는다.

---

## 0. 절대 경계 (위반 금지)

1. **수정 허용 파일은 정확히 3개:**
   - `src/types/index.ts` — §1 스키마
   - `src/data/projects.ts` — §3 데이터
   - `LandingExperience.tsx` — §2의 **정확히 2개 지점**(필터 파생 1줄, 필터 술어 1줄). 그 외 어떤 줄도 수정 금지.
2. **불가침:** `ProjectWall.tsx`, `useRingWall.ts`, `ContentArea.tsx`, `MobileProjectWall.tsx`, `SiteHeader.tsx`, `projectSlides.ts`, 전역 CSS. (카드 용도 행 줄바꿈은 직전 스펙에서 이미 선반영됨 — 재접촉 금지.)
3. `Project.id`(슬러그)는 기존 프로젝트에 한해 절대 변경 금지 (SEO). 신규 엔트리의 슬러그는 §3-C 명세를 따른다.

---

## 1. 스키마 — `src/types/index.ts`

### 1-A. `ProjectType` 유니언을 14종 정본으로 전면 교체

```ts
export type ProjectType =
  | 'Workplace'
  | 'Sports'
  | 'Culture and Exhibition'
  | 'Education'
  | 'Commerce'
  | 'Hospitality'
  | 'Religion'
  | 'Housing and Urbanism'
  | 'Infrastructure'
  | 'Healthcare'
  | 'Remodeling'
  | 'Interior'
  | 'Landscape'
  | 'Space'
```

구 리터럴('Culture', 'Work', 'Residential', 'Film', 'Mixed-use')은 폐기한다. 코드베이스 전수 검사 결과 이 리터럴을 참조하는 곳은 본 파일뿐이므로 안전하다.

### 1-B. 정본 순서 상수 신설 (같은 파일에 export)

```ts
/** 필터 칩 정렬 정본 순서 — Career_260707.xlsx 'Typology' 시트 */
export const TYPOLOGY_ORDER: ProjectType[] = [
  'Workplace', 'Sports', 'Culture and Exhibition', 'Education',
  'Commerce', 'Hospitality', 'Religion', 'Housing and Urbanism',
  'Infrastructure', 'Healthcare', 'Remodeling', 'Interior',
  'Landscape', 'Space',
]
```

### 1-C. `Project` 인터페이스 확장

```ts
type: ProjectType          // = Typology_Main. 카드·메타에 노출되는 유일한 라벨 (기존 필드 유지)
subTypes?: ProjectType[]   // = Typology_Sub 1·2. 필터 매칭 전용 — 어디에도 표기하지 않는다
```

`careerNo` 주석을 갱신한다: `// Career_260707.xlsx '프로젝트 연번' 기준`.

---

## 2. 필터 — `LandingExperience.tsx` (정확히 2개 지점)

**지점 ① 칩 파생 (현재 15행):**

```ts
const FILTER_TYPES = ['All', ...TYPOLOGY_ORDER.filter(t =>
  sortedProjects.some(p => p.type === t || p.subTypes?.includes(t))
)]
```

— 규칙: **월 게재 프로젝트의 Main ∪ Sub 합집합을 정본 순서로 정렬.** 실재하지 않는 유형(Space 등)은 자동 비노출. `TYPOLOGY_ORDER` import 추가 허용.

**지점 ② 필터 술어 (현재 46행):**

```ts
sortedProjects.filter(p => p.type === activeFilter || p.subTypes?.includes(activeFilter))
```

그 외(셔플·인트로·트랙·URL)는 일절 수정하지 않는다.

---

## 3. 데이터 — `src/data/projects.ts`

### 3-A. 기존 22개 — `type` 재배정 + `subTypes` 추가 + `careerNo` 갱신

아래 표 그대로 반영한다. 표기되지 않은 필드(title, titleKr, year, status, result, featured, displayOrder, coverImage, coverColor, location)는 **일절 변경 금지.**

| id (불변) | careerNo | type (Main) | subTypes |
|---|---|---|---|
| independence-memorial-hall | 17 | Culture and Exhibition | ['Landscape'] |
| cheongju-culture-factory | 10 | Culture and Exhibition | ['Remodeling', 'Infrastructure'] |
| kfcc-bank-office-building | 18 | Workplace | ['Commerce'] |
| seoul-animation-center | 15 | Culture and Exhibition | ['Education', 'Housing and Urbanism'] |
| cloud-tectonic | 26 | Culture and Exhibition | ['Healthcare', 'Housing and Urbanism'] |
| simmons-factorium | 5 | Infrastructure | 생략(필드 미기재) |
| hyundai-india-rd-center | 42 | Infrastructure | ['Workplace'] |
| wonju-innovation-complex | 16 | Sports | ['Culture and Exhibition', 'Landscape'] |
| kb-kookmin-bank-hq | 7 | Workplace | 생략 |
| gwacheon-12th-apartment | 8 | Housing and Urbanism | 생략 |
| garak-wholesale-market | 38 | Infrastructure | ['Commerce'] |
| the-k-yedaham | 47 | Culture and Exhibition | ['Commerce', 'Religion'] |
| arario-gallery | 56 | Culture and Exhibition | ['Housing and Urbanism', 'Interior'] |
| jinju-sports-cloud | 43 | Sports | ['Landscape'] |
| orion-new-factory | 48 | Infrastructure | 생략 |
| chungnam-convention-center | 28 | Culture and Exhibition | ['Landscape'] |
| national-medical-complex | 6 | Healthcare | ['Workplace'] |
| orion-new-office | 37 | Workplace | 생략 |
| space-group-new-office | 32 | Workplace | ['Commerce'] |
| seongnae-complex | 57 | Housing and Urbanism | ['Hospitality', 'Culture and Exhibition'] |
| unprecedented-resort | 53 | Hospitality | ['Culture and Exhibition', 'Housing and Urbanism'] |
| the-whale | 55 | Housing and Urbanism | ['Culture and Exhibition'] |

### 3-B. 삭제 1건

`yeongduk-goraebul-hotel` 엔트리를 통째로 제거한다. (광주 수완지구로 대체 — 아래 3-C.)

### 3-C. 신규 8개 엔트리 (배열 말미에 추가, displayOrder 순)

정본 필드는 Career_260707.xlsx에서 추출·확정한 값이다. 그대로 사용한다.

```ts
{
  id: 'gwangju-suwan-complex',
  careerNo: 67,
  title: 'Gwangju Suwan District Mixed-Use Complex',
  titleKr: '광주 수완지구 복합시설',
  year: 2026,
  type: 'Hospitality',
  subTypes: ['Housing and Urbanism', 'Culture and Exhibition'],
  status: 'In Progress',
  result: 'Winner',
  featured: false,
  displayOrder: 21,
  coverColor: '#33272B',
  location: 'Gwangju, KR',
},
{
  id: 'cheonan-samgeori-park',
  careerNo: 14,
  title: 'Cheonan Samgeori Park',
  titleKr: '천안 삼거리공원',
  year: 2018,
  type: 'Landscape',
  subTypes: ['Culture and Exhibition'],
  status: 'Under Construction',
  result: 'Winner',
  featured: false,
  displayOrder: 24,
  coverColor: '#2E3A2F',
  location: 'Cheonan, KR',
},
{
  id: 'hanyang-univ-music-hall',
  careerNo: 31,
  title: 'Hanyang University Park Hwa-young Music Hall',
  titleKr: '한양대학교 박화영음악관',
  year: 2021,
  type: 'Education',
  subTypes: ['Culture and Exhibition'],
  status: 'In Progress',
  result: 'Winner',
  featured: false,
  displayOrder: 25,
  coverColor: '#3A3128',
  location: 'Seoul, KR',
},
{
  id: 'embassy-of-korea-in-india',
  careerNo: 33,
  title: 'Embassy of Korea in India Remodeling',
  titleKr: '주인도대사관 리모델링',
  year: 2021,
  type: 'Workplace',
  subTypes: ['Remodeling', 'Interior'],
  status: 'Completed',
  result: 'Winner',
  featured: false,
  displayOrder: 26,
  coverColor: '#40372B',
  location: 'New Delhi, IN',
},
{
  id: 'seongju-urban-regeneration',
  careerNo: 29,
  title: 'Seongju-gun Urban Regeneration',
  titleKr: '성주군 도시재생',
  year: 2021,
  type: 'Workplace',
  subTypes: ['Sports', 'Remodeling'],
  status: 'Completed',
  result: 'Winner',
  featured: false,
  displayOrder: 27,
  coverColor: '#4A4238',
  location: 'Seongju-gun, KR',
},
{
  id: 'gangil-compact-city',
  careerNo: 22,
  title: 'Gangil, Seoul Compact City',
  titleKr: '강일, 서울 컴팩트 시티',
  year: 2020,
  type: 'Housing and Urbanism',
  subTypes: ['Remodeling', 'Culture and Exhibition'],
  status: 'Competition',
  result: '3rd Prize',
  featured: false,
  displayOrder: 28,
  coverColor: '#2B333D',
  location: 'Seoul, KR',
},
{
  id: 'dosandaero-229',
  careerNo: 65,
  title: 'Dosandaero 229',
  titleKr: '도산대로 229',
  year: 2026,
  type: 'Workplace',
  subTypes: ['Culture and Exhibition', 'Commerce'],
  status: 'In Progress',
  result: 'Winner',
  featured: false,
  displayOrder: 29,
  coverColor: '#1F1F23',
  location: 'Seoul, KR',
},
{
  id: 'seonnam-cc-clubhouse',
  careerNo: 68,
  title: 'Seonnam CC Clubhouse',
  titleKr: '선남CC 클럽하우스',
  year: 2026,
  type: 'Hospitality',
  subTypes: ['Landscape'],
  status: 'In Progress',
  result: 'Commission',
  featured: false,
  displayOrder: 30,
  coverColor: '#35402F',
  location: 'Seongju-gun, KR',
},
```

- `coverImage`는 전 신규 엔트리에서 **의도적으로 생략**한다 → 월 카드는 `coverColor` 폴백, 트랙은 정보 슬라이드 단독으로 동작함이 확인됨(`getSlides` 폴백). 이미지·슬라이드는 콘텐츠 레이어에서 별도 등록 예정.
- `projectSlides.ts`에 신규 슬러그 엔트리를 **추가하지 않는다** (폴백이 처리).
- 영문명 정정 참고: 정본 파일의 "Embassy for the South Korea…", "(temp)" 접미 등은 표기 정제하여 위 title을 확정본으로 한다.

---

## 4. 검증

`npx tsc --noEmit` 통과 필수. (`npm run dev` / `npm run build` 금지.)

배포 후 수동 체크리스트:

1. 필터 바 칩이 정본 순서로 노출: ALL → WORKPLACE → SPORTS → CULTURE AND EXHIBITION → EDUCATION → COMMERCE → HOSPITALITY → RELIGION → HOUSING AND URBANISM → INFRASTRUCTURE → HEALTHCARE → REMODELING → INTERIOR → LANDSCAPE (Space는 비노출)
2. Sub 전용 칩 정상 개설: RELIGION(더케이 1건) → 유한 모드 정중앙 1장 / INTERIOR(아라리오·주인도) / COMMERCE·EDUCATION·LANDSCAPE 등
3. REMODELING 칩: 문화제조창·주인도·성주·강일 4건 노출 (전부 Sub 매칭 — Main 표기는 각자 유지)
4. 카드·트랙 어디에도 Sub 라벨 미표기, Main 장문 라벨("CULTURE AND EXHIBITION")의 2줄 줄바꿈 정상
5. ALL = 30개 루프 모드, 영덕 고래불 부재·광주 수완 존재
6. 신규 8건: 단색 커버 카드 + 클릭 시 정보 슬라이드 트랙 정상 (크래시 없음)
7. Git diff 파일 수 = 정확히 3

---

## 5. 사후

- 통과 시: 1차 CODE_AUDIT(동결 지점 감사 — 비활성 스크롤바 CSS 등) → 모바일 링 이식 스펙 → 콘텐츠 레이어(신규 8건 이미지 포함).
- 본 매핑은 향후 Sanity 스키마(`mainType`/`subTypes` 필드)로 그대로 승계한다.
