import type { CSSProperties } from 'react'
import type { LocaleString } from '@/types'

interface BilingualTextProps {
  value: LocaleString
  order: 'en-first' | 'ko-first'
  primaryStyle: CSSProperties    // 주(主) 언어 스타일
  secondaryStyle: CSSProperties  // 종(從) 언어 스타일
  gap?: number                   // 두 줄 사이 간격 (기본 2)
}

/**
 * en 필수, ko 선택. ko 없으면 영문만 렌더.
 * order='en-first': 영문 위(primary) / 한글 아래(secondary) — 전 호출부 기본값 (260720 통일)
 * order='ko-first': 한글 위 / 영문 아래 — 현재 사용처 없음. 향후 재조정용으로 유지
 * 위계(크기·굵기·명도)는 primaryStyle/secondaryStyle이 결정한다.
 * en은 항상 primaryStyle, ko는 항상 secondaryStyle (순서와 무관하게 영문이 주).
 */
export function BilingualText({ value, order, primaryStyle, secondaryStyle, gap = 2 }: BilingualTextProps) {
  const en = <div style={primaryStyle}>{value.en}</div>
  const ko = value.ko ? <div style={secondaryStyle}>{value.ko}</div> : null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {order === 'ko-first' ? <>{ko}{en}</> : <>{en}{ko}</>}
    </div>
  )
}
