'use client'

// ── GridContentArea — 그리드 뷰(/work-grid) 전용 콘텐츠 영역 (GRID_CONTENT_AREA_SPEC §3-2) ──
//
// ContentArea.tsx(링월 전용, 무수정)의 완전 복제본이다. 슬라이드 렌더러 6종·SlideContent
// 스위치·rects 계산·트랙 transform·4경로 넘김(화살표·키보드·드래그·플릭)·모든 상수를
// 그대로 복제하고, 아래 5개 개조만 적용한다.
//
//   1) props — isBlacking·visible 제거, enterRect(클릭 카드의 뷰포트 rect) 추가
//   2) morph 진입 rect = 카드 rect (링월은 루트 풀블리드), 도착 rect = 중앙정렬된 히어로
//   3) idle 블록 제거 + 초기 scrollPos 중앙정렬 + 역-morph(active→idle)
//   4) ESC 닫기
//   5) 루트를 fixed 오버레이(z-index 100)로 전환
//
// ⚠ 모든 morph rect·트랙 translate는 px 정수 계산이다. transform 퍼센트 정렬은 쓰지 않는다
//   (Safari 정렬 파손 방지 — 링월과 동일 원칙).

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CreditsSlide, DiagramSetSlide, ImageSlide, PortableTextBlock, Project, ProjectSlide, QuoteSlide, TextSlide, VideoSlide } from '@/types'
import { useFinePointer } from '@/hooks/useFinePointer'
import { BilingualText } from '@/lib/bilingual'
import { sizeLabel, sizeValue, splitRole } from '@/lib/projectMeta'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"

const INFO_SLIDE_W = 240     // 세로 스택 — 수평 4열 폐기 (260714-B). 260721 200→240 (120%)
// 타이틀 세트 고정 슬롯 높이 — AWARDS 시작 y를 전 프로젝트 동일화. INFO_SLIDE_W(240) 기준
// 결정론적 산출(영문타이틀 3줄+한글 2줄+서브 영3/한2, 260720 명세): 합 181.2 → 182
// 260721: 폭 200→240 확대에 따른 재산출. 기존 197 → 175 (비례 164 + 여유 11)
const TITLE_SET_MIN_H = 175
const CREDITS_SLIDE_W = 420
const TEXT_SLIDE_W = 560     // 서술문 — 한글 본문 가독 폭
const QUOTE_SLIDE_W = 460    // 인용문 — 본문보다 좁게 하여 위계 부여
// 텍스트·인용 슬라이드 좌우 인셋. 폭 상수(rects·모프 참조)는 불변, 내부만 좁힌다
const SLIDE_TEXT_INSET = 40
const SLIDE_GAP_PX = 24
const TRACK_INSET = 24       // 트랙 뷰포트 좌측 오프셋 — 뷰포트 좌측 모서리가 곧 클립 라인 (Back/타이틀 좌측 라인과 정렬)
const EASE = 'cubic-bezier(0.7, 0, 0.3, 1)'
export const MORPH_MS = 700
const MORPH_HOLD_MS = 400    // 모프 완료 후 모프 레이어 유지 — 트랙 페이드인(400ms)을 덮는다
const MORPH_FADE_MS = 250    // 모프 레이어 페이드아웃
const SLIDE_H_RATIO = 0.72     // image·credits·info 슬라이드 높이 (뷰포트 대비)
const DIAGRAM_H_RATIO = 0.48   // diagramSet·단일 다이어그램 이미지 영역 높이 (뷰포트 대비)

// 역-morph 여유 — 부모(GridExperience)의 언마운트 타이머가 이 값 이상이어야 한다
export const REVERSE_MORPH_TAIL_MS = 60

// ── 플릭(관성) — 기존 600ms transition을 그대로 타는 단발 보간 ──
const FLICK_VELOCITY_MIN = 0.4   // px/ms — 이 속도 초과 시 플릭 판정
const FLICK_COEF = 280           // 속도 → 추가 이동량 계수

const FALLBACK_RATIO = 4 / 3

// 개조 1 — props 확장. 링월의 isBlacking·visible은 제거(그리드는 idle 배경 커버를 쓰지 않는다)
interface GridContentAreaProps {
  project: Project
  mode: 'idle' | 'active'
  enterRect: { top: number; left: number; width: number; height: number } | null
  onBack: () => void
}

interface MorphRect {
  top: number
  left: number
  width: number
  height: number
}

function getSlides(project: Project): ProjectSlide[] {
  return project.slides
    ?? (project.coverImage ? [{ kind: 'image', src: project.coverImage }] : [])
}

// 다이어그램 판정 — diagramSet 또는 diagram 표기된 단일 이미지 (다이어그램 높이 공통 적용)
const isDiagram = (s: ProjectSlide) =>
  s.kind === 'diagramSet' || (s.kind === 'image' && s.diagram === true)

function splitCaption(caption: string): { label: string; description: string } {
  const sepIdx = caption.indexOf('—')
  if (sepIdx < 0) return { label: caption, description: '' }
  return {
    label: caption.slice(0, sepIdx).trim(),
    description: caption.slice(sepIdx + 1).trim(),
  }
}

