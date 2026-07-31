# 그리드 모드 4결함 통합 수정 명세 (GRID_FIX_reflow_content)

> 영상(2026-07-31) 판독으로 확정된 4결함을 수정한다. 결함 1(밀도 전환 시 카드 밀림)은
> `stay/in/out` 정수 격자 매칭 모델의 근본 재설계이며 이 명세의 중심이다.
> 결함 2·3·4는 함께 처리한다. 링월 `ContentArea.tsx`는 절대 무수정.

---

## 0. 확정 결함 (영상 실측)

1. **밀도 전환 시 보이는 카드가 밀리고 교체된다.** 열 수 변경 시 첫 행 2열 이후 프로젝트가
   프레임마다 바뀐다. 원인 = `stay/in/out` 판정(GridExperience L236–247)이 (row,col) 좌표
   일치를 고정 기준으로 삼아, 열 수가 바뀌면 같은 order 인덱스라도 좌표가 달라져 out+in
   교차 페이드로 분리됨.
2. **콘텐츠 호버 시 세로 간격이 벌어진다.** 요약이 타이틀 바로 아래가 아니라 떨어져 나타남.
3. **콘텐츠 진입 시 메인 이미지가 중앙이 아니라 메타 좌측 스냅에 붙는다.** 히어로가
   left≈288px(정보슬라이드 우측)에 정착. 중앙정렬 초기 scrollPos(GRID_CONTENT_AREA_SPEC §2)
   미적용.
4. **콘텐츠 진입 이미지 morph가 어색하다.** 카드→히어로 확대 크로스페이드 어긋남.

---

## 1. 확정 설계 결정 (사용자 승인)

- **카드 고정 = 순서·연속성 고정.** 크기(폭·높이)는 열 수에 따라 변형됨(4:3은 장방비 제약).
  보이는 카드가 뒤로 밀리거나 다른 프로젝트로 교체되지 않고, 폭만 균등 축소·확대되며 제자리
  리플로우.
- **plomp식 연속 리플로우 확정.** 분수 열 구간에서 카드가 행을 넘나들며 (x,y) 연속 이동,
  순서 완전 보존. 정수 스냅 모델 폐기.

---

## 2. 결함 1 — 연속 리플로우 재설계 (핵심)

### 2-1. 폐기 대상 (삭제 참조지점 전수 열거)
아래는 정수 A·B 격자 매칭 모델의 구성요소다. **전부 제거**한다.

- `type Layout = (number|null)[][]` (L87)
- `rowMajor(order, cols)` (L89–97)
- `buildLayouts(total)` (L112–117)
- `interface Slot` (L119) + `slotMap(l)` (L121–125)
- `type InstKind`, `interface Inst` (L132–140)
- `pairFor(cols, maxCols)` (L143–152)
- `const layouts = useMemo(...)` (L197) — 및 이를 참조하는 전 지점:
  - `instances` useMemo (L222–250) 내부 `layouts[pair.a]`, `layouts[pair.b]`
  - `paint` 내부 `layouts[a]`, `layouts[b]` (L339–340, 행 수 계산)
- `pair` state + `pairRef` (L203–207) — 및 참조:
  - `paint` 내부 `pairRef.current`, `setPair` (L270–272)
  - `useLayoutEffect` L351 `instRef.current = { a: pair.a, b: pair.b, ... }`
  - `instRef` 선언 L258 `{ a, b, list }`
- `instances` state 전체 (L222–250)
- `Inst` 기반 렌더(L584 `instances.map`) — 아래 2-4에서 order 기반 렌더로 대체
- `paint` 내부 `pairFor` 호출·`transitioning`·`enterShift`·`slack0`·`fadeIn`·`wA`·`wB`·
  `cur.a/cur.b` 구간 가드(L266–334 대부분) — 아래 2-3 산식으로 전면 대체

> ⚠ **컴파일러 진단 활용**: 위 심볼들을 먼저 삭제하고 `npx tsc --noEmit`를 돌리면 잔존 참조가
> 전부 타입 에러로 드러난다. 문자열 식별자(CSS 클래스 `gm-card` 등)는 타입체커가 못 잡으므로
> 별도 grep 불요(클래스명은 유지 대상). 삭제 후 에러 0까지 참조를 정리한다.

