'use client'

// ── MobileProjectWall — 가상 링 렌더러 (MOBILE_RING_SPEC) ──
//
// 구세대 스크롤 문서 모델 폐기. 위치·티어·불투명도는 useRingWall의 offset과
// 애니메이션 높이 배열로부터의 순수 함수 파생이다 (데스크톱 ProjectWall 문법 동일).
// 브라우징 레이어(링)와 열람 레이어(트랙)를 분리 — 탭 시 FLIP 모프로 교대 (§6).
// 필터는 우측 슬라이드 패널(§7), 내비게이션은 SiteHeader의 햄버거 메뉴(§8)가 전담.
// 상태 소유는 LandingExperience (URL 동기화 일원화).

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CreditsSlide, DiagramSetSlide, ImageSlide, PortableTextBlock, Project, ProjectSlide, QuoteSlide, TextSlide } from '@/types'
import { BilingualText } from '@/lib/bilingual'
import { sanityCard } from '@/lib/imageUrl'
import { shuffle } from '@/lib/shuffle'
import { circDist, mod, useRingWall } from '@/hooks/useRingWall'
import { sizeLabel, splitRole } from '@/lib/projectMeta'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"

const HEADER_H = 56          // 모바일 헤더 바 높이 (SiteHeader .mobile-header-bar와 일치)
const EASE = 'cubic-bezier(0.7, 0, 0.3, 1)'
const MORPH_MS = 500         // FLIP 모프 + 레이어 교대 페이드
const BACK_ROW_H = 36        // 확장 블록 BACK 행 높이

// ── 링 티어 기하 — 폭의 연속 함수로 파생. 브레이크포인트 없음 (MOBILE_TIER_SCALE_SPEC §2) ──
// 티어0 = 히어로 폭 × 92%, 단 절대 상한 400px (태블릿 세로 과대화 방지)
const HERO_INSET = 32          // 트랙 히어로의 좌우 인셋 — HERO_W = 100vw - 32px와 일치
const TIER0_RATIO = 0.92       // 히어로 대비 티어0 폭
const TIER0_MAX = 400          // 절대 상한 (px)
const TIER0_MIN = 240          // 절대 하한 — 초소형 뷰포트 안전판 (폭 관찰 이전 프레임의 0나눗셈 방지)
// 티어1·2는 티어0에 대한 고정 비율 (현행 201/288, 114/288 승계)
const TIER1_RATIO = 0.698
const TIER2_RATIO = 0.396
const TIER_ASPECT = 3 / 2      // 전 티어 3:2 유지
const BELOW_TEXT_H = 40        // 이미지 하단 텍스트 행 (프로젝트명 + 용도 상하 배열)
const GAP = 14                 // ITEM_GAP 승계
const OPACITY = { 0: 1, 1: 0.45, 2: 0.3 } as const

// 티어 폭 파생 — 컨테이너 폭(px)이 유일한 입력. 순수 함수
const tierWidths = (cw: number) => {
  const hero = Math.max(cw - HERO_INSET, 0)
  const w0 = Math.min(Math.max(hero * TIER0_RATIO, TIER0_MIN), TIER0_MAX)
  return [w0, w0 * TIER1_RATIO, w0 * TIER2_RATIO] as const
}
// 슬롯 높이 = 이미지 높이(폭/1.5) + 텍스트 행. 전 티어 텍스트 하단 배치이므로 일괄 가산
const tierSlotHeights = (cw: number) => {
  const [w0, w1, w2] = tierWidths(cw)
  return [
    w0 / TIER_ASPECT + BELOW_TEXT_H,
    w1 / TIER_ASPECT + BELOW_TEXT_H,
    w2 / TIER_ASPECT + BELOW_TEXT_H,
  ] as const
}

// ── 세로 스택 상수 — 모든 슬라이드 동일 폭, 높이는 콘텐츠 비율이 결정 ──
const HERO_W = 'calc(100vw - 32px)'      // 기존 유지 (FLIP 모프 종착점 산출이 의존)
const HERO_RATIO = 3 / 2                 // 커버는 3:2 고정 (sanityCard 크롭과 일치)
const SLIDE_GAP = 24                     // 슬라이드 간 수직 간격
const DIAGRAM_RATIO_FALLBACK = 3 / 2     // ratio 메타 부재 시 폴백
const STACK_BOTTOM_PAD = 48              // 스택 하단 여백 — 마지막 슬라이드 이후 스크롤 여유

// ── 셔플 (§4, v4.1 상수 승계) ──
const SHUFFLE_INTERVAL_MS = 6000
const SHUFFLE_RESUME_MS = 8000

// ── 슬라이드 패널 (§7) ──
const PANEL_MS = 380

// 히어로(커버 3:2)가 트랙 첫 슬라이드 — slides 첫 항목이 커버와 동일 이미지면 중복 제거
function getRestSlides(project: Project): ProjectSlide[] {
  const slides = project.slides ?? []
  if (slides.length > 0 && slides[0].kind === 'image' && slides[0].src === project.coverImage) {
    return slides.slice(1)
  }
  return slides
}

function splitCaption(caption: string): { label: string; description: string } {
  const sepIdx = caption.indexOf('—')
  if (sepIdx < 0) return { label: caption, description: '' }
  return {
    label: caption.slice(0, sepIdx).trim(),
    description: caption.slice(sepIdx + 1).trim(),
  }
}

// ── 캡션 — 자연 높이. 2줄 초과 시 ellipsis ──
// secondary=true: 한글 종(從) 스타일 — 영문 캡션 아래에 작고 옅게
function MobileCaption({ label, description, secondary = false }: {
  label: string
  description: string
  secondary?: boolean
}) {
  return (
    <div style={{ paddingTop: secondary ? 2 : 6, width: '100%' }}>
      <div style={{
        fontFamily: FONT,
        fontSize: secondary ? 9 : 10,
        fontWeight: 300,
        lineHeight: 1.35,
        color: '#0a0908',
        opacity: secondary ? 0.4 : 0.55,
        textAlign: 'center',        // ← 추가. 데스크톱 캡션과 정합
        wordBreak: 'keep-all',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical' as const,
        overflow: 'hidden',
      }}>
        <span style={{ fontWeight: secondary ? 400 : 500 }}>{label}</span>
        {description && ` — ${description}`}
      </div>
    </div>
  )
}

