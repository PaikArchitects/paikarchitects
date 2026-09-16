'use client'

// ── MobileFilterPanel — 모바일(<1024) 필터 글리프 + 우측 슬라이드 패널 (LANDING_SWITCH_P1_3 §2) ──
// 사양 원본: MobileProjectWall.tsx 필터 글리프·스크림·패널 블록(동결). 본 컴포넌트는 그 사양의 복제다.
// ⚠ 두 곳이 동기화 대상이다 — 한쪽 수치를 바꾸면 다른 쪽도 바꾼다.
//    MobileProjectWall 동결 해제 시 그쪽을 본 컴포넌트로 교체해 단일 원본으로 합친다.

import { useEffect, useState } from 'react'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"
// PANEL_MS·EASE는 MobileProjectWall.tsx의 비export 상수라 import할 수 없다 — 원문 값을 복제한다
// 출처: MobileProjectWall.tsx:68 (PANEL_MS), MobileProjectWall.tsx:22 (EASE)
const PANEL_MS = 380
const EASE = 'cubic-bezier(0.7, 0, 0.3, 1)'

interface MobileFilterPanelProps {
  types: string[]
  active: string
  onSelect: (t: string) => void
  visible?: boolean        // 글리프 노출 여부(링월의 revealed에 대응). 기본 true
}

export function MobileFilterPanel({ types, active, onSelect, visible = true }: MobileFilterPanelProps) {
  const [open, setOpen] = useState(false)

  // 글리프가 숨겨지면 패널도 닫는다
  useEffect(() => { if (!visible) setOpen(false) }, [visible])

  return visible ? (
    <>
      {/* 트리거 — 헤더 존 우측. 길이가 체감하는 수평선 3개 (햄버거와 구분).
           SVG 통일 기하: viewBox 0 0 18 14, 선 중심 y=1/7/13 — 햄버거와 전체 높이·두께·수직 위치 동일 */}
      <button
        aria-label="Filter"
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: 56,
          height: 56,
          zIndex: 95,   // 헤더 바 90 위, 워드마크 200 아래
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          color: '#080706',
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? 'auto' : 'none',
          transition: 'opacity 400ms ease-out',
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
          <line x1="3" y1="7" x2="15" y2="7" />
          <line x1="6" y1="13" x2="12" y2="13" />
        </svg>
      </button>

      {/* 스크림 — 탭 시 닫힘 */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(8, 7, 6, 0.25)',
          zIndex: 110,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: `opacity ${PANEL_MS}ms ${EASE}`,
        }}
      />

      {/* 패널 — 우측 슬라이드 인 */}
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 'min(62vw, 280px)',
        background: '#FFFFFF',
        zIndex: 120,
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: `transform ${PANEL_MS}ms ${EASE}`,
        boxShadow: '-8px 0 24px rgba(0, 0, 0, 0.06)',
        padding: '72px 16px 24px 24px',
        overflowY: 'auto',
        fontFamily: FONT,
      }}>
        {types.map(t => (
          <button
            key={t}
            onClick={() => {
              setOpen(false)
              onSelect(t)
            }}
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 8,
              width: '100%',
              padding: '12px 0',
              background: 'none',
              border: 'none',
              textAlign: 'left',
              cursor: 'pointer',
              fontFamily: FONT,
              fontSize: 12,
              fontWeight: t === active ? 500 : 300,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#080706',
              wordBreak: 'keep-all',   // 장문 라벨 2줄 허용
            }}
          >
            {/* 불릿 — 활성 항목 앞에만 (칩 문법 승계) */}
            <span style={{
              fontSize: 7,
              lineHeight: 1,
              flexShrink: 0,
              opacity: t === active ? 1 : 0,
              transition: 'opacity 200ms',
            }}>●</span>
            <span>{t}</span>
          </button>
        ))}
      </div>
    </>
  ) : null
}
