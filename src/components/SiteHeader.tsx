'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"

interface SiteHeaderProps {
  variant: 'dark' | 'light'
  activePage?: 'work' | 'about' | 'contact'
}

export function SiteHeader({ variant, activePage }: SiteHeaderProps) {
  const [mobile, setMobile] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768)
    fn()
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  const dark       = variant === 'dark'
  const nameColor  = dark ? 'rgba(255,255,255,0.90)' : '#111110'
  const navActive  = dark ? 'rgba(255,255,255,0.90)' : 'rgba(17,17,16,0.85)'
  const navDim     = dark ? 'rgba(255,255,255,0.45)' : 'rgba(17,17,16,0.38)'
  const menuBg     = dark ? 'rgba(6,5,4,0.97)'       : 'rgba(255,255,255,0.97)'
  const menuText   = dark ? '#ffffff'                 : '#111110'
  const closeColor = dark ? 'rgba(255,255,255,0.42)' : 'rgba(17,17,16,0.40)'
  const hamFill    = dark ? 'rgba(255,255,255,0.80)' : 'rgba(17,17,16,0.70)'

  const NAV = [
    { label: 'Work',    href: '/work',          key: 'work'    },
    { label: 'About',   href: '/about',         key: 'about'   },
    { label: 'Contact', href: '/about#contact', key: 'contact' },
  ] as const

  return (
    <>
      <header style={{
        position: dark ? 'absolute' : 'sticky',
        top: 0, left: 0, right: 0, zIndex: 200,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: mobile ? '18px 20px' : '28px 44px',
        background: dark ? 'transparent' : '#FFFFFF',
        fontFamily: FONT,
      } as React.CSSProperties}>

        <Link href="/" style={{
          fontSize: mobile ? 18 : 30,
          letterSpacing: '0.22em', textTransform: 'uppercase',
          fontWeight: 400, color: nameColor,
          textDecoration: 'none', lineHeight: 1.2,
        }}>
          Chang Hyun Paik
        </Link>

        {!mobile && (
          <nav style={{ display: 'flex', gap: 30 }}>
            {NAV.map(({ label, href, key }) => (
              <Link key={label} href={href} style={{
                fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
                fontWeight: 300, textDecoration: 'none',
                color: activePage === key ? navActive : navDim,
              }}>
                {label}
              </Link>
            ))}
          </nav>
        )}

        {mobile && (
          <button onClick={() => setMenuOpen(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            aria-label="Open menu">
            <svg width="22" height="14" viewBox="0 0 22 14" fill="none">
              <rect width="22" height="1.5" fill={hamFill} />
              <rect y="6.25" width="22" height="1.5" fill={hamFill} />
              <rect y="12.5" width="22" height="1.5" fill={hamFill} />
            </svg>
          </button>
        )}
      </header>

      {menuOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: menuBg,
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center', padding: '0 32px', gap: 34,
        }}>
          <button onClick={() => setMenuOpen(false)} style={{
            position: 'absolute', top: 18, right: 24,
            background: 'none', border: 'none', cursor: 'pointer',
            color: closeColor, fontSize: 28, lineHeight: '1',
          }}>×</button>
          {NAV.map(({ label, href }) => (
            <Link key={label} href={href} style={{
              fontSize: 32, letterSpacing: '0.06em', textTransform: 'uppercase',
              fontWeight: 300, color: menuText, textDecoration: 'none',
            }}>
              {label}
            </Link>
          ))}
        </div>
      )}
    </>
  )
}