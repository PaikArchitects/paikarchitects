# GRID_MOBILE_260804 — 모바일 3건 (3열 상한 · 세로 스크롤 콘텐츠 · 카드 타이틀 한글 병기)

대상: `src/components/GridExperience.tsx`, `src/components/ProjectWall.tsx`,
(신규) `src/components/MobileGridContent.tsx`
`ContentArea.tsx`·`GridContentArea.tsx` **수정 금지**(작업 ②에서 재사용만).
검증: `npx tsc --noEmit`만. dev/build 금지.

---

## 0. 감사로 확정된 사실 (2026-08-04)

1. **그리드에는 모바일 분기가 없다.** `grep -c isMobile` → GridExperience 0건, GridContentArea 0건.
   `selected`가 있으면 화면 크기와 무관하게 `GridContentArea`(가로 트랙)를 렌더한다(716~717행).
   링월은 `LandingExperience` 74행에서 `w < 1024`로 `MobileProjectWall`에 분기하지만 그리드는 아니다.
2. **모바일 열 상한 2는 `maxColsForAspect`(94~98행)가 만든다.**
   ```
   if (r < 0.85) return 2   // portrait ← 이것이 원인
   if (r < 1.25) return 4
   return 6
   ```
3. **`ProjectCard.tsx`는 미사용 레거시다.** 실제 사용처 0건(주석 참조만).
   메모리의 "카드 타이틀 병기 대상 = ProjectCard.tsx"는 **오류**. 실제 대상:
   - 그리드 카드: `GridExperience.tsx` 578행 `<div className="gm-title">{project.title.en}</div>`
   - 링월 카드: `ProjectWall.tsx` `WallCardText` 내부 `{project.title.en}`
4. `BilingualText`가 `@/lib/bilingual`에 있고 콘텐츠 영역에서 이미 사용 중이다.

---

## 작업 ① — 모바일 그리드 3열 허용 (가장 단순)

### 수정 — GridExperience.tsx 94~98행
```
function maxColsForAspect(r: number): number {
  if (r < 0.85) return 3        // portrait — 260804: 2→3 (모바일 밀도 상한 상향)
  if (r < 1.25) return 4        // ~square
  return 6                      // landscape
}
```
한 줄 변경. `MIN_COLS = 1`은 유지하므로 모바일에서 1·2·3열이 모두 가능해진다.

### 확인
- 밀도 바(DENSITY BAR)의 `span = maxCols - MIN_COLS`(192행)가 자동으로 3-1=2가 되어
  슬라이더 구간이 재계산된다. 별도 수정 불요.
- 3열에서 카드 폭이 과도하게 좁아지지 않는지 육안 확인. 좁으면 `GAP`을 모바일에서만
  줄이는 방안을 검토하되 **이번 명세 범위 밖**(별도 지시 시 처리).

---

## 작업 ② — 모바일 그리드 콘텐츠 세로 스크롤

### 목표
모바일(<1024)에서 그리드 카드를 열면 가로 트랙이 아니라 **세로 스크롤**로 슬라이드를 쌓는다.
링월 모바일(`MobileProjectWall`의 `ExpandedBlock`)과 동일한 열람 경험.

### 설계 — 기존 모바일 슬라이드 렌더러를 재사용한다
`MobileProjectWall.tsx`에는 이미 타입별 모바일 슬라이드 렌더러가 있다:
`MobileSlide`(521행), `MobileImageSlide`, `MobileDiagramSetSlide`, `MobileTextSlide`,
`MobileQuoteSlide`, `MobileVideoSlide`, `MobileCreditsSlide`, `MobileInfoSlide`, `MobileCaption`.

**이들을 새로 만들지 말고 export해서 재사용한다.** 중복 구현은 슬라이드 타입이 늘 때
반드시 어긋난다(7종 exhaustive switch가 3곳으로 늘어난 전례가 있다).

### 2-1. MobileProjectWall.tsx — 렌더러 export
`MobileSlide`와 `MobileInfoSlide`를 export한다(나머지는 MobileSlide 내부에서 쓰이므로 불필요):
```
function MobileSlide(...)      →   export function MobileSlide(...)
function MobileInfoSlide(...)  →   export function MobileInfoSlide(...)
```
**이 두 줄 외에 MobileProjectWall은 수정하지 않는다.** 기존 링월 모바일 동작 불변.

