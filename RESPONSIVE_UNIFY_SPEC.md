# RESPONSIVE_UNIFY_SPEC

**목적:** 태블릿(768~1439px) 전용 분기를 데스크톱으로 흡수하고, `ProjectWall`·`ContentArea`의 입력 모델을 Pointer 기반으로 통일한다. 이 스펙은 태블릿 T1·T2·T3과 모바일 M4(혼용 환경 마우스 드래그)를 동시에 해소한다.

**대상 파일**
- `src/components/LandingExperience.tsx`
- `src/components/ProjectWall.tsx`
- `src/app/globals.css`

**모바일(<768px) 코드는 이 스펙에서 일절 건드리지 않는다.** `MobileProjectWall` 및 `mobile` 분기는 현행 유지. 모바일 정렬·필터 가시성은 별도 `MOBILE_FIX_SPEC.md`에서 처리한다.

---

## 핵심 원칙 (절대 조항)

1. **데스크톱 시각·동작 동결.** 마우스 입력에 대한 hover 강조, 카드 크기 위계, 필터 바, ContentArea 드래그·글리프·플릭은 현재와 픽셀·타이밍 단위로 동일해야 한다. 이 스펙은 "마우스 동작을 보존한 채 터치를 추가"하는 것이지 재설계가 아니다.
2. **호버는 폐기하지 않는다.** hover 상태는 `pointerType === 'mouse'`인 입력에만 결속한다. 터치/펜 입력은 hover 상태를 일절 set하지 않으며, 진입 시 항상 null 가드를 둔다 (stuck hover 방지).
3. **검증은 `npx tsc --noEmit`만 사용.** `npm run dev` / `npm run build` 금지.

---

## PART A — 태블릿 분기 제거 (LandingExperience.tsx)

### A-1. tablet 상태 및 detection 제거
- `const [tablet, setTablet] = useState(false)` 라인 삭제.
- detection effect 내 `setTablet(w >= 768 && w < 1440)` 라인 삭제. `mobile`(`w < 768`) 판정만 남긴다.
- `mobileRef` 및 `setMobile(m)`는 현행 유지.

### A-2. 태블릿 전용 필터 토글 블록 제거
- `{!mobile && tablet && ( ... )}` 로 시작하는 **태블릿 전용 FILTER TOGGLE 블록 전체**(주석 `── FILTER TOGGLE — 태블릿(768~1439) 전용 ──` 이하 닫는 괄호까지)를 삭제한다.
- 이와 함께 이 블록 전용으로만 쓰이는 상태·ref를 정리한다:
  - `filterOpen` / `setFilterOpen` state
  - `filterToggleRef`
  - `filterOpen` 바깥클릭·ESC 처리 effect (`if (!filterOpen) return` 으로 시작하는 useEffect 블록 전체)
  - 위 항목들이 다른 곳에서 참조되지 않는지 확인 후 제거. 참조가 남아 있으면 삭제하지 말고 보고할 것.

### A-3. 데스크톱 필터 바 조건 변경
- 기존 `{!mobile && !tablet && ( ... )}` (데스크톱 전용 FILTER BAR) 의 조건을 `{!mobile && ( ... )}` 로 변경한다.
- 이로써 768~1439 구간도 데스크톱 필터 바(헤더 존 내 가로 1열)를 그대로 사용한다.
- 단, 이 가로 1열 필터 바는 좁은 폭에서 모든 type이 한 줄에 안 들어올 수 있다. **칩 가로 스크롤 + 화살표 어포던스**를 PART C에서 추가한다.

### A-4. 메인 렌더 분기 확인
- `{!mobile && ( <ProjectWall/> <ContentArea/> )}` 블록은 현행 유지. 태블릿이 이미 이 분기를 쓰고 있었으므로 추가 변경 없음.
- `{mobile && ( <MobileProjectWall/> )}` 블록 현행 유지.

---

## PART B — globals.css 태블릿 미디어쿼리 정리

현재 `@media (max-width: 1439px)` 블록들이 데스크톱 레이아웃을 부분 덮어써서 iPad Safari에서 헤더 침범(T1)을 유발한다. 태블릿이 데스크톱과 동일 동작이어야 하므로 이 덮어쓰기를 **재평가**한다.

