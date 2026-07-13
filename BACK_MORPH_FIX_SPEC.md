# BACK_MORPH_FIX_SPEC — BACK 역모프 종착점 회귀 수정 (2026-07-13)

## 0. 증상

모바일에서 프로젝트 열람 후 BACK(또는 뒤로가기)으로 링에 복귀할 때,
**썸네일이 옛 크기(288px)로 축소되었다가 다시 현재 크기(≈330px)로 커지는 이중 애니메이션**이 발생한다.

---

## 1. 원인

`MOBILE_TIER_SCALE_SPEC` §2-1에서 **제거 대상**으로 명시한 구 상수가 삭제되지 않았고,
BACK 역모프 목표 계산(§6-3)이 여전히 이들을 참조하고 있다.

현행 코드 (`MobileProjectWall.tsx`, `useLayoutEffect` 내 BACK 분기):

```ts
const cardTop = HEADER_H + containerH / 2 - SLOT_H[0] / 2    // ← 구 상수 SLOT_H
const thumbLeft = (vw - TIERS[0].w) / 2                       // ← 구 상수 TIERS
startMorph({
  to: { top: cardTop + TOP_TEXT_H, left: thumbLeft, width: TIERS[0].w, height: TIERS[0].h },
  title: {
    to: { top: cardTop + (TOP_TEXT_H - 13 * 1.35) / 2, left: thumbLeft, fontSize: 13, fontWeight: 400 },
  },
})
```

**불일치 두 가지:**

| 항목 | 렌더 실제 (신) | 역모프 종착점 (구) |
|---|---|---|
| 썸네일 폭 | `tierWidths(cw)[0]` ≈ 330 (히어로의 92%) | `TIERS[0].w` = 288 |
| 썸네일 높이 | `330 / 1.5` = 220 | `TIERS[0].h` = 192 |
| 텍스트 위치 | 이미지 **하단** | `TOP_TEXT_H` 가산 = 이미지 **상단** 전제 |

모프는 288×192로 착지하고, 모프 종료 직후 DOM은 330×220을 렌더한다 → 점프.
타이틀 종착점도 상단 텍스트 행 좌표를 계산하므로 어긋난다.

`npx tsc --noEmit`이 통과한 이유는 구 상수가 파일에 남아 있어 타입 오류가 발생하지 않았기 때문이다.

---

## 2. 수정

**대상 파일 (1개):** `src/components/MobileProjectWall.tsx`

### 2-1. 구 상수 완전 제거

다음 상수 선언을 **삭제**한다. 이들은 `MOBILE_TIER_SCALE_SPEC` §2-1에서 이미 제거 지시된 것이다.

```ts
const TIERS = { 0: { w: 288, h: 192 }, 1: { w: 201, h: 134 }, 2: { w: 114, h: 76 } } as const
const TOP_TEXT_H = 24
const SLOT_H = { 0: TIERS[0].h + TOP_TEXT_H, 1: TIERS[1].h, 2: TIERS[2].h } as const
const PAIR_TEXT_W = 130
const PAIR_GAP = 8
const MIN_SLOT = 76
```

**삭제 후 남은 참조가 있다면 그것이 곧 회귀 지점이다.** 전부 §2-2의 파생식으로 교체한다.

> 위 6개 중 실제로 파일에 존재하는 것만 삭제한다. 이미 제거된 것이 있다면 무시한다.
> 삭제 후 `npx tsc --noEmit`을 실행하면 남은 참조가 컴파일 오류로 드러난다. 이를 진단 수단으로 활용하라.

### 2-2. BACK 역모프 목표 재계산

BACK 분기(`useLayoutEffect` 내 `if (prev) { ... }`)의 목표 좌표 계산을 다음으로 교체한다.

