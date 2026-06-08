import { SiteHeader } from '@/components/SiteHeader'
import Link from 'next/link'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"

export default function AboutPage() {
  return (
    <div style={{ fontFamily: FONT, background: '#FFFFFF', minHeight: '100vh', color: '#111110' }}>

      <SiteHeader variant="light" activePage="about" />

      <div style={{ maxWidth: 680, padding: '64px 44px 100px', margin: '0 auto' }}>

        <p style={{
          fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase',
          color: 'rgba(17,17,16,0.30)', fontWeight: 300, marginBottom: 40,
        }}>
          About
        </p>

        <h1 style={{
          fontSize: 32, fontWeight: 400, letterSpacing: '0.04em',
          color: '#111110', marginBottom: 36, lineHeight: 1.2,
        }}>
          Chang Hyun Paik
        </h1>

        <div style={{
          fontSize: 15, fontWeight: 300, lineHeight: 1.9,
          color: 'rgba(17,17,16,0.65)', maxWidth: 520,
        }}>
          <p style={{ marginBottom: 24 }}>
            Chang Hyun Paik is an architect based in Seoul, South Korea. With over
            a decade of professional experience at SPACE GROUP, one of Korea&apos;s
            most influential architecture firms, he has developed a design language
            rooted in contextual clarity, material honesty, and spatial precision.
          </p>
          <p style={{ marginBottom: 24 }}>
            His approach is driven by a belief that architecture begins with
            attentiveness to the place — its history, topography, and cultural
            rhythms — and culminates in built forms that quietly endure over time.
          </p>
          <p>
            He values architecture not only as an act of construction, but as a
            method of interpretation — where material and memory intersect.
          </p>
        </div>

        <div id="contact" style={{
          marginTop: 72, paddingTop: 36,
          borderTop: '0.5px solid rgba(17,17,16,0.08)',
        }}>
          <p style={{
            fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase',
            color: 'rgba(17,17,16,0.30)', fontWeight: 300, marginBottom: 16,
          }}>
            Contact
          </p>
          <Link href="mailto:archipaik@gmail.com" style={{
            fontSize: 18, fontWeight: 300, letterSpacing: '0.02em',
            color: 'rgba(17,17,16,0.70)', textDecoration: 'none',
          }}>
            archipaik@gmail.com
          </Link>
        </div>

      </div>
    </div>
  )
}