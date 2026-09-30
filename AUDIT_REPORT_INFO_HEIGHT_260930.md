# AUDIT REPORT — 인포메이션 슬라이드 높이 차이 (링 vs 그리드) (260930)

> 읽기 전용 감사. 본 파일 외 생성·수정·삭제 없음. `ContentArea.tsx`(동결)는 읽기만 함.
> 표기: **[확인]** = 코드 원문으로 확정 / **[추정]** = 브라우저 렌더 값(폰트 메트릭 등)에 의존해 코드만으로 확정 불가.
> 범위: 데스크톱(≥1024px). 모바일은 링=`MobileProjectWall`, 그리드=`MobileGridContent`로 별개 경로이며 본 감사 대상 외.

---

## 결론 요약

1. **[확인]** 두 모드는 인포 슬라이드 컴포넌트를 **공유하지 않는다**. 링 = `ContentArea.tsx` 인라인 JSX, 그리드 = `GridContentArea.tsx`의 `infoContent`. 코드는 복제본이며 간격 상수가 다르다.
2. **[확인] 높이 차이의 주원인 — 기준 뷰포트 높이가 다르다.** 두 모드 모두 `slideH = vpSize.h * 0.72`이지만,
   - 링: `vpSize.h` = **100vh − 80(HEADER_H) − 41(CONTROL_BAR_H) = 100vh − 121**
   - 그리드: `vpSize.h` = **100vh** (`position: fixed; inset: 0` 오버레이 — 헤더·컨트롤 바를 빼지 않음)
   - → 그리드 인포가 **0.72 × 121 = 87.12px 더 높다** (뷰포트 크기와 무관한 고정 차이).
3. **[확인]** 그리드는 그 87px 중 일부를 자체 요소로 다시 쓴다(상단 패딩 28 + BACK 행 + 간격 18). 대신 내부 간격이 링보다 좁다(블록 gap 18 vs 24, 메타 gap 12 vs 14, 타이틀 세트 하단 14 vs 20).
4. **[확인+추정]** 고정 치수만 합산하면 그리드의 콘텐츠 가용 높이가 링보다 **약 60px(수상 있으면 약 66px) 여유**가 있다 → 같은 프로젝트에서도 **링이 먼저 `overflowY: 'auto'` 한계를 넘어** 내부 스크롤이 생긴다. (정확한 px은 BACK 행의 `line-height: normal` 렌더 값에 의존 — §6)

---

## 1. 렌더 컴포넌트

### 1-a. 링 `/work/[slug]`

`src/app/work/[slug]/page.tsx:31`
```tsx
  return <LandingExperience projects={projects} initialSlug={slug} />
```
`src/components/LandingExperience.tsx:6`, `:307`
```tsx
import { ContentArea } from '@/components/ContentArea'
...
          <ContentArea
            project={displayProject}
            mode={activeProject ? 'active' : 'idle'}
            isBlacking={isBlacking}
            visible={layoutVisible}
            onBack={handleBack}
          />
```
인포 본체: `src/components/ContentArea.tsx:969-1095` (트랙 첫 자식 div 내부에 인라인 JSX)
```tsx
                  {/* 트랙 첫 자식 — 정보 슬라이드. 타이틀 세트 + AWARDS + 메타 블록 */}
                  <div style={{
                    width: INFO_SLIDE_W,
```

### 1-b. 그리드 `/work-grid/[slug]`

`src/app/work-grid/[slug]/page.tsx:75`
```tsx
  return <GridExperience projects={projects} initialSlug={slug} />
```
`src/components/GridExperience.tsx:35`, `:733-741`
```tsx
import { GridContentArea } from './GridContentArea'
...
        isMobile ? (
          <MobileGridContent project={selected} onBack={closeProject} />
        ) : (
          <GridContentArea
            project={selected}
            mode={contentMode}
            enterRect={enterRectRef.current}
            onBack={closeProject}
          />
```
인포 본체: `src/components/GridContentArea.tsx:1107` `const infoContent = (` … `:1244` → `:1334` 트랙 첫 자식 div 안에 `{infoContent}`로 렌더.