### 2-2. 신규 `src/components/MobileGridContent.tsx`
```tsx
'use client'

// ── 모바일 그리드 콘텐츠 — 세로 스크롤 (GRID_MOBILE §2) ──
// 데스크톱 그리드는 GridContentArea(가로 트랙), 모바일은 이 컴포넌트(세로 스택)를 쓴다.
// 슬라이드 렌더는 MobileProjectWall의 렌더러를 재사용해 타입 분기가 갈라지지 않게 한다.

import { useEffect, useRef } from 'react'
import type { Project } from '@/types'
import { getSlides } from '@/lib/slides'          // 실제 경로/함수명은 grep으로 확인
import { MobileSlide, MobileInfoSlide } from './MobileProjectWall'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"

export function MobileGridContent({ project, onBack }: {
  project: Project
  onBack: () => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // 프로젝트 변경 시 최상단으로 (MobileProjectWall 896행과 동일 규약)
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [project.id])

  const slides = getSlides(project)   // 커버가 첫 image 슬라이드로 prepend된 배열

  return (
    <div
      ref={scrollRef}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#FFFFFF',
        overflowY: 'auto',
        overscrollBehaviorY: 'contain',   // 스크롤 체이닝 차단 (부모 그리드로 전파 방지)
        WebkitOverflowScrolling: 'touch',
        zIndex: 60,
        fontFamily: FONT,
      }}
    >
      {/* BACK — 상단 고정이 아니라 흐름 상단에 둔다(모바일 헤더 바와 충돌 방지) */}
      <button
        onClick={onBack}
        style={{
          display: 'block', margin: '72px 20px 16px', padding: 0,
          border: 'none', background: 'none', cursor: 'pointer',
          fontFamily: FONT, fontSize: 12, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: '#080706',
        }}
      >
        ← Back
      </button>

      {/* 정보(메타) — 링월 모바일과 동일 렌더러 */}
      <MobileInfoSlide project={project} />

      {/* 슬라이드 세로 스택 */}
      {slides.map((slide, i) => (
        <MobileSlide key={i} slide={slide} />
      ))}

      <div style={{ height: 64 }} />
    </div>
  )
}
```
**⚠ `getSlides`의 실제 모듈 경로·시그니처를 grep으로 확인해 맞출 것:**
```
grep -rn "getSlides" src/lib src/components | head
```
`MobileProjectWall`이 슬라이드를 얻는 방식(`getRestSlides` 71행 등)을 그대로 따르는 것이 안전하다.
`MobileInfoSlide`가 이미 메타를 렌더하므로 **정보 슬라이드 중복 여부를 확인**하고,
`getRestSlides`처럼 커버를 제외한 배열이 필요하면 그쪽을 쓴다.

### 2-3. GridExperience.tsx — 모바일 분기
`LandingExperience` 68~74행과 **동일한 경계(1024)** 로 판정한다:
```tsx
// 모바일 판정 — 링월(LandingExperience 74행)과 동일 경계 1024
const [isMobile, setIsMobile] = useState(false)
useEffect(() => {
  const mq = window.matchMedia('(max-width: 1023px)')
  const fn = () => setIsMobile(mq.matches)
  fn()
  mq.addEventListener('change', fn)
  return () => mq.removeEventListener('change', fn)
}, [])
```
716~717행 렌더 분기:
```tsx
{selected && (
  isMobile
    ? <MobileGridContent project={selected} onBack={closeProject} />
    : <GridContentArea {...기존 props 그대로} />
)}
```
**morph는 데스크톱 전용이다.** 모바일에서는 morph 없이 즉시 표시한다(세로 스크롤 진입에
가로 트랙 morph는 성립하지 않는다). 따라서 모바일 분기에서는 `contentMode`·`enterRect`를
전달하지 않는다.

### 2-4. 주의 — 모바일에서 morph 관련 상태 오염 방지
`openProject`가 `enterRectRef`·`contentMode`를 설정하는데, 모바일에서는 쓰이지 않으므로
무해하다. 다만 `closeProject`가 `CONTENT_EXIT_MS` 지연 후 `setSelected(null)`을 하므로
모바일에서도 그 지연만큼 잔류한다 — 육안 확인 후 거슬리면 모바일일 때 지연 0으로 분기한다.

---

## 작업 ③ — 카드 썸네일 타이틀 한글 병기

### 3-1. 그리드 카드 — GridExperience.tsx 578행
```jsx
<div className="gm-title">{project.title.en}</div>
      ↓
<div className="gm-title">
  <span className="gm-title-en">{project.title.en}</span>
  {project.title.ko && <span className="gm-title-ko">{project.title.ko}</span>}
</div>
```
en-first(영문 위/한글 아래) 전역 규약을 따른다.

