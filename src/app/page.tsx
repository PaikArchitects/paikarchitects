'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { sortedProjects } from '@/data/projects'
import type { Project } from '@/types'
import { ProjectWall } from '@/components/ProjectWall'
import { ContentArea } from '@/components/ContentArea'
import { useSiteChrome } from '@/components/SiteChromeContext'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function HomePage() {
  const [mobile, setMobile] = useState(false)
  const { introPhase, setWordmarkOnLight, setNavOnLight } = useSiteChrome()

  const [shuffleQueue, setShuffleQueue] = useState<Project[]>(() => shuffle(sortedProjects))
  const [shuffleIdx, setShuffleIdx] = useState(0)
  const [isBlacking, setIsBlacking] = useState(false)
  const shuffleQueueRef = useRef(shuffleQueue)

  const [hoveredProject, setHoveredProject] = useState<Project | null>(null)
  const [activeProject, setActiveProject] = useState<Project | null>(null)

  useEffect(() => {
    shuffleQueueRef.current = shuffleQueue
  }, [shuffleQueue])

  // mobile detection
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768)
    fn()
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  // 셔플 — blackout fade, 끝에 도달하면 재셔플
  const advanceShuffle = useCallback(() => {
    setIsBlacking(true)
    setTimeout(() => {
      setShuffleIdx(prev => {
        const next = prev + 1
        if (next >= shuffleQueueRef.current.length) {
          setShuffleQueue(shuffle(sortedProjects))
          return 0
        }
        return next
      })
      setTimeout(() => setIsBlacking(false), 300)
    }, 600)
  }, [])

  // 셔플 타이머 — hover 또는 active 중에는 일시정지
  useEffect(() => {
    if (introPhase !== 'done') return
    if (activeProject || hoveredProject) return
    const timer = setInterval(advanceShuffle, 6000)
    return () => clearInterval(timer)
  }, [introPhase, activeProject, hoveredProject, advanceShuffle])

  // ESC → active 종료
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setActiveProject(prev => {
        if (prev) {
          window.history.pushState({}, '', '/')
          return null
        }
        return prev
      })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // 브라우저 뒤로가기/앞으로가기 → URL과 active 상태 동기화
  useEffect(() => {
    const onPopState = () => {
      const path = window.location.pathname
      if (path.startsWith('/work/')) {
        const slug = path.slice('/work/'.length)
        setActiveProject(sortedProjects.find(p => p.id === slug) ?? null)
      } else {
        setActiveProject(null)
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
    window.history.pushState({}, '', `/work/${p.id}`)
  }

  const handleBack = useCallback(() => {
    setActiveProject(null)
    window.history.pushState({}, '', '/')
  }, [])

  const shuffleProject = shuffleQueue[shuffleIdx] ?? sortedProjects[0]
  const displayProject = activeProject ?? hoveredProject ?? shuffleProject

  const layoutVisible = introPhase === 'done'

  // 전역 헤더(ACP 모노그램 / 내비게이션) 색상 전환 — 헤더 존(상단 64px)은 항상 루트 다크 배경이므로
  // 랜딩에서는 모노그램과 내비가 항상 흰색이어야 한다.
  useEffect(() => {
    setWordmarkOnLight(false)
    setNavOnLight(false)
  }, [setWordmarkOnLight, setNavOnLight])

  return (
    <div style={{
      fontFamily: FONT,
      background: '#080706',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      position: 'relative',
    }}>

      {/* ── MAIN ── */}
      <div style={{
        position: 'absolute',
        top: 64,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        gap: 16,
        opacity: layoutVisible ? 1 : 0,
        transition: 'opacity 400ms ease-out',
      }}>
        {!mobile && (
          <ProjectWall
            projects={sortedProjects}
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
