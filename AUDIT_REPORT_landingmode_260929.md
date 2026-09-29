# AUDIT REPORT — Landing Mode (인트로·헤더 색·뷰 경로)
**작성일:** 2026-09-29
**범위:** 읽기 전용 감사. 코드 수정 없음. 본 파일 1개만 생성.
**대상:** 브랜치 `main` 작업 트리 (P3 ACP 복원 + instant 트랜지션 룰이 **미커밋 상태로 반영된** 트리 기준)
**표기 규칙:** 모든 인용은 `파일경로:줄번호` + 원문 발췌. 파일에서 직접 확인되지 않은 판단은 **[추정]** 으로 표기.

---

## 1. `src/components/SiteChromeContext.tsx` — 전문 (79줄)

```tsx
1	'use client'
2
3	import { createContext, useContext, useState, useLayoutEffect, useEffect, type ReactNode } from 'react'
4	import { usePathname } from 'next/navigation'
5
6	export type IntroPhase = 'wordmark' | 'collapsed' | 'done'
7
8	interface SiteChromeContextValue {
9	  introPhase: IntroPhase
10	  introSkipped: boolean
11	  wordmarkOnLight: boolean
12	  navOnLight: boolean
13	  setWordmarkOnLight: (value: boolean) => void
14	  setNavOnLight: (value: boolean) => void
15	}
16
17	const SiteChromeContext = createContext<SiteChromeContextValue>({
18	  introPhase: 'done',
19	  introSkipped: true,
20	  wordmarkOnLight: false,
21	  navOnLight: false,
22	  setWordmarkOnLight: () => {},
23	  setNavOnLight: () => {},
24	})
25
26	const INTRO_STORAGE_KEY = 'acp-intro-played'
27
28	const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect
29
30	export function SiteChromeProvider({ children }: { children: ReactNode }) {
31	  const pathname = usePathname()
32	  const [introPhase, setIntroPhase] = useState<IntroPhase>('wordmark')
33	  const [introSkipped, setIntroSkipped] = useState(false)
34	  const [wordmarkOnLight, setWordmarkOnLight] = useState(false)
35	  const [navOnLight, setNavOnLight] = useState(false)
36
37	  // 진입 시퀀스: 세션당 최초 진입이면서 랜딩(/)일 때만 1회 재생.
38	  // 그 외(다른 페이지 최초 진입, 재방문 등)에는 최종 헤더 상태를 즉시 표시.
39	  useIsomorphicLayoutEffect(() => {
40	    let played = true
41	    try {
42	      played = sessionStorage.getItem(INTRO_STORAGE_KEY) === '1'
43	    } catch {
44	      played = true
45	    }
46
47	    if (played || pathname !== '/') {
48	      try { sessionStorage.setItem(INTRO_STORAGE_KEY, '1') } catch {}
49	      setIntroPhase('done')
50	      setIntroSkipped(true)
51	      return
52	    }
53
54	    try { sessionStorage.setItem(INTRO_STORAGE_KEY, '1') } catch {}
55	    setIntroSkipped(false)
56	    setIntroPhase('wordmark')
57	    const t1 = setTimeout(() => setIntroPhase('collapsed'), 3200)
58	    const t2 = setTimeout(() => setIntroPhase('done'), 4800)
59	    return () => { clearTimeout(t1); clearTimeout(t2) }
60	    // eslint-disable-next-line react-hooks/exhaustive-deps
61	  }, [])
62
63	  return (
64	    <SiteChromeContext.Provider value={{
65	      introPhase,
66	      introSkipped,
67	      wordmarkOnLight,
68	      navOnLight,
69	      setWordmarkOnLight,
70	      setNavOnLight,
71	    }}>
72	      {children}
73	    </SiteChromeContext.Provider>
74	  )
75	}
76
77	export function useSiteChrome() {
78	  return useContext(SiteChromeContext)
79	}
```

### 1-1. 인트로 재생 조건

