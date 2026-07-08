# MOBILE_HEADER_FIX_SPEC — 워드마크 수렴 궤적 · 헤더 글리프 · 필터 상시 표시

## 0. 대상 결함 (3건)

1. **모바일 인트로 수렴 궤적 파손**: 실기기에서 워드마크가 좌상단으로 모였다가 전환 종료 순간(introPhase 'done') 중앙으로 순간이동. 데스크톱 좁은 창에서는 정상.
2. **헤더 글리프 렌더 품질**: 햄버거·필터 아이콘의 선 두께가 선마다 달라 보이고 자글거림.
3. **필터 글리프 가시성**: 최초 진입 시 미표시 (Works 진입 후에만 표시) → 햄버거처럼 진입 즉시 표시 필요.

## 1. 워드마크 궤적 수정 — transform 함수형 통일 (globals.css)

### 원인 (확정)
전환의 시작 `translate(-50%, -50%)`과 모바일 종착 `translateX(-50%)`의 **함수형 불일치**가 행렬 보간을 유발한다. 행렬은 퍼센트를 보존할 수 없어 전환 시작 시점의 요소 폭(풀 텍스트 ~330px) 기준으로 px 고정되고, 수축 중인 요소(최종 ~55px)와 괴리 → 좌측 고정처럼 보이다가 전환 종료 시 라이브 퍼센트로 재해석되며 스냅. Chrome은 퍼센트를 매 프레임 재해석하므로 미재현.

### 수정 — 세 지점의 함수형을 translate()로 통일 (인자별 보간 강제, 퍼센트 전 구간 유지)
```css
/* 기존 데스크톱 규칙 */
.wordmark-intro.moved {
  top: 20px;
  left: 24px;
  transform: translate(0, 0);   /* 기존 none → 계산상 동일, 함수형만 통일 */
}

/* 기존 모바일(@media max-width:767px) 규칙 */
.wordmark-intro.moved {
  top: 16px;
  left: 50%;
  transform: translate(-50%, 0);   /* 기존 translateX(-50%) → 함수형 통일 */
  font-size: 22px;
}
```
기본 상태 `.wordmark-intro`의 `transform: translate(-50%, -50%)`는 그대로 둔다. **top/left/transition 선언·타이밍(1600ms cubic-bezier) 일절 변경 금지.**

## 2. 헤더 글리프 재구현 — SVG 통일 기하 (SiteHeader.tsx + MobileProjectWall.tsx)

### 원인
div 스팬 구성(높이 1.5px + gap 6px)에서 선별 수직 오프셋의 소수부가 상이(0 / 7.5px)해 안티앨리어싱이 비대칭으로 걸림.

### 공통 기하 (두 글리프 동일 — 통일성 요구사항)
- SVG `viewBox="0 0 18 14"`, `width={18} height={14}`, `display: block`.
- 수평선 3개, **선 중심 y = 1 / 7 / 13** (중심 간격 6px 정수 — 세 선의 소수 오프셋 패턴 동일 → 균질 렌더).
- `stroke="currentColor"` `strokeWidth={1.5}` `strokeLinecap="butt"`. rect가 아닌 `<line>` 사용.
- 버튼(56×56) 내 수직·수평 중앙: (56−14)/2 = 21, (56−18)/2 = 19 — 정수 안착.
- 색상은 버튼의 `color: #080706` 상속.

### 햄버거 (SiteHeader — 2선 → 3선 변경)
```
<line x1="0" y1="1"  x2="18" y2="1" />
<line x1="0" y1="7"  x2="18" y2="7" />
<line x1="0" y1="13" x2="18" y2="13" />
```

### 필터 글리프 (MobileProjectWall — 체감 3선 유지, 폭만 정수 대칭으로 정비)
```
<line x1="0" y1="1"  x2="18" y2="1" />    ← 18px
<line x1="3" y1="7"  x2="15" y2="7" />    ← 12px (중앙 정렬, 오프셋 3 정수)
<line x1="6" y1="13" x2="12" y2="13" />   ←  6px (중앙 정렬, 오프셋 6 정수)
```
두 글리프의 전체 높이(14px)·선 두께·수직 위치가 동일해 통일성이 성립한다. 기존 div 스팬 구현은 양쪽 모두 삭제.

## 3. 필터 글리프 상시 표시 (MobileProjectWall.tsx)

- 렌더 조건을 `showFilters` → **`revealed`** 로 교체 (햄버거와 동일하게 인트로 완료와 동기해 페이드 인 — `opacity: revealed ? 1 : 0; transition: opacity 400ms ease-out`).
- `showFilters` prop은 **시그니처에서 제거하지 않는다** (외부 계약 불변 — LandingExperience 접촉 금지). 미사용 상태로 유지하고, 유일 소비처 소멸을 주석으로 명기.
- 루트(/)에서 필터 선택 시의 상태 처리(handleFilter)·URL 의미론은 기존 그대로 — 변경 금지.

## 4. 파일 명세

| 파일 | 조치 |
|---|---|
| `src/app/globals.css` | §1 transform 2개 값 교체만 |
| `src/components/SiteHeader.tsx` | §2 햄버거 글리프 SVG 교체만 |
| `src/components/MobileProjectWall.tsx` | §2 필터 글리프 SVG 교체 + §3 가시성 조건 교체만 |

그 외 파일 접촉 금지. 링 물리·패널 동작·워드마크 타이밍 로직 변경 금지.

## 5. 검증
- `npx tsc --noEmit`만. `npm run dev` / `npm run build` 금지.
- 배포 후 실기기 확인 3항: ① 인트로 수렴이 전 구간 수평 중앙 유지(수직 상승 궤적, 종료 시 스냅 없음), ② 두 글리프 선 두께 균질·전체 높이 동일, ③ 최초 진입 직후(Works 미진입) 필터 글리프 표시 + 패널 정상 동작.
