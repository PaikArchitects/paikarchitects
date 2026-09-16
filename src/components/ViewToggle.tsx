'use client'

// ── ViewToggle — 링월 ↔ 그리드 뷰 전환 (LANDING_SWITCH_P1 §4) ──
// 두 모드가 동일 컴포넌트를 쓴다. 현재 모드는 비링크 텍스트(굵게), 다른 모드는 링크(흐리게).
// 링크 대상은 각 모드의 인덱스 경로다. 대표 모드(landingMode) 연동은 P2에서 다룬다.

import Link from 'next/link'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"

export type ViewMode = 'ring' | 'grid'

const VIEWS: { mode: ViewMode; label: string; href: string }[] = [
  { mode: 'ring', label: 'Ring', href: '/work' },
  { mode: 'grid', label: 'Grid', href: '/work-grid' },
]

const BASE = {
  fontFamily: FONT,
  fontSize: 11,
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  color: '#080706',
  textDecoration: 'none',
  whiteSpace: 'nowrap' as const,
}

export function ViewToggle({ current }: { current: ViewMode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
      {VIEWS.map((v, i) => (
        <span key={v.mode} style={{ display: 'contents' }}>
          {/* 구분선 색은 명시한다 — 조상 color 상속 시 링월(흰 셸)에서 보이지 않던 결함 (260916) */}
          {i > 0 && <span style={{ opacity: 0.25, fontSize: 11, color: '#080706' }}>|</span>}
          {v.mode === current ? (
            <span style={{ ...BASE, fontWeight: 500 }} aria-current="page">{v.label}</span>
          ) : (
            <Link href={v.href} style={{ ...BASE, fontWeight: 300, opacity: 0.5 }}>{v.label}</Link>
          )}
        </span>
      ))}
    </div>
  )
}
