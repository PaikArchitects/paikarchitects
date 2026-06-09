'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { projects } from '@/data/projects'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"

type EntryPhase = 'loading' | 'nav' | 'shimmer' | 'done'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function HomePage() {
  const [shuffled] = useState(() => shuffle(projects))
  const [activeIdx, setActiveIdx] = useState(0)
  const [isBlacking, setIsBlacking] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [mobile, setMobile] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isOverLight, setIsOverLight] = useState(false)
  const [entryPhase, setEntryPhase] = useState<EntryPhase>('loading')
  const wordmarkRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768)
    fn()
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  // 진입 시퀀스
  useEffect(() => {
    const t1 = setTimeout(() => setEntryPhase('nav'),     5000)
    const t2 = setTimeout(() => setEntryPhase('shimmer'), 5400)
    const t3 = setTimeout(() => setEntryPhase('done'),    6600)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [])

  // carousel — blackout fade
  const advanceSlide = useCallback(() => {
    setIsBlacking(true)
    setTimeout(() => {
      setActiveIdx(prev => (prev + 1) % shuffled.length)
      setTimeout(() => {
        setIsBlacking(false)
      }, 200)
    }, 400)
  }, [shuffled.length])

  useEffect(() => {
    const timer = setInterval(advanceSlide, 4000)
    return () => clearInterval(timer)
  }, [advanceSlide])

  // 밝은 배경 감지: ACP 위치(top: 28px, left: 40px)가 .light-panel과 겹치는지 확인
  const checkOverLight = useCallback(() => {
    const acpCenterY = 28
    const acpCenterX = 40
    const lightPanels = document.querySelectorAll('.light-panel')
    let over = false
    lightPanels.forEach((el) => {
      const rect = el.getBoundingClientRect()
      if (
        rect.top    <= acpCenterY &&
        rect.bottom >= acpCenterY &&
        rect.left   <= acpCenterX &&
        rect.right  >= acpCenterX
      ) {
        over = true
      }
    })
    setIsOverLight(over)
  }, [])

  // scroll 핸들러
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      const threshold = window.innerHeight * 0.33 - 16

      const collapsed = scrollY >= threshold
      setIsCollapsed(collapsed)
      setScrolled(scrollY > 50)

      if (collapsed) {
        checkOverLight()
      } else {
        setIsOverLight(false)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [checkOverLight])

  // work section: projects with coverImage, sorted latest first, max 8; fallback top 6
  const workProjects = (() => {
    const withImg = [...projects]
      .filter(p => p.coverImage)
      .sort((a, b) => b.year - a.year)
    return withImg.length > 0 ? withImg.slice(0, 8) : projects.slice(0, 6)
  })()

  const activeProject = shuffled[activeIdx]

  return (
    <div style={{ fontFamily: FONT, background: '#080706' }}>

      {/* ── LOADING OVERLAY ── */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: '#000000',
          zIndex: 100,
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

      {/* ── HERO ── */}
      <div
        ref={heroRef}
        style={{
          position: 'relative',
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
          backgroundColor: '#080706',
        }}
      >
        {/* 이미지 레이어 */}
        <div style={{
          position: 'absolute', inset: 0,
          opacity: entryPhase === 'done' ? 1 : 0,
          transition: entryPhase === 'done' ? 'opacity 800ms ease-out' : 'none',
          pointerEvents: 'none',
        }}>
          {shuffled[activeIdx].coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={shuffled[activeIdx].coverImage!}
              alt={shuffled[activeIdx].title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: '#080706' }} />
          )}
        </div>

        {/* Blackout overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: '#000000',
          opacity: isBlacking ? 1 : 0,
          transition: isBlacking ? 'opacity 400ms ease-in' : 'opacity 400ms ease-out',
          zIndex: 1,
          pointerEvents: 'none',
        }} />

        {/* ── WORDMARK ── */}
        <div
          ref={wordmarkRef}
          className={`wordmark-container ${isCollapsed ? 'collapsed' : ''} ${entryPhase === 'shimmer' ? 'shimmer-active' : ''}`}
          style={{
            position: isCollapsed ? 'fixed' : 'absolute',
            top: isCollapsed ? '16px' : '33%',
            left: '20px',
            transform: isCollapsed ? 'none' : 'translateY(-50%)',
            color: isOverLight ? '#080706' : '#ffffff',
            zIndex: 10,
            fontFamily: FONT,
            opacity: entryPhase === 'loading' || entryPhase === 'nav' ? 0 : 1,
            transition: entryPhase === 'shimmer' ? 'none' : 'opacity 0.3s ease',
          }}
        >
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

        {/* ── NAVIGATION — fixed bottom-right ── */}
        <nav style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          opacity: entryPhase === 'loading' ? 0 : 1,
          transition: 'opacity 400ms ease-out',
        }}>
          {[
            { label: 'ABOUT',    href: '/about'   },
            { label: 'WORKS',    href: '/work'    },
            { label: 'ESSAYS',   href: '/essays'  },
            { label: 'CONTACTS', href: '/contact' },
          ].map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              style={{
                fontFamily: FONT,
                fontWeight: 300,
                fontSize: 18,
                color: isOverLight ? '#080706' : '#ffffff',
                textDecoration: 'none',
                lineHeight: 1.8,
                textAlign: 'right',
                display: 'block',
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline' }}
              onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none' }}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* ── CAPTION — fixed bottom-left ── */}
        <div style={{
          position: 'fixed',
          bottom: 20,
          left: 20,
          zIndex: 10,
          fontFamily: FONT,
          fontStyle: 'italic',
          fontSize: 11,
          fontWeight: 300,
          color: 'rgba(255,255,255,0.7)',
          pointerEvents: 'none',
          opacity: entryPhase === 'done' ? 1 : 0,
          transition: 'opacity 600ms ease-out',
        }}>
          {activeProject.title}, {activeProject.year}
        </div>

        {/* ── SCROLL INDICATOR — fixed bottom-center ── */}
        <div style={{
          position: 'fixed',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          color: '#ffffff',
          fontSize: 16,
          opacity: entryPhase === 'done' && !scrolled ? 0.6 : 0,
          transition: 'opacity 600ms ease-out',
          pointerEvents: 'none',
        }}>
          ↓
        </div>
      </div>

      {/* ── WORK SECTION ── */}
      <div>
        {workProjects.map((p, i) => {
          const textOnLeft = i % 2 === 0
          const textBg    = textOnLeft ? '#FFFFFF' : '#080706'
          const textColor = textOnLeft ? '#0a0908' : '#FFFFFF'
          const gray      = textOnLeft ? 'rgba(10,9,8,0.45)' : 'rgba(255,255,255,0.45)'

          const textContent = (
            <div>
              <div style={{ fontSize: 11, fontWeight: 300, color: gray, marginBottom: 8 }}>
                {p.year}
              </div>
              <div style={{ fontSize: 26, fontWeight: 600, marginBottom: 8 }}>
                <Link href={`/work/${p.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                  {p.title}
                </Link>
              </div>
              <div style={{ fontSize: 12, fontWeight: 300, color: gray }}>
                {p.type} · {p.status}
              </div>
            </div>
          )

          const imgEl = p.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.coverImage}
              alt={p.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: p.coverColor }} />
          )

          if (mobile) {
            return (
              <div key={p.id}>
                <div style={{ width: '100%', height: '60vw', overflow: 'hidden' }}>
                  {imgEl}
                </div>
                <div style={{ padding: 24, background: textBg, color: textColor, fontFamily: FONT }}>
                  <div style={{ fontSize: 11, fontWeight: 300, color: gray, marginBottom: 8 }}>
                    {p.year}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
                    <Link href={`/work/${p.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {p.title}
                    </Link>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 300, color: gray }}>
                    {p.type} · {p.status}
                  </div>
                </div>
              </div>
            )
          }

          const textPanel = (
            <div
              className={textOnLeft ? 'light-panel' : undefined}
              style={{
                width: '50%',
                flexShrink: 0,
                position: 'sticky',
                top: 0,
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                alignItems: 'flex-start',
                paddingTop: '48px',
                paddingLeft: '40px',
                paddingRight: '40px',
                background: textBg,
                color: textColor,
                fontFamily: FONT,
              }}
            >
              {textContent}
            </div>
          )

          const imagePanel = (
            <div style={{ width: '50%', flexShrink: 0, minHeight: '100vh', overflow: 'hidden' }}>
              {imgEl}
            </div>
          )

          return (
            <div key={p.id} style={{ display: 'flex', height: '100vh' }}>
              {textOnLeft ? <>{textPanel}{imagePanel}</> : <>{imagePanel}{textPanel}</>}
            </div>
          )
        })}
      </div>

    </div>
  )
}
