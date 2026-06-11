# WALL_TRACK_REFINE_SPEC.md
## 프로젝트 월 위계 + Active 트랙 좌측 확장 + 다이어그램 높이 분류

> 기준: 2026.06.12 / 데스크톱 스크린샷 피드백 6건 반영
> 선행 조건: HEADER_INFO_SPEC 실행·검증 완료 상태
> 후속: 본 스펙 검증 완료 후 MOBILE_SPEC 착수 (MOBILE_SPEC은 본 스펙과 정합 — §6 참조)
> 검증: 모든 수정 후 `npx tsc --noEmit` 만 실행. `npm run dev`/`npm run build` 금지.

---

## 0. 수정/신규 파일

| 파일 | 작업 |
|---|---|
| `src/types/index.ts` | `ImageSlide`에 `diagram?: boolean` 필드 추가 |
| `src/data/projectSlides.ts` | 오리온 단일 다이어그램 2장에 `diagram: true` 표기 |
| `src/components/ContentArea.tsx` | 좌측 컬럼 제거 → 오버레이, 높이 분류, 캡션 폭 제한 |
| `src/components/ProjectWall.tsx` | 3단 크기 위계, 2:1 비율, 상단 정렬, 좌측 바 제거 |

다른 파일은 건드리지 않는다.

---

## 1. ContentArea — Active 레이아웃: 좌측 고정 컬럼 제거 (피드백 ①⑤)

### 1-A. 구조 변경

현재 `mode === 'active'` 블록의 `[좌측 고정 컬럼 200px][트랙 뷰포트]` flex 구조를 폐기하고:

- **트랙 뷰포트가 콘텐츠 영역 전체 폭을 차지한다** (`width: 100%`). 슬라이드들이 좌측 끝까지 이동·통과할 수 있어야 한다.
- **Back + 타이틀은 절대 위치 오버레이로 전환:**
  ```
  position absolute, top 32, left 24, zIndex 6 (트랙 위)
  배경 없음 (투명)
  ├─ ← Back   (기존 스타일 그대로: 11px, w300, uppercase, letterSpacing 0.08em)
  └─ 타이틀    marginTop 12, fontSize 14, fontWeight 500, lineHeight 1.35
  ```
- 상수 `INFO_COL_W`는 더 이상 레이아웃에 사용하지 않는다 (삭제 또는 미참조).

### 1-B. 타이틀 한 줄 강제 (피드백 ⑤)

- 데스크톱 타이틀: `whiteSpace: 'nowrap'` — **항상 한 줄**. 줄바꿈 금지.
- 근거: 트랙이 좌측 영역까지 확장되므로, 타이틀이 2~3줄로 내려오면 통과하는 슬라이드·캡션과 간섭한다.
- (모바일은 추후 MOBILE_SPEC 실행 시 2줄까지 허용으로 반영 예정 — 본 스펙에서는 데스크톱만.)

### 1-C. 트랙 선행 여백

- scrollPos 0 상태에서 정보 슬라이드가 좌측 벽에 붙지 않도록, 트랙 선두에 **leading inset 24px**을 둔다.
- 구현: 트랙 컨테이너에 `paddingLeft: 24` (rect 측정은 `offsetLeft` 기준이므로 패딩 방식이 안전. 스페이서 div를 쓰면 자식 인덱스 공간이 어긋나므로 금지).

### 1-D. 모프 타깃 rect 갱신

- 히어로(트랙 index 1) 좌측 좌표 변경:
  ```
  기존: left = INFO_COL_W + INFO_SLIDE_W + SLIDE_GAP_PX   // 200+200+24
  변경: left = 24 + INFO_SLIDE_W + SLIDE_GAP_PX            // leading inset + 정보 슬라이드 + 갭
  ```
- top/width/height 계산은 변경 없음.

### 1-E. 정보 슬라이드

- 위치·내용·치수 변경 없음 (트랙 첫 자식 유지). 오버레이(top 32 영역)와 정보 슬라이드 상단(콘텐츠 영역 높이의 14% 지점) 사이 간격은 일반 뷰포트에서 충분하나, **검증 시 창 높이 ~650px에서 겹침 여부 확인** (체크리스트 7번).

---

## 2. 슬라이드 높이 분류: 이미지 / 다이어그램 2종 (피드백 ⑥)

### 2-A. 타입 확장 — `src/types/index.ts`

```ts
export interface ImageSlide {
  kind: 'image'
  src: string
  caption?: string
  /** true면 다이어그램으로 취급 — 트랙에서 DIAGRAM_H_PCT(48%) 높이 적용 */
  diagram?: boolean
}
```

### 2-B. ContentArea 높이 판정

트랙 자식 높이 결정을 다음 단일 함수로 통일:

```ts
const isDiagram = (s: ProjectSlide) =>
  s.kind === 'diagramSet' || (s.kind === 'image' && s.diagram === true)
// height: isDiagram(slide) ? DIAGRAM_H_PCT : `${SLIDE_H_RATIO * 100}%`
```

- 단일 다이어그램과 다이어그램 시리즈(diagramSet)가 동일 높이(48%, 수직 중앙)로 정렬되어, 하단 캡션 라인까지 수평 일치한다.

### 2-C. 데이터 표기 — `src/data/projectSlides.ts`

`orion-new-office` 슬라이드 배열에서 다음 2개 항목에 `diagram: true` 추가:

1. 캡션 `'THREE PROGRAMS — …'` 항목 (src: `…Diagram___3_Programs_1_e4g6ej.png`)
2. 캡션 `'SECTIONAL ZONING — …'` 항목 (src: `…단면조닝다이어그램-01_rqmjyk.png`)

다른 프로젝트의 슬라이드는 표기하지 않는다 (콘텐츠 레이어에서 추후 개별 판단).

