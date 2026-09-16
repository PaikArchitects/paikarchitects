# LANDING_SWITCH_P1_1_260916 — 공용 컨트롤 바 · 그리드 열 범위 재설정

대상: paikarchitects.com
근거: `AUDIT_REPORT_controls_260916.md`, 데스크톱·모바일 실물 스크린샷(2026-09-16)
선행: `LANDING_SWITCH_P1_260916.md` (배포 완료)

---

## 0. 범위와 절대 제약

### 0-1. 목표
1. 링월·그리드의 필터 + 뷰 토글을 **단일 컴포넌트 `ControlBar`**로 통일한다.
   - 필터는 좌측 정렬, 토글은 우측에 둔다.
   - 세로 위치는 현행 그리드 위치(헤더 존 80px 아래)로 맞춘다.
   - 두 모드가 같은 컴포넌트를 렌더하므로 위치·간격이 구조적으로 일치한다.
2. P1의 결함을 해소한다. 링월 필터 바의 좌우 대칭 예약 160px 때문에 1920px 폭에서도 `LANDSCAPE`가 잘린다.
3. 그리드 열 범위를 조정한다.
   - 데스크톱(≥1024): **3열 이상**.
   - 모바일(<1024): **1열부터 유지**.
   - 세로 화면 상한: **3 → 5열**.
4. 카드 폭이 좁은 열 수에서는 카드 하단 텍스트를 숨긴다.
5. 모바일 밀도 바가 5개 아이콘을 수용하도록 조정한다.

**본 차수 제외**: 링월 모바일 토글(위치 미정, 후속 차수).

### 0-2. 수정 허용 파일 (이 목록 외 수정 금지)
| 파일 | 허용 범위 |
|---|---|
| `src/components/ControlBar.tsx` | **신규** |
| `src/components/LandingExperience.tsx` | §3 |
| `src/components/GridExperience.tsx` | §2, §4, §5 |

`ViewToggle.tsx`는 수정하지 않는다(ControlBar가 import해서 사용).

### 0-3. 수정 금지
`ContentArea.tsx`, `ProjectWall.tsx`, `MobileProjectWall.tsx`, `useRingWall.ts`, `GridContentArea.tsx`, `MobileGridContent.tsx`, `SiteHeader.tsx`, `SiteChromeContext.tsx`, `ViewToggle.tsx`, `globals.css`, `src/app/**`, `sanity/**`

### 0-4. 실행 규칙
- 검증은 `npx tsc --noEmit`만 허용한다. `npm run dev` / `npm run build` / `npm install`은 금지한다.
- 각 절의 "사전 확인"은 수정 전에 실행해 결과를 보고에 기록한다.
- 결과가 명세의 중단 조건에 해당하면 **그 절을 수행하지 않고** 사실만 보고한다.

---

## 1. 사전 확인 — 링월 본문 높이 축소의 안전성 (읽기 전용, 중단 조건 있음)

§3에서 링월 데스크톱 본문(MAIN) 시작점을 80에서 121로 내린다. 월과 콘텐츠 영역의 컨테이너 높이가 41px 줄어든다.

`ContentArea.tsx`와 `ProjectWall.tsx`가 세로 치수를 **컨테이너가 아니라 창 높이에서** 파생하면, 히어로 하단이 잘린다. 이를 먼저 확인한다.

**사전 확인** — 두 파일에서 아래 패턴의 전 출현을 줄 번호·원문 ±3줄로 기록한다.
- `window.innerHeight`
- `innerHeight`
- `100vh`
- `vh`(문자열 리터럴 내)
- `HEADER`
- 숫자 리터럴 `80`
- `getBoundingClientRect`
- `clientHeight`