### 2-2. 신규 상태 (단순화)
```
const colsRef = useRef<number>(clamp(DEFAULT_COLS, MIN_COLS, MAX_COLS))  // 유지
const [nLabel, setNLabel] = useState(...)  // 유지 (라벨·스냅 활성 표시용)
const nLabelRef = useRef(nLabel)           // 유지
```
- `pair`·`pairRef`·`instances`·`layouts`·`instRef`는 전부 제거.
- 렌더는 `order`를 직접 map한다(2-4). 카드 DOM은 order 인덱스 하나당 하나, 항상 존재.

### 2-3. 연속 좌표 산식 (paint 전면 재작성)
`paint(cols)`를 아래로 대체. **모든 좌표는 px 정수(Safari 퍼센트 금지).**
```
const paint = useCallback((cols: number) => {
  const n = clamp(cols, MIN_COLS, maxCols)           // 연속(분수) 열 수
  const nr = clamp(Math.round(n), MIN_COLS, maxCols) // 라벨·스냅용 정수
  if (nr !== nLabelRef.current) { nLabelRef.current = nr; setNLabel(nr) }

  // 슬라이더 크롬 — 기존 유지 (colsToPos 좌표계)
  const pos = colsToPos(n) * 100
  if (fillRef.current) fillRef.current.style.width = `${pos}%`
  if (knobRef.current) knobRef.current.style.left = `${pos}%`

  if (!ready) return

  const full = Math.max(1, vp.w - UI_PAD * 2)
  // 1열은 히어로 폭 상한, 그 외는 연속 축소. 폭은 n의 연속 함수.
  const heroW = Math.min(full, CARD_RATIO * vp.h * SLIDE_H_RATIO)
  const cardW = n <= 1 ? heroW : Math.max(1, (full - GAP * (n - 1)) / n)
  const cardH = cardW / CARD_RATIO
  const pitch = cardH + metaH(cardW) + GAP
  const rowWidth = n * cardW + (n - 1) * GAP    // 한 행이 담는 흐름 폭(분수 n 허용)
  const stride = cardW + GAP                    // 카드 하나의 흐름 간격
  // n열이 콘텐츠 폭 중앙정렬될 때 좌측 원점
  const originX = UI_PAD + (full - rowWidth) / 2
  const wPx = Math.round(cardW)

  let maxRow = 0
  for (let pos = 0; pos < total; pos++) {
    const project = projects[order[pos]]
    if (!project) continue
    const key = `${project.id}-c`
    const el = cardEls.current.get(key)
    if (!el) continue

    // ── plomp식 wrap: 흐름 거리 pos*stride 를 rowWidth로 감는다 ──
    const flow = pos * stride
    const row = Math.floor(flow / rowWidth)
    const x = originX + (flow - row * rowWidth)
    const y = row * pitch
    if (row > maxRow) maxRow = row

    const dim = dimSet.has(order[pos])
    el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`
    el.style.width = `${wPx}px`
    el.style.opacity = `${dim ? DIM_OPACITY : 1}`
    el.style.display = 'block'
    el.style.pointerEvents = 'auto'
    el.style.setProperty('--ts', `${titlePx(cardW)}px`)
    el.style.setProperty('--ss', `${sumPx(cardW)}px`)
  }

  if (gridRef.current) {
    gridRef.current.style.height = `${Math.max(0, (maxRow + 1) * pitch - GAP)}px`
  }
}, [colsToPos, dimSet, maxCols, order, projects, ready, total, vp.w, vp.h])
```

> **산식 근거**: 각 카드의 "흐름 거리" `pos*stride`를 한 줄로 펼친 뒤 `rowWidth`로 감는다.
> n이 연속 변하면 rowWidth·stride가 연속 변하므로 각 카드의 (x,y)가 매 프레임 부드럽게
> 이동하고, **순서(pos)는 절대 안 바뀐다.** 카드가 행 끝에서 다음 행으로 넘어가는 지점이
> n에 따라 연속 이동 = plomp의 "슬롯이 연속으로 열리는" 거동.

> ⚠ **행 경계 되감기 매끄러움**: 카드가 행 끝(x가 rowWidth 근처)에서 다음 행(x가 0 근처, y가
> +pitch)으로 넘어갈 때 x는 급감·y는 급증한다. transform이 매 프레임 갱신되므로 연속이나,
> **시각적으로 대각선 점프처럼 보일 수 있다.** plomp도 이 거동이다(실물 확인 필요). 만약
> 어색하면 후속 조정: 되감기 카드에 한해 x를 rowWidth→0으로 감쇠 보간. 1차는 순수 wrap으로 간다.

### 2-4. 렌더 재작성 (order 직접 map)
`instances.map`(L584) → `order.map`. key는 `${project.id}-c` 단일(in/out 접미사 폐기).
```
{order.map((projIdx, pos) => {
  const project = projects[projIdx]
  if (!project) return null
  const award = project.awards?.find(a => a.visible !== false)?.title
  const hotspot = project.coverHotspot
  const objectPosition = hotspot ? `${hotspot.x*100}% ${hotspot.y*100}%` : 'center'
  return (
    <div
      key={`${project.id}-c`}
      role="button"
      tabIndex={0}
      className="gm-card"
      aria-label={project.title.en}
      ref={(el) => { if (el) cardEls.current.set(`${project.id}-c`, el); else cardEls.current.delete(`${project.id}-c`) }}
      onClick={() => { const el = cardEls.current.get(`${project.id}-c`); if (el) openProject(project, el) }}
      onKeyDown={(e) => { if (e.key==='Enter'||e.key===' ') { e.preventDefault(); const el = cardEls.current.get(`${project.id}-c`); if (el) openProject(project, el) } }}
    >
      {/* gm-frame + gm-meta 내부는 기존 유지 (결함 2 수정은 §3) */}
    </div>
  )
})}
```
> ⚠ `openProject`는 GRID_CONTENT_AREA_SPEC의 카드 클릭 핸들러. 이 명세와 콘텐츠 영역
> 명세를 함께 구현하는 경우 §5 참조. 콘텐츠 영역을 아직 안 만들었으면 openProject 대신
> 기존 동작을 임시 유지하되, **이 명세는 콘텐츠 영역과 동시 구현을 전제**한다.

### 2-5. paint 트리거 정리
- `useLayoutEffect`(L350–354): `instRef` 갱신 줄 제거. `paintRef.current = paint; paint(colsRef.current)`만 유지.
  의존성에서 `instances`·`pair` 제거, `order`·`dimSet` 추가(paint가 이들에 의존).
- 드래그·릴리스·animateTo·onTrack* 핸들러(L356–422): `colsRef` 기반이므로 **그대로 유지**.
  단 내부에서 `pairFor`·`pair` 참조가 있으면 제거(없음 — colsRef만 씀).
- 필터 재정렬 `startFlow`/`flow`/`gm-flow`(L212–219, L457–461): **유지**. order가 바뀌면
  같은 key의 카드가 새 pos로 연속 이동하며 `gm-flow` transition을 탄다. (단 paint가 매
  useLayoutEffect마다 transform을 직접 쓰므로, 필터 전환은 transition CSS로, 밀도 전환은
  rAF 직접 갱신으로 이원화됨 — 기존과 동일 원리.)

---

## 3. 결함 2 — 콘텐츠 호버 세로 간격

이 결함은 **콘텐츠 에어리어(GridContentArea)** 가 아니라 **그리드 카드 호버**일 가능성과,
콘텐츠 내부일 가능성이 있다. 영상은 콘텐츠 진입 후로 판독됨 → **GridContentArea의 정보
슬라이드 또는 슬라이드 캡션 간격**으로 추정.

> ⚠ **미확인**: 결함 2의 정확한 발생 위치(그리드 카드 gm-meta인지, 콘텐츠 내부인지)를
> 코드로 단정 불가. GridContentArea가 아직 미구현이면 이 결함은 그리드 카드 `gm-meta`
> (§2-4 내부)일 것. **구현자는 배포 후 호버 지점을 특정하고, 아래 중 해당하는 곳을 수정**:
> - 그리드 카드면: `.gm-sum { margin-top: SUM_MT(5px) }` 유지, `.gm-title` height 예약이
>   과다하지 않은지 확인(L482: `height: calc(var(--ts) * TITLE_LH * TITLE_LINES)`).
> - 콘텐츠 내부면: GridContentArea 복제본의 캡션/서브타이틀 gap 확인.
> 이 명세는 **그리드 카드 gm-meta 기준**으로 지시한다: 요약이 타이틀에서 떨어지지 않도록
> `SUM_MT`를 5→3으로 좁히고, 호버 시 gm-sum이 예약 높이 안에서 페이드만 하는지(reflow 없는지)
> 확인. reflow가 있으면 gm-meta 전체 높이를 `metaH(cardW)`로 고정(§2-3에서 이미 pitch에 반영).

---

## 4. 결함 3·4 — 콘텐츠 진입 중앙정렬 + morph

GRID_CONTENT_AREA_SPEC §2·§3-2를 그대로 적용한다. 영상 결함은 그 명세의 **초기 scrollPos
중앙정렬(§2)** 과 **morph 진입 rect=카드 rect(§개조 2)** 가 미적용/부정확함을 보여준다.

### 4-1. 결함 3 (중앙정렬) 확정 지시
- 진입 시 `setScrollPos(0)`(링월 복제 잔재) → `setScrollPos(clampScroll(centers[1] - vpSize.w/2))`.
  `centers[1]` = 히어로(트랙 인덱스 1) 중심. rects.length≥2 가드.
- 결과: 히어로가 화면 중앙, 좌측에 정보 슬라이드(240px, 좌로 밀면 보임), 우측에 다음 슬라이드.

### 4-2. 결함 4 (morph) 확정 지시
- morph 시작 rect = 클릭 카드의 `getBoundingClientRect()` (밀도 무관).
- 도착 rect의 화면 left = `TRACK_INSET + rects[1].x - scrollPos`(중앙정렬 scrollPos 반영).
  GRID_CONTENT_AREA_SPEC §개조 2의 `heroScreenLeft` 산식.
- aspect = FALLBACK_RATIO(4/3) 고정(카드가 4:3이므로 왜곡 없음). `idleImgEl` 참조 제거.
- **어색함의 유력 원인**: 링월 morph는 풀블리드(루트 전체)→히어로라 시작이 화면 전체다.
  카드→히어로는 시작이 작아 확대율이 크고, 크로스페이드(morphing/morphVisible 분리) 타이밍이
  카드 시작에 안 맞을 수 있다. **1차는 GRID_CONTENT_AREA_SPEC 그대로 구현 후 배포 판단.**
  어색하면 MORPH_MS·HOLD·FADE를 카드 진입용으로 재튜닝(별도).

---

## 5. 구현 순서·범위
1. **결함 1(연속 리플로우)** — GridExperience.tsx: §2 폐기 심볼 삭제 → tsc로 잔존 참조 색출 →
   신규 paint·order 렌더로 대체.
2. **콘텐츠 영역 동시 구현** — GRID_CONTENT_AREA_SPEC 전체 적용(GridContentArea.tsx 신설,
   openProject/closeProject/popstate). 결함 3·4가 여기서 해결됨.
3. **결함 2** — 배포 후 호버 지점 특정 → §3 해당 수정.

---

## 6. 검증
- `npx tsc --noEmit`만. `npm run dev`·`npm run build` 금지.
- **무수정 확인**: ContentArea.tsx·LandingExperience.tsx·useRingWall.ts·work-grid/page.tsx diff 0.
- 수정: GridExperience.tsx. 신설: GridContentArea.tsx.
- tsc로 잡히는 것: 삭제 심볼(layouts·pair·pairFor·Inst·rowMajor 등) 잔존 참조.
- tsc로 안 잡히는 것: paint 좌표 산식의 시각 결과(밀림 해소 여부), morph 매끄러움 → 배포 확인.

## 7. 배포 후 확인
1. 밀도 슬라이더 드래그 시 **보이는 카드가 밀리거나 교체되지 않고** 폭만 연속 변형, 순서 보존.
2. 분수 열 구간에서 카드가 행을 넘나드는 연속 리플로우(plomp식) 매끄러움.
3. 콘텐츠 진입 시 메인 이미지 화면 중앙, 좌측 정보 슬라이드, 우측 다음 슬라이드.
4. 카드→히어로 morph 매끄러움.
5. 호버 시 요약이 타이틀 바로 아래 붙음(reflow 없음).
6. 링월(/work) 회귀 없음.
