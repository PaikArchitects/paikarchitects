# WALL_RING_SPEC — 데스크톱 프로젝트 월 가상 링(Virtual Ring) 전면 교체

> **작성일:** 2026.07.06
> **대상:** `src/components/ProjectWall.tsx` 내부 전면 재작성 + `src/hooks/useRingWall.ts` 신규 생성
> **성격:** 동결된 데스크톱 인터랙션 레이어의 명시적 재개방 (사용자 지시). 네이티브 스크롤 모델을 폐기하고 상태 구동형 가상 링 모델로 교체한다.

---

## 0. 절대 경계 (위반 금지)

1. **수정 허용 파일은 정확히 2개:** `src/components/ProjectWall.tsx` (내부 전면 교체), `src/hooks/useRingWall.ts` (신규).
2. **불가침:** `LandingExperience.tsx`, `ContentArea.tsx`, `MobileProjectWall.tsx`, `SiteHeader.tsx`, 전역 CSS, `projects.ts`, `projectSlides.ts`, `types/index.ts`. 단 한 줄도 수정하지 않는다.
3. **외부 계약 불변:** `ProjectWallProps` 인터페이스(아래)는 이름·타입·의미 모두 그대로 유지한다. 부모는 이 교체를 감지할 수 없어야 한다.

```ts
interface ProjectWallProps {
  projects: Project[]
  filterKey: string
  highlightSlug: string
  activeSlug: string | null
  revealed: boolean
  onHover: (project: Project | null) => void
  onSelect: (project: Project) => void
}
```

4. **행동 의미론 보존:** 티어 중심 우선순위 `activeSlug ?? hoveredId ?? highlightSlug`, 호버는 오프셋(스크롤 위치)을 움직이지 않음, active 시 비활성 카드 dim(0.3), 셔플/active 변경 시에만 프로그래매틱 이동 — 전부 현행과 동일하게 유지.
5. 기존 컨테이너의 className `"project-wall-scroll light-panel"`은 유지한다 (전역 CSS 참조 보존). 네이티브 스크롤바 관련 스타일은 자연히 비활성화되며, CSS 자체는 건드리지 않는다.

---

## 1. 개념 모델

월은 더 이상 스크롤 문서가 아니다. **N개 카드가 가상의 원 위에 배열된 링**이며, 유일한 위치 상태는 연속 실수 `offset` (단위: 인덱스) 하나다. `offset = 7.3`은 7번 카드와 8번 카드 사이 30% 지점이 컨테이너 세로 중앙에 있다는 뜻이다. 모든 카드의 위치·티어·불투명도는 `offset`과 props로부터의 **순수 함수 파생**이다.

- 최상단·최하단 개념 소멸. 어떤 카드든 d=0이 되는 순간 정확히 세로 중앙에 위치한다.
- 렌더링은 가상화: 중앙 기준 윈도 반경 R 슬롯만 DOM에 존재.
- 네이티브 스크롤(`overflowY: auto`, `scrollIntoView`) 완전 폐기. 컨테이너는 `overflow: hidden; position: relative`.

---

## 2. `useRingWall.ts` — 물리 코어 훅 (신규)

렌더러와 분리된 훅. 시그니처(안):

```ts
interface RingWallOptions {
  count: number                    // N (표시 목록 길이)
  containerHeight: number          // px, ResizeObserver로 갱신
  getSlotHeight: (index: number) => number   // 인덱스 → 목표 티어 높이 (렌더러가 주입)
  gap: number                      // 16
}

interface RingWallApi {
  offset: number                             // 현재 오프셋 (매 프레임 갱신되는 state)
  heights: number[]                          // 애니메이션 중인 실측 높이 배열 (length N)
  slots: { slot: number; index: number; turn: number; yCenter: number }[]
  moveTo: (index: number) => void            // 최단 원형 경로 트위닝
  jumpTo: (index: number) => void            // 즉시 이동 (트위닝 없음, 필터 스왑용)
  handlers: {                                // 컨테이너에 바인딩할 입력 핸들러
    onWheel: (e: WheelEvent) => void
    onPointerDown: (e: PointerEvent) => void
    onPointerMove: (e: PointerEvent) => void
    onPointerUp: (e: PointerEvent) => void
  }
  isSettled: boolean
}
```

