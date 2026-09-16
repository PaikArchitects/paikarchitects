# LANDING_SWITCH_P1_4_260916 — 모바일 필터 칩 깜빡임 제거 (표시·배치의 CSS 미디어쿼리 이관)

대상: paikarchitects.com
선행: `LANDING_SWITCH_P1_3_260916.md` 적용 완료

---

## 0. 진단 (화면녹화 프레임 분석, 2026-09-16)

- **증상**: 모바일 링월에서 GRID를 탭하면, 그리드 첫 프레임에 칩 행(`● ALL WORKPLACE SPORTS ›`)이 완전 불투명으로 그려진 뒤 약 0.2~0.3초에 걸쳐 사라진다.
- **원인**: 칩 표시가 JS 상태 `isMobile`(초기값 `false`)에 의존한다.
  - 첫 렌더는 데스크톱 판정으로 칩을 표시(opacity 1)한다.
  - 판정이 모바일로 바뀌면 `ControlBar`의 `transition: opacity 300ms`에 의해 서서히 사라진다.
  - 서버 렌더 HTML로 직접 진입할 때는 하이드레이션 전까지 칩이 노출될 수 있다(추정).
- **같은 계열 잠재 결함**: 그리드 루트 `paddingTop: isMobile ? 56 : 80`. 직접 진입 시 80에서 56으로 24px 튈 수 있다(추정).
- **원칙**: 모바일/데스크톱에 따라 **표시·배치만** 달라지는 것은 CSS 미디어쿼리로 처리한다. 첫 페인트 전에 적용되므로 깜빡임이 원리적으로 없다. **동작**이 달라지는 분기(콘텐츠 가로/세로, 밀도 바 폭·라벨)는 기존 `isMobile`을 유지한다.
- **경계값**: `max-width: 1023px`. `globals.css` 모바일 규칙, `GridExperience`의 `matchMedia`와 동일하다.

---

## 1. 범위와 절대 제약

### 1-1. 수정 허용 파일
| 파일 | 허용 범위 |
|---|---|
| `src/components/ControlBar.tsx` | §2 |
| `src/components/GridExperience.tsx` | §3 |

### 1-2. 수정 금지
`MobileFilterPanel.tsx`, `LandingExperience.tsx`, `MobileProjectWall.tsx`, `ViewToggle.tsx`, `ContentArea.tsx`, `ProjectWall.tsx`, `GridContentArea.tsx`, `MobileGridContent.tsx`, `SiteHeader.tsx`, `globals.css`, `src/app/**`, `sanity/**`

### 1-3. 실행 규칙
- 검증은 `npx tsc --noEmit`만 허용한다. `npm run dev` / `npm run build` / `npm install`은 금지한다.
- 사전 grep 결과가 전제와 다르면 해당 절을 중단하고 사실만 보고한다.

### 1-4. 사전 grep — 전 결과 기록
- `ControlBar.tsx`: `filtersVisible`, `transition`, `<style`
- `GridExperience.tsx`: `filtersVisible`, `paddingTop`, `MOBILE_HEADER_H`, `MobileFilterPanel`, `isMobile`, `<style>`(인라인 스타일 블록 시작·끝 행)

---

## 2. `ControlBar.tsx` — 모바일 칩 숨김을 CSS로

### 2-1. prop 추가
```tsx
  // false면 모바일(<1024)에서 칩 영역을 CSS로 즉시 숨긴다(전환 없음, 첫 페인트부터).
  // JS 판정(isMobile) 의존 시 초기값 false로 인한 깜빡임이 생긴다 (P1_4 §0)
  mobileFilters?: boolean
```
구조분해에 `mobileFilters = true`를 추가한다. 기존 `filtersVisible`은 **유지**한다(링월 데스크톱 idle에서 사용).

### 2-2. 칩 영역 외곽 div (`position: 'relative', flex: 1, …` 블록)
`className={mobileFilters ? undefined : 'cb-filters-nomobile'}`를 추가한다. 인라인 style은 불변이다.

### 2-3. 스타일 주입
최상위 반환 div의 **첫 자식**으로 추가한다.
```tsx
      {!mobileFilters && (
        <style>{`
          @media (max-width: 1023px) {
            .cb-filters-nomobile {
              visibility: hidden !important;
              opacity: 0 !important;
              transition: none !important;
              pointer-events: none !important;
            }
          }
        `}</style>
      )}
```
`!important`는 인라인 `opacity`/`transition`/`pointerEvents`를 이기기 위해 필요하다(인라인 비-important < 스타일시트 important).

### 2-4. 파일 머리 주석 끝에 한 줄 추가
`// 모바일 칩 숨김은 mobileFilters=false + CSS 미디어쿼리(첫 페인트 적용). filtersVisible은 JS 상태 기반 페이드 전용.`

---

## 3. `GridExperience.tsx`

