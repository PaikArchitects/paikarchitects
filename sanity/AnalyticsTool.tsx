'use client'

const SHARE_URL = 'https://cloud.umami.is/share/3RKmeMF6CDcqrM1A'

// Studio ANALYTICS 툴 — Umami 공유 대시보드를 툴 영역 전체에 임베드
export default function AnalyticsTool() {
  return (
    <div style={{ height: '100%' }}>
      <iframe
        src={SHARE_URL}
        title="Analytics"
        style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
      />
    </div>
  )
}
