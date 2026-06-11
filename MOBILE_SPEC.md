# MOBILE_SPEC.md
## 모바일 환경 대응 — 바텀 시트 탐색 + 트랙 모델 축소 이식

> 기준: 2026.06.12 / BIG(big.dk) 모바일 영상 분석 결과 반영
> 선행 조건: HEADER_INFO_SPEC 실행·검증 완료 상태의 코드베이스
> 검증: 모든 수정 후 `npx tsc --noEmit` 만 실행. `npm run dev`/`npm run build` 금지.

---

## 0. 설계 원칙 (구현 판단의 기준)

1. **판별 기준의 이원화**
   - **레이아웃 전환**(시트/트랙 치수)은 뷰포트 폭 기준: `window.innerWidth < 768` (기존 `mobile` state 재사용).
   - **커서 치환 화살표 on/off**는 입력 방식 기준: `matchMedia('(hover: hover) and (pointer: fine)')`.
   - 두 기준을 혼용하지 않는다. 터치 노트북 = 데스크톱 레이아웃 + 글리프 유지, 태블릿 가로 = 넓은 레이아웃이라도 글리프 없이 스와이프.

2. **트랙 문법의 축소 이식 (BIG 방식)**
   - 모바일 전용 문법을 발명하지 않는다. 연속 픽셀 트랙·높이 통일·비율 폭·정보 슬라이드를 그대로 쓰되 치수만 낮춘다.
   - 정보(메타)는 별도 접이식 UI가 아니라 **기존 정보 슬라이드를 그대로 재사용**한다.

3. **무크롭 원칙**
   - 트랙 내 이미지는 크롭하지 않는다 (기존 height 고정 + width auto 유지). 세로 화면에서 작아지는 것을 감수하고 구도의 완결성을 지킨다.
   - Idle 풀스크린 셔플의 크롭은 분위기 레이어로 허용 (`objectFit: cover` 유지). 이미지별 초점 지정은 Sanity hotspot 단계로 이연.

4. **화살표 부재의 보완 = peek 어포던스**
   - 모바일 트랙 진입 시 다음 슬라이드 가장자리가 항상 화면 우측에 걸쳐 보이도록 치수를 설정한다. 이것이 스와이프 가능성을 알리는 유일한 단서다.

---

## 1. 수정/신규 파일

| 파일 | 작업 |
|---|---|
| `src/components/MobileProjectSheet.tsx` | **신규** — 바텀 시트 (필터 칩 + 카드 리스트) |
| `src/components/LandingExperience.tsx` | 수정 — sheetOpen 상태, 핸들 버튼, 모바일 분기, URL 매핑 |
| `src/components/ContentArea.tsx` | 수정 — 모바일 Active 레이아웃, 터치 동작, fine-pointer 게이팅 |
| `src/hooks/useFinePointer.ts` | **신규** — 입력 방식 판별 훅 |

다른 파일(ProjectWall, 데이터, 타입)은 건드리지 않는다.

---

## 2. useFinePointer 훅 (신규)

```
src/hooks/useFinePointer.ts
```

- `'use client'`.
- `matchMedia('(hover: hover) and (pointer: fine)')`의 현재값을 state로 반환.
- `change` 이벤트 구독/해제. SSR 안전: 초기값 `false`, 마운트 후 동기화 (`useEffect`).
- 시그니처: `export function useFinePointer(): boolean`

---

## 3. MobileProjectSheet (신규 컴포넌트)

### 3-A. Props

```ts
interface MobileProjectSheetProps {
  open: boolean
  projects: Project[]            // filteredProjects
  filterTypes: string[]          // FILTER_TYPES
  activeFilter: string
  onFilter: (t: string) => void
  onSelect: (p: Project) => void
  onClose: () => void
}
```

### 3-B. 구조와 치수