### 3-1. ControlBar
`filtersVisible={!isMobile}` → `mobileFilters={false}`로 **교체**한다. `filtersVisible` prop은 제거한다.

### 3-2. 루트 상단 여백을 CSS로
1. 루트 div에서 `paddingTop: isMobile ? MOBILE_HEADER_H : HEADER_H,` 줄을 **삭제**하고, 루트 div에 `className="gx-root"`를 추가한다. 루트 div에 기존 className이 있으면 공백으로 병합한다.
2. 인라인 `<style>` 블록(템플릿 리터럴) 안 맨 앞에 추가한다.
```css
        .gx-root { padding-top: ${HEADER_H}px; }
        @media (max-width: 1023px) {
          .gx-root { padding-top: ${MOBILE_HEADER_H}px; }
          .gx-desktop-only { display: none !important; }
        }
        @media (min-width: 1024px) {
          .gx-mobile-only { display: none !important; }
        }
```
3. **전제 확인**: 인라인 `<style>`이 루트 div의 **자식**으로 렌더되는지 확인한다(같은 컴포넌트 트리 내라면 전역 적용되므로 위치 무관). `<style>`이 조건부 렌더(`{cond && <style>}`)라면 중단하고 보고한다.

### 3-3. 모바일 필터 글리프를 CSS 게이트로
현재:
```tsx
      {isMobile && (
        <MobileFilterPanel … />
      )}
```
변경:
```tsx
      <div className="gx-mobile-only">
        <MobileFilterPanel … />
      </div>
```
- prop은 불변이다(`selectFilter` 참조 유지).
- 래퍼 div는 레이아웃 박스를 만들지만, 자식이 전부 `position: fixed`라 배치에 영향이 없다. 데스크톱에서는 `display: none`으로 fixed 자식까지 함께 숨겨진다.
- 위 블록의 주석을 수정한다. `(P1_3 §3)` 뒤에 ` / 표시 게이트는 CSS(.gx-mobile-only, P1_4 §3-3)`를 덧붙인다.

### 3-4. 유지 (변경 금지)
- `isMobile` 선언·effect
- 콘텐츠 오버레이 분기(`MobileGridContent` vs `GridContentArea`)
- 닫기 지연 분기
- 밀도 바의 `width`·`Density` 라벨 분기
- `minCols` 파생

`gx-desktop-only`는 본 차수에서 사용처가 없다. 후속 차수용 예약이며 주석으로 남긴다.
```css
        /* .gx-desktop-only — 후속 차수 예약(데스크톱 전용 표시 요소용) */
```
(위 주석을 `.gx-desktop-only` 규칙 바로 위에 둔다.)

---

## 4. 검증

### 4-1. 코드
1. `npx tsc --noEmit` → 오류 0
2. grep 결과를 확인한다.

| 패턴 | 범위 | 기대 |
|---|---|---|
| `filtersVisible` | `GridExperience.tsx` | 0건 |
| `mobileFilters` | `GridExperience.tsx` | 1건 |
| `paddingTop` (루트 div) | `GridExperience.tsx` | 루트 div에서 0건 |
| `gx-root` | `GridExperience.tsx` | className 1 + CSS 2 |
| `gx-mobile-only` | `GridExperience.tsx` | className 1 + CSS 1 |
| `{isMobile && (` 직후 `<MobileFilterPanel` | `GridExperience.tsx` | 0건 |
| `cb-filters-nomobile` | `ControlBar.tsx` | className 1 + CSS 1 |

3. `MOBILE_HEADER_H`, `HEADER_H` 사용처가 CSS 템플릿으로 이동한 뒤에도 각 1건 이상 남는지 확인한다. 미사용 경고 대상이 아님을 확인한다.
4. `git diff --stat` → `ControlBar.tsx`, `GridExperience.tsx` 2개만 변경되어야 한다.

### 4-2. 육안 (사용자)
1. 모바일 링월에서 GRID를 탭할 때 칩 텍스트가 **한 프레임도** 보이지 않는다.
2. 모바일에서 `/work-grid` 주소를 직접 열거나 새로고침할 때 칩이 보이지 않고, 상단 여백이 튀지 않는다.
3. 모바일 필터 글리프가 직접 진입 시에도 즉시 보인다.
4. 데스크톱(≥1024): 칩 행이 정상 표시되고, 필터 글리프가 없으며, 상단 여백은 기존과 같다.
5. 브라우저 창 폭을 1024 경계로 넘나들 때 칩과 글리프가 즉시 교체되고, 레이아웃이 깨지지 않는다.
6. 링월 데스크톱의 `/` idle → `/work` 필터 페이드는 기존과 같다(`filtersVisible` 경로 불변).

---

## 5. 작업 보고 형식
- §1-4 사전 grep 결과
- §3-2 3번 전제 확인 결과
- §4-1 결과표와 `git diff --stat`
- 중단·보류 항목과 사유