### 1-c. 공유 여부

**[확인] 공유하지 않음.** 두 파일에 각각 `MetaField` 함수가 따로 정의돼 있다 (`ContentArea.tsx:509`, `GridContentArea.tsx:551`) — 내용은 동일(§4-d). `GridExperience.tsx:5` 주석:
```
// 링월(/work)·랜딩(/)·ContentArea를 일절 건드리지 않는 완전 독립 라우트(/work-grid)의 루트.
```

---

## 2. 슬라이드 높이 산출식

두 파일 공통 상수·식 **[확인]**

| 항목 | ContentArea.tsx | GridContentArea.tsx |
|---|---|---|
| 비율 상수 | `:28` `const SLIDE_H_RATIO = 0.72     // image·credits·info 슬라이드 높이 (뷰포트 대비)` | `:60` 동일 |
| 산출식 | `:620` `const slideH = vpSize.h * SLIDE_H_RATIO` | `:693` 동일 |
| vpSize 출처 | `:606-607` `const w = vp.clientWidth` / `const h = vp.clientHeight` (viewportRef) | `:679-680` 동일 |

→ 차이는 **viewportRef의 `clientHeight`가 무엇이냐**에서만 발생.

### 2-a. 링 — viewportRef 높이 = 100vh − 121

`LandingExperience.tsx:14`
```tsx
const HEADER_H = 80   // 데스크톱 전역 헤더 존(워드마크·nav). 컨트롤 바는 그 아래 CONTROL_BAR_H만큼 별도
```
`ControlBar.tsx:15-19`
```tsx
const PAD_TOP = 8
const PAD_BOTTOM = 20
const ROW_H = 13                          // 11px 텍스트 1행
export const CONTROL_BAR_H = PAD_TOP + ROW_H + PAD_BOTTOM   // = 41
```
`LandingExperience.tsx:226-233` (루트)
```tsx
    <div style={{
      fontFamily: FONT,
      background: '#FFFFFF',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      position: 'relative',
    }}>
```
`LandingExperience.tsx:285-295` (데스크톱 MAIN — ContentArea의 부모)
```tsx
        <div style={{
          position: 'absolute',
          top: HEADER_H + CONTROL_BAR_H,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          gap: 16,
```
`ContentArea.tsx:865-871` (루트, flex 자식) → `:929-937` (viewportRef)
```tsx
        flex: 1,
        minWidth: 0,
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
...
            ref={viewportRef}
            style={{
              width: `calc(100% - ${TRACK_INSET}px)`,
              marginLeft: TRACK_INSET,
              height: '100%',
```
→ **[확인]** `vpSize.h = 100vh − (80 + 41) = 100vh − 121`, `slideH = 0.72 × (100vh − 121)`.

### 2-b. 그리드 — viewportRef 높이 = 100vh

`GridContentArea.tsx:1247-1255` (루트)
```tsx
    <div
      ref={rootRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        height: '100%',
        overflow: 'hidden',
```
`GridContentArea.tsx:1266-1273` (viewportRef)
```tsx
            ref={viewportRef}
            style={{
              width: `calc(100% - ${TRACK_INSET}px)`,
              marginLeft: TRACK_INSET,
              height: '100%',
```
→ **[확인]** 헤더(80)·컨트롤 바(41)를 빼는 코드 없음. `vpSize.h = 100vh`, `slideH = 0.72 × 100vh`.

보조 사실: `GridExperience.tsx`의 루트 `.gx-root`는 `padding-top: ${HEADER_H}px`(스타일 태그)를 갖지만, 오버레이는 `position: fixed`라 이 패딩의 영향을 받지 않는다. `.gx-root` 인라인 스타일에 transform/filter는 없음 **[확인]**. 그 상위 조상(`SiteChromeProvider` 등)에 fixed 기준을 바꾸는 속성이 없는지는 전수 확인하지 않음 **[추정: 없음]**.

