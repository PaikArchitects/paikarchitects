'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { projects } from '@/data/projects'
import type { Project, ProjectType } from '@/types'
import { SiteHeader } from '@/components/SiteHeader'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"
const BG   = '#F8F6F2'

const ALL_TYPES: ProjectType[] = [
  'Culture', 'Infrastructure', 'Work', 'Residential',
  'Sports', 'Healthcare', 'Hospitality', 'Film', 'Remodeling', 'Mixed-use',
]

// ─── Card ─────────────────────────────────────────────────────────────────────
function WorkCard({ project, mobile }: { project: Project; mobile: boolean }) {
  const [hovered, setHovered] = useState(false)
  const cardBg = project.coverImage
    ? `url(${project.coverImage}) center/cover no-repeat`
    : project.coverColor

  return (
    <Link
      href={`/work/${project.id}`}
      style={{ display: 'block', textDecoration: 'none' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ position: 'relative', overflow: 'hidden', height: mobile ? 290 : 340 }}>
        {/* Image always fills full card */}
        <div style={{
          position: 'absolute', inset: 0,
          background: cardBg,
          transform: hovered ? 'scale(1.06)' : 'scale(1)',
          transition: 'transform 0.72s cubic-bezier(0.25,0.46,0.45,0.94)',
        }} />

        {/* Text strip — solid light bg at rest → dark overlay on hover */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '13px 16px 15px',
          background: hovered ? 'rgba(0,0,0,0.68)' : '#F8F6F2',
          transition: 'background 0.42s ease',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{
              fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
              fontWeight: 300,
              color: hovered ? 'rgba(255,255,255,0.55)' : '#9E9E9A',
              transition: 'color 0.42s ease',
            }}>
              {project.type}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 300, letterSpacing: '0.06em',
              color: hovered ? 'rgba(255,255,255,0.45)' : '#C2C2BE',
              transition: 'color 0.42s ease',
            }}>
              {String(project.careerNo).padStart(3, '0')}
            </span>
          </div>
          <div style={{
            fontSize: 15, fontWeight: 400, lineHeight: 1.25, marginBottom: 5,
            textTransform: 'uppercase', letterSpacing: '0.03em',
            color: hovered ? '#ffffff' : '#111110',
            transition: 'color 0.42s ease',
          }}>
            {project.title}
          </div>
          <div style={{
            fontSize: 11, fontWeight: 300, letterSpacing: '0.02em',
            color: hovered ? 'rgba(255,255,255,0.50)' : '#B0B0AC',
            transition: 'color 0.42s ease',
          }}>
            {project.result}&nbsp;·&nbsp;{project.location ?? 'Seoul, KR'}
          </div>
        </div>
      </div>
    </Link>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function WorkPage() {
  const [filter, setFilter]   = useState<ProjectType | 'All'>('All')
  const [mobile, setMobile]   = useState(false)
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768)
    fn(); window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  const sorted    = [...projects].sort((a, b) => a.displayOrder - b.displayOrder)
  const filtered  = filter === 'All' ? sorted : sorted.filter(p => p.type === filter)
  const typeCounts = ALL_TYPES.reduce<Record<string, number>>((acc, t) => {
    acc[t] = projects.filter(p => p.type === t).length
    return acc
  }, {})
  const activeTypes = ALL_TYPES.filter(t => typeCounts[t] > 0)

  const PAD = mobile ? '18px 20px' : '28px 44px'

  return (
    <div style={{ fontFamily: FONT, background: BG, minHeight: '100vh', color: '#111110' }}>

      <SiteHeader variant="light" activePage="work" />


      {/* ── Filters ────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: mobile ? '6px 14px' : '4px 20px',
        padding: mobile ? '18px 20px' : '24px 44px',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
      }}>
        {/* All */}
        <button
          onClick={() => setFilter('All')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            display: 'flex', alignItems: 'baseline', gap: 5,
          }}
        >
          <span style={{
            width: 7, height: 7, borderRadius: '50%', display: 'inline-block', flexShrink: 0,
            background: filter === 'All' ? '#111110' : 'transparent',
            border: `1px solid ${filter === 'All' ? '#111110' : 'rgba(17,17,16,0.28)'}`,
            transition: 'all 0.2s',
          }} />
          <span style={{
            fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase',
            fontWeight: filter === 'All' ? 400 : 300,
            color: filter === 'All' ? '#111110' : 'rgba(17,17,16,0.40)',
            transition: 'color 0.2s',
          }}>
            All
          </span>
          <sup style={{ fontSize: 8, color: 'rgba(17,17,16,0.35)', fontWeight: 300, letterSpacing: 0 }}>
            {projects.length}
          </sup>
        </button>

        {activeTypes.map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'baseline', gap: 5 }}
          >
            <span style={{
              width: 7, height: 7, borderRadius: '50%', display: 'inline-block', flexShrink: 0,
              background: filter === type ? '#111110' : 'transparent',
              border: `1px solid ${filter === type ? '#111110' : 'rgba(17,17,16,0.28)'}`,
              transition: 'all 0.2s',
            }} />
            <span style={{
              fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase',
              fontWeight: filter === type ? 400 : 300,
              color: filter === type ? '#111110' : 'rgba(17,17,16,0.40)',
              transition: 'color 0.2s',
            }}>
              {type}
            </span>
            <sup style={{ fontSize: 8, color: 'rgba(17,17,16,0.35)', fontWeight: 300, letterSpacing: 0 }}>
              {typeCounts[type]}
            </sup>
          </button>
        ))}
      </div>

      {/* ── Grid ───────────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: mobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        gap: 12,
        padding: 0,
      }}>
        {filtered.map(project => (
          <WorkCard key={project.id} project={project} mobile={mobile} />
        ))}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer style={{
        padding: mobile ? '24px 20px' : '32px 44px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderTop: '1px solid rgba(0,0,0,0.06)',
        marginTop: 4,
      }}>
        <span style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(17,17,16,0.30)', fontWeight: 300 }}>
          {filtered.length} works · 2015–2024
        </span>
        <span style={{ fontSize: 9, color: 'rgba(17,17,16,0.22)', fontWeight: 300 }}>
          Chang Hyun Paik — Architect
        </span>
      </footer>
    </div>
  )
}
