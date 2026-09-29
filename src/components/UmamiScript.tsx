'use client'

import Script from 'next/script'
import { usePathname } from 'next/navigation'

const WEBSITE_ID = 'b785cdac-55f9-4983-b926-1bf2b792d91c'
const SCRIPT_SRC = 'https://cloud.umami.is/script.js'

// Umami 방문자 통계 — 프로덕션 도메인만 집계(data-domains), Studio 경로 제외
export default function UmamiScript() {
  const pathname = usePathname()
  if (pathname?.startsWith('/studio')) return null

  return (
    <Script
      src={SCRIPT_SRC}
      strategy="afterInteractive"
      data-website-id={WEBSITE_ID}
      data-domains="paikarchitects.com,www.paikarchitects.com"
    />
  )
}
