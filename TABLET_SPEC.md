# TABLET_SPEC.md — 태블릿(768–1439px) 데스크탑 축소형 대응

## 0. 목적과 원칙

iPad 세로(실측 viewport 1044px)에서 데스크탑 레이아웃이 그대로 적용되어
레이아웃이 무너지는 문제를 해결한다. **모바일 레이아웃이 아닌, 데스크탑
레이아웃의 축소형(desktop-shrink)** 으로 대응한다.

### 적용 범위 — 사각지대 제거형
- **모바일**: `< 768px` (기존 `MobileProjectWall`, 불변)
- **태블릿(이번 작업)**: `768px ~ 1439px` — 데스크탑 컴포넌트를 그대로 쓰되 치수만 보정
- **데스크탑(동결)**: `>= 1440px` — 거동·치수 모두 불변

> 디자인 기준점은 iPad 세로(1024~1044px)이나, 적용 하한을 768px로 내려
> Split View·글자 확대로 viewport가 1024px 아래로 내려가는 경우의
> 사각지대(768~1023px)를 원천 제거한다.

### 동결 보증
태블릿 보정은 전부 `1439px` 이하에서만 발동한다. `1440px` 이상에서는
어떤 값도 변경되지 않으므로 데스크탑 동결 원칙과 충돌하지 않는다.
**검증 시 데스크탑(1440px+) 거동이 1px도 변하지 않았음을 반드시 확인한다.**

---

## 1. 수정 대상 확정 (영상 분석 결과)

| # | 증상 | 근본 원인 | 본 spec에서 처리 |
|---|------|-----------|------------------|
| 1 | 우측 이미지가 화면 우측으로 잘림 | 슬라이드 `height:100%` + `width:auto` → 세로 긴 viewport에서 슬라이드 폭이 가용 가로폭 초과 | §3 |
| 2 | 상단 메뉴(내비+필터) 줄바꿈/잘림 | 필터 바 가로 1열(`gap:28`)이 좁은 폭에 미수용 | §4 |
| 3 | 메뉴와 ACP 모노그램 겹침 | 중앙 정렬 필터 바가 좌상단 고정 워드마크 영역 침범 | §4 |
| 5 | 좌측 월 텍스트 좌측 글자 잘림 | 카드 텍스트 `width:180` 고정 vs 컨테이너 `28vw` 협소 | §2 |

> **오류 4(우하단 무한 곡선)는 수정 대상 아님.** 코드베이스에 로딩/스피너
> 컴포넌트가 존재하지 않음을 확인했다. 해당 곡선은 iOS 화면 녹화의 시스템
> 오버레이이며 사이트 결함이 아니다.

---

## 2. ProjectWall — 좌측 월 (오류 5)

**파일**: `src/components/ProjectWall.tsx`

### 문제
- 컨테이너 폭 `28vw` → 1044px에서 약 292px
- 카드 텍스트 블록 `width: 180` 고정 + `paddingLeft: 20`
- 이미지 `maxWidth: calc(100% - 188px)`
- 좁아진 폭에서 텍스트가 컨테이너 좌측 경계를 침범해 좌측 글자 잘림

### 처리
컨테이너 폭을 태블릿 구간에서 vw 비례가 아닌 **하한 보장**으로 전환한다.

`ProjectWall` 최상위 컨테이너(현재 `width: '28vw'`)를 다음으로 교체:
```
width: 'clamp(300px, 28vw, 28vw)'
```
- 효과: 28vw가 300px 미만으로 떨어지지 않도록 바닥을 깐다.
  1044px에서는 max(300, 292) = 300px 확보.
- 데스크탑(1440px+)에서는 28vw = 403px이므로 clamp 상한에 영향 없음 → 동결 유지.

추가로, 카드 텍스트 블록의 고정 `width: 180`을 태블릿에서 소폭 축소해
이미지 영역과의 충돌 여유를 확보한다. **인라인 고정값이므로 CSS 미디어쿼리로
덮을 수 없다. 다음 중 택1로 구현:**