```ts
// 역모프 목표 — 산식으로 결정적: 링 중앙 d=0 썸네일 rect (§6-3)
// 티어 기하는 현재 컨테이너 폭에서 파생 — 렌더 경로와 동일한 함수를 쓴다
const vw = window.innerWidth
const containerH = window.innerHeight - HEADER_H
const [w0] = tierWidths(cwRef.current || vw)   // 폭 미관찰 시 뷰포트 폭으로 폴백
const h0 = w0 / TIER_ASPECT                     // 이미지 높이 (3:2)
const slot0 = h0 + BELOW_TEXT_H                 // 슬롯 전체 높이 = 이미지 + 하단 텍스트 행
const cardTop = HEADER_H + containerH / 2 - slot0 / 2   // 슬롯 상단 (= 이미지 상단)
const thumbLeft = (vw - w0) / 2

startMorph({
  slug: prev,
  src: project.coverImage ? sanityCard(project.coverImage, 480, project.coverHotspot) : null,
  color: project.coverColor,
  from: pending.from,
  // 이미지가 슬롯 최상단 — TOP_TEXT_H 가산 없음 (텍스트는 하단으로 이동함)
  to: { top: cardTop, left: thumbLeft, width: w0, height: h0 },
  title: pending.titleFrom ? {
    text: project.title,
    from: { ...pending.titleFrom, fontSize: 16, fontWeight: 600 },
    // 타이틀 종착 — 이미지 하단 텍스트 행의 첫 줄. paddingTop 6은 §3-3 렌더와 일치
    to: { top: cardTop + h0 + 6, left: thumbLeft, fontSize: 13, fontWeight: 400 },
  } : null,
})
```

**세 가지 변경점:**

1. **`TIERS[0]` → `tierWidths(cwRef.current)[0]`** — 렌더와 동일한 파생 함수 사용
2. **`cardTop + TOP_TEXT_H` → `cardTop`** — 이미지가 슬롯 최상단에 위치 (텍스트가 하단으로 갔으므로)
3. **타이틀 종착 `cardTop + (TOP_TEXT_H - 13*1.35)/2` → `cardTop + h0 + 6`** — 이미지 하단 텍스트 행의 첫 줄 위치

**`cwRef.current || vw` 폴백 이유:** `cwRef`는 `ResizeObserver` 관찰 후에만 채워진다. BACK 시점에는 반드시 채워져 있으나(링이 이미 마운트·렌더된 상태), 방어적으로 뷰포트 폭을 폴백으로 둔다. 컨테이너가 전폭이므로 두 값은 사실상 동일하다.

### 2-3. 탭 모프(확장) 방향 확인

탭 시 확장 모프는 **`from`을 `getBoundingClientRect()`로 실측**하고 `to`는 히어로 산식이다.
`from`이 실측이므로 티어 크기 변경의 영향을 자동으로 받는다. **수정 불필요.**

**단, 확인할 것:** `handleTap`(§6-2)의 `topTitle` rect 캡처가 여전히 유효한지. 텍스트가 하단으로 이동했으나 `topTitleEls` ref는 새 위치의 DOM 노드에 붙어 있으므로(명세 ② §3-3에서 유지 명시) 실측값이 자동으로 하단 좌표를 반환한다. **수정 불필요.**

---

## 3. 검증 항목

1. **BACK 복귀:** 열람 → BACK 시 히어로가 **한 번에** 티어0 썸네일 크기(≈330px)로 축소. **중간에 작아졌다가 커지는 이중 동작이 없어야 한다.**
2. **BACK 종착 위치:** 모프 종료 시점의 썸네일 위치가 실제 링 카드 위치와 **정확히 일치**. 픽셀 점프 없음.
3. **타이틀 역모프:** 열람 타이틀(16px) → 카드 하단 텍스트(13px)로 보간. 종착 위치가 실제 텍스트 행과 일치.
4. **탭 확장:** 카드 탭 → 히어로 확대 모프 정상(회귀 없음).
5. **왕복:** 탭 → BACK → 탭 → BACK을 3회 반복해도 위치 어긋남 누적 없음.
6. **기기 폭 무관:** 375px / 390px / 430px / 767px 각 폭에서 §1~§5 전항 정상.
7. **회전:** 열람 중 회전 후 BACK 시에도 종착점이 새 폭 기준으로 정확.
8. **컴파일:** `npx tsc --noEmit` 무오류. 구 상수(`TIERS`/`SLOT_H`/`TOP_TEXT_H`/`PAIR_TEXT_W`/`PAIR_GAP`/`MIN_SLOT`) 잔존 참조 0건.

