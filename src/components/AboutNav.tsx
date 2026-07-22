'use client'

import { useEffect, useState } from 'react'

const ITEMS = [
  { id: 'position',       label: 'Position'         },
  { id: 'preoccupations', label: 'Preoccupations'   },
  { id: 'cv',             label: 'Curriculum Vitae' },
] as const

export function AboutNav() {
  const [active, setActive] = useState<string>('position')

  useEffect(() => {
    const sections = ITEMS
      .map(({ id }) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)

    if (sections.length === 0) return

    // 헤더 셸(86px) 아래를 판정 기준선으로. 화면 상단부에 걸친 섹션을 활성으로 본다.
    const observer = new IntersectionObserver(
      (entries) => {
        // 교차 중인 섹션 중 가장 위(문서 순서상 먼저)를 활성으로
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) {
          setActive(visible[0].target.id)
        }
      },
      {
        // 상단 96px(셸+여백) 지점을 기준선으로, 하단은 넉넉히 잘라
        // "상단에 막 진입한 섹션"이 활성이 되게 한다.
        rootMargin: '-96px 0px -60% 0px',
        threshold: 0,
      }
    )

    sections.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <nav className="about-nav">
      <div className="about-nav-row">
        {ITEMS.map(({ id, label }) => (
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
