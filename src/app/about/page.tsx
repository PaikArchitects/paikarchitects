import Header from '@/components/Header'
import Link from 'next/link'

export default function AboutPage() {
  return (
    <>
      <Header />
      <div style={{ minHeight: '100vh', padding: '120px 40px 80px', maxWidth: '720px', margin: '0 auto' }}>
        <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(240,235,226,0.3)', marginBottom: '40px' }}>
          About
        </p>
        <h1 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '42px', fontWeight: 400, lineHeight: 1.1, color: 'rgba(240,235,226,0.9)', marginBottom: '32px' }}>
          Chang Hyun Paik
        </h1>
        <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: '14px', fontWeight: 300, lineHeight: 1.8, color: 'rgba(240,235,226,0.55)', maxWidth: '520px' }}>
          <p style={{ marginBottom: '24px' }}>
            Chang Hyun Paik is an architect based in Seoul, South Korea. With over a decade of professional experience at SPACE GROUP, one of Korea&apos;s most influential architecture firms, he has developed a design language rooted in contextual clarity, material honesty, and spatial precision.
          </p>
          <p style={{ marginBottom: '24px' }}>
            His approach is driven by a belief that architecture begins with attentiveness to the place — its history, topography, and cultural rhythms — and culminates in built forms that quietly endure over time.
          </p>
          <p>
            He values architecture not only as an act of construction, but as a method of interpretation — where material and memory intersect.
          </p>
        </div>

        <div id="contact" style={{ marginTop: '64px', paddingTop: '32px', borderTop: '0.5px solid rgba(240,235,226,0.08)' }}>
          <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(240,235,226,0.3)', marginBottom: '16px' }}>
            Contact
          </p>
          <Link href="mailto:archipaik@gmail.com" style={{ fontFamily: 'var(--font-cormorant)', fontSize: '18px', fontWeight: 400, color: 'rgba(240,235,226,0.7)', textDecoration: 'none' }}>
            archipaik@gmail.com
          </Link>
        </div>
      </div>
    </>
  )
}