`SiteChromeContext.tsx:47`
```tsx
    if (played || pathname !== '/') {
```
- 재생 조건 = **`played === false` AND `pathname === '/'`** (둘 다 충족해야 재생).
- `pathname` 판정은 **정확 일치 `'/'`** 만. `/work`, `/work/[slug]`, `/work-grid`, `/work-grid/[slug]` 최초 진입은 모두 재생하지 않음.
- `played`는 `sessionStorage['acp-intro-played'] === '1'` (`:42`). 접근 실패(예외) 시 `played = true` (`:44`) → **재생하지 않음**(안전측).
- sessionStorage 기록은 재생·건너뜀 두 분기 모두에서 **판정 직후 즉시** `'1'`을 쓴다 (`:48`, `:54`). 즉 `done` 도달 시점이 아니라 인트로 **시작 시점**에 기록 → 인트로 도중 새로고침하면 다음 로드는 skip.
- effect 의존성 배열이 `[]` (`:61`) → **Provider 마운트 시 1회만** 판정. Provider는 `layout.tsx`에 있으므로 클라이언트 내비게이션(`Link`, `pushState`)으로 `/`에 돌아와도 재판정하지 않는다. `pathname`은 최초 마운트 시점 값만 사용됨.

### 1-2. introPhase 전이 타이밍

| 경로 | 전이 | 근거 |
|---|---|---|
| 재생 | `'wordmark'`(초기값 `:32`, 재설정 `:56`) → 3200ms `'collapsed'` → 4800ms `'done'` | `:57-58` |
| 건너뜀 | 초기값 `'wordmark'` → layout effect에서 즉시 `'done'` | `:49` |
| Context 기본값(Provider 밖) | `'done'` | `:18` |

- `'collapsed'`는 대입(`:57`)만 있고, **값 비교로 쓰는 곳은 코드베이스 전체 0건** (grep `introPhase` 결과 — §3 표). 소비자는 모두 `=== 'done'` / `!== 'wordmark'` 이분 판정이다.
- 결과적으로 3200–4800ms 구간은 "이동+축약 진행 중, 레이아웃 비공개" 상태로 기능한다.

### 1-3. introSkipped 결정 로직

- 초기값 `false` (`:33`). 건너뜀 분기에서 `true` (`:50`), 재생 분기에서 `false` 재확인 (`:55`).
- 결정은 **`useIsomorphicLayoutEffect`** (`:28`, `:39`) — 클라이언트는 `useLayoutEffect`로 첫 페인트 전 반영.
- **[추정]** 서버 렌더 HTML에는 초기값(`introPhase='wordmark'`, `introSkipped=false`)이 반영되므로, JS 하이드레이션 전 구간에는 모든 경로에서 워드마크가 `.instant`/`.moved` 없이(화면 중앙 풀네임, 0.3s 페이드인) 그려진다. 하이드레이션 후 layout effect가 즉시 교정한다. 네트워크가 느린 환경에서 비-랜딩 페이지 직접 진입 시 중앙 풀네임이 잠깐 보일 수 있다. (dev/build 실행 금지로 미검증)

---

## 2. `src/components/SiteHeader.tsx` — 전문 (170줄)