// ── 이미지 슬라이드: 외피가 계산 폭을 예약 — img는 박스를 100% 채움 (기존 slide-img 시각 결과 유지) ──
function ImageSlideView({ slide }: { slide: ImageSlide }) {
  const en = slide.caption?.en ? splitCaption(slide.caption.en) : null
  const ko = slide.caption?.ko ? splitCaption(slide.caption.ko) : null

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={slide.src}
        alt=""
        draggable={false}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
      />
      {slide.caption && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: 12,
          textAlign: 'center',
          fontFamily: FONT,
          pointerEvents: 'none',
          whiteSpace: 'normal',
          wordBreak: 'keep-all',
        }}>
          {en && (
            <div style={{ fontSize: 12, fontWeight: 300, color: '#0a0908', opacity: 0.7 }}>
              <span style={{ fontWeight: 500 }}>{en.label}</span>
              {en.description && ` — ${en.description}`}
            </div>
          )}
          {ko && (
            <div style={{ fontSize: 11, fontWeight: 300, color: '#0a0908', opacity: 0.5, marginTop: 2 }}>
              <span style={{ fontWeight: 400 }}>{ko.label}</span>
              {ko.description && ` — ${ko.description}`}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── 다이어그램 세트: 중앙 근접(active) 시에만 내부 인터랙션 활성 ──
// finePointer=false: 글리프/커서 치환/호버 로직 없음. 탭(클릭) 이동과 자동진행은 유지.
// 폭은 외부(트랙 rects)에서 주어진다 — 내부 사이저 없음.
function DiagramSetSlideView({ slide, active, finePointer, onHoverChange }: {
  slide: DiagramSetSlide
  active: boolean
  finePointer: boolean
  onHoverChange: (hovering: boolean) => void
}) {
  const [subIdx, setSubIdx] = useState(0)
  const [hovering, setHovering] = useState(false)
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)
  const areaRef = useRef<HTMLDivElement>(null)
  const total = slide.items.length

  // 중앙에서 벗어나면 내부 인터랙션 전부 해제
  useEffect(() => {
    if (!active) {
      setSubIdx(0)
      setHovering(false)
      setCursor(null)
      onHoverChange(false)
    }
  }, [active, onHoverChange])

  // 자동 진행 — 중앙 근접 + 비호버일 때만
  useEffect(() => {
    if (!active || hovering) return
    const interval = slide.autoAdvanceMs ?? 3000
    const id = setInterval(() => {
      setSubIdx(i => (i + 1) % total)
    }, interval)
    return () => clearInterval(id)
  }, [active, hovering, total, slide.autoAdvanceMs])

  // 언마운트 시 외부 글리프 숨김 상태 해제
  useEffect(() => () => onHoverChange(false), [onHoverChange])

  const handleClick = (e: React.MouseEvent) => {
    if (!active) return  // 비활성: 클릭은 외부 트랙 내비게이션으로 전파
    e.stopPropagation()
    const rect = areaRef.current?.getBoundingClientRect()
    if (!rect) return
    if (e.clientX - rect.left > rect.width / 2) setSubIdx(i => (i + 1) % total)
    else setSubIdx(i => (i - 1 + total) % total)
  }

  const item = slide.items[subIdx]
  const areaW = areaRef.current?.clientWidth ?? 0

  return (
    <div
      ref={areaRef}
      style={{
        height: '100%',
        position: 'relative',
        // fine pointer일 때만 커서 치환. 내부 글리프 표시 중에만 네이티브 커서 숨김
        cursor: finePointer ? (active ? (cursor ? 'none' : 'default') : 'inherit') : undefined,
      }}
      onMouseEnter={() => {
        if (!finePointer || !active) return
        setHovering(true)
        onHoverChange(true)
      }}
      onMouseLeave={() => {
        if (!finePointer) return
        setHovering(false)
        setCursor(null)
        onHoverChange(false)
      }}
      onMouseMove={(e) => {
        if (!finePointer || !active) return
        setHovering(true)
        onHoverChange(true)
        const rect = areaRef.current?.getBoundingClientRect()
        if (rect) setCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      }}
      onPointerDown={active ? (e) => e.stopPropagation() : undefined}
      onPointerUp={active ? (e) => e.stopPropagation() : undefined}
      onClick={handleClick}
    >
      {slide.items.map((it, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={it.src}
          alt=""
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

      {/* 내부 커서 추적 글리프 — 커서 지점에 중심 정렬 (fine pointer 전용) */}
      {/* 투명 PNG 위에서는 difference가 도달할 픽셀이 없어 비가시 → 검정 고정 */}
      {finePointer && active && cursor && (
        <span style={{
          position: 'absolute',
          left: cursor.x,
          top: cursor.y,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          fontFamily: FONT,
          fontSize: 28,
          fontWeight: 300,
          lineHeight: 1,
          color: '#080706',
          zIndex: 3,
          userSelect: 'none',
        }}>
          {cursor.x > areaW / 2 ? '›' : '‹'}
        </span>
      )}

      {/* 캡션 + 카운터 — 이미지 영역 하단 외부 */}
      <div style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        marginTop: 12,
        textAlign: 'center',
        fontFamily: FONT,
        pointerEvents: 'none',
        whiteSpace: 'normal',
        wordBreak: 'keep-all',
      }}>
        {/* 영문 세트 (주) */}
        <div style={{ fontSize: 12, fontWeight: 500, color: '#0a0908', opacity: 0.85 }}>{item.label.en}</div>
        <div style={{ fontSize: 11, fontWeight: 300, color: '#0a0908', opacity: 0.6, marginTop: 2 }}>{item.description.en}</div>
        {/* 한글 세트 (종) — 있을 때만 */}
        {item.label.ko && (
          <div style={{ fontSize: 11, fontWeight: 400, color: '#0a0908', opacity: 0.6, marginTop: 6 }}>{item.label.ko}</div>
        )}
        {item.description.ko && (
          <div style={{ fontSize: 10, fontWeight: 300, color: '#0a0908', opacity: 0.45, marginTop: 2 }}>{item.description.ko}</div>
        )}
        <div style={{ fontSize: 11, opacity: 0.5, color: '#0a0908', marginTop: 4 }}>
          {String(subIdx + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </div>
      </div>
    </div>
  )
}

// ── 본문 텍스트: 좌정렬, 슬라이드 높이 내 수직 중앙. 폭은 상수 ──
function renderBlocks(blocks: PortableTextBlock[], opacity: number) {
  return blocks.map((block, i) => (
    <p key={block._key ?? i} style={{
      margin: 0,
      fontFamily: FONT,
      fontSize: 14,
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

function TextSlideView({ slide }: { slide: TextSlide }) {
  return (
    <div style={{
      height: '100%',
      width: TEXT_SLIDE_W,
      paddingLeft: SLIDE_TEXT_INSET,
      paddingRight: SLIDE_TEXT_INSET,
      display: 'flex',
      alignItems: 'center',
      boxSizing: 'border-box',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        maxHeight: '100%',
        overflowY: 'auto',
      }}>
        {/* 영문 (주) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{renderBlocks(slide.body.en, 1)}</div>
        {/* 한글 (종) — 있을 때만 */}
        {slide.body.ko && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{renderBlocks(slide.body.ko, 0.6)}</div>
        )}
      </div>
    </div>
  )
}

// ── 인용구: 중앙정렬, 따옴표 포함, 하단 출처. 폭은 상수 ──
function QuoteSlideView({ slide }: { slide: QuoteSlide }) {
  return (
    <div style={{
      height: '100%',
      width: QUOTE_SLIDE_W,
      paddingLeft: SLIDE_TEXT_INSET,
      paddingRight: SLIDE_TEXT_INSET,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      boxSizing: 'border-box',
    }}>
      {/* 영문 (주) — 따옴표 */}
      <div style={{
        fontFamily: FONT,
        fontSize: 15,
        fontWeight: 300,
        lineHeight: 1.7,
        letterSpacing: '-0.01em',
        color: '#0a0908',
        textAlign: 'center',
        wordBreak: 'keep-all',
        maxHeight: '100%',
        overflowY: 'auto',
      }}>
        {`“${slide.text.en}”`}
      </div>
      {/* 한글 (종) — 따옴표, 있을 때만 */}
      {slide.text.ko && (
        <div style={{
          fontFamily: FONT,
          fontSize: 13,
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
          fontSize: 10,
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

// ── 영상: YouTube 임베드. 16:9, 높이 100% 기준. 자동재생 없음 ──
function VideoSlideView({ slide }: { slide: VideoSlide }) {
  const src = `https://www.youtube-nocookie.com/embed/${slide.youtubeId}?rel=0&modestbranding=1`
  const en = slide.caption?.en ? splitCaption(slide.caption.en) : null
  const ko = slide.caption?.ko ? splitCaption(slide.caption.ko) : null

  return (
    <div style={{
      height: '100%',
      aspectRatio: '16 / 9',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
    }}>
      <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', background: '#000' }}>
        <iframe
          src={src}
          title={slide.caption?.en ?? 'Project video'}
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
        />
        {/* 캡션 — ImageSlideView와 동일 방식: 미디어 하단 외부, 영문 주 + 한글 종 */}
        {slide.caption && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 12,
            textAlign: 'center',
            fontFamily: FONT,
            pointerEvents: 'none',
            whiteSpace: 'normal',
            wordBreak: 'keep-all',
          }}>
            {en && (
              <div style={{ fontSize: 12, fontWeight: 300, color: '#0a0908', opacity: 0.7 }}>
                <span style={{ fontWeight: 500 }}>{en.label}</span>
                {en.description && ` — ${en.description}`}
              </div>
            )}
            {ko && (
              <div style={{ fontSize: 11, fontWeight: 300, color: '#0a0908', opacity: 0.5, marginTop: 2 }}>
                <span style={{ fontWeight: 400 }}>{ko.label}</span>
                {ko.description && ` — ${ko.description}`}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── 크레딧: 슬라이드 높이의 흰 블록, 고정 420px ──
function CreditsSlideView({ slide }: { slide: CreditsSlide }) {
  return (
    <div style={{
      height: '100%',
      width: CREDITS_SLIDE_W,
      background: '#FFFFFF',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {slide.rows.map((row, i) => (
          <div key={i} style={{ display: 'flex', gap: 24, alignItems: 'baseline' }}>
            <div style={{
              width: 120,
              flexShrink: 0,
              textAlign: 'right',
              fontFamily: FONT,
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#0a0908',
              opacity: 0.5,
            }}>
              {row.label}
            </div>
            <div style={{
              textAlign: 'left',
              fontFamily: FONT,
              fontSize: 14,
              fontWeight: 400,
              color: '#0a0908',
            }}>
              {row.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 메타 필드 — 라벨 + 값. 값이 없으면 em dash 자리표시 (공란 유지 요건) ──
function MetaField({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div style={{
        fontSize: 9,
        fontWeight: 300,
        letterSpacing: '0.1em',
        opacity: 0.45,
        whiteSpace: 'nowrap',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 11,
        fontWeight: 400,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        marginTop: 3,
        lineHeight: 1.4,
        wordBreak: 'keep-all',
        opacity: value ? 1 : 0.25,
      }}>
        {value || '—'}
      </div>
    </div>
  )
}

function SlideContent({ slide, nearCenter, finePointer, onDiagramHover }: {
  slide: ProjectSlide
  nearCenter: boolean
  finePointer: boolean
  onDiagramHover: (hovering: boolean) => void
}) {
  switch (slide.kind) {
    case 'image':
      return <ImageSlideView slide={slide} />
    case 'diagramSet':
      return <DiagramSetSlideView slide={slide} active={nearCenter} finePointer={finePointer} onHoverChange={onDiagramHover} />
    case 'credits':
      return <CreditsSlideView slide={slide} />
    case 'text':
      return <TextSlideView slide={slide} />
    case 'quote':
      return <QuoteSlideView slide={slide} />
    case 'video':
      return <VideoSlideView slide={slide} />
  }
}

export function GridContentArea({ project, mode, enterRect, onBack }: GridContentAreaProps) {
  const slides = useMemo(() => getSlides(project), [project])
  const total = Math.max(slides.length, 1)
  const finePointer = useFinePointer()

  const rootRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)     // transform 적용 대상 (측정 용도 없음)

  // ── Idle→Active 모프 전환 ──
  const [morphing, setMorphing] = useState(false)
  const [morphRect, setMorphRect] = useState<MorphRect | null>(null)
  const [morphVisible, setMorphVisible] = useState(false)   // 모프 레이어 표시 — morphing과 분리 (크로스페이드)
  const prevModeRef = useRef(mode)
  // 진입 모프는 vpSize가 잡힌 렌더에서 1회만 발동한다 (리사이즈로 effect가 재실행돼도 재발동 금지)
  const morphStartedRef = useRef(false)
  // 진입/역-morph 타이머 — 언마운트에서만 정리한다 (effect 재실행에 끊기면 모프가 멈춘다)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  // ── 연속 트랙 (픽셀 스크롤 모델) ──
  // scrollPos 0 = 트랙 좌측 끝 = 뷰포트 좌측 끝 ([정보 슬라이드][히어로]가 좌측부터 보임)
  const [scrollPos, setScrollPos] = useState(0)
  const [vpSize, setVpSize] = useState({ w: 0, h: 0 })   // viewportRef의 clientWidth/Height — 유일한 관찰 대상
  const [dragging, setDragging] = useState(false)
  const [animated, setAnimated] = useState(false)      // 화살표/키보드/플릭 이동 시에만 transition
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)
  const [diagramHover, setDiagramHover] = useState(false)
  const [infoIn, setInfoIn] = useState(false)
  const [trackIn, setTrackIn] = useState(false)
  const dragState = useRef<{
    startX: number; startScroll: number; moved: boolean
    lastX: number; lastT: number; v: number   // 마지막 두 샘플 기반 속도 (px/ms)
  } | null>(null)

  const viewportW = vpSize.w

  // ── 비율 — Sanity metadata의 동기 순수 계산 (기존 선로드와 동일한 슬라이드별 src 선택 규칙) ──
  const ratios = useMemo(() => slides.map(slide => {
    if (slide.kind === 'image') return slide.ratio ?? FALLBACK_RATIO
    if (slide.kind === 'diagramSet') return slide.items[0]?.ratio ?? FALLBACK_RATIO   // 기존 사이저와 동일 기준
    return FALLBACK_RATIO   // credits·text·quote — 폭은 상수, 자리만 채움
  }), [slides])

  // ── 뷰포트 치수 관찰 — RO는 viewportRef 하나만. window resize 리스너 유지 ──
  useLayoutEffect(() => {
    if (mode !== 'active') return
    const vp = viewportRef.current
    if (!vp) return
    const update = () => setVpSize(prev => {
      const w = vp.clientWidth
      const h = vp.clientHeight
      return (prev.w === w && prev.h === h) ? prev : { w, h }
    })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(vp)
    window.addEventListener('resize', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [mode])

  // ── 폭 결정론화 — rects는 ratios·vpSize의 순수 함수 (DOM 측정 없음) ──
  const slideH = vpSize.h * SLIDE_H_RATIO
  const diagramH = vpSize.h * DIAGRAM_H_RATIO

  const rects = useMemo(() => {
    const widths: number[] = [INFO_SLIDE_W]   // 트랙 자식 0 = 정보 슬라이드
    if (slides.length > 0) {
      slides.forEach((slide, i) => {
        const ratio = ratios?.[i] ?? FALLBACK_RATIO
        if (slide.kind === 'credits') widths.push(CREDITS_SLIDE_W)
        else if (slide.kind === 'text') widths.push(TEXT_SLIDE_W)
        else if (slide.kind === 'quote') widths.push(QUOTE_SLIDE_W)
        else if (slide.kind === 'video') widths.push((16 / 9) * slideH)
        else if (isDiagram(slide)) widths.push(ratio * diagramH)
        else widths.push(ratio * slideH)
      })
    } else {
      widths.push(FALLBACK_RATIO * slideH)   // coverColor 폴백 블록
    }
    const out: { x: number; w: number }[] = []
    let x = 0
    for (const w of widths) {
      out.push({ x, w })
      x += w + SLIDE_GAP_PX
    }
    return out
  }, [slides, ratios, slideH, diagramH])

  // 트랙 자식 인덱스 공간: 0 = 정보 슬라이드, 1.. = 콘텐츠 슬라이드
  const centers = rects.map(r => r.x + r.w / 2)
  const contentEnd = rects.length > 0
    ? rects[rects.length - 1].x + rects[rects.length - 1].w
    : 0
  const maxScroll = centers.length > 0
    ? Math.max(
        0,
        centers[centers.length - 1] - viewportW / 2,   // 마지막 슬라이드 중앙 정렬 지점 (좁은 슬라이드용)
        contentEnd + TRACK_INSET - viewportW,          // 마지막 슬라이드 우측 에지 + 우측 여백 24 (넓은 슬라이드용)
      )
    : 0

  const viewportCenter = scrollPos + viewportW / 2
  let nearest = 0
  for (let i = 1; i < centers.length; i++) {
    if (Math.abs(centers[i] - viewportCenter) < Math.abs(centers[nearest] - viewportCenter)) nearest = i
  }

  const clampScroll = (v: number) => Math.min(maxScroll, Math.max(0, v))

  // 다이어그램 화살표 우선순위 — 슬라이드 중앙이 뷰포트 중앙 ±20% 이내일 때만 활성
  const isNearCenter = (trackIdx: number) =>
    viewportW > 0 && trackIdx < centers.length &&
    Math.abs(centers[trackIdx] - viewportCenter) < viewportW * 0.2

  // 모프 effect가 최신 기하를 읽는 통로 — effect deps(mode·vpSize)만으로는 scrollPos가 stale해진다
  const geomRef = useRef({ rects, centers, scrollPos, clampScroll })
  geomRef.current = { rects, centers, scrollPos, clampScroll }

  // ── 리사이즈 재중앙 — 변경 직전 nearest를 새 rects 기준으로 무애니메이션 재정렬. 드래그 중 생략 ──
  const nearestRef = useRef(0)
  useEffect(() => { nearestRef.current = nearest })

  useLayoutEffect(() => {
    if (vpSize.w === 0 || dragState.current) return
    const idx = Math.min(nearestRef.current, centers.length - 1)
    if (idx < 0) return
    setAnimated(false)
    setScrollPos(clampScroll(centers[idx] - vpSize.w / 2))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vpSize.w, vpSize.h])

  // 타이머 정리는 언마운트에서만 — 진입/역-morph가 effect 재실행에 끊기지 않게 한다
  useEffect(() => () => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }, [])

  // ── 개조 2·3 — 모드 전환 모프 ──
  // 진입(idle→active): 클릭 카드 rect → 중앙정렬된 히어로 rect
  // 복귀(active→idle): 현재 히어로 화면 rect → 클릭 카드 rect (역-morph)
  // rects·centers는 vpSize 파생이므로 vpSize.w > 0 인 렌더에서만 모프를 발동한다.
  useEffect(() => {
    const prev = prevModeRef.current
    prevModeRef.current = mode

    if (mode === 'active' && !morphStartedRef.current && vpSize.w > 0 && rootRef.current) {
      morphStartedRef.current = true

      const { rects: rc, centers: ct, clampScroll: cs } = geomRef.current
      const rw = rootRef.current.clientWidth
      const rh = rootRef.current.clientHeight

      // 카드 프레임은 항상 4:3이고 히어로도 FALLBACK_RATIO 기준이므로 왜곡 없이 확대된다
      const aspect = FALLBACK_RATIO
      const th = rh * SLIDE_H_RATIO
      const tw = th * aspect

      // 초기 scrollPos — 히어로(트랙 인덱스 1) 중앙이 뷰포트 중앙에 오는 값 (§2)
      // 슬라이드 0개 엣지 케이스 대비: rects가 2개 미만이면 링월과 동일한 좌측 상주로 폴백
      const hasHero = rc.length >= 2
      const initScroll = hasHero ? cs(ct[1] - vpSize.w / 2) : 0
      // 화면상 히어로 좌측 = 트랙 인셋 + 트랙 내 x - 실제 적용될 스크롤 (전부 px 정수 계산)
      const heroScreenLeft = hasHero
        ? TRACK_INSET + rc[1].x - initScroll
        : TRACK_INSET + INFO_SLIDE_W + SLIDE_GAP_PX

      setScrollPos(initScroll)
      setAnimated(false)

      setMorphing(true)
      setMorphVisible(true)
      // 개조 2 — 시작 rect는 클릭한 카드. null이면 루트 풀블리드로 폴백(링월 동형)
      setMorphRect(enterRect ?? { top: 0, left: 0, width: rw, height: rh })

      let cancelled = false
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (cancelled) return
        setMorphRect({
          top: (rh - th) / 2,
          left: heroScreenLeft,
          width: tw,
          height: th,
        })
      }))

      // 1) 모프 종료 → 트랙 페이드인 시작. 모프 레이어는 아직 유지
      // 2) 트랙 페이드인 완료 → 모프 레이어 페이드아웃 개시
      // 3) 페이드아웃 완료 → rect 해제 (언마운트)
      timersRef.current.push(
        setTimeout(() => { if (!cancelled) setMorphing(false) }, MORPH_MS),
        setTimeout(() => { if (!cancelled) setMorphVisible(false) }, MORPH_MS + MORPH_HOLD_MS),
        setTimeout(() => { if (!cancelled) setMorphRect(null) }, MORPH_MS + MORPH_HOLD_MS + MORPH_FADE_MS),
      )

      return () => { cancelled = true }
    }

    // 개조 3 — 역-morph. 링월(즉시 리셋)과 달리 카드 rect로 축소 복귀한다
    if (mode === 'idle' && prev === 'active') {
      morphStartedRef.current = false
      setMorphing(false)
      setTrackIn(false)
      setInfoIn(false)
      setDiagramHover(false)
      setCursor(null)

      if (enterRect && rootRef.current) {
        const { rects: rc, scrollPos: sp } = geomRef.current
        const rh = rootRef.current.clientHeight
        const th = rh * SLIDE_H_RATIO
        const tw = th * FALLBACK_RATIO
        const heroScreenLeft = rc.length >= 2
          ? TRACK_INSET + rc[1].x - sp
          : TRACK_INSET + INFO_SLIDE_W + SLIDE_GAP_PX

        setMorphVisible(true)
        setMorphRect({ top: (rh - th) / 2, left: heroScreenLeft, width: tw, height: th })

        let cancelled = false
        requestAnimationFrame(() => requestAnimationFrame(() => {
          if (cancelled) return
          setMorphRect(enterRect)   // 카드 rect로 축소
        }))

        timersRef.current.push(setTimeout(() => {
          if (cancelled) return
          setMorphVisible(false)
          setMorphRect(null)
        }, MORPH_MS + REVERSE_MORPH_TAIL_MS))

        return () => { cancelled = true }
      }

      // enterRect가 없으면 역-morph 없이 즉시 정리
      setMorphVisible(false)
      setMorphRect(null)
      setScrollPos(0)
      setAnimated(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, vpSize.w, vpSize.h])

  // 개조 4 — ESC로 닫기 (화살표 키 핸들러와 별도 effect. 충돌 없음)
  useEffect(() => {
    if (mode !== 'active') return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onBack() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, onBack])

  // 정보 슬라이드 텍스트 — 모프 완료 후 400ms 페이드인 (텍스트라 비율과 무관 — 기존 타이밍 유지)
  useEffect(() => {
    if (mode !== 'active' || morphing) {
      setInfoIn(false)
      return
    }
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setInfoIn(true)))
    return () => cancelAnimationFrame(raf)
  }, [mode, morphing])

  // 트랙 페이드 인 — 모프 종료 후 400ms 페이드 (월 재배열 400ms와 동기). 비율은 동기 계산 — 대기 상태 소멸
  useEffect(() => {
    if (mode !== 'active' || morphing) {
      setTrackIn(false)
      return
    }
    setTrackIn(false)
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setTrackIn(true)))
    return () => cancelAnimationFrame(raf)
  }, [mode, morphing, project.id])

  // active 중 프로젝트 교체 시 리셋
  useEffect(() => {
    setScrollPos(0)
    setAnimated(false)
  }, [project.id])

  // 화살표/키보드 이동 — 중앙 최근접 슬라이드 기준 이전/다음 중앙으로
  const goToSlide = (idx: number) => {
    if (centers.length === 0) return
    const i = Math.max(0, Math.min(centers.length - 1, idx))
    setAnimated(true)
    setScrollPos(clampScroll(centers[i] - viewportW / 2))
  }
  const goNext = () => goToSlide(nearest + 1)
  const goPrev = () => goToSlide(nearest - 1)

  const navRef = useRef({ next: goNext, prev: goPrev })
  navRef.current = { next: goNext, prev: goPrev }

  useEffect(() => {
    if (mode !== 'active') return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') navRef.current.next()
      else if (e.key === 'ArrowLeft') navRef.current.prev()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mode])

  // ── 드래그: 이동량 직접 반영, 놓아도 스냅하지 않음. 빠르게 놓으면 플릭 관성 ──
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragState.current = {
      startX: e.clientX,
      startScroll: scrollPos,
      moved: false,
      lastX: e.clientX,
      lastT: e.timeStamp,
      v: 0,
    }
    setDragging(true)
    setAnimated(false)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const vp = viewportRef.current
    if (vp) {
      const rect = vp.getBoundingClientRect()
      setCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    }
    const d = dragState.current
    if (!d) return
    const dx = e.clientX - d.startX
    if (Math.abs(dx) >= 5) d.moved = true
    // 마지막 두 샘플로 속도 추정 (px/ms)
    const dt = e.timeStamp - d.lastT
    if (dt > 0) {
      d.v = (e.clientX - d.lastX) / dt
      d.lastX = e.clientX
      d.lastT = e.timeStamp
    }
    setScrollPos(clampScroll(d.startScroll - dx))
  }
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragState.current
    dragState.current = null
    setDragging(false)
    if (!d) return
    if (d.moved) {
      // 플릭 관성 — 터치/마우스 동일 적용 (기존 600ms transition을 그대로 탄다)
      if (Math.abs(d.v) > FLICK_VELOCITY_MIN) {
        setAnimated(true)
        setScrollPos(clampScroll(scrollPos - d.v * FLICK_COEF))
      }
      return
    }
    // 클릭 (이동량 < 5px) — 마우스 전용. 터치 탭은 무동작 (이동은 스와이프 전용)
    if (e.pointerType !== 'mouse') return
    const vp = viewportRef.current
    if (!vp) return
    const rect = vp.getBoundingClientRect()
    if (e.clientX - rect.left > rect.width / 2) goNext()
    else goPrev()
  }

  // ── 외부 커서 추적 글리프 — fine pointer(hover+pointer:fine)일 때만 ──
  const glyphSide: 'left' | 'right' | null =
    cursor && viewportW > 0 ? (cursor.x > viewportW / 2 ? 'right' : 'left') : null
  const showGlyph = finePointer && !morphing && cursor !== null && !dragging && !diagramHover &&
    glyphSide !== null &&
    (glyphSide === 'right' ? scrollPos < maxScroll - 1 : scrollPos > 1)

  // 카운터: 정보 슬라이드 제외 — 콘텐츠 슬라이드 번호(1..) 기준
  const displayIdx = Math.min(Math.max(nearest, 1), total)

  return (
    // 개조 5 — 그리드 전체를 덮는 fixed 오버레이. idle(진입 전·역모프 중)에는 배경을 비워
    // 뒤의 그리드가 비치게 한다
    <div
      ref={rootRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        height: '100%',
        overflow: 'hidden',
        background: mode === 'active' ? '#FFFFFF' : 'transparent',
        transition: 'background-color 0.3s ease-out',
      }}
    >
      {mode === 'active' && (
        <>
          {/* ── 슬라이드 뷰포트 — 좌측 클립 인셋 안쪽에서 시작, 좌측 모서리 = 클립 라인 ── */}
          <div
            ref={viewportRef}
            style={{
              width: `calc(100% - ${TRACK_INSET}px)`,
              marginLeft: TRACK_INSET,
              height: '100%',
              position: 'relative',
              overflow: 'hidden',
              touchAction: 'pan-y',
              userSelect: 'none',
              // 글리프 표시 중 네이티브 커서 숨김
              cursor: dragging ? 'grabbing' : showGlyph ? 'none' : 'default',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onMouseLeave={() => setCursor(null)}
          >
            {/* 페이드 래퍼 — 트랙 페이드 인 (transform은 내부 트랙에 그대로). 항상 마운트, trackIn이 가시성 제어 */}
            <div style={{
              height: '100%',
              opacity: trackIn ? 1 : 0,
              transition: 'opacity 400ms ease',
            }}>
                <div
                  ref={trackRef}
                  style={{
                    display: 'flex',
                    gap: SLIDE_GAP_PX,
                    alignItems: 'center',
                    height: '100%',
                    transform: `translateX(${-scrollPos}px)`,
                    transition: animated && !dragging ? `transform 600ms ${EASE}` : 'none',
                    willChange: 'transform',
                  }}
                >
                  {/* 트랙 첫 자식 — 정보 슬라이드. 타이틀 세트 + AWARDS + 메타 블록 */}
                  <div style={{
                    width: INFO_SLIDE_W,
                    flexShrink: 0,
                    height: slideH,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    gap: 24,
                    fontFamily: FONT,
                    color: '#080706',
                    opacity: infoIn ? 1 : 0,
                    transition: 'opacity 400ms ease',
                    boxSizing: 'border-box',
                    overflowY: 'auto',
                  }}>
                    {/* 타이틀 세트 — 고정 높이 슬롯. AWARDS 시작 y를 전 프로젝트 동일화 */}
                    <div style={{ minHeight: TITLE_SET_MIN_H, marginBottom: 20 }}>
                      {/* 프로젝트 코드 — ProjectCard와 동일한 3자리 zero-pad 규약 */}
                      <div style={{
                        fontSize: 9,
                        fontWeight: 300,
                        letterSpacing: '0.15em',
                        opacity: 0.35,
                        marginBottom: 6,
                      }}>
                        {String(project.careerNo).padStart(3, '0')}
                      </div>
                      <BilingualText
                        value={project.title}
                        order="en-first"
                        primaryStyle={{ fontSize: 16, fontWeight: 500, lineHeight: 1.35, letterSpacing: '-0.01em', wordBreak: 'keep-all' }}
                        secondaryStyle={{ fontSize: 12, fontWeight: 400, lineHeight: 1.3, opacity: 0.6, wordBreak: 'keep-all' }}
                        gap={2}
                      />
                      {project.subtitle && (
                        <div style={{ marginTop: 8 }}>
                          <BilingualText
                            value={project.subtitle}
                            order="en-first"
                            primaryStyle={{ fontSize: 11, fontWeight: 300, lineHeight: 1.4, opacity: 0.75, wordBreak: 'keep-all' }}
                            secondaryStyle={{ fontSize: 10, fontWeight: 300, lineHeight: 1.4, opacity: 0.5, wordBreak: 'keep-all' }}
                            gap={1}
                          />
                        </div>
                      )}
                    </div>

                    {/* AWARDS — 타이틀 세트 고정 슬롯 직후. 시작 y좌표가 전 프로젝트에서 동일하다.
                        아래 CLIENT 이하는 수상 개수에 따라 자연히 밀린다 */}
                    {(() => {
                      const shown = project.awards?.filter(a => a.visible !== false) ?? []
                      if (shown.length === 0) return null
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {shown.map((a, i) => (
                            <div key={i} style={{
                              fontSize: 15,
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

                    {/* CLIENT + LOCATION — 하나의 논리 블록 (2블록과 동일 내부 간격) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <MetaField label="CLIENT" value={project.client} />
                      <MetaField label="LOCATION" value={project.location} />
                    </div>

                    {/* 2블록 — TYPOLOGY / SIZE / STATUS / YEAR 세로 스택 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <MetaField label="TYPOLOGY" value={project.type} />
                      <MetaField
                        label={project.size ? sizeLabel(project.size) : 'SIZE'}
                        value={project.size ? sizeValue(project.size) : undefined}
                      />
                      <MetaField label="STATUS" value={project.status} />
                      <MetaField label="YEAR" value={String(project.year)} />
                    </div>

                    {/* 3블록 — ROLE. 직위 + 업무 2단 */}
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 300, letterSpacing: '0.1em', opacity: 0.45 }}>
                        ROLE
                      </div>
                      {project.role ? (() => {
                        const { position, tasks } = splitRole(project.role)
                        return (
                          <>
                            <div style={{
                              fontSize: 11,
                              fontWeight: 400,
                              letterSpacing: '0.04em',
                              textTransform: 'uppercase',
                              marginTop: 3,
                            }}>
                              {position}
                            </div>
                            {tasks && (
                              <div style={{
                                fontSize: 9,
                                fontWeight: 300,
                                lineHeight: 1.6,
                                opacity: 0.5,
                                marginTop: 4,
                                wordBreak: 'keep-all',
                              }}>
                                {tasks}
                              </div>
                            )}
                          </>
                        )
                      })() : (
                        <div style={{ fontSize: 11, fontWeight: 400, marginTop: 3, opacity: 0.25 }}>—</div>
                      )}
                    </div>
                  </div>

                  {slides.length > 0 ? slides.map((slide, idx) => (
                    <div
                      key={idx}
                      style={{
                        // 트랙 자식 인덱스 = idx + 1 (정보 슬라이드가 0) — rects의 계산 폭을 그대로 예약
                        width: rects[idx + 1]?.w ?? 0,
                        height: isDiagram(slide) ? diagramH : slideH,
                        flexShrink: 0,
                        position: 'relative',
                      }}
                    >
                      <SlideContent slide={slide} nearCenter={isNearCenter(idx + 1)} finePointer={finePointer} onDiagramHover={setDiagramHover} />
                    </div>
                  )) : (
                    <div style={{
                      width: FALLBACK_RATIO * slideH,
                      height: slideH,
                      flexShrink: 0,
                      background: project.coverColor ?? '#1E1C18',
                    }} />
                  )}
                </div>

                {/* 슬라이드 카운터 — 정보 슬라이드 제외한 콘텐츠 번호 (트랙과 함께 페이드) */}
                <div style={{
                  position: 'absolute',
                  bottom: 20,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontFamily: FONT,
                  fontSize: 12,
                  fontWeight: 300,
                  color: '#0a0908',
                  opacity: 0.6,
                  pointerEvents: 'none',
                  zIndex: 5,
                }}>
                  {String(displayIdx).padStart(2, '0')} / {String(total).padStart(2, '0')}
                </div>
            </div>

            {/* 외부 커서 추적 글리프 — 커서 지점에 중심 정렬 */}
            {showGlyph && cursor && (
              <span style={{
                position: 'absolute',
                left: cursor.x,
                top: cursor.y,
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
                fontFamily: FONT,
                fontSize: 64,
                fontWeight: 300,
                lineHeight: 1,
                color: '#FFFFFF',
                mixBlendMode: 'difference',
                zIndex: 5,
                userSelect: 'none',
              }}>
                {glyphSide === 'right' ? '›' : '‹'}
              </span>
            )}
          </div>

          {/* ── Back + 타이틀 — 좌상단 오버레이 (트랙 위, 배경 투명) ── */}
          <div style={{
            position: 'absolute',
            top: 32,
            left: 24,
            zIndex: 6,
            fontFamily: FONT,
            color: '#080706',
          }}>
            <button
              onClick={onBack}
              style={{
                display: 'block',
                background: 'none',
                border: 'none',
                padding: 0,
                fontFamily: FONT,
                fontSize: 11,
                fontWeight: 300,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#080706',
                cursor: 'pointer',
              }}
            >
              ← Back
            </button>
          </div>
        </>
      )}

      {/* ── 모프 레이어: 카드 rect ↔ 트랙 index 1(히어로) rect ── */}
      {morphRect && (
        project.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.coverImage}
            alt=""
            draggable={false}
            style={{
              position: 'absolute',
              top: morphRect.top,
              left: morphRect.left,
              width: morphRect.width,
              height: morphRect.height,
              objectFit: 'cover',
              opacity: morphVisible ? 1 : 0,
              transition: `all ${MORPH_MS}ms ${EASE}, opacity ${MORPH_FADE_MS}ms ease-out`,
              pointerEvents: 'none',
              zIndex: 6,
            }}
          />
        ) : (
          <div style={{
            position: 'absolute',
            top: morphRect.top,
            left: morphRect.left,
            width: morphRect.width,
            height: morphRect.height,
            background: project.coverColor ?? '#1E1C18',
            opacity: morphVisible ? 1 : 0,
            transition: `all ${MORPH_MS}ms ${EASE}, opacity ${MORPH_FADE_MS}ms ease-out`,
            pointerEvents: 'none',
            zIndex: 6,
          }} />
        )
      )}
    </div>
  )
}
