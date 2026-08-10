'use client'

// ── 모바일 그리드 콘텐츠 — 세로 스크롤 (GRID_MOBILE §2) ──
//
// 데스크톱 그리드는 GridContentArea(가로 트랙), 모바일(<1024)은 이 컴포넌트(세로 스택)를 쓴다.
// 슬라이드 렌더는 MobileProjectWall의 렌더러(MobileSlide·MobileInfoSlide)를 재사용해
// 타입 분기(7종 exhaustive switch)가 세 곳으로 갈라지지 않게 한다.
//
// morph는 데스크톱 전용이다 — 세로 스크롤 진입에 가로 트랙 morph는 성립하지 않으므로
// 여기서는 mode·enterRect를 받지 않고 즉시 표시한다.
//
// 레이아웃은 링월 모바일의 ExpandedBlock(세로 스택 [히어로 → 코드·타이틀 → 정보 → 슬라이드])과
// 동일 규약이다. MobileInfoSlide는 **영문 타이틀 행이 바깥에서 렌더된다는 전제**로 한글 타이틀만
// 렌더하므로(MobileProjectWall 397~404행), 히어로·코드·영문 타이틀은 여기서 직접 렌더해야 한다.

import { useEffect, useRef } from 'react'
import type { Project, ProjectSlide } from '@/types'
import { sanityCard } from '@/lib/imageUrl'
import { MobileSlide, MobileInfoSlide } from './MobileProjectWall'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"

// 링월 모바일 세로 스택 상수 미러 — MobileInfoSlide의 음수 marginTop(-SLIDE_GAP + 6)이
// 부모 gap = SLIDE_GAP을 전제하므로 값이 어긋나면 정보 블록 간격이 무너진다.
const SLIDE_GAP = 24
const HERO_RATIO = 3 / 2                 // 커버는 3:2 고정 (sanityCard 크롭과 일치)
const STACK_BOTTOM_PAD = 48
const SIDE_PAD = 16

// 히어로(커버 3:2)가 첫 슬라이드 — slides 첫 항목이 커버와 동일 이미지면 중복 제거.
// MobileProjectWall의 getRestSlides(71행)와 동일 로직. 그쪽은 export 대상이 아니므로 미러한다.
function getRestSlides(project: Project): ProjectSlide[] {
  const slides = project.slides ?? []
  if (slides.length > 0 && slides[0].kind === 'image' && slides[0].src === project.coverImage) {
    return slides.slice(1)
  }
  return slides
}

export function MobileGridContent({ project, onBack }: {
  project: Project
  onBack: () => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // 프로젝트 변경 시 최상단으로 (MobileProjectWall 896행과 동일 규약)
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [project.id])

  const restSlides = getRestSlides(project)

  return (
    <div
      ref={scrollRef}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#FFFFFF',
        overflowY: 'auto',
        overscrollBehaviorY: 'contain',   // 스크롤 체이닝 차단 (부모 그리드로 전파 방지)
        WebkitOverflowScrolling: 'touch',
        zIndex: 100,                      // GridContentArea(1252행)와 동일 — 밀도바(60) 위
        fontFamily: FONT,
        color: '#080706',
      }}
    >
      {/* BACK — 상단 고정이 아니라 흐름 상단에 둔다(모바일 헤더 바와 충돌 방지) */}
      <button
        onClick={onBack}
        style={{
          display: 'block', margin: '72px 20px 16px', padding: 0,
          border: 'none', background: 'none', cursor: 'pointer',
          fontFamily: FONT, fontSize: 11, fontWeight: 300,
          letterSpacing: '0.12em', textTransform: 'uppercase', color: '#080706',
        }}
      >
        ← BACK
      </button>

      {/* 세로 스택 — 모든 슬라이드 동일 폭. 스크롤이 곧 진행도 (ExpandedBlock 577행과 동일) */}
      <div style={{
        marginLeft: SIDE_PAD,
        marginRight: SIDE_PAD,
        display: 'flex',
        flexDirection: 'column',
        gap: SLIDE_GAP,
        paddingBottom: STACK_BOTTOM_PAD,
      }}>
        {/* ① 히어로 — 3:2 고정 */}
        <div style={{ width: '100%', aspectRatio: String(HERO_RATIO) }}>
          {project.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={sanityCard(project.coverImage, 800, project.coverHotspot)}
              alt={project.title.en}
              draggable={false}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: project.coverColor ?? '#1E1C18' }} />
          )}
        </div>

        {/* 코드 + 영문 타이틀 — 한 세트. 부모 gap에서 제외해 결속 관계를 맞춘다 */}
        <div style={{ marginTop: -SLIDE_GAP + 12 }}>
          <div style={{
            fontSize: 8,
            fontWeight: 300,
            letterSpacing: '0.15em',
            opacity: 0.35,
            marginBottom: 4,
          }}>
            {String(project.careerNo).padStart(3, '0')}
          </div>
          <div style={{
            fontSize: 18,
            fontWeight: 600,
            lineHeight: 1.35,
            wordBreak: 'keep-all',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden',
          }}>
            {project.title.en}
          </div>
        </div>

        {/* ② 정보(메타) — 링월 모바일과 동일 렌더러 */}
        <MobileInfoSlide project={project} />

        {/* ③ 이후 슬라이드들 */}
        {restSlides.map((slide, idx) => (
          <MobileSlide key={idx} slide={slide} />
        ))}
      </div>
    </div>
  )
}
