# GRID_CONTENT_meta_padding_260804 — 메타 좌우 여백 회복 (텍스트 실폭 270 유지)

대상: `src/components/GridContentArea.tsx` 단일 파일.
**ContentArea.tsx 수정 금지** (직전 명세에서 상수 2줄만 이미 반영 완료 — 추가 수정 없음).
검증: `npx tsc --noEmit`만. dev/build 금지.

---

## 0. 경위 — 잘못된 트레이드오프 정정

스크롤의 원인은 좌측 여백이 아니라 **폭 계산 누락**이었다.
- 트랙 밖 오버레이 시절: `width: INFO_SLIDE_W + 16`, `paddingRight: 16` → 텍스트 실폭 = `INFO_SLIDE_W`.
- v2에서 트랙 자식으로 옮기며 **`+16` 폭 보정만 누락**하고 패딩은 그대로 → 실폭 20px 축소 → 스크롤.

직전 명세에서 이를 "패딩 제거"로 해결했으나, 이는 **폭을 확보하는 대신 여백을 희생한 잘못된
트레이드오프**였다. 결과적으로 텍스트가 좌측 에지에 완전히 달라붙었다.

올바른 해법: **폭 예약 자체를 패딩 포함 값으로 확장**한다. 텍스트 실폭 270을 유지하면서
좌우 여백을 되살린다.

---

## 1. 원리 — 폭 예약과 트랙 자식 width는 반드시 같아야 한다

트랙 자식 0의 `width`는 `rects[0].w`로 예약된 값과 일치해야 중앙정렬·morph 계산이 정합한다.
따라서 **두 곳을 동시에 같은 값으로** 바꾼다. 한 쪽만 바꾸면 레이아웃이 어긋난다.

- `rects` 계산: `widths[0]` (657행 근처, 현재 `INFO_SLIDE_W`)
- 트랙 자식 0: `width` (1203행 근처, 현재 `INFO_SLIDE_W`)

이 둘을 `INFO_SLIDE_W + META_PAD_X * 2`로 함께 바꾸고, 자식에 `paddingLeft/Right: META_PAD_X`를
주면 `box-sizing: border-box` 기준 텍스트 실폭이 정확히 `INFO_SLIDE_W`(270)가 된다.

---

## 2. 신규 상수 (INFO_SLIDE_W 선언 근처, 26행 아래)

```
const META_PAD_X = 16   // 메타 좌우 내부 여백. 폭 예약은 INFO_SLIDE_W + META_PAD_X*2로 확장되어
                        // 텍스트 실폭은 INFO_SLIDE_W(270)가 그대로 유지된다
const META_SLOT_W = INFO_SLIDE_W + META_PAD_X * 2   // = 302. 폭 예약·트랙 자식 width 공통값
```

`META_SLOT_W`를 단일 소유로 두어 두 지점이 어긋날 수 없게 한다.

---

## 3. 수정

### 3-1. rects 폭 예약 (657행 근처)
```
const widths: number[] = [INFO_SLIDE_W]     // 현재
                ↓
const widths: number[] = [META_SLOT_W]      // 패딩 포함 슬롯 폭
```

### 3-2. 트랙 자식 0 (1203행 근처)
```
width: INFO_SLIDE_W,        →   width: META_SLOT_W,
paddingLeft: 0,             →   paddingLeft: META_PAD_X,
paddingRight: 0,            →   paddingRight: META_PAD_X,
```
→ 텍스트 실폭 = `302 - 16 - 16` = **270** (INFO_SLIDE_W 그대로 유지, 스크롤 재발 없음)
→ 좌우 각 16px 여백 확보 (텍스트가 에지에 붙지 않음)

### 3-3. 배경도 함께 확장됨 (자동)
`background`/`backdropFilter`가 트랙 자식 0에 걸려 있으므로, 폭이 302로 넓어지면 배경도
좌우로 16px씩 더 덮는다. 텍스트 주변에 여백이 생겨 시각적 안정감이 확보된다. 별도 조치 불필요.

---

## 4. sticky 여백과의 관계 (확인만, 수정 불필요)

`metaShift = Math.max(0, META_MARGIN - (TRACK_INSET - scrollPos))`는 **슬롯 좌측 에지**를
`META_MARGIN`(24)에 고정한다. 슬롯 안에 `META_PAD_X`(16) 패딩이 있으므로,
sticky 고정 시 텍스트 좌측은 화면에서 `24 + 16 = 40px` 지점에 선다. 시각적으로 충분한 여백이다.

`META_MARGIN`을 추가로 키울 필요는 없다. 실물에서 여백이 과하면 `META_MARGIN` 24→16으로
낮춰 조정(패딩이 이미 여백을 담당하므로).

---

## 5. 작업 순서
1. `META_PAD_X = 16`, `META_SLOT_W = INFO_SLIDE_W + META_PAD_X * 2` 상수 추가(26행 아래).
2. 657행 근처 `widths[0]`: `INFO_SLIDE_W` → `META_SLOT_W`.
3. 1203행 근처 트랙 자식 0: `width` → `META_SLOT_W`, `paddingLeft/Right` → `META_PAD_X`.
4. `npx tsc --noEmit` — 오류 0.
5. `grep -n "widths: number\[\] = \[INFO_SLIDE_W\]" GridContentArea.tsx` → **0건** 확인
   (폭 예약이 확실히 META_SLOT_W로 교체됐는지).

## 6. 절대 불변
- **ContentArea.tsx 일절 수정 금지.** 직전 명세의 상수 2줄 반영 상태 그대로 둔다.
  (링월은 트랙 밖 오버레이 구조가 아니므로 이 패딩 이슈가 없다.)
- v2 애니메이션: 트랙 자식 0의 `transform: translateX(metaShift)` + 트랙 동일 `transition`,
  `metaShift` 산식 — **불변. 회귀 절대 금지.**
- `INFO_SLIDE_W = 270`, `TITLE_SET_MIN_H = 160` — 불변(직전 명세 반영값 유지).
- `background: rgba(255,255,255,0.82)` + `backdropFilter: blur(10px)` — 불변.
- `centerScroll`·`clampScroll`·`min/maxScroll`·캡션·슬라이드 카운터 — 불변.

## 7. 검증 (육안)
1. 산수경: 텍스트 좌우에 16px 여백이 생기고, **세로 스크롤은 여전히 없음**(실폭 270 유지).
2. 커버→02 애니메이션: v2와 동일하게 부드럽게 흐르다 여백선에서 고정(회귀 없음).
3. 히어로 중앙정렬: 슬롯 폭이 302로 커졌으므로 초기 scrollPos가 자동 재계산되어 커버가 정중앙 유지.
