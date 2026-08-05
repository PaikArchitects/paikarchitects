# GRID_CONTENT_meta_sticky_fix_260804 — 메타 sticky 3결함 수정

대상: `src/components/GridContentArea.tsx` 단일 파일. `ContentArea.tsx` 절대 수정 금지.
검증: `npx tsc --noEmit`만. dev/build 금지.

직전 명세(GRID_CONTENT_meta_sticky_260804)로 구현된 메타 오버레이(1276~1301행)에 3개 결함이 확인됨.
전부 오버레이 스타일 블록 내 수정으로 해소한다. 트랙 구조·rects·centerScroll 등은 불변.

---

## 결함 1 — 메타 순간이동 (sticky 산식 오류)

### 증상
커버(01) → 02 슬라이드로 넘어가는 순간, 메타가 슬라이드와 함께 흐르지 않고 화면 좌측으로 **순간이동**한다.

### 원인 (확정)
1278행: `left: TRACK_INSET + Math.max(0, -scrollPos)`.
`scrollPos >= 0`이면 `Math.max(0, -scrollPos) = 0` → `left = TRACK_INSET` 즉시 고정.
즉 scrollPos가 0을 넘는 순간 계단식으로 점프한다. sticky(연속)가 아니라 계단 함수다.
`TRACK_INSET`을 `Math.max` 밖으로 뺀 것이 오류 — 자연 위치 `TRACK_INSET - scrollPos` 전체가
`Math.max` 안에 들어가야 연속이 된다.

### 수정
신규 상수 추가 (48행 `META_BLEED` 근처):
```
const META_MARGIN = 24   // sticky 최좌측 고정선 — 뷰포트 좌측 여백 (TRACK_INSET과 동일값, 결함 2)
```
1278행 교체:
```
left: Math.max(META_MARGIN, TRACK_INSET - scrollPos),   // sticky x — 연속 (fix 결함 1)
```
- 메타 자연 위치 = `TRACK_INSET - scrollPos` (트랙 자식 0 화면좌측; 커버 왼쪽 옆과 수학적으로 동일).
- scrollPos 증가 → 자연 위치 감소 → `META_MARGIN`에서 고정. **연속 함수 → 순간이동 소멸.**
- scrollPos 음수(커버에서 히어로 중앙정렬) → 자연 위치 > TRACK_INSET → 메타가 커버 옆 정위치.

---

## 결함 2 — 좌측 여백 부재 (시각적 불안정)

### 증상
sticky 고정 시 메타 배경이 화면 최좌측(여백 0)에 딱 붙어 불안정하다.

### 원인
현재 고정선이 `TRACK_INSET`(=24)인데도 여백이 없어 보이는 것은, 결함 1의 계단 점프로 메타가
예상보다 왼쪽에 붙고 `paddingLeft: 0`(1282행)이라 배경·텍스트가 곧바로 시작하기 때문.

### 수정
- 결함 1의 `META_MARGIN = 24`로 고정선이 뷰포트 좌측에서 24px 안쪽에 선다(여백 확보).
- 텍스트가 배경 좌측 에지에 딱 붙지 않도록 좌측 패딩을 준다. 1282행:
  ```
  paddingLeft: 4,    // 0 → 4 (텍스트 좌측 미세 여백)
  ```
  ※ 배경 박스 자체는 `left = META_MARGIN`에서 시작하므로 이미 화면 좌측 24px 여백이 있다.
    paddingLeft는 배경 안에서 텍스트를 4px 더 들여 안정감만 준다. 과하게 주지 말 것(폭 잠식).
- `META_MARGIN`을 24보다 키우고 싶으면(더 넓은 여백) 이 상수만 조정. 단 `INFO_SLIDE_W + 16`
  폭이 커버와 안 겹치는 범위 내에서. 기본 24 권장.

---

## 결함 3 — 배경 불투명 (겹칠 때 흰 판)

### 증상
메타가 텍스트 슬라이드(흰 배경) 위에 겹칠 때, 반투명이 아니라 **불투명 흰 판**으로 보여 뒤가 안 비친다.

### 원인 (확정)
1293~1294행 `backdropFilter: blur(12px)` / `WebkitBackdropFilter: blur(12px)`.
blur(12px)가 뒤 픽셀을 강하게 흐리는데, 뒤가 밝은 이미지·흰 텍스트 배경이면 흐린 결과가
거의 흰색으로 뭉개진다. `rgba(255,255,255,0.66)` 반투명이어도 그 아래 blur된 픽셀이 이미
흰색에 가까워 전체가 불투명 흰 판처럼 보인다. Image 3(텍스트 슬라이드 겹침)에서 특히 심함.

### 수정
**`backdropFilter` 완전 제거.** 순수 rgba 반투명만 쓰면 뒤가 그대로 비친다.
1293~1294행 두 줄 삭제:
```
(삭제) backdropFilter: 'blur(12px)',
(삭제) WebkitBackdropFilter: 'blur(12px)',
```
- 삭제 후 배경은 `rgba(255,255,255,0.66)` 순수 반투명만 남는다 → 뒤 슬라이드가 66% 흰색
  스크림 너머로 비쳐 보인다.
- 만약 흰 텍스트 슬라이드 위에서 대비가 부족하면(메타 텍스트 #080706이 어두우므로 대체로 충분)
  투명도를 0.66 → 0.72로 소폭 올려 조정. blur는 절대 되살리지 말 것.

---

## 수정 요약 (오버레이 스타일 블록 1276~1301행)

```jsx
<div style={{
  position: 'absolute',
  left: Math.max(META_MARGIN, TRACK_INSET - scrollPos),   // 결함 1 — 연속 sticky
  top: Math.round((vpSize.h - slideH) / 2) - META_BLEED,
  width: INFO_SLIDE_W + 16,
  height: Math.round(slideH) + META_BLEED * 2,
  paddingLeft: 4,           // 결함 2 — 텍스트 좌측 미세 여백
  paddingRight: 16,
  paddingTop: META_TOP_PAD,
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-start',
  gap: META_GAP,
  fontFamily: FONT,
  color: '#080706',
  background: 'rgba(255,255,255,0.66)',   // 결함 3 — 순수 반투명만, blur 없음
  // backdropFilter 삭제됨 (결함 3)
  opacity: infoIn ? 1 : 0,
  transition: 'opacity 400ms ease',
  overflowY: 'auto',
  zIndex: 7,
}}>
  {infoContent}
</div>
```

## 신규 상수 (48~50행 근처)
```
const META_MARGIN = 24   // sticky 최좌측 고정선 = 뷰포트 좌측 여백
```

## 불변 (건드리지 말 것)
- `rects`·`centerScroll`·`clampScroll`·트랙 자식 0 폭예약 구조 — 전부 불변.
- `min/maxScroll` (직전 명세 작업 ③) — 불변.
- 캡션·슬라이드 번호 — 불변.

## 검증
1. `npx tsc --noEmit` — 오류 0.
2. 육안: 커버→02 넘길 때 메타가 슬라이드와 함께 왼쪽으로 흐르다 여백선(24px)에서 멈춤(점프 없음).
3. 육안: 메타가 텍스트 슬라이드 위에 겹칠 때 뒤 텍스트가 반투명 너머로 비쳐 보임(흰 판 아님).