---

## 4. 금지 사항 (Forbidden Changes)

1. **`src/hooks/useRingWall.ts` — 파일 전체 수정 금지.** `containerWidth` 노출은 명세 ②에서 완료됨.
2. **`src/components/ProjectWall.tsx` — 파일 전체 수정 금지.**
3. **`src/components/LandingExperience.tsx` — 파일 전체 수정 금지.**
4. **`src/components/ContentArea.tsx` — 파일 전체 수정 금지.**
5. **`src/app/globals.css` — 파일 전체 수정 금지.**
6. **`src/lib/*` — 파일 전체 수정 금지.**
7. **티어 파생식 수정 금지.** `TIER0_RATIO` 0.92, `TIER0_MAX` 400, `TIER0_MIN` 240, `TIER1_RATIO` 0.698, `TIER2_RATIO` 0.396, `TIER_ASPECT` 3/2, `BELOW_TEXT_H` 40, `GAP` 14, `OPACITY` 일체 불변.
8. **`tierWidths` / `tierSlotHeights` 함수 시그니처·구현 수정 금지.** 이번 수정은 **이들을 BACK 경로에서 재사용하는 것**이 전부다.
9. **렌더 경로 수정 금지.** `const h = ring.heights[index] ?? slotHs[2]` → `thumbH` → `thumbW` 파생 체인 불변.
10. **`startMorph` / `MorphState` / `PendingMorph` / `TitleMorph` 타입·구현 수정 금지.** 목표 좌표 **값**만 바뀐다.
11. **탭 모프(확장) 경로 수정 금지.** `handleTap`의 rect 캡처, `activeSlug` 분기의 히어로 실측 로직 불변.
12. **열람 레이어(`ExpandedBlock`) 수정 금지.** 세로 스택 전환은 후속 명세 범위다.
13. **셔플·필터·입력 계층 수정 금지.**
14. **브레이크포인트 신설 금지.**
15. **측정 반응형 도입 금지.** 티어 기하는 `cwRef.current`에서의 결정적 파생이어야 한다. 새 `getBoundingClientRect` / `ResizeObserver` / `offsetWidth` 호출을 추가하지 않는다. (기존 모프 rect 캡처는 §11에 의해 불변)
16. **`npm run dev` / `npm run build` 실행 금지.** 검증은 `npx tsc --noEmit`만 사용한다.

---

## 5. 완료 조건

- `npx tsc --noEmit` 무오류
- `MobileProjectWall.tsx` 외 파일 변경 없음
- 구 상수 6종 완전 삭제 및 잔존 참조 0건
- §3 검증 항목 전항 통과

---

## 6. Claude Code 실행 프롬프트

```
BACK_MORPH_FIX_SPEC.md 파일을 읽고 명세대로 구현해줘.

수정 대상은 src/components/MobileProjectWall.tsx 한 파일뿐이다.

핵심은 두 가지다.
1) 구 상수(TIERS, TOP_TEXT_H, SLOT_H, PAIR_TEXT_W, PAIR_GAP, MIN_SLOT)를 완전 삭제한다.
2) BACK 역모프 목표 계산이 이 구 상수들을 참조하고 있으므로, tierWidths()/TIER_ASPECT/
   BELOW_TEXT_H 기반 파생식으로 교체한다. 특히 TOP_TEXT_H 가산을 제거해야 한다
   (텍스트가 이미지 하단으로 이동했으므로 이미지가 슬롯 최상단에 온다).

삭제 후 npx tsc --noEmit을 실행하면 남은 참조가 컴파일 오류로 드러난다.
이를 진단 수단으로 활용해서 모든 잔존 참조를 §2-2의 파생식으로 교체하라.

§4 금지 사항을 반드시 준수할 것. 특히 useRingWall.ts, ProjectWall.tsx,
LandingExperience.tsx, ContentArea.tsx, globals.css는 절대 수정하지 마라.
ExpandedBlock(열람 레이어)도 이번 범위가 아니다.

구현 후 npx tsc --noEmit로 검증하고, npm run dev나 npm run build는 실행하지 마라.
```