```tsx
1	'use client'
2
3	import Link from 'next/link'
4	import { usePathname } from 'next/navigation'
5	import { useEffect, useState } from 'react'
6	import { useSiteChrome } from './SiteChromeContext'
7
8	const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"
9
10	const NAV_ITEMS = [
11	  { label: 'ABOUT',    href: '/about'   },
12	  { label: 'WORKS',    href: '/work'    },
13	  { label: 'ESSAYS',   href: '/essays'  },
14	  { label: 'CONTACTS', href: '/contact' },
15	] as const
16
17	// 랜딩(/) 외 페이지 중 흰 배경(light) 레이아웃을 사용하는 경로
18	// /work 계열(/work, /work/[slug])은 LandingExperience 흰 셸, /work-grid 계열은 GridExperience 흰 셸
19	const STATIC_LIGHT_PATHS = new Set(['/about', '/work', '/work-grid', '/essays', '/contact'])
20
21	function isStaticLight(pathname: string): boolean {
22	  return STATIC_LIGHT_PATHS.has(pathname)
23	    || pathname.startsWith('/work/')
24	    || pathname.startsWith('/work-grid/')
25	    || pathname.startsWith('/essays/')   // 260929 P2 승인 — 에세이 상세 흰 배경
26	}
27
28	export function SiteHeader() {
29	  const pathname = usePathname()
30	  const {
31	    introPhase,
32	    introSkipped,
33	    wordmarkOnLight: dynamicWordmarkOnLight,
34	    navOnLight: dynamicNavOnLight,
35	  } = useSiteChrome()
36
37	  const isLanding = pathname === '/'
38	  const wordmarkOnLight = isLanding ? dynamicWordmarkOnLight : isStaticLight(pathname)
39	  const navOnLight = isLanding ? dynamicNavOnLight : isStaticLight(pathname)
40
41	  const layoutVisible = introPhase === 'done'
42	  const wordmarkMoved = introPhase !== 'wordmark'
43
44	  // ── 모바일 햄버거 메뉴 — 전역 크롬이므로 SiteHeader 소유 (§8). 라우트 변경 시 자동 닫힘 ──
45	  const [menuOpen, setMenuOpen] = useState(false)
46	  useEffect(() => {
47	    setMenuOpen(false)
48	  }, [pathname])
49
50	  return (
51	    <>
52	      {/* ── 모바일 전용 불투명 헤더 바(56px) — 콘텐츠의 헤더 존 침범을 구조적으로 차단.
53	           데스크톱에서는 display:none (globals.css) ── */}
54	      <div className="mobile-header-bar" aria-hidden="true" />
55
56	      {/* ── ACP WORDMARK — "Architect Chang-hyun Paik" → 인트로 종료 시 ACP로 축약. 홈 링크 ── */}
57	      <Link
58	        href="/"
59	        aria-label="Architect Chang-hyun Paik — Home"
60	        className={[
61	          'wordmark-intro',
62	          wordmarkMoved ? 'collapsed moved' : '',
63	          wordmarkOnLight ? 'on-light' : '',
64	          introSkipped ? 'instant' : '',
65	          !isLanding ? 'no-color-transition' : '',
66	        ].filter(Boolean).join(' ')}
67	      >
68	        <span className="word" style={{ fontWeight: 900 }}>
69	          <span className="initial">A</span>
70	          <span className="rest">rchitect</span>
71	        </span>
72	        <span className="spacer">&nbsp;</span>
73	        <span className="word" style={{ fontWeight: 500 }}>
74	          <span className="initial">C</span>
75	          <span className="rest">hang-hyun</span>
76	        </span>
77	        <span className="spacer">&nbsp;</span>
78	        <span className="word" style={{ fontWeight: 100 }}>
79	          <span className="initial">P</span>
80	          <span className="rest">aik</span>
81	        </span>
82	      </Link>
83
84	      {/* ── NAVIGATION — 데스크톱: 헤더 존 수평 중앙 / 모바일: 56px 바 내 우측 정렬 (globals.css) ── */}
85	      <nav
86	        className="site-nav"
87	        style={{
88	          opacity: layoutVisible ? 1 : 0,
89	          pointerEvents: layoutVisible ? 'auto' : 'none',
90	        }}
91	      >
92	        {NAV_ITEMS.map(({ label, href }) => {
93	          const current = pathname === href || (href === '/work' && pathname.startsWith('/work'))
94	          return (
95	            <Link
96	              key={label}
97	              href={href}
98	              className={current ? 'site-nav-link is-current' : 'site-nav-link'}
99	              style={{ color: navOnLight ? '#0a0908' : '#ffffff' }}
100	            >
101	              {label}
102	            </Link>
103	          )
104	        })}
105	      </nav>
106
107	      {/* ── MOBILE HAMBURGER — <768px 전용 (globals.css가 표시 제어).
108	           SVG 통일 기하: viewBox 0 0 18 14, 선 중심 y=1/7/13 (중심 간격 6px 정수 — 균질 렌더) ── */}
109	      <button
110	        className="mobile-menu-btn"
111	        aria-label="Menu"
112	        onClick={() => setMenuOpen(o => !o)}
113	        style={{
114	          color: '#080706',
115	          opacity: layoutVisible ? 1 : 0,
116	          pointerEvents: layoutVisible ? 'auto' : 'none',
117	        }}
118	      >
119	        <svg
120	          viewBox="0 0 18 14"
121	          width={18}
122	          height={14}
123	          style={{ display: 'block' }}
124	          stroke="currentColor"
125	          strokeWidth={1.5}
126	          strokeLinecap="butt"
127	        >
128	          <line x1="0" y1="1" x2="18" y2="1" />
129	          <line x1="0" y1="7" x2="18" y2="7" />
130	          <line x1="0" y1="13" x2="18" y2="13" />
131	        </svg>
132	      </button>
133
134	      {/* 스크림 — 탭 시 닫힘 */}
135	      <div
136	        className={menuOpen ? 'mobile-menu-scrim open' : 'mobile-menu-scrim'}
137	        onClick={() => setMenuOpen(false)}
138	        aria-hidden="true"
139	      />
140
141	      {/* 좌측 메뉴 패널 — 필터 패널의 미러 (§8-2) */}
142	      <nav className={menuOpen ? 'mobile-menu-panel open' : 'mobile-menu-panel'}>
143	        {NAV_ITEMS.map(({ label, href }) => {
144	          const current = pathname === href || (href === '/work' && pathname.startsWith('/work'))
145	          return (
146	            <Link
147	              key={label}
148	              href={href}
149	              onClick={() => setMenuOpen(false)}
150	              className={current ? 'mobile-menu-link is-current' : 'mobile-menu-link'}
151	              style={{
152	                display: 'block',
153	                padding: '14px 0',
154	                fontFamily: FONT,
155	                fontSize: 13,
156	                fontWeight: current ? 500 : 300,
157	                letterSpacing: '0.08em',
158	                textTransform: 'uppercase',
159	                textDecoration: 'none',
160	                color: '#0a0908',
161	              }}
162	            >
163	              <span className="mobile-menu-label">{label}</span>
164	            </Link>
165	          )
166	        })}
167	      </nav>
168	    </>
169	  )
170	}
```

