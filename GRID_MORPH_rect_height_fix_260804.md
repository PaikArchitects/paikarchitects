# GRID_MORPH_rect_height_fix_260804 — morph 도착 rect 높이 기준 통일

대상: `src/components/GridContentArea.tsx` 단일 파일.
검증: `npx tsc --noEmit`만. dev/build 금지.

---

## 0. 증상
모프가 끝나는 찰나에 **이미지가 확대된 것처럼** 큰 모습이 잠시 비치고 정상 크기로 돌아온다.
진입에서 심각, 복귀에서는 경미. 반복해도 동일(= 로드 문제 아님).

---

## 1. 원인 (확정) — 폭과 높이가 서로 다른 기준으로 계산된다

### 트랙 슬라이드의 실제 크기
```
684행: const slideH = vpSize.h * SLIDE_H_RATIO      ← 뷰포트 높이 기준
695행: widths.push(ratio * slideH)                   ← rects[1].w = ratio × slideH
```
트랙 히어로는 **높이 `slideH`, 폭 `ratio × slideH`** 로 그려진다. 종횡비 = `ratio`(원본비). 정상.

### morph 도착 rect
```
793행: const rh = rootRef.current.clientHeight       ← 루트 컨테이너 높이 (≠ vpSize.h)
824행: const th = rh * SLIDE_H_RATIO                 ← 높이는 rh 기준
827행: const tw = hasHero ? rc[1].w : th * aspect    ← 폭은 slideH 기준(rc[1].w)
```
**폭은 `ratio × slideH`(큰 기준), 높이는 `rh × SLIDE_H_RATIO`(작은 기준)** 를 조합한다.

루트 컨테이너는 헤더 셸 아래 영역이므로 `rh < vpSize.h`이고, 따라서 `th < slideH`다.
결과적으로 morph 도착 박스는 **폭은 정상인데 높이가 부족한 가로로 납작한 형태**가 되고,
종횡비가 원본보다 커진다(`tw/th > ratio`).

`objectFit: 'cover'`는 이 납작한 박스를 채우기 위해 이미지를 **확대 크롭**한다.
→ 이것이 "확대된 큰 이미지"의 정체다.

### 왜 "찰나에 비치는가"
morph 레이어는 도착 후 즉시 사라지지 않는다(852~863행):
```
MORPH_MS(700)                     → setMorphing(false), 트랙 페이드인 시작. 모프 레이어 유지
MORPH_MS + MORPH_HOLD_MS(400)     → setMorphVisible(false), 모프 레이어 페이드아웃 개시
+ MORPH_FADE_MS(250)              → rect 해제
```
HOLD 400ms 동안 **확대 크롭된 morph 레이어**가 **정상 크기 트랙 히어로 위에 겹쳐** 있다가
페이드아웃한다. 사용자에게는 "큰 이미지가 잠시 비치고 정상 크기로 돌아오는" 것으로 보인다.

### 복귀가 경미한 이유
역-morph(879행)도 같은 `rh` 기준을 쓰지만, 출발점이 **화면에 실제로 있던 슬라이드**라
시작 프레임의 불일치가 눈에 덜 띈다. 다만 원리적으로 동일한 결함이므로 함께 고친다.

---

## 2. 수정 — 높이 기준을 트랙과 통일

morph 도착 높이를 `rh` 기준이 아니라 **트랙과 동일한 `slideH`** 로 계산한다.
`slideH`는 컴포넌트 스코프에 이미 존재하므로(684행) 그대로 참조하면 된다.

### 2-1. 진입 morph (824행)
```
const th = rh * SLIDE_H_RATIO
        ↓
const th = slideH        // 트랙 슬라이드와 동일 높이 — 폭(rc[1].w)과 같은 기준이어야 종횡비가 맞는다
```

### 2-2. 진입 morph top 좌표 (845행)
`top`은 루트 컨테이너 기준 좌표이므로 `rh`를 계속 쓴다. **여기는 바꾸지 않는다.**
```
top: (rh - th) / 2,      // 유지 — 컨테이너 내 세로 중앙
```
단 `th`가 커졌으므로 세로 중앙 위치는 자동으로 재계산된다.

⚠ `slideH > rh`인 경우(뷰포트 대비 컨테이너가 매우 낮을 때) `top`이 음수가 될 수 있다.
평시에는 `SLIDE_H_RATIO = 0.72`이므로 `slideH = 0.72 × vpSize.h`이고 `rh`는 헤더를 뺀 값이라
`slideH < rh`가 성립한다. 성립하지 않는 극단적 뷰포트에서는 트랙 히어로도 같은 높이로
그려지므로 morph와 트랙이 여전히 일치한다 — 불일치는 발생하지 않는다.

### 2-3. 역-morph (879행 근처, 같은 패턴)
역-morph 블록에서도 동일하게 `rh * SLIDE_H_RATIO` → `slideH`로 교체한다.
해당 지점을 grep으로 확인해 **전부** 바꿀 것:
```
grep -n "rh \* SLIDE_H_RATIO" GridContentArea.tsx
```
→ 진입·역morph 양쪽 모두 교체. 교체 후 이 grep 결과가 **0건**이어야 한다.

⚠ 역-morph의 출발 슬라이드가 **diagramSet**이면 트랙 높이가 `diagramH`(= `vpSize.h × DIAGRAM_H_RATIO`)
이지 `slideH`가 아니다. 출발 슬라이드 종류에 따라 높이를 맞춘다:
```jsx
const curSlideH = curSlide && isDiagram(curSlide) ? diagramH : slideH
```
그리고 역-morph의 `th`에 `curSlideH`를 쓴다. (진입은 항상 커버=image이므로 `slideH` 고정.)

---

## 3. 검증

### 코드
1. `npx tsc --noEmit` — 오류 0.
2. `grep -n "rh \* SLIDE_H_RATIO" GridContentArea.tsx` → **0건**.
3. `rh` 자체는 `top` 계산에 여전히 필요하므로 **선언은 유지**된다(미사용 아님).

### 육안
1. 진입: 모프 종료 순간 확대된 이미지가 비치지 않고, 크기 변화 없이 트랙 히어로로 인계된다.
2. 복귀: 역-morph 출발 시 크기 튐 없음.
3. 가로로 긴 프로젝트(도산대로)·정상 비율(산수경) 양쪽에서 확인.
4. diagramSet 슬라이드에서 뒤로가기 — 크기 튐 없음.

---

## 4. 절대 불변
- 메타 sticky 구조(`metaShift`·`META_SLOT_W`·`META_PAD_X`·`INFO_SLIDE_W 270`·`TITLE_SET_MIN_H 160`) — 불변.
- morph 2겹 레이어(썸네일 하위 + 원본 상위, `FULL_FADE_MS 120`) — 불변.
- `holdBackdrop`·역-morph `curIdx` 출발 rect·`closeProject` rect 재측정 — 불변.
- 타이밍 상수 `MORPH_MS 700`·`MORPH_HOLD_MS 400`·`MORPH_FADE_MS 250` — 불변.
  (HOLD 구간 자체는 트랙 페이드인을 덮는 정당한 설계다. 문제는 크기 불일치였지 타이밍이 아니다.)
- `centerScroll`·`clampScroll`·캡션·슬라이드 카운터 — 불변.
- `ContentArea.tsx`·`GridExperience.tsx` — 수정 없음.