- (권장) `WallCard` 텍스트 블록 `width`를 `clamp(150px, 17vw, 180px)`로 변경.
  데스크탑(1440px+)에서 17vw = 245px > 180 상한이므로 항상 180 유지 → 동결.
  1044px에서 17vw = 177px이나 상한 180 적용… **주의**: 이 식은 태블릿에서
  축소 효과가 약하다. 아래 식으로 대체한다:
  ```
  width: 'clamp(150px, calc(120px + 6vw), 180px)'
  ```
  - 1044px: 120 + 62.6 = 182 → 상한 180. (효과 미미)
  - 단순화를 위해 **고정 분기 방식 채택**:

- (채택) 인라인 스타일을 미디어쿼리로 제어 불가하므로, `WallCard` 텍스트
  블록과 이미지 `maxWidth`를 `globals.css` 클래스로 이관한다.
  `.wall-card-text { width: 180px; }` /
  `@media (max-width:1439px){ .wall-card-text{ width:150px; } }`
  `.wall-card-img { max-width: calc(100% - 188px); }` /
  `@media (max-width:1439px){ .wall-card-img{ max-width: calc(100% - 158px); } }`
  그리고 `WallCard`의 해당 인라인 `width`/`maxWidth`를 제거하고 className 부여.

> 좌측 패딩(`paddingLeft: 20`)은 유지. 잘림의 원인은 패딩이 아니라
> 텍스트 블록 폭이 컨테이너를 초과해 우측 정렬 텍스트가 좌측으로 밀린 것이므로,
> 컨테이너 하한(300px) + 텍스트 폭 축소(150px)로 해소된다.

---

## 3. ContentArea — 우측 콘텐츠/슬라이드 (오류 1, 최우선)

**파일**: `src/components/ContentArea.tsx`

### 문제
- 모든 슬라이드가 `height` 기준이고 폭은 이미지 비율로 결정(`width: 'auto'`).
  - `ImageSlideView`: `height:100%, width:auto`
  - 슬라이드 높이 = viewport의 `SLIDE_H_RATIO`(0.72) 또는 diagram `48%`
- iPad 세로는 높이가 크므로 height 기준 슬라이드 폭이 우측 영역
  가용 가로폭(약 72vw)을 초과 → 우측 잘림.

### 우선 원칙 (확정)
**이미지 전체가 보이도록 가로폭에 맞춘다.** (세로 여백 발생 허용)

### 처리
슬라이드 이미지가 **세로(height) 기준과 가로(width) 기준 중 더 제약이 강한
쪽에 맞도록** 전환한다. 즉 `object-fit: contain` 의미론으로 바꾸되,
레이아웃 폭이 트랙을 넘지 않게 한다.

핵심 변경 — `ImageSlideView`의 `<img>` (현재):
```
style={{ height: '100%', width: 'auto', display: 'block', objectFit: 'cover' }}
```
태블릿(<=1439px)에서 다음 거동이 되도록 한다:
- `max-width: 100%` 를 추가해 이미지 폭이 슬라이드 컨테이너(트랙 가용폭)를
  넘지 못하게 클램프.
- 폭이 제한될 때 높이가 자동 축소되도록 `height: auto`로 폴백 허용.
- `objectFit: cover` → 트랙 폭 초과 잘림의 직접 원인이므로 태블릿에서는
  `contain` 으로 전환(전체 노출 우선).

**구현(인라인 → 클래스 이관 방식, 동결 안전):**
`globals.css`에 추가:
```
.slide-img {
  height: 100%;
  width: auto;
  display: block;
  object-fit: cover;
}
@media (max-width: 1439px) {
  .slide-img {
    max-width: 100%;
    height: auto;
    max-height: 100%;
    object-fit: contain;
    margin: auto;          /* 세로 여백 시 중앙 정렬 */
  }
}
```
`ImageSlideView`/`DiagramSetSlideView`/단일 diagram 이미지의 `<img>`에서
해당 인라인 스타일을 제거하고 `className="slide-img"` 부여.

> **트랙 폭 계산 동반 점검**: 트랙 컨테이너는 `width: calc(100% - TRACK_INSET)`
> (line 619). 우측 영역 자체는 LandingExperience `flex` + `gap:16`로 72vw 상당.
> 이미지에 `max-width:100%`가 걸리면 슬라이드는 트랙 폭을 넘지 않으므로
> 가로 overflow가 사라진다. **추가로** 우측 영역 컨테이너(ContentArea 루트,
> line ~551 `flex:1, overflow:hidden`)의 `overflow:hidden`이 유지되는지 확인 —
> 유지되어야 잔여 overflow가 클립된다.

