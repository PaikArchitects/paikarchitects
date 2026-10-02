# GRID_JITTER_FIX_v1_261002 — 그리드 열 수 전환 떨림 제거

> 대상 파일: `src/components/GridExperience.tsx` **한 파일만**. 다른 파일 수정 금지.
> 근거: `AUDIT_REPORT_GRID_JITTER_261002.md`(HEAD `86bc079`) + 모바일 녹화 프레임 실측(261002).
> 행번호는 감사 시점 기준이다. 실제 위치는 사전 확인에서 다시 특정한다.

---

## 0. 원인 (실측 + 감사로 확정)

**실측 (60fps, 원본 해상도)**
- 정착 구간에서 카드의 좌변과 우변이 **서로 다른 프레임에** 1 device px씩 이동한다.
- 4→3 전환(확대)인데도 폭이 251↓, 255↓, 256↓처럼 **줄어드는 프레임**이 있다.
- 5→4 전환에서 한 카드의 우변이 329↔330px로 **왕복**한다.
- 카드 안 이미지 내용의 어긋남은 0.5px 이하다. 떨림은 테두리(폭·간격)에서 생긴다.

**감사로 확인된 코드 구조**
1. 카드 기하가 **독립된 CSS transition 3개**(transform / width / height)로 보간된다. 좌변은 transform, 우변은 transform+width에서 나온다. 두 값이 렌더링 단계에서 따로 픽셀 스냅된다 → 좌우 변이 따로 튀고 폭이 왕복한다.
2. **이중 보간**: JS rAF 트윈(420ms)이 매 프레임 새 목표값을 쓰고, CSS transition이 그때마다 재시작한다. 트윈의 마지막 쓰기에서 시작된 transition이 다시 420ms를 돌기 때문에 정착이 최대 약 840ms까지 늘어난다. 그 결과 1px 단위로 기어가는 꼬리 구간이 길어진다.
3. `Math.round(x)`와 `Math.round(cardW)`를 CSS px 단위로 **각각** 반올림한다 → 정지 상태에서도 카드 간격이 15/16px로 섞인다.

---

## 1. 원칙

- **카드 기하(x·y·폭·높이)의 보간 소스는 JS 하나.** CSS transition은 opacity만 남긴다.
- **연속 변화**(트윈·드래그)는 현행 `colsRef` → `paint(c)` 경로를 그대로 쓴다(추종 지연 없음).
- **불연속 변화**(정수 열 `nr` 변경 = film movement, 필터 재정렬, 뷰포트 변경)는 카드별 **비행 오프셋**으로 처리한다. 직전 표시 rect − 새 목표 rect를 오프셋으로 잡고, 정해진 시간 동안 0으로 감쇠시킨다. 현재 CSS transition이 맡던 역할을 JS가 같은 시간·같은 곡선으로 대신하는 것이다.
- **출력은 가장자리 기준 디바이스 픽셀 스냅.** 좌·우·상·하 각 변을 한 번씩만 스냅하고, 폭은 우변 − 좌변으로 구한다.

---

## 2. 사전 확인 (하나라도 어긋나면 수정 없이 중단·보고)

1. `git log -1 --format=%h -- src/components/GridExperience.tsx` 결과가 `86bc079`이거나 그 이전 커밋인지 확인한다. 이후 변경이 있으면 중단한다.
2. 파일 안에서 아래 식별자의 검색 결과를 **전부** 행번호와 함께 보고한다.
   `TWEEN_MS`, `FLOW_MS`, `FADE_MS`, `setFlow`, `gm-flow`, `paintRef`, `colsRef`, `animateTo`, `transition`, `will-change`, `style.transform`, `style.width`, `style.height`, `wPx`, `hPx`, `easeOut`, `Math.pow(1 - p`
3. `.gm-card`의 transform·width·height를 쓰는 곳이 `paint()` 내부(269–271행 부근) 말고도 있으면 중단한다.
4. 저장소 전체에서 `gm-card`를 검색한다. GridExperience.tsx 밖에서 이 클래스를 스타일링하거나 조작하는 곳이 있으면 중단한다.
5. `paint()`의 카드 순회 부분에서 다음 두 가지를 특정해 보고한다. 특정할 수 없으면 중단한다.
   - 카드 식별 키(프로젝트 `_id` 또는 slug)
   - 순회 순서의 출처(필터 재정렬이 반영된 배열인지)
