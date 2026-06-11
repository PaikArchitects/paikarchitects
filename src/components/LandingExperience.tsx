'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { sortedProjects } from '@/data/projects'
import type { Project } from '@/types'
import { ProjectWall } from '@/components/ProjectWall'
import { ContentArea } from '@/components/ContentArea'
import { useSiteChrome } from '@/components/SiteChromeContext'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"

const FILTER_TYPES = ['All', ...Array.from(new Set(sortedProjects.map(p => p.type)))]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

interface LandingExperienceProps {
  initialSlug?: string        // /work/[slug] 딥링크
  initialShowFilters?: boolean
}

export function LandingExperience({ initialSlug, initialShowFilters = false }: LandingExperienceProps) {
  const [mobile, setMobile] = useState(false)
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
    () => activeFilter === 'All' ? sortedProjects : sortedProjects.filter(p => p.type === activeFilter),
    [activeFilter]
  )
  const filteredRef = useRef(filteredProjects)

  const [shuffleQueue, setShuffleQueue] = useState<Project[]>(() => shuffle(sortedProjects))
  const [shuffleIdx, setShuffleIdx] = useState(0)
  const [isBlacking, setIsBlacking] = useState(false)
  const shuffleQueueRef = useRef(shuffleQueue)

  const [hoveredProject, setHoveredProject] = useState<Project | null>(null)

  useEffect(() => {
    shuffleQueueRef.current = shuffleQueue
  }, [shuffleQueue])

  useEffect(() => {
    filteredRef.current = filteredProjects
  }, [filteredProjects])

  // mobile detection
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768)
    fn()
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  // 셔플 — blackout fade, 끝에 도달하면 재셔플 (필터 기준)
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

  // 셔플 타이머 — hover 또는 active 중에는 일시정지
  useEffect(() => {
    if (introPhase !== 'done') return
    if (activeProject || hoveredProject) return
    const timer = setInterval(advanceShuffle, 6000)
    return () => clearInterval(timer)
  }, [introPhase, activeProject, hoveredProject, advanceShuffle])

  const handleBack = useCallback(() => {
    setActiveProject(null)
    // 필터 브라우징 상태에서 닫으면 /work, 아니면 /
    window.history.pushState({}, '', showFilters ? '/work' : '/')
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

  // 브라우저 뒤로가기/앞으로가기 → URL과 active/필터 표시 상태 동기화
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

      {/* ── FILTER BAR — 헤더 존 바로 아래, 가운데 정렬 ── */}
      <div style={{
        position: 'absolute',
        top: 64,
        left: 0,
        right: 0,
        height: 40,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 28,
        opacity: showFilters ? 1 : 0,
        pointerEvents: showFilters ? 'auto' : 'none',
        transition: 'opacity 300ms ease-out',
        zIndex: 50,
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

      {/* ── MAIN ── */}
      <div style={{
        position: 'absolute',
        top: showFilters ? 104 : 64,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        gap: 16,
        opacity: layoutVisible ? 1 : 0,
        transition: 'opacity 400ms ease-out, top 300ms ease-out',
      }}>
        {!mobile && (
          <ProjectWall
            projects={filteredProjects}
            filterKey={activeFilter}
            highlightSlug={shuffleProject.id}
            activeSlug={activeProject?.id ?? null}
            revealed={layoutVisible}
            onHover={handleHover}
            onSelect={handleSelect}
          />
        )}

        <ContentArea
          project={displayProject}
          mode={activeProject ? 'active' : 'idle'}
          isBlacking={isBlacking}
          visible={layoutVisible}
          mobile={mobile}
          onBack={handleBack}
        />
      </div>

    </div>
  )
}
