# FINITE_STACK_CLAMP_SPEC — 유한 스택 블록 클램프 (2026-07-10)

## 0. 배경 및 목표

**증상**: works 필터에서 프로젝트 수 N이 루프 성립 기준 미만(유한 스택 모드)일 때,
활성 카드가 스택 끝단이면 나머지 카드가 한쪽으로만 뻗어 뷰포트 밖으로 잘린다.
휠·드래그가 유한 모드에서 전면 차단되어 있어 잘린 카드를 볼 방법이 없다.

**원인**: 유한 모드의 배치 앵커가 "활성 카드(슬롯 0)를 컨테이너 세로 정중앙에 고정"
이기 때문. 활성 카드가 인덱스 0 또는 N-1이면 스택 절반 이상이 중앙 아래(위)로만
전개되어, 컨테이너 절반 높이가 부족하면 끝 카드가 클리핑된다.

**해법**: 유한 모드의 배치 규칙을 "활성 카드 중앙 고정"에서 **스택 블록 클램프**로
전환한다.

- 스택 총높이 ≤ 컨테이너 높이 (일반 케이스): 스택 전체를 블록 단위로 세로 중앙
  정렬. 어떤 카드를 선택해도 전 카드가 항상 온전히 보이며 스크롤이 불필요하다.
- 스택 총높이 > 컨테이너 높이 (루프 판정 경계 부근의 드문 케이스): 스택 가장자리가
  뷰포트 안쪽으로 들어오지 않도록 위치를 클램프하고, **이 경우에만** 휠·드래그를
  허용한다.

기존 순수 함수 파생 원칙을 유지한다 — 슬롯 y 계산 후 보정값 Δ 하나를 파생해
전 슬롯에 가산하는 형태이며, 새 상태(state)를 추가하지 않는다.

---

## 1. 파일 매니페스트

| 파일 | 조치 |
|---|---|
| `src/hooks/useRingWall.ts` | **수정 (유일한 수정 파일)** |

**금지 변경 목록** — 아래는 절대 수정하지 않는다:
- `src/components/ProjectWall.tsx` (렌더러 — 수정 불필요, 손대지 말 것)
- `src/components/MobileProjectWall.tsx` (레거시 모바일 — 별도 동결)
- `src/components/LandingExperience.tsx`, `src/data/projects.ts`,
  `src/types/index.ts`, `src/app/globals.css` 및 그 외 모든 파일
- useRingWall.ts 내부라도 다음은 변경 금지:
  - 루프 모드 산술·배치·입력 로직 전부 (`mod`, `signedCircDelta`, `circDist`,
    루프 분기 측 코드)
  - 물리 상수 전부 (`MIN_SLOT_HEIGHT`, `LOOP_BUFFER`, `VELOCITY_*`, `HEIGHT_*`,
    `WHEEL_GAIN`, `TAP_THRESHOLD`, `FLICK_SAMPLES`, `MAX_DT`)
  - 공개 API 시그니처 (`RingWallOptions`, `RingSlot`, `RingWallApi`,
    `moveTo`/`jumpTo` 시그니처)
  - 모드 판정식 (§1 `isLoop = count * (minSlotHeight + gap) >= containerHeight + LOOP_BUFFER`)
  - tick의 유한 모드 offset 클램프 `[0, N-1]`

---

## 2. 수정 명세

### §2-A. 컨테이너 높이 ref 미러 추가

입력 핸들러(비-리액트 클로저)에서 오버플로 판정에 컨테이너 높이가 필요하다.
기존 `containerHeight` state와 병행하는 ref 미러를 추가한다.

```ts
const containerHeightRef = useRef(0)
```

ResizeObserver 콜백과 초기 측정 지점에서 state와 ref를 함께 갱신한다:

```ts
const ro = new ResizeObserver(() => {
  containerHeightRef.current = el.clientHeight
  setContainerHeight(el.clientHeight)
})
ro.observe(el)
containerHeightRef.current = el.clientHeight
setContainerHeight(el.clientHeight)
```

### §2-B. 유한 모드 오버플로 판정 헬퍼 (입력 게이트용)

입력 리스너 useEffect 내부(또는 훅 스코프)에 순수 계산 함수를 둔다.
스택 총높이 = 실측 높이 합 + (N-1)·gap.

```ts
const finiteOverflow = () => {
  const n = countRef.current
  if (n <= 0) return false
  const heights = heightsRef.current
  let sum = 0
  for (let i = 0; i < n; i++) sum += heights[i] ?? minSlotHeightRef.current
  return sum + (n - 1) * gapRef.current > containerHeightRef.current
}
```

### §2-C. 입력 게이트 변경 — 휠·드래그

**onWheel**: 유한 모드 전면 차단을 "유한 && 비오버플로"일 때만 통과로 완화한다.

```ts
// 변경 전
if (!isLoopRef.current) return

// 변경 후 — 유한 모드는 스택이 뷰포트를 넘칠 때만 스크롤 허용 (§3-B 개정)
if (!isLoopRef.current && !finiteOverflow()) return
```

`preventDefault` 및 velocity 가산 로직은 기존 그대로 공용한다. 유한 오버플로에서
발생한 잔여 velocity는 tick의 기존 offset 클램프 `[0, N-1]`이 흡수한다.

**onPointerDown** (터치/펜 드래그): 동일한 게이트로 변경한다.

```ts
// 변경 전
if (!isLoopRef.current) return

// 변경 후
if (!isLoopRef.current && !finiteOverflow()) return
```

