'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { projects } from '@/data/projects'

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
  const [shuffled] = useState(() => shuffle(projects))
  const [activeIdx, setActiveIdx] = useState(0)
  const [heroVisible, setHeroVisible] = useState(false)
  const [isBlacking, setIsBlacking] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [mobile, setMobile] = useState(false)
  const wordmarkRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768)
    fn()
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  // hero images fade in after shimmer completes
  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 1200)
    return () => clearTimeout(t)
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

  // scroll state — wordmark collapses via classList (no re-render)
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      const threshold = window.innerHeight * 0.33 - 16
      const el = wordmarkRef.current
      if (el) {
        if (scrollY >= threshold) {
          el.classList.add('collapsed', 'fixed')
        } else {
          el.classList.remove('collapsed', 'fixed')
        }
      }
      setScrolled(scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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
        {/* Current image — single, swapped during blackout */}
        <div style={{
          position: 'absolute', inset: 0,
          opacity: heroVisible ? 1 : 0,
          transition: 'opacity 1s ease',
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
        <div ref={wordmarkRef} className="wordmark-container">
          <span className="word" style={{ fontWeight: 900 }}>
            <span className="initial">A</span>
            <span className="rest">rchitect</span>
          </span>
          <span className="space"> </span>
          <span className="word" style={{ fontWeight: 400 }}>
            <span className="initial">C</span>
            <span className="rest">hanghyun</span>
          </span>
          <span className="space"> </span>
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
          mixBlendMode: 'difference',
        }}>
          {[
            { label: 'Work',    href: '/work' },
            { label: 'About',   href: '/about' },
            { label: 'Contact', href: 'mailto:contact@paikarchitects.com' },
          ].map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              style={{
                fontFamily: FONT,
                fontWeight: 300,
                fontSize: 15,
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
          opacity: scrolled ? 0 : 0.6,
          transition: 'opacity 0.3s ease',
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
            <div style={{
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
            }}>
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
