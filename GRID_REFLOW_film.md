# 그리드 밀도 리플로우 — film movement 최종 명세 (GRID_REFLOW_film)

> 밀도(열 수) 변경 시 **모든 프로젝트를 order(careerNo desc) 행우선으로 항상 재배치**한다.
> 3열→4열 시 4열 첫 행은 1·2·3·4번, 4번이 (1,0)→(0,3)으로 이동한다. 이것은 결함이 아니라
> **단일 일관 규칙**(Herzog & de Meuron식 번호 역순 정렬)이다. 앵커 보존 모델은 폐기.
> 링월 무수정(이 명세는 GridExperience.tsx만 수정).

---

## 0. 확정 모델 (사용자 최종 결정)

- **film movement 채택.** 근거: ①순서 일관·예측 가능(심사자가 careerNo 역순으로 프로젝트를
  되짚을 수 있음 — 620번은 항상 619번 앞, 줄바꿈 시 윗줄 맨 우측). ②plomp식 무빈칸은 가변
  크기 masonry 타일이라 균등 4:3 격자인 우리 구조엔 부적합. ③앵커 보존의 최하단 편입은
  총 카드 수 보존이라는 물리적 귀결이라 제거 불가.
- **배치 규칙**: 열 수 n에서 `row = floor(k/n), col = k%n` (k = order 인덱스). 순수 행우선.
- **전환**: 열 변경 시 각 카드가 새 (row,col)로 CSS transition 이동. 폭·높이도 트윈.
  이동이 일관되게 일어나므로 학습 가능(어디서든 같은 규칙).

> 1·2열 영역(정보 슬라이드 존치 여부)은 콘텐츠 에어리어 확정 후 별도 결정 — 이 명세 범위 밖.

---

## 1. paint 재작성 (GridExperience.tsx)

`paint(cols)`를 아래로 대체. **좌표 px 정수, transform 퍼센트 금지(Safari).**
```
const paint = useCallback((cols: number) => {
  const c = clamp(cols, MIN_COLS, maxCols)
  const nr = clamp(Math.round(c), MIN_COLS, maxCols)
  if (nr !== nLabelRef.current) { nLabelRef.current = nr; setNLabel(nr) }

  // 슬라이더 크롬 (기존 유지)
  const posPct = colsToPos(c) * 100
  if (fillRef.current) fillRef.current.style.width = `${posPct}%`
  if (knobRef.current) knobRef.current.style.left = `${posPct}%`
  if (!ready) return

  const full = Math.max(1, vp.w - UI_PAD * 2)
  const cardW = c <= 1
    ? Math.min(full, CARD_RATIO * vp.h * SLIDE_H_RATIO)
    : (full - GAP * (c - 1)) / c
  const cardH = cardW / CARD_RATIO
  const pitch = cardH + META_H + GAP
  const stride = cardW + GAP
  // 목표 정수열 nr 기준 중앙정렬 (폭은 c 연속, 열 수는 nr 정수)
  const rowW = nr * cardW + (nr - 1) * GAP
  const originX = UI_PAD + (full - rowW) / 2

  let maxRow = 0
  for (let k = 0; k < total; k++) {
    const project = projects[order[k]]
    if (!project) continue
    const el = cardEls.current.get(project.id)
    if (!el) continue
    // ── 순수 행우선: 열 수 nr 기준 정수 격자 ──
    const row = Math.floor(k / nr)
    const col = k - row * nr
    const x = originX + col * stride
    const y = row * pitch
    if (row > maxRow) maxRow = row
    const dim = dimSet.has(order[k])
    el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`
    el.style.width = `${Math.round(cardW)}px`
    el.style.height = `${Math.round(cardH)}px`
    el.style.opacity = `${dim ? DIM_OPACITY : 1}`
    el.style.setProperty('--ts', `${titlePx(cardW)}px`)
    el.style.setProperty('--ss', `${sumPx(cardW)}px`)
  }
  if (gridRef.current) gridRef.current.style.height = `${Math.round((maxRow + 1) * pitch - GAP)}px`
}, [colsToPos, dimSet, maxCols, order, projects, ready, total, vp.w, vp.h])
```

> ⚠ **전환 중 열 수 기준**: 폭 보간은 연속(c), 격자 열 수는 정수(nr). c가 3.0→3.5→4.0으로
> 흐르면 nr은 3→4로 스냅(round). 스냅 순간 각 카드가 새 (row,col)로 CSS transition 이동.
> 폭은 c 따라 연속 축소. → 폭은 부드럽게, 재배치는 정수 스냅 시점에 트윈 이동.

> ⚠ **CSS transition**: 카드 요소에 `transition: transform TWEEN, width TWEEN, height TWEEN,
> opacity FADE`. paint가 목표값 쓰면 CSS가 트윈. film movement의 "부드러운 재배치"가 여기서 남.

---

## 2. 폐기 대상 (삭제 참조지점 전수 열거)
GridExperience.tsx에서 아래 제거. 삭제 후 `npx tsc --noEmit`로 잔존 참조 색출.
- `Layout` 타입(L87), `rowMajor`(L89–97) — **단 paint 내부 행우선 계산으로 흡수되므로 함수는
  삭제**, `buildLayouts`(L112–117), `Slot`/`slotMap`(L119–125), `InstKind`/`Inst`(L132–140),
  `pairFor`(L143–152), `layouts` useMemo(L197), `pair`/`pairRef`(L203–207),
  `instances`(L222–250), `instRef`(L258).
- 참조: paint 구 구간(L266–344 전체 대체), useLayoutEffect의 instRef 갱신(L351),
  렌더 `instances.map`(L584) → `order.map`(§3).

## 3. 렌더 (order 직접 map)
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

## 4. 유지 대상
- 드래그·릴리스·animateTo·onTrack*·슬라이더 크롬(fill·knob·스냅 아이콘): colsRef 기반, 유지.
- 필터 dim 재정렬·gm-flow transition: 유지(order 변경 시 같은 key가 새 위치로 이동).
- `import Link`: 삭제 금지(뷰토글 Ring 링크 의존).

## 5. 검증
- `npx tsc --noEmit`만. dev·build 금지.
- 무수정: ContentArea.tsx(단 GRID_CONTENT_v2 명세에서 별도 허용된 getSlides 예외는 그쪽에서
  처리)·LandingExperience.tsx·useRingWall.ts·work-grid/page.tsx.
- tsc로 잡히는 것: 삭제 심볼 잔존 참조.

## 6. 배포 후 확인
1. 3→4열 시 전 카드가 order 행우선으로 재배치, 4열 첫 행 = 1·2·3·4번.
2. 재배치가 CSS transition으로 부드럽게(순간 점프 없음).
3. 위로 스크롤 시 프로젝트가 careerNo 역순으로 일관 정렬(예측 가능).
4. 폭은 연속, 재배치는 정수 스냅 시점.
5. 링월(/work) 회귀 없음.
