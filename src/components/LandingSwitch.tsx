'use client'

// ── LandingSwitch — 첫 화면(/) 모드 분기 (LANDINGMODE_P1 §3-3) ──
// ring: 현행 링월 / grid: 그리드 + ACP 인트로 / random: 마운트 후 세션 단위로 ring·grid 중 결정.
// /work·/work-grid 라우트는 이 컴포넌트를 거치지 않는다.

import { useLayoutEffect, useState } from 'react'
import type { Project } from '@/types'
import type { LandingMode } from '@/lib/sanity/queries'
import { LandingExperience } from '@/components/LandingExperience'
import { GridExperience } from '@/components/GridExperience'
import { useSiteChrome } from '@/components/SiteChromeContext'

type ResolvedMode = 'ring' | 'grid'

const RANDOM_STORAGE_KEY = 'landing-random-mode'

interface LandingSwitchProps {
  projects: Project[]
  mode: LandingMode
}

export function LandingSwitch({ projects, mode }: LandingSwitchProps) {
  if (mode === 'random') return <RandomLanding projects={projects} />
  return <ResolvedLanding projects={projects} mode={mode} />
}

function ResolvedLanding({ projects, mode }: { projects: Project[]; mode: ResolvedMode }) {
  return mode === 'grid'
    ? <LandingGrid projects={projects} />
    : <LandingExperience projects={projects} />
}

/**
 * Random — 같은 세션에서는 /로 돌아와도 같은 모드(sessionStorage).
 * 결정 전 첫 렌더는 null(서버 HTML도 null) → hydration 불일치 없음.
 * sessionStorage 접근 실패 시 저장 없이 매번 무작위.
 */
function RandomLanding({ projects }: { projects: Project[] }) {
  const [resolved, setResolved] = useState<ResolvedMode | null>(null)

  useLayoutEffect(() => {
    let stored: string | null = null
    try { stored = sessionStorage.getItem(RANDOM_STORAGE_KEY) } catch {}

    if (stored === 'ring' || stored === 'grid') {
      setResolved(stored)
      return
    }

    const picked: ResolvedMode = Math.random() < 0.5 ? 'ring' : 'grid'
    try { sessionStorage.setItem(RANDOM_STORAGE_KEY, picked) } catch {}
    setResolved(picked)
  }, [])

  if (!resolved) return null
  return <ResolvedLanding projects={projects} mode={resolved} />
}

/**
 * 그리드 첫 화면 — GridExperience를 수정하지 않고 바깥에서 두 가지만 보완한다.
 * 1) 헤더 색: /에서 SiteHeader는 컨텍스트 값을 따르므로 LandingExperience와 같은 값(true)을
 *    첫 페인트 전(useLayoutEffect)에 설정 — 흰 배경 위 흰 글씨 프레임 방지.
 * 2) 인트로 동안 숨김: introPhase가 done이 되면 LandingExperience와 같은 곡선으로 공개.
 *    인트로 스킵 시에는 처음부터 보이며 트랜지션 없음.
 *    흰 셸(바깥)은 항상 표시하고 페이드는 안쪽에만 — body 배경(#080706)이 인트로 동안 드러나지 않도록.
 *    LandingExperience도 루트 흰 배경은 상시, opacity 게이트는 내부 요소에만 건다.
 * 래퍼에 transform·filter·will-change 금지 — 내부 fixed 요소의 기준 박스가 바뀌지 않도록.
 */
function LandingGrid({ projects }: { projects: Project[] }) {
  const { introPhase, introSkipped, setWordmarkOnLight, setNavOnLight } = useSiteChrome()

  useLayoutEffect(() => {
    setWordmarkOnLight(true)
    setNavOnLight(true)
  }, [setWordmarkOnLight, setNavOnLight])

  const visible = introPhase === 'done'

  return (
    // 그리드는 문서 스크롤이므로 LandingExperience의 height 100vh + overflow hidden 대신 minHeight만 준다
    <div style={{ background: '#FFFFFF', minHeight: '100vh' }}>
      <div style={{
        opacity: visible ? 1 : 0,
        transition: introSkipped ? 'none' : 'opacity 400ms ease-out',
      }}>
        <GridExperience projects={projects} />
      </div>
    </div>
  )
}
