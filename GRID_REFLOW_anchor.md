# 그리드 밀도 리플로우 — 앵커 보존 배치 최종 명세 (GRID_REFLOW_anchor)

> 밀도(열 수) 변경 시 **보이는 카드는 (row,col) 셀을 절대 이동하지 않고 폭만 변하며,
> 열 증가로 생긴 새 셀은 안 보이던 대기 카드(순서 무관)가 그 자리에 opacity 페이드인**한다.
> 앞선 wrap·행우선 재배치 모델은 전부 폐기(film movement 유발). 링월 무수정.

---

## 0. 확정 모델 (사용자 최종 승인)

- **셀 고정**: 각 카드는 (row,col) 셀을 점유한다. 열이 바뀌어도 보이는 카드의 (row,col)은
  유지. 폭·높이만 열 수에 따라 변한다(4:3 장방비 유지).
- **연속 앵커**: 직전 정수 열을 앵커로, 한 단계씩 누적. 3열에서 4열 확정 후 그 4열이 다음 앵커.
- **새 셀 채우기**: 열 증가 시 각 행 끝에 새 셀. **안 보이던 대기 카드 아무거나**(순서 무관)
  그 자리에 놓고 opacity 0→1 페이드인. **이동 없음**.
- **열 감소**: 각 행 끝 셀 카드가 opacity 1→0으로 빠짐. 남은 카드 (row,col) 유지.
- **전환 중(분수 열)**: 폭·gap·origin만 연속 보간. 셀 좌표는 목표 정수 격자에 고정(보간 안 함).
  보이는 카드는 셀 이동 없음.

> ⚠ 핵심 불변식: **어떤 보이는 카드도 밀도 전환 중 다른 셀로 이동하지 않는다.**
> 순수 행우선 `col = k % n`은 이 불변식을 깬다(4번이 (1,0)→(0,3)). 절대 사용 금지.

---

## 1. 배치 상태 모델

### 1-1. 핵심 자료구조
```
// 화면에 배치된 카드 → 점유 셀. projectIndex(order 인덱스) 기준.
placement: Map<projIdx, {row:number, col:number}>
// 현재 정수 앵커 열
anchorCols: number
// 미배치(대기) 카드 풀 — placement에 없는 전체 projIdx
```
- `order`: getProjects 정렬(careerNo desc) 결과. 고정.
- 초기 앵커 = DEFAULT_COLS(예 3). 초기 placement = 행우선으로 전 카드 배치
  (첫 진입은 이동 개념이 없으므로 행우선이 정답): `row=floor(k/n), col=k%n`.

### 1-2. 앵커 열 전환 함수 (정수 n → 정수 m)
```
function reflowTo(m):
  if m === anchorCols: return
  if m > anchorCols:            // 열 증가 (예 3→4)
    grow(anchorCols, m)
  else:                         // 열 감소 (예 3→2)
    shrink(anchorCols, m)
  anchorCols = m
```

#### grow(n, m)  — 열 증가
각 행 끝에 col ∈ [n, m-1] 셀이 새로 생긴다. **기존 placement의 (row,col)은 전부 유지.**
```
function grow(n, m):
  // 1. 현재 배치의 최대 행 파악
  maxRow = max(p.row for p in placement.values)
  // 2. 각 행 r에 대해, col n..m-1 셀을 대기 카드로 채움 (순서 무관 → 풀에서 pop)
  pool = [projIdx not in placement]   // 대기 카드 (순서 무관)
  for r in 0..maxRow:
    for c in n..(m-1):
      if pool empty: break
      pick = pool.pop()               // 아무거나
      placement.set(pick, {row:r, col:c})
      newlyPlaced.add(pick)           // opacity 페이드인 대상
  // 3. 아직 pool에 남은 카드 = 화면 아래 추가 행에 행우선으로 이어붙임
  //    (m열 기준 다음 빈 행부터. 이들은 화면 밖일 수 있음 — 스크롤로 노출)
  nextRow = maxRow + 1
  while pool not empty:
    for c in 0..(m-1):
      if pool empty: break
      pick = pool.pop()
      placement.set(pick, {row:nextRow, col:c})
    nextRow++
```
> ⚠ 2단계에서 "각 행 끝 새 셀"을 먼저 채우므로, 보이던 상단 행들이 먼저 대기 카드를 받는다.
> 이것이 "3번 우측 A, 6번 우측 B가 붙는다"는 요구다. 남는 카드만 아래 새 행으로.

