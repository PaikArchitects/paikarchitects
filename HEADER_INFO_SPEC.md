# HEADER_INFO_SPEC — 헤더 높이 통일 + 정보 슬라이드화 + 화살표 우선순위 + 정적 페이지

## 범위
1. 헤더 높이 전 상태 통일 (필터 유무 무관) + 필터 행 간격 절반
2. 정보 텍스트의 슬라이드화 (타이틀만 고정)
3. 다이어그램 화살표 우선순위 (중앙 근접 시에만 활성)
4. 에세이·컨택트 페이지 화이트 배경

수정 파일: `src/app/page.tsx`(또는 LandingExperience), `src/components/ContentArea.tsx`,
`src/components/SiteHeader.tsx`, `src/app/essays/page.tsx`, `src/app/contact/page.tsx`(신규)
검증: `npx tsc --noEmit`

---

## 1. 헤더 높이 통일 (page.tsx / LandingExperience)

상수 정의 및 적용:
```typescript
const HEADER_H = 80   // 모든 상태 공통. 필터 행 포함 여유치
```

- MAIN 컨테이너: `top: showFilters ? 104 : 64` 의 가변 로직 **폐기** → `top: HEADER_H` 고정.
  top transition도 제거.
- 필터 행 위치: `top: 64` → **`top: 50`**, `height: 40` → **`height: 24`**
  (내비 하단 ~37px과의 간격이 기존 약 27px → 약 13px로 절반)
- 필터 행 표시/숨김은 기존 opacity 방식 유지 — 표시 여부와 무관하게
  레이아웃은 HEADER_H로 고정되므로 수직 점프가 사라진다.

## 2. 정보 텍스트 슬라이드화 (ContentArea.tsx)

### 2-A. 고정 컬럼 축소
좌측 고정 컬럼(200px)에는 **Back 컨트롤과 프로젝트 타이틀만** 남긴다.
location·TYPOLOGY/STATUS/YEAR 스택은 컬럼에서 제거.

### 2-B. 트랙 선두에 정보 슬라이드 삽입
ContentArea 내부에서 트랙 렌더 시 슬라이드 배열 앞에 정보 슬라이드를 합성한다
(projectSlides 데이터는 수정하지 않음 — project 필드에서 파생):

```tsx
{/* 트랙의 첫 번째 자식 — kind: 'info' (내부 전용) */}
<div style={{
  width: 200, flexShrink: 0,
  height: '72%',                    // image 슬라이드와 동일 높이
  display: 'flex', flexDirection: 'column',
  justifyContent: 'flex-start',     // 콘텐츠 최상단 = 이미지 최상단
  gap: 24,
}}>
  <div style={{ fontSize: 11, fontWeight: 300, letterSpacing: '0.08em',
                textTransform: 'uppercase', opacity: 0.6 }}>{project.location ?? ''}</div>
  {/* 기존 메타 스택(TYPOLOGY/STATUS/YEAR) 마크업을 그대로 이곳으로 이동 */}
</div>
```

트랙이 `alignItems: center`이므로 같은 높이(72%) 박스끼리 상단 라인이 자동 일치한다.

### 2-C. 스크롤 모델 갱신
- **초기 위치**: scrollPos = 0 을 "트랙 좌측 끝 = 뷰포트 좌측 끝"으로 정의.
  진입 시 [정보 슬라이드][히어로]가 좌측부터 보인다.
- 클램프: min = 0, max = 마지막 슬라이드 중앙 정렬 위치 (기존 유지)
- **모프 목표 rect 갱신**: 히어로는 이제 트랙 index 1 —
  목표 left = 슬라이드 뷰포트 좌측 + 200(정보 슬라이드) + 24(gap),
  높이 72%·수직 중앙은 기존 유지. 모프 종료 시 scrollPos 0 상태와 픽셀 일치 확인.
- 정보 슬라이드 텍스트는 모프 완료 후 400ms 페이드인 (기존 정보 컬럼 페이드 로직 이전)
- 카운터: 정보 슬라이드 제외 — `displayIdx = max(nearestIdx, 1)`,
  분모는 콘텐츠 슬라이드 수(slides.length) 유지
- 좌측 글리프(‹): scrollPos 0에서 숨김 (기존 "첫 슬라이드" 조건을 scrollPos ≤ 0으로 대체)

## 3. 다이어그램 화살표 우선순위 (ContentArea.tsx)

diagramSet 내부 인터랙션(소형 글리프 + 클릭 + cursor:none)을
**해당 슬라이드가 뷰포트 중앙에 근접했을 때만** 활성화한다:

```typescript
const isNearCenter = Math.abs(slideCenterX - viewportCenterX) < viewportWidth * 0.2
```

- `isNearCenter === false`인 다이어그램 위에서는: 내부 글리프 미표시,
  클릭은 외부 트랙 내비게이션으로 동작(대형 글리프 표시) — 즉 우측에서 막
  등장한 다이어그램을 클릭하면 그 다이어그램이 중앙으로 이동한다
- `isNearCenter === true`가 되면 내부 글리프/클릭/자동진행이 활성화
- 자동 진행(3초) 가동 조건도 동일한 isNearCenter 판정으로 통일

slideCenterX는 slideRects + scrollPos로 산출. 드래그/스크롤 변화에 따라 실시간 재평가.

## 4. 정적 페이지 화이트 배경

### 4-A. essays/page.tsx
```typescript
backgroundColor: '#080706' → '#FFFFFF'
color: '#ffffff' → '#080706' (opacity 0.4 유지)
```

### 4-B. contact/page.tsx — 신규 생성 (현재 라우트 부재로 404)
essays와 동일한 구조의 화이트 placeholder:
```tsx
export default function ContactPage() {
  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FFFFFF',
                   display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#080706', fontFamily: 'sans-serif', fontSize: '14px',
                  fontWeight: 300, letterSpacing: '0.1em', opacity: 0.4 }}>
        Contact — Coming Soon
      </p>
    </main>
  );
}
```

### 4-C. SiteHeader.tsx — 라이트 경로 등록
```typescript
// BEFORE
const STATIC_LIGHT_PATHS = new Set(['/about', '/work'])
// AFTER
const STATIC_LIGHT_PATHS = new Set(['/about', '/work', '/essays', '/contact'])
```

---

## 검증
```bash
npx tsc --noEmit
```
배포 후: 필터 토글 시 레이아웃 수직 점프 없음 / 정보 텍스트가 트랙과 함께 이동,
타이틀만 고정 / 우측 등장 직후 다이어그램에서 대형 글리프 우선 /
에세이·컨택트 화이트 + 다크 모노그램·내비.
