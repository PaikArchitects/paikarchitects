'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { sortedProjects } from '@/data/projects'
import type { Project } from '@/types'
import { ProjectWall } from '@/components/ProjectWall'
import { ContentArea } from '@/components/ContentArea'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"

type IntroPhase = 'wordmark' | 'collapse' | 'move' | 'done'

const NAV_ITEMS = [
  { label: 'ABOUT',    href: '/about'   },
  { label: 'WORKS',    href: '/work'    },
  { label: 'ESSAYS',   href: '/essays'  },
  { label: 'CONTACTS', href: '/contact' },
] as const

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
  const [introPhase, setIntroPhase] = useState<IntroPhase>('wordmark')

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

  // 진입 시퀀스: wordmark → collapse → move → done (총 약 3.1s)
  useEffect(() => {
    const t1 = setTimeout(() => setIntroPhase('collapse'), 2300)
    const t2 = setTimeout(() => setIntroPhase('move'), 2700)
    const t3 = setTimeout(() => setIntroPhase('done'), 3100)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
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
      setTimeout(() => setIsBlacking(false), 200)
    }, 400)
  }, [])

  // 셔플 타이머 — hover 또는 active 중에는 일시정지
  useEffect(() => {
    if (introPhase !== 'done') return
    if (activeProject || hoveredProject) return
    const timer = setInterval(advanceShuffle, 4000)
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
  const wordmarkCollapsed = introPhase !== 'wordmark'
  const wordmarkMoved = introPhase === 'move' || introPhase === 'done'
  // ACP가 ProjectWall(.light-panel, 흰 배경) 위에 놓이는 경우에만 다크 컬러로 전환
  const wordmarkOnLight = layoutVisible && !mobile

  return (
    <div style={{
      fontFamily: FONT,
      background: '#080706',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      position: 'relative',
    }}>

      {/* ── WORDMARK / ACP MONOGRAM ── */}
      <div className={`wordmark-intro ${wordmarkCollapsed ? 'collapsed' : ''} ${wordmarkMoved ? 'moved' : ''} ${wordmarkOnLight ? 'on-light' : ''}`}>
        <span style={{ fontWeight: 900 }}>
          <span className="initial">A</span>
          <span className="rest">rchitect</span>
        </span>
        <span className="spacer">&nbsp;</span>
        <span style={{ fontWeight: 400 }}>
          <span className="initial">C</span>
          <span className="rest">hanghyun</span>
        </span>
        <span className="spacer">&nbsp;</span>
        <span style={{ fontWeight: 300 }}>
          <span className="initial">P</span>
          <span className="rest">aik</span>
        </span>
      </div>

      {/* ── MAIN ── */}
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
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

      {/* ── NAVIGATION — fixed top-right ── */}
      <nav style={{
        position: 'fixed',
        top: 24,
        right: 24,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'row',
        gap: 32,
        alignItems: 'center',
        opacity: layoutVisible ? 1 : 0,
        transition: 'opacity 400ms ease-out',
      }}>
        {NAV_ITEMS.map(({ label, href }) => (
          <Link
            key={label}
            href={href}
            style={{
              fontFamily: FONT,
              fontWeight: 300,
              fontSize: 13,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#ffffff',
              textDecoration: 'none',
            }}
            onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline' }}
            onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none' }}
          >
            {label}
          </Link>
        ))}
      </nav>

    </div>
  )
}