// ── 이미지 슬라이드 — 폭 100%, 높이는 ratio(w/h)가 결정. aspectRatio로 사전 예약 ──
function MobileImageSlide({ slide }: { slide: ImageSlide }) {
  const en = slide.caption?.en ? splitCaption(slide.caption.en) : null
  const ko = slide.caption?.ko ? splitCaption(slide.caption.ko) : null

  return (
    <div style={{ width: '100%' }}>
      {/* aspectRatio가 로드 전 높이를 예약 → 레이아웃 시프트 없음 */}
      <div style={{ width: '100%', aspectRatio: String(slide.ratio ?? DIAGRAM_RATIO_FALLBACK) }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={slide.src}
          alt=""
          loading="lazy"
          draggable={false}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        />
      </div>
      {en && <MobileCaption label={en.label} description={en.description} />}
      {ko && <MobileCaption label={ko.label} description={ko.description} secondary />}
    </div>
  )
}

// ── 다이어그램 세트 — 캐러셀 유지 (동일 프레임 내 전환으로 형태 변화를 읽힌다).
//    탭 = 다음 서브슬라이드 + 타이머 리셋, 자동 진행 3000ms 공존 ──
function MobileDiagramSetSlide({ slide }: { slide: DiagramSetSlide }) {
  const [subIdx, setSubIdx] = useState(0)
  const downYRef = useRef<number | null>(null)
  const pinchRef = useRef(false)          // 멀티터치(핀치) 진행 중 — 탭 전환 억제
  const total = slide.items.length

  // setTimeout을 subIdx에 키잉 — 탭/자동 어느 쪽이든 진행 시 타이머가 자연 리셋된다
  useEffect(() => {
    const t = setTimeout(() => {
      setSubIdx(i => (i + 1) % total)
    }, slide.autoAdvanceMs ?? 3000)
    return () => clearTimeout(t)
  }, [subIdx, total, slide.autoAdvanceMs])

  const item = slide.items[subIdx]
  // 프레임 비율 — 첫 항목 기준 고정. 서브슬라이드 전환 시 높이가 변하면 스크롤이 튄다
  const frameRatio = slide.items[0].ratio ?? DIAGRAM_RATIO_FALLBACK
  // 묶음 내 한 항목이라도 한글이 있으면 전 항목에 한글 줄 높이를 예약한다
  const setHasKo = slide.items.some(it => it.label.ko || it.description.ko)

  return (
    <div
      style={{ width: '100%' }}
      onPointerDown={e => {
        // 멀티터치(핀치) 개시 — 탭 후보 무효화. 확대하려다 다이어그램이 넘어가는 것을 막는다
        if (!e.isPrimary) { downYRef.current = null; pinchRef.current = true; return }
        pinchRef.current = false
        downYRef.current = e.clientY
      }}
      onClick={e => {
        // 탭 판정 — 수직 이동 5px 미만 (스크롤과 구분). 핀치 중이면 억제
        if (pinchRef.current) { pinchRef.current = false; return }
        const dy = downYRef.current == null ? 0 : Math.abs(e.clientY - downYRef.current)
        if (dy < 5) setSubIdx(i => (i + 1) % total)
      }}
    >
      {/* 고정 프레임 — 전 서브슬라이드가 동일 위치·크기에 겹쳐 렌더 */}
      <div style={{ width: '100%', aspectRatio: String(frameRatio), position: 'relative' }}>
        {slide.items.map((it, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={it.src}
            alt=""
            loading="lazy"
            draggable={false}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              opacity: i === subIdx ? 1 : 0,
              transition: 'opacity 300ms ease',
            }}
          />
        ))}
      </div>
      {/* 캡션 + 카운터 — 서브슬라이드 전환 시 높이 흔들림 방지: 2줄 고정 예약.
          한글 병기 세트는 묶음 전체 기준으로 예약한다 — 항목마다 ko 유무가 달라도 높이 불변 */}
      <div style={{ minHeight: 10 * 1.35 * 2 + 6 + (setHasKo ? 9 * 1.35 * 2 + 2 : 0) }}>
        <MobileCaption label={item.label.en} description={item.description.en} />
        {(item.label.ko || item.description.ko) && (
          <MobileCaption label={item.label.ko ?? ''} description={item.description.ko ?? ''} secondary />
        )}
      </div>
      <div style={{
        fontFamily: FONT,
        fontSize: 9,
        fontWeight: 300,
        color: '#0a0908',
        opacity: 0.45,
        textAlign: 'center',
        marginTop: 4,
      }}>
        {String(subIdx + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
      </div>
    </div>
  )
}

// ── 본문 텍스트 — 폭 100%, 높이 자연 결정. 좌정렬 ──
function renderMobileBlocks(blocks: PortableTextBlock[], opacity: number) {
  return blocks.map((block, i) => (
    <p key={block._key ?? i} style={{
      margin: 0,
      fontFamily: FONT,
      fontSize: 12,
      fontWeight: 300,
      lineHeight: 1.75,
      letterSpacing: '-0.01em',
      color: '#0a0908',
      opacity,
      wordBreak: 'keep-all',
      whiteSpace: 'pre-line',
    }}>
      {block.children.map((span, j) => {
        const bold = span.marks?.includes('strong')
        const italic = span.marks?.includes('em')
        if (!bold && !italic) return span.text
        return (
          <span key={span._key ?? j} style={{
            fontWeight: bold ? 500 : undefined,
            fontStyle: italic ? 'italic' : undefined,
          }}>
            {span.text}
          </span>
        )
      })}
    </p>
  ))
}

function MobileTextSlide({ slide }: { slide: TextSlide }) {
  return (
    <div style={{ width: '100%', padding: '4px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 영문 (주) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{renderMobileBlocks(slide.body.en, 1)}</div>
      {/* 한글 (종) — 있을 때만 */}
      {slide.body.ko && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{renderMobileBlocks(slide.body.ko, 0.6)}</div>
      )}
    </div>
  )
}

// ── 인용구 — 중앙정렬, 좌우 인셋으로 본문과 위계 구분 ──
function MobileQuoteSlide({ slide }: { slide: QuoteSlide }) {
  return (
    <div style={{
      width: '100%',
      padding: '8px 16px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 12,
    }}>
      <div style={{
        fontFamily: FONT,
        fontSize: 13,
        fontWeight: 300,
        lineHeight: 1.7,
        letterSpacing: '-0.01em',
        color: '#0a0908',
        textAlign: 'center',
        wordBreak: 'keep-all',
      }}>
        {`“${slide.text.en}”`}
      </div>
      {/* 한글 (종) — 따옴표, 있을 때만 */}
      {slide.text.ko && (
        <div style={{
          fontFamily: FONT,
          fontSize: 11,
          fontWeight: 300,
          lineHeight: 1.7,
          letterSpacing: '-0.01em',
          color: '#0a0908',
          opacity: 0.6,
          textAlign: 'center',
          wordBreak: 'keep-all',
        }}>
          {`“${slide.text.ko}”`}
        </div>
      )}
      {slide.attribution && (
        <div style={{
          fontFamily: FONT,
          fontSize: 9,
          fontWeight: 400,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: '#0a0908',
          opacity: 0.55,
          textAlign: 'center',
        }}>
          {slide.attribution}
        </div>
      )}
    </div>
  )
}

// ── 크레딧 — 폭 100%, 높이는 행 수가 결정 ──
function MobileCreditsSlide({ slide }: { slide: CreditsSlide }) {
  return (
    <div style={{ width: '100%', padding: '8px 0' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {slide.rows.map((row, i) => (
          <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
            <div style={{
              width: 96,
              flexShrink: 0,
              textAlign: 'right',
              fontFamily: FONT,
              fontSize: 9,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#0a0908',
              opacity: 0.5,
            }}>
              {row.label}
            </div>
            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 400, color: '#0a0908' }}>
              {row.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 정보 — 히어로 바로 아래 고정. 폭 100%, 높이 자연 결정 ──
function MobileInfoSlide({ project }: { project: Project }) {
  const roleParts = project.role ? splitRole(project.role) : null
  return (
    <div style={{
      width: '100%',
      padding: '4px 0',
      marginTop: -SLIDE_GAP + 6,     // 히어로·타이틀과의 결속
      marginBottom: Math.round(SLIDE_GAP * 0.1),   // 정보↔다음 슬라이드 간격 +10% (24 → 26.4 ≈ 26)
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      fontFamily: FONT,
      color: '#080706',
    }}>
      {/* 타이틀 한글(종) — 영문 타이틀 행은 모프 종착점이라 위에서 별도 렌더된다.
          데스크톱·모바일 모두 en-first (260720 통일) */}
      {(project.title.ko || project.subtitle) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: -10 }}>
          {project.title.ko && (
            <div style={{ fontSize: 12, fontWeight: 400, lineHeight: 1.3, opacity: 0.6, wordBreak: 'keep-all' }}>
              {project.title.ko}
            </div>
          )}
          {project.subtitle && (
            <BilingualText
              value={project.subtitle}
              order="en-first"
              primaryStyle={{ fontSize: 11, fontWeight: 300, lineHeight: 1.4, opacity: 0.75, wordBreak: 'keep-all' }}
              secondaryStyle={{ fontSize: 10, fontWeight: 300, lineHeight: 1.4, opacity: 0.5, wordBreak: 'keep-all' }}
              gap={1}
            />
          )}
        </div>
      )}

      {/* AWARDS — 수상 있을 때만. 데스크톱과 동일 로직, fontSize만 14 */}
      {(() => {
        const visible = project.awards?.filter(a => a.visible !== false) ?? []
        if (visible.length === 0) return null
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {visible.map((a, i) => (
              <div key={i} style={{
                fontSize: 14,
                fontWeight: 400,
                color: '#b89773',
                letterSpacing: '0.01em',
                lineHeight: 1.35,
                wordBreak: 'keep-all',
              }}>
                {a.title}
              </div>
            ))}
          </div>
        )
      })()}

      <MobileMetaField label="CLIENT" value={project.client} />
      <MobileMetaField label="LOCATION" value={project.location} />

      {/* 모바일은 2×2 그리드 — 4열 수평은 폭이 부족하다 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <MobileMetaField label="TYPOLOGY" value={project.type} />
        <MobileMetaField
          label={project.size ? sizeLabel(project.size) : 'SIZE'}
          value={project.size}
        />
        <MobileMetaField label="STATUS" value={project.status} />
        <MobileMetaField label="YEAR" value={String(project.year)} />
      </div>

      <div>
        <div style={{ fontSize: 8, fontWeight: 300, letterSpacing: '0.1em', opacity: 0.45 }}>
          ROLE
        </div>
        {roleParts ? (
          <>
            <div style={{
              fontSize: 10,
              fontWeight: 400,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginTop: 3,
            }}>
              {roleParts.position}
            </div>
            {roleParts.tasks && (
              <div style={{
                fontSize: 9,
                fontWeight: 300,
                lineHeight: 1.6,
                opacity: 0.5,
                marginTop: 3,
                wordBreak: 'keep-all',
              }}>
                {roleParts.tasks}
              </div>
            )}
          </>
        ) : (
          <div style={{ fontSize: 10, marginTop: 3, opacity: 0.25 }}>—</div>
        )}
      </div>
    </div>
  )
}

// ── 모바일 메타 필드 ──
function MobileMetaField({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div style={{
        fontFamily: FONT,
        fontSize: 8,
        fontWeight: 300,
        letterSpacing: '0.1em',
        opacity: 0.45,
        whiteSpace: 'nowrap',
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: FONT,
        fontSize: 10,
        fontWeight: 400,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        marginTop: 2,
        lineHeight: 1.4,
        wordBreak: 'keep-all',
        opacity: value ? 1 : 0.25,
      }}>
        {value || '—'}
      </div>
    </div>
  )
}

function MobileSlide({ slide }: { slide: ProjectSlide }) {
  switch (slide.kind) {
    case 'image':
      return <MobileImageSlide slide={slide} />
    case 'diagramSet':
      return <MobileDiagramSetSlide slide={slide} />
    case 'credits':
      return <MobileCreditsSlide slide={slide} />
    case 'text':
      return <MobileTextSlide slide={slide} />
    case 'quote':
      return <MobileQuoteSlide slide={slide} />
  }
}

// ── 확장 블록 — BACK 행 / 세로 스택 [①히어로 타이틀 ②정보 ③이후 슬라이드] ──
function ExpandedBlock({ project, onBack, heroRef, heroHidden, titleMorphing, titleRef }: {
  project: Project
  onBack: () => void
  heroRef: (el: HTMLDivElement | null) => void
  heroHidden: boolean
  titleMorphing: boolean                            // 상단 텍스트 → 타이틀 직접 보간 중 — 실제 행은 숨김
  titleRef: (el: HTMLDivElement | null) => void
}) {
  const restSlides = getRestSlides(project)

  return (
    <div>
      {/* BACK 행 — 타이틀 보간 중 숨김, 모프 완료 시점에 타이틀 위로 페이드 인 */}
      <button
        onClick={onBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          height: BACK_ROW_H,
          padding: '0 16px',
          background: 'none',
          border: 'none',
          textAlign: 'left',
          fontFamily: FONT,
          fontSize: 11,
          fontWeight: 300,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#080706',
          cursor: 'pointer',
          opacity: titleMorphing ? 0 : 1,
          transition: 'opacity 200ms ease',
        }}
      >
        ← BACK
      </button>

      {/* 세로 스택 — 모든 슬라이드 동일 폭. 스크롤이 곧 진행도 */}
      <div
        style={{
          marginLeft: 16,
          marginRight: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: SLIDE_GAP,
          paddingBottom: STACK_BOTTOM_PAD,
        }}
      >
        {/* ① 히어로 — 성장 모프의 종착. 3:2 고정 */}
        <div
          ref={heroRef}
          style={{ width: '100%', aspectRatio: String(HERO_RATIO), opacity: heroHidden ? 0 : 1 }}
        >
          {project.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={sanityCard(project.coverImage, 800, project.coverHotspot)}
              alt={project.title.en}
              draggable={false}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: project.coverColor }} />
          )}
        </div>

        {/* 타이틀 행 — 히어로 직후. 보간 중에는 오버레이가 대신 렌더 */}
        <div
          ref={titleRef}
          style={{
            fontFamily: FONT,
            fontSize: 18,
            fontWeight: 600,
            lineHeight: 1.35,
            color: '#080706',
            wordBreak: 'keep-all',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden',
            opacity: titleMorphing ? 0 : 1,
            marginTop: -SLIDE_GAP + 12,   // 히어로와의 간격을 좁힌다 (히어로와 한 세트로 읽힌다)
          }}
        >
          {project.title.en}
        </div>

        {/* ② 정보 — 히어로 직후 고정 */}
        <MobileInfoSlide project={project} />

        {/* ③ 이후 슬라이드들 */}
        {restSlides.map((slide, idx) => (
          <MobileSlide key={idx} slide={slide} />
        ))}
      </div>
    </div>
  )
}

