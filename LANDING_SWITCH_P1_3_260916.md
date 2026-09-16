# LANDING_SWITCH_P1_3_260916 — 모바일 필터 통일 (그리드 → 링월식 필터 글리프 패널)

대상: paikarchitects.com
선행: `LANDING_SWITCH_P1_1_260916.md`, `LANDING_SWITCH_P1_2_260916.md` 적용 완료
결정: 모바일(<1024)에서 링월·그리드 모두 필터를 **헤더 우상단 필터 글리프 + 우측 슬라이드 패널**로 통일한다. 헤더 아래 컨트롤 바에는 토글만 둔다. (2026-09-16 사용자 확정)

---

## 0. 범위와 절대 제약

### 0-1. 목표
1. 모바일 그리드에서 컨트롤 바의 칩을 숨긴다. 토글만 남기며, 칩 영역은 투명하게 예약한다. 링월 모바일과 동일한 상태다.
2. 모바일 그리드에 링월과 **동일 사양**의 필터 글리프·스크림·패널을 추가한다.
   - 공용 컴포넌트 `MobileFilterPanel.tsx`를 신규로 만들고, **본 차수에서는 그리드만** 사용한다.
3. P1.2 §2(모바일 그리드 상단 여백 56)가 미적용이면 적용한다.
   - 실측상 모바일 토글 높이가 링월 약 67pt, 그리드 약 90pt로 어긋나 있다.

### 0-2. 수정 허용 파일
| 파일 | 허용 범위 |
|---|---|
| `src/components/MobileFilterPanel.tsx` | **신규** |
| `src/components/GridExperience.tsx` | §3, §4 |

### 0-3. 수정 금지
`MobileProjectWall.tsx`(**읽기만 허용, §1-2**), `LandingExperience.tsx`, `ControlBar.tsx`, `ViewToggle.tsx`, `ContentArea.tsx`, `ProjectWall.tsx`, `GridContentArea.tsx`, `MobileGridContent.tsx`, `SiteHeader.tsx`, `globals.css`, `src/app/**`, `sanity/**`

### 0-4. 실행 규칙
- 검증은 `npx tsc --noEmit`만 허용한다. `npm run dev` / `npm run build` / `npm install`은 금지한다.
- 사전 확인 결과가 명세 전제와 다르면 해당 절을 중단하고 사실만 보고한다. 추정으로 진행하지 않는다.

### 0-5. 알려진 중복 (의도된 임시 상태)
- 링월 모바일의 글리프·패널은 동결 파일 `MobileProjectWall.tsx`에 내장되어 있어 본 차수에서 공용 컴포넌트로 교체하지 않는다.
- 따라서 같은 UI의 원본이 **두 곳**에 존재한다(`MobileProjectWall.tsx` 1297–1410행, `MobileFilterPanel.tsx`).
- 한쪽 사양을 바꿀 때는 반드시 양쪽을 동기화해야 한다.
- `MobileProjectWall.tsx` 동결 해제 시 공용 컴포넌트로 통합한다.

---

## 1. 사전 확인 (읽기 전용)

### 1-1. P1.2 §2 적용 여부
`GridExperience.tsx`에서 아래 원문을 기록한다.
- `MOBILE_HEADER_H` 선언
- 루트 div의 `paddingTop` 줄

판정:
- `paddingTop: isMobile ? MOBILE_HEADER_H : HEADER_H`이면 → §4-1 생략
- `paddingTop: HEADER_H`(조건 없음)이면 → §4-1 수행

### 1-2. 링월 패널 사양 원문 (`MobileProjectWall.tsx` 읽기만)
아래 항목의 **선언 원문과 값**을 기록한다.
- `PANEL_MS`
- `EASE`
- 필터 글리프·스크림·패널 블록(감사 기준 1297–1410행) 전문
- `revealed`의 선언 원문(의미 확인용)

**중단 조건**: `PANEL_MS` 또는 `EASE`의 선언이 이 파일에 없고 import로 들어온다면, 그 import 출처를 기록한다. §2에서 **같은 출처에서 import**한다(값 복제 금지). 출처가 동결 파일 내부 비export 상수라서 import할 수 없다면, §2에서 **기록한 원문 값을 그대로** 상수로 선언하고 주석에 출처 행을 적는다.