### 2-1. 결정 로직 요약

| 값 | 결정식 | 근거 |
|---|---|---|
| `isLanding` | `pathname === '/'` (정확 일치) | `:37` |
| `wordmarkOnLight` | 랜딩: Context 동적값 / 그 외: `isStaticLight(pathname)` | `:38` |
| `navOnLight` | 랜딩: Context 동적값 / 그 외: `isStaticLight(pathname)` | `:39` |
| `layoutVisible` | `introPhase === 'done'` | `:41` |
| `wordmarkMoved` (→ `'collapsed moved'`) | `introPhase !== 'wordmark'` | `:42`, `:62` |
| `no-color-transition` 클래스 | `!isLanding` | `:65` |

- `STATIC_LIGHT_PATHS` (`:19`): `'/about'`, `'/work'`, `'/work-grid'`, `'/essays'`, `'/contact'` — 정확 일치.
  prefix 일치 (`:23-25`): `/work/`, `/work-grid/`, `/essays/`.
- `/` 는 `STATIC_LIGHT_PATHS`에 **없음** — 랜딩의 헤더 색은 전적으로 Context 동적값(§3의 `LandingExperience` 설정)에 의존.
- `/studio` 는 어느 쪽에도 없음 → `isStaticLight = false` → 흰 워드마크·흰 nav. **[추정]** Studio 화면 위에 전역 헤더가 겹쳐 그려지는지는 `studio` 라우트 레이아웃 미검토로 미확정.

### 2-2. WORKS 링크 경로

- `NAV_ITEMS` WORKS → **`'/work'`** (`:12`). 데스크톱 nav(`:97`)·모바일 패널(`:148`) 동일.
- current 판정 (`:93`, `:144`):
  ```tsx
  const current = pathname === href || (href === '/work' && pathname.startsWith('/work'))
  ```
  `startsWith('/work')` 는 문자열 prefix이므로 `/work-grid`, `/work-grid/[slug]` 에서도 **WORKS가 current**로 표시된다(구분자 `/` 없는 prefix).
- 워드마크 홈 링크 → **`'/'`** (`:58`).

---

## 3. `src/components/LandingExperience.tsx` — 인트로·헤더 색·배경 관련 발췌

grep 패턴 `setWordmarkOnLight|setNavOnLight|useSiteChrome|introPhase|introSkipped` (대상 `src`) 전체 결과:

| 파일:줄 | 원문 |
|---|---|
| `src/components/LandingExperience.tsx:8` | `import { useSiteChrome } from '@/components/SiteChromeContext'` |
| `src/components/LandingExperience.tsx:26` | `const { introPhase, setWordmarkOnLight, setNavOnLight } = useSiteChrome()` |
| `src/components/LandingExperience.tsx:106` | `if (introPhase !== 'done') return` |
| `src/components/LandingExperience.tsx:112` | `}, [introPhase, mobile, activeProject, hoveredProject, filteredProjects, advanceShuffle])` |
| `src/components/LandingExperience.tsx:216` | `const layoutVisible = introPhase === 'done'` |
| `src/components/LandingExperience.tsx:221-223` | `setWordmarkOnLight(true)` / `setNavOnLight(true)` / deps |
| `src/components/MobileProjectWall.tsx:662` | `revealed: boolean              // layoutVisible (introPhase === 'done')` (주석) |
| `src/components/SiteChromeContext.tsx` | 정의부 (§1) |
| `src/components/SiteHeader.tsx:31,32,35,41,42,64` | 소비부 (§2) |