#### shrink(n, m)  — 열 감소
각 행에서 col ∈ [m, n-1] 셀이 사라진다. 그 카드는 대기 풀로 복귀(화면에서 빠짐).
```
function shrink(n, m):
  removed = []
  for [idx, p] in placement:
    if p.col >= m:
      removed.push(idx)
  for idx in removed:
    placement.delete(idx)             // opacity 페이드아웃 대상
    fadingOut.add(idx)
  // 남은 카드는 (row,col) 유지. 단 m열 기준으로 아래쪽에 빈 셀이 생기면
  // 대기 풀(방금 removed 포함)에서 행우선으로 재적재(화면 아래, 스크롤 노출).
  pool = [projIdx not in placement]
  // m열 격자에서 이미 점유된 셀 집합
  occupied = Set("r,c" for p in placement.values)
  // 위에서부터 빈 셀 스캔하여 채움
  r = 0
  while pool not empty:
    for c in 0..(m-1):
      if occupied has "r,c": continue
      if pool empty: break
      pick = pool.pop()
      placement.set(pick, {row:r, col:c})
    r++
```
> ⚠ shrink에서 사라진 셀 카드는 페이드아웃 후, 대기 풀에 돌아가 아래쪽 빈 셀에 재배치된다.
> 화면 상단의 남은 카드는 (row,col) 고정.

### 1-3. 연속 앵커 처리 (드래그 중 분수 열)
슬라이더 값 c(분수). `nr = round(c)`가 바뀔 때마다 `reflowTo(nr)` 호출(정수 스냅 시점에
placement 갱신). 드래그 중 c가 3.0→3.6→4.0으로 흐르면:
- c < 3.5: 앵커 3 유지. placement = 3열 배치. 폭은 c에 따라 3열↔4열 폭 사이 보간.
- c ≥ 3.5: `reflowTo(4)` 발동, placement = 4열 배치(grow 적용). 이후 폭 보간.
> 스냅 임계(round)에서 placement가 바뀌므로, **새 셀 카드는 임계 통과 순간 등장해
> opacity 페이드인**한다. 폭 보간은 연속, 셀 등장은 정수 스냅 — 이원 구조.

---

## 2. paint (좌표·폭 렌더) — GridExperience.tsx