### 2-c. 차이

| | 링 | 그리드 | 차이 |
|---|---|---|---|
| vpSize.h | 100vh − 121 | 100vh | 121 |
| slideH (인포 height) | 0.72·vh − 87.12 | 0.72·vh | **87.12px (그리드가 큼)** |
| 예: vh = 900 | 560.88 | 648.00 | 87.12 |
| 예: vh = 800 | 488.88 | 576.00 | 87.12 |

트랙 세로 정렬: 두 파일 모두 트랙 `alignItems: 'center'`, `height: '100%'` (`ContentArea.tsx:962`, `GridContentArea.tsx:1295`) → 인포는 각자 뷰포트 안에서 세로 중앙.

---

## 3. 인포 컨테이너 height / max-height / overflow

### 3-a. 링 — `ContentArea.tsx:970-984`
```tsx
                  <div style={{
                    width: INFO_SLIDE_W,
                    flexShrink: 0,
                    height: slideH,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    gap: 24,
                    fontFamily: FONT,
                    color: '#080706',
                    opacity: infoIn ? 1 : 0,
                    transition: 'opacity 400ms ease',
                    boxSizing: 'border-box',
                    overflowY: 'auto',
                  }}>
```

### 3-b. 그리드 — `GridContentArea.tsx:1310-1333`
```tsx
                  <div style={{
                    width: META_SLOT_W,
                    flexShrink: 0,
                    height: slideH,
                    boxSizing: 'border-box',
                    ...
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    gap: META_GAP,
                    paddingLeft: META_PAD_X,   // 260804: 302 - 16 - 16 = 텍스트 실폭 INFO_SLIDE_W(270) 유지
                    paddingRight: META_PAD_X,
                    paddingTop: META_TOP_PAD,
                    ...
                    opacity: infoIn ? 1 : 0,
                    overflowY: 'auto',
                  }}>
                    {infoContent}
                  </div>
```

| 속성 | 링 | 그리드 |
|---|---|---|
| height | `slideH` | `slideH` |
| max-height | 없음 | 없음 |
| overflowY | `'auto'` | `'auto'` |
| box-sizing | border-box | border-box |
| padding-top | 없음 | `META_TOP_PAD` = 28 (`:66`) → **height 안에서 차감** |
| 가로 폭 | `INFO_SLIDE_W` = 270 (`:11`) | `META_SLOT_W` = 270 + 16×2 = 302 (`:30-36`), 텍스트 실폭 270 |

→ **[확인]** 텍스트 줄바꿈 폭은 양쪽 모두 270px로 같다 (줄 수 차이는 없음).
→ 인포 스타일은 두 파일 모두 인라인 지정. `grep -nE "info|meta" src/app/globals.css` 0건 — 전역 CSS 개입 없음 [확인].

---

## 4. 인포 내부 세로 간격 — 전 상수·스타일

### 4-a. 공통 상수

| 상수 | ContentArea.tsx | GridContentArea.tsx |
|---|---|---|
| `TITLE_SET_MIN_H` | `:16` `= 160` | `:41` `= 160` |
| `META_MARGIN` | **없음** | `:68` `= 24` — 주석 "sticky 최좌측 고정선 — 뷰포트 좌측 여백". **가로 sticky 보정용**(`:754` `metaShift = Math.max(0, META_MARGIN - (TRACK_INSET - scrollPos))`) → **세로 치수와 무관** [확인] |
| `META_GAP` | 없음 (리터럴 `gap: 24`) | `:67` `= 18` — "메타 세로 스택 gap (기존 24 → 18, 하단 압축)" |
| `META_TOP_PAD` | 없음 | `:66` `= 28` — "BACK 위 상단 여백" |

### 4-b. 블록 구성과 간격 (위→아래)

