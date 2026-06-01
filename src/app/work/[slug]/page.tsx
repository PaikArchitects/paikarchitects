import { projects } from '@/data/projects'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return projects.map((p) => ({ slug: p.id }))
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params
  const project = projects.find((p) => p.id === slug)
  if (!project) notFound()

  return (
    <div style={{ minHeight: '100vh', padding: '80px 40px 40px' }}>
      <Link
        href="/"
        style={{
          fontFamily: 'var(--font-dm-sans)',
          fontSize: '9px',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'rgba(240,235,226,0.4)',
          textDecoration: 'none',
          display: 'block',
          marginBottom: '48px',
        }}
      >
        ← Back
      </Link>

      <div
        style={{
          backgroundColor: project.coverColor,
          width: '100%',
          height: '60vh',
          marginBottom: '48px',
        }}
      />

      <div style={{ maxWidth: '640px' }}>
        <p style={{
          fontFamily: 'var(--font-dm-sans)',
          fontSize: '10px',
          letterSpacing: '0.16em',
          color: 'rgba(240,235,226,0.35)',
          marginBottom: '12px',
        }}>
          {String(project.careerNo).padStart(3, '0')} — {project.year} — {project.type}
        </p>
        <h1 style={{
          fontFamily: 'var(--font-cormorant)',
          fontSize: '36px',
          fontWeight: 400,
          lineHeight: 1.15,
          color: 'rgba(240,235,226,0.92)',
          marginBottom: '8px',
        }}>
          {project.title}
        </h1>
        <p style={{
          fontFamily: 'var(--font-dm-sans)',
          fontSize: '11px',
          color: 'rgba(240,235,226,0.4)',
          letterSpacing: '0.06em',
        }}>
          {project.result} · {project.status}
          {project.location ? ` · ${project.location}` : ''}
        </p>
      </div>
    </div>
  )
}
