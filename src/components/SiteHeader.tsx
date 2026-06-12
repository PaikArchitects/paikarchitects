'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSiteChrome } from './SiteChromeContext'

const NAV_ITEMS = [
  { label: 'ABOUT',    href: '/about'   },
  { label: 'WORKS',    href: '/work'    },
  { label: 'ESSAYS',   href: '/essays'  },
  { label: 'CONTACTS', href: '/contact' },
] as const

// 랜딩(/) 외 페이지 중 흰 배경(light) 레이아웃을 사용하는 경로
// /work 계열(/work, /work/[slug])은 LandingExperience 흰 셸을 렌더하므로 항상 light
const STATIC_LIGHT_PATHS = new Set(['/about', '/work', '/essays', '/contact'])

function isStaticLight(pathname: string): boolean {
  return STATIC_LIGHT_PATHS.has(pathname) || pathname.startsWith('/work/')
}

export function SiteHeader() {
  const pathname = usePathname()
  const {
    introPhase,
    introSkipped,
    wordmarkOnLight: dynamicWordmarkOnLight,
    navOnLight: dynamicNavOnLight,
  } = useSiteChrome()

  const isLanding = pathname === '/'
  const wordmarkOnLight = isLanding ? dynamicWordmarkOnLight : isStaticLight(pathname)
  const navOnLight = isLanding ? dynamicNavOnLight : isStaticLight(pathname)

  const layoutVisible = introPhase === 'done'
  const wordmarkActive = introPhase !== 'wordmark'

  return (
    <>
      {/* ── 모바일 전용 불투명 헤더 바(56px) — 콘텐츠의 헤더 존 침범을 구조적으로 차단.
           데스크톱에서는 display:none (globals.css) ── */}
      <div className="mobile-header-bar" aria-hidden="true" />

      {/* ── ACP MONOGRAM — 홈 링크 ── */}
      <Link
        href="/"
        aria-label="Home"
        className={[
          'wordmark-intro',
          wordmarkActive ? 'collapsed moved' : '',
          wordmarkOnLight ? 'on-light' : '',
          introSkipped ? 'instant' : '',
          !isLanding ? 'no-color-transition' : '',
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

      {/* ── NAVIGATION — 데스크톱: 헤더 존 수평 중앙 / 모바일: 56px 바 내 우측 정렬 (globals.css) ── */}
      <nav
        className="site-nav"
        style={{
          opacity: layoutVisible ? 1 : 0,
          pointerEvents: layoutVisible ? 'auto' : 'none',
        }}
      >
        {NAV_ITEMS.map(({ label, href }) => (
          <Link
            key={label}
            href={href}
            className="site-nav-link"
            style={{ color: navOnLight ? '#0a0908' : '#ffffff' }}
          >
            {label}
          </Link>
        ))}
      </nav>
    </>
  )
}
