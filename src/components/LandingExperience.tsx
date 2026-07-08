'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { sortedProjects } from '@/data/projects'
import { TYPOLOGY_ORDER, type Project, type ProjectType } from '@/types'
import { ProjectWall } from '@/components/ProjectWall'
import { ContentArea } from '@/components/ContentArea'
import { MobileProjectWall } from '@/components/MobileProjectWall'
import { useSiteChrome } from '@/components/SiteChromeContext'
import { shuffle } from '@/lib/shuffle'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"

const HEADER_H = 80   // 데스크톱 헤더 존. 필터 행 포함 여유치

const FILTER_TYPES = ['All', ...TYPOLOGY_ORDER.filter(t =>
  sortedProjects.some(p => p.type === t || p.subTypes?.includes(t))
)]

interface LandingExperienceProps {
  initialSlug?: string        // /work/[slug] 딥링크
  initialShowFilters?: boolean
}

export function LandingExperience({ initialSlug, initialShowFilters = false }: LandingExperienceProps) {
  const [mobile, setMobile] = useState(false)
  const mobileRef = useRef(false)   // popstate 등 마운트 시 1회 등록 핸들러의 stale closure 방지
  const { introPhase, setWordmarkOnLight, setNavOnLight } = useSiteChrome()

  // 딥링크: 마운트 시 해당 프로젝트를 active로 설정 (sortedProjects에 없으면 무시)
  const [activeProject, setActiveProject] = useState<Project | null>(() =>
    initialSlug ? sortedProjects.find(p => p.id === initialSlug) ?? null : null
  )
  const [showFilters, setShowFilters] = useState(
    initialShowFilters || (initialSlug ? sortedProjects.some(p => p.id === initialSlug) : false)
  )
  const [activeFilter, setActiveFilter] = useState<string>('All')

  const filteredProjects = useMemo(
    () => activeFilter === 'All' ? sortedProjects : sortedProjects.filter(p => p.type === activeFilter || p.subTypes?.includes(activeFilter as ProjectType)),
    [activeFilter]
  )
  const filteredRef = useRef(filteredProjects)

  const [shuffleQueue, setShuffleQueue] = useState<Project[]>(() => shuffle(sortedProjects))
  const [shuffleIdx, setShuffleIdx] = useState(0)
  const [isBlacking, setIsBlacking] = useState(false)
  const shuffleQueueRef = useRef(shuffleQueue)

  const [hoveredProject, setHoveredProject] = useState<Project | null>(null)

  // 데스크톱 필터 바 가로 오버플로 어포던스 (768~1439 좁은 폭에서 칩이 한 줄을 넘을 때)
  const filterScrollRef = useRef<HTMLDivElement>(null)
  const [filterFade, setFilterFade] = useState({ left: false, right: false })

  useEffect(() => {
    shuffleQueueRef.current = shuffleQueue
  }, [shuffleQueue])

  useEffect(() => {
    filteredRef.current = filteredProjects
  }, [filteredProjects])

  // mobile detection — 모바일 <768, 그 외(태블릿 768~1439 포함) 데스크탑 분기
  useEffect(() => {
    const fn = () => {
      const w = window.innerWidth
      const m = w < 768
      mobileRef.current = m
      setMobile(m)
    }
    fn()
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  // 데스크톱 필터 바 오버플로 페이드 갱신 — scrollLeft 기반 좌/우 스크롤 가능 여부 감지
  const updateFilterFade = () => {
    const el = filterScrollRef.current
    if (!el) return
    setFilterFade({
      left: el.scrollLeft > 1,
      right: el.scrollLeft < el.scrollWidth - el.clientWidth - 1,
    })
  }
  useEffect(() => {
    updateFilterFade()
    window.addEventListener('resize', updateFilterFade)
    return () => window.removeEventListener('resize', updateFilterFade)
  }, [mobile, showFilters])

  // 휠 세로 스크롤 → 필터 바 가로 스크롤 (혼용 환경)
  const handleFilterWheel = (e: React.WheelEvent) => {
    const el = filterScrollRef.current
    if (!el || el.scrollWidth <= el.clientWidth) return
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      el.scrollLeft += e.deltaY
    }
  }

  // 셔플 — blackout fade, 끝에 도달하면 재셔플 (필터 기준). 데스크톱 전용
  const advanceShuffle = useCallback(() => {
    setIsBlacking(true)
    setTimeout(() => {
      setShuffleIdx(prev => {
        const next = prev + 1
        if (next >= shuffleQueueRef.current.length) {
          setShuffleQueue(shuffle(filteredRef.current))
          return 0
        }
        return next
      })
      setTimeout(() => setIsBlacking(false), 300)
    }, 600)
  }, [])

  // 필터 변경 → 셔플 큐 재생성 + 목록 밖 hover 해제
  useEffect(() => {
    setShuffleQueue(shuffle(filteredProjects))
    setShuffleIdx(0)
    setHoveredProject(prev => (prev && !filteredProjects.includes(prev) ? null : prev))
  }, [filteredProjects])

  // 셔플 타이머 — 모바일 폐지. hover/active 중에는 일시정지
  useEffect(() => {
    if (introPhase !== 'done') return
    if (mobile) return
    if (activeProject || hoveredProject) return
    if (filteredProjects.length < 2) return
    const timer = setInterval(advanceShuffle, 6000)
    return () => clearInterval(timer)
  }, [introPhase, mobile, activeProject, hoveredProject, filteredProjects, advanceShuffle])

  const handleBack = useCallback(() => {
    setActiveProject(null)
    // 모바일은 수축 시 항상 /work (모바일에서 /와 /work는 동일 화면)
    // 데스크톱: 필터 브라우징 상태에서 닫으면 /work, 아니면 /
    window.history.pushState({}, '', mobileRef.current || showFilters ? '/work' : '/')
  }, [showFilters])

  // ESC → active 종료 (Back과 동일 경로 처리)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (activeProject) handleBack()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeProject, handleBack])

  // 브라우저 뒤로가기/앞으로가기 → URL과 active/필터 상태 동기화
  useEffect(() => {
    const onPopState = () => {
      const path = window.location.pathname
      if (path.startsWith('/work/')) {
        const slug = path.slice('/work/'.length)
        const p = sortedProjects.find(p => p.id === slug) ?? null
        setActiveProject(p)
        if (p) setShowFilters(true)
      } else if (path === '/work') {
        setActiveProject(null)
        setShowFilters(true)
      } else {
        setActiveProject(null)
        setShowFilters(false)
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const handleHover = (p: Project | null) => {
    if (activeProject) return
    setHoveredProject(p)
  }

  const handleSelect = (p: Project) => {
    setActiveProject(p)
    setHoveredProject(null)
    setShowFilters(true)
    window.history.pushState({}, '', `/work/${p.id}`)
  }

  // 모바일 월: 카드 탭 → 인라인 확장 + URL push
  const handleActivate = useCallback((slug: string) => {
    const p = sortedProjects.find(p => p.id === slug)
    if (!p) return
    setActiveProject(p)
    setShowFilters(true)
    window.history.pushState({}, '', `/work/${slug}`)
  }, [])

  const handleFilter = (t: string) => {
    if (t === activeFilter) return
    setActiveFilter(t)
    // active 프로젝트가 열려 있으면 닫고 필터 브라우징 상태로 복귀
    if (activeProject) {
      setActiveProject(null)
      window.history.pushState({}, '', '/work')
    }
  }

  const shuffleProject = shuffleQueue[shuffleIdx] ?? filteredProjects[0] ?? sortedProjects[0]
  const displayProject = activeProject ?? hoveredProject ?? shuffleProject

  const layoutVisible = introPhase === 'done'

  // 전역 헤더(ACP 모노그램 / 내비게이션) 색상 전환 — 랜딩은 셸이 항상 흰색이므로
  // 인트로 재생 중에도 다크 워드마크여야 한다.
  useEffect(() => {
    setWordmarkOnLight(true)
    setNavOnLight(true)
  }, [setWordmarkOnLight, setNavOnLight])

  return (
    <div style={{
      fontFamily: FONT,
      background: '#FFFFFF',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      position: 'relative',
    }}>

      {/* ── FILTER BAR — 데스크톱 분기(>=768) 공용, 헤더 존 내 가운데 가로 1열. 좁은 폭은 가로 스크롤 + 어포던스. 모바일(<768)은 월 칩 행이 전담 ── */}
      {!mobile && (
        <div style={{
          position: 'absolute',
          top: 50,
          left: 0,
          right: 0,
          height: 24,
          opacity: showFilters ? 1 : 0,
          pointerEvents: showFilters ? 'auto' : 'none',
          transition: 'opacity 300ms ease-out',
          zIndex: 50,
        }}>
          {/* 스크롤 컨테이너 — 넓은 폭: 내부 행이 margin auto로 가운데(현행 동일). 좁은 폭: 가로 스크롤 */}
          <div
            ref={filterScrollRef}
            className="mpw-chips"
            onScroll={updateFilterFade}
            onWheel={handleFilterWheel}
            style={{
              height: '100%',
              display: 'flex',
              overflowX: 'auto',
              overflowY: 'hidden',
              touchAction: 'pan-x',
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 28,
              margin: '0 auto',
              flexShrink: 0,
            }}>
              {FILTER_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => handleFilter(t)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: FONT,
                    fontSize: 11,
                    fontWeight: t === activeFilter ? 500 : 300,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#080706',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {/* 불릿 — 선택된 항목 앞에만 */}
                  <span style={{
                    fontSize: 7,
                    lineHeight: 1,
                    opacity: t === activeFilter ? 1 : 0,
                    transition: 'opacity 200ms',
                  }}>●</span>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* 오버플로 어포던스 — 스크롤 가능 방향에만 그라데이션 + 화살표 글리프 표시 */}
          <div style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingLeft: 4,
            background: 'linear-gradient(to right, #FFFFFF, rgba(255,255,255,0))',
            color: '#080706',
            fontSize: 13,
            opacity: filterFade.left ? 1 : 0,
            transition: 'opacity 200ms ease',
            pointerEvents: 'none',
          }}>‹</div>
          <div style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingRight: 4,
            background: 'linear-gradient(to left, #FFFFFF, rgba(255,255,255,0))',
            color: '#080706',
            fontSize: 13,
            opacity: filterFade.right ? 1 : 0,
            transition: 'opacity 200ms ease',
            pointerEvents: 'none',
          }}>›</div>
        </div>
      )}

      {/* ── MAIN (데스크톱) — 헤더 높이 전 상태 고정 (수직 점프 없음) ── */}
      {!mobile && (
        <div style={{
          position: 'absolute',
          top: HEADER_H,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          gap: 16,
          opacity: layoutVisible ? 1 : 0,
          transition: 'opacity 400ms ease-out',
        }}>
          <ProjectWall
            projects={filteredProjects}
            filterKey={activeFilter}
            highlightSlug={shuffleProject.id}
            activeSlug={activeProject?.id ?? null}
            revealed={layoutVisible}
            onHover={handleHover}
            onSelect={handleSelect}
          />

          <ContentArea
            project={displayProject}
            mode={activeProject ? 'active' : 'idle'}
            isBlacking={isBlacking}
            visible={layoutVisible}
            onBack={handleBack}
          />
        </div>
      )}

      {/* ── MOBILE — 월 우선(Wall-First): 수직 피드 + 인라인 트랙 ── */}
      {mobile && (
        <MobileProjectWall
          projects={filteredProjects}
          filterTypes={FILTER_TYPES}
          activeFilter={activeFilter}
          onFilter={handleFilter}
          activeSlug={activeProject?.id ?? null}
          onActivate={handleActivate}
          onDeactivate={handleBack}
          revealed={layoutVisible}
          showFilters={showFilters}
        />
      )}

    </div>
  )
}