→ **Context 세터(`setWordmarkOnLight`/`setNavOnLight`)를 호출하는 곳은 `LandingExperience.tsx:221-222` 단 한 곳.** `false`를 대입하는 코드는 전체 0건.

### 3-1. Context 구독 — `LandingExperience.tsx:23-26`
```tsx
export function LandingExperience({ projects, initialSlug, initialShowFilters = false }: LandingExperienceProps) {
  const [mobile, setMobile] = useState(false)
  const mobileRef = useRef(false)   // popstate 등 마운트 시 1회 등록 핸들러의 stale closure 방지
  const { introPhase, setWordmarkOnLight, setNavOnLight } = useSiteChrome()
```

### 3-2. 셔플 타이머의 인트로 게이트 — `LandingExperience.tsx:104-112`
```tsx
  // 셔플 타이머 — 모바일 폐지. hover/active 중에는 일시정지
  useEffect(() => {
    if (introPhase !== 'done') return
    if (mobile) return
    if (activeProject || hoveredProject) return
    if (filteredProjects.length < 2) return
    const timer = setInterval(advanceShuffle, 6000)
    return () => clearInterval(timer)
  }, [introPhase, mobile, activeProject, hoveredProject, filteredProjects, advanceShuffle])
```

### 3-3. 헤더 색 설정 — `LandingExperience.tsx:216-223`
```tsx
  const layoutVisible = introPhase === 'done'

  // 전역 헤더(ACP 모노그램 / 내비게이션) 색상 전환 — 랜딩은 셸이 항상 흰색이므로
  // 인트로 재생 중에도 다크 워드마크여야 한다.
  useEffect(() => {
    setWordmarkOnLight(true)
    setNavOnLight(true)
  }, [setWordmarkOnLight, setNavOnLight])
```
- `useEffect`(layout effect 아님) → 첫 페인트 **이후** 실행. Context 초기값은 `false` (`SiteChromeContext.tsx:34-35`).
  **[추정]** `/` 최초 로드 첫 프레임에서 워드마크·nav가 흰색(`#FFFFFF`)으로 흰 셸 위에 그려진 뒤 다음 프레임에 다크로 전환될 수 있다. 워드마크는 `animation: wordmarkFadeIn`(opacity 0→1, 0.3s)으로 시작하므로 육안상 거의 드러나지 않을 가능성이 높으나 미검증.
- 한 번 `true`가 되면 되돌리는 코드가 없다 → 세션 내에서 Context 동적값은 사실상 상수 `true`.
- `LandingExperience`는 `/`·`/work`·`/work/[slug]` 세 라우트 모두에서 마운트되지만, `SiteHeader`가 동적값을 쓰는 것은 `isLanding`(`/`)일 때뿐이다(§2-1).

### 3-4. 레이아웃 공개 게이트 (`layoutVisible`)
- 데스크톱 컨트롤 바 `LandingExperience.tsx:244-246`: `opacity: layoutVisible ? 1 : 0`, `pointerEvents` 동일, `transition: 'opacity 400ms ease-out'`
- 모바일 컨트롤 바 `LandingExperience.tsx:270-272`: `opacity: layoutVisible && !activeProject ? 1 : 0`, `transition: 'opacity 300ms ease-out'`
- 데스크톱 메인 `LandingExperience.tsx:294-295`: `opacity: layoutVisible ? 1 : 0`, `transition: 'opacity 400ms ease-out'`

### 3-5. 배경
- 루트 컨테이너 `LandingExperience.tsx:226-233`:
  ```tsx
    <div style={{
      fontFamily: FONT,
      background: '#FFFFFF',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      position: 'relative',
    }}>
  ```
- 모바일 컨트롤 바 `LandingExperience.tsx:268`: `background: '#FFFFFF',`
- → 랜딩 셸은 **항상 흰색**. CLAUDE.md "배경 (기본) `#080706`" / "Work 섹션 배경 교번"은 현재 코드와 불일치(CLAUDE.md 미갱신 — 감사 사실로만 기록).