interface MobileProjectWallProps {
  projects: Project[]            // filteredProjects
  filterTypes: string[]          // FILTER_TYPES
  activeFilter: string
  onFilter: (t: string) => void
  activeSlug: string | null
  onActivate: (slug: string) => void
  onDeactivate: () => void
  revealed: boolean              // layoutVisible (introPhase === 'done')
  showFilters: boolean           // [미사용] 필터 글리프가 revealed 동기 상시 표시로 전환되며 유일 소비처 소멸 — 외부 계약(LandingExperience) 불변을 위해 시그니처 유지
  initialHighlight?: string | null   // 구간 전환 승계 — 초기 정착 시 이 카드를 중앙에 놓는다
  onHighlight?: (slug: string) => void   // 중앙 카드 변경 통보 — 부모가 승계용으로 기억
}

interface ViewRect {
  top: number
  left: number
  width: number
  height: number
}

// 모프 개시 시점 캡처 — 썸네일/히어로 rect + (d=0 경로) 타이틀 rect
interface PendingMorph {
  slug: string
  from: ViewRect
  titleFrom: { top: number; left: number } | null
}

interface TitleMorph {
  text: string
  from: { top: number; left: number; fontSize: number; fontWeight: number }
  to: { top: number; left: number; fontSize: number; fontWeight: number }
}

