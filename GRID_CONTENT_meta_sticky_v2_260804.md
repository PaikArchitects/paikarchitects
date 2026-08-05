# GRID_CONTENT_meta_sticky_v2_260804 — 메타 sticky 재설계 (트랙 자식 복귀)

대상: `src/components/GridContentArea.tsx` 단일 파일. `ContentArea.tsx` 절대 수정 금지.
검증: `npx tsc --noEmit`만. dev/build 금지.

**직전 두 명세(meta_sticky_260804 / meta_sticky_fix_260804)의 접근이 근본적으로 틀렸다.
산식 수정으로는 해결 불가. 구조를 바꾼다.**

---

## 0. 진짜 원인 (확정) — 애니메이션 소스 불일치

### 증상
메타가 슬라이드와 함께 흐르지 않고 **먼저 목표 위치로 점프**한다. 되돌아올 때도 먼저 돌아와 있다.

### 원인
트랙(1187~1197행)은 이렇게 움직인다:
```
transform: `translateX(${-scrollPos}px)`,
transition: animated && !dragging ? `transform 600ms ${EASE}` : 'none',
```
→ `scrollPos` state는 즉시 목표값이 되지만, **화면상 트랙은 CSS transition으로 600ms에 걸쳐 보간**된다.

반면 메타 오버레이(1276~1301행)는 `left`에 `scrollPos`를 직접 계산해 넣고, **`left`에는 transition이
없다**(1296행 transition은 `opacity` 전용). 따라서 `scrollPos`가 바뀌는 즉시 메타는 0ms에 점프한다.

**트랙 600ms 보간 vs 메타 0ms 즉시 = 순간이동.**
산식(`Math.max(...)`)을 아무리 정확히 써도 타이밍 소스가 다른 한 증상은 사라지지 않는다.
직전 두 명세가 실패한 이유가 이것이다.

### 해법 (구조 변경)
메타 본문을 **트랙의 자식으로 되돌린다.** 트랙 자식이면 트랙의 `translateX`와 `transition`을
그대로 물려받아 **원리적으로 동기화**된다 — 별도 산식·별도 transition 불필요.
그 위에 sticky 클램프만 `transform: translateX(shift)`로 얹고, shift에도 **트랙과 동일한 600ms
transition**을 걸어 전 구간에서 같은 곡선을 타게 한다.

---

## 작업 ① — 메타를 트랙 자식 0으로 복귀 (핵심)

### 현재 상태
- 트랙 자식 0(1202~1208행): 폭 예약 전용 빈 자리 (`opacity: 0`, 내용 없음).
- 메타 본문 `infoContent`: 트랙 밖 절대배치 오버레이(1276~1301행)에만 렌더.

### 변경
**트랙 자식 0에 `infoContent`를 되돌리고, 트랙 밖 오버레이는 완전 삭제한다.**

트랙 자식 0(1202~1208행)을 아래로 교체:
```jsx
{/* 트랙 첫 자식 = 메타 본문. 트랙의 translateX/transition을 물려받아 슬라이드와 완전 동기화된다.
    sticky 클램프는 transform translateX(shift)로 처리하며, shift에도 트랙과 동일한 600ms
    transition을 걸어 전 구간 동일 곡선을 탄다(GRID_CONTENT_meta_sticky_v2 작업 ①) */}
<div style={{
  width: INFO_SLIDE_W,
  flexShrink: 0,
  height: slideH,
  boxSizing: 'border-box',
  position: 'relative',
  zIndex: 7,                        // 이웃 슬라이드 위에 얹히도록 (겹칠 때 메타가 위)
  transform: `translateX(${metaShift}px)`,                      // sticky 클램프
  transition: animated && !dragging ? `transform 600ms ${EASE}` : 'none',  // 트랙과 동일
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-start',
  gap: META_GAP,
  paddingLeft: 4,
  paddingRight: 16,
  paddingTop: META_TOP_PAD,
  fontFamily: FONT,
  color: '#080706',
  background: 'rgba(255,255,255,0.82)',       // 작업 ② — blur와 함께 사용
  backdropFilter: 'blur(10px)',               // 작업 ② — 뿌옇게 유지
  WebkitBackdropFilter: 'blur(10px)',
  opacity: infoIn ? 1 : 0,
  overflowY: 'auto',
}}>
  {infoContent}
</div>
```

### metaShift 계산 (컴포넌트 본문, rects/scrollPos 접근 가능한 위치에 추가)
트랙 자식 0의 화면 좌측 = `TRACK_INSET - scrollPos` (rects[0].x === 0).
이 값이 여백선 `META_MARGIN` 미만이면 그만큼 오른쪽으로 밀어 고정한다.
```jsx
// 메타 sticky — 자연 위치(TRACK_INSET - scrollPos)가 여백선보다 왼쪽이면 그만큼 우측 보정.
// 트랙과 같은 transition을 타므로 클램프 구간에서도 점프 없이 연속으로 붙는다.
const metaShift = Math.max(0, META_MARGIN - (TRACK_INSET - scrollPos))
```
- `scrollPos` 작을 때(커버): 자연 위치 > META_MARGIN → `metaShift = 0` → 메타가 커버 왼쪽 옆 정위치.
- `scrollPos` 커질수록: 자연 위치가 여백선 아래로 내려가면 shift가 그만큼 증가 → 메타가 여백선에 고정.
- 되돌아올 때 역방향 동일. **트랙 transition을 함께 타므로 흐름이 끊기지 않는다.**