CSS(419~428행 `.gm-title`) 교체 — **높이 예약이 핵심이다.**
현재는 `white-space: nowrap` 1줄 + `height: calc(var(--ts) * ${TITLE_LH * TITLE_LINES})`로
높이를 고정해 격자 정렬을 보장한다. 한글이 아래 줄에 붙으므로 **예약 높이를 2줄분으로 늘린다.**
```css
.gm-title {
  height: calc(var(--ts, 13px) * ${TITLE_LH} + var(--ts, 13px) * ${KO_SCALE} * ${TITLE_LH});
}
.gm-title-en {
  display: block;
  font-size: var(--ts, 13px);
  font-weight: 450;
  line-height: ${TITLE_LH};
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.gm-title-ko {
  display: block;
  font-size: calc(var(--ts, 13px) * ${KO_SCALE});
  font-weight: 350;
  line-height: ${TITLE_LH};
  opacity: 0.55;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  word-break: keep-all;
}
```
상수 추가(`TITLE_LINES` 근처):
```
const KO_SCALE = 0.82   // 카드 한글 타이틀 크기 비 — 영문 대비 위계를 낮춘다
```
**`TITLE_LINES`가 다른 곳에서 참조되면 함께 조정할 것:**
```
grep -n "TITLE_LINES" GridExperience.tsx
```
카드 전체 높이(격자 배치)가 `META_PT`·타이틀·`gm-sum` 합으로 계산된다면 **그 계산식도
2줄분으로 갱신**해야 카드가 겹치지 않는다. 관련 상수를 grep으로 전수 확인:
```
grep -n "META_PT\|SUM_MT\|SUM_LH\|cardH\|CARD_H" GridExperience.tsx
```

### 3-2. 링월 카드 — ProjectWall.tsx `WallCardText`
현재 프로젝트명 렌더:
```jsx
<div style={{ ...타이틀 스타일 }}>
  {project.title.en}
</div>
```
아래로 교체(en-first, 한글은 작게):
```jsx
<div style={{ ...타이틀 스타일 그대로 }}>
  {project.title.en}
</div>
{project.title.ko && (
  <div style={{
    fontFamily: FONT,
    fontSize: 11,
    fontWeight: 350,
    color: '#080706',
    opacity: 0.55,
    lineHeight: 1.3,
    marginTop: 1,
    wordBreak: 'keep-all' as const,
    width: '100%',
    ...(below ? {
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    } : {}),
  }}>
    {project.title.ko}
  </div>
)}
```

**⚠ D2(below) 모드 높이 제약 확인:**
`BELOW_TEXT_H = 44`가 텍스트 행 높이를 고정한다(ProjectWall 상수). 한글 1줄이 추가되면
44px를 넘쳐 잘린다. `BELOW_TEXT_H`를 **58** 정도로 올리고, 이 값이 슬롯 높이 계산
(`getSlotHeight`의 `extra`)에 쓰이므로 **링 물리에 자동 반영**되는지 확인한다:
```
grep -n "BELOW_TEXT_H" ProjectWall.tsx
```
`getSlotHeight`가 `TIER_IMG_HEIGHTS[..] + extra`로 계산하므로 상수만 바꾸면 반영된다.
D1(우정렬) 모드는 높이 제약이 없으므로 그대로 둔다.

---

## 작업 순서
1. 작업 ① — `maxColsForAspect` portrait 2→3. (독립, 가장 안전)
2. 작업 ③-2 — ProjectWall 링월 카드 한글 병기 + `BELOW_TEXT_H` 44→58.
3. 작업 ③-1 — GridExperience 그리드 카드 한글 병기 + `.gm-title` 높이 예약 갱신
   (관련 상수 grep 전수 확인 선행).
4. 작업 ② — MobileProjectWall에서 `MobileSlide`·`MobileInfoSlide` export,
   `MobileGridContent.tsx` 신규 생성, GridExperience 모바일 분기.
   (`getSlides`/`getRestSlides` 실제 시그니처 grep 확인 선행)
5. `npx tsc --noEmit` — 오류 0.

## 절대 불변
- `GridContentArea.tsx` — **수정 금지.** 데스크톱 경로 그대로. 메타 sticky·morph 전부 불변.
- `ContentArea.tsx` — 수정 금지.
- `MobileProjectWall.tsx` — **export 키워드 2개 추가 외 일절 수정 금지.** 링월 모바일 동작 불변.
- film movement 리플로우(`paint`·행우선 배치) — 불변.
- `MIN_COLS = 1`·`MAX_COLS = 6`·`DEFAULT_COLS` — 불변(작업 ①은 함수 반환값만 변경).
- `ProjectCard.tsx` — 미사용 레거시. 이번 작업에서 **건드리지 않는다**(삭제 여부는 별도 판단).

## 검증 (육안)
1. 모바일 세로: 밀도 바로 3열까지 확장되고 카드가 겹치지 않는다.
2. 모바일에서 카드 탭: 세로 스크롤 콘텐츠가 열리고, 상단 BACK으로 그리드 복귀.
   슬라이드 타입(image·diagramSet·text·quote·video·credits) 전부 정상 렌더.
3. 데스크톱: 기존 가로 트랙·morph·메타 sticky 동작에 회귀 없음.
4. 카드 타이틀: 그리드·링월 양쪽에서 영문 위·한글 아래로 표시되고, 격자/링 배치가
   겹치거나 잘리지 않는다. 한글이 없는 프로젝트는 영문만 표시되며 높이가 흔들리지 않는다.
