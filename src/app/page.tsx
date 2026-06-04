'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const CDN = 'https://res.cloudinary.com/drsybwqg0/image/upload/'

const FEATURED = [
  {
    id: 'independence-memorial-hall', code: '047', year: 2019, type: 'Culture',
    title: 'Independence Memorial Hall', location: 'Seoul, KR',
    result: '2nd Prize', status: 'Competition',
    image: CDN + '01_THRESHOLD_amtokp.png',
  },
  {
    id: 'cheongju-culture-factory', code: '036', year: 2017, type: 'Remodeling',
    title: 'Cheongju Culture Factory', location: 'Cheongju, KR',
    result: 'Winner · Grand Prize', status: 'Completed',
    image: CDN + 'Elevation_01-2_resize_qzmdrj.jpg',
  },
  {
    id: 'seoul-animation-center', code: '048', year: 2019, type: 'Culture',
    title: 'Seoul Animation Center', location: 'Seoul, KR',
    result: 'Winner', status: 'In Progress',
    image: CDN + 'CG_Aerial_View_resize_xlqazy.jpg',
  },
  {
    id: 'hyundai-india-rd-center', code: '060', year: 2022, type: 'Infrastructure',
    title: 'Hyundai India R&D Center', location: 'Pune, India',
    result: 'Winner', status: 'In Progress',
    image: CDN + 'Aerial_001_HDR_resize_jpd5hu.jpg',
  },
]

const INTERVAL = 5800
const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"