### 1-3. 그리드 필터 관련 식별자
`GridExperience.tsx`에서 아래 항목의 선언 원문을 기록한다.
- `FILTER_TYPES`
- `activeFilter`
- `setActiveFilter`
- `startFlow`
- `ControlBar` JSX
- `isMobile`

---

## 2. 공용 모바일 필터 패널 — `src/components/MobileFilterPanel.tsx` 신규

§1-2에서 기록한 링월 원문의 **시각·동작 사양을 그대로** 옮긴다. 아래는 구조 기준이다.
- `PANEL_MS`·`EASE`는 §1-2 판정대로 import하거나 원문 값을 사용한다.
- 스타일 수치(위치 0/0, 56×56, zIndex 95/110/120, SVG 기하, 스크림 색, 패널 폭·패딩·그림자, 버튼 타이포)가 원문과 **한 글자라도 다르면 원문을 따른다.**

```tsx
'use client'

// ── MobileFilterPanel — 모바일(<1024) 필터 글리프 + 우측 슬라이드 패널 (LANDING_SWITCH_P1_3 §2) ──
// 사양 원본: MobileProjectWall.tsx 필터 글리프·스크림·패널 블록(동결). 본 컴포넌트는 그 사양의 복제다.
// ⚠ 두 곳이 동기화 대상이다 — 한쪽 수치를 바꾸면 다른 쪽도 바꾼다.
//    MobileProjectWall 동결 해제 시 그쪽을 본 컴포넌트로 교체해 단일 원본으로 합친다.

import { useEffect, useState } from 'react'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"
// PANEL_MS, EASE — §1-2 판정에 따라 import 또는 원문 값 선언 (출처 행 주석 필수)

interface MobileFilterPanelProps {
  types: string[]
  active: string
  onSelect: (t: string) => void
  visible?: boolean        // 글리프 노출 여부(링월의 revealed에 대응). 기본 true
}

export function MobileFilterPanel({ types, active, onSelect, visible = true }: MobileFilterPanelProps) {
  const [open, setOpen] = useState(false)

  // 글리프가 숨겨지면 패널도 닫는다
  useEffect(() => { if (!visible) setOpen(false) }, [visible])

  return (
    <>
      {/* 트리거 — 헤더 존 우측 (원문 1302–1338행 사양) */}
      <button
        aria-label="Filter"
        onClick={() => setOpen(o => !o)}
        style={{ /* 원문 스타일 그대로. opacity/pointerEvents의 revealed → visible */ }}
      >
        {/* 원문 SVG 그대로 */}
      </button>

      {/* 스크림 (원문 1341–1353행 사양) — filterOpen → open */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden="true"
        style={{ /* 원문 그대로 */ }}
      />

      {/* 패널 (원문 1356–1370행 사양) */}
      <div style={{ /* 원문 그대로 */ }}>
        {types.map(t => (
          <button
            key={t}
            onClick={() => {
              setOpen(false)
              onSelect(t)
            }}
            style={{ /* 원문 1378–1395행 그대로. activeFilter → active */ }}
          >
            <span style={{ /* 원문 불릿 스타일 그대로 */ }}>●</span>
            <span>{t}</span>
          </button>
        ))}
      </div>
    </>
  )
}
```

**작성 규칙**
- 주석 `/* 원문 … 그대로 */` 자리는 §1-2에서 기록한 원문 스타일 객체로 **실제 채운다**. 주석만 남기지 않는다.
- 원문의 식별자는 다음과 같이 치환한다. 치환 외의 값 변경은 금지한다.

| 원문 | 치환 |
|---|---|
| `setFilterOpen` | `setOpen` |
| `filterOpen` | `open` |
| `revealed` | `visible` |
| `activeFilter` | `active` |
| `filterTypes` | `types` |
| `onFilter` | `onSelect` |

- 원문이 `{revealed && ( <> … </> )}`로 감싸 **마운트 자체를 조건화**했다면 그 구조를 따른다. 이 경우 `return visible ? (<>…</>) : null`로 하고, 위 닫기 effect는 유지한다.

---

## 3. 모바일 그리드 필터 교체 — `GridExperience.tsx`

1. import 추가: `import { MobileFilterPanel } from './MobileFilterPanel'`

2. `ControlBar` JSX에 `filtersVisible={!isMobile}` prop을 추가한다. 다른 prop은 불변이다.

```tsx
      <ControlBar
        types={FILTER_TYPES}
        active={activeFilter}
        onSelect={t => { if (t !== activeFilter) { startFlow(); setActiveFilter(t) } }}
        view="grid"
        filtersVisible={!isMobile}
      />
```

