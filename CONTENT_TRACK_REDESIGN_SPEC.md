# CONTENT_TRACK_REDESIGN_SPEC — 트랙 레이아웃 결정론화 (측정 반응형 폐기)

## 0. 재설계 사유

측정 반응형 레이아웃(이미지 고유 폭 → DOM 측정 → rects 상태)의 구조적 결함 확정:
- 트랙(블록 레벨 플렉스 컨테이너)의 폭은 부모에 고정되고 슬라이드는 오버플로만 하므로, **이미지 로드가 어떤 관찰 가능한 크기 변화도 만들지 않는다** → 재측정 트리거 부재 → 진입 시점 1회 측정(미로드 시 폭 0)이 영구화.
- 증상 전부가 단일 근원: 화살표 실종(maxScroll≈0), 스냅 이탈, 마지막 슬라이드 미도달, 그리고 "캐시 적중 시에만 정상"이라는 비결정성.
- 원칙: 측정에 반응하지 말고 상태에서 순수 파생한다 (링 월과 동일 철학).

수정 파일: `src/components/ContentArea.tsx` 1개.

## 1. 비율 선로드 — 폭의 원천 데이터

```ts
// 모듈 레벨 캐시 — 세션 내 재방문 즉시 준비
const ratioCache = new Map<string, number[]>()   // projectId → 슬라이드별 w/h 비율

const FALLBACK_RATIO = 4 / 3
const PRELOAD_TIMEOUT_MS = 8000   // 개별 이미지 한도 — 초과·에러 시 FALLBACK_RATIO
```

- 슬라이드별 비율 소스: `image` → `slide.src`, `diagramSet` → `slide.items[0].src`(기존 사이저와 동일 기준), `credits` → 상수(§2), 슬라이드 없음(coverColor 폴백) → `FALLBACK_RATIO`.
- 활성화(active + project.id)마다: 캐시 적중 시 즉시 ready. 미스 시 `new Image()`로 병렬 로드, `Promise.all` 완료 시 `ratioCache.set` 후 ready. 개별 onerror/타임아웃은 FALLBACK_RATIO로 대체하고 전체를 막지 않는다.
- `ready` 상태(boolean 또는 ratios state)를 트랙 표시 게이트에 연결: **트랙 페이드 인(trackIn)은 morph 종료 + ratios ready를 모두 충족한 뒤에만 true.** 정보 슬라이드(infoIn)는 기존 타이밍 유지 — 텍스트라 비율과 무관.
- 부수 효과: 선로드가 곧 이미지 워밍이므로 트랙 등장 시 빈 이미지 프레임이 보이지 않는다.

## 2. 폭 결정론화 — rects의 순수 계산

DOM 측정 전면 폐기. 뷰포트 치수만 상태로 유지한다(정당한 관찰 대상 — 안정적이며 리사이즈 시에만 변화):

```ts
const [vpSize, setVpSize] = useState({ w: 0, h: 0 })   // viewportRef의 clientWidth/Height
// RO는 viewportRef 하나만 관찰. window resize 리스너 유지.
```

슬라이드 폭 (전부 명시 px):
```ts
const slideH   = vpSize.h * SLIDE_H_RATIO          // 0.72
const diagramH = vpSize.h * 0.48                    // DIAGRAM_H_PCT의 px 화
widthOf(slide, ratio):
  image      → ratio × slideH
  diagramSet → ratio × diagramH
  credits    → 420                                   // 기존 상수
  (없음 폴백) → FALLBACK_RATIO × slideH
정보 슬라이드 → INFO_SLIDE_W (200)
```

rects (useMemo — ratios·vpSize의 순수 함수):
```ts
x_0 = 0 (정보 슬라이드), x_{i+1} = x_i + w_i + SLIDE_GAP_PX
```
`centers`·`contentEnd`·`maxScroll`(이중 클램프 유지)·`nearest`·`isNearCenter`·`goToSlide` 산식은 **일절 변경 금지** — 입력(rects)이 결정론화되면 그대로 정확해진다.

렌더 반영:
- 각 슬라이드 외피 div에 `width: <계산 px>` 명시 (`height`는 기존 비율 스타일 유지 가능하나, px 명시로 통일 권장).
- `<img>`는 `width:100%; height:100%; object-fit:contain(다이어그램)/cover 아님 — 기존 slide-img의 시각 결과 유지가 기준. 이미지가 아직 스트리밍 중이어도 박스가 예약되어 레이아웃 이동이 발생하지 않는다.`
- 다이어그램 세트의 숨김 사이저 `<img>`(폭 결정용)는 **삭제** — 폭이 외부에서 주어진다.

## 3. 측정 서브시스템 삭제 목록
- `measure()` 함수, `rects` setState 경로(useMemo로 대체), 앵커 보상 블록, `scrollPosRef` 미러.
- 트랙 대상 ResizeObserver(뷰포트 관찰만 남김).
- `trackRef`는 유지하되 측정 용도 참조 제거 (transform 적용 대상으로만 사용).

## 4. 리사이즈 재중앙 (신규 — 이제 순수 계산이라 가능)
vpSize 변경 시: 변경 직전의 `nearest`를 기억해 새 rects 기준 `centers[nearest] − vpW/2`로 scrollPos를 무애니메이션 재설정(클램프 적용). 드래그 중이면 생략.

## 5. 다이어그램 내부 글리프 — 블렌드 폐기, 검정 고정
원인: 트랙의 격리 그룹 내에서 투명 배경 PNG 위에는 difference가 도달할 픽셀이 없어 글리프가 흰색 유지 → 흰 화면에서 비가시.
```ts
// 내부 글리프(28px) span: mixBlendMode 제거
color: '#080706',
```
외부 트랙 글리프(64px)의 `#FFFFFF + difference`는 **유지** (확인 완료 항목 — 접촉 금지).

## 6. 불변 조건
- px 스크롤 모델·자유 드래그(스냅 없음)·플릭 관성·키보드 내비·클릭 존 이동·모프 시퀀스·카운터·정보 슬라이드 타이밍 — 변경 금지.
- `goToSlide` 중앙 정렬 산식·maxScroll 이중 클램프 산식 변경 금지.
- 다른 파일 접촉 금지.

## 7. 검증
- `npx tsc --noEmit`만.
- 배포 후 확인 6항 (하드 리프레시로 캐시 비우고 시작):
  1. 1장 프로젝트 → 다장 프로젝트 최초 진입(미캐시)에서 우측 화살표 즉시 표시.
  2. 화살표 클릭마다 대상 슬라이드 중심 = 뷰포트 중심 정확 스냅 — 진입 직후 연타 포함.
  3. 광폭 마지막 슬라이드의 우측 에지 + 24px까지 도달.
  4. 다이어그램 글리프가 흰 화면에서 검정으로 또렷 (내부 진행 기능 회귀 없음).
  5. 트랙 등장 시 이미지 빈 프레임·레이아웃 밀림 없음.
  6. 창 리사이즈 시 현재 슬라이드가 중앙 유지.
