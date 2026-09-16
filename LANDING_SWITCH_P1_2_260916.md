# LANDING_SWITCH_P1_2_260916 — 모바일 링월 컨트롤 바 (헤더 아래 한 줄)

대상: paikarchitects.com
선행: `LANDING_SWITCH_P1_1_260916.md` **적용 완료 후** 실행 (`ControlBar`·`CONTROL_BAR_H` 존재 전제)
결정: 모바일 링월→그리드 토글은 A안(그리드처럼 헤더 아래 한 줄) — 2026-09-16 사용자 확정

---

## 0. 범위와 절대 제약

### 0-1. 목표
1. 모바일(<1024) 링월에 `ControlBar`(토글)를 헤더 바 바로 아래 한 줄로 추가한다.
   - 그리드 모바일과 **같은 컴포넌트·같은 세로 위치**로 둔다.
2. 모바일 두 모드의 컨트롤 바 시작점을 **모바일 헤더 바 하단(56)**으로 통일한다.
   - 현재 그리드 모바일은 데스크톱 값 80을 그대로 써서 헤더 바 아래 24px 빈 띠가 있다. 모바일은 세로 공간이 귀하므로 56으로 붙인다.
   - 결과: 모바일 콘텐츠 시작점은 두 모드 모두 **56 + 41 = 97**이다.
3. 모바일 링월 컨트롤 바에서 필터 칩은 숨긴다.
   - 모바일 링월의 필터는 기존 우상단 필터 글리프 패널이 담당한다. 중복을 피한다.
   - 토글만 보이지만 위치는 그리드와 동일하다(`ControlBar`가 칩 영역을 투명하게 예약).

### 0-2. 수정 허용 파일
| 파일 | 허용 범위 |
|---|---|
| `src/components/LandingExperience.tsx` | §3 모바일 블록 추가만 |
| `src/components/GridExperience.tsx` | §2 루트 `paddingTop`과 상수 1개 추가만 |
| `src/components/MobileProjectWall.tsx` | **§4 `HEADER_H` 상수 1줄만 (동결 예외, 사용자 승인)** |

### 0-3. 수정 금지
`ControlBar.tsx`, `ViewToggle.tsx`, `ContentArea.tsx`, `ProjectWall.tsx`, `useRingWall.ts`, `GridContentArea.tsx`, `MobileGridContent.tsx`, `SiteHeader.tsx`, `SiteChromeContext.tsx`, `globals.css`, `src/app/**`, `sanity/**`
**`MobileProjectWall.tsx`는 §4의 1줄 외 어떤 변경도 금지한다**(주석·import·포맷 포함).

### 0-4. 실행 규칙
- 검증은 `npx tsc --noEmit`만 허용한다. `npm run dev` / `npm run build` / `npm install`은 금지한다.
- 사전 확인 결과가 중단 조건에 해당하면 해당 절을 수행하지 않고 사실만 보고한다.

---

## 1. 사전 확인 (읽기 전용)

### 1-1. 선행 차수 적용 확인
- `src/components/ControlBar.tsx` 존재 여부를 확인한다.
- `export const CONTROL_BAR_H` 선언 원문과 값을 기록한다. 기대값은 `PAD_TOP + ROW_H + PAD_BOTTOM` = 41이다.
- **중단 조건**: 파일이 없거나 값이 41이 아니면 전 절을 중단하고 보고한다.

### 1-2. `MobileProjectWall.tsx`의 헤더 관련 하드코딩
아래 패턴의 전 출현을 줄 번호·원문 ±3줄로 기록한다.
- 숫자 리터럴 `56`
- `HEADER_H`
- `innerHeight`
- `100vh`
- `top: 0`

기록한 각 출현을 다음과 같이 분류해 보고한다(판단 근거는 원문 주석·변수명만 사용, 추정 금지).
- (a) `HEADER_H` 참조
- (b) 헤더 바 높이를 뜻하는 별도 리터럴 `56`
- (c) 무관(필터 글리프 버튼 width/height 56 등)

**중단 조건**: (b)가 1건이라도 있으면 §4를 **보류**한다. HEADER_H만 바꾸면 해당 리터럴과 어긋나기 때문이다. §2·§3은 수행하되 §3 블록은 렌더하지 않도록 `false &&`로 막지 말고 **§3 자체를 보류**하고 보고한다.

### 1-3. 그리드 루트 여백
- `GridExperience.tsx`의 루트 div `paddingTop` 원문을 기록한다.
- `HEADER_H` 선언 원문을 기록한다.
- `isMobile` 선언 위치를 기록한다.

---

## 2. 그리드 모바일 상단 여백 — `GridExperience.tsx`

1. 상수 영역, `HEADER_H` 선언 바로 아래에 추가한다.

```tsx
const MOBILE_HEADER_H = 56      // 모바일(<1024) 전역 헤더 바 높이 — globals.css .mobile-header-bar와 동일값 (P1_2)
```

2. 루트 div의 `paddingTop: HEADER_H` → `paddingTop: isMobile ? MOBILE_HEADER_H : HEADER_H`