| 순서 | 링 (`ContentArea.tsx`) | 그리드 (`GridContentArea.tsx`) |
|---|---|---|
| 0 | — | 상단 padding **28** (`:1325`) |
| 1 | — | BACK 행 `<div><button>` (`:1111-1131`) |
| gap | — | **18** |
| 2 | 타이틀 세트 `minHeight: 160, marginBottom: 20` (`:986`) | 타이틀 세트 `minHeight: TITLE_SET_MIN_H, marginBottom: 14` (`:1135`) |
| gap | **24** | **18** |
| 3 (조건부) | AWARDS `gap: 4` (`:1025`) | AWARDS `gap: 4` (`:1172`) |
| gap | 24 | 18 |
| 4 | CLIENT·LOCATION `gap: 14` (`:1041`) | CLIENT·LOCATION `gap: 12` (`:1191`) |
| gap | 24 | 18 |
| 5 | TYPOLOGY·SIZE·STATUS·YEAR `gap: 14` (`:1047`) | 같은 4개 `gap: 12` (`:1197`) |
| gap | 24 | 18 |
| 6 | ROLE | ROLE |

### 4-c. 타이틀 세트 내부 (두 파일 동일 [확인])

`ContentArea.tsx:986-1017` = `GridContentArea.tsx:1135-1166`
```tsx
      <div style={{ minHeight: TITLE_SET_MIN_H, marginBottom: 14 }}>   // 링은 minHeight: TITLE_SET_MIN_H, marginBottom: 20
        <div style={{ fontSize: 9, fontWeight: 300, letterSpacing: '0.15em', opacity: 0.35, marginBottom: 6 }}>
          {String(project.careerNo).padStart(3, '0')}
        </div>
        <BilingualText ...
          primaryStyle={{ fontSize: 16, fontWeight: 500, lineHeight: 1.35, ... }}
          secondaryStyle={{ fontSize: 12, fontWeight: 400, lineHeight: 1.3, ... }}
          gap={2}
        />
        {project.subtitle && (
          <div style={{ marginTop: 8 }}>
            <BilingualText ...
              primaryStyle={{ fontSize: 11, fontWeight: 300, lineHeight: 1.4, ... }}
              secondaryStyle={{ fontSize: 10, fontWeight: 300, lineHeight: 1.4, ... }}
              gap={1}
```

### 4-d. `MetaField` — 결과 라벨↔값 간격, 라벨·값 폰트 (두 파일 동일 [확인])

`ContentArea.tsx:509-534` = `GridContentArea.tsx:551-576`
```tsx
function MetaField({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div style={{
        fontSize: 9,
        fontWeight: 300,
        letterSpacing: '0.1em',
        opacity: 0.45,
        whiteSpace: 'nowrap',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 11,
        fontWeight: 400,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        marginTop: 3,
        lineHeight: 1.4,
        wordBreak: 'keep-all',
        opacity: value ? 1 : 0.25,
      }}>
        {value || '—'}
      </div>
    </div>
  )
}
```
| 요소 | font-size | line-height | 간격 |
|---|---|---|---|
| 라벨 | 9 | 지정 없음 → 상속 (`globals.css` `body`에 line-height 없음 = 브라우저 `normal`) | — |
| 라벨↔값 | — | — | `marginTop: 3` |
| 값 | 11 | 1.4 (= 15.4px/줄) | — |
| 메타 항목 간 | — | — | 링 **14** / 그리드 **12** |

`globals.css:354-361` (body — line-height 미지정 [확인])
```css
body {
  background-color: #080706;
  color: #FFFFFF;
  font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  min-height: 100%;
}
```

### 4-e. AWARDS 항목 (두 파일 동일 [확인])
`ContentArea.tsx:1027-1034` = `GridContentArea.tsx:1174-1181`
```tsx
fontSize: 15, fontWeight: 400, color: '#b89773', letterSpacing: '0.01em', lineHeight: 1.35, wordBreak: 'keep-all',
```
→ 1줄 20.25px, 항목 간 `gap: 4`.

