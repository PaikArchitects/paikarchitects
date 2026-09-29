import type { Metadata } from 'next'
import './globals.css'
import { SiteChromeProvider } from '@/components/SiteChromeContext'
import { SiteHeader } from '@/components/SiteHeader'
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, DEFAULT_OG_IMAGE } from '@/lib/seo'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s — ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: 'Chang-hyun Paik' }],
  openGraph: { type: 'website', siteName: SITE_NAME, locale: 'en_US', title: SITE_NAME, description: SITE_DESCRIPTION, url: '/', images: [DEFAULT_OG_IMAGE] },
  twitter: { card: 'summary_large_image', title: SITE_NAME, description: SITE_DESCRIPTION, images: [DEFAULT_OG_IMAGE.url] },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <SiteChromeProvider>
          <SiteHeader />
          {children}
        </SiteChromeProvider>
      </body>
    </html>
  )
}
