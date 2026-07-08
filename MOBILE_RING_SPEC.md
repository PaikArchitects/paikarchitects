# MOBILE_RING_SPEC — 모바일 월 가상 링 이식 + 내비게이션·필터 재편

## 0. 목적과 배경

모바일 월(MobileProjectWall)의 구세대 스크롤 문서 모델을 폐기하고, 데스크톱 ProjectWall과 동일한 **가상 링(Virtual Ring)** 아키텍처로 이식한다. 동시에 수평 칩 필터를 **우측 슬라이드 필터 패널**로, 상단 내비 링크를 **좌측 햄버거 메뉴 패널**로 재편한다.

폐기 사유 (검증된 결함 — 전부 스크롤 모델의 구조적 산물):
- 셔플이 카드가 작은 상태(76px)에서 `scrollIntoView(center)`로 정렬한 뒤 카드가 216px로 성장 → 중심이 최대 ±140px 이탈. 정렬 후 재보정 로직 부재.
- `paddingTop: 50vh` 상수 → 상단 여백 노출 + 동적 뷰포트(dvh)와의 불일치.
- 필터 직후 언폴드 중 scrollTop 클램프가 scroll 이벤트를 유발 → 중앙 최근접 카드가 임시 하이라이트 → 1.1초 뒤 `settleInitialRandom`이 무애니메이션 점프로 재하이라이트 (1초 미만 급전환).
- `scrollIntoView` 종료를 700ms 고정 타이머로 추정 → 초과분 scroll 이벤트가 사용자 조작으로 오판되어 셔플이 무작위로 8초 정지.
- 근본 구조: 스크롤 위치→하이라이트→크기 변경→레이아웃 이동→"중앙" 재정의의 피드백 루프.

링 이식으로 상기 전부가 구조적으로 소멸한다: 위치는 transform 파생이므로 크기 변화가 좌표계를 오염시키지 않고, slot 0은 수학적으로 항상 수직 정중앙이다. 감사 대장 부채 **B-1**(셔플 3중 정의)·**B-2**(scrollIntoView 패턴)·**A-1**(비활성 스크롤바 CSS)이 본 스펙에서 일괄 소멸한다.

## 1. 파일 명세 — 개방·동결 범위

| 파일 | 조치 |
|---|---|
| `src/components/MobileProjectWall.tsx` | **전면 재작성** (§3~§7). 단, 트랙 슬라이드 컴포넌트군은 §7-4에 따라 원문 보존 이관 |
| `src/hooks/useRingWall.ts` | **최소 개방** — §2의 옵션 파라미터 추가만. 물리 수식·입력 계층·슬롯 배치 로직 변경 금지 |
| `src/components/SiteHeader.tsx` | 모바일 햄버거 버튼 + 좌측 메뉴 패널 추가 (§8) |
| `src/app/globals.css` | 모바일 헤더 재배치(§8), 패널 스타일, A-1 부채 제거(§10) |
| `src/lib/shuffle.ts` | **신규** — Fisher-Yates 공용 유틸 (B-1 소멸) |
| `src/components/LandingExperience.tsx` | 로컬 `shuffle` 함수 삭제 → `@/lib/shuffle` import 교체. **그 외 접촉 금지** |
| `src/components/ProjectWall.tsx` | 로컬 `shuffle` 함수 삭제 → `@/lib/shuffle` import 교체. **그 외 접촉 금지** (재동결 상태 — 기계적 import 교체만 허용) |

**불변 외부 계약:** `MobileProjectWallProps`(projects / filterTypes / activeFilter / onFilter / activeSlug / onActivate / onDeactivate / revealed / showFilters)는 시그니처·의미 모두 불변. LandingExperience의 상태 소유(URL 동기화 일원화)·popstate 처리·핸들러도 불변.

## 2. useRingWall 최소 개방 — minSlotHeight 파라미터화

현재 `MIN_SLOT_HEIGHT = 96` 상수가 3개 지점(루프 판정, 윈도 반경 R, pxPerIdx 환산)에서 사용된다. 모바일 최소 티어는 76px이므로 96 고정 시 윈도 반경이 1슬롯 부족해 가장자리 카드 팝인이 발생한다.

```ts
export interface RingWallOptions {
  count: number
  getSlotHeight: (index: number) => number
  gap: number
  minSlotHeight?: number   // 기본값 96 — 데스크톱 호출부 무수정, 거동 완전 동일
}
```