6. flow 상태(`setFlow`)가 `paint()` 안에서 **현재값으로** 읽히는지 확인한다(state 클로저 지연 여부). 지연이 있으면 §3-2의 `flowRef`를 추가해 setFlow와 동기화한다.

---

## 3. 변경 내용

### 3-1. 모듈 수준 헬퍼 추가

```ts
type Rect = { x: number; y: number; w: number; h: number }
const easeOutCubic = (p: number) => 1 - Math.pow(1 - p, 3)
const snapDev = (v: number, dpr: number) => Math.round(v * dpr) / dpr
```

- `animateTo`의 `step` 안에 인라인으로 쓰인 `1 - Math.pow(1 - p, 3)`은 이 헬퍼 호출로 교체한다(수식 동일).
- 현행 CSS 곡선 `cubic-bezier(0.22, 0.61, 0.36, 1)`과 easeOutCubic의 차이는 최대 1.6%라서 같은 곡선으로 간주한다.

### 3-2. 컴포넌트 내부 ref 추가

```ts
const dispRef = useRef(new Map<string, Rect>())   // 카드별 마지막 표시 rect (스냅 전 실수값)
const flightRef = useRef(new Map<string, { off: Rect; start: number; dur: number }>())
const layoutKeyRef = useRef<string | null>(null)
const loopRef = useRef<number | null>(null)
// 사전 확인 6에서 필요하다고 판정된 경우에만:
// const flowRef = useRef(false)  — setFlow 호출 지점마다 flowRef.current 동기화
```

### 3-3. `paint()` 재구성

다음 기존 산식은 **한 글자도 바꾸지 않는다**: `c`, `nr`, `full`, `heroW`, `cardW`, `cardH`, `cardWAtNr`, `showMeta`, `mH`, `pitch`, `stride`, `rowW`, `originX`, `row`, `col`, `x`, `y`.
바꾸는 것은 **목표값 → 표시값 → 쓰기** 세 단계뿐이다.

**(1) 정수화 상수 삭제**
- `wPx`, `hPx` 선언을 삭제한다. 목표 rect는 실수값 그대로 쓴다.
  `target = { x, y, w: cardW, h: cardH + mH }`

**(2) 레이아웃 키 (카드 순회 전에 1회)**
```ts
const layoutKey = `${nr}|${vp.w}x${vp.h}|${순회 순서대로 카드 키를 ','로 이은 문자열}`
const keyChanged = layoutKeyRef.current !== null && layoutKeyRef.current !== layoutKey
layoutKeyRef.current = layoutKey
const dur = (flow 현재값) ? FLOW_MS - 40 : TWEEN_MS   // 현행 CSS transition 값과 동일
const now = performance.now()
const dpr = window.devicePixelRatio || 1
```

**(3) 카드별 표시값**
```ts
const prev = dispRef.current.get(key)
if (keyChanged && prev) {
  flightRef.current.set(key, {
    off: { x: prev.x - target.x, y: prev.y - target.y, w: prev.w - target.w, h: prev.h - target.h },
    start: now, dur,
  })
}
let disp = target
const f = flightRef.current.get(key)
if (f) {
  const p = Math.min(1, (now - f.start) / f.dur)
  const k = 1 - easeOutCubic(p)
  disp = { x: target.x + f.off.x * k, y: target.y + f.off.y * k, w: target.w + f.off.w * k, h: target.h + f.off.h * k }
  if (p >= 1) flightRef.current.delete(key)
}
dispRef.current.set(key, disp)
```
- `dispRef`에 없는 카드(최초 마운트·신규 카드)는 비행 없이 목표 위치에 바로 놓인다. 현행 첫 페인트와 같다.
- 비행 중에 키가 다시 바뀌면, `prev`가 비행 중인 현재 표시값이므로 끊김 없이 이어진다.

**(4) 쓰기 — 가장자리 스냅**
```ts
const L = snapDev(disp.x, dpr)
const R = snapDev(disp.x + disp.w, dpr)
const T = snapDev(disp.y, dpr)
const B = snapDev(disp.y + disp.h, dpr)
el.style.transform = `translate(${L}px, ${T}px)`
el.style.width = `${R - L}px`
el.style.height = `${B - T}px`
```
- opacity, `--ts`, `--ss`, `data-meta` 쓰기는 현행 그대로 둔다.

