'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSiteChrome } from './SiteChromeContext'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"

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

  // ── 모바일 햄버거 메뉴 — 전역 크롬이므로 SiteHeader 소유 (§8). 라우트 변경 시 자동 닫힘 ──
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

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
        {NAV_ITEMS.map(({ label, href }) => {
          const current = pathname === href || (href === '/work' && pathname.startsWith('/work'))
          return (
            <Link
              key={label}
              href={href}
              className={current ? 'site-nav-link is-current' : 'site-nav-link'}
              style={{ color: navOnLight ? '#0a0908' : '#ffffff' }}
            >
              {label}
            </Link>
          )
        })}
      </nav>

      {/* ── MOBILE HAMBURGER — <768px 전용 (globals.css가 표시 제어).
           SVG 통일 기하: viewBox 0 0 18 14, 선 중심 y=1/7/13 (중심 간격 6px 정수 — 균질 렌더) ── */}
      <button
        className="mobile-menu-btn"
        aria-label="Menu"
        onClick={() => setMenuOpen(o => !o)}
        style={{
          color: '#080706',
          opacity: layoutVisible ? 1 : 0,
          pointerEvents: layoutVisible ? 'auto' : 'none',
        }}
      >
        <svg
          viewBox="0 0 18 14"
          width={18}
          height={14}
          style={{ display: 'block' }}
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="butt"
        >
          <line x1="0" y1="1" x2="18" y2="1" />
          <line x1="0" y1="7" x2="18" y2="7" />
          <line x1="0" y1="13" x2="18" y2="13" />
        </svg>
      </button>

      {/* 스크림 — 탭 시 닫힘 */}
      <div
        className={menuOpen ? 'mobile-menu-scrim open' : 'mobile-menu-scrim'}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />

      {/* 좌측 메뉴 패널 — 필터 패널의 미러 (§8-2) */}
      <nav className={menuOpen ? 'mobile-menu-panel open' : 'mobile-menu-panel'}>
        {NAV_ITEMS.map(({ label, href }) => {
          const current = pathname === href || (href === '/work' && pathname.startsWith('/work'))
          return (
            <Link
              key={label}
              href={href}
              onClick={() => setMenuOpen(false)}
              style={{
                display: 'block',
                padding: '14px 0',
                fontFamily: FONT,
                fontSize: 13,
                fontWeight: current ? 500 : 300,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                color: '#0a0908',
              }}
            >
              {label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