- 훅 내부의 `MIN_SLOT_HEIGHT` 참조 3개 지점을 전부 이 옵션값(기본 96)으로 치환한다. ref 미러(`minSlotHeightRef`)로 입력 계층 클로저에 공급.
- 데스크톱 `ProjectWall.tsx`는 호출부 무수정(기본값 적용). **이외의 어떤 수정도 금지.**

## 3. 링 렌더러 — 티어 기하와 연속 파생

### 3-1. 상수 (v4.1 동결값 승계)
```ts
const TIERS = { 0: { w: 288, h: 192 }, 1: { w: 201, h: 134 }, 2: { w: 114, h: 76 } }
const TOP_TEXT_H = 24        // d=0 상단 텍스트 행
const GAP = 14               // ITEM_GAP 승계
const MIN_SLOT = 76          // useRingWall minSlotHeight로 전달
const OPACITY = { 0: 1, 1: 0.45, 2: 0.3 }
```
슬롯 높이(getSlotHeight): d=0 → **216**(192+24), d=1 → 134, d≥2 → 76. 모든 티어가 3:2 비율(288/192 = 201/134 = 114/76 = 1.5)임을 이용해 §3-3의 연속 파생이 성립한다.

### 3-2. 티어 중심 = round(offset)
```ts
const centerIdx = N > 0 ? mod(Math.round(ring.offset), N) : 0   // 유한 모드: clamp(Math.round(offset), 0, N-1)
const d = isLoop ? circDist(i, centerIdx, N) : Math.abs(i - centerIdx)
```
- 하이라이트(d=0)는 **정의상 중앙 카드**다. 별도 하이라이트 상태 변수를 두지 않는다.
- 드래그·셔플 트위닝 중 통과 카드가 중앙을 지날 때 자연히 성장·수축한다(v4.1 "뷰포트 중앙 기준 스크롤 반응" 문법의 링 등가). 높이는 물리 루프(HEIGHT_TAU)가 수렴시키므로 CSS height transition을 두지 않는다.

### 3-3. 카드 내부 — 애니메이션 높이 h로부터의 순수 파생
물리 루프가 공급하는 연속 높이 `h = ring.heights[i]` (76↔134↔216 구간을 연속 통과)에서:
```
thumbH   = h ≤ 134 ? h : 134 + (h − 134) × 58/82     // 134→192 선형
textRowH = h − thumbH                                  // 0→24 선형
thumbW   = thumbH × 1.5                                // 전 구간 3:2 유지
```
- 외피: `position:absolute; height:h; transform:translateY(yCenter − h/2)`. **위치·크기에 CSS transition 금지** — 운동은 전량 물리 루프 공급 (데스크톱 §2 문법 동일).
- 썸네일: 수평 중앙 정렬, `thumbW × thumbH`, cover. 커버 부재 시 `coverColor` 단색 폴백 유지.
- 상단 텍스트 행(d=0 전용): 높이 `textRowH`, overflow hidden, 내용은 [타이틀 13px w400 1줄 ellipsis | 우측 카테고리 9px w300 uppercase]. 폭 = thumbW. opacity는 이산 d 기준 크로스페이드(d=0 ↔ d≥1, 150ms) — 기하는 연속, 현출만 이산.
- 측면 텍스트(d≥1 전용): v4.1 문법 유지 — 썸네일 좌측 바깥(`right: calc(100% + 8px)`), 폭 130, 우정렬, 타이틀 2줄 클램프 + 카테고리. d=0 진입 시 상단 텍스트와 크로스페이드.
- 카드 전체 opacity: 이산 d 기준 OPACITY 값, `transition: opacity 300ms ease`.
- key: `${project.id}#${turn}` (데스크톱 동일 — 클론 없음 보장).

### 3-4. 컨테이너
`position:fixed; top:56px; left:0; right:0; bottom:0; overflow:hidden; background:#FFF; touch-action:none`. 스크롤 요소가 아니므로 dvh/패딩 산술이 존재하지 않는다. 입력(터치 드래그·플릭·탭 판정)은 useRingWall이 전담한다 — 렌더러에 자체 포인터 스크롤 로직 작성 금지.

## 4. 표시 순서·셔플·초기 정착 — 데스크톱 문법 통일

