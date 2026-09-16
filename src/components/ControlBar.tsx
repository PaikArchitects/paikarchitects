'use client'

// ── ControlBar — 링월·그리드 공용 컨트롤 바 (LANDING_SWITCH_P1_1 §2) ──
// 필터(좌, 가로 스크롤) + 뷰 토글(우). 두 모드가 이 컴포넌트 하나를 렌더하므로
// 위치·간격·타이포가 구조적으로 일치한다. 높이는 상수 CONTROL_BAR_H로 고정한다 —
// 링월은 이 값으로 본문 시작점을 파생한다(측정 반응형 금지).
// 오버플로 감지(scrollLeft/scrollWidth)는 레이아웃 치수가 아니라 페이드 표시 전용이다.
// 모바일 칩 숨김은 mobileFilters=false + CSS 미디어쿼리(첫 페인트 적용). filtersVisible은 JS 상태 기반 페이드 전용.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ViewToggle, type ViewMode } from './ViewToggle'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"

export const CONTROL_BAR_UI_PAD = 34     // 좌우 여백 — 그리드 UI_PAD와 동일값
const PAD_TOP = 8
const PAD_BOTTOM = 20
const ROW_H = 13                          // 11px 텍스트 1행
export const CONTROL_BAR_H = PAD_TOP + ROW_H + PAD_BOTTOM   // = 41
const CHIP_GAP = 24
const FADE_W = 32

interface ControlBarProps {
  types: string[]
  active: string
  onSelect: (t: string) => void
  view: ViewMode
  filtersVisible?: boolean   // 링월 idle 랜딩(/)에서는 필터만 숨긴다. 토글은 상시
  // false면 모바일(<1024)에서 칩 영역을 CSS로 즉시 숨긴다(전환 없음, 첫 페인트부터).
  // JS 판정(isMobile) 의존 시 초기값 false로 인한 깜빡임이 생긴다 (P1_4 §0)
  mobileFilters?: boolean
}

export function ControlBar({ types, active, onSelect, view, filtersVisible = true, mobileFilters = true }: ControlBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [fade, setFade] = useState({ left: false, right: false })

  const updateFade = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const left = el.scrollLeft > 1
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
    setFade(f => (f.left === left && f.right === right ? f : { left, right }))
  }, [])

  useLayoutEffect(() => {
    updateFade()
    window.addEventListener('resize', updateFade)
    return () => window.removeEventListener('resize', updateFade)
  }, [updateFade, types])

  // 세로 휠 → 가로 스크롤. 넘칠 때만 가로채고 페이지 스크롤을 막는다(passive:false 필요)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const fadeStyle = (side: 'left' | 'right', on: boolean) => ({
    position: 'absolute' as const,
    top: 0,
    bottom: 0,
    [side]: 0,
    width: FADE_W,
    display: 'flex',
    alignItems: 'center',
    justifyContent: side === 'left' ? 'flex-start' : 'flex-end',
    background: `linear-gradient(to ${side === 'left' ? 'right' : 'left'}, #FFFFFF, rgba(255,255,255,0))`,
    color: '#080706',
    fontSize: 13,
    opacity: on ? 1 : 0,
    transition: 'opacity 200ms ease',
    pointerEvents: 'none' as const,
  })

  return (
    <div style={{
      height: CONTROL_BAR_H,
      boxSizing: 'border-box',
      paddingTop: PAD_TOP,
      paddingBottom: PAD_BOTTOM,
      paddingLeft: CONTROL_BAR_UI_PAD,
      paddingRight: CONTROL_BAR_UI_PAD,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 24,
      fontFamily: FONT,
    }}>
      {!mobileFilters && (
        <style>{`
          @media (max-width: 1023px) {
            .cb-filters-nomobile {
              visibility: hidden !important;
              opacity: 0 !important;
              transition: none !important;
              pointer-events: none !important;
            }
          }
        `}</style>
      )}
      <div
        className={mobileFilters ? undefined : 'cb-filters-nomobile'}
        style={{
        position: 'relative',
        flex: 1,
        minWidth: 0,
        height: ROW_H,
        opacity: filtersVisible ? 1 : 0,
        pointerEvents: filtersVisible ? 'auto' : 'none',
        transition: 'opacity 300ms ease-out',
      }}>
        <div
          ref={scrollRef}
          className="mpw-chips"
          onScroll={updateFade}
          style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: CHIP_GAP,
            overflowX: 'auto',
            overflowY: 'hidden',
            touchAction: 'pan-x',
          }}
        >
          {types.map(t => (
            <button
              key={t}
              onClick={() => onSelect(t)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontFamily: FONT,
                fontSize: 11,
                lineHeight: `${ROW_H}px`,
                fontWeight: t === active ? 500 : 300,
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
              <span style={{
                fontSize: 7,
                lineHeight: 1,
                opacity: t === active ? 1 : 0,
                transition: 'opacity 200ms',
              }}>●</span>
              {t}
            </button>
          ))}
        </div>
        <div style={fadeStyle('left', fade.left)}>‹</div>
        <div style={fadeStyle('right', fade.right)}>›</div>
      </div>

      <ViewToggle current={view} />
    </div>
  )
}