**중단 조건** — 세로 치수(슬라이드 높이, 월 슬롯 높이, 컨테이너 높이)를 `window.innerHeight` 또는 `100vh`에서 직접 계산하는 코드가 **하나라도 있으면** 다음과 같이 처리한다.
- §3-4(MAIN top 변경)만 **보류**한다.
- 이 경우 §3의 컨트롤 바 wrapper는 `top: HEADER_H` 대신 **기존 필터 바 위치 `top: 50`**에 둔다. 좌측 정렬 통일만 먼저 적용하는 것이다.
- 해당 코드를 보고한다.

위 코드가 없거나, 컨테이너(부모 요소) 치수로만 계산하면 §3을 전부 수행한다.

---

## 2. 공용 컨트롤 바 — `src/components/ControlBar.tsx` 신규

현 그리드 컨트롤 바(`GridExperience.tsx` 489–534행)의 시각 사양을 기준으로 한다. 여기에 링월 필터 바의 오버플로 어포던스(좌우 페이드·화살표·휠 가로 스크롤)를 합친다.

```tsx
'use client'

// ── ControlBar — 링월·그리드 공용 컨트롤 바 (LANDING_SWITCH_P1_1 §2) ──
// 필터(좌, 가로 스크롤) + 뷰 토글(우). 두 모드가 이 컴포넌트 하나를 렌더하므로
// 위치·간격·타이포가 구조적으로 일치한다. 높이는 상수 CONTROL_BAR_H로 고정한다 —
// 링월은 이 값으로 본문 시작점을 파생한다(측정 반응형 금지).
// 오버플로 감지(scrollLeft/scrollWidth)는 레이아웃 치수가 아니라 페이드 표시 전용이다.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ViewToggle, type ViewMode } from './ViewToggle'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"

export const CONTROL_BAR_UI_PAD = 34     // 좌우 여백 — 그리드 UI_PAD와 동일값
const PAD_TOP = 8
const PAD_BOTTOM = 20
const ROW_H = 13                          // 11px 텍스트 1행
export const CONTROL_BAR_H = PAD_TOP + ROW_H + PAD_BOTTOM   // = 41
const CHIP_GAP = 24
const FADE_W = 32

interface ControlBarProps {
  types: string[]
  active: string
  onSelect: (t: string) => void
  view: ViewMode
  filtersVisible?: boolean   // 링월 idle 랜딩(/)에서는 필터만 숨긴다. 토글은 상시
}

export function ControlBar({ types, active, onSelect, view, filtersVisible = true }: ControlBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [fade, setFade] = useState({ left: false, right: false })

  const updateFade = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const left = el.scrollLeft > 1
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
    setFade(f => (f.left === left && f.right === right ? f : { left, right }))
  }, [])

  useLayoutEffect(() => {
    updateFade()
    window.addEventListener('resize', updateFade)
    return () => window.removeEventListener('resize', updateFade)
  }, [updateFade, types])

  // 세로 휠 → 가로 스크롤. 넘칠 때만 가로채고 페이지 스크롤을 막는다(passive:false 필요)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const fadeStyle = (side: 'left' | 'right', on: boolean) => ({
    position: 'absolute' as const,
    top: 0,
    bottom: 0,
    [side]: 0,
    width: FADE_W,
    display: 'flex',
    alignItems: 'center',
    justifyContent: side === 'left' ? 'flex-start' : 'flex-end',
    background: `linear-gradient(to ${side === 'left' ? 'right' : 'left'}, #FFFFFF, rgba(255,255,255,0))`,
    color: '#080706',
    fontSize: 13,
    opacity: on ? 1 : 0,
    transition: 'opacity 200ms ease',
    pointerEvents: 'none' as const,
  })

  return (
    <div style={{
      height: CONTROL_BAR_H,
      boxSizing: 'border-box',
      paddingTop: PAD_TOP,
      paddingBottom: PAD_BOTTOM,
      paddingLeft: CONTROL_BAR_UI_PAD,
      paddingRight: CONTROL_BAR_UI_PAD,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 24,
      fontFamily: FONT,
    }}>
      <div style={{
        position: 'relative',
        flex: 1,
        minWidth: 0,
        height: ROW_H,
        opacity: filtersVisible ? 1 : 0,
        pointerEvents: filtersVisible ? 'auto' : 'none',
        transition: 'opacity 300ms ease-out',
      }}>
        <div
          ref={scrollRef}
          className="mpw-chips"
          onScroll={updateFade}
          style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: CHIP_GAP,
            overflowX: 'auto',
            overflowY: 'hidden',
            touchAction: 'pan-x',
          }}
        >
          {types.map(t => (
            <button
              key={t}
              onClick={() => onSelect(t)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontFamily: FONT,
                fontSize: 11,
                lineHeight: `${ROW_H}px`,
                fontWeight: t === active ? 500 : 300,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#080706',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <span style={{
                fontSize: 7,
                lineHeight: 1,
                opacity: t === active ? 1 : 0,
                transition: 'opacity 200ms',
              }}>●</span>
              {t}
            </button>
          ))}
        </div>
        <div style={fadeStyle('left', fade.left)}>‹</div>
        <div style={fadeStyle('right', fade.right)}>›</div>
      </div>

      <ViewToggle current={view} />
    </div>
  )
}
```

**확인 사항**
- `ViewToggle.tsx`가 `ViewMode` 타입을 export하는지 확인한다(P1에서 `export type ViewMode` 작성됨).
- 없으면 중단하고 보고한다.

---

## 3. 링월 — `LandingExperience.tsx`

### 3-1. 사전 grep (`LandingExperience.tsx`) — 전 결과 기록
- `filterScrollRef`
- `updateFilterFade`
- `handleFilterWheel`
- `filterFade`
- `setFilterFade`
- `VIEW_TOGGLE_RESERVE`
- `VIEW_TOGGLE_RIGHT`
- `ViewToggle`
- `mpw-chips`
- `HEADER_H`

### 3-2. 삭제 (참조 전수)
아래 식별자의 **선언과 모든 참조**를 삭제한다. 관련 useEffect 등 이 식별자를 위해서만 존재하는 코드 블록도 함께 삭제한다.
- 필터 바 블록 전체 — 주석 `FILTER BAR`부터 그 `{!mobile && ( … )}` 닫힘까지. 스크롤 컨테이너(`mpw-chips`)와 좌우 페이드 div 2개를 포함한다.
- 뷰 토글 블록 전체 — 주석 `VIEW TOGGLE`부터 그 `{!mobile && ( … )}` 닫힘까지.
- `filterScrollRef` (useRef 선언)
- `updateFilterFade` (함수 선언 + 호출하는 effect/핸들러)
- `handleFilterWheel` (함수 선언)
- `filterFade` / `setFilterFade` (useState 선언)
- `VIEW_TOGGLE_RESERVE`, `VIEW_TOGGLE_RIGHT` 상수와 그 위 주석 2줄(16–17행)
- `import { ViewToggle } from './ViewToggle'`

삭제로 인해 미사용이 되는 React import(`useRef` 등)가 있으면, 다른 사용처가 0건인 경우에만 import에서 제거한다.

### 3-3. ControlBar 삽입
- import 추가: `import { ControlBar, CONTROL_BAR_H } from './ControlBar'`
- 3-2에서 삭제한 필터 바 자리(root div 첫 자식)에 아래 코드를 삽입한다.

```tsx
      {/* ── CONTROL BAR — 필터(좌) + 뷰토글(우). 그리드와 동일 컴포넌트·동일 위치 (LANDING_SWITCH_P1_1 §3) ──
           필터는 필터 브라우징 상태(showFilters)에서만, 토글은 레이아웃 공개 후 상시 */}
      {!mobile && (
        <div style={{
          position: 'absolute',
          top: HEADER_H,
          left: 0,
          right: 0,
          zIndex: 50,
          opacity: layoutVisible ? 1 : 0,
          pointerEvents: layoutVisible ? 'auto' : 'none',
          transition: 'opacity 400ms ease-out',
        }}>
          <ControlBar
            types={FILTER_TYPES}
            active={activeFilter}
            onSelect={handleFilter}
            view="ring"
            filtersVisible={showFilters}
          />
        </div>
      )}
