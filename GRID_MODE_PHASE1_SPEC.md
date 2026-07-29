# 그리드 모드 1차 명세 — 독립 그리드 뷰 (morph 제외)

> 대상: Claude Code. 목표: 기존 링월(`/work`)·랜딩(`/`)을 **일절 건드리지 않고**, 임시 독립 라우트 `/work-grid`에 그리드 모드 뷰를 신설한다. 콘텐츠 영역 morph는 **2차 명세**에서 다룬다. 이 1차는 그리드 뷰·밀도 슬라이더·호버·필터까지다.

---

## 0. 절대 불변 (건드리지 말 것)

다음 파일·라우트는 **읽기만** 하고 **절대 수정하지 않는다**:
- `src/app/page.tsx` (루트 랜딩)
- `src/app/work/page.tsx` (링월 관문)
- `src/components/LandingExperience.tsx`
- `src/components/ContentArea.tsx` (2차에서 구조를 참고만 함)
- `src/components/ProjectWall.tsx` / `MobileProjectWall.tsx`
- `src/hooks/useRingWall.ts`

그리드 모드는 **완전히 독립된 신규 파일**로만 구성한다. 통합·선택은 차후 별도 작업이다.

---

## 1. 신규 파일 구성

```
src/app/work-grid/page.tsx          (신규 — 얇은 래퍼, work/page.tsx와 동일 패턴)
src/components/GridExperience.tsx    (신규 — 그리드 뷰 루트 클라이언트 컴포넌트)
```

이번 1차에서 위 2개 파일만 신규 생성한다. 그 외 파일 수정 금지.

### 1-1. `src/app/work-grid/page.tsx`

`work/page.tsx`와 동일한 정적 생성 패턴을 따른다:

```tsx
import { getProjects } from '@/lib/sanity/queries'
import { GridExperience } from '@/components/GridExperience'

export const dynamic = 'force-static'

export default async function WorkGridPage() {
  const projects = await getProjects()
  return <GridExperience projects={projects} />
}
```

- `getProjects()`는 이미 `careerNo desc` 정렬 상태로 도착한다(queries.ts `order(careerNo desc)`). **재정렬하지 않는다.**
- 타입은 기존 `Project`(`@/types`) 그대로 소비한다. 신규 타입 정의 불요.

---

## 2. `GridExperience.tsx` — 뷰 골격

`'use client'`. props는 `{ projects: Project[] }` 단일.

### 2-1. 필터 로직 (링월과 동일 술어, 복제 아님 — 그리드 자체 상태)

```tsx
const FILTER_TYPES = ['All', ...TYPOLOGY_ORDER.filter(t =>
  projects.some(p => p.type === t || p.subTypes?.includes(t))
)]
const [activeFilter, setActiveFilter] = useState('All')
const filteredProjects = useMemo(
  () => activeFilter === 'All'
    ? projects
    : projects.filter(p => p.type === activeFilter || p.subTypes?.includes(activeFilter as ProjectType)),
  [activeFilter, projects]
)
```

- `TYPOLOGY_ORDER`, `ProjectType`은 `@/types`에서 import.
- 필터 선택 시 **비매칭 카드는 렌더에서 제외**(그리드에서 사라지고 남은 것만 재배열). 링월의 dim 방식과 다르다 — 그리드는 `filteredProjects`만 map하면 자연히 재배열된다.

### 2-2. 레이아웃 3영역 (세로)

```
┌─────────────────────────────────────────┐
│  HEADER  (기존 여백 --ui-pad, 링월과 동일) │  ← 워드마크/Works/Menu
├─────────────────────────────────────────┤
│  CONTROLS (--ui-pad)                      │  ← 필터(좌) + 뷰토글 Ring|Grid(우)
├─────────────────────────────────────────┤
│  GRID  (밀도에 따라 폭 규칙 상이 §3)        │  ← 썸네일 그리드, 세로 문서 스크롤
└─────────────────────────────────────────┘
│  DENSITY BAR (fixed, 하단, --ui-pad)      │  ← 슬라이더 + 스냅 박스 미리보기
```

- **세로 문서 스크롤**을 쓴다(`overflow:hidden` 금지). 그리드는 링월과 정반대로 물리 엔진이 없다. About 페이지와 같은 문서 스크롤 구조.
- 헤더·컨트롤·밀도바는 모두 `--ui-pad`(기존 링월 헤더 여백과 동일값, 34px 기준) 좌우 여백을 공유한다.
- **`--grid-pad`(1열 전용 별도 여백)는 두지 않는다.** 1차 프로토타입에서 시도했으나 폐기. 1열 폭은 §3의 콘텐츠 히어로 공식으로 결정한다.

---

## 3. 밀도 슬라이더 — 핵심 로직

### 3-1. 단계와 뷰포트 종횡비 상한

- 밀도 = 수평 열 수. **정수 1~6열.**
- 상한은 뷰포트 종횡비로 연동(HdM 방식):
  - `r = innerWidth / innerHeight`
  - `r < 0.85` (portrait) → 상한 2
  - `0.85 ≤ r < 1.25` (~square) → 상한 4
  - `r ≥ 1.25` (landscape) → 상한 6
