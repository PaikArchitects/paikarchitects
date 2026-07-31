# 그리드 모드 콘텐츠 영역 신설 명세 (GRID_CONTENT_AREA_SPEC)

> 그리드 뷰(`/work-grid`)에서 카드 클릭 → **일체화 SPA morph**로 프로젝트 상세를 여는
> 그리드 전용 콘텐츠 영역을 신설한다. 링월의 `ContentArea.tsx`는 **절대 무수정**,
> 신규 `GridContentArea.tsx`로 완전 복제하되 진입 rect·중앙 정렬·역-morph만 새로 정의한다.

---

## 0. 감사 확정 사실 (실측, 추정 아님)

- **현재 그리드 카드는 SPA morph가 아니라 딥링크다.** `GridExperience.tsx` L591–593:
  `<Link href={/work/${project.id}}>`. 클릭 시 `/work/[slug]`로 페이지 전환된다.
  → 이번 작업의 실체 = 이 Link를 걷어내고 그리드 내부에 콘텐츠 오버레이를 얹는 것.
- **링월 morph 진입 rect = 루트 전체**(`ContentArea.tsx` L692: `{top:0,left:0,width:rw,height:rh}`).
  **도착 rect**(L698–703): `left = TRACK_INSET(24) + INFO_SLIDE_W(240) + SLIDE_GAP_PX(24) = 288`,
  `height = rh × SLIDE_H_RATIO(0.72)`, `width = height × aspect`, `top = (rh-th)/2`.
- **카드 DOM은 즉시 획득 가능**: `cardEls.current: Map<key, HTMLElement>` (L253, L597–600).
  클릭 시 `getBoundingClientRect()`로 화면 좌표 캡처 → morph 시작 rect.
  카드 프레임은 항상 4:3(`.gm-frame` aspect-ratio:4/3, L464)이라 히어로(FALLBACK 4:3)와 비율 일치 → 왜곡 없는 확대.
- **넘김 4경로는 전부 `ContentArea` 로컬 상태**: scrollPos(L564)·드래그(L785–837)·
  키보드(L774–782)·플릭(L822–827)·화살표 클릭(L835–836). 복제 대상.
- **`page.tsx`는 얇은 래퍼**(무수정). 콘텐츠 상태는 전부 `GridExperience` 내부에서 관리.

---

## 1. 확정된 설계 결정 (사용자 승인)

1. **진입 궤적**: 클릭 카드 rect(현재 밀도의 실측 크기) → 히어로로 확대. **밀도 무관**, 링월과 동형.
2. **복귀**: 뒤로가기(브라우저)·ESC → 역 morph(클릭했던 카드 rect로 축소 복귀).
3. **넘김**: 4경로 전부 복제(화살표 클릭·키보드 ←→·드래그·플릭).
4. **메타 배치**: 정보 슬라이드(좌측 240px) 유지 + **전체 트랙 중앙 정렬**.
5. **렌더러**: 지금은 완전 복제, 통합은 추후 여지(링월 `ContentArea.tsx` 무수정).

---

## 2. 중앙 정렬 산식 (신규 정의 — 유일한 비-복제 지점)

링월은 트랙을 좌측 고정(`TRACK_INSET=24`, 정보 슬라이드가 좌측 상주)한다.
그리드는 트랙 전체를 뷰포트 중앙에 놓는다. **별도 원점 재정의는 불필요하다** — 링월이
이미 중앙정렬 스크롤(`centers[idx] - viewportW/2`, L669·L766)을 갖고 있으므로, **초기 진입
scrollPos만 "히어로 중앙이 뷰포트 중앙에 오는 값"으로 설정**한다.

- 링월 초기값: `setScrollPos(0)` (L679·L726) — 트랙 좌측 끝이 뷰포트 좌측에 정렬(좌측 상주).
- **그리드 초기값**: `setScrollPos(clampScroll(centers[1] - viewportW/2))`
  (히어로 = 트랙 인덱스 1). 이러면 진입 직후 히어로가 뷰포트 중앙에 온다.
- **이후 넘김**: `goToSlide`가 이미 `centers[i] - viewportW/2`로 중앙정렬하므로 넘김도 자동 중앙정렬.
- **정보 슬라이드로의 접근**: 좌측으로 밀면(scrollPos 감소) 정보 슬라이드(인덱스 0)가
  뷰포트 중앙으로 온다. 링월과 동일. `maxScroll`/`clampScroll`은 그대로 복제.

