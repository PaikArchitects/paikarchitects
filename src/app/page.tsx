import Header from '@/components/Header'
import ProjectGrid from '@/components/ProjectGrid'

export default function HomePage() {
  return (
    <>
      <Header />
      <ProjectGrid />
      <footer className="site-footer">
        <span className="site-footer-left">
          23 works · 2015–2024 · Seoul
        </span>
        <span className="site-footer-right">
          Chang Hyun Paik — Architect
        </span>
      </footer>
    </>
  )
}