### 3-6. URL 전이 (랜딩 ↔ /work) — 모드 판정 참고
- `LandingExperience.tsx:114-119` (닫기):
  ```tsx
  const handleBack = useCallback(() => {
    setActiveProject(null)
    // 모바일은 수축 시 항상 /work (모바일에서 /와 /work는 동일 화면)
    // 데스크톱: 필터 브라우징 상태에서 닫으면 /work, 아니면 /
    window.history.pushState({}, '', mobileRef.current || showFilters ? '/work' : '/')
  }, [showFilters])
  ```
- `:161` `window.history.pushState({}, '', `/work/${p.id}`)` (선택), `:170` 동일(모바일), `:179` `window.history.pushState({}, '', '/work')` (필터 변경 시 닫기).
- `:132-150` popstate — `/work/` prefix → active, `/work` → 필터 표시, 그 외 → 초기화.
- **[추정]** `pushState`는 Next 라우터를 거치지 않으므로 `usePathname()` 값이 갱신되지 않을 수 있다. 그 경우 `SiteHeader`의 `isLanding`·current 판정은 최초 라우트 기준으로 남는다. Next.js 버전별 `pushState` 연동 동작을 본 감사에서 검증하지 않았으므로 미확정.

---

## 4. `src/components/GridExperience.tsx` — 인트로·introPhase·헤더 색 관련

grep 패턴 `intro|Intro|OnLight|useSiteChrome|SiteChrome` (대소문자 무시) → **0건.**

- `useSiteChrome` 미사용, `introPhase` 미참조, `setWordmarkOnLight`/`setNavOnLight` 미호출.
- 그리드 경로의 헤더 색은 전적으로 `SiteHeader.tsx:19,24` 의 정적 판정(`'/work-grid'`, `/work-grid/` prefix → light)으로 결정된다.
- 인트로 게이트 부재 → 그리드는 `layoutVisible`에 해당하는 공개 지연이 없다. (단, 그리드 경로는 `SiteChromeContext.tsx:47` 조건상 인트로 자체가 재생되지 않으므로 충돌 없음.)

참고(헤더 색과 간접 관련된 배경·헤더 오프셋 발췌):
- `GridExperience.tsx:56-57`
  ```tsx
  const HEADER_H = 80             // 전역 헤더(워드마크·nav) 존 회피 상단 여백
  const MOBILE_HEADER_H = 56      // 모바일(<1024) 전역 헤더 바 높이 — globals.css .mobile-header-bar와 동일값 (P1_2)
  ```
- `GridExperience.tsx:408-414`
  ```tsx
    <div className="gx-root" style={{
      fontFamily: FONT,
      background: '#FFFFFF',
      color: '#080706',
      minHeight: '100vh',
      paddingBottom: BAR_RESERVE,
    }}>
  ```
- `GridExperience.tsx:420-422` — `.gx-root { padding-top: ${HEADER_H}px; }` / 모바일 `${MOBILE_HEADER_H}px`
- `GridExperience.tsx:615` — 하단 DENSITY BAR `background: '#080706',` (fixed, bottom 24 — 헤더와 무관)

---

## 5. `src/components/ViewToggle.tsx` — 전문 (44줄)

```tsx
1	'use client'
2
3	// ── ViewToggle — 링월 ↔ 그리드 뷰 전환 (LANDING_SWITCH_P1 §4) ──
4	// 두 모드가 동일 컴포넌트를 쓴다. 현재 모드는 비링크 텍스트(굵게), 다른 모드는 링크(흐리게).
5	// 링크 대상은 각 모드의 인덱스 경로다. 대표 모드(landingMode) 연동은 P2에서 다룬다.
6
7	import Link from 'next/link'
8
9	const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"
10
11	export type ViewMode = 'ring' | 'grid'
12
13	const VIEWS: { mode: ViewMode; label: string; href: string }[] = [
14	  { mode: 'ring', label: 'Ring', href: '/work' },
15	  { mode: 'grid', label: 'Grid', href: '/work-grid' },
16	]
17
18	const BASE = {
19	  fontFamily: FONT,
20	  fontSize: 11,
21	  letterSpacing: '0.12em',
22	  textTransform: 'uppercase' as const,
23	  color: '#080706',
24	  textDecoration: 'none',
25	  whiteSpace: 'nowrap' as const,
26	}
27
28	export function ViewToggle({ current }: { current: ViewMode }) {
29	  return (
30	    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
31	      {VIEWS.map((v, i) => (
32	        <span key={v.mode} style={{ display: 'contents' }}>
33	          {/* 구분선 색은 명시한다 — 조상 color 상속 시 링월(흰 셸)에서 보이지 않던 결함 (260916) */}
34	          {i > 0 && <span style={{ opacity: 0.25, fontSize: 11, color: '#080706' }}>|</span>}
35	          {v.mode === current ? (
36	            <span style={{ ...BASE, fontWeight: 500 }} aria-current="page">{v.label}</span>
37	          ) : (
38	            <Link href={v.href} style={{ ...BASE, fontWeight: 300, opacity: 0.5 }}>{v.label}</Link>
39	          )}
40	        </span>
41	      ))}
42	    </div>
43	  )
44	}
```