> ⚠ **주의(Safari px 원칙)**: 위 좌표는 전부 px 정수 계산이며 퍼센트 정렬을 쓰지 않는다.
> 링월 트랙의 `transform: translateX(${-scrollPos}px)`(L949) 방식을 그대로 유지한다.

---

## 3. 파일별 작업

### 3-1. `src/components/GridExperience.tsx` 수정

**목표**: 카드 딥링크 제거 → 클릭 시 콘텐츠 오버레이 열기. 콘텐츠 상태 보유.

#### (a) import 정리 — 삭제 참조지점 전수 열거
- **삭제**: `import Link from 'next/link'` (L34).
  - ⚠ `Link` 참조지점 **전 2곳**을 모두 처리해야 한다:
    - L591–629: 카드 `<Link>` → `<div>` (아래 (d)).
    - L549–563: 뷰토글 "Ring" 링크(`<Link href="/work">`). **이건 유지해야 하므로**
      `next/link`를 삭제하면 이 링크가 깨진다. → **결론: `import Link` 삭제 금지.**
      카드만 `<div>`로 바꾸고 뷰토글 Ring 링크는 `<Link>` 그대로 둔다.
  - ✅ 최종 지시: **`import Link`는 유지**. 카드 요소만 `<Link>`→`<div>` 전환.
- **추가**: `import { GridContentArea } from './GridContentArea'`
- **추가**: `import type { Project } from '@/types'` — 이미 L35에 `type Project` import 존재. 중복 추가 금지.

#### (b) 콘텐츠 상태 추가 (컴포넌트 본문 상단, 다른 useState 부근)
```
// ── 콘텐츠 오버레이 상태 ──
const [selected, setSelected] = useState<Project | null>(null)
const [contentMode, setContentMode] = useState<'idle' | 'active'>('idle')
const enterRectRef = useRef<{ top: number; left: number; width: number; height: number } | null>(null)
```
- `selected`: 열린 프로젝트. null이면 그리드만 표시.
- `contentMode`: `GridContentArea`에 넘길 morph 모드. 진입 시 idle→active로 전환해 morph 발동.
- `enterRectRef`: 클릭된 카드의 화면 좌표(morph 시작·역morph 도착 rect).

#### (c) 카드 클릭 핸들러 (컴포넌트 본문, animateTo 부근)
```
const openProject = useCallback((project: Project, el: HTMLElement) => {
  const r = el.getBoundingClientRect()
  enterRectRef.current = { top: r.top, left: r.left, width: r.width, height: r.height }
  setSelected(project)
  setContentMode('idle')
  // 브라우저 뒤로가기 = 닫기
  window.history.pushState({ gridContent: project.id }, '', `/work/${project.id}`)
  // idle→active morph 발동 (다음 프레임)
  requestAnimationFrame(() => requestAnimationFrame(() => setContentMode('active')))
}, [])

const closeProject = useCallback(() => {
  setContentMode('idle')
  // 역-morph 재생 시간 후 언마운트 (MORPH_MS + FADE 여유)
  setTimeout(() => setSelected(null), 760)
  // URL 원복 (pushState 되돌림 없이 replaceState로 그리드 URL 복원)
  if (window.location.pathname !== '/work-grid') {
    window.history.replaceState({}, '', '/work-grid')
  }
}, [])
```
> ⚠ **주의**: 위 `760`은 `MORPH_MS(700)` + 여유 60. 실제 역-morph 타이밍은 §3-2 (f)에서
> 확정하는 상수와 일치시킨다. 하드코딩 대신 `GridContentArea`에서 export한 상수 재사용을 권장하되,
> 간결성을 위해 여기서는 로컬 상수 `const CONTENT_EXIT_MS = 760`으로 두고 주석에 근거를 남긴다.

#### (d) 카드 요소 전환 (L591–629)
- `<Link key={inst.key} href={/work/${project.id}} prefetch={false} className="gm-card" ...>`
  → `<div key={inst.key} role="button" tabIndex={0} className="gm-card" ...>`
