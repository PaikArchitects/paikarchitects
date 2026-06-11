# WORK_FILTER_SPEC — WORK 페이지 통합 + 용도별 필터링

## 전제
CONTENT_FLOW_SPEC 반영 완료 상태에서 실행한다.

## 범위
1. 헤더 내비 가운데 정렬
2. 필터 바 (헤더 하단, 가운데 정렬, 불릿 표시)
3. WORK 라우트 통합 (구 /work 목록·구 상세 페이지 폐기)
4. 필터링 시 프로젝트 월 퇴장/입장 애니메이션

수정 파일: `src/components/SiteHeader.tsx`, `src/app/page.tsx`,
`src/components/ProjectWall.tsx`, `src/app/work/page.tsx`, `src/app/work/[slug]/page.tsx`
검증: `npx tsc --noEmit`

---

## 1. 헤더 내비 가운데 정렬 (SiteHeader.tsx)

```typescript
// nav 스타일: BEFORE
position: 'fixed', top: 24, right: 24,
// AFTER — 헤더 존(64px) 내 수평 중앙
position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)',
```
모노그램(좌상단)은 그대로 둔다.

## 2. 필터 바 (page.tsx 내 신규 렌더)

### 2-A. 데이터
```typescript
const FILTER_TYPES = ['All', ...Array.from(new Set(sortedProjects.map(p => p.type)))]
const [activeFilter, setActiveFilter] = useState<string>('All')
const [showFilters, setShowFilters] = useState(initialShowFilters)  // 3절 참조
const filteredProjects = activeFilter === 'All'
  ? sortedProjects
  : sortedProjects.filter(p => p.type === activeFilter)
```

### 2-B. 렌더 — 헤더 존 바로 아래, 가운데 정렬
```tsx
{/* 루트 컨테이너 직속, MAIN 위에 */}
<div style={{
  position: 'absolute', top: 64, left: 0, right: 0, height: 40,
  display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 28,
  opacity: showFilters ? 1 : 0,
  pointerEvents: showFilters ? 'auto' : 'none',
  transition: 'opacity 300ms ease-out',
  zIndex: 50,
}}>
  {FILTER_TYPES.map(t => (
    <button key={t} onClick={() => handleFilter(t)} style={{
      background: 'none', border: 'none', cursor: 'pointer',
      fontFamily: FONT, fontSize: 11, fontWeight: t === activeFilter ? 500 : 300,
      letterSpacing: '0.08em', textTransform: 'uppercase', color: '#080706',
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      {/* 불릿 — 선택된 항목 앞에만 */}
      <span style={{ fontSize: 7, lineHeight: 1, opacity: t === activeFilter ? 1 : 0,
                     transition: 'opacity 200ms' }}>●</span>
      {t}
    </button>
  ))}
</div>
```

### 2-C. 표시 조건 + 레이아웃 시프트
- `showFilters`가 true가 되는 경우: (a) `/work` 경로로 진입, (b) 프로젝트가 active로 열림
- 랜딩(`/`) idle 상태에서는 숨김
- showFilters true일 때 MAIN 컨테이너 `top: 64 → 104` (`transition: top 300ms ease-out`)

```typescript
// active 진입 시
const handleSelect = (p: Project) => {
  ...기존 로직...
  setShowFilters(true)
}
```

### 2-D. 필터 클릭 핸들러
```typescript
const handleFilter = (t: string) => {
  if (t === activeFilter) return
  setActiveFilter(t)
  // active 프로젝트가 열려 있으면 닫고 필터 브라우징 상태로 복귀
  if (activeProject) {
    setActiveProject(null)
    window.history.pushState({}, '', '/work')
  }
}
```
- ProjectWall에는 `filteredProjects` 전달
- 셔플 큐도 filteredProjects 기준으로 재생성 (activeFilter 변경 시
  `setShuffleQueue(shuffle(filteredProjects)); setShuffleIdx(0)`)
- filteredProjects가 변할 때 hoveredProject가 목록 밖이면 null 처리

## 3. WORK 라우트 통합

### 3-A. HomePage 컴포넌트 추출
`page.tsx`의 HomePage 본체를 `src/components/LandingExperience.tsx`로 이동하고
props를 받게 한다:
```typescript
interface LandingExperienceProps {
  initialSlug?: string        // /work/[slug] 딥링크
  initialShowFilters?: boolean
}
```
- `initialSlug`가 있으면 마운트 시 해당 프로젝트를 activeProject로 설정 + showFilters true
- `src/app/page.tsx` → `<LandingExperience />`만 렌더

### 3-B. 라우트 교체
- `src/app/work/page.tsx` → 기존 목록 UI 전부 삭제,
  `<LandingExperience initialShowFilters />` 렌더
- `src/app/work/[slug]/page.tsx` → 기존 상세 UI 전부 삭제,
  `<LandingExperience initialSlug={params.slug} />` 렌더
  (slug 유효성: sortedProjects에 없으면 initialSlug 무시)
- 구 목록/상세 전용 컴포넌트 중 더 이상 import되지 않는 파일은 삭제
- Back 동작: showFilters 상태에서 닫으면 pushState '/work', 아니면 '/'
- 인트로 스킵 로직(pathname !== '/')은 /work 계열에서 기존대로 스킵 유지

## 4. 필터링 월 애니메이션 (ProjectWall.tsx)

BIG 방식: 전체 카드가 위로 사라진 뒤, 필터된 목록이 위→아래로 다시 펼쳐진다.

- ProjectWall이 projects prop 변경을 감지하면 2단계 시퀀스 실행:

```typescript
const [displayList, setDisplayList] = useState(projects)
const [phase, setPhase] = useState<'idle' | 'exit'>('idle')

useEffect(() => {
  if (projects === displayList) return
  setPhase('exit')                       // 1) 퇴장: 전 카드 위로 페이드아웃
  const t = setTimeout(() => {
    setDisplayList(projects)             // 2) 목록 교체
    setPhase('idle')                     //    기존 reveal 캐스케이드로 재입장
  }, 350)
  return () => clearTimeout(t)
}, [projects])
```

- 퇴장 스타일 (phase === 'exit'일 때 카드에 적용):
  `opacity: 0, transform: translateY(-16px)`,
  `transition: opacity 250ms ease-in ${index * 15}ms, transform 250ms ease-in ${index * 15}ms`
- 재입장: 기존 revealed 캐스케이드(translateY(8px)→0, 50ms 스태거)를 재사용하되,
  displayList 교체 시 카드 컴포넌트가 리마운트되도록 key에 filter 식별자를 포함
  (`key={`${project.id}-${filterKey}`}` — filterKey는 부모에서 prop으로 전달)
- 스크롤 위치는 목록 교체 시 최상단으로 리셋

---

## 검증
```bash
npx tsc --noEmit
```
배포 후 확인:
1. 내비 가운데 정렬, /work 진입 시 필터 바 표시 + 불릿
2. 필터 클릭 → 월 퇴장/입장 애니메이션 + 셔플도 필터 반영
3. /work/orion-new-office 직접 진입 → 랜딩 Active 상태로 열림 (구 상세 페이지 소멸)
4. Active에서 Back → /work 복귀, 필터 바 유지
