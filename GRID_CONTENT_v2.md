# 콘텐츠 에어리어 수정 명세 v2 (GRID_CONTENT_v2)

> 그리드·링월 공통 콘텐츠 에어리어 3개 수정 + 스키마 변경 1건.
> ① 진입 시 메인 이미지 화면 정중앙 정렬(그리드) ② 커버=첫 슬라이드 자동 주입(그리드+링월)
> ③ back 버튼을 서머리 필드 위로(그리드) ④ Sanity `coverCaption` 필드 신설.
> **링월 ContentArea.tsx 수정은 이 명세 §2(getSlides)에 한정 허용** — 다른 로직 무수정.

---

## 1. 진입 시 메인 이미지 정중앙 정렬 (그리드 — GridContentArea)

### 증상
첨부 스크린샷: 진입 후 메인 이미지가 화면 중앙이 아니라 좌측 치우침, 우측 여백 과다.

### 원인 (실측 기반 진단)
초기 scrollPos를 `centers[1] - vpSize.w/2`로 뒀으나, `centers[1]`은 트랙 좌표계상 히어로
슬롯 중심이다. 트랙은 좌측에 정보 슬라이드(INFO_SLIDE_W)를 인덱스 0으로 상주시키므로,
히어로 슬롯 중심을 뷰포트 중심에 맞춰도 morph 도착 rect의 left와 초기 정착 scrollPos가
미세하게 어긋나면 이미지가 중앙에 안 온다.

> ⚠ 정확한 어긋남 값은 배포된 실제 좌표를 봐야 확정. 아래는 수정 방향(단일 기준값 통일).

### 수정
**히어로의 화면 정중앙 정렬을 단일 기준값으로 정의하고, morph 도착 left와 초기 scrollPos가
그 값을 공유**하게 한다.
```
// 히어로 슬롯의 트랙 내 x (rects[1].x) — 트랙 좌표계
// 화면 정중앙에 놓을 목표: 히어로 중심 = vpSize.w / 2
// 필요 scrollPos = (rects[1].x + heroW/2) - vpSize.w/2   ... (트랙→화면 변환)
// 단 트랙 transform이 translateX(-scrollPos)이고 트랙 원점에 TRACK_INSET이 있으면:
const heroCenterInTrack = TRACK_INSET + rects[1].x + rects[1].w / 2
const targetScroll = heroCenterInTrack - vpSize.w / 2
setScrollPos(clampScroll(targetScroll))
```
- morph 도착 rect의 left도 동일 기준으로:
  `heroScreenLeft = TRACK_INSET + rects[1].x - targetScroll`
  → 이 값이 곧 `vpSize.w/2 - rects[1].w/2`(정중앙)와 일치해야 한다. 일치하지 않으면
  두 계산의 TRACK_INSET·rects 기준이 어긋난 것 → 같은 상수·같은 rects 배열을 쓰는지 확인.
- **핵심**: morph 도착 left와 정착 후 히어로 화면 left가 **동일 픽셀**이어야 morph 종료 시
  이미지가 안 튄다. 두 값을 각각 계산하지 말고 `heroScreenLeft` 하나를 구해 morph 도착·
  정착 검증에 공용.
- rects.length ≥ 2 가드. 좌표 px 정수, transform 퍼센트 금지.

> ⚠ 구현자는 배포 후 실제 히어로 left를 측정해 `vpSize.w/2 - rects[1].w/2`와 일치하는지
> 확인. 어긋나면 TRACK_INSET·INFO_SLIDE_W·SLIDE_GAP_PX가 rects[1].x에 이미 반영됐는지 재점검.

---

## 2. 커버 = 첫 슬라이드 자동 주입 (그리드 + 링월 공통)

### 배경
현재 `getSlides`(ContentArea.tsx L51–54)는 slides 있으면 그것만, 없으면 커버 폴백. 즉 커버와
첫 슬라이드가 별개. → morph는 커버 썸네일에서 시작하는데 도착(첫 슬라이드)이 다른 이미지면
확대 중 이미지가 바뀌어 어색(결함 4의 부분 원인). 또 Sanity에서 커버·첫 슬라이드 이중 입력
필요.

### 수정 — getSlides 재정의 (ContentArea.tsx, 링월 무수정 예외 허용 지점)
```
function getSlides(project: Project): ProjectSlide[] {
  const rest = project.slides ?? []
  if (!project.coverImage) return rest
  const cover: ImageSlide = {
    kind: 'image',
    src: project.coverImage,
    ...(project.coverCaption ? { caption: project.coverCaption } : {}),
    ...(project.coverHotspot ? {} : {}),   // hotspot은 ImageSlide에 없음 — 렌더 시 별도 처리
  }
  return [cover, ...rest]
}
```
- **커버를 항상 첫 image 슬라이드로 prepend**, 이후 실제 slides 이어붙임.
- 캡션: `project.coverCaption`(§4에서 신설). 없으면 캡션 없이 이미지만.
- ⚠ **중복 방지**: 기존 데이터에서 첫 슬라이드가 이미 커버와 동일 이미지인 프로젝트가 있으면
  중복 표시된다. 구현자는 배포 전 Sanity 데이터에서 "첫 슬라이드 == coverImage"인 프로젝트를
  GROQ로 조사하고, 있으면 그 첫 슬라이드를 제거하거나 사용자에게 보고. **자동 dedup은 위험**
  (의도적으로 커버와 다른 첫 슬라이드일 수 있음) → 데이터 조사 후 판단.