### 4-f. ROLE (두 파일 동일 [확인])
`ContentArea.tsx:1058-1093` = `GridContentArea.tsx:1208-1242`
```tsx
        <div style={{ fontSize: 9, fontWeight: 300, letterSpacing: '0.1em', opacity: 0.45 }}>
          ROLE
        </div>
        ...
              <div style={{ fontSize: 11, fontWeight: 400, letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: 3 }}>
                {position}
              </div>
              {tasks && (
                <div style={{ fontSize: 9, fontWeight: 300, lineHeight: 1.6, opacity: 0.5, marginTop: 4, wordBreak: 'keep-all' }}>
                  {tasks}
                </div>
              )}
```
| 요소 | font-size | line-height | margin |
|---|---|---|---|
| ROLE 라벨 | 9 | normal (상속) | — |
| 직위(position) | 11 | normal (상속) | top 3 |
| 업무 상세(tasks) | 9 | 1.6 (= 14.4px/줄) | top 4 |

---

## 5. BACK 버튼

### 5-a. 링 — 인포 **밖** (절대 위치 오버레이) [확인]
`ContentArea.tsx:1157-1185`
```tsx
          {/* ── Back + 타이틀 — 좌상단 오버레이 (트랙 위, 배경 투명) ── */}
          <div style={{
            position: 'absolute',
            top: 32,
            left: 24,
            zIndex: 6,
            fontFamily: FONT,
            color: '#080706',
          }}>
            <button
              onClick={onBack}
              style={{
                display: 'block',
                background: 'none',
                border: 'none',
                padding: 0,
                fontFamily: FONT,
                fontSize: 11,
                ...
              }}
            >
              ← Back
            </button>
```
→ ContentArea 루트 기준 top 32. viewportRef·트랙의 **형제**이므로 인포 높이 **차지 0**.

### 5-b. 그리드 — 인포 스크롤 영역 **안** (첫 행) [확인]
`GridContentArea.tsx:1109-1131`
```tsx
      {/* ── Back — 정보 슬라이드 최상단(careerNo 위). 좌상단 로고와 겹치지 않도록
          오버레이가 아니라 트랙 안에 둔다 (v2 §3). 링월 ContentArea의 버튼 스타일 동일 ── */}
      <div>
        <button
          onClick={onBack}
          ...
          style={{
            display: 'block',
            ...
            padding: 0,
            fontFamily: FONT,
            fontSize: 11,
```
→ `infoContent`의 첫 자식 → 인포 컨테이너(`overflowY: auto`) 안. 차지 높이 = **padding 28 + BACK 행 높이(B) + gap 18**.
→ B = 11px 글자의 `line-height: normal` 값 — **[추정] 약 13px** (Pretendard의 normal 행높이 비율에 의존, 렌더 측정 안 함). `<button>`의 UA 기본 line-height가 `normal`인지도 브라우저 의존 **[추정]**.

---

## 6. 두 모드 인포 세로 치수 비교

### 6-a. 컨테이너

| 항목 | 링 | 그리드 | 그리드 − 링 | 구분 |
|---|---|---|---|---|
| 기준 뷰포트 높이 | 100vh − 121 | 100vh | +121 | 확인 |
| 인포 height (`slideH`) | 0.72·vh − 87.12 | 0.72·vh | **+87.12** | 확인 |
| 상단 padding | 0 | 28 | +28 | 확인 |
| **콘텐츠 가용 높이** | 0.72·vh − 87.12 | 0.72·vh − 28 | **+59.12** | 확인 |

### 6-b. 콘텐츠 고정 치수 (텍스트 줄 수와 무관한 값만)

