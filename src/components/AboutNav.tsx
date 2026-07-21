'use client'

import { useState } from 'react'

const ITEMS = [
  { id: 'position',       label: 'Position'         },
  { id: 'preoccupations', label: 'Preoccupations'   },
  { id: 'cv',             label: 'Curriculum Vitae' },
] as const

/* 활성 항목은 클릭 상태로만 판정한다 — 스크롤 위치 측정(IntersectionObserver·
   스크롤 리스너·getBoundingClientRect)은 쓰지 않는다. 앵커 내비의 통상적 동작. */
export function AboutNav() {
  const [active, setActive] = useState<string>('position')

  return (
    <nav className="about-nav">
      <div className="about-nav-row">
        {ITEMS.map(({ id, label }) => (
          /* onClick에 preventDefault 없음 — 앵커 점프는 브라우저가 처리하고,
             상태는 시각 표시용으로만 쓴다 */
          <a
            key={id}
            href={`#${id}`}
            onClick={() => setActive(id)}
            className="about-nav-link"
            style={{ fontWeight: id === active ? 500 : 300 }}
          >
            <span
              className="about-nav-bullet"
              style={{ opacity: id === active ? 1 : 0 }}
            >
              ●
            </span>
            {label}
          </a>
        ))}
      </div>
    </nav>
  )
}
