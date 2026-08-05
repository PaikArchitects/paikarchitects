# GRID_CONTENT_meta_width_270_260804 — 정보 슬라이드 폭 270 반영 · 메타 스크롤 해소

대상: `src/components/GridContentArea.tsx` **및** `src/components/ContentArea.tsx`
**※ ContentArea(링월) 수정 예외 승인됨 — 단, 아래 명시된 상수 2개 외 일절 수정 금지.**
검증: `npx tsc --noEmit`만. dev/build 금지.

---

## 0. 경위 — 메모리·코드 불일치 (감사로 확정)

메모리에는 `INFO_SLIDE_W 240→270`(v3_1, 링월·그리드 공통)이 **배포됨**으로 기록돼 있었으나,
실제 코드는 **양쪽 모두 240**이었다. 270 변경은 논의·명세화만 되고 코드에 반영되지 않았다.

```
GridContentArea.tsx:26  const INFO_SLIDE_W = 240   // 주석 이력: 260721 200→240 까지만
ContentArea.tsx:11      const INFO_SLIDE_W = 240   // 동일
```
두 파일은 공유 상수가 아니라 **각자 중복 선언**한다. 따라서 양쪽 다 고쳐야 일치한다.

v2(트랙 자식 복귀)에서 메타 텍스트 실폭이 220px로 줄어 산수경에 세로 스크롤이 발생한 건도
이 폭 문제와 같은 뿌리다. 270 반영 + 패딩 정리로 함께 해소한다.

---

## 작업 ① — INFO_SLIDE_W 240 → 270 (양쪽 파일)

### GridContentArea.tsx 26행
```
const INFO_SLIDE_W = 270     // 세로 스택 — 수평 4열 폐기 (260714-B). 260721 200→240. 260804 240→270
```

### ContentArea.tsx 11행 (동일하게)
```
const INFO_SLIDE_W = 270     // 세로 스택 — 수평 4열 폐기 (260714-B). 260721 200→240. 260804 240→270
```
**ContentArea는 이 한 줄과 작업 ②의 한 줄 외에는 절대 수정하지 않는다.**

### 자동 파급 (수정 불필요 — 확인만)
- `rects` 계산(Grid 657행 / Ring 623행): `widths[0] = INFO_SLIDE_W` → 자동 반영.
- Ring 714행 `left: TRACK_INSET + INFO_SLIDE_W + SLIDE_GAP_PX` → 자동 반영.
- Grid 1203행 트랙 자식 0 `width: INFO_SLIDE_W` → 자동 반영.
- 중앙정렬·morph 계산은 rects에서 파생되므로 자동 정합.

---

## 작업 ② — TITLE_SET_MIN_H 재산출 (양쪽 파일)

### 근거
`TITLE_SET_MIN_H = 175`는 주석대로 **폭에 비례해 산출된 값**이다:
> `260721: 폭 200→240 확대에 따른 재산출. 기존 197 → 175 (비례 164 + 여유 11)`

폭이 240→270(1.125배)이 되면 같은 타이틀이 더 적은 줄로 담기므로 필요 높이가 줄어든다.
같은 산식으로 재산출: `164 / 1.125 ≈ 146`, 여유 11 가산 → **157**. 안전 여유를 더해 **160**.

### GridContentArea.tsx 30행 / ContentArea.tsx 15행 (양쪽 동일)
```
// 260804: 폭 240→270 확대에 따른 재산출. 기존 175 → 160 (비례 146 + 여유 14)
const TITLE_SET_MIN_H = 160
```
※ 이 값은 AWARDS 시작 y를 전 프로젝트 동일화하는 고정 슬롯이다. 실물에서 타이틀이 긴
프로젝트의 서브타이틀과 AWARDS가 겹치면 160→168로 올려 조정. 절대 175로 되돌리지 말 것
(폭 270에서는 과대 → 불필요한 세로 낭비).

---

## 작업 ③ — 트랙 자식 0 좌우 패딩 제거 (GridContentArea만)

### 원인
v2에서 트랙 밖 오버레이(`width: INFO_SLIDE_W + 16`, `paddingRight: 16` → 실폭 = INFO_SLIDE_W)를
트랙 자식(`width: INFO_SLIDE_W`)으로 옮기며 **`+16` 폭 보정을 누락하고 패딩만 가져왔다.**
그 결과 실폭이 `INFO_SLIDE_W - 4 - 16`으로 20px 줄어 줄바꿈이 늘고 스크롤이 발생했다.

### 수정 — 트랙 자식 0 스타일
```
paddingLeft: 4,     →   paddingLeft: 0,
paddingRight: 16,   →   paddingRight: 0,
```
→ 텍스트 실폭 = `INFO_SLIDE_W` = **270** (240 대비 30px 증가, v2 대비 50px 증가)

화면 좌측 여백은 `META_MARGIN`(24) sticky 고정선이 만들고, 커버 옆 자연 위치에서는
`SLIDE_GAP_PX`(24)가 간격을 준다. 내부 패딩은 불필요하다.

### 트랙 밖 잔존 오버레이 확인
`grep -n "INFO_SLIDE_W + 16" GridContentArea.tsx` → v2에서 오버레이를 삭제했다면 **0건**이어야 한다.
1건이라도 남으면 메타가 이중 렌더되므로 해당 블록을 삭제한다.

---

## 작업 순서
1. GridContentArea 26행 `INFO_SLIDE_W` 240→270.
2. GridContentArea 30행 `TITLE_SET_MIN_H` 175→160 (주석 갱신).
3. GridContentArea 트랙 자식 0 `paddingLeft: 4→0`, `paddingRight: 16→0`.
4. ContentArea 11행 `INFO_SLIDE_W` 240→270. **이 줄만.**
5. ContentArea 15행 `TITLE_SET_MIN_H` 175→160. **이 줄만.**
6. `npx tsc --noEmit` — 오류 0.
7. `grep -n "INFO_SLIDE_W + 16" GridContentArea.tsx` → 0건 확인.
8. `grep -n "INFO_SLIDE_W = 240\|TITLE_SET_MIN_H = 175" GridContentArea.tsx ContentArea.tsx` → **0건** 확인.

## 절대 불변
- **ContentArea는 위 2줄(11행·15행) 외 일절 수정 금지.** 트랙 로직·morph·물리 전부 불변.
- v2 애니메이션 구조: 트랙 자식 0의 `transform: translateX(metaShift)` + 트랙 동일 `transition`,
  `metaShift` 산식 — **불변.** 회귀 절대 금지.
- `width: INFO_SLIDE_W`(값만 270으로 바뀜, 구조는 유지) — 폭 예약 역할 불변.
- `background: rgba(255,255,255,0.82)` + `backdropFilter: blur(10px)` — 불변.
- `rects`·`centers`·`centerScroll`·`clampScroll`·`min/maxScroll` — 불변.

## 검증 (육안)
1. 산수경(/work-grid/seongnae-complex): AWARDS·LOCATION 줄바꿈 감소, **세로 스크롤 사라짐.**
2. 커버→02 애니메이션: v2와 동일하게 슬라이드와 함께 흐르다 여백선에서 고정(회귀 없음).
3. 링월(/work/[slug]): 정보 슬라이드 폭이 270으로 넓어지고 레이아웃 정상.
4. 타이틀 긴 프로젝트: 서브타이틀과 AWARDS 미겹침(겹치면 TITLE_SET_MIN_H 160→168).
