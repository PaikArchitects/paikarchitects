# LANDING_SWITCH_P1_260916 — 대표 모드 전환 1차: 레거시 정리 · 양방향 뷰 토글 · 헤더 light 경로

대상: paikarchitects.com
근거: `AUDIT_REPORT_landing_260916.md`, `AUDIT_REPORT_landing2_260916.md`
후속: P2(landingMode 싱글턴 · `/` 모드 분기 · canonical 역전 · metadataBase)는 본 명세 배포·검증 후 별도 작성

---

## 0. 범위와 절대 제약

### 0-1. 수정 허용 파일 (이 목록 외 수정 금지)
| 파일 | 허용 범위 |
|---|---|
| `src/components/ViewToggle.tsx` | **신규 생성** |
| `src/components/GridExperience.tsx` | §4 토글 교체, §5-2 헤더 색 덮어쓰기 제거, 미사용 import 정리 |
| `src/components/LandingExperience.tsx` | §6 토글 추가, 필터 바 좌우 여백 |
| `src/components/SiteHeader.tsx` | §5-1 `isStaticLight` 함수와 그 위 주석(17–23행)만 |
| `src/components/GridContentArea.tsx` | §2 주석 2곳, §1-1 주석 1곳만. **코드 로직 변경 금지** |
| `src/app/globals.css` | §1의 미사용 클래스 규칙 삭제만 |
| `src/components/ProjectCard.tsx` | **삭제** |
| `src/components/Header.tsx` | **삭제** |
| `GRID_MORPH_rect_height_fix_260804.md` | §3 상단 폐기 표기 추가만 |

### 0-2. 수정 금지
`ContentArea.tsx`, `MobileProjectWall.tsx`, `ProjectWall.tsx`, `useRingWall.ts`, `MobileGridContent.tsx`, `SiteChromeContext.tsx`, `src/app/**` 라우트 파일 전부, `sanity/**`, `sanity.config.ts`.

### 0-3. 실행 규칙
- 검증은 `npx tsc --noEmit`만. `npm run dev` / `npm run build` / `npm install` 금지
- 각 절의 "사전 grep"은 **수정 전에 실행해 결과를 작업 보고에 기록**한다. 결과가 명세 예상과 다르면 해당 절을 중단하고 사실만 보고한다(추정으로 진행 금지)

---

## 1. 미사용 레거시 삭제

### 1-1. `ProjectCard.tsx`
감사 결과: import 0건, JSX 사용 0건.

**사전 grep** (`src/` 전체):
- `ProjectCard` → 예상 4건 (`ProjectCard.tsx` 2, 주석 `GridContentArea.tsx:1135`, 주석 `ContentArea.tsx:987`)
- `project-card` → 결과 전부 기록 (예상: `ProjectCard.tsx` 내부 + `globals.css` 규칙)

**작업**
1. `src/components/ProjectCard.tsx` 파일 삭제
2. `globals.css`에서 아래 클래스를 **선택자로 갖는 규칙 블록**을 삭제한다. 한 규칙의 선택자 목록에 다른(사용 중인) 클래스가 섞여 있으면 삭제하지 말고 보고한다.
   - `project-card`, `project-card-bg`, `project-card-static-num`, `project-card-overlay`, `project-card-num`, `project-card-title`, `project-card-meta`
3. `GridContentArea.tsx:1135` 주석 수정
   - 변경 전: `{/* 프로젝트 코드 — ProjectCard와 동일한 3자리 zero-pad 규약 */}`
   - 변경 후: `{/* 프로젝트 코드 — careerNo 3자리 zero-pad 규약 (ContentArea와 동일) */}`
4. `ContentArea.tsx:987`의 동일 주석은 **동결 파일이므로 수정하지 않는다**(잔존 허용, 기능 무관)

### 1-2. `Header.tsx`
감사 결과: import 0건, JSX 사용 0건. `layout.tsx`는 `SiteHeader`를 사용한다.

**사전 grep** (`src/` 전체):
- `from './Header'`, `from '@/components/Header'` → 예상 0건
- `site-header-name`, `site-header-link` → 결과 전부 기록