- **Ring → `'/work'`** (`:14`), **Grid → `'/work-grid'`** (`:15`). 하드코딩 상수.
- 현재 모드는 링크가 아닌 `<span aria-current="page">` (`:36`).
- `:5` 주석 — "대표 모드(landingMode) 연동은 P2에서 다룬다" → **`landingMode` 관련 코드는 아직 없음**(주석 예고만).
- Ring 링크 대상이 `/`가 아니라 `/work` → 그리드에서 Ring으로 돌아가면 인트로·동적 헤더색 경로(`/`)가 아닌 정적 경로로 진입.

---

## 6. 라우트 페이지 현재 전문

### 6-1. `src/app/page.tsx` (12줄)
```tsx
1	import { getProjects } from '@/lib/sanity/queries'
2	import { LandingExperience } from '@/components/LandingExperience'
3	import { pageMetadata } from '@/lib/seo'
4
5	export const dynamic = 'force-static'
6
7	export const metadata = pageMetadata({ path: '/' })
8
9	export default async function HomePage() {
10	  const projects = await getProjects()
11	  return <LandingExperience projects={projects} />
12	}
```

### 6-2. `src/app/work/page.tsx` (12줄)
```tsx
1	import { getProjects } from '@/lib/sanity/queries'
2	import { LandingExperience } from '@/components/LandingExperience'
3	import { pageMetadata } from '@/lib/seo'
4
5	export const dynamic = 'force-static'
6
7	export const metadata = pageMetadata({ title: 'Works', path: '/work' })
8
9	export default async function WorkPage() {
10	  const projects = await getProjects()
11	  return <LandingExperience projects={projects} initialShowFilters />
12	}
```

### 6-3. `src/app/work-grid/page.tsx` (12줄)
```tsx
1	import { getProjects } from '@/lib/sanity/queries'
2	import { GridExperience } from '@/components/GridExperience'
3	import { pageMetadata } from '@/lib/seo'
4
5	export const dynamic = 'force-static'
6
7	export const metadata = pageMetadata({ title: 'Works', path: '/work-grid', canonical: '/work' })
8
9	export default async function WorkGridPage() {
10	  const projects = await getProjects()
11	  return <GridExperience projects={projects} />
12	}
```

**관찰:**
- `/` 와 `/work` 는 **같은 컴포넌트**(`LandingExperience`) — 차이는 `initialShowFilters` 1개(`work/page.tsx:11`).
- `/` 가 렌더할 뷰는 **하드코딩**(`page.tsx:11` → 링월). 대표 모드를 고르는 분기·설정 조회 없음.
- 세 페이지 모두 `dynamic = 'force-static'` → **[추정]** Sanity 설정값으로 `/`의 뷰를 바꾸려면 재배포 또는 revalidate 정책이 필요(현재 `revalidate` 미지정).
- canonical: `/work-grid` → `/work` (`work-grid/page.tsx:7`).

---

## 7. `sanity.config.ts` — 현재 전문 (84줄)

