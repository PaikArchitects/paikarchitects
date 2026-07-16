import Link from 'next/link'
import Image from 'next/image'
import { Project } from '@/types'

interface ProjectCardProps {
  project: Project
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const careerCode = String(project.careerNo).padStart(3, '0')

  return (
    <Link
      href={`/work/${project.id}`}
      className="project-card"
      aria-label={project.title.en}
    >
      {/* Background: real image or placeholder color */}
      {project.coverImage ? (
        <div className="project-card-bg">
          <Image
            src={project.coverImage}
            alt={project.title.en}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
      ) : (
        <div
          className="project-card-bg"
          style={{ backgroundColor: project.coverColor }}
        />
      )}

      {/* Static career number — very dim, always visible */}
      <span className="project-card-static-num">{careerCode}</span>

      {/* Hover overlay — fades in */}
      <div className="project-card-overlay">
        <p className="project-card-num">
          {careerCode} — {project.year} — {project.type}
        </p>
        <h2 className="project-card-title">{project.title.en}</h2>
        <p className="project-card-meta">
          {project.result ? `${project.result} · ` : ''}{project.status}
          {project.location ? ` · ${project.location}` : ''}
        </p>
      </div>
    </Link>
  )
}