### 2-A. 원형 산술 (순수 함수)

```ts
const mod = (a: number, n: number) => ((a % n) + n) % n
// 부호 있는 원형 델타: 결과 범위 (-n/2, n/2]
const signedCircDelta = (from: number, to: number, n: number) => {
  let d = mod(to - from, n)
  if (d > n / 2) d -= n
  return d
}
// 무부호 원형 거리 (티어 계산용)
const circDist = (a: number, b: number, n: number) =>
  Math.min(mod(a - b, n), mod(b - a, n))
```

### 2-B. 슬롯 배치 — 중앙 대칭 누적

매 렌더에서 `offset`으로부터 파생:

```
base = floor(offset), frac = offset - base
슬롯 s ∈ [-R, +R]에 대해:
  index(s) = mod(base + s, N)
  turn(s)  = floor((base + s) / N)     // React key용 회전수
  spacing(a, b) = (heights[index(a)] + heights[index(b)]) / 2 + gap

  yCenter(0) = C - frac * spacing(0, 1)          // C = containerHeight / 2
  yCenter(s > 0) = yCenter(s - 1) + spacing(s - 1, s)
  yCenter(s < 0) = yCenter(s + 1) - spacing(s, s + 1)
```

- `frac = 0`이고 높이가 수렴한 상태에서 슬롯 0 카드는 **수학적으로 정중앙**. 높이 변화는 중앙에서 바깥으로 대칭 전파되므로 별도 보정이 존재하지 않는다.
- 윈도 반경 `R = ceil((containerHeight / 2) / (96 + gap)) + 2`. 리사이즈 시 재계산.
- `heights`는 목표값(`getSlotHeight`)이 아니라 **애니메이션 중인 현재값**을 사용한다 (2-C).

### 2-C. 단일 rAF 물리 루프

하나의 rAF 루프가 세 가지를 통합 구동한다. `dt` 기반(초 단위)으로 계산해 60/120Hz 양쪽에서 동일 체감을 보장한다.

1. **관성 오프셋:** `offset += velocity * dt`, `velocity *= exp(-dt / 0.18)`. `|velocity| < 0.02` (idx/s)면 0으로 스냅.
2. **트위닝 (프로그래매틱 이동):** `moveTo(i)` 호출 시 `target = offset + signedCircDelta(mod(offset, N), i, N)` — 최단 원형 경로. 지속시간 `clamp(250 + 90 * |Δ|, 350, 900)`ms, easeInOutCubic. 트위닝 중 velocity는 0. **사용자 입력(휠·pointerdown)이 발생하면 트위닝 즉시 취소** — 입력 우선.
3. **높이 수렴:** 각 인덱스 i에 대해 `heights[i] += (target(i) - heights[i]) * (1 - exp(-dt / 0.12))`. 시상수 0.12s ≈ 기존 400ms ease 체감과 등가. `|차이| < 0.5px`면 목표값 스냅.

**슬립/웨이크:** 트위닝 없음 ∧ velocity 0 ∧ 전 높이 수렴 ∧ 드래그 아님 → rAF 취소(슬립). 입력·`moveTo`·티어 목표 변경 시 웨이크. Idle 상태에서 CPU 점유 0이어야 한다.

**상태 반영:** 루프는 `offset`·`heights`를 React state로 커밋한다 (프레임당 setState 1회, 렌더 카드 ≤ 2R+1 ≈ 15개이므로 성능 문제 없음). 루프 내부 계산은 ref 미러로 수행해 stale closure를 방지한다.

### 2-D. 입력 계층

- **휠 (마우스):** `velocity += (e.deltaY / 112) * 2.5` (112 = 최소 슬롯 간격 96+16 기준 px→idx 환산 상수), `|velocity| ≤ 12` (idx/s) 클램프. `preventDefault()` 호출 — 페이지 스크롤 차단 (컨테이너에 non-passive 리스너로 직접 등록).
- **드래그 (터치/펜 전용):** `e.pointerType === 'mouse'`는 무시 (마우스는 휠 전담 — 클릭 선택과의 충돌 방지). pointerdown에서 `setPointerCapture`, move에서 `offset -= dy_px / 112`, up에서 최근 3프레임 평균 속도로 velocity 부여 (플릭 관성). 컨테이너 `touch-action: none`.
  - **탭 판별:** pointerdown→up 사이 총 이동 < 8px이면 드래그가 아니라 탭 — 카드의 `onClick`(선택)이 정상 발화하도록 이동 ≥ 8px일 때만 click을 억제한다 (`suppressClickRef` + capture 단계 click 차단).