**작업**
1. `src/components/Header.tsx` 파일 삭제
2. `globals.css`에서 `.site-header-name`, `.site-header-link`를 선택자로 갖는 규칙 블록 삭제 (1-1의 2번과 같은 조건)
3. `site-header`로 시작하는 **다른** 클래스(있다면)는 건드리지 않는다

---

## 2. 폐기 진단 주석 정정 — `GridContentArea.tsx` (코드 불변)

배경: 커밋 `d52d90f`(rect_height_fix)의 코드 변경이 HEAD에 남아 있다. 이 코드는 배포 후 육안 검증을 통과했고, 트랙 높이와 같은 값을 직접 참조하는 단일 소스 구조라 **유지한다**. 다만 주석이 영상 실측으로 부정된 원인 진단을 사실처럼 서술하고 있어 정정한다.

**사전 grep**: `rh \* SLIDE_H_RATIO` → 예상 0건 (유지 확인용)

### 2-1. 진입 morph 주석 (현 830행대, `const th = slideH` 바로 위 3줄)
변경 전:
```
      // 도착 높이는 트랙 슬라이드와 **동일한 기준**이어야 한다 — 폭(rc[1].w)은 slideH 기준으로
      // 계산된 값이므로 높이를 루트 컨테이너(rh) 기준으로 잡으면 종횡비가 어긋나
      // objectFit:'cover'가 확대 크롭한다(= 모프 종료 찰나의 "큰 이미지"). slideH로 통일한다.
```
변경 후:
```
      // 도착 높이는 트랙 히어로 높이(slideH)를 직접 참조한다 — 폭(rc[1].w)과 같은 소스를 쓰는
      // 단일 소스 원칙. 주의: 모프 종료 찰나의 "확대 튐"은 높이 기준 문제가 아니었다
      // (영상 실측상 컨테이너 크기 불변). 원인은 두 모프 레이어의 크롭 화각 차이였고
      // GRID_MORPH_crop_match_260804에서 해결됐다. rect_height_fix의 원인 서술은 폐기됨.
```

### 2-2. 역-morph 주석 (현 900행대, `const curSlide = ...` 위 블록 중 2줄)
변경 전:
```
        // 값(isDiagram ? diagramH : slideH)을 그대로 쓴다. 진입 morph와 같은 이유로 rh 기준
        // 재계산은 폭(rc[curIdx].w)과 기준이 어긋나 종횡비가 깨진다 — 트랙 높이를 직접 참조한다.
```
변경 후:
```
        // 값(isDiagram ? diagramH : slideH)을 그대로 쓴다 — 트랙 렌더와 같은 소스를 직접 참조하는
        // 단일 소스 원칙(진입 morph 주석 참고. 종횡비 붕괴 진단은 폐기됨).
```

---

## 3. 폐기 명세 표기 — `GRID_MORPH_rect_height_fix_260804.md`

파일 **맨 위**에 아래 블록을 추가한다(기존 내용 불변).
```
> ⚠ **폐기된 명세 (2026-09-16 표기)** — 원인 진단(rh vs slideH 종횡비 불일치)은 영상 실측으로
> 부정됐다. 실제 원인은 모프 레이어 크롭 화각 차이이며 `GRID_MORPH_crop_match_260804.md`에서 해결.
> 본 명세의 코드 변경은 단일 소스 참조로서 유지되나, 원인 서술은 신뢰하지 말 것.

```

---

## 4. 공용 뷰 토글 — `ViewToggle.tsx` 신규 + 그리드 교체

### 4-1. 신규 파일 `src/components/ViewToggle.tsx`
기존 그리드 인라인 토글(`GridExperience.tsx` 537–564행)의 시각 사양을 그대로 옮긴다.