- 표시 순서 `order`: 초기값은 projects 그대로(SSR/hydration 안전 — 초기 렌더에서 Math.random 금지), 마운트 후 1회 `shuffle(order)` (인트로가 교체를 가린다).
- 셔플 큐: `shuffle(order.map(p => p.id))`, 소진 시 재셔플. 타이머는 6000ms 주기 / 사용자 조작(pointerdown·wheel) 후 8000ms 유예 / 500ms 폴링 — v4.1 상수 승계. `advanceShuffle`은 `ring.moveTo(idx)` 한 줄이다. scrollIntoView·programmaticRef·종료 추정 타이머는 존재하지 않는다.
- 사용자 조작 판정: 컨테이너 pointerdown·wheel에서 `lastUserRef` 갱신. scroll 이벤트가 없으므로 오판 경로가 없다.
- **초기 정착:** revealed 직후(마운트 셔플 완료 후) `ring.jumpTo(랜덤 큐 첫 항목 인덱스)` 1회 — 첫 페인트부터 d=0가 정중앙이다. "정착 애니메이션"이라는 개념 자체가 없다.
- N < 2이면 셔플 타이머 미가동 (유한 모드 축퇴 — 데스크톱 동일).

## 5. 필터 전환 — 데스크톱 2단 시퀀스 이식

폴드/언폴드 상태 머신(pre/folding/unfolding/idle, grid-template-rows 0fr/1fr, stagger 상수군)을 **전량 삭제**하고 데스크톱 문법으로 통일한다:

1. **exit** (350ms): 전 카드 페이드아웃 — 캐스케이드 지연 `|slot| × 15ms`, translateY(−16px).
2. 스왑: `order = shuffle(filteredProjects)`, 새 셔플 큐 생성, `jumpTo(큐 첫 항목)` — 새 하이라이트가 중앙에 놓인 채 재입장.
3. **enter**: 더블 rAF 후 캐스케이드 재입장 (`|slot| × 40ms`, translateY(8px→0), 400ms).

내피(현출 계층)와 외피(위치 계층)의 분리는 데스크톱 WallCard 구조를 그대로 따른다. 급전환·임시 하이라이트는 구조적으로 발생 불가(스크롤 이벤트 부재 + jumpTo 원자성).

## 6. 탭 확장 — 열람 레이어 분리 + FLIP 모프

인라인 확장(피드 내 0fr/1fr 수축·팽창)을 폐기하고 **브라우징 레이어(링) / 열람 레이어(트랙)를 분리**한다. BACK 복귀 목표가 "링 중앙의 d=0 카드"로 결정적이 되어 스크롤 목표 산술이 전부 소거된다.

### 6-1. 열람 레이어
`position:fixed; top:56px; inset 나머지 0; background:#FFF; z-index:40`. 내용은 가용 영역 수직 중앙 정렬: BACK 행(36px) / 타이틀(16px w600, 2줄 클램프) / 수평 트랙 / 카운터 행. 트랙 내부 구성·스냅·pan-x·캡션 28px·다이어그램 탭 진행은 §7-4의 보존 컴포넌트가 담당한다 (v4.1 동결 항목 — 변경 금지).

### 6-2. 확장 시퀀스 (탭)
1. 탭 카드의 썸네일 rect 캡처(`getBoundingClientRect`) + d=0 탭이면 상단 타이틀 rect 캡처.
2. `onActivate(id)` 호출(URL push는 부모 소유) + `ring.moveTo(idx)` (BACK 복귀 대비 중앙 정렬).
3. 모프 오버레이(z 60, fixed): 캡처 rect → 히어로 최종 rect로 **CSS transition 500ms cubic-bezier(0.7,0,0.3,1)** 보간. 히어로 최종 rect는 결정적: `left:16, width:vw−32, height:(vw−32)×2/3`, top = 열람 레이어의 히어로 수직 위치(산식 또는 마운트 후 실측 — 열람 레이어는 즉시 마운트되므로 실측 가능).
   - 스크롤 동기화가 사라졌으므로 rAF 러너(`animateScroll`)·`cubicBezier` JS 이징은 폐기하고 CSS transition으로 단순화한다.
4. 타이틀 직접 보간(d=0 탭 한정): 13px/w400 → 16px/w600, 동일 500ms·이징, 종착 = 열람 레이어 타이틀 위치. 보간 중 실제 타이틀 행·BACK 행은 숨김 후 완료 시 교대 (v4.1 문법 승계).
5. 동시에 열람 레이어 opacity 0→1, 링 컨테이너 opacity 1→0 (500ms, 링은 `pointer-events:none`). 완료 시 오버레이 제거.

### 6-3. 수축 시퀀스 (BACK)
역순. 히어로 rect → 중앙 d=0 썸네일 rect. 목표는 산식으로 결정적:
```
containerH = viewportH − 56
thumbTop  = 56 + containerH/2 − 216/2 + 24
thumbLeft = (vw − 288) / 2,  288 × 192
```
타이틀 역보간(16→13px / w600→400). 링 opacity 0→1. `onDeactivate()`는 시퀀스 개시 시점에 호출(상태는 부모 소유).