- 하한은 **1** (단, §3-3의 1열 특수 거동 감안. 실물 판단 후 3열로 상향 가능성 — 아래 명시).

### 3-2. 폭 규칙 (실장님 확정 — 밀도별 상이)

**핵심: 1열과 2열 이상이 다른 폭 기준을 쓴다.**

- **2~6열**: 그리드 영역이 **헤더와 동일한 전체 가로폭**을 쓴다(좌우 `--ui-pad`만). CSS Grid `repeat(N, 1fr)`로 N개 균등 분할. 카드 폭 = `(fullWidth - gap*(N-1)) / N`.
- **1열**: 카드 폭을 **콘텐츠 영역 히어로 폭에 고정**하고 중앙 정렬한다.
  - 콘텐츠 히어로 폭 공식(ContentArea.tsx 참조, 4:3 기준):
    `heroW = (4/3) × (viewportHeight × 0.72)`
    - `SLIDE_H_RATIO = 0.72`는 ContentArea 상수와 동일. `FALLBACK_RATIO = 4/3`.
  - 1열일 때 `grid-template-columns: ${heroW}px`, 컨테이너 `justify-content: center` 또는 `margin: 0 auto`.
  - **결과**: 1열은 화면을 꽉 채우지 않고 중앙에 콘텐츠 히어로 크기로 뜬다. 좌우 여백이 상당해진다(1440×820에서 heroW≈787px, 좌우 여백 각 ~325px). 이는 의도된 거동 — morph 자연스러움(1열↔콘텐츠 영역 폭 일치)을 위한 것.

> **실물 판단 대비**: 1열의 좌우 여백이 과해 조망 모드로 부적절하면 **하한을 3열로 올린다**(1열 폐기). 명세는 1열을 구현하되, 하한 상수 `MIN_COLS`를 한 곳에서만 정의해 3으로 바꾸기 쉽게 둔다.

### 3-3. 드래그 거동 — 연속보간 + 릴리스 시 정수 정착

- 슬라이더 드래그 중: `cols`가 **분수값**으로 연속 변화. 카드 폭을 분수 `cols`에 맞춰 연속 보간(2~6열 구간에서는 그리드 폭 보간, §3-2의 1fr 방식 위에서).
- 손을 놓으면(release): 가장 가까운 정수 열로 **정착**(`Math.round`). 정착 시 부드러운 트랜지션.
- **정수 그리드 위에서 폭 보간**한다. 절대좌표 masonry 엔진은 신설하지 않는다(유지보수·Safari 리스크 회피).
- **1차 프로토타입 버그 교훈 반영**:
  - flex-wrap 금지 → **CSS Grid `repeat(N,1fr)`** 사용(서브픽셀 반올림으로 카드가 밀리는 문제 원천 차단).
  - `Math.min(full, gridW)` 클램프로 특정 구간에서 폭 변화가 멈추던 문제 → 정수 열 간 폭을 **선형 보간**하는 방식으로 구현(구간 경계에서 멈춤 없이 연속).

### 3-4. 슬라이더 UI

- 하단 **전용 바**(fixed). 카드와 히트 영역 완전 분리(HdM 모바일 오조작 회피).
- 구성: `DENSITY` 라벨(좌) — 슬라이더 트랙(중, knob+fill) — 열 수 카운트(우, `N cols`).
  - 카운트는 `DENSITY` 라벨과 **동일 회색톤·대문자·자간**(위계 낮춤).
- 슬라이더 아래 **스냅 미리보기**: 각 정수 열 지점마다 **박스 N개**(1열=박스1, 2열=박스2...). **숫자 없음**(힙하지 않음 — 박스만).
  - 활성 열의 박스는 흰색으로 밝아짐.
  - **박스는 knob과 동일 좌표계로 절대 배치**한다. 1차 프로토타입에서 `justify-content:space-between`으로 배치해 knob 궤적과 어긋난 버그 → 각 스냅 스텝을 `colsToPos(c)` 위치에 `position:absolute; left:${pos*100}%`로 놓는다(knob과 동일 공식).
  - 박스 클릭 시 해당 열로 정착.

---

## 4. 카드 — 4:3, 호버 거동

### 4-1. 카드 이미지

- 비율 **4:3**(`aspect-ratio: 4/3`), `object-fit: cover`.
- 자산은 16:9·A판형. 4:3에서 16:9는 좌우 소폭 크롭 → **`coverHotspot`**(Project.coverHotspot: {x,y}, queries.ts가 이미 공급) 사용해 `object-position`을 hotspot으로 지정. hotspot 없으면 center.
- 커버 없으면 `coverColor ?? '#1E1C18'` 단색 폴백(실제로는 전 프로젝트 이미지 완비 — 폴백 표시되는 프로젝트 없음, 안전장치로만).

### 4-2. 하단 텍스트 — 전 구간 노출