---

## 3. 캡션 폭 제한 — 종속 슬라이드 너비 초과 금지 (피드백 ⑥ 후반)

대상: `ImageSlideView` 캡션 + `DiagramSetSlideView` 캡션·카운터 컨테이너 (둘 다).

- `whiteSpace: 'nowrap'` **제거** → `'normal'`. 캡션이 길면 슬라이드 폭 안에서 자연 줄바꿈.
- 컨테이너는 기존 `left: 0, right: 0` 유지 — 이것이 곧 슬라이드 폭 경계다. `textAlign: 'center'` 유지.
- `wordBreak: 'keep-all'` 추가 (한글 캡션 대비).
- 그 외 타이포(12px/캡션, 11px/카운터, marginTop 12) 변경 없음.

---

## 4. ProjectWall — 3단 크기 위계 (피드백 ②③④)

### 4-A. 썸네일 비율 (피드백 ②)

- `aspectRatio: '2.5 / 1'` → **`'2 / 1'`**.

### 4-B. 거리 기반 3단 높이 (피드백 ②)

카드 높이를 고정 124에서 **하이라이트 카드와의 리스트 거리(d)** 기반 3단으로 변경:

```ts
// displayList에서 effectiveHighlight의 index를 구해 d = |i - hi|
d === 0  → 카드 높이 150   // 선택(하이라이트)
d === 1  → 카드 높이 120   // 바로 위아래
d >= 2   → 카드 높이 96    // 그 외 전부
```

- `effectiveHighlight`가 `displayList`에 없으면(필터로 제외된 경우) 전 카드 d≥2 취급(96).
- 카드 루트에 `transition: height 400ms ease` 추가 (기존 opacity/transform transition과 병기).
- 썸네일은 `height: '100%'` + 2:1 비율이므로 자동 추종. 텍스트 블록 폭(180)·카드 간 gap(16)은 유지.
- 구현: WallCard에 `tier: 0 | 1 | 2` prop을 내려 높이를 매핑한다 (카드 내부에서 인덱스 계산 금지 — 부모가 displayList 기준으로 1회 계산).

### 4-C. 하이라이트 표현 정리 (피드백 ④)

- `borderLeft` 인디케이터 **완전 제거** (active/transparent 분기 자체 삭제).
- 강조는 **크기(4-B) + 불투명도(기존 로직 유지: active 1 / dimmed 0.3 / 기본 0.45)** 두 가지로만.

### 4-D. 텍스트 상단 정렬 (피드백 ③)

- 텍스트 블록(폭 180): `justifyContent: 'center'` → `'flex-start'`, `paddingTop: 2` (썸네일 상단 라인과 시각적 일치 보정).
- 우정렬(`alignItems: flex-end`, `textAlign: right`)은 유지.

### 4-E. 스크롤 동기화 주의

- 높이 transition(400ms)과 `scrollIntoView({block:'center'})`가 동시에 진행되면 최종 위치가 어긋날 수 있다. 기존 effect를 유지하되, **검증에서 어긋남이 보이면** scrollIntoView 호출을 `setTimeout 420ms`로 지연하는 후속 수정을 적용한다 (선제 적용하지 말 것 — 불필요할 수 있음).

---

## 5. 명시적 비변경 항목

- Idle 셔플/암전/필터 월 애니메이션 — 변경 없음 (카드 크기·비율만).
- 트랙 모델(픽셀 스크롤·드래그·글리프·중앙 게이팅·카운터) — 변경 없음.
- 정보 슬라이드 내용·폭(200) — 변경 없음.
- 헤더/필터 바 — 변경 없음.

---

## 6. MOBILE_SPEC 정합 메모 (실행 아님 — 기록용)

본 스펙으로 데스크톱도 "좌측 컬럼 없음 + 상단 오버레이" 구조가 되어 MOBILE_SPEC의 모바일 구조와 수렴한다. MOBILE_SPEC 실행 전 다음 2건이 v2로 반영될 예정:
1. 모바일 타이틀: 2줄까지 허용 (3줄 금지) — 본 스펙 1-B의 모바일 확장.
2. 모바일 다이어그램 높이(M_DIAGRAM_H_PCT)도 단일 다이어그램(`diagram: true`)에 동일 적용 — §2-B 판정 함수를 공유하므로 자동 충족.

---

## 7. 검증 체크리스트 (배포 후)

1. Active 진입: 정보 슬라이드가 좌측 24px 지점부터 시작, Back+타이틀이 좌상단 오버레이로 표시. 타이틀 아래 빈 컬럼 없음.
2. 트랙 드래그 시 슬라이드가 화면 좌측 끝까지 통과. 긴 프로젝트명(National Medical Administration Complex)도 한 줄 유지, 슬라이드와 간섭 없음.
3. 모프: 커버가 새 히어로 위치(좌측 248px 지점)로 정확히 수축 — 착지 어긋남 없음.
4. 오리온 슬라이드 2·3(THREE PROGRAMS / SECTIONAL ZONING)이 매스 시리즈와 동일한 48% 높이·동일 수평 라인으로 표시.
5. 'THREE PROGRAMS' 캡션이 해당 다이어그램 폭 안에서 줄바꿈되어 우측 슬라이드를 침범하지 않음.
6. 월: 썸네일 2:1, 하이라이트 150 / 인접 120 / 그 외 96으로 크기 위계 표시, 셔플 진행 시 크기 전환이 부드러움(400ms). 좌측 수직 바 없음. 텍스트가 썸네일과 상단 정렬.
7. 창 높이 ~650px에서 좌상단 오버레이와 정보 슬라이드 텍스트 겹침 없음.
8. 필터 전환·Idle 셔플·키보드 화살표 등 기존 동작 회귀 없음.
9. `npx tsc --noEmit` 무에러.
