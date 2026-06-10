'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { sortedProjects } from '@/data/projects'
import type { Project } from '@/types'
import { ProjectWall } from '@/components/ProjectWall'
import { ContentArea } from '@/components/ContentArea'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"

type EntryPhase = 'loading' | 'header' | 'wall' | 'shimmer' | 'done'

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
  const [entryPhase, setEntryPhase] = useState<EntryPhase>('loading')

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

  // 진입 시퀀스: loading → header → wall → shimmer → done
  useEffect(() => {
    const timers = [
      setTimeout(() => setEntryPhase('header'), 5000),
      setTimeout(() => setEntryPhase('wall'), 5200),
      setTimeout(() => setEntryPhase('shimmer'), 6400),
      setTimeout(() => setEntryPhase('done'), 7600),
    ]
    return () => timers.forEach(clearTimeout)
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
    if (entryPhase !== 'done') return
    if (activeProject || hoveredProject) return
    const timer = setInterval(advanceShuffle, 4000)
    return () => clearInterval(timer)
  }, [entryPhase, activeProject, hoveredProject, advanceShuffle])

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

  const wallRevealed = entryPhase === 'wall' || entryPhase === 'shimmer' || entryPhase === 'done'
  const contentVisible = entryPhase === 'shimmer' || entryPhase === 'done'

  return (
    <div style={{
      fontFamily: FONT,
      background: '#080706',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      position: 'relative',
    }}>

      {/* ── LOADING OVERLAY ── */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: '#000000',
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: entryPhase === 'loading' ? 1 : 0,
          transition: entryPhase === 'loading' ? 'none' : 'opacity 400ms ease-out',
          pointerEvents: entryPhase === 'loading' ? 'auto' : 'none',
        }}
      >
        <div className="entry-spinner" />
      </div>

      {/* ── HEADER ── */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 60,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 20,
        background: '#FFFFFF',
        boxSizing: 'border-box',
        opacity: entryPhase === 'loading' ? 0 : 1,
        transition: 'opacity 400ms ease-out',
      }}>
        <div className="wordmark-container" style={{ color: '#080706', fontFamily: FONT }}>
          <span className="word" style={{ fontWeight: 900 }}>
            <span className="initial">A</span>
            <span className="rest">rchitect</span>
          </span>

          <span className="word-space">&nbsp;</span>

          <span className="word" style={{ fontWeight: 400 }}>
            <span className="initial">C</span>
            <span className="rest">hanghyun</span>
          </span>

          <span className="word-space">&nbsp;</span>

          <span className="word" style={{ fontWeight: 300 }}>
            <span className="initial">P</span>
            <span className="rest">aik</span>
          </span>
        </div>
      </header>

      {/* ── MAIN ── */}
      <div style={{
        position: 'absolute',
        top: 60,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
      }}>
        {!mobile && (
          <ProjectWall
            projects={sortedProjects}
            highlightSlug={shuffleProject.id}
            activeSlug={activeProject?.id ?? null}
            revealed={wallRevealed}
            onHover={handleHover}
            onSelect={handleSelect}
          />
        )}

        <ContentArea
          project={displayProject}
          mode={activeProject ? 'active' : 'idle'}
          isBlacking={isBlacking}
          visible={contentVisible}
          shimmer={entryPhase === 'shimmer'}
          mobile={mobile}
          onBack={handleBack}
        />
      </div>

      {/* ── NAVIGATION — fixed bottom-right ── */}
      <nav style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 80,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        opacity: entryPhase === 'loading' ? 0 : 1,
        transition: 'opacity 400ms ease-out',
      }}>
        {NAV_ITEMS.map(({ label, href }) => (
          <Link
            key={label}
            href={href}
            style={{
              fontFamily: FONT,
              fontWeight: 300,
              fontSize: 18,
              color: '#ffffff',
              textDecoration: 'none',
              lineHeight: 1.8,
              textAlign: 'right',
              display: 'block',
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