```ts
1	'use client'
2
3	import { defineConfig } from 'sanity'
4	import { structureTool } from 'sanity/structure'
5	import { visionTool } from '@sanity/vision'
6	import { projectId, dataset } from './sanity/env'
7	import { schemaTypes } from './sanity/schemaTypes'
8
9	// 싱글턴 — 고정 ID 문서 1개만 존재해야 한다. 신규 생성·복제·삭제 경로를 모두 막는다
10	const SINGLETON_TYPES = new Set(['about', 'contact'])
11
12	export default defineConfig({
13	  name: 'paikarchitects',
14	  title: 'Architect Chang-hyun Paik',
15	  projectId: projectId!,
16	  dataset,
17	  basePath: '/studio',
18	  plugins: [
19	    structureTool({
20	      structure: (S) =>
21	        S.list()
22	          .title('Content')
23	          .items([
24	            S.listItem()
25	              .title('ABOUT')
26	              .id('about')
27	              .child(
28	                S.document()
29	                  .schemaType('about')
30	                  .documentId('about')
31	                  .title('ABOUT')
32	              ),
33	            S.listItem()
34	              .title('CONTACT')
35	              .id('contact')
36	              .child(
37	                S.document()
38	                  .schemaType('contact')
39	                  .documentId('contact')
40	                  .title('CONTACT')
41	              ),
42	            S.divider(),
43	            S.listItem()
44	              .title('ESSAYS')
45	              .id('essays')
46	              .child(
47	                S.documentTypeList('essay')
48	                  .title('Essays')
49	                  .defaultOrdering([{ field: 'publishedAt', direction: 'desc' }])
50	              ),
51	            S.divider(),
52	            S.listItem()
53	              .title('PROJECTS — PUBLISHED')
54	              .id('projectsPublished')
55	              .child(
56	                S.documentList()
57	                  .title('Published Projects')
58	                  .filter('_type == "project" && published != false')
59	                  .defaultOrdering([{ field: 'careerNo', direction: 'desc' }])
60	              ),
61	            S.listItem()
62	              .title('PROJECTS — HIDDEN')
63	              .id('projectsHidden')
64	              .child(
65	                S.documentList()
66	                  .title('Hidden Projects')
67	                  .filter('_type == "project" && published == false')
68	                  .defaultOrdering([{ field: 'careerNo', direction: 'desc' }])
69	              ),
70	          ]),
71	    }),
72	    visionTool(),
73	  ],
74	  schema: { types: schemaTypes },
75	  document: {
76	    // 전역 "새 문서" 메뉴에서 싱글턴 템플릿 제외
77	    newDocumentOptions: (prev) => prev.filter((item) => !SINGLETON_TYPES.has(item.templateId)),
78	    // 싱글턴 문서에서 복제·삭제 액션 제거
79	    actions: (prev, { schemaType }) =>
80	      SINGLETON_TYPES.has(schemaType)
81	        ? prev.filter(({ action }) => action !== 'duplicate' && action !== 'delete')
82	        : prev,
83	  },
84	})
```

**관찰:**
- 싱글턴은 `about`, `contact` 2개 (`:10`). **`siteSettings` / `landingMode` 등 사이트 설정 싱글턴 없음.**
- 루트 목록: ABOUT → CONTACT → divider → ESSAYS → divider → PROJECTS 2개.

---

## 8. 요약 (사실)

1. **인트로 재생 = 세션 최초 + 최초 로드 경로가 정확히 `/`** (`SiteChromeContext.tsx:47`). 판정은 Provider 마운트 시 1회(`:61` deps `[]`)이며, sessionStorage 기록은 인트로 **시작 시점**(`:54`).
2. **introPhase:** `wordmark` → 3200ms `collapsed` → 4800ms `done` (`:57-58`). `'collapsed'`를 비교하는 소비자 0건.
3. **헤더 색 이원화:** `/` 만 Context 동적값(설정자는 `LandingExperience.tsx:221-222` 단 한 곳, 항상 `true`), 그 외는 `STATIC_LIGHT_PATHS` 정적 판정(`SiteHeader.tsx:19-26,37-39`).
4. **GridExperience는 SiteChrome Context와 무관** (grep 0건).
5. **WORKS → `/work`**, **Ring → `/work`**, **Grid → `/work-grid`**, 워드마크 → `/`. WORKS current 판정이 `/work-grid`에서도 참(`SiteHeader.tsx:93,144`, prefix 비교).
6. `/` 의 뷰는 `page.tsx:11`에 하드코딩(링월). `landingMode`는 `ViewToggle.tsx:5` 주석 예고만 있고 **코드·스키마 0건**. 세 페이지 모두 `force-static`.
7. **[추정] 확인 필요 3건:** (a) 하이드레이션 전 비-랜딩 경로에서 중앙 풀네임 노출 가능성(§1-3), (b) `/` 첫 프레임 흰 워드마크 가능성(§3-3), (c) `pushState` 후 `usePathname` 갱신 여부(§3-6).