```

- §1 중단 조건에 해당하면 위 `top: HEADER_H`를 `top: 50`으로 둔다.
- `layoutVisible`은 기존 선언을 사용한다.

### 3-4. MAIN 시작점 (§1 중단 조건 미해당 시에만)
- MAIN 블록의 `top: HEADER_H` → `top: HEADER_H + CONTROL_BAR_H`
- `HEADER_H` 상수 주석을 수정한다.
  - 변경 전: `// 데스크톱 헤더 존. 필터 행 포함 여유치`
  - 변경 후: `// 데스크톱 전역 헤더 존(워드마크·nav). 컨트롤 바는 그 아래 CONTROL_BAR_H만큼 별도`

### 3-5. 사후 grep (`LandingExperience.tsx`)
| 패턴 | 기대 |
|---|---|
| `filterScrollRef` / `updateFilterFade` / `handleFilterWheel` / `filterFade` | 0건 |
| `VIEW_TOGGLE_` | 0건 |
| `ViewToggle` | 0건 |
| `mpw-chips` | 0건 |
| `ControlBar` | import 1 + JSX 1 |

---

## 4. 그리드 컨트롤 바 교체 — `GridExperience.tsx`

### 4-1. 사전 grep
- `ViewToggle`
- `CONTROLS`
- `UI_PAD`

