'use client'

import type { Project } from '@/types'
import { cldThumb } from '@/lib/cloudinary'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"

interface MobileProjectSheetProps {
  open: boolean
  projects: Project[]            // filteredProjects
  filterTypes: string[]          // FILTER_TYPES
  activeFilter: string
  onFilter: (t: string) => void
  onSelect: (p: Project) => void
  onClose: () => void
}

/**
 * 모바일 바텀 시트 — 필터 칩 + 카드 리스트.
 * 닫혀 있어도 마운트 유지(translateY 100%) — 재오픈 시 스크롤 위치 보존.
 */
export function MobileProjectSheet({
  open, projects, filterTypes, activeFilter, onFilter, onSelect, onClose,
}: MobileProjectSheetProps) {
  return (
    <>
      <style>{`.mps-chips::-webkit-scrollbar { display: none }`}</style>

      {/* 스크림 — open일 때만 인터랙션 */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(8,7,6,0.35)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 450ms ease',
          zIndex: 59,
        }}
      />

      {/* 시트 — 직각 유지 (borderRadius 0) */}
      <div style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        height: '72vh',
        background: '#FFFFFF',
        transform: open ? 'translateY(0%)' : 'translateY(100%)',
        transition: 'transform 450ms cubic-bezier(0.7,0,0.3,1)',
        zIndex: 60,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: FONT,
      }}>
        {/* 핸들 행 */}
        <div
          onClick={onClose}
          style={{
            height: 40,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <div style={{ width: 32, height: 2, background: '#080706' }} />
        </div>

        {/* 필터 칩 행 — 가로 스크롤, 스크롤바 숨김. 데스크톱 필터와 동일 문법 */}
        <div
          className="mps-chips"
          style={{
            height: 36,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            overflowX: 'auto',
            padding: '0 20px',
            scrollbarWidth: 'none',
          }}
        >
          {filterTypes.map(t => (
            <button
              key={t}
              onClick={() => onFilter(t)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontFamily: FONT,
                fontSize: 11,
                fontWeight: t === activeFilter ? 500 : 300,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#080706',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {/* 불릿 — 선택된 항목 앞에만 */}
              <span style={{
                fontSize: 7,
                lineHeight: 1,
                opacity: t === activeFilter ? 1 : 0,
                transition: 'opacity 200ms',
              }}>●</span>
              {t}
            </button>
          ))}
        </div>

        {/* 카드 리스트 */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          padding: '8px 20px 40px',
          gap: 28,
        }}>
          {projects.map(p => (
            <div key={p.id} onClick={() => onSelect(p)} style={{ cursor: 'pointer' }}>
              {p.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cldThumb(p.coverImage, 720)}
                  alt={p.title}
                  loading="lazy"
                  style={{ width: '100%', aspectRatio: '2 / 1', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <div style={{ width: '100%', aspectRatio: '2 / 1', background: p.coverColor }} />
              )}
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 450, color: '#080706' }}>
                  {p.title}
                </div>
                <div style={{
                  fontSize: 11,
                  fontWeight: 300,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: '#080706',
                  opacity: 0.6,
                  marginTop: 3,
                }}>
                  {p.type}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