- `href`·`prefetch` 제거. `aria-label`은 유지.
- `ref` 콜백(L597–600) **그대로 유지** — `cardEls.current`가 클릭 시 rect 획득에 필수.
- 클릭 핸들러 추가:
  ```
  onClick={(e) => {
    const el = cardEls.current.get(inst.key)
    if (el) openProject(project, el)
  }}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const el = cardEls.current.get(inst.key)
      if (el) openProject(project, el)
    }
  }}
  ```
- ⚠ `.gm-card` CSS(L445–455)의 `cursor: pointer`는 유지(div에도 필요). `text-decoration:none`·
  `color:inherit`은 div엔 불필요하나 무해하므로 그대로 둔다(삭제 시 diff만 커짐).

#### (e) popstate 핸들러 (브라우저 뒤로가기 → 닫기)
```
useEffect(() => {
  const onPop = () => { if (selected) closeProject() }
  window.addEventListener('popstate', onPop)
  return () => window.removeEventListener('popstate', onPop)
}, [selected, closeProject])
```

#### (f) 오버레이 렌더 (return 문 최상위, 그리드 컨테이너와 형제로)
- 최상위 래퍼(L427의 `<div style={{ ...minHeight:'100vh' ... }}>`) **내부 최하단**에,
  density bar 다음에 조건부로:
  ```
  {selected && (
    <GridContentArea
      project={selected}
      mode={contentMode}
      enterRect={enterRectRef.current}
      onBack={closeProject}
    />
  )}
  ```
- `GridContentArea`는 `position: fixed; inset: 0; z-index: 100`으로 그리드 전체를 덮는다(§3-2).

### 3-2. `src/components/GridContentArea.tsx` 신설 (완전 복제 + 3개 개조)

**기반**: `ContentArea.tsx`를 통째로 복사한 뒤 아래 개조만 적용한다. 슬라이드 렌더러
6종(`ImageSlideView`·`DiagramSetSlideView`·`TextSlideView`·`QuoteSlideView`·`VideoSlideView`·
`CreditsSlideView`)·`SlideContent` 스위치·`rects` 계산·트랙 transform·4경로 넘김·모든
상수(INFO_SLIDE_W·SLIDE_H_RATIO·MORPH_MS 등)를 **그대로 복제**한다.

#### 복제 시 필수 준수
- 슬라이드 union 6종 exhaustive switch(L530–543)를 빠짐없이 복제. 링월과 동일 데이터를 렌더.
- `getSlides` 폴백(L51–54): `slides ?? (coverImage ? [{kind:'image',src}] : [])` 그대로.
- `useFinePointer`·`BilingualText`·`sizeLabel/sizeValue/splitRole` import 그대로(공용 유틸, 무수정).

#### 개조 1 — props 확장 (morph 진입 rect 주입)
```
interface GridContentAreaProps {
  project: Project
  mode: 'idle' | 'active'
  enterRect: { top: number; left: number; width: number; height: number } | null
  onBack: () => void
}
```
- 링월의 `isBlacking`·`visible`은 **제거**(그리드는 idle 배경 커버를 안 씀 — 오버레이 진입이므로).
  - ⚠ 삭제 참조지점: `ContentArea` 원본에서 `isBlacking`은 L903–911(Blackout overlay),
    `visible`은 L867·L894(idle 커버·타이틀 opacity)에서 쓰인다. 그리드 버전에서 **idle 블록
    (L862–913) 전체를 제거**하므로 두 prop 참조도 자연 소멸한다(§개조 3 참조).

#### 개조 2 — morph 진입 rect를 카드 rect로 교체
링월 morph 시퀀스(L674–719)에서 **시작 rect만 교체**:
- 원본 L692: `setMorphRect({ top: 0, left: 0, width: rw, height: rh })` (루트 전체)
  → **교체**: `setMorphRect(enterRect ?? { top: 0, left: 0, width: rw, height: rh })`
  (카드 rect. null 폴백은 안전장치).
