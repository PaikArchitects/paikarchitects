'use client'

import { createContext, useContext, useState, useLayoutEffect, useEffect, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'

export type IntroPhase = 'wordmark' | 'collapsed' | 'done'

interface SiteChromeContextValue {
  introPhase: IntroPhase
  introSkipped: boolean
  wordmarkOnLight: boolean
  navOnLight: boolean
  setWordmarkOnLight: (value: boolean) => void
  setNavOnLight: (value: boolean) => void
}

const SiteChromeContext = createContext<SiteChromeContextValue>({
  introPhase: 'done',
  introSkipped: true,
  wordmarkOnLight: false,
  navOnLight: false,
  setWordmarkOnLight: () => {},
  setNavOnLight: () => {},
})

const INTRO_STORAGE_KEY = 'acp-intro-played'

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

export function SiteChromeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [introPhase, setIntroPhase] = useState<IntroPhase>('done')
  const [introSkipped, setIntroSkipped] = useState(true)
  const [wordmarkOnLight, setWordmarkOnLight] = useState(false)
  const [navOnLight, setNavOnLight] = useState(false)

  // 진입 시퀀스: 세션당 최초 진입이면서 랜딩(/)일 때만 1회 재생.
  // 그 외(다른 페이지 최초 진입, 재방문 등)에는 최종 헤더 상태를 즉시 표시.
  useIsomorphicLayoutEffect(() => {
    let played = true
    try {
      played = sessionStorage.getItem(INTRO_STORAGE_KEY) === '1'
    } catch {
      played = true
    }

    if (played || pathname !== '/') {
      try { sessionStorage.setItem(INTRO_STORAGE_KEY, '1') } catch {}
      return
    }

    try { sessionStorage.setItem(INTRO_STORAGE_KEY, '1') } catch {}
    setIntroSkipped(false)
    setIntroPhase('wordmark')
    const t1 = setTimeout(() => setIntroPhase('collapsed'), 3200)
    const t2 = setTimeout(() => setIntroPhase('done'), 4800)
    return () => { clearTimeout(t1); clearTimeout(t2) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <SiteChromeContext.Provider value={{
      introPhase,
      introSkipped,
      wordmarkOnLight,
      navOnLight,
      setWordmarkOnLight,
      setNavOnLight,
    }}>
      {children}
    </SiteChromeContext.Provider>
  )
}

export function useSiteChrome() {
  return useContext(SiteChromeContext)
}