```
[스크림]  inset 0, rgba(8,7,6,0.35), 탭 → onClose
[시트]    position fixed, left/right 0, bottom 0, height 72vh
          background #FFFFFF, borderRadius 0 (디자인 시스템: 직각 유지)
          transform: translateY(open ? 0% : 100%)
          transition: transform 450ms cubic-bezier(0.7,0,0.3,1)
  ├─ [핸들 행]  height 40, 중앙에 32×2px #080706 바 (탭 → onClose)
  ├─ [필터 칩 행]  height 36, overflow-x auto(스크롤바 숨김), padding 0 20
  │     칩: 텍스트 버튼, fontSize 11, uppercase, letterSpacing 0.08em,
  │     선택 시 ● 불릿(7px) + fontWeight 500, 비선택 300 — 데스크톱 필터와 동일 문법.
  │     가로 간격 24. 필터 변경 시 시트는 열린 채 리스트만 교체.
  └─ [카드 리스트]  flex column, overflow-y auto, padding 8px 20px 40px, gap 28
        카드:
          [이미지]  width 100%, aspectRatio 2/1, objectFit cover
                    (coverImage 없으면 coverColor 블록)
          [텍스트 행]  marginTop 10:
            제목  fontSize 13, fontWeight 450, color #080706
            타입  fontSize 11, fontWeight 300, uppercase,
                  letterSpacing 0.08em, opacity 0.6, marginTop 3
        카드 탭 → onSelect(project)
```

- 시트가 닫혀 있을 때(`open === false`)도 컴포넌트는 마운트 유지(translateY 100%) — 재오픈 시 스크롤 위치 보존.
- 스크림은 `open`일 때만 렌더(또는 opacity 0 + pointerEvents none).
- 리스트 데이터는 `filteredProjects`를 그대로 받으므로 필터 애니메이션은 단순 교체로 충분 (데스크톱 월의 퇴장/캐스케이드 이식하지 않음 — 모바일 과잉).

---

## 4. LandingExperience 수정

### 4-A. 상태 추가

```ts
const [sheetOpen, setSheetOpen] = useState(false)
```

### 4-B. 모바일 렌더 분기

- 기존: `!mobile && <ProjectWall …>` — 유지.
- 추가: `mobile`일 때
  1. **핸들 버튼** — Idle에서만 노출 (`!activeProject && introPhase === 'done' && !sheetOpen`):
     ```
     position absolute, bottom 28, left 50%, translateX(-50%)
     텍스트 'PROJECTS', fontSize 11, fontWeight 300, uppercase,
     letterSpacing 0.12em, color #FFFFFF,
     textShadow 0 0 12px rgba(0,0,0,0.45) (어두운 사진 위 대비)
     zIndex 40, 탭 → setSheetOpen(true) + pushState '/work'
     ```
  2. **`<MobileProjectSheet>`** — zIndex 60, 위 props 연결.
- **헤더 필터 바**: 모바일에서는 숨김 — opacity 조건을 `showFilters && !mobile`로 변경 (필터는 시트 칩이 전담).

### 4-C. 선택 시퀀스 (시트 → Active 모프)

```ts
const handleSelectMobile = (p: Project) => {
  setHoveredProject(p)        // displayProject가 즉시 p로 — 시트 뒤 풀블리드가 선택작 커버로 교체
  setSheetOpen(false)          // 시트 하강 시작
  window.setTimeout(() => {
    setActiveProject(p)        // 시트가 충분히 내려간 시점에 모프 시작
    setHoveredProject(null)
    setShowFilters(true)
    window.history.pushState({}, '', `/work/${p.id}`)
  }, 250)
}
```

- ContentArea의 기존 Idle→Active 모프가 "선택작 풀블리드 → 트랙 히어로 수축"으로 그대로 작동한다 (BIG의 제자리 수축 등가물).
- 데스크톱 `handleSelect`는 변경 없음. ContentArea/ProjectWall에 내려주는 onSelect만 mobile 분기.

### 4-D. Back / URL 매핑 (모바일)

