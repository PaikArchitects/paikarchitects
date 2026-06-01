import ProjectCard from './ProjectCard'
import { sortedProjects } from '@/data/projects'

// Row layout strategy — controls visual hierarchy
// Each row specifies grid class + how many projects from the sorted list
// Pattern: 2+3+2+3+2+3+2+3+3 = 23 projects

const ROW_LAYOUTS = [
  { cls: 'grid-row-2-wide',       count: 2 },  // [62% | 38%]  → Rows 1–2
  { cls: 'grid-row-3-equal',      count: 3 },  // [1/3|1/3|1/3]
  { cls: 'grid-row-2-mid-left',   count: 2 },  // [45% | 55%]
  { cls: 'grid-row-3-equal',      count: 3 },
  { cls: 'grid-row-2-wide-right', count: 2 },  // [58% | 42%]
  { cls: 'grid-row-3-equal',      count: 3 },
  { cls: 'grid-row-2-mid-right',  count: 2 },  // [42% | 58%]
  { cls: 'grid-row-3-equal',      count: 3 },
  { cls: 'grid-row-3-equal',      count: 3 },  // final row
]

export default function ProjectGrid() {
  let cursor = 0

  return (
    <main style={{ paddingTop: '60px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {ROW_LAYOUTS.map((row, rowIdx) => {
          const rowProjects = sortedProjects.slice(cursor, cursor + row.count)
          cursor += row.count

          return (
            <div key={rowIdx} className={`grid-row ${row.cls}`}>
              {rowProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )
        })}
      </div>
    </main>
  )
}