### 4-2. 작업
1. `{/* ── CONTROLS — 필터(좌) + 뷰토글 Ring|Grid(우) ── */}` 주석부터 컨트롤 바 외곽 `</div>`(현 489–534행)까지 **블록 전체**를 아래 코드로 교체한다.

```tsx
      {/* ── CONTROLS — 링월과 동일 컴포넌트 (LANDING_SWITCH_P1_1 §4) ── */}
      <ControlBar
        types={FILTER_TYPES}
        active={activeFilter}
        onSelect={t => { if (t !== activeFilter) { startFlow(); setActiveFilter(t) } }}
        view="grid"
      />
```

2. import를 정리한다.
   - `import { ViewToggle } from './ViewToggle'`와 그 위 주석 1줄(36행)을 삭제한다.
   - `import { ControlBar } from './ControlBar'`를 추가한다.
3. `UI_PAD` 상수는 유지한다(paint에서 사용 중).
   - 주석 끝에 ` — ControlBar의 CONTROL_BAR_UI_PAD와 동일값 유지`를 덧붙인다.

### 4-3. 사후 grep (`GridExperience.tsx`)
| 패턴 | 기대 |
|---|---|
| `ViewToggle` | 0건 |
| `ControlBar` | import 1 + JSX 1 |

---

## 5. 그리드 열 범위 · 좁은 카드 텍스트 · 모바일 밀도 바 — `GridExperience.tsx`

### 5-1. 사전 grep — 전 출현 줄 번호·원문 기록
- `MIN_COLS`: 감사 기준 50, 180, 181, 205, 207, 208, 214, 215, 351, 387, 390
- `maxColsForAspect`
- `isMobile`
- `gm-meta`

### 5-2. 열 하한을 모드별로 — `MIN_COLS` 상수 폐지

1. 50행 `const MIN_COLS = 1 …` 줄을 **삭제**한다.
   - 먼저 삭제한 뒤 `npx tsc --noEmit`을 실행해 잔존 참조를 오류로 드러낸다.
2. 상수 영역에 추가한다.

```tsx
const MIN_COLS_DESKTOP = 3      // 데스크톱(≥1024) 하한 — 1·2열 제거 (260916)
const MIN_COLS_MOBILE = 1       // 모바일(<1024) 하한 유지
```