export default function HomePage() {
  const [activeIdx, setActiveIdx]   = useState(0)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [paused, setPaused]         = useState(false)
  const [mobile, setMobile]         = useState(false)
  const [menuOpen, setMenuOpen]     = useState(false)

  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768)
    fn()
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  useEffect(() => {
    if (paused) return
    const t = setTimeout(
      () => setActiveIdx(p => (p + 1) % FEATURED.length),
      INTERVAL,
    )
    return () => clearTimeout(t)
  }, [activeIdx, paused])

  const visIdx  = hoveredIdx !== null ? hoveredIdx : activeIdx
  const onEnter = (i: number) => { setPaused(true);  setHoveredIdx(i); setActiveIdx(i) }
  const onLeave = ()           => { setPaused(false); setHoveredIdx(null) }

  const PAD = mobile ? '20px' : '44px'

  return (
    <div style={{ fontFamily: FONT, height: '100vh', position: 'relative', overflow: 'hidden', background: '#080706' }}>

      {/* Full-screen images */}
      {FEATURED.map((p, i) => (
        <div key={p.id} style={{
          position: 'absolute', inset: 0,
          opacity: i === visIdx ? 1 : 0,
          transition: 'opacity 1.0s ease',
          pointerEvents: 'none',
        }}>
          <div style={{
            position: 'absolute', inset: '-6%',
            backgroundImage: `url(${p.image})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            animation: i === visIdx ? 'kenBurns 22s ease-in-out infinite' : 'none',
          }} />
        </div>
      ))}

      {/* Gradient overlays */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: [
          'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.18) 38%, transparent 58%)',
          'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.22) 24%, transparent 46%)',
        ].join(', '),
      }} />

      {/* Header — glassmorphism */}
      <header style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 200,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        padding: mobile ? '18px 20px' : '28px 44px',
        background: 'transparent',
      } as React.CSSProperties}>

        {/* Architect name */}
        <div style={{
          fontSize: mobile ? 18 : 30,
          letterSpacing: mobile ? '0.20em' : '0.22em',
          textTransform: 'uppercase',
          fontWeight: 400,
          color: 'rgba(255,255,255,0.90)',
          lineHeight: 1.25,
        }}>
          Chang Hyun Paik
        </div>

        {/* Desktop nav — horizontal */}
        {!mobile && (
          <nav style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 30 }}>
            {[
              { label: 'Work',    href: '/work' },
              { label: 'About',  href: '/about' },
              { label: 'Contact', href: '/about#contact' },
            ].map(({ label, href }) => (
              <Link key={label} href={href} style={{
                fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase',
                fontWeight: 300, color: 'rgba(255,255,255,0.50)', textDecoration: 'none',
              }}>
                {label}
              </Link>
            ))}
          </nav>
        )}

        {/* Mobile hamburger */}
        {mobile && (
          <button onClick={() => setMenuOpen(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', marginTop: 4 }}
            aria-label="Open menu">
            <svg width="22" height="14" viewBox="0 0 22 14" fill="none">
              <rect width="22" height="1.5" fill="rgba(255,255,255,0.80)" />
              <rect y="6.25" width="22" height="1.5" fill="rgba(255,255,255,0.80)" />
              <rect y="12.5" width="22" height="1.5" fill="rgba(255,255,255,0.80)" />
            </svg>
          </button>
        )}
      </header>

      {/* Mobile fullscreen menu */}
      {menuOpen && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 300,
          background: 'rgba(6,5,4,0.97)',
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center', padding: '0 32px', gap: 34,
        }}>
          <button onClick={() => setMenuOpen(false)}
            style={{ position: 'absolute', top: 18, right: 24, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.42)', fontSize: 28, lineHeight: '1' }}>
            ×
          </button>
          {[
            { label: 'Work',    href: '/work' },
            { label: 'About',  href: '/about' },
            { label: 'Contact', href: '/about#contact' },
          ].map(({ label, href }) => (
            <Link key={label} href={href} style={{
              fontSize: 32, letterSpacing: '0.06em', textTransform: 'uppercase',
              fontWeight: 300, color: '#fff', textDecoration: 'none',
            }}>
              {label}
            </Link>
          ))}
        </div>
      )}

      {/* Project list — floating bottom-left */}
      <div style={{
        position: 'absolute',
        bottom: mobile ? 32 : 52,
        left: PAD,
        right: mobile ? PAD : undefined,
        width: mobile ? undefined : '46%',
        zIndex: 100,
        animation: 'fadeUp 1.0s ease 0.3s both',
      }}>
        {FEATURED.map((p, i) => {
          const isActive = i === visIdx
          const isHov    = i === hoveredIdx
          return (
            <Link key={p.id} href={`/work/${p.id}`}
              style={{ display: 'block', textDecoration: 'none' }}
              onMouseEnter={() => !mobile && onEnter(i)}
              onMouseLeave={() => !mobile && onLeave()}>
              <div style={{
                paddingTop: mobile ? 12 : 15,
                paddingBottom: mobile ? 12 : 15,
                borderBottom: '1px solid rgba(255,255,255,0.10)',
              }}>
                {/* Title row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{
                    fontSize: mobile ? 17 : 22,
                    fontWeight: isActive ? 400 : 300,
                    color: isActive ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.25)',
                    transition: 'color 0.40s ease',
                    letterSpacing: '0.01em', lineHeight: 1.3,
                  }}>
                    {p.title}
                  </span>
                  <span style={{
                    fontSize: 9, fontWeight: 300, flexShrink: 0, marginLeft: 14,
                    letterSpacing: '0.09em',
                    color: isActive ? 'rgba(255,255,255,0.34)' : 'rgba(255,255,255,0.10)',
                    transition: 'color 0.40s ease',
                  }}>
                    {p.year}
                  </span>
                </div>

                {/* Hover supplementary info */}
                {!mobile && (
                  <div style={{
                    overflow: 'hidden',
                    maxHeight: isHov ? 56 : 0,
                    opacity:   isHov ? 1  : 0,
                    marginTop: isHov ? 9  : 0,
                    transition: 'max-height 0.34s ease, opacity 0.26s ease, margin-top 0.26s ease',
                  }}>
                    <p style={{ fontSize: 10, fontWeight: 300, color: 'rgba(255,255,255,0.40)', letterSpacing: '0.05em', lineHeight: 1.75 }}>
                      {p.type}&nbsp;·&nbsp;{p.result}&nbsp;·&nbsp;{p.location}
                    </p>
                    <p style={{ fontSize: 9, fontWeight: 300, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.04em' }}>
                      {p.status}&nbsp;·&nbsp;{p.code}
                    </p>
                  </div>
                )}
              </div>
            </Link>
          )
        })}
      </div>

      {/* Slide counter */}
      {!mobile && (
        <div style={{
          position: 'absolute', bottom: 52, right: 44, zIndex: 100,
          fontSize: 9, letterSpacing: '0.12em',
          color: 'rgba(255,255,255,0.26)', fontWeight: 300,
        }}>
          {String(visIdx + 1).padStart(2, '0')}&nbsp;/&nbsp;{String(FEATURED.length).padStart(2, '0')}
        </div>
      )}
    </div>
  )
}