3. `ControlBar` JSX **바로 뒤**에 삽입한다.

```tsx
      {/* ── 모바일 필터 — 링월과 동일한 헤더 우상단 글리프 + 우측 패널 (P1_3 §3) ──
           콘텐츠 오버레이(zIndex 100)가 열리면 글리프(95)는 그 아래로 덮인다 */}
      {isMobile && (
        <MobileFilterPanel
          types={FILTER_TYPES}
          active={activeFilter}
          onSelect={t => { if (t !== activeFilter) { startFlow(); setActiveFilter(t) } }}
        />
      )}
```

4. `onSelect` 콜백이 `ControlBar`와 동일 식으로 두 곳에 중복된다. 컴포넌트 내부에 아래 핸들러를 선언하고 **두 곳 모두** 이것을 참조하도록 교체한다.

```tsx
  const selectFilter = useCallback((t: string) => {
    if (t !== activeFilter) { startFlow(); setActiveFilter(t) }
  }, [activeFilter, startFlow])
```

- 선언 위치는 `startFlow` 선언 **뒤**로 한다.
- `startFlow`가 `useCallback`이 아니라 일반 함수라면 의존성 배열에서 제외하지 말고, 그 사실을 보고한 뒤 `useCallback` 없이 일반 함수로 선언한다.

---

## 4. 모바일 그리드 상단 여백 (§1-1 판정에 따름)

### 4-1. (미적용 시에만)
1. `HEADER_H` 선언 아래에 추가:
   `const MOBILE_HEADER_H = 56      // 모바일(<1024) 전역 헤더 바 높이 — globals.css .mobile-header-bar와 동일값 (P1_2)`
2. 루트 div `paddingTop: HEADER_H` → `paddingTop: isMobile ? MOBILE_HEADER_H : HEADER_H`

---

## 5. 검증

### 5-1. 코드
1. `npx tsc --noEmit` → 오류 0
2. grep 결과를 확인한다.

| 패턴 | 범위 | 기대 |
|---|---|---|
| `MobileFilterPanel` | `src/` | `MobileFilterPanel.tsx` + `GridExperience.tsx`(import 1, JSX 1) |
| `filtersVisible` | `GridExperience.tsx` | 1건 |
| `selectFilter` | `GridExperience.tsx` | 선언 1 + 참조 2 |
| `원문` + `그대로` (주석 잔존) | `MobileFilterPanel.tsx` | 0건 (§2 작성 규칙: 자리표시 주석 금지) |

3. `git diff --stat`으로 변경 파일이 `GridExperience.tsx` 1개와 신규 `MobileFilterPanel.tsx`뿐임을 확인한다.
4. **사양 대조표**를 작성한다. `MobileProjectWall.tsx` 원문과 `MobileFilterPanel.tsx`의 스타일 속성을 항목별로 나란히 기록하고, 차이가 0건임을 보고한다.

### 5-2. 육안 (사용자, 휴대폰 세로)
1. `/work`와 `/work-grid`를 번갈아 볼 때 다음이 **같은 위치·같은 모양**이다.
   - 헤더 우상단 필터 글리프
   - 헤더 아래 `RING | GRID` 토글
2. 그리드 모바일에 칩 행이 보이지 않는다.
3. 그리드에서 필터 글리프를 탭하면 우측 패널이 열린다. 항목 탭 시 패널이 닫히고 카드가 재정렬되며, 비해당 카드는 흐려진다.
4. 스크림을 탭하면 패널이 닫힌다.
5. 그리드 카드를 열면(콘텐츠 화면) 필터 글리프가 가려진다. 닫으면 다시 보인다.
6. 햄버거 메뉴와 필터 패널이 겹쳐 열려도 동작이 링월과 같다.
7. 패널이 열린 상태에서 배경 그리드가 스크롤되는지 확인한다(링월은 문서 스크롤이 없어 비교 불가, 거슬리면 보고).

### 5-3. 데스크톱 회귀
8. 1024px 이상에서 그리드 칩 행이 그대로 보이고, 필터 글리프는 나타나지 않는다.

---

## 6. 작업 보고 형식
- §1 사전 확인 원문과 판정(1-1 적용 여부, 1-2 import/복제 판정)
- §5-1 결과표와 사양 대조표
- 중단·보류 항목과 사유