- 현행과 동일하게 **호버는 offset에 영향을 주지 않는다.** 호버는 티어 중심만 이동시키고, 높이 수렴 루프만 웨이크된다.

---

## 3. `ProjectWall.tsx` — 렌더러 전면 교체

### 3-A. 표시 순서 랜덤화 (신규 도입)

- 내부 state `order: Project[]`. **초기값은 `projects` 그대로** (SSR/hydration 불일치 방지 — `Math.random`을 초기 렌더에서 절대 사용하지 않는다).
- 마운트 후 `useEffect`에서 1회 Fisher-Yates 셔플로 교체. 인트로(`revealed=false`)가 이 교체를 시각적으로 가리므로 팝 현상 없음.
- 필터로 `projects`가 바뀔 때마다(3-D 스왑 시점에) 새 목록을 다시 셔플한다. 세션 내 동일 필터에서는 순서 고정.
- 부모의 셔플 큐(하이라이트 순번)와 월 표시 순서는 **서로 독립적인 별개의 무작위**다. 동기화하지 않는다.

### 3-B. 파생 계산

- `effectiveHighlight = activeSlug ?? highlightSlug` (프로그래매틱 이동 기준 — 현행 scrollIntoView 트리거와 동일).
- `tierCenter = activeSlug ?? hoveredId ?? highlightSlug` (크기 위계 기준 — 현행 동일).
- `tierCenterIdx = order.findIndex(p => p.id === tierCenter)`.
- 각 슬롯의 티어: `d = tierCenterIdx < 0 ? 2 : circDist(index(s), tierCenterIdx, N)`, `tier = min(d, 2)`. **거리 함수가 선형 |i−j|에서 원형 거리로 바뀌는 것이 이번 교체의 개념적 핵심이다.**
- `getSlotHeight(i)`는 이 티어 계산을 훅에 주입: `TIER_HEIGHTS[min(circDist(i, tierCenterIdx, N), 2)]` (tierCenterIdx < 0이면 96).
- 불투명도·isHighlighted·isDimmed 규칙은 현행 WallCard 로직 그대로 (`active ? 1 : isDimmed ? 0.3 : 0.45`, 마우스 전용 hover 등).

### 3-C. 프로그래매틱 이동

```ts
useEffect(() => {
  const idx = order.findIndex(p => p.id === effectiveHighlight)
  if (idx >= 0) ring.moveTo(idx)
}, [effectiveHighlight, order])
```

- `scrollIntoView`·`cardRefs`·`programmaticRef` 계열은 전부 삭제된다. 트위닝이 자기 생명주기를 소유하므로 완료 플래그 보정이 존재하지 않는다.

### 3-D. 필터 2단 시퀀스 승계

현행 exit(350ms) → 스왑 → enter 골격을 유지하되 링 문법으로 치환:

1. `projects` 변경 감지 → `phase = 'exit'`: 전 카드 페이드아웃 + translateY(-16px), 지연 `|slot| * 15ms` (중앙에서 바깥으로).
2. 350ms 후: `order = shuffle(newProjects)` 스왑, 새 order에서 `effectiveHighlight` 인덱스로 **`jumpTo` (즉시, 트위닝 없음)** — 하이라이트가 중앙에 놓인 채로 재입장. 목록에 없으면 `jumpTo(0)`.
3. `phase = 'enter'` → 더블 rAF 후 `'idle'`: 재입장 캐스케이드 opacity 0→1 + translateY(8px)→0, 지연 `|slot| * 40ms` (중앙 방사형). 인트로 최초 reveal도 동일 캐스케이드.

### 3-E. 카드 렌더링 구조