> **수평 슬라이드 위치 보정**: 슬라이드 폭이 바뀌면 `translateX` 기반
> 슬라이드 위치 계산(`-scrollPos`)이 어긋날 수 있다. 슬라이드 폭을
> 측정값 기반으로 잡는 로직(`measure`/`getBoundingClientRect`)이 있으면
> 그대로 동작하나, 고정 폭 가정이 있으면 측정 기반으로 전환 필요.
> **검증 항목 7에서 슬라이드 넘김 정합성 필수 확인.**

---

## 4. 상단 메뉴 — 필터 바 + 내비 (오류 2, 3)

**파일**: `src/components/LandingExperience.tsx` (필터 바),
`src/components/SiteHeader.tsx` (내비/워드마크 — 미확보, 아래 가정 검증 필요)

### 문제
- 필터 바: `position:absolute, top:50, left:0, right:0, justifyContent:center,
  gap:28` → 12개 항목 가로 1열. 1044px에서 줄바꿈/잘림.
- 좌상단 ACP 워드마크(`position:fixed`)와 중앙 필터가 좁은 폭에서 영역 충돌.

### 우선 원칙 (확정)
**필터를 드롭다운/토글로 축약한다.**

### 처리 — 태블릿 전용 필터 토글
태블릿(<=1439px)에서 필터 바를 가로 나열 대신 **단일 토글 버튼 + 펼침 패널**로 전환.

#### 4.1 토글 트리거
- 위치: 현재 필터 바 자리(상단 중앙, `top:50`). 단, 워드마크와의 충돌
  방지를 위해 **중앙 정렬 유지하되 좌우 안전 패딩 확보**.
- 표기: 현재 선택된 필터명 + ▾ (예: `ALL ▾`, `CULTURE ▾`).
- 스타일: 기존 필터 버튼과 동일 타이포(`fontSize:11, letterSpacing:0.08em,
  textTransform:uppercase, color:#080706`).

#### 4.2 펼침 패널
- 트리거 탭/클릭 시 그 아래로 필터 목록을 **세로 스택**으로 펼침.
- 배경: `#FFFFFF`, 항목 간 `gap` 적당(8~10px), 패널 폭은 내용에 맞춤(중앙 정렬).
- 항목 선택 시: `handleFilter(t)` 호출 + 패널 닫힘.
- 바깥 영역 탭/ESC 시 닫힘.
- `z-index`는 기존 필터 바(`zIndex:50`)와 동일하거나 그 이상.

#### 4.3 구현 방식 (동결 안전)
필터 바 블록(LandingExperience line 202–248)을 **분기 처리**한다. 두 방법 중 택1:

- (A) `mobile` 외에 `tablet` 상태(`768 <= w < 1440`)를 추가하고,
  `tablet`일 때 토글형 렌더, 데스크탑(>=1440)일 때 기존 가로 1열 렌더.
  - `useEffect` 리사이즈 핸들러에서 `tablet` 산출 추가:
    ```
    const w = window.innerWidth
    setMobile(w < 768)
    setTablet(w >= 768 && w < 1440)
    ```
- (B) 가로 1열 렌더는 유지하되 `flexWrap:'wrap'` 금지 + 컨테이너에
  className 부여 후 CSS로 <=1439px에서 토글 UI로 교체. → 인라인 구조상
  복잡. **(A) 채택 권장.**

> **데스크탑 보증**: `tablet` 분기는 `< 1440`에서만 참. 1440px+는 기존
> 가로 1열 렌더 경로를 그대로 타므로 데스크탑 필터 거동 불변.

#### 4.4 내비 + 워드마크 충돌 (오류 3) — 코드 확정

**확정된 충돌 구조** (SiteHeader.tsx + globals.css 확인 완료):
- `.site-nav` (ABOUT/WORKS/ESSAYS/CONTACTS): `position:fixed; top:24px;
  left:50%; transform:translateX(-50%); gap:32px` → **상단 중앙** 고정.