### B-1. wall-card 치수 미디어쿼리
```css
@media (max-width: 1439px) {
  .wall-card-text { width: 150px; }
  .wall-card-img { max-width: calc(100% - 158px); }
}
```
- 이 축소가 좁은 폭에서 카드가 컨테이너를 넘지 않도록 하는 정당한 보정인지 확인한다.
- **유지 결정 기준:** 데스크톱 기본값(180px / calc(100% - 188px))으로 1024px·768px 폭에서 카드가 `.project-wall-scroll`(width clamp(300px,28vw,28vw)) 내부에서 가로 오버플로를 일으키는가?
  - 오버플로 발생 → 미디어쿼리 유지 (단 헤더와 무관함을 확인).
  - 오버플로 없음 → 미디어쿼리 삭제하여 데스크톱과 완전 동일화.
- 판단이 어려우면 **유지하되**, 이 블록이 헤더 영역(z-index, position, height)에 영향을 주는 속성을 일절 포함하지 않음을 확인하고 보고할 것.

### B-2. slide-img 미디어쿼리
```css
@media (max-width: 1439px) {
  .slide-img { max-width: 100%; height: auto; max-height: 100%; object-fit: contain; margin: auto; }
}
```
- 좁은 폭에서 슬라이드 이미지가 가로로 잘리지 않게 contain으로 클램프하는 보정. **기능적으로 유지**한다.
- 단, 데스크톱(≥1440)에서는 적용되지 않아야 하므로 `max-width: 1439px` 경계 유지.

### B-3. 헤더 침범(T1) 직접 원인 점검
- T1의 직접 원인은 태블릿 전용 **필터 토글 블록**(A-2에서 제거)일 가능성이 높다. 해당 블록 제거 후 iPad Safari에서 헤더 존 침범이 사라지는지가 1차 검증 포인트다.
- 만약 제거 후에도 침범이 남으면, 헤더(56px 불투명 헤더)와 ProjectWall/ContentArea의 상위 컨테이너 간 `position`/`top`/`height` 계산을 점검한다. ProjectWall 컨테이너는 `height: 100%`이므로, 부모가 헤더 높이를 제외한 영역으로 정확히 클램프되는지 확인한다. (데스크톱에서는 정상이므로, 태블릿에서만 깨진다면 미디어쿼리 또는 vh 계산 차이를 의심.)

---

## PART C — ProjectWall Pointer 통합 (T2 핵심)

`ProjectWall.tsx`의 `WallCard`가 현재 `onMouseEnter`/`onMouseLeave` 전용이라 터치에서 인터랙션이 죽는다. 이를 Pointer 기반으로 교체하되 **마우스 hover는 그대로 보존**한다.

### C-1. WallCard 입력 핸들러 교체
현재:
```tsx
onMouseEnter={() => { setHover(true); onHover(project) }}
onMouseLeave={() => { setHover(false); onHover(null) }}
onClick={() => onSelect(project)}
```
변경:
```tsx
onPointerEnter={(e) => {
  if (e.pointerType !== 'mouse') return   // 터치/펜은 hover 미발생 (stuck hover 방지)
  setHover(true)
  onHover(project)
}}
onPointerLeave={(e) => {
  if (e.pointerType !== 'mouse') return
  setHover(false)
  onHover(null)
}}
onClick={() => onSelect(project)}
```

**근거·불변식:**
- 마우스 입력에서는 `onPointerEnter`/`onPointerLeave`가 `onMouseEnter`/`onMouseLeave`와 동일 시점에 발생하므로, 데스크톱 hover 강조·`onHover` 콜백·크기 위계가 100% 동일하게 작동한다.
- 터치에서는 hover를 건너뛰고 `onClick`만 발생 → `onSelect(project)` → `activeProject` 설정. ProjectWall은 이미 `tierCenter = activeSlug ?? hoveredId ?? highlightSlug` 로 크기 위계 중심을 잡으므로, 터치 선택 시 `activeSlug` 경로로 **선택 카드가 커지는 위계가 자동 구현**된다. 추가 코드 불필요.
- `onClick`은 마우스·터치 모두에서 발생하므로 선택 동작은 양쪽 모두 동작한다.

### C-2. WallCard active 정의 확인
```tsx
const active = isHighlighted || hover
```
- 현행 유지. 터치에서 `hover`는 항상 false이고 `isHighlighted`(= `project.id === effectiveHighlight`, effectiveHighlight는 activeSlug 우선)로 강조가 들어오므로 정상.

### C-3. 컨테이너 핸들러
- `ProjectWall` 컨테이너(`handleHover`)는 변경 없음. WallCard가 `onHover`를 마우스에서만 호출하므로 자동으로 마우스 전용이 된다.