`paint(cols)`를 아래로 대체. **좌표 px 정수, transform 퍼센트 금지(Safari).**
```
const paint = useCallback((cols: number) => {
  const c = clamp(cols, MIN_COLS, maxCols)
  const nr = clamp(Math.round(c), MIN_COLS, maxCols)
  if (nr !== anchorRef.current) { reflowTo(nr); anchorRef.current = nr; setNLabel(nr) }

  // 슬라이더 크롬 (기존 유지)
  const posPct = colsToPos(c) * 100
  if (fillRef.current) fillRef.current.style.width = `${posPct}%`
  if (knobRef.current) knobRef.current.style.left = `${posPct}%`
  if (!ready) return

  const full = Math.max(1, vp.w - UI_PAD * 2)
  // 폭은 c의 연속 함수 (정수 격자 셀 좌표에 이 폭을 곱함)
  const cardW = c <= 1
    ? Math.min(full, CARD_RATIO * vp.h * SLIDE_H_RATIO)
    : (full - GAP * (c - 1)) / c
  const cardH = cardW / CARD_RATIO
  const pitch = cardH + META_H + GAP
  const stride = cardW + GAP
  // 목표 정수열 nr 기준 폭으로 중앙정렬 origin (전환 중엔 c 기준 폭 사용)
  const rowW = nr * cardW + (nr - 1) * GAP
  const originX = UI_PAD + (full - rowW) / 2

  let maxRow = 0
  placement.forEach(({row, col}, idx) => {
    const el = cardEls.current.get(keyOf(idx))
    if (!el) return
    const x = originX + col * stride
    const y = row * pitch
    if (row > maxRow) maxRow = row
    const dim = dimSet.has(idx)
    el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`
    el.style.width = `${Math.round(cardW)}px`
    el.style.height = `${Math.round(cardH)}px`
    el.style.opacity = `${dim ? DIM_OPACITY : 1}`
    el.style.setProperty('--ts', `${titlePx(cardW)}px`)
    el.style.setProperty('--ss', `${sumPx(cardW)}px`)
  })
  // 대기(미배치) 카드는 화면 밖으로 (display none 대신 opacity 0 + 하단 배치)
  order.forEach((_, idx) => {
    if (placement.has(idx)) return
    const el = cardEls.current.get(keyOf(idx))
    if (!el) return
    el.style.opacity = '0'
    el.style.pointerEvents = 'none'
    el.style.transform = `translate(0px, ${Math.round((maxRow + 1) * pitch)}px)`
  })

  if (gridRef.current) gridRef.current.style.height = `${Math.round((maxRow + 1) * pitch - GAP)}px`
}, [colsToPos, dimSet, maxCols, order, ready, vp.w, vp.h, placement])
```
> ⚠ **transition 전략**: 카드 요소에 CSS `transition: transform TWEEN, width TWEEN, height TWEEN,
> opacity FADE`를 건다. paint가 목표 좌표·폭을 쓰면 CSS가 트윈. 새 셀 카드는 grow 시점에
> 목표 좌표에 즉시 놓이되 opacity 0→1로 페이드(이동 없음 — 좌표를 처음부터 목표로 세팅).
> **주의**: 새로 배치된 카드는 직전 프레임에서 opacity 0·하단 좌표였다가, 배치되면 목표
> 좌표로 순간 점프하면 안 된다 → 배치 직후 첫 paint에서 `transition: none`으로 목표 좌표에
> 세팅하고, 다음 프레임부터 opacity만 transition. `newlyPlaced` 집합으로 이 카드들을 1프레임
> transition-none 처리 후 opacity 페이드.

### 2-1. newlyPlaced / fadingOut 페이드 처리
```
// reflowTo 직후:
newlyPlaced.forEach(idx => {
  const el = cardEls.current.get(keyOf(idx))
  if (!el) return
  el.style.transition = 'none'              // 목표 좌표로 점프(이동 안 보이게)
  // paint가 목표 좌표·opacity0 세팅
  requestAnimationFrame(() => {
    el.style.transition = ''                // 복원
    el.style.opacity = '1'                  // 페이드인
  })
})
fadingOut.forEach(idx => {
  const el = cardEls.current.get(keyOf(idx))
  if (!el) return
  el.style.opacity = '0'                    // 페이드아웃 (transition 유지)
})
```

---

## 3. 폐기 대상 (삭제 참조지점 전수 열거)
GridExperience.tsx에서 아래를 제거. 삭제 후 `npx tsc --noEmit`로 잔존 참조 색출.
- `Layout` 타입(L87), `rowMajor`(L89–97, **단 초기 placement 생성엔 유사 로직 재사용** — 새
  함수 `initialPlacement(n)`로 명명해 신설), `buildLayouts`(L112–117), `Slot`/`slotMap`
  (L119–125), `InstKind`/`Inst`(L132–140), `pairFor`(L143–152), `layouts` useMemo(L197),
  `pair`/`pairRef`(L203–207), `instances`(L222–250), `instRef`(L258).
- 이들을 참조하는 paint 내부 전 구간(L266–344), useLayoutEffect의 instRef 갱신(L351),
  렌더의 `instances.map`(L584) → `order.map`(§4).

## 4. 렌더 (order 직접 map, key 단일)
```
{order.map((projIdx, k) => {
  const project = projects[projIdx]
  if (!project) return null
  return (
    <div key={project.id} role="button" tabIndex={0} className="gm-card"
      aria-label={project.title.en}
      ref={(el) => { if (el) cardEls.current.set(project.id, el); else cardEls.current.delete(project.id) }}
      onClick={() => { const el = cardEls.current.get(project.id); if (el) openProject(project, el) }}
      onKeyDown={(e) => { if (e.key==='Enter'||e.key===' '){ e.preventDefault(); const el=cardEls.current.get(project.id); if(el) openProject(project, el) } }}
    >
      {/* gm-frame + gm-meta 기존 유지 */}
    </div>
  )
})}
```
> `keyOf(idx)` = `projects[order[idx]].id`. placement/newlyPlaced/fadingOut은 projIdx(=order[k])
> 기준. cardEls는 project.id 기준. 일관되게 매핑.

## 5. 검증
- `npx tsc --noEmit`만. dev·build 금지.
- 무수정: ContentArea.tsx·LandingExperience.tsx·useRingWall.ts·work-grid/page.tsx.
- tsc로 잡히는 것: 삭제 심볼 잔존 참조.
- tsc로 안 잡히는 것: 불변식(보이는 카드 셀 이동 0) → 배포 확인.

## 6. 배포 후 확인 (불변식 검증)
1. 3열에서 4열로 슬라이더 이동 시 **1~6번(보이던 카드)이 셀 이동 없이 폭만 축소**.
2. 3번 우측·6번 우측에 **새 카드가 페이드인**(다른 프로젝트, 이동 없이 등장).
3. 4→3 감소 시 각 행 끝 카드 페이드아웃, 남은 카드 셀 고정.
4. 어떤 보이는 카드도 대각선 이동·행 넘나듦 없음(film movement 0).
5. 링월(/work) 회귀 없음.
