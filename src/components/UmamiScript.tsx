'use client'

import Script from 'next/script'
import { usePathname } from 'next/navigation'

const WEBSITE_ID = 'b785cdac-55f9-4983-b926-1bf2b792d91c'
const SCRIPT_SRC = 'https://cloud.umami.is/script.js'
const BEFORE_SEND = 'umamiBeforeSend'

// 260930 UMAMI_STUDIO_EXCLUDE v1 — / 에서 로드된 트래커가 pushState로 /studio에 진입해도
// 전송되지 않도록 차단(data-before-send: false 반환 시 전송 취소). 트래커가 전송 시점마다 조회함.
if (typeof window !== 'undefined') {
  ;(window as unknown as Record<string, unknown>)[BEFORE_SEND] = (_type: string, payload: { url?: string }) => {
    try {
      if (new URL(payload?.url ?? '', window.location.href).pathname.startsWith('/studio')) return false
    } catch {}
    return payload
  }
}

// Umami 방문자 통계 — 프로덕션 도메인만 집계(data-domains), Studio 경로 제외
// (직접 로드: 스크립트 미주입 / 클라이언트 이동: before-send 차단)
export default function UmamiScript() {
  const pathname = usePathname()
  if (pathname?.startsWith('/studio')) return null

  return (
    <Script
      src={SCRIPT_SRC}
      strategy="afterInteractive"
      data-website-id={WEBSITE_ID}
      data-domains="paikarchitects.com,www.paikarchitects.com"
      data-before-send={BEFORE_SEND}
    />
  )
}