```tsx
'use client'

// ── ViewToggle — 링월 ↔ 그리드 뷰 전환 (LANDING_SWITCH_P1 §4) ──
// 두 모드가 동일 컴포넌트를 쓴다. 현재 모드는 비링크 텍스트(굵게), 다른 모드는 링크(흐리게).
// 링크 대상은 각 모드의 인덱스 경로다. 대표 모드(landingMode) 연동은 P2에서 다룬다.

import Link from 'next/link'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"

export type ViewMode = 'ring' | 'grid'

const VIEWS: { mode: ViewMode; label: string; href: string }[] = [
  { mode: 'ring', label: 'Ring', href: '/work' },
  { mode: 'grid', label: 'Grid', href: '/work-grid' },
]

const BASE = {
  fontFamily: FONT,
  fontSize: 11,
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  color: '#080706',
  textDecoration: 'none',
  whiteSpace: 'nowrap' as const,
}

export function ViewToggle({ current }: { current: ViewMode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
      {VIEWS.map((v, i) => (
        <span key={v.mode} style={{ display: 'contents' }}>
          {i > 0 && <span style={{ opacity: 0.25, fontSize: 11 }}>|</span>}
          {v.mode === current ? (
            <span style={{ ...BASE, fontWeight: 500 }} aria-current="page">{v.label}</span>
          ) : (
            <Link href={v.href} style={{ ...BASE, fontWeight: 300, opacity: 0.5 }}>{v.label}</Link>
          )}
        </span>
      ))}
    </div>
  )
}
```

### 4-2. `GridExperience.tsx` 인라인 토글 교체
**사전 grep** (`GridExperience.tsx`): `href="/work"` → 예상 1건(539행), `<Link` → 건수 기록, `import Link` → 건수 기록

**작업**
1. 537–564행의 `<div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}> … </div>` **블록 전체**를 `<ViewToggle current="grid" />` 한 줄로 교체한다. 부모 구조(565행 `</div>` 등)는 그대로 둔다
2. 상단 import에 `import { ViewToggle } from './ViewToggle'` 추가
3. 교체 후 `GridExperience.tsx`에서 `<Link` 검색 → **0건이면** `import Link from 'next/link'` 줄 삭제. 1건 이상이면 import 유지

**사후 grep**: `GridExperience.tsx`의 `href="/work"` → 0건, `Ring` 문자열 리터럴 → 0건

---

## 5. 헤더 light 경로 정식 등록

### 5-1. `SiteHeader.tsx` (17–23행만)
현재 `/work-grid`는 `STATIC_LIGHT_PATHS`에도 `startsWith('/work/')`에도 일치하지 않아 흰 배경 위 흰 글자가 되며, 그리드가 자체 CSS로 덮어쓰는 우회 상태다.

변경 후:
```tsx
// 랜딩(/) 외 페이지 중 흰 배경(light) 레이아웃을 사용하는 경로
// /work 계열(/work, /work/[slug])은 LandingExperience 흰 셸, /work-grid 계열은 GridExperience 흰 셸
const STATIC_LIGHT_PATHS = new Set(['/about', '/work', '/work-grid', '/essays', '/contact'])

function isStaticLight(pathname: string): boolean {
  return STATIC_LIGHT_PATHS.has(pathname)
    || pathname.startsWith('/work/')
    || pathname.startsWith('/work-grid/')
}
```
그 외 줄(NAV_ITEMS 포함) 수정 금지.

### 5-2. `GridExperience.tsx` 헤더 색 덮어쓰기 제거
**사전 grep** (`GridExperience.tsx`): `wordmark`, `site-nav`, `mobile-menu`, `on-light`, `mobile-header-bar` → 전 결과(줄 번호·원문) 기록

**작업**
1. 사전 grep 결과 중 `<style>` 블록 안에서 **SiteHeader 소유 클래스를 대상으로 색상을 덮어쓰는 규칙**만 삭제한다
2. 404–405행 주석(`전역 헤더는 /work-grid를 light 경로로 모르므로 … 이 라우트에서만 색을 덮는다.`) 두 줄 삭제. 401–403행 주석은 유지
3. 사전 grep 결과가 0건이면(다른 방식으로 덮어쓰는 경우) **삭제하지 말고 그 방식을 발췌해 보고**만 한다

**사후 grep**: 1번에서 삭제한 선택자 → `GridExperience.tsx` 내 0건