### 신규 상수 (48~50행 근처)
```
const META_MARGIN = 24   // sticky 최좌측 고정선 = 뷰포트 좌측 여백
```

### 삭제 대상 (참조 전수 열거)
- **트랙 밖 메타 오버레이 블록 전체** — 1273~1301행(주석 포함) 완전 삭제.
  이 블록이 남아 있으면 메타가 이중 렌더된다.
- 삭제 후 `META_BLEED` 참조가 0건이 되면(오버레이 전용 상수였음) 선언도 삭제.
  **grep으로 확인 후 판단**: `grep -n "META_BLEED" GridContentArea.tsx` → 0건이면 48행 선언 삭제.
  (트랙 자식은 트랙이 높이를 맞추므로 bleed 보정 불필요 — 실선 틈 문제도 구조적으로 해소된다.)

### 주의 — 트랙 자식 0은 폭 예약도 겸한다
`width: INFO_SLIDE_W`는 반드시 유지. rects 인덱싱(0=정보, 1..=콘텐츠)과 중앙정렬 계산이 여기 의존한다.
`transform: translateX`는 레이아웃 폭에 영향을 주지 않으므로(시각적 이동만) rects는 그대로 유효하다.

---

## 작업 ② — 배경: 뿌옇게 유지 + 아래 글씨 안 읽히게

### 경위 (정정)
직전 fix에서 `backdropFilter: blur`를 **완전 삭제한 것은 오류**였다. 사용자가 원한 것은
"뿌옇게 비치되 아래 글씨는 읽히지 않는" 상태인데, blur를 없애자 아래 텍스트가 온전히 다 보이게 됐다.
blur는 유지하되 **스크림 투명도를 올려** 가독성 간섭을 없애는 것이 맞다.

### 수정 (작업 ① 스펙에 이미 반영)
```
background: 'rgba(255,255,255,0.82)',   // 0.66 → 0.82 (아래 글씨 차단)
backdropFilter: 'blur(10px)',           // blur 복원 (뿌연 질감 유지)
WebkitBackdropFilter: 'blur(10px)',
```
- blur가 뒤 텍스트를 흐리고, 0.82 흰 스크림이 대비를 죽여 **아래 글씨가 읽히지 않는다.**
- 그러면서도 완전 불투명이 아니라 뒤 형태·색이 은은히 비친다.
- 실물 조정 범위: 아래 글씨가 여전히 읽히면 0.82 → 0.88. 너무 불투명하면 0.82 → 0.76.
  **blur는 제거하지 말 것**(제거하면 아래 글씨가 온전히 보이는 직전 결함으로 회귀).

---

## 작업 순서
1. `META_MARGIN = 24` 상수 추가.
2. `metaShift` 계산 추가(scrollPos·TRACK_INSET 접근 가능한 컴포넌트 본문, rects 정의 이후).
3. 트랙 자식 0(1202~1208행)을 작업 ① 스펙으로 교체(메타 본문 + shift + 배경).
4. 트랙 밖 오버레이 블록(1273~1301행) 완전 삭제.
5. `grep -n "META_BLEED" GridContentArea.tsx` → 0건이면 선언 삭제.
6. `npx tsc --noEmit` — 오류 0.
7. `grep -n "META_BLEED\|Math.max(0, -scrollPos)" GridContentArea.tsx` → **0건** 확인.

## 불변 (건드리지 말 것)
- 트랙 `transform`/`transition`(1194~1195행) — 메타가 이걸 물려받는 것이 이 명세의 핵심. 불변.
- `rects`·`centers`·`centerScroll`·`clampScroll`·`min/maxScroll` — 전부 불변.
- 캡션(이미지 중앙 종속)·슬라이드 카운터(뷰포트 중앙) — 불변.
- `INFO_SLIDE_W` 폭 예약 — 반드시 유지.

## 검증 (육안)
1. 커버 → 02 넘김: 메타가 슬라이드와 **같은 속도로 함께** 왼쪽으로 흐르다 여백선(24px)에서 멈춘다.
   먼저 가 있거나 먼저 돌아오는 현상 없음.
2. 역방향(02 → 커버): 메타가 여백선에서 떨어져 커버 왼쪽 옆 정위치로 **함께** 돌아온다.
3. 텍스트 슬라이드와 겹칠 때: 뒤가 뿌옇게 비치되 **아래 글씨는 읽히지 않는다.**