`isMobile`은 초기 `false`에서 `useLayoutEffect`로 페인트 전에 확정되므로(기존 주석 근거), 모바일에서 80 → 56 깜빡임은 발생하지 않는다.

---

## 3. 모바일 링월 컨트롤 바 — `LandingExperience.tsx`

1. 컴포넌트 밖 상수 영역, `HEADER_H` 선언 아래에 추가한다.

```tsx
const MOBILE_HEADER_H = 56   // 모바일 전역 헤더 바 높이 — MobileProjectWall은 이 아래 CONTROL_BAR_H만큼 더 내려 시작 (P1_2)
```

2. P1.1에서 추가한 데스크톱 `CONTROL BAR` 블록(`{!mobile && ( … )}`) **바로 뒤**에 삽입한다.

```tsx
      {/* ── CONTROL BAR (모바일) — 헤더 바 아래 한 줄. 그리드 모바일과 동일 컴포넌트·동일 위치 (P1_2 §3) ──
           필터는 우상단 필터 글리프 패널이 담당하므로 칩은 숨기고 토글만 노출.
           열람 중(activeProject)에는 그리드 모바일(오버레이가 바를 덮음)과 같게 숨긴다 */}
      {mobile && (
        <div style={{
          position: 'fixed',
          top: MOBILE_HEADER_H,
          left: 0,
          right: 0,
          height: CONTROL_BAR_H,
          background: '#FFFFFF',
          zIndex: 50,
          opacity: layoutVisible && !activeProject ? 1 : 0,
          pointerEvents: layoutVisible && !activeProject ? 'auto' : 'none',
          transition: 'opacity 300ms ease-out',
        }}>
          <ControlBar
            types={FILTER_TYPES}
            active={activeFilter}
            onSelect={handleFilter}
            view="ring"
            filtersVisible={false}
          />
        </div>
      )}
```

z-index 근거는 다음과 같다(감사 기록 기준).
- 열람 레이어 40 < **컨트롤 바 50** < 헤더 바 90 < 필터 글리프 95 < 스크림 110 < 패널 120
- 따라서 필터·메뉴 패널이 컨트롤 바를 덮는다.

`layoutVisible`, `activeProject`, `FILTER_TYPES`, `activeFilter`, `handleFilter`는 기존 선언을 사용한다(신규 선언 금지).

---

## 4. 모바일 링월 시작점 — `MobileProjectWall.tsx` (동결 예외 1줄)

§1-2 중단 조건 미해당 시에만 수행한다.

21행 교체:
- 변경 전: `const HEADER_H = 56          // 모바일 헤더 바 높이 (SiteHeader .mobile-header-bar와 일치)`
- 변경 후: `const HEADER_H = 97          // 모바일 헤더 바(56) + 컨트롤 바(41, ControlBar CONTROL_BAR_H) — 260916 동결 예외 승인. 두 값 변경 시 동기화 필수`

영향 범위는 감사 기준 4곳(1030, 1034, 1077, 1219행)이며, 모두 이 상수를 참조하므로 코드 수정 없이 반영된다.
- 브라우징 레이어(가상 링) 시작점: 56 → 97
- 링 컨테이너 높이 `innerHeight - HEADER_H`와 카드 중앙 기준선: 자동 재계산
- 열람 레이어 시작점: 56 → 97. 열람 중에는 컨트롤 바가 숨겨지므로 헤더 아래 41px 흰 여백이 된다.

---

## 5. 검증

### 5-1. 코드
1. `npx tsc --noEmit` → 오류 0
2. `git diff --stat` 확인
   - `MobileProjectWall.tsx`: **1 insertion, 1 deletion**
   - `GridExperience.tsx`: 상수 1줄 + paddingTop 1줄
   - `LandingExperience.tsx`: 상수 1줄 + 모바일 블록
3. `git diff src/components/MobileProjectWall.tsx` 전문을 보고한다(21행 외 변경 0 확인).
4. grep: `ControlBar` in `LandingExperience.tsx` → import 1 + JSX 2

### 5-2. 육안 (사용자, 휴대폰 세로)
1. `/work`(모바일): 헤더 바 바로 아래 우측에 `RING | GRID`가 보이고, GRID를 누르면 그리드로 이동한다.
2. `/work-grid`(모바일): 토글이 링월과 **같은 높이·같은 우측 위치**에 있다. 칩 행이 헤더 바에 바짝 붙되 잘리지 않는다.
3. 링월 모바일의 첫 카드가 컨트롤 바에 가려지지 않는다. 링 스크롤·중앙 하이라이트가 정상이다.
4. 링월 카드를 탭해 열람하면 토글이 사라진다. 열람 화면의 BACK·타이틀이 가려지지 않는다. 닫으면 토글이 다시 나타난다.
5. 필터 글리프 패널과 햄버거 메뉴를 열었을 때 컨트롤 바 위로 정상적으로 덮인다.
6. `/` 첫 진입(모바일) 시 인트로 중에는 바가 숨겨지고, 인트로 후 나타난다.

---

## 6. 작업 보고 형식
- §1 사전 확인 결과(1-2 분류표 포함)와 중단 조건 해당 여부
- §5-1 결과(특히 MobileProjectWall diff 전문)
- 중단·보류 항목과 사유