| 항목 | 링 | 그리드 | 그리드 − 링 | 구분 |
|---|---|---|---|---|
| BACK 행 | 0 (인포 밖) | B ≈ 13 | +B | 추정(B) |
| BACK 아래 gap | 0 | 18 | +18 | 확인 |
| 타이틀 세트 minHeight | 160 | 160 | 0 | 확인 |
| 타이틀 세트 marginBottom | 20 | 14 | −6 | 확인 |
| 블록 간 gap (타이틀→CLIENT→2블록→ROLE, 3회) | 3×24 = 72 | 3×18 = 54 | −18 | 확인 |
| (수상 있을 때) 추가 블록 gap 1회 | +24 | +18 | −6 | 확인 |
| CLIENT·LOCATION 내부 gap (1회) | 14 | 12 | −2 | 확인 |
| TYPOLOGY~YEAR 내부 gap (3회) | 42 | 36 | −6 | 확인 |
| MetaField 6개 · ROLE · 타이틀/수상 텍스트 | 동일 | 동일 | 0 | 확인(스타일 동일, 폭 270 동일) |
| **고정 치수 합 (수상 없음)** | 308 | 294 + B | **B − 14 ≈ −1** | 추정(B) |
| **고정 치수 합 (수상 있음)** | 332 | 312 + B | **B − 20 ≈ −7** | 추정(B) |

> 위 합에서 그리드는 BACK(B+18)을 포함하고 패딩 28은 6-a의 가용 높이에서 이미 뺐다.

### 6-c. 순 여유 (가용 높이 − 고정 치수)

| 조건 | 그리드 여유 − 링 여유 | 구분 |
|---|---|---|
| 수상 없음 | 59.12 − (B − 14) ≈ **+60px** | 추정(B≈13) |
| 수상 있음 | 59.12 − (B − 20) ≈ **+66px** | 추정(B≈13) |

→ 같은 프로젝트·같은 뷰포트에서 **링의 인포는 그리드보다 약 60–66px 먼저 넘친다**. 두 모드의 텍스트 줄 수는 같으므로(폭 270 동일) 이 차이가 곧 "링에서만 내부 스크롤이 생기는" 구간이다.

### 6-d. 수치 예 (vh = 900, 수상 없음, B ≈ 13 — **추정**)

| | 링 | 그리드 |
|---|---|---|
| 인포 height | 560.88 | 648.00 |
| 콘텐츠 가용 | 560.88 | 620.00 |
| 고정 치수 | 308 | ≈ 307 |
| 텍스트용 잔여 (MetaField 6개·ROLE·타이틀 초과분) | ≈ 252.9 | ≈ 313 |

MetaField 1개 ≈ 라벨 9×normal(≈10.7, 추정) + 3 + 15.4 ≈ 29 → 6개 ≈ 175 (추정). ROLE ≈ 라벨 ≈10.7 + 3 + 직위 ≈13 + 4 + 업무 14.4×줄수 (추정).
→ 링 잔여 ≈ 252.9 − 175 − 30.7 ≈ **47px ≈ 업무 상세 3줄**까지 수용, 그 이상이거나 수상·긴 타이틀이 있으면 스크롤 발생 (추정). 그리드는 같은 조건에서 약 60px(업무 상세 약 4줄분) 더 수용.

---

## 부록 — 원인 판정 요약

| # | 원인 | 영향 | 구분 |
|---|---|---|---|
| 1 | 그리드 오버레이가 `fixed; inset: 0`으로 전체 vh를 기준으로 삼고, 링은 헤더 80 + 컨트롤 바 41을 뺀 영역을 기준으로 삼음 | 인포 height 87.12px 차이 (주원인) | 확인 |
| 2 | 그리드만 BACK을 인포 안에 두고 상단 패딩 28을 둠 | 그리드 가용 높이 −(28 + B + 18) | 확인 (B는 추정) |
| 3 | 그리드만 간격을 압축(24→18, 14→12, 20→14) | 그리드 고정 치수 −32 (수상 시 −38) | 확인 |
| 4 | 1–3의 순효과 | 링이 약 60–66px 먼저 넘침 | 추정(B 의존) |