### 6-4. 딥링크·필터 중 확장 해제
- 딥링크(`activeSlug` 초기 존재): 모프 생략, 열람 레이어 즉시 표시 + `jumpTo(idx)` (transitionsOn 게이트 승계 — 마운트 직후 1프레임 전환 비활성).
- 열람 중 필터 선택(부모가 active를 닫는 경로): 역모프 생략 — 열람 레이어 즉시 해제 + §5 exit/enter 시퀀스로 직행 (탭 카드가 새 필터에 부재할 수 있으므로 모프 목표가 성립하지 않는다).
- popstate 경유 활성/해제도 동일 분기(pending rect 부재 시 모프 생략) — v4.1 처리 승계.

## 7. 필터 패널 (BIG 레퍼런스 — 우측 슬라이드)

### 7-1. 트리거
수평 칩 행(CHIPS_H 44px, sticky, 오버플로 그라디언트, 칩 드래그 M2) **전량 삭제**. 대체: 헤더 존 우측의 필터 글리프 버튼 — `position:fixed; top:0; right:0; width:56px; height:56px; z-index:95`(헤더 바 90 위, 워드마크 200 아래). `showFilters === true`일 때만 렌더 (M1 문법 승계). MobileProjectWall이 소유(필터 상태가 props로 이미 공급되므로 컨텍스트 신설 불요).

글리프: **길이가 체감하는 수평선 3개** (18/13/8px, stroke 1.5px, 세로 간격 5px) — 필터·정렬의 관용 기호. 햄버거(§8)와 시각적으로 구분된다.

### 7-2. 패널
- `position:fixed; top:0; right:0; bottom:0; width:min(62vw, 280px); background:#FFF; z-index:120`. `transform: translateX(100%) → 0`, 380ms cubic-bezier(0.7, 0, 0.3, 1). 그림자 `box-shadow: -8px 0 24px rgba(0,0,0,0.06)`.
- 스크림: 잔여 영역 `rgba(8,7,6,0.25)`, opacity 페이드 동기, z-index 110, 탭 시 닫힘. 필터 글리프 재탭도 닫힘.
- 내용: 상단 패딩 72px(헤더 존 회피) + 좌 24px. `filterTypes` 수직 나열 — 각 항목 12px w300 uppercase letterSpacing 0.08em, 행간 여유(padding 12px 0), `word-break: keep-all` 2줄 허용(CULTURE AND EXHIBITION 등 장문 라벨 대비). 활성 항목: w500 + 좌측 불릿 ● (칩 문법 승계).
- 항목 탭: `onFilter(t)` + 패널 닫힘 → §5 시퀀스가 이어진다. 세로 스크롤 허용(`overflow-y:auto`, 15항목 대비).

## 8. 햄버거 메뉴 (전역 크롬 — SiteHeader 소유)

내비게이션은 랜딩 전용이 아닌 사이트 전역 요소이므로 SiteHeader가 소유한다 (/about·/essays·/contact에서도 동작).

### 8-1. 모바일 헤더 재배치 (globals.css, `@media (max-width: 767px)` 한정 — 데스크톱·태블릿 무변)
- **햄버거 버튼**: 좌측 `left:0; top:0; 56×56px; z-index:100`. 글리프: 등장(等長) 수평선 2개(18px, stroke 1.5px, 간격 6px) — 필터 글리프(체감 3선)와 구분. `layoutVisible`과 동기해 페이드 인.
- **워드마크 중앙 이동**: `.wordmark-intro.moved`의 모바일 규칙을 `top:16px; left:50%; transform:translateX(-50%)`로 변경 — 인트로 종착이 화면 중앙에서 수직 상승하는 궤적이 된다(기존 transition 속성이 그대로 보간). 데스크톱 종착(left 24px)은 불변.
- **기존 .site-nav 링크 행**: 모바일에서 `display:none` (데스크톱·태블릿 유지). 우상단은 필터 글리프(§7-1) 전용이 된다.

### 8-2. 메뉴 패널
필터 패널의 미러: `left:0; width:min(62vw, 280px)`, `translateX(-100%) → 0`, 동일 시간·이징·스크림(z 110/120). 내용: 상단 패딩 72px + 좌 24px, NAV_ITEMS(ABOUT/WORKS/ESSAYS/CONTACTS) 수직 나열 — 13px w300 uppercase, padding 14px 0, 현재 경로 항목 w500. 항목 탭 = Link 내비게이션 + 패널 닫힘. 라우트 변경 시 자동 닫힘.
- 메뉴·필터 패널은 상호 배타(동시 오픈 불가) — 각자 로컬 상태이므로 열림 시점에 문제되지 않지만, 스크림이 각자의 패널만 닫으면 충분하다.