pointermove/up/cancel, 클릭 억제 로직은 무수정.

### §2-D. 슬롯 배치 — 유한 모드 렌더 범위 전개 + 블록 클램프 Δ

`slots` useMemo 내부만 수정한다. 루프 분기 측 수식은 한 글자도 바꾸지 않는다.

**(1) 유한 모드 슬롯 범위를 전 카드로 전개.** 유한 모드는 정의상 N이 작아
가상화가 불필요하며, 블록 클램프에서는 전 카드가 가시 범위에 들어올 수 있으므로
윈도 반경 R로 자르지 않는다.

```ts
// 변경 전
const lo = isLoop ? Math.min(R, Math.floor((n - 1) / 2)) : Math.min(R, base)
const hi = isLoop ? Math.min(R, Math.ceil((n - 1) / 2)) : Math.min(R, n - 1 - base)

// 변경 후 — 유한: 유효 인덱스 0..N-1 전체를 슬롯으로 (§3-A 개정)
const lo = isLoop ? Math.min(R, Math.floor((n - 1) / 2)) : base
const hi = isLoop ? Math.min(R, Math.ceil((n - 1) / 2)) : n - 1 - base
```

**(2) 블록 클램프 보정 Δ.** 기존 y 체인 계산(중앙 대칭 누적) 직후, 유한 모드에
한해 보정값 Δ를 파생해 전 슬롯 y에 가산한다.

```ts
// ── 유한 모드 블록 클램프 (§3-C 신설) ──
// 스택 상·하단 실좌표에서 보정 Δ를 파생한다. 수용(H ≤ containerH) 시
// Δ가 offset 기여분을 정확히 상쇄해 블록 중앙 정렬이 되고(배치의 offset
// 독립성), 오버플로 시 가장자리가 뷰포트 안쪽으로 들어오지 않게 클램프한다.
let delta = 0
if (!isLoop) {
  const yTop = y[-lo] - hAt(idxOf(-lo)) / 2
  const yBot = y[hi] + hAt(idxOf(hi)) / 2
  const stackH = yBot - yTop
  delta = stackH <= containerHeight
    ? (containerHeight - stackH) / 2 - yTop          // 블록 중앙 정렬
    : clamp(0, containerHeight - yBot, -yTop)         // 가장자리 클램프
}
```

슬롯 산출 루프에서 Δ를 가산한다:

```ts
out.push({
  slot: s,
  index: idxOf(s),
  turn: isLoop ? Math.floor((base + s) / n) : 0,
  yCenter: y[s] + delta,   // 루프 모드는 delta === 0
})
```

주의: `clamp(0, containerHeight - yBot, -yTop)`의 인자 순서는 기존 유틸
`clamp(v, lo, hi)`와 일치한다 — 오버플로 분기에서는 항상
`containerHeight - yBot ≤ -yTop`이 성립하므로 유효하다.

### §2-E. 주석 갱신

파일 상단 헤더 주석과 §3-B 관련 주석을 새 거동에 맞게 갱신한다
("유한 모드 휠/드래그 무시" → "유한 모드는 스택 오버플로 시에만 휠/드래그 허용,
배치는 블록 클램프"). 코드 거동과 주석의 불일치를 남기지 않는다.

---

## 3. 거동 명세 (검수 기준)

1. **N=3~4 필터 (스크린샷 재현 케이스)**: 어떤 카드를 선택/호버해도 전 카드가
   항상 뷰포트 안에 온전히 보인다. 잘림 없음. 휠 입력은 통과(페이지 자체가
   overflow hidden이므로 무반응 — 기존 §3-B와 동일한 통과 방식).
2. **N=1**: 단독 카드 정중앙 — 기존 거동과 동일 (블록 중앙 정렬의 축퇴형).
3. **N=2**: 두 카드가 블록 단위로 정중앙 고정, 선택 시 티어 높이만 변화.
   ※ 기존 "선택 카드 중앙 + 교대 배치" 거동에서 의도적으로 변경됨.
4. **유한 오버플로 (루프 경계 부근)**: 스택 상단이 뷰포트 상단 아래로,
   하단이 뷰포트 하단 위로 들어오지 않는다. 휠·드래그로 잔여분 탐색 가능.
   끝단 offset 부근에서 클램프로 인한 휠 사각지대(입력이 시각 변화 없이
   소모되는 구간)가 존재할 수 있다 — 알려진 트레이드오프로 허용.
5. **루프 모드**: 픽셀 단위 무변화. Δ는 루프에서 항상 0.
6. **선택/호버 시**: 유한 수용 케이스에서 위치 이동 없음, 높이 수렴
   애니메이션만 발생 (블록이 중앙 앵커 기준으로 대칭 팽창/수축).

---

## 4. 검증

- `npx tsc --noEmit` 통과 (다른 빌드/실행 명령 금지 — `npm run dev`,
  `npm run build` 실행 금지)
- 수정 파일이 `src/hooks/useRingWall.ts` 단 하나인지 diff로 확인

---

## 5. Claude Code 실행 프롬프트

```
FINITE_STACK_CLAMP_SPEC.md 파일을 읽고 명세대로 구현해줘.
수정 파일은 src/hooks/useRingWall.ts 단 하나다. 그 외 어떤 파일도 수정하지 마라.
루프 모드 로직·물리 상수·공개 API·모드 판정식은 절대 변경 금지.
검증은 npx tsc --noEmit만 사용하고 npm run dev / npm run build는 실행하지 마라.
```