- 도착 rect(L698–703)는 **그대로**. 단 그리드는 트랙이 중앙 정렬이므로 히어로 left가 다르다:
  - 원본: `left: TRACK_INSET + INFO_SLIDE_W + SLIDE_GAP_PX` (= 288, 좌측 고정)
  - **그리드 도착 left**: 히어로가 뷰포트 중앙에 오는 좌표. 초기 scrollPos(§2)가
    `centers[1] - viewportW/2`이므로, 화면상 히어로 left = `TRACK_INSET + rects[1].x - scrollPos`.
    이를 morph 도착에 반영:
    ```
    const heroScreenLeft = TRACK_INSET + rects[1].x - (centers[1] - rw / 2)
    setMorphRect({ top: (rh - th)/2, left: heroScreenLeft, width: tw, height: th })
    ```
  - ⚠ morph 시퀀스는 rects·centers·viewportW가 확정된 뒤 실행돼야 한다. 원본은
    `useLayoutEffect`로 vpSize를 먼저 잡는다(L587–604). 그리드도 동일 순서 유지.
    morph rect 계산 시 `rw`는 `rootRef.current.clientWidth`, viewportW는 `vpSize.w` 사용.

> ⚠ **Safari px 원칙 재확인**: heroScreenLeft는 순수 px 계산. 트랙 transform도 px.
> 어떤 정렬도 transform 퍼센트를 쓰지 않는다.

#### 개조 3 — idle 블록 제거 + 초기 scrollPos 중앙정렬 + 역-morph
- **idle 블록 제거**: 원본 `{mode === 'idle' && (...)}` (L862–913) 전체 삭제.
  그리드는 idle 상태에서 아무것도 그리지 않는다(그리드 본체가 뒤에 있으므로). morph 레이어와
  active 트랙만 남는다.
  - ⚠ 단 `idleImgEl` ref(L554·L873)는 morph aspect 계산(L683–686)에 쓰인다. idle img를
    제거하면 aspect 소스가 사라진다. → **대체**: `project.coverImage`의 aspect를 morph 직전
    `new Image()`로 얻거나, 더 안전하게 **카드 rect의 비율(항상 4:3)을 그대로 사용**.
    카드는 4:3 고정이므로 `aspect = FALLBACK_RATIO(4/3)`로 두면 morph가 카드→히어로로 정확히
    확대된다(둘 다 4:3). **결론: aspect 계산 로직(L683–686)을 `const aspect = FALLBACK_RATIO`로
    단순화**하고 `idleImgEl` ref·참조 전부 제거(삭제 참조지점: L554 선언, L873 콜백).
- **초기 scrollPos**: 원본 L679 `setScrollPos(0)` → `setScrollPos(clampScroll(centers[1] - vpSize.w/2))`.
  - ⚠ centers는 rects 파생이고 rects는 vpSize 의존이므로, morph 발동 시점에 vpSize가 잡혀
    있어야 한다. `mode==='active'` 진입 effect(L674)는 vpSize 관찰 effect(L587) 이후 실행되도록
    의존성을 확인한다. 안전을 위해 초기 scrollPos 설정을 `vpSize.w > 0` 가드로 감싼다.
- **역-morph (복귀)**: 원본은 Back이 즉시 전환(L721–730, 역모프 없음). 그리드는 **역-morph 필요**.
  `mode`가 active→idle로 바뀔 때:
  ```
  if (mode === 'idle' && prev === 'active') {
    // 트랙 페이드아웃 + morph 레이어를 카드 rect로 축소
    setTrackIn(false)
    setInfoIn(false)
    if (enterRect && rootRef.current) {
      const rw = rootRef.current.clientWidth
      const rh = rootRef.current.clientHeight
      // 현재 히어로 화면 위치에서 시작 → 카드 rect로 축소
      const th = rh * SLIDE_H_RATIO
      const tw = th * FALLBACK_RATIO
      const heroScreenLeft = TRACK_INSET + rects[1].x - scrollPos
      setMorphVisible(true)
      setMorphRect({ top: (rh-th)/2, left: heroScreenLeft, width: tw, height: th })
      requestAnimationFrame(() => requestAnimationFrame(() => {
        setMorphRect(enterRect)   // 카드 rect로 축소
      }))
      setTimeout(() => { setMorphVisible(false); setMorphRect(null) }, MORPH_MS + 60)
    }
  }
  ```
  - ⚠ 이 분기는 원본 L721(`if (mode === 'idle')`)을 **대체**한다. 원본의 즉시 리셋
    (setMorphing(false) 등)은 역-morph와 충돌하므로, idle 진입 시 morphRect를 즉시 null로
    비우지 않도록 재작성한다.
  - `GridExperience`의 `closeProject`가 `setContentMode('idle')` 후 760ms에 언마운트하므로,
    역-morph(700ms+60)가 언마운트 전에 완료된다.