---

## 6. 링월 측 토글 추가 — `LandingExperience.tsx` (데스크톱만)

### 6-1. 상수
컴포넌트 밖 상수 영역에 추가:
```tsx
// 뷰 토글(우상단) 예약 폭 — 필터 바가 토글과 겹치지 않도록 좌우 대칭으로 비운다 (LANDING_SWITCH_P1 §6)
// 토글 실폭 약 100px + 우측 여백 34px + 간격 → 160
const VIEW_TOGGLE_RESERVE = 160
const VIEW_TOGGLE_RIGHT = 34
```
import 추가: `import { ViewToggle } from './ViewToggle'`

### 6-2. 필터 바 좌우 여백 (현 263–267행)
필터 바 외곽 div의 `left: 0, right: 0` → `left: VIEW_TOGGLE_RESERVE, right: VIEW_TOGGLE_RESERVE`
(대칭으로 줄여 칩 행의 수평 중앙이 유지된다. 내부 스크롤·페이드 어포던스는 외곽 기준이라 그대로 동작)

### 6-3. 토글 블록 추가
필터 바 블록(`{!mobile && ( … )}`, 현 262–365행) **바로 뒤**, MAIN 블록 앞에 삽입:
```tsx
      {/* ── VIEW TOGGLE — 링월 ↔ 그리드 (데스크톱). 필터 표시 여부와 무관하게 레이아웃 공개 후 상시 노출 ── */}
      {!mobile && (
        <div style={{
          position: 'absolute',
          top: 50,
          right: VIEW_TOGGLE_RIGHT,
          height: 24,
          display: 'flex',
          alignItems: 'center',
          zIndex: 50,
          opacity: layoutVisible ? 1 : 0,
          pointerEvents: layoutVisible ? 'auto' : 'none',
          transition: 'opacity 300ms ease-out',
        }}>
          <ViewToggle current="ring" />
        </div>
      )}
```
`layoutVisible`은 기존 242행 선언을 사용한다(신규 선언 금지).

### 6-4. 모바일
본 차수에서 **링월 모바일 토글은 추가하지 않는다**(`MobileProjectWall.tsx` 동결). 모바일 경로는 별도 차수에서 결정.

---

## 7. 검증

### 7-1. 코드
1. `npx tsc --noEmit` → 오류 0
2. grep (`src/` 전체)
   | 패턴 | 기대 |
   |---|---|
   | `ProjectCard` | 1건 (`ContentArea.tsx:987` 주석) |
   | `project-card` | 0건 |
   | `site-header-name` / `site-header-link` | 0건 |
   | `from './Header'` / `from '@/components/Header'` | 0건 |
   | `ViewToggle` | `ViewToggle.tsx` + `GridExperience.tsx` + `LandingExperience.tsx` |
   | `/work-grid` (LandingExperience.tsx) | 0건 (링크는 ViewToggle 소유) |
   | `rh \* SLIDE_H_RATIO` | 0건 |
3. 수정 허용 목록 외 파일이 변경되지 않았음을 `git status`로 확인해 보고

### 7-2. 육안 (사용자)
1. `/work` 데스크톱: 우상단 `RING | GRID` 노출, GRID 클릭 → `/work-grid` 이동
2. `/` 데스크톱: 인트로 재생 중 토글 비노출, 인트로 종료 후 노출
3. `/work-grid`: 토글 모양·위치 기존과 동일, RING 클릭 → `/work`
4. `/work-grid`, `/work-grid/[slug]`: 워드마크·내비 색 정상(흰 배경 위 검정), 새로고침 직후에도 동일
5. D2(1024–1439) 폭에서 필터 칩과 토글이 겹치지 않음, 칩 행 중앙 유지
6. 그리드 카드 진입·복귀 morph 기존과 동일(코드 불변 확인)

---

## 8. 작업 보고 형식
- 각 절 사전 grep 결과(줄 번호·원문)
- 삭제한 CSS 규칙 원문
- 7-1 결과표
- 중단·보류한 항목과 사유
