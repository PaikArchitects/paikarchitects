# MOBILE_HEADER_FIX_SPEC (v2) — 워드마크 수평 중앙: transform → 레이아웃 이관

## 0. 경위
v1(함수형 통일: translateX → translate)은 실기기 iOS Safari에서 미해결. 원인 재확정: **Safari는 transform 전환 중 퍼센트의 참조 박스(요소 자신의 폭)를 라이브로 재해석하지 않는다.** 전환 시작 시점의 풀 텍스트 폭(~330px) 기준으로 −50%가 px 고정된 채 요소가 ACP(~55px)로 수축 → 좌측 쏠림 → 전환 종료 시 재해석되며 스냅. 폭이 애니메이션되는 요소의 수평 중앙을 transform 퍼센트로 잡는 한 구조적으로 실패한다.

## 1. 수정 — 수평 중앙을 auto margin(레이아웃)으로 이관 (globals.css, 모바일 미디어쿼리 한정)

`@media (max-width: 767px)` 블록 내에서:

### 1-1. 기본 상태 오버라이드 추가 (신규 규칙)
```css
.wordmark-intro {
  left: 0;
  right: 0;
  width: fit-content;
  margin-left: auto;
  margin-right: auto;
  transform: translate(0, -50%);   /* 수평 성분 제거 — 수평은 auto margin이 담당 */
}
```

### 1-2. 기존 모바일 .moved 규칙 교체
```css
.wordmark-intro.moved {
  top: 16px;
  left: 0;                          /* 기존 left: 50% 대체 — 수평 이동 자체가 없음 */
  transform: translate(0, 0);
  font-size: 22px;
}
```

원리: `position: fixed`에서 `left:0 + right:0 + width:fit-content + margin auto`는 과잉제약 해석에 의해 auto 마진이 잔여 공간을 균등 분할 — **레이아웃 단계에서 매 프레임 재해석**되므로 폭 수축 내내 중앙이 유지된다. 애니메이션되는 속성은 top(50%→16px)과 transform 수직 성분뿐이며, 둘 다 요소 폭과 무관하다. 엔진의 transform 퍼센트 처리 방식에 대한 어떤 가정도 필요 없다.

## 2. 불변 조건
- 데스크톱·태블릿(≥768px) 규칙 일절 접촉 금지 — 기본 상태(`left:50%; translate(-50%,-50%)`)와 데스크톱 `.moved`(v1에서 교체한 `translate(0,0)` 포함) 그대로.
- `.wordmark-intro`의 transition 선언·타이밍(1600ms cubic-bezier) 변경 금지.
- 수정 파일은 `src/app/globals.css` 1개. 글리프(§2 v1)·필터 가시성(§3 v1)은 완료 상태 — 접촉 금지.

## 3. 검증
`npx tsc --noEmit`만. 배포 후 실기기(iOS Safari) 확인 1항: 인트로 수렴 전 구간에서 텍스트가 수평 중앙 유지(수직 상승 궤적), 종료 시 스냅 없음. 데스크톱 회귀 확인 1항: 좌상단(left 24px) 수렴 궤적 불변.
