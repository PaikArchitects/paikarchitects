'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { projects } from '@/data/projects'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"

const PALETTE = [
  '#080706', '#080706', '#080706', '#080706',
  '#080706', '#080706', '#080706', '#080706',
  '#080706', '#080706', '#080706', '#080706',
]

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
  const [collapsed, setCollapsed] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [mobile, setMobile] = useState(false)

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

  // carousel
  useEffect(() => {
    const t = setTimeout(
      () => setActiveIdx(p => (p + 1) % shuffled.length),
      8000,
    )
    return () => clearTimeout(t)
  }, [activeIdx, shuffled.length])

  // scroll state
  useEffect(() => {
    const fn = () => {
      const y = window.scrollY
      setCollapsed(y > window.innerHeight - 100)
      setScrolled(y > 50)
    }
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  // work section: projects with coverImage, sorted latest first, max 8; fallback top 6
  const workProjects = (() => {
    const withImg = [...projects]
      .filter(p => p.coverImage)
      .sort((a, b) => b.year - a.year)
    return withImg.length > 0 ? withImg.slice(0, 8) : projects.slice(0, 6)
  })()

  const activeProject = shuffled[activeIdx]

  const restSpan = (text: string, maxW: string) => (
    <span style={{
      display: 'inline-block',
      overflow: 'hidden',
      maxWidth: collapsed ? '0' : maxW,
      opacity: collapsed ? 0 : 1,
      transition: 'max-width 0.4s ease, opacity 0.4s ease',
    }}>
      {text}
    </span>
  )

  const spaceSpan = (
    <span style={{
      display: 'inline-block',
      overflow: 'hidden',
      maxWidth: collapsed ? '0' : '0.35em',
      transition: 'max-width 0.4s ease',
    }}>&nbsp;</span>
  )

  return (
    <div style={{ fontFamily: FONT, background: '#080706' }}>

      {/* ── WORDMARK ── */}
      <div
        className="wordmark-shimmer"
        style={{
          position: 'fixed',
          top: collapsed ? 16 : '35%',
          left: 20,
          zIndex: 300,
          color: '#ffffff',
          mixBlendMode: 'difference',
          fontSize: mobile ? (collapsed ? 18 : 22) : (collapsed ? 28 : 42),
          letterSpacing: '0.02em',
          lineHeight: 1,
          whiteSpace: 'nowrap',
          transition: 'top 0.4s ease, font-size 0.4s ease',
          fontFamily: FONT,
          pointerEvents: 'none',
        }}
      >
        <span style={{ fontWeight: 300 }}>
          <span>A</span>{restSpan('rchitect', '6em')}
        </span>
        {spaceSpan}
        <span style={{ fontWeight: 500 }}>
          <span>C</span>{restSpan('hanghyun', '7em')}
        </span>
        {spaceSpan}
        <span style={{ fontWeight: 700 }}>
          <span>P</span>{restSpan('aik', '3em')}
        </span>
      </div>

      {/* ── HERO ── */}
      <div style={{ position: 'relative', height: '100vh', overflow: 'hidden', background: '#080706' }}>

        {shuffled.map((p, i) => (
          <div key={p.id} style={{
            position: 'absolute', inset: 0,
            opacity: i === activeIdx ? (heroVisible ? 1 : 0) : 0,
            transition: 'opacity 1s ease',
            pointerEvents: 'none',
          }}>
            {p.coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.coverImage}
                alt={p.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                background: PALETTE[projects.indexOf(p) % PALETTE.length],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ color: '#fff', fontSize: 14, fontStyle: 'italic', fontWeight: 300 }}>
                  {p.title}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── NAVIGATION — fixed bottom-right ── */}
      <nav style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 200,
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
        zIndex: 200,
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
        zIndex: 200,
        color: '#ffffff',
        fontSize: 16,
        opacity: scrolled ? 0 : 0.6,
        transition: 'opacity 0.3s ease',
        pointerEvents: 'none',
      }}>
        ↓
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
