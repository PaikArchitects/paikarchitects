'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSiteChrome } from './SiteChromeContext'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"

const NAV_ITEMS = [
  { label: 'ABOUT',    href: '/about'   },
  { label: 'WORKS',    href: '/work'    },
  { label: 'ESSAYS',   href: '/essays'  },
  { label: 'CONTACTS', href: '/contact' },
] as const

// 랜딩(/) 외 페이지 중 흰 배경(light) 레이아웃을 사용하는 경로
const STATIC_LIGHT_PATHS = new Set(['/about', '/work'])

export function SiteHeader() {
  const pathname = usePathname()
  const {
    introPhase,
    introSkipped,
    wordmarkOnLight: dynamicWordmarkOnLight,
    navOnLight: dynamicNavOnLight,
  } = useSiteChrome()

  const isLanding = pathname === '/'
  const wordmarkOnLight = isLanding ? dynamicWordmarkOnLight : STATIC_LIGHT_PATHS.has(pathname)
  const navOnLight = isLanding ? dynamicNavOnLight : STATIC_LIGHT_PATHS.has(pathname)

  const layoutVisible = introPhase === 'done'
  const wordmarkActive = introPhase !== 'wordmark'

  return (
    <>
      {/* ── ACP MONOGRAM — 홈 링크 ── */}
      <Link
        href="/"
        aria-label="Home"
        className={[
          'wordmark-intro',
          wordmarkActive ? 'collapsed moved' : '',
          wordmarkOnLight ? 'on-light' : '',
          introSkipped ? 'instant' : '',
        ].filter(Boolean).join(' ')}
      >
        <span className="word" style={{ fontWeight: 900 }}>
          <span className="initial">A</span>
          <span className="rest">rchitect</span>
        </span>
        <span className="spacer">&nbsp;</span>
        <span className="word" style={{ fontWeight: 400 }}>
          <span className="initial">C</span>
          <span className="rest">hanghyun</span>
        </span>
        <span className="spacer">&nbsp;</span>
        <span className="word" style={{ fontWeight: 300 }}>
          <span className="initial">P</span>
          <span className="rest">aik</span>
        </span>
      </Link>

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
        pointerEvents: layoutVisible ? 'auto' : 'none',
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
              color: navOnLight ? '#0a0908' : '#ffffff',
              textDecoration: 'none',
              transition: 'color 0.3s ease-out',
            }}
            onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline' }}
            onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none' }}
          >
            {label}
          </Link>
        ))}
      </nav>
    </>
  )
}