**(5) 비행 진행 루프 (`paint()` 말미)**
```ts
if (flightRef.current.size > 0 && loopRef.current === null) {
  loopRef.current = requestAnimationFrame(() => {
    loopRef.current = null
    paintRef.current(colsRef.current)
  })
}
```
- 드래그 중 pointermove가 없는 프레임이나 트윈이 끝난 뒤에도 비행이 끝까지 진행되게 하는 장치다.
- 한 프레임에 paint가 여러 번 호출돼도 같은 시각 기준으로 계산하므로 결과가 같다.
- 언마운트 시 `loopRef.current`가 null이 아니면 `cancelAnimationFrame`으로 정리한다. 기존 cleanup이 있으면 거기에 추가한다.

### 3-4. CSS (파일 내 `<style>` 블록)

- `.gm-card` (432–448행 부근)
  - `will-change: transform, width, height, opacity;` → `will-change: transform, opacity;`
  - transition 4줄 → `transition: opacity ${FADE_MS}ms ease;`
- `.gm-flow .gm-card` (450–455행 부근)
  - 규칙 안에 transition 외의 선언이 없으면 **규칙 전체를 삭제**한다. 다른 선언이 있으면 transition 선언만 삭제한다.
  - `gm-flow` 클래스를 부여하는 로직(`setFlow`)은 **유지**한다. 비행 시간 판정에 쓰인다.

### 3-5. 변경 금지

- 행우선 film 배치(row·col·순서), `cardW`·`heroW`·`pitch`·`originX` 산식, `MIN_COLS_*`, `maxColsForAspect`
- `TWEEN_MS`·`FLOW_MS`·`FADE_MS` 값, `animateTo`의 트윈 구조(colsRef·밀도바 핸들 동작)
- 드래그 핸들러(`onTrackDown`/`onTrackMove`/릴리스), 밀도바 UI, 필터 dim 로직, opacity, `data-meta`, `--ts`/`--ss`
- 스테이지 높이 산식(278–281행)
- `.gm-frame`, `.gm-frame img` 규칙
- GridExperience.tsx 외 모든 파일

---

## 4. 삭제 참조 지점과 검증

**심볼 (컴파일러 검출)**
- `wPx`, `hPx`를 삭제하면 잔존 참조가 tsc 오류로 드러난다. 오류가 0건이 될 때까지 §3-3(4)의 `R - L`, `B - T`로 교체한다. 산식의 의미는 바꾸지 않는다.

**문자열 (grep — 전부 0건이어야 함)**
```
grep -nE "(transform|width|height) \$\{(TWEEN_MS|FLOW_MS)" src/components/GridExperience.tsx
grep -n "will-change: transform, width" src/components/GridExperience.tsx
grep -nE "translate\(\$\{Math\.round" src/components/GridExperience.tsx
```

**타입 검사**
- `npx tsc --noEmit` 통과.
- `npm run dev` / `npm run build` 금지.

---

## 5. 보고

1. 사전 확인 1–6 결과
2. 변경 diff 전문(헬퍼, ref, paint, 루프, cleanup, CSS)
3. grep 3건 결과(0건)와 tsc 결과
4. **커밋하지 말 것.** 사용자 확인 후 커밋한다.

---

## 6. 기대 결과와 남는 한계

- **가장자리 왕복 소멸**: 각 변이 하나의 소스에서 나오고 한 번만 스냅되므로, 연속 구간에서 좌·우변은 각자 한 방향으로만 움직인다. 329↔330 같은 왕복과 확대 중 폭 감소가 사라진다.
- **꼬리 단축**: 탭 전환은 트윈 420ms(+열이 바뀌는 카드는 비행 420ms)로 끝난다. 이중 보간의 꼬리가 없어진다.
- **드래그 반응**: 카드가 손가락을 지연 없이 따라간다. 현행은 CSS 420ms 추종 지연이 있다.
- **정지 상태 간격**: 15/16px 혼재 → 1 device px 이내 차이로 줄어든다.
- **남는 한계**: 폭을 레이아웃 속성으로 바꾸는 구조이므로, 변이 1 device px 단위로 이동하는 것 자체는 남는다. 다만 왕복은 없다.