- 카드 하단에 **타이틀 상시 노출**(`project.title.en`).
- **호버 시** 타이틀 아래로 **요약 페이드인**: `타이폴로지 · AWARDS`(타입은 `project.type`, 어워즈는 `project.awards?.find(a=>a.visible!==false)?.title`, 있을 때만 `·` 연결).
  - 요약 어워즈는 골드톤(`#b89773`).
- **레이아웃 출렁임 차단**: 하단 텍스트 영역에 **요약 높이 미리 예약**(`min-height`). 호버 시 요약이 예약 공간에 페이드인되어 reflow 없음.
- **전 구간 노출**: 1차 프로토타입에서 5열+ 조밀 구간에 요약을 숨겼던 것을 **철회**. 모든 열에서 호버 요약이 나온다. 조밀 구간(5열+)에서는 텍스트 크기만 약간 축소(타이틀·요약), 숨기지 않는다.
- 하단 텍스트 종류(타입·어워즈 병기)는 현행 유지. 추후 미세 조정 대상.

---

## 5. 필터·뷰토글 배치

- **필터**(좌상단, CONTROLS 행): `FILTER_TYPES` 칩. 선택 시 `filteredProjects`만 렌더 → 자동 재배열. 링월 필터 바 문법(불릿+대문자+자간) 재사용하되 그리드 자체 상태.
- **뷰 토글**(우상단, CONTROLS 행): `Ring | Grid` 2항목. 필터와 **다른 층위**로 시각 분리.
  - 1차에서는 `Ring` 클릭 시 `/work`로 이동(`<Link href="/work">`), `Grid`는 현재(활성). 실제 뷰 전환 morph는 통합 단계에서.

---

## 6. 반응형·모바일 (1차 최소)

- 종횡비 상한(§3-1)으로 세로 형상에서 자동으로 열 수 제한.
- 모바일 세부(핀치 제스처 등)는 1차 범위 밖. 세로 문서 스크롤 + 슬라이더만 동작하면 충분.
- 기존 반응형 3구간(D1/D2/M) 세부는 재사용하되, 밀도 상한은 종횡비가 지배.

---

## 7. 검증

- `npx tsc --noEmit`만 실행(기존 규칙 — `npm run dev`/`build` 금지).
- 신규 파일 2개 외 diff 없음을 확인(기존 파일 무수정).
- 상수는 한 곳에서만 정의(`MIN_COLS`, `MAX_COLS_BY_ASPECT`, `SLIDE_H_RATIO`, `CARD_RATIO=4/3`, `--ui-pad`, `--gap`). 특히 `MIN_COLS`는 실물 판단 후 1→3 변경이 한 줄로 되도록.

---

## 8. 이 명세가 담지 않은 것 (2차 예고)

- 그리드 카드 클릭 → 콘텐츠 영역 morph (카드 rect → 히어로 확대, 좌측 텍스트·요약 생성, 우측 슬라이드 넘김). ContentArea의 연속 트랙 모델을 **복제해 그리드 전용 콘텐츠 영역**으로 신설(ContentArea 자체는 수정 안 함). 링월 morph는 루트 전체에서 시작하나 그리드는 클릭 카드 rect에서 시작 — 진입 rect만 다르고 도착(트랙 히어로)은 동일 공식.
- Sanity `landingMode` 싱글턴, canonical 강등, 실제 뷰 전환.

---

## 실행 프롬프트

아래를 클립보드에 복사해 Claude Code에 그대로 붙여넣는다:

```
GRID_MODE_PHASE1_SPEC.md 파일을 읽고 명세대로 구현해줘.

핵심 제약:
- src/app/page.tsx, src/app/work/page.tsx, LandingExperience.tsx, ContentArea.tsx, ProjectWall.tsx, MobileProjectWall.tsx, useRingWall.ts는 절대 수정하지 마. 읽기만 해.
- 신규 파일은 src/app/work-grid/page.tsx 와 src/components/GridExperience.tsx 두 개만 생성해. 그 외 기존 파일 diff가 생기면 안 돼.
- 밀도 슬라이더는 CSS Grid repeat(N,1fr) 위에서 폭을 선형 보간해. flex-wrap 쓰지 마(서브픽셀 밀림 버그). Math.min 클램프로 폭 변화가 멈추지 않게 정수 열 간 선형 보간해.
- 1열 카드 폭은 콘텐츠 히어로 폭 (4/3)*(vpH*0.72)로 고정하고 중앙 정렬. 2~6열은 헤더와 동일 전체폭 균등 분할.
- 슬라이더 스냅 박스는 knob과 동일 좌표(colsToPos, position:absolute left:pos%)로 배치해. justify-content:space-between 쓰지 마(knob과 어긋남). 박스만, 숫자 없음.
- 호버 요약은 전 구간 노출(조밀 구간에서 숨기지 말고 텍스트만 축소). 하단 텍스트 영역 min-height로 요약 높이 예약해 reflow 차단.
- MIN_COLS는 한 곳에서만 정의(실물 판단 후 1→3 변경 대비).
- 완료 후 npx tsc --noEmit 만 실행. npm run dev/build 하지 마.
```