3. 컴포넌트 내부, `isMobile` 선언·effect(현 167–174행) **바로 아래**에 추가한다.

```tsx
  const minCols = isMobile ? MIN_COLS_MOBILE : MIN_COLS_DESKTOP
```

4. tsc 오류로 드러난 **모든** `MIN_COLS` 참조를 `minCols`로 교체한다. 감사 기준 10곳이다.
   - 180·181행의 `useRef`/`useState` 초기값: `clamp(DEFAULT_COLS, minCols, MAX_COLS)` 형태로 교체한다. 초기값은 1회만 평가되며, DEFAULT_COLS=3이 두 범위에 모두 포함되므로 안전하다.
5. `minCols`를 참조하게 된 **모든 `useCallback` / `useEffect` / `useMemo`의 의존성 배열에 `minCols`를 추가**한다.
   - 누락하면 모바일↔데스크톱 전환 시 구 하한이 유지되는 stale closure가 생긴다.
   - 대상 목록(행 번호·훅 이름·추가 전후 배열)을 보고에 기록한다.
6. 모바일→데스크톱 전환 시 현재 열 수가 1·2이면 새 하한으로 재정착해야 한다.
   - 현 351행 부근 로직(`clamp(colsRef.current, MIN_COLS, maxCols)`)이 포함된 effect의 의존성에 `minCols`가 들어가면 자동 재평가된다.
   - 그 effect가 재정착(`animateTo` 또는 paint + 라벨 갱신)까지 수행하는지 원문을 보고한다.
   - 수행하지 않는다면 **추가 구현하지 말고 보고만** 한다.
7. 10행대 파일 머리 주석과 49행 `SLIDE_H_RATIO` 주석의 "1열 폭 공식"은 모바일 1열에서 여전히 유효하므로 유지한다.

### 5-3. 세로 화면 열 상한 3 → 5
`maxColsForAspect`를 수정한다.

```tsx
function maxColsForAspect(r: number): number {
  if (r < 0.85) return 5        // portrait — 260916: 3→5 (모바일 밀도 상한 상향, 좁은 카드는 텍스트 숨김 §5-4)
  if (r < 1.25) return 4        // ~square
  return 6                      // landscape
}
```

주의: 정사각형 구간(0.85–1.25)의 상한 4가 세로 구간 5보다 작아진다. 의도된 값이며 이번 차수에서 변경하지 않는다.

### 5-4. 좁은 카드 하단 텍스트 숨김 — 정수 열 기준 이산 판정
**원리**
- 텍스트 표시 여부를 연속 폭이 아니라 **목표 정수 열 수 `nr`에서의 카드 폭**으로 판정한다.
- 표시 전환(행 피치 변화)은 `nr`이 바뀌는 스냅 순간에만 일어난다. 이때 전 카드가 이미 CSS transition(transform·height)으로 트윈 이동하므로, 피치 변화도 같은 트윈에 흡수된다.
- 드래그 중 연속 구간에서는 판정이 바뀌지 않는다.

1. 상수 추가:

```tsx
const META_MIN_W = 80           // 정수 열 기준 카드 폭이 이 미만이면 하단 텍스트 숨김 (260916)
```

2. `paint` 내부(현 226–266행)의 `const mH = metaH(cardW)`를 아래로 교체한다.

```tsx
      // 목표 정수열(nr)에서의 카드 폭으로 텍스트 표시를 판정 — 스냅 순간에만 바뀐다 (P1_1 §5-4)
      const cardWAtNr = nr <= 1 ? heroW : Math.max(1, (full - GAP * (nr - 1)) / nr)
      const showMeta = cardWAtNr >= META_MIN_W
      const mH = showMeta ? metaH(cardW) : 0
```

   `heroW`, `full`, `nr`이 이 줄보다 **앞에서** 선언돼 있는지 확인한다. `nr`이 뒤에 선언돼 있으면 선언 순서만 앞으로 옮긴다(값·식 불변).