> ⚠⚠ **무수정 예외 범위**: 이 §2의 getSlides 함수 교체 외에 ContentArea.tsx의 다른 로직
> (morph·트랙·rects·슬라이드 렌더러·넘김)은 절대 수정 금지. 그리드 GridContentArea.tsx는
> ContentArea 복제본이므로 동일하게 getSlides만 교체.

### 링월·그리드 동시 적용
- 링월: ContentArea.tsx의 getSlides 교체.
- 그리드: GridContentArea.tsx의 getSlides(복제본) 동일 교체.
- 두 곳이 같은 로직이므로, 원한다면 lib로 추출 가능하나 이번엔 각자 교체(사용자가 링월 직접
  수정 허용). **단 로직은 동일해야 함** — 한쪽만 고치지 말 것.

---

## 3. back 버튼을 서머리 필드 위로 (그리드 — GridContentArea)

### 증상
현재 `←back` 버튼이 로고와 겹쳐 클릭 불가.

### 수정
링월 ContentArea의 back 버튼 위치·구조를 참조(읽기 전용)해, 그리드 콘텐츠의 정보 슬라이드
(서머리 필드) 상단에 배치.
- 링월에서 back 버튼이 어디에 렌더되는지 확인 후 동일 위치·스타일 적용.
- z-index가 로고보다 아래이거나 위치가 겹치지 않도록. 정보 슬라이드(좌측 240px) 최상단,
  careerNo 코드 위에 배치.
- 클릭 시 onBack(역-morph 복귀) 연결. 기존 핸들러 재사용.

> ⚠ 링월 back 버튼 구조는 ContentArea.tsx에서 확인만(읽기 전용), 수정 금지. 그리드
> GridContentArea.tsx에 동일 패턴 적용.

---

## 4. Sanity 스키마 — coverCaption 필드 신설

### 변경
`Project` 타입 + Sanity 스키마 + GROQ 쿼리 + 타입 정의에 커버 캡션 추가.

#### 4-1. types/index.ts
```
export interface Project {
  ...
  coverHotspot?: { x: number; y: number }
  coverCaption?: LocaleString   // ← 신설. 커버 슬라이드 하단 캡션(BIG 형식 "LABEL — desc")
}
```

#### 4-2. Sanity 스키마 (sanity/schemaTypes/project.ts)
- `coverImage` 필드 부근에 `coverCaption` 필드 추가. 타입 = localeString(기존 localeTypes.ts의
  로케일 오브젝트). 설명: "커버 이미지 하단 캡션. 형식: LABEL — description".
- ⚠ 구현자는 project.ts의 실제 필드 정의 방식(localeString 참조법)을 확인 후 동일 패턴으로 추가.

#### 4-3. GROQ 쿼리 (src/lib/sanity/queries.ts)
- 프로젝트 fetch GROQ에 `coverCaption` 프로젝션 추가. coverImage·coverHotspot이 프로젝션되는
  지점 부근에 `coverCaption`도 포함.
- ⚠ **GROQ 문자열은 tsc가 검증 못 함** — 구현자가 실제 쿼리 문자열에 필드 추가됐는지 전수
  확인(grep). 누락 시 coverCaption이 undefined로 와 캡션 미표시(런타임만 드러남).

#### 4-4. 데이터 입력
- 스키마 배포 후 Sanity Studio에서 각 프로젝트에 커버 캡션 수동 입력(선택). 미입력이면 캡션
  없이 커버 이미지만 표시(§2 getSlides가 caption 없으면 생략).

---

## 5. 구현 순서
1. **스키마 먼저** (§4): types → project.ts → queries.ts. 데이터 마이그레이션 아님(신규 선택
   필드라 기존 데이터 무영향).
2. **getSlides 교체** (§2): 링월 ContentArea + 그리드 GridContentArea 동시. 배포 전 중복 조사.
3. **중앙정렬** (§1): GridContentArea 초기 scrollPos.
4. **back 버튼** (§3): GridContentArea.

## 6. 검증
- `npx tsc --noEmit`만. dev·build 금지.
- 무수정: LandingExperience.tsx·useRingWall.ts·work-grid/page.tsx.
- **허용 수정**: ContentArea.tsx(§2 getSlides만), GridContentArea.tsx, GridExperience.tsx(back
  연결 시), types/index.ts, sanity/schemaTypes/project.ts, src/lib/sanity/queries.ts.
- tsc 안 잡히는 것: GROQ coverCaption 프로젝션 누락(grep 확인), getSlides 중복(데이터 조사).

## 7. 배포 후 확인
1. 진입 시 메인 이미지 화면 정중앙(좌측 치우침 해소), morph 종료 시 이미지 안 튐.
2. 커버가 첫 슬라이드로 표시, 다음 슬라이드로 넘기면 실제 slides. 커버 캡션 하단 표시.
3. back 버튼이 서머리 위, 로고와 안 겹침, 클릭 시 역-morph 복귀.
4. 링월도 커버가 첫 슬라이드로 표시(동일 동작).
5. 커버·첫 슬라이드 중복 표시 없음(데이터 조사 반영).
