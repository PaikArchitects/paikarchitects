import type { Metadata } from 'next'
import './globals.css'
import { SiteChromeProvider } from '@/components/SiteChromeContext'
import { SiteHeader } from '@/components/SiteHeader'

export const metadata: Metadata = {
  title: {
    default: 'Paik Architects',
    template: '%s — Paik Architects',
  },
  description:
    'Paik Architects is the architecture practice of Chang Hyun Paik, based in Seoul, South Korea. A decade of professional practice spanning culture, infrastructure, and civic work.',
  openGraph: {
    title: 'Paik Architects',
    description:
      'The architecture practice of Chang Hyun Paik. A decade of professional work spanning culture, infrastructure, and civic projects.',
    type: 'website',
    url: 'https://paikarchitects.com',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <SiteChromeProvider>
          <SiteHeader />
          {children}
        </SiteChromeProvider>
      </body>
    </html>
  )
}