3. 같은 루프에서 카드 엘리먼트마다 `el.dataset.meta = showMeta ? '1' : '0'`을 추가한다(`--ts` setProperty 줄 아래).
4. 인라인 `<style>`의 `.gm-meta` 규칙(현 446행 `.gm-meta { padding-top: … }`) 바로 아래에 추가한다.

```css
        .gm-meta { transition: opacity ${FADE_MS}ms ease; }
        .gm-card[data-meta="0"] .gm-meta { opacity: 0; pointer-events: none; }
```

5. `gridRef` 높이 계산식은 `pitch`를 쓰므로 변경하지 않는다(`pitch`가 `mH`를 포함).

### 5-5. 모바일 밀도 바 폭
밀도 바 외곽 div(현 610–625행)의 `width`와 `DENSITY` 라벨을 모바일에서만 조정한다.

1. `width: 'min(440px, 64vw)'` → `width: isMobile ? 'calc(100vw - 48px)' : 'min(440px, 64vw)'`
2. `Density` 라벨 `<span>`에 `display: isMobile ? 'none' : undefined`를 스타일로 추가한다.
3. 610행 주석 끝에 ` / 모바일은 폭 확장·라벨 숨김(5아이콘 수용, P1_1 §5-5)`을 덧붙인다.

---

## 6. 검증

### 6-1. 코드
1. `npx tsc --noEmit` → 오류 0
2. grep 결과를 확인한다.

| 패턴 | 범위 | 기대 |
|---|---|---|
| `MIN_COLS\b` | `src/` | 0건 (`MIN_COLS_DESKTOP`·`MIN_COLS_MOBILE`만 존재) |
| `ViewToggle` | `src/` | `ViewToggle.tsx`, `ControlBar.tsx`만 |
| `ControlBar` | `src/` | `ControlBar.tsx`, `LandingExperience.tsx`, `GridExperience.tsx` |
| `mpw-chips` | `src/components` | `ControlBar.tsx`만 |
| `VIEW_TOGGLE_` | `src/` | 0건 |

3. `git status`로 §0-2 허용 목록 외 변경이 0건임을 확인한다.

### 6-2. 육안 (사용자)
**데스크톱**
1. `/work`와 `/work-grid`를 번갈아 열었을 때 필터 첫 칩(ALL)과 토글의 위치가 픽셀 단위로 같다.
2. 1920px 폭에서 링월의 `LANDSCAPE`까지 잘리지 않는다. D2 폭에서는 넘친 칩이 우측 페이드와 `›`로 표시되고, 휠로 가로 스크롤된다.
3. 그리드에서 칩 위로 휠을 굴릴 때, 칩이 넘치지 않는 폭에서는 페이지가 정상적으로 세로 스크롤된다.
4. `/` 첫 진입 시 인트로 중에는 바 전체가 숨겨진다. 인트로 후에는 토글만 보이고 필터는 숨겨져 있다. 필터 선택이나 `/work` 진입 시 필터가 나타난다.
5. 링월 월·히어로가 컨트롤 바와 겹치지 않고, 하단이 잘리지 않는다.
6. 그리드 밀도 바에 3·4·5·6열만 표시되고, 1·2열로 갈 수 없다.

**모바일(휴대폰 세로)**

7. 밀도 바에 1–5열 아이콘 5개가 겹치지 않고 표시된다.
8. 390pt 폭 기준으로 3열에서는 타이틀이 보이고, 4·5열에서는 이미지만 보인다. 전환 시 카드가 끊김 없이 재배치된다.
9. 5열 → 1열 → 3열을 오가도 격자 간격이 어긋나지 않는다.

---

## 7. 작업 보고 형식
- §1 사전 확인 결과와 중단 조건 해당 여부
- 각 절 사전·사후 grep 결과
- §5-2 5번의 의존성 배열 변경 목록, 6번의 재정착 동작 원문
- §6-1 결과표
- 중단·보류 항목과 사유