- 컨테이너: 기존 치수 유지 (`width: clamp(300px, 28vw, 28vw)`, `height: 100%`), `overflow: hidden`, `position: relative`, `touch-action: none`.
- 카드 외피(위치 계층): `position: absolute; left: 0; right: 0; top: 0; transform: translateY(yCenter − heights[i]/2); height: heights[i]px`. **위치·높이에 CSS transition을 걸지 않는다** — 모든 운동은 물리 루프가 프레임 단위로 공급한다.
- 카드 내피(현출 계층): 기존 WallCard의 내부 구조(우정렬 텍스트 + 2:1 썸네일, `cldThumb(coverImage, 480)`, coverColor fallback) 그대로 이식. opacity·reveal transition은 내피에만 건다 (위치 transform과 분리 — 상호 간섭 방지).
- **React key: `` `${project.id}#${turn}` ``.** 카드가 같은 회전수에 머무는 동안 key 안정 → 이미지 재로드 없음. 회전 경계를 넘는 리마운트는 화면 밖에서만 발생한다.
- 이미지 `loading="lazy"` 유지.

### 3-F. 소수 N 엣지 케이스

필터 결과 N이 윈도(2R+1)보다 작으면 동일 프로젝트가 여러 슬롯에 복수 렌더링된다 (turn이 다른 클론). 이는 링의 정직한 표현이며 의도된 동작이다 — 별도 분기·예외 처리를 만들지 않는다. `N = 1`도 동일 원리로 성립해야 한다 (`circDist`의 n=1 나눗셈 주의: `mod(x, 1) = 0` → d=0, 자연 성립).

---

## 4. 명시적 삭제 대상 (ProjectWall.tsx 내부)

- `overflowY: auto` 및 스크롤 컨테이너 동작 전부
- `scrollIntoView` 호출 및 `cardRefs`
- `containerRef.current.scrollTop = 0` (필터 리셋 — `jumpTo`로 대체)
- 선형 거리 `Math.abs(index - highlightIdx)` (원형 거리로 대체)
- 카드 외피의 `height 400ms ease` CSS transition (물리 루프로 대체)

부분 패치가 아니라 **파일 전체를 새로 작성**한다. 기존 파일에서 승계하는 것은 외부 계약, WallCard 내부 시각 구조, 상수(FONT, TIER_HEIGHTS, gap 16, 패딩 개념)뿐이다.

---

## 5. 검증

구현 완료 후 `npx tsc --noEmit` 통과 필수. (`npm run dev` / `npm run build` 실행 금지.)

수동 검증 체크리스트 (배포 후 사용자 수행):

1. 휠 연속 스크롤로 목록을 2바퀴 이상 통과 — 이음새·점프·순서 재배열 감지 불가
2. 새로고침 시마다 월 순서가 달라짐 (콘솔 hydration 경고 0건)
3. 셔플 6초 주기 이동이 항상 최단 원형 경로 + 거리 비례 지속시간
4. 정지 상태에서 d=0 카드가 항상 컨테이너 세로 정중앙 (최상단/최하단 예외 소멸)
5. 티어 전환(150↔120↔96) 시 d=0 중앙 고정 유지 (위쪽 밀림 없음)
6. 호버 시 크기 위계만 이동, 오프셋 부동 (현행 동일)
7. 카드 클릭 → active 진입, dim 0.3, 트랙 정상 (ContentArea 무변경 확인)
8. 필터 전환: 퇴장 → 랜덤 재배열 + 하이라이트 중앙 재입장 캐스케이드
9. 소수 필터(항목 2~3개)에서 클론 순환 정상, 크래시 없음
10. 태블릿/터치: 드래그 관성 스크롤 + 탭 선택 공존 (8px 임계)
11. 트위닝 중 휠 개입 시 즉시 사용자 제어로 전환
12. Idle 방치 시 CPU 점유 0 근접 (물리 루프 슬립 확인)

---

## 6. 사후 처리

- 이 스펙 실행·검증 완료 시 데스크톱 인터랙션 레이어 재동결.
- `useRingWall`은 향후 모바일 콘덴스드 월 이식의 공용 물리 코어가 된다 (모바일 이식은 별도 스펙 — 이번 작업에서 MobileProjectWall에 접근 금지).