interface MorphState {
  slug: string
  src: string | null
  color: string
  from: ViewRect
  to: ViewRect
  title: TitleMorph | null
}

export function MobileProjectWall({
  projects, filterTypes, activeFilter, onFilter,
  activeSlug, onActivate, onDeactivate, revealed,
  initialHighlight, onHighlight,
}: MobileProjectWallProps) {
  // ── 표시 순서 — 초기값은 projects 그대로(SSR/hydration 안전), 마운트 후 1회 셔플 (§4) ──
  const [order, setOrder] = useState<Project[]>(projects)
  const [shuffled, setShuffled] = useState(false)   // 마운트 셔플 완료 플래그 — 경합 해소용 (HANDOFF_RACE_FIX_SPEC §2)
  const [phase, setPhase] = useState<'idle' | 'exit' | 'enter'>('idle')
  const orderRef = useRef(order)
  useEffect(() => { orderRef.current = order }, [order])

  const N = order.length

  // 마운트 직후 1프레임 전환 비활성 — 딥링크 진입 시 모프 생략 게이트 (§6-4)
  const [transitionsOn, setTransitionsOn] = useState(false)
  const transitionsOnRef = useRef(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => {
      transitionsOnRef.current = true
      setTransitionsOn(true)
    }))
    return () => cancelAnimationFrame(raf)
  }, [])

  // ── 티어 중심 = round(offset) — 별도 하이라이트 상태 변수 없음 (§3-2) ──
  const isLoopRef = useRef(true)
  const centerIdxRef = useRef(0)
  const [centerTick, setCenterTick] = useState(0)   // getSlotHeight 재생성 → 훅 웨이크 트리거

  // 컨테이너 폭 — 훅이 관찰. 첫 프레임은 0이며, ResizeObserver가 즉시 실측값을 커밋한다
  const [cw, setCw] = useState(0)
  const cwRef = useRef(0)
  cwRef.current = cw

  // 티어 슬롯 높이 — cw 파생. cw=0이면 하한(TIER0_MIN)이 적용되어 유효한 값이 나온다
  const slotHs = useMemo(() => tierSlotHeights(cw), [cw])
  const minSlot = slotHs[2]

  const getSlotHeight = useCallback((i: number) => {
    const c = centerIdxRef.current
    const d = isLoopRef.current ? circDist(i, c, N) : Math.abs(i - c)
    return slotHs[Math.min(d, 2)]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [N, centerTick, slotHs])

  const ring = useRingWall({ count: N, getSlotHeight, gap: GAP, minSlotHeight: minSlot })
  isLoopRef.current = ring.isLoop
  const { moveTo, jumpTo } = ring

  // 훅이 관찰한 폭을 상태로 승격 — 다음 렌더에서 티어가 재파생된다
  useEffect(() => {
    if (ring.containerWidth !== cwRef.current) setCw(ring.containerWidth)
  }, [ring.containerWidth])

  // 렌더 단계 파생 — round(offset)이 바뀌면 티어 목표 재생성 (렌더 중 상태 갱신 패턴)
  const liveCenter = N > 0
    ? (ring.isLoop ? mod(Math.round(ring.offset), N) : Math.min(Math.max(Math.round(ring.offset), 0), N - 1))
    : 0
  if (liveCenter !== centerIdxRef.current) {
    centerIdxRef.current = liveCenter
    setCenterTick(t => t + 1)
  }

  // 중앙 카드 변경 통보 — 부모가 구간 전환 승계용으로 기억한다 (HIGHLIGHT_HANDOFF_SPEC)
  useEffect(() => {
    if (!onHighlight) return
    const p = orderRef.current[centerIdxRef.current]
    if (p) onHighlight(p.id)
  }, [centerTick, onHighlight])

  // ── 셔플 큐 (§4) — advanceShuffle은 moveTo 한 줄. scrollIntoView·종료 추정 타이머 없음 ──
  const queueRef = useRef<string[]>([])
  const queueIdxRef = useRef(0)
  const lastUserRef = useRef(0)
  const lastShuffleRef = useRef(0)
  const pendingJumpRef = useRef(false)

  // 마운트 후 1회 Fisher-Yates — 인트로가 교체를 가린다
  useEffect(() => {
    setOrder(prev => shuffle(prev))
    setShuffled(true)   // setOrder와 같은 배치에서 커밋 → shuffled===true 렌더에서 order는 셔플 후 값 (§2)
  }, [])

  // order 교체 시 큐 재생성 + (필터 스왑이면) 큐 첫 항목으로 즉시 점프 (§5)
  useEffect(() => {
    queueRef.current = shuffle(order.map(p => p.id))
    queueIdxRef.current = 0
    if (pendingJumpRef.current) {
      pendingJumpRef.current = false
      const idx = Math.max(0, order.findIndex(p => p.id === queueRef.current[0]))
      centerIdxRef.current = idx   // jumpTo가 재구성할 높이 배열의 중심을 선반영
      setCenterTick(t => t + 1)
      jumpTo(idx)
      queueIdxRef.current = 1
      lastShuffleRef.current = Date.now()
    }
  }, [order, jumpTo])

  // 초기 정착 — revealed 직후 1회. 승계 하이라이트가 있으면 그것을, 없으면 랜덤 큐 첫 항목을 중앙으로 (§4)
  const settledInitRef = useRef(false)
  useEffect(() => {
    if (!revealed || !shuffled || settledInitRef.current) return   // shuffled 가드 — 셔플 커밋 후에만 정착 (§2)
    settledInitRef.current = true
    if (activeSlug) return   // 딥링크 — 활성 카드가 이미 중앙 (§6-4)

    // 승계 우선 — 데스크톱에서 보고 있던 프로젝트를 이어받는다 (HIGHLIGHT_HANDOFF_SPEC)
    // orderRef 대신 order 렌더 값 사용 — 셔플 후 배열과 정합 (HANDOFF_RACE_FIX_SPEC §2)
    const handoff = initialHighlight
      ? order.findIndex(p => p.id === initialHighlight)
      : -1
    const idx = handoff >= 0
      ? handoff
      : Math.max(0, order.findIndex(p => p.id === queueRef.current[0]))

    centerIdxRef.current = idx
    setCenterTick(t => t + 1)
    jumpTo(idx)
    // 승계 시에도 큐는 정상 진행 — 다음 셔플이 큐 첫 항목부터 시작하지 않도록 인덱스 보정
    queueIdxRef.current = handoff >= 0 ? 0 : 1
    lastShuffleRef.current = Date.now()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, shuffled, order, jumpTo])

  const advanceShuffle = useCallback(() => {
    if (queueIdxRef.current >= queueRef.current.length) {
      queueRef.current = shuffle(queueRef.current)
      queueIdxRef.current = 0
    }
    const slug = queueRef.current[queueIdxRef.current]
    queueIdxRef.current += 1
    const idx = orderRef.current.findIndex(p => p.id === slug)
    if (idx < 0) return
    lastShuffleRef.current = Date.now()
    moveTo(idx)
  }, [moveTo])

  // 셔플 타이머 — 6000ms 주기 / 조작 후 8000ms 유예 / 500ms 폴링. N<2 미가동 (§4·§9)
  useEffect(() => {
    if (!revealed || activeSlug !== null || phase !== 'idle' || N < 2) return
    lastShuffleRef.current = Date.now()
    const id = setInterval(() => {
      const now = Date.now()
      if (now - lastUserRef.current < SHUFFLE_RESUME_MS) return
      if (now - lastShuffleRef.current < SHUFFLE_INTERVAL_MS) return
      advanceShuffle()
    }, 500)
    return () => clearInterval(id)
  }, [revealed, activeSlug, phase, N, advanceShuffle])

  // ── 필터 2단 시퀀스 — exit 캐스케이드 → 셔플 스왑 + jumpTo → enter 캐스케이드 (§5) ──
  const sourceRef = useRef(projects)
  useEffect(() => {
    if (projects === sourceRef.current) return
    setPhase('exit')                       // 1) 전 카드 페이드아웃, 중앙에서 바깥으로
    const t = setTimeout(() => {
      sourceRef.current = projects
      pendingJumpRef.current = true        // 새 큐 첫 항목으로 jumpTo (order 효과에서)
      setOrder(shuffle(projects))          // 2) 스왑 — 필터마다 새로 셔플
      setPhase('enter')
    }, 350)
    return () => clearTimeout(t)
  }, [projects])

  // enter → 더블 rAF 후 idle — 재입장 캐스케이드 재생
  useEffect(() => {
    if (phase !== 'enter') return
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setPhase('idle')))
    return () => cancelAnimationFrame(raf)
  }, [phase])

  // ── 열람 레이어 (§6) — 브라우징(링)/열람(트랙) 분리. 상태는 부모 소유 ──
  const activeProject = activeSlug
    ? order.find(p => p.id === activeSlug) ?? projects.find(p => p.id === activeSlug) ?? null
    : null
  const [closingProject, setClosingProject] = useState<Project | null>(null)
  const viewerProject = activeProject ?? closingProject

  // 열람 레이어 페이드 인 — 마운트 프레임은 opacity 0, 더블 rAF 후 1 (딥링크는 즉시)
  const [viewerIn, setViewerIn] = useState(activeSlug !== null)
  useEffect(() => {
    if (!activeSlug) {
      setViewerIn(false)
      return
    }
    if (!transitionsOnRef.current) {
      setViewerIn(true)
      return
    }
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setViewerIn(true)))
    return () => cancelAnimationFrame(raf)
  }, [activeSlug])

  const viewerHeroRef = useRef<HTMLDivElement | null>(null)
  const viewerTitleRef = useRef<HTMLDivElement | null>(null)
  const viewerScrollRef = useRef<HTMLDivElement>(null)

  // 활성 전환 시 스크롤 초기화 — 다른 프로젝트를 열면 최상단에서 시작한다 (§5)
  useEffect(() => {
    if (activeSlug && viewerScrollRef.current) viewerScrollRef.current.scrollTop = 0
  }, [activeSlug])
  const thumbEls = useRef<Record<string, HTMLDivElement | null>>({})
  const topTitleEls = useRef<Record<string, HTMLDivElement | null>>({})

  // ── FLIP 모프 — CSS transition 500ms (rAF 러너·JS 이징 폐기, §6-2) ──
  const [morph, setMorph] = useState<MorphState | null>(null)
  const [morphGo, setMorphGo] = useState(false)
  const morphSlug = morph?.slug ?? null
  const morphTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const morphRafRef = useRef<number | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const startMorph = useCallback((m: MorphState) => {
    if (morphTimerRef.current) clearTimeout(morphTimerRef.current)
    if (morphRafRef.current != null) cancelAnimationFrame(morphRafRef.current)
    setMorph(m)
    setMorphGo(false)
    morphRafRef.current = requestAnimationFrame(() => {
      morphRafRef.current = requestAnimationFrame(() => setMorphGo(true))
    })
    morphTimerRef.current = setTimeout(() => {
      setMorph(null)
      setMorphGo(false)
    }, MORPH_MS + 50)
  }, [])

  const pendingTapRef = useRef<PendingMorph | null>(null)
  const pendingBackRef = useRef<PendingMorph | null>(null)

  // 탭 — 썸네일 rect 캡처(+d=0이면 상단 타이틀 rect) → onActivate + moveTo (§6-2)
  const handleTap = (p: Project, index: number) => {
    if (phase !== 'idle') return
    if (p.id === activeSlug) return
    lastUserRef.current = Date.now()
    const thumb = thumbEls.current[p.id]
    if (thumb && transitionsOnRef.current) {
      const r = thumb.getBoundingClientRect()
      const d = ring.isLoop ? circDist(index, centerIdxRef.current, N) : Math.abs(index - centerIdxRef.current)
      const topTitle = d === 0 ? topTitleEls.current[p.id] : null
      const tr = topTitle ? topTitle.getBoundingClientRect() : null
      pendingTapRef.current = {
        slug: p.id,
        from: { top: r.top, left: r.left, width: r.width, height: r.height },
        titleFrom: tr ? { top: tr.top, left: tr.left } : null,
      }
    }
    onActivate(p.id)          // URL push는 부모 소유
    moveTo(index)             // BACK 복귀 대비 중앙 정렬
  }

  // BACK — 히어로/타이틀 rect 캡처 → 열람 레이어 유지(페이드아웃) → onDeactivate (§6-3)
  const handleBack = () => {
    lastUserRef.current = Date.now()
    const project = viewerProject
    if (project && transitionsOnRef.current) {
      const hero = viewerHeroRef.current
      const title = viewerTitleRef.current
      if (hero) {
        const r = hero.getBoundingClientRect()
        const tr = title ? title.getBoundingClientRect() : null
        pendingBackRef.current = {
          slug: project.id,
          from: { top: r.top, left: r.left, width: r.width, height: r.height },
          titleFrom: tr ? { top: tr.top, left: 16 } : null,
        }
        setClosingProject(project)   // 역모프 동안 열람 레이어 마운트 유지
      }
    }
    onDeactivate()   // 시퀀스 개시 시점에 호출 — 상태는 부모 소유
  }

  // active 전환 — 확장: FLIP 모프(캡처 rect → 실측 히어로 rect) / 수축: 역모프(산식 목표)
  const prevActiveRef = useRef<string | null>(null)
  useLayoutEffect(() => {
    const prev = prevActiveRef.current
    prevActiveRef.current = activeSlug
    if (activeSlug === prev) return

    if (activeSlug) {
      setClosingProject(null)
      const idx = order.findIndex(p => p.id === activeSlug)
      const pending = pendingTapRef.current
      pendingTapRef.current = null

      if (!transitionsOnRef.current) {
        // 딥링크 — 모프 생략, 열람 레이어 즉시 표시 + 중앙 정렬 (§6-4)
        if (idx >= 0) {
          centerIdxRef.current = idx
          setCenterTick(t => t + 1)
          jumpTo(idx)
        }
        return
      }

      if (pending && pending.slug === activeSlug && activeProject) {
        // 히어로 최종 rect — 열람 레이어는 이 커밋에 마운트 완료, 실측 가능 (§6-2)
        const hero = viewerHeroRef.current
        const title = viewerTitleRef.current
        if (hero) {
          const hr = hero.getBoundingClientRect()
          const vw = window.innerWidth
          const heroW = vw - 32
          startMorph({
            slug: activeSlug,
            src: activeProject.coverImage ? sanityCard(activeProject.coverImage, 480, activeProject.coverHotspot) : null,
            color: activeProject.coverColor,
            from: pending.from,
            to: { top: hr.top, left: 16, width: heroW, height: heroW * 2 / 3 },
            title: pending.titleFrom && title ? {
              text: activeProject.title.en,
              from: { ...pending.titleFrom, fontSize: 13, fontWeight: 400 },
              to: { top: title.getBoundingClientRect().top, left: 16, fontSize: 18, fontWeight: 600 },
            } : null,
          })
        }
      } else if (idx >= 0) {
        moveTo(idx)   // popstate 경유 활성 — 모프 생략, 중앙 정렬만 (§6-4)
      }
      return
    }

    if (prev) {
      const pending = pendingBackRef.current
      pendingBackRef.current = null
      const project = order.find(p => p.id === prev) ?? null
      if (!transitionsOnRef.current || !pending || pending.slug !== prev || !project) {
        // 필터 중 확장 해제 / popstate 해제 — 역모프 생략, 즉시 해제 (§6-4)
        setClosingProject(null)
        return
      }
      // 역모프 목표 — 산식으로 결정적: 링 중앙 d=0 썸네일 rect (§6-3)
      // 티어 기하는 현재 컨테이너 폭에서 파생 — 렌더 경로와 동일한 함수를 쓴다
      const vw = window.innerWidth
      const containerH = window.innerHeight - HEADER_H
      const [w0] = tierWidths(cwRef.current || vw)   // 폭 미관찰 시 뷰포트 폭으로 폴백
      const h0 = w0 / TIER_ASPECT                     // 이미지 높이 (3:2)
      const slot0 = h0 + BELOW_TEXT_H                 // 슬롯 전체 높이 = 이미지 + 하단 텍스트 행
      const cardTop = HEADER_H + containerH / 2 - slot0 / 2   // 슬롯 상단 (= 이미지 상단)
      const thumbLeft = (vw - w0) / 2
      startMorph({
        slug: prev,
        src: project.coverImage ? sanityCard(project.coverImage, 480, project.coverHotspot) : null,
        color: project.coverColor,
        from: pending.from,
        // 이미지가 슬롯 최상단 — TOP_TEXT_H 가산 없음 (텍스트는 하단으로 이동함)
        to: { top: cardTop, left: thumbLeft, width: w0, height: h0 },
        title: pending.titleFrom ? {
          text: project.title.en,
          from: { ...pending.titleFrom, fontSize: 18, fontWeight: 600 },
          // 타이틀 종착 — 이미지 하단 텍스트 행의 첫 줄. paddingTop 6은 §3-3 렌더와 일치
          to: { top: cardTop + h0 + 6, left: thumbLeft, fontSize: 13, fontWeight: 400 },
        } : null,
      })
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      closeTimerRef.current = setTimeout(() => setClosingProject(null), MORPH_MS + 50)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSlug])

  // 언마운트 정리
  useEffect(() => () => {
    if (morphTimerRef.current) clearTimeout(morphTimerRef.current)
    if (morphRafRef.current != null) cancelAnimationFrame(morphRafRef.current)
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
  }, [])

  // ── 필터 패널 (§7) — 로컬 상태. 메뉴 패널(SiteHeader)과 각자 스크림으로 상호 독립 ──
  const [filterOpen, setFilterOpen] = useState(false)

  const ringHidden = activeSlug !== null

  return (
    <>
      {/* ── 브라우징 레이어 — 가상 링. 스크롤 요소 아님, 입력은 useRingWall 전담 (§3-4) ── */}
      <div
        ref={ring.containerRef}
        onPointerDown={() => { lastUserRef.current = Date.now() }}
        onWheel={() => { lastUserRef.current = Date.now() }}
        style={{
          position: 'fixed',
          top: HEADER_H,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
          background: '#FFFFFF',
          fontFamily: FONT,
          touchAction: 'none',
          opacity: revealed && !ringHidden ? 1 : 0,
          pointerEvents: ringHidden ? 'none' : 'auto',
          transition: ringHidden || closingProject
            ? `opacity ${MORPH_MS}ms ${EASE}`
            : 'opacity 400ms ease-out',
        }}
      >
        {ring.slots.map(({ slot, index, turn, yCenter }) => {
          const p = order[index]
          if (!p) return null
          const h = ring.heights[index] ?? slotHs[2]      // 물리 루프가 보간 중인 슬롯 높이
          const thumbH = Math.max(h - BELOW_TEXT_H, 0)    // 이미지 높이 — 슬롯에서 텍스트 행 차감
          const thumbW = thumbH * TIER_ASPECT             // 폭은 3:2에서 파생 (측정 없음)
          const d = ring.isLoop ? circDist(index, liveCenter, N) : Math.abs(index - liveCenter)
          const tierOpacity = OPACITY[Math.min(d, 2) as 0 | 1 | 2]
          const exiting = phase === 'exit'
          const shown = revealed && phase === 'idle'
          const delay = Math.abs(slot) * (exiting ? 15 : 40)
          const titleMorphing = morphSlug === p.id && morph?.title != null

          return (
            // 외피(위치 계층) — 위치·크기에 CSS transition 금지: 운동은 전량 물리 루프 공급
            <div
              key={`${p.id}#${turn}`}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: h,
                transform: `translateY(${yCenter - h / 2}px)`,
              }}
            >
              {/* 내피(현출 계층) — 필터 exit/enter 캐스케이드 전담 (§5) */}
              <div
                onClick={() => handleTap(p, index)}
                style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: 'pointer',
                  opacity: exiting ? 0 : shown ? 1 : 0,
                  transform: exiting ? 'translateY(-16px)' : shown ? 'translateY(0)' : 'translateY(8px)',
                  transition: transitionsOn
                    ? exiting
                      ? `opacity 250ms ease-in ${delay}ms, transform 250ms ease-in ${delay}ms`
                      : `opacity 400ms ease ${delay}ms, transform 400ms ease ${delay}ms`
                    : 'none',
                }}
              >
                {/* 티어 불투명도 계층 — 이산 d 기준 (§3-3) */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  opacity: tierOpacity,
                  transition: 'opacity 300ms ease',
                }}>
                  {/* 썸네일 — 전 구간 3:2, 커버 부재 시 단색 폴백 */}
                  <div
                    ref={el => { thumbEls.current[p.id] = el }}
                    style={{
                      width: thumbW,
                      height: thumbH,
                      opacity: morphSlug === p.id ? 0 : 1,
                    }}
                  >
                    {p.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={sanityCard(p.coverImage, 480, p.coverHotspot)}
                        alt={p.title.en}
                        loading="lazy"
                        draggable={false}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: p.coverColor }} />
                    )}
                  </div>

                  {/* 텍스트 행 — 전 티어 공통. 썸네일 하단, 폭 일치, 좌측 정렬 */}
                  <div style={{
                    width: thumbW,
                    height: BELOW_TEXT_H,
                    paddingTop: 6,
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    textAlign: 'left',
                  }}>
                    {/* 프로젝트명 — 1줄 ellipsis (텍스트 행 높이 고정 보장) */}
                    <div
                      ref={el => { topTitleEls.current[p.id] = el }}
                      style={{
                        fontSize: 13,
                        fontWeight: 400,
                        lineHeight: 1.3,
                        color: '#080706',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        visibility: titleMorphing ? 'hidden' : 'visible',
                      }}
                    >
                      {p.title.en}
                    </div>
                    {/* 용도 — 1줄 ellipsis */}
                    <div style={{
                      marginTop: 2,
                      fontSize: 9,
                      fontWeight: 300,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: '#080706',
                      opacity: 0.45,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {p.type}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── 열람 레이어 (§6-1) — 세로 스크롤 문서: BACK/타이틀/세로 스택 ── */}
      {viewerProject && (
        <div ref={viewerScrollRef} style={{
          position: 'fixed',
          top: HEADER_H,
          left: 0,
          right: 0,
          bottom: 0,
          background: '#FFFFFF',
          zIndex: 40,
          fontFamily: FONT,
          overflowY: 'auto',                    // 세로 스크롤 소유
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorY: 'contain',       // 스크롤 체이닝 차단 (부모 링으로 전파 방지)
          touchAction: 'pan-y pinch-zoom',      // 세로 팬 + 핀치 줌 허용, 가로 팬만 차단 (§7)
          opacity: activeSlug && viewerIn ? 1 : 0,
          pointerEvents: activeSlug ? 'auto' : 'none',
          transition: transitionsOn ? `opacity ${MORPH_MS}ms ${EASE}` : 'none',
        }}>
          <ExpandedBlock
            project={viewerProject}
            onBack={handleBack}
            heroRef={el => { viewerHeroRef.current = el }}
            heroHidden={morphSlug === viewerProject.id}
            titleMorphing={morphSlug === viewerProject.id && morph?.title != null}
            titleRef={el => { viewerTitleRef.current = el }}
          />
        </div>
      )}

      {/* ── 모프 오버레이 — 캡처 rect → 종착 rect, CSS transition 500ms (§6-2) ── */}
      {morph && (
        <div style={{
          position: 'fixed',
          top: morphGo ? morph.to.top : morph.from.top,
          left: morphGo ? morph.to.left : morph.from.left,
          width: morphGo ? morph.to.width : morph.from.width,
          height: morphGo ? morph.to.height : morph.from.height,
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: 60,
          transition: morphGo
            ? `top ${MORPH_MS}ms ${EASE}, left ${MORPH_MS}ms ${EASE}, width ${MORPH_MS}ms ${EASE}, height ${MORPH_MS}ms ${EASE}`
            : 'none',
        }}>
          {morph.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={morph.src}
              alt=""
              draggable={false}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: morph.color }} />
          )}
        </div>
      )}

      {/* ── 타이틀 직접 보간 (d=0 탭/BACK 한정) — 13↔16px / w400↔600, 동일 500ms·이징 ── */}
      {morph?.title && (
        <div style={{
          position: 'fixed',
          top: morphGo ? morph.title.to.top : morph.title.from.top,
          left: morphGo ? morph.title.to.left : morph.title.from.left,
          fontFamily: FONT,
          fontSize: morphGo ? morph.title.to.fontSize : morph.title.from.fontSize,
          fontWeight: morphGo ? morph.title.to.fontWeight : morph.title.from.fontWeight,
          lineHeight: 1.35,
          color: '#080706',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 61,
          transition: morphGo
            ? `top ${MORPH_MS}ms ${EASE}, left ${MORPH_MS}ms ${EASE}, font-size ${MORPH_MS}ms ${EASE}, font-weight ${MORPH_MS}ms ${EASE}`
            : 'none',
        }}>
          {morph.title.text}
        </div>
      )}

      {/* ── 필터 글리프 + 우측 슬라이드 패널 (§7) — 햄버거와 동일하게 인트로 완료(revealed)와 동기해 상시 표시 ── */}
      {revealed && (
        <>
          {/* 트리거 — 헤더 존 우측. 길이가 체감하는 수평선 3개 (햄버거와 구분).
               SVG 통일 기하: viewBox 0 0 18 14, 선 중심 y=1/7/13 — 햄버거와 전체 높이·두께·수직 위치 동일 */}
          <button
            aria-label="Filter"
            onClick={() => setFilterOpen(o => !o)}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              width: 56,
              height: 56,
              zIndex: 95,   // 헤더 바 90 위, 워드마크 200 아래
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: '#080706',
              opacity: revealed ? 1 : 0,
              pointerEvents: revealed ? 'auto' : 'none',
              transition: 'opacity 400ms ease-out',
            }}
          >
            <svg
              viewBox="0 0 18 14"
              width={18}
              height={14}
              style={{ display: 'block' }}
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="butt"
            >
              <line x1="0" y1="1" x2="18" y2="1" />
              <line x1="3" y1="7" x2="15" y2="7" />
              <line x1="6" y1="13" x2="12" y2="13" />
            </svg>
          </button>

          {/* 스크림 — 탭 시 닫힘 */}
          <div
            onClick={() => setFilterOpen(false)}
            aria-hidden="true"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(8, 7, 6, 0.25)',
              zIndex: 110,
              opacity: filterOpen ? 1 : 0,
              pointerEvents: filterOpen ? 'auto' : 'none',
              transition: `opacity ${PANEL_MS}ms ${EASE}`,
            }}
          />

          {/* 패널 — 우측 슬라이드 인 */}
          <div style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: 'min(62vw, 280px)',
            background: '#FFFFFF',
            zIndex: 120,
            transform: filterOpen ? 'translateX(0)' : 'translateX(100%)',
            transition: `transform ${PANEL_MS}ms ${EASE}`,
            boxShadow: '-8px 0 24px rgba(0, 0, 0, 0.06)',
            padding: '72px 16px 24px 24px',
            overflowY: 'auto',
            fontFamily: FONT,
          }}>
            {filterTypes.map(t => (
              <button
                key={t}
                onClick={() => {
                  setFilterOpen(false)
                  onFilter(t)   // §5 시퀀스가 이어진다
                }}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 8,
                  width: '100%',
                  padding: '12px 0',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: FONT,
                  fontSize: 12,
                  fontWeight: t === activeFilter ? 500 : 300,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#080706',
                  wordBreak: 'keep-all',   // 장문 라벨 2줄 허용
                }}
              >
                {/* 불릿 — 활성 항목 앞에만 (칩 문법 승계) */}
                <span style={{
                  fontSize: 7,
                  lineHeight: 1,
                  flexShrink: 0,
                  opacity: t === activeFilter ? 1 : 0,
                  transition: 'opacity 200ms',
                }}>●</span>
                <span>{t}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  )
}