---

## PART D — 필터 칩 오버플로 어포던스 (T3, 데스크톱 필터 바)

A-3에서 데스크톱 필터 바를 768~1439에도 적용하면, 좁은 폭에서 type 칩이 한 줄을 넘는다. 가로 스크롤 + 화살표 어포던스를 추가한다.

### D-1. 필터 바 가로 스크롤화
- LandingExperience의 데스크톱 FILTER BAR 컨테이너에 가로 스크롤 허용:
  - `overflow-x: auto; overflow-y: hidden;`
  - `white-space: nowrap;` (또는 flex + `flex-shrink: 0` 칩)
  - 스크롤바 숨김 클래스 적용 (`.mpw-chips` 와 동일 패턴 재사용 가능 — `scrollbar-width: none` 등).
  - `touch-action: pan-x;` (태블릿 터치 가로 스크롤 허용)

### D-2. 화살표/페이드 어포던스
- `MobileProjectWall`의 `chipFade` 로직(좌우 `scrollLeft` 기반 오버플로 감지)을 참조 패턴으로 삼아, 데스크톱 필터 바에도 **우측(및 필요 시 좌측) 그라데이션 + 화살표 글리프**를 추가한다.
- 화살표는 정적 시각 기호(예: `›` 또는 chevron SVG)로, 스크롤이 우측에 더 있을 때만 표시. 끝까지 스크롤하면 사라진다.
- 그라데이션 폭 32px, 흰 배경(#FFFFFF)에서 투명으로. 화살표는 그라데이션 위에 중앙 배치.
- **마우스 드래그 스크롤도 지원**해야 한다 (혼용 환경). Pointer 기반 드래그-투-스크롤을 칩 바에 적용하거나, 최소한 휠 가로 스크롤(`deltaY → scrollLeft`)을 지원한다. 구현 난이도상 우선순위: ① 화살표 표시 ② 휠 가로 스크롤 ③ Pointer 드래그.

---

## 검증 체크리스트 (`npx tsc --noEmit` 통과 후 화면 검증)

데스크톱(≥1440) — **회귀 0 확인:**
- [ ] D1. 마우스 hover 시 카드 강조·크기 위계가 변경 전과 동일
- [ ] D2. 카드 클릭 시 ContentArea 진입 동일
- [ ] D3. 필터 바 외형·동작 동일 (한 줄에 다 들어오는 넓은 폭)
- [ ] D4. ContentArea 드래그·글리프·플릭 동일

태블릿(768~1439, 실기기 iPad Safari 우선):
- [ ] T1. 헤더 존이 ProjectWall/ContentArea에 침범당하지 않음
- [ ] T2. 터치로 카드 탭 시 선택·크기 위계 작동 (모바일식 위계)
- [ ] T3. 필터가 버튼다운이 아니라 데스크톱식 가로 칩 바
- [ ] T4. 필터 칩이 화면을 넘을 때 우측 화살표/그라데이션 표시, 가로 스크롤로 숨은 칩 접근 가능

혼용(서피스류 / 데스크톱 브라우저 폭 축소):
- [ ] X1. 같은 화면에서 마우스로 만지면 hover, 손가락으로 만지면 탭 선택 — 모드 전환이 입력마다 즉시
- [ ] X2. 터치 후 마지막 카드가 hover처럼 강조된 채 고착되지 않음 (stuck hover 없음)
- [ ] X3. 브라우저 폭을 1440 미만으로 줄여도 태블릿 전용 UI(토글 등)가 더 이상 나타나지 않음

---

## Claude Code 입력 프롬프트

```
RESPONSIVE_UNIFY_SPEC.md 파일을 읽고 명세대로 구현해줘.

핵심 제약:
- 데스크톱(>=1440px) 마우스 동작은 픽셀·타이밍 단위로 현재와 100% 동일해야 함. 회귀 절대 금지.
- 모바일(<768px) 코드(MobileProjectWall, mobile 분기)는 일절 건드리지 말 것.
- hover는 폐기하지 말고 pointerType==='mouse'일 때만 결속. 터치/펜은 hover 미발생 + null 가드.
- 검증은 npx tsc --noEmit 만 사용. npm run dev / npm run build 금지.
- PART B(globals.css)에서 삭제 여부가 모호한 미디어쿼리는 삭제하지 말고 유지 후 보고할 것.
- PART A-2에서 제거 대상 상태/ref가 다른 곳에서 참조되면 삭제하지 말고 보고할 것.
```