- 모바일 상태 ↔ URL: 시트 닫힘 = `/`, 시트 열림 = `/work`, Active = `/work/[slug]`.
- `handleBack` 수정: 모바일이면 `setActiveProject(null); setSheetOpen(true); pushState('/work')` — BIG처럼 리스트로 복귀.
- 시트 닫기(`onClose`): `setSheetOpen(false)` + `pushState('/')` + `setShowFilters(false)`.
- `popstate` 핸들러에 모바일 동기화 추가: `/work` → `sheetOpen true`, `/` → `sheetOpen false`. (기존 분기 안에 `if (mobile)` 처리 — `mobile` 값은 ref로 참조해 stale closure 방지.)
- 딥링크: `initialShowFilters`(`/work` 직접 진입) && mobile → 마운트 후 `sheetOpen true`.

### 4-E. 셔플 일시정지 조건 확장

```ts
if (activeProject || hoveredProject || sheetOpen) return
```

---

## 5. ContentArea 수정

### 5-A. 상수 추가

```ts
const M_SLIDE_H_RATIO = 0.36   // 모바일 image·credits·info 높이 (콘텐츠 영역 대비)
const M_DIAGRAM_H_PCT = '24%'  // 모바일 diagramSet 이미지 영역 높이
const M_SLIDE_GAP_PX = 16
const M_INFO_SLIDE_W = 150
const M_TOP_STRIP_H = 56
```

- 트랙 높이를 데스크톱 72%→36%로 낮추는 것이 무크롭 원칙의 실행이다. 가로로 긴 사진이 화면 폭을 넘어 우측으로 흘러나가며 peek이 자연 발생한다.
- 적용 방식: `mobile` prop으로 삼항 선택. 매직넘버를 인라인에 흩뿌리지 말고 컴포넌트 상단에서 `const slideH = mobile ? M_SLIDE_H_RATIO : SLIDE_H_RATIO` 식으로 1회 해석 후 사용.

### 5-B. Active 레이아웃 — 좌측 컬럼 → 상단 스트립

모바일에서 좌측 고정 컬럼(200px)을 제거하고 상단 스트립으로 대체:

```
[상단 스트립]  height M_TOP_STRIP_H, padding 0 20, flex row, alignItems center, gap 16
  ← Back   (기존 버튼 스타일 동일: 11px, uppercase)
  타이틀    fontSize 14, fontWeight 500, lineHeight 1.3,
            한 줄 초과 시 2줄 허용 (wordBreak keep-all), flex 1
[트랙 뷰포트]  나머지 전체 높이, width 100%
```

- 데스크톱 분기(`!mobile`)는 현재 구조 그대로 유지. JSX는 `mode === 'active'` 블록 내에서 `mobile ? <상단 스트립 레이아웃> : <기존 좌측 컬럼 레이아웃>`으로 분기하되, 트랙 뷰포트/트랙 자식 렌더 코드는 공유한다 (중복 구현 금지).

### 5-C. 정보 슬라이드 (재사용, 치수만)

- 트랙 첫 자식 정보 슬라이드를 모바일에서도 동일하게 렌더. width만 `M_INFO_SLIDE_W`.
- 내용(location + TYPOLOGY/STATUS/YEAR 메타 스택)·타이포 동일.

### 5-D. 모프 타깃 rect (모바일)

기존 모프 계산에서 좌측 컬럼이 없으므로:

```ts
// mobile일 때
const trackAreaH = rh - M_TOP_STRIP_H
const th = trackAreaH * M_SLIDE_H_RATIO
const tw = th * aspect
target = {
  top:  M_TOP_STRIP_H + (trackAreaH - th) / 2,
  left: M_INFO_SLIDE_W + M_SLIDE_GAP_PX,
  width: tw,
  height: th,
}
```

- 데스크톱 계산식은 변경 없음.

### 5-E. 터치 입력 동작

1. **탭으로 이전/다음 이동 금지 (모바일/터치):**
   `onPointerUp`의 클릭 판정 분기에 `e.pointerType === 'mouse'` 조건 추가. 터치 탭은 아무 동작 없음 — 이동은 스와이프 전용 (BIG 동일).
2. **플릭(관성) 추가:**
   - `onPointerMove`에서 마지막 두 샘플로 속도 추정: `v = (x_now − x_prev) / (t_now − t_prev)` (px/ms).
   - `onPointerUp`에서 `moved && |v| > 0.4`이면:
     `setAnimated(true); setScrollPos(clampScroll(scrollPos − v * 280))`
   - 계수 280(ms 환산 거리)은 상수로 선언. 기존 transition(600ms EASE)을 그대로 타므로 별도 애니메이션 루프 불필요.
   - fine pointer(마우스 드래그)에서도 동일 적용 — 해가 없고 코드 단일화.