- 필터 바(타입 필터): `top:50; left:0; right:0; justifyContent:center` →
  **상단 중앙** 고정. 내비와 26px 간격으로 거의 인접.
- ACP 워드마크: 좌상단 고정(`.wordmark-intro.moved`, 데스크탑 기본 좌표).
- 충돌 원인: 좁은 폭(1044px)에서 **중앙 정렬 내비 + 중앙 정렬 필터가
  수평 폭을 다 못 잡고**, 좌측 워드마크 영역까지 밀려 들어가 겹침.
  globals.css에 **768~1439px 구간 규칙이 전무**한 것이 직접 원인.

**처리** — `globals.css`에 태블릿 구간 규칙 추가:
```
@media (min-width: 768px) and (max-width: 1439px) {
  /* 내비: 중앙 정렬 해제 → 우측 정렬로 이동해 좌측 워드마크와 분리 */
  .site-nav {
    left: auto;
    right: 24px;
    transform: none;
    gap: 24px;
  }
  .site-nav-link {
    font-size: 12px;     /* 13 → 12, 폭 절감 */
  }
}
```
- 효과: 내비가 우측 끝으로 이동 → 좌상단 워드마크와 수평 분리(오류 3 해소).
- 필터 토글(§4.1)은 상단 중앙(`top:50`)에 단일 버튼으로 남으므로,
  좌(워드마크) · 중앙(필터 토글) · 우(내비) 3분할로 충돌 없이 정렬된다.

**데스크탑 보증**: 위 블록은 `max-width:1439px`로 한정. 1440px+에서는
`.site-nav`가 기존 `left:50%; translateX(-50%); gap:32px; font-size:13px`를
그대로 유지 → 데스크탑 내비 거동 불변.

> 모바일(<=767px) 블록의 `.site-nav { right:16px }` 등과 충돌하지 않는다.
> 모바일 블록은 `max-width:767px`, 태블릿 블록은 `min-width:768px`로
> 구간이 배타적이다.

---

## 5. 구현 순서

1. **§3 ContentArea 이미지 클램프** — 최우선(핵심 결함). `.slide-img` 클래스화.
2. **§2 ProjectWall 폭 하한 + 텍스트 폭 축소** — `.wall-card-*` 클래스화.
3. **§4.1–4.3 필터 토글** — `tablet` 상태 추가 + 토글 UI.
4. **§4.4 내비/워드마크** — `globals.css` 태블릿 구간 규칙 추가(코드 확정 완료).

각 단계 후 `npx tsc --noEmit` 통과 확인.

---

## 6. 검증 체크리스트 (iPad 세로 + 데스크탑)

iPad 세로(1024~1044px) 실기 또는 브라우저 1044px 폭에서:

1. [ ] 우측 슬라이드 이미지가 좌우 잘림 없이 **전체 노출**된다(세로 여백 허용).
2. [ ] 상단 필터가 줄바꿈/잘림 없이 단일 토글로 표시된다.
3. [ ] 필터 토글 펼침/선택/닫힘이 정상 동작한다.
4. [ ] 내비와 ACP 모노그램이 겹치지 않는다.
5. [ ] 좌측 월의 프로젝트명 좌측 글자가 잘리지 않는다.
6. [ ] 좌측 월 셔플-싱크/스크롤이 정상 동작한다.
7. [ ] 우측 수평 슬라이드 넘김(prev/next)이 폭 변경 후에도 정위치에 정렬된다.
8. [ ] 다이어그램 슬라이드 탭 진행이 정상 동작한다.

데스크탑(1440px, 1920px)에서:

9.  [ ] 필터가 **기존 가로 1열**로 표시된다(토글 아님).
10. [ ] 슬라이드 이미지가 **기존 cover 거동**으로 표시된다.
11. [ ] 좌측 월 텍스트 폭이 **기존 180px**로 유지된다.
12. [ ] 위 1–11 외 데스크탑 거동에 어떤 시각적 변화도 없다.

> 9–12 중 하나라도 변화가 감지되면 미디어쿼리 상한(1439px)이 잘못 적용된
> 것이므로 즉시 롤백·재검토.
