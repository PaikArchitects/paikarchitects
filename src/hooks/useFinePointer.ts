'use client'

import { useEffect, useState } from 'react'

/**
 * 입력 방식 판별 — hover 가능 + fine pointer(마우스/트랙패드)인지.
 * 레이아웃(뷰포트 폭)과 별개 축: 커서 치환 화살표 on/off 전용.
 * SSR 안전: 초기값 false, 마운트 후 동기화.
 */
export function useFinePointer(): boolean {
  const [fine, setFine] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
    setFine(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setFine(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return fine
}