#### 개조 4 — ESC 키로 닫기
active 중 ESC → onBack:
```
useEffect(() => {
  if (mode !== 'active') return
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onBack() }
  window.addEventListener('keydown', onKey)
  return () => window.removeEventListener('keydown', onKey)
}, [mode, onBack])
```
- ⚠ 화살표 키 핸들러(L774–782)와 별도 effect로 둔다(충돌 없음).

#### 개조 5 — 루트 컨테이너 fixed 오버레이화
원본 루트(L850–860)는 `flex:1`(링월 레이아웃 자식). 그리드는 전체 화면 오버레이:
```
<div ref={rootRef} style={{
  position: 'fixed', inset: 0, zIndex: 100,
  height: '100%', overflow: 'hidden',
  background: mode === 'active' ? '#FFFFFF' : 'transparent',
  transition: 'background-color 0.3s ease-out',
}}>
```
- `flex:1; minWidth:0` 제거(오버레이라 불필요). `background`는 active에서 흰색(링월과 동일),
  idle(진입 전/역모프 중)에서 transparent(뒤 그리드가 비쳐야 morph가 자연스러움).
  - ⚠ 단 morph 진입 순간 배경이 흰색으로 바뀌면 뒤 그리드가 가려진다. morph가 카드에서
    시작하므로, **background를 morph 완료 후에 흰색으로 전환**하는 편이 자연스럽다. 실물
    확인 필요 — 1차는 `mode==='active'`에서 흰색으로 두고, 어색하면 morphing 종료(setMorphing
    false) 시점으로 늦춘다.

---

## 4. 데이터·정렬 (기존 확정, 변경 없음)
- `projects`는 `getProjects()`가 careerNo desc로 전달. `GridContentArea`는 단일 project만 받으므로
  정렬 무관.
- 슬라이드 union 6종·`sanityThumb`·`coverHotspot` 등 기존 파이프라인 그대로.

---

## 5. 검증
- **`npx tsc --noEmit`만 실행.** `npm run dev`·`npm run build` 금지.
- 타입 체크로 잡히는 것: props 시그니처 불일치, 삭제한 `isBlacking`/`visible` 잔존 참조,
  `idleImgEl` 잔존 참조.
- 타입 체크로 **안 잡히는 것**(별도 확인 필요): `centers[1]` 인덱스 접근이 슬라이드 0개
  프로젝트에서 undefined일 수 있음 → §6 엣지 케이스.

---

## 6. 엣지 케이스·주의
- **슬라이드 0개 프로젝트**: `getSlides` 폴백으로 최소 1개(cover image)는 보장되나, cover도
  없으면 `rects`가 정보슬라이드+폴백블록 2개다. `centers[1]`은 폴백 블록 → morph 도착이
  폴백 블록 위치. 정상 동작. `centers[1]`이 항상 존재함을 `rects.length >= 2` 가드로 확인.
- **enterRect null**: 안전 폴백으로 루트 전체 rect 사용(morph가 풀블리드에서 시작 — 링월 동형).
- **연속 클릭**: morph 중 다른 카드 클릭 방지. `selected != null`이면 `openProject` 무시하거나,
  `GridContentArea`가 오버레이로 카드 클릭을 가리므로 자연 차단됨(fixed z-index 100).
- **Safari transform 퍼센트 금지**: 모든 morph rect·트랙 translate는 px. 재확인 완료.
- **기존 파일 무수정 확인**: `ContentArea.tsx`·`LandingExperience.tsx`·`useRingWall.ts`·
  `page.tsx`(work-grid) diff 0. 수정 대상은 `GridExperience.tsx` + 신규 `GridContentArea.tsx` 뿐.

---

## 7. 착수 후 확인(배포·스크린샷)
1. 카드 클릭 → 카드에서 히어로로 확대되는 morph(밀도 무관).
2. 진입 후 히어로가 화면 중앙(정보 슬라이드는 좌측으로 밀면 보임).
3. 4경로 넘김 동작(화살표·키보드·드래그·플릭).
4. ESC·뒤로가기 → 카드 rect로 축소 복귀.
5. 링월(`/work`) 회귀 없음(무수정 확인).