3. **touchAction:** 트랙 뷰포트 기존 `pan-y` 유지 (수평 제스처는 JS가 소유, 수직은 브라우저 — 페이지가 고정 100vh이므로 부작용 없음).

### 5-F. 커서 글리프 게이팅 — `!mobile` → fine pointer

- `useFinePointer()` 훅 도입.
- 외부 글리프: `showGlyph` 조건의 `!mobile`을 `finePointer`로 교체.
- **다이어그램 내부 글리프/호버:** `DiagramSetSlideView`에 `finePointer: boolean` prop 추가 (부모에서 전달).
  - `finePointer === false`이면: cursor 글리프 렌더 안 함, `cursor` 스타일 강제 안 함, mouseenter/leave/move의 hovering 로직 무시.
  - **탭 동작은 유지**: nearCenter(active)일 때 좌/우 반 탭으로 서브슬라이드 이동 (`onClick` 기존 로직 그대로 — 터치에서도 click 이벤트 발생). 자동진행(3s)도 기존 nearCenter 게이팅 그대로.
- 카운터·캡션은 입력 방식과 무관하게 동일 노출.

### 5-G. 캡션 (모바일 가독)

- 모바일에서 캡션/다이어그램 캡션의 `whiteSpace: 'nowrap'` 해제 → `normal`, `padding 0 16px`, 최대 2줄. (트랙 높이 36% + 캡션 하단 외부 배치로 공간은 충분.)

---

## 6. 명시적 비변경 항목 (스코프 가드)

- 전역 헤더(모노그램/내비) 구조 — 이번 스펙에서 손대지 않는다.
- ProjectWall — 변경 없음 (모바일에서 기존대로 미렌더).
- 데이터 파일(projects.ts / projectSlides.ts), 타입 — 변경 없음.
- 데스크톱 동작 일체 — 회귀 없어야 함.
- Idle 셔플 타이밍/암전 — 변경 없음 (일시정지 조건만 확장).

---

## 7. 검증 체크리스트 (배포 후 화면 녹화 기준)

**모바일 (실기기 세로):**
1. Idle: 풀스크린 셔플 + 좌하단 프로젝트명 + 하단 PROJECTS 핸들. 헤더 필터 바 미노출.
2. 핸들 탭 → 시트 상승(450ms), 셔플 정지, URL `/work`. 필터 칩 가로 스크롤 작동, 칩 선택 시 ● 불릿 + 리스트 교체, 시트 유지.
3. 카드 탭 → 시트 하강 → 배경이 선택작 커버로 → 커버가 트랙 히어로로 수축 모프 → 정보 슬라이드 + 히어로가 좌측부터, 다음 슬라이드 우측 peek. URL `/work/[slug]`.
4. 스와이프: 자유 멈춤 + 플릭 관성. 탭으로는 트랙이 움직이지 않음. 화살표/글리프 어디에도 없음.
5. 다이어그램: 중앙 근접 시 자동진행 + 좌/우 반 탭으로 서브슬라이드 이동, 캡션 줄바꿈 정상.
6. ← Back → 시트가 열린 리스트로 복귀 (`/work`). 시트 스크림 탭 → Idle 복귀 (`/`).
7. 브라우저 뒤로가기: `/work/[slug]` → `/work`(시트 열림) → `/`(Idle) 순 복원.
8. 가로로 긴 이미지가 크롭 없이 온전한 비율로 표시되는지 (작아지더라도).
9. `/work/[slug]` URL 직접 진입 시 Active 정상 표시.

**데스크톱 회귀:**
10. 월/필터/트랙/글리프/모프 기존 동작 전부 동일.
11. 터치스크린 노트북(가능 시): 데스크톱 레이아웃 + 마우스 글리프 정상, 터치 스와이프도 작동.

**공통:** `npx tsc --noEmit` 무에러.