## 9. 엣지케이스 (유한 모드 — 데스크톱 §3 축퇴형 승계)

- 루프 판정: `count × (76 + 14) ≥ containerH + 150`. 전체 30개는 루프(2700px), 소수 필터 결과는 유한 스택 — 훅이 자동 분기.
- N=1 (Landscape·Interior): 단독 중앙, 셔플 정지, 드래그 무시(훅의 유한 모드 게이트).
- N=2: 유한 스택 2장, 셔플은 교대 moveTo.
- 유한 모드에서 centerIdx는 `clamp(Math.round(offset), 0, N−1)` — 거리 함수는 선형 `Math.abs`.

## 10. 삭제 대상 명세 (재작성 시 이월 금지)

- 폴드/언폴드 상태 머신 전체: WallPhase, FOLD_*/UNFOLD_* 상수군, displayList 이중 리스트, firstReveal/firstFilter ref 게이트.
- 스크롤 모델 전체: `paddingTop/Bottom 50vh`, centerIdx scroll 리스너(updateCenter/handleFeedScroll), `settleInitialRandom`, `advanceShuffle`의 scrollIntoView, programmaticRef, shuffleFlagTimer(700ms), `animateScroll` rAF 러너, `cubicBezier`/`easeFn` JS 이징.
- 칩 행 전체: CHIPS_H, sticky 칩 컨테이너, 오버플로 그라디언트·화살표, 칩 마우스 드래그(M2 — 데스크톱 필터 바에는 별도 구현이 남아 있으므로 무관).
- 인라인 확장 기계: grid-template-rows 0fr/1fr, closingSlug/markClosing 타이머.
- globals.css: `.project-wall-scroll` 스크롤바 규칙 2블록 삭제 (**A-1 부채 소멸** — 데스크톱 ProjectWall은 overflow:hidden이므로 무영향. className 속성 자체는 건드리지 않는다). `.mpw-chips`는 데스크톱 필터 바가 사용하므로 **유지**, `.mpw-track`도 열람 트랙이 사용하므로 유지.
- 로컬 shuffle 함수 3본 → `src/lib/shuffle.ts` 단일화 (B-1 소멸).

## 11. 보존 대상 명세 (원문 이관 — 로직 변경 금지)

`MobileCaption` / `MobileImageSlide` / `MobileDiagramSetSlide` / `MobileCreditsSlide` / `MobileInfoSlide` / `MobileSlide` / `ExpandedBlock`(트랙·스냅·카운터·마우스 드래그 P1 포함) — v4.1 동결 레이어. 상수 `HERO_W`/`TRACK_IMG_H`/`TRACK_DIAGRAM_H`/`CAPTION_H`/`BACK_ROW_H`/`MORPH_MS`/`EASE`와 함께 그대로 이관한다. `getRestSlides`/`splitCaption` 유틸 동일.

## 12. 검증

- 타입 체크: `npx tsc --noEmit`만. `npm run dev`/`npm run build` 실행 금지.
- 배포 후 녹화 검증 체크리스트 (10항):
  1. 인트로 종료 직후 d=0 카드가 수직 정중앙 — 상단 임의 여백 없음(카드가 중앙 대칭으로 위아래를 채움).
  2. 셔플 6초 주기 일정, 이동 중 통과 카드의 성장·수축 반응, 종착 시 오차 없는 중앙 안착.
  3. 터치 드래그·플릭 관성, 탭/드래그 구분(8px 문턱), 조작 후 8초 셔플 유예.
  4. 필터 글리프 → 우측 패널 슬라이드 인, 스크림 탭·재탭 닫힘.
  5. 필터 선택 → 패널 닫힘 → exit/enter 캐스케이드 → 새 d=0 정중앙 정착. **1초 미만 하이라이트 급전환 부재.**
  6. N=1 필터(Landscape/Interior): 단독 중앙 정지, N=2: 상하 배치·교대 셔플.
  7. 카드 탭 → FLIP 모프 → 열람 레이어(BACK/타이틀/트랙/카운터), d=0 탭 시 타이틀 직접 보간.
  8. BACK → 역모프 → 링 중앙 d=0 복귀, 링 offset 보존.
  9. 햄버거 → 좌측 메뉴 패널, 4개 항목 내비게이션, /about 등 타 페이지에서도 동작.
  10. 열람 트랙: 수평 스냅·pan-x 고정·캡션 28px·다이어그램 탭 진행 — v4.1 동결 항목 회귀 없음.
