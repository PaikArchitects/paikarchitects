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
// gridThumb43: 그리드 카드와 **동일한** 4:3 크롭 URL — 역-morph 상위(도착=카드)가 카드와
// 같은 화각으로 안착하려면 함수·인자(800·coverHotspot)가 카드 쪽과 정확히 같아야 한다.
// sanityThumb: 폭 전용(크롭 없음) — 진입 morph 하위 레이어용 (GRID_MORPH_crop_match §2)
import { gridThumb43, sanityThumb } from '@/lib/imageUrl'

const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"

const INFO_SLIDE_W = 270     // 세로 스택 — 수평 4열 폐기 (260714-B). 260721 200→240. 260804 240→270
// 260804: 메타 좌우 내부 여백. 폭 예약을 INFO_SLIDE_W + META_PAD_X*2로 확장하여
// border-box 기준 텍스트 실폭은 INFO_SLIDE_W(270)로 유지된다 (스크롤 재발 없음)
const META_PAD_X = 16
// 폭 예약(rects widths[0])·트랙 자식 0 width의 공통 단일 소유값 = 302.
// 두 지점이 어긋나면 중앙정렬·morph 계산이 깨지므로 반드시 이 상수를 함께 참조한다
const META_SLOT_W = INFO_SLIDE_W + META_PAD_X * 2
// 타이틀 세트 고정 슬롯 높이 — AWARDS 시작 y를 전 프로젝트 동일화. INFO_SLIDE_W(270) 기준
// 결정론적 산출(영문타이틀 3줄+한글 2줄+서브 영3/한2, 260720 명세): 합 181.2 → 182
// 260721: 폭 200→240 확대에 따른 재산출. 기존 197 → 175 (비례 164 + 여유 11)
// 260804: 폭 240→270 확대에 따른 재산출. 기존 175 → 160 (비례 146 + 여유 14)
const TITLE_SET_MIN_H = 160
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
// 배경 페이드 지속. 역-morph 동안 배경을 유지하다 도착 시점에 맞춰 걷는다 (작업 ②).
// 해제 시점 = MORPH_MS - BACKDROP_FADE_MS → 페이드 완료가 morph 도착과 일치한다
const BACKDROP_FADE_MS = 300
// 역-morph 도착 직전 상위 레이어(카드 썸네일)로 크로스페이드하는 리드 타임 (작업 ③)
const MORPH_SWAP_LEAD_MS = 200
// 원본 교체 페이드 — 짧을수록 두 크롭(4:3 썸네일 / 원본 비율)이 겹쳐 보이는 구간이 줄어 덜 튄다
const FULL_FADE_MS = 120
const SLIDE_H_RATIO = 0.72     // image·credits·info 슬라이드 높이 (뷰포트 대비)
const DIAGRAM_H_RATIO = 0.48   // diagramSet·단일 다이어그램 이미지 영역 높이 (뷰포트 대비)

// ── 메타 sticky (GRID_CONTENT_meta_sticky_v2_260804) ──
// 메타 본문은 트랙 자식 0으로 렌더된다 — 트랙의 translateX/transition을 물려받아 동기화.
// 트랙이 높이를 맞추므로 bleed 보정(구 META_BLEED)은 구조적으로 불필요해졌다.
const META_TOP_PAD = 28   // BACK 위 상단 여백 — 상단 붙음 완화 (28 상한)
const META_GAP = 18       // 메타 세로 스택 gap (기존 24 → 18, 하단 압축)
const META_MARGIN = 24    // sticky 최좌측 고정선 — 뷰포트 좌측 여백 (TRACK_INSET과 동일값)

// 역-morph 여유 — 부모(GridExperience)의 언마운트 타이머가 이 값 이상이어야 한다
export const REVERSE_MORPH_TAIL_MS = 60
// 직접 진입 닫기 — 역-morph 대신 콘텐츠 페이드아웃 (트랙 페이드 400ms와 동일 지속)
const FADE_OUT_MS = 400

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

// 커버 = 첫 슬라이드 (GRID_CONTENT_v3 §3). ContentArea.tsx와 동일 로직 — 한쪽만 바꾸지 말 것.
// 커버를 항상 첫 image 슬라이드로 prepend하고 실제 slides를 이어붙인다. 캡션은 project.coverCaption,
// 비율은 project.coverRatio(Sanity metadata 원본 aspect) — rects 폭이 원본비가 된다(4/3 고정 금지).
function getSlides(project: Project): ProjectSlide[] {
  const rest = project.slides ?? []
  if (!project.coverImage) return rest
  const cover: ImageSlide = {
    kind: 'image',
    src: project.coverImage,
    ...(project.coverCaption ? { caption: project.coverCaption } : {}),
    ...(project.coverRatio && project.coverRatio > 0 ? { ratio: project.coverRatio } : {}),
  }
  return [cover, ...rest]
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
  // 카드와 1:1로 같은 URL — GridExperience 카드 <img>의 호출부와 인자를 일치시킨다
  // (gridThumb43(project.coverImage, 800, project.coverHotspot)). 역-morph 상위 레이어(도착
  // 지점이 카드)는 이 URL을 그대로 써야 카드와 화각이 어긋나지 않는다 (작업 ①)
  const coverThumb = useMemo(
    () => (project.coverImage ? gridThumb43(project.coverImage, 800, project.coverHotspot) : ''),
    [project.coverImage, project.coverHotspot],
  )
  // 진입 morph 하위 레이어 — 상위(원본)와 동일 화각이어야 교체 시 배율이 튀지 않는다.
  // gridThumb43(4:3 크롭)은 원본에서 이미 잘려나간 상태라 같은 컨테이너에 cover로 채워도
  // 피사체가 더 크게 잡힌다 → 상위 원본이 올라오는 순간 화각이 튄다. 폭 전용 썸네일을 써서
  // 두 레이어가 같은 범위를 보여주고 해상도만 달라지게 한다 (GRID_MORPH_crop_match §2-2)
  const morphThumbSrc = useMemo(
    () => (project.coverImage ? sanityThumb(project.coverImage, 800) : ''),
    [project.coverImage],
  )
  const finePointer = useFinePointer()

  const rootRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)     // transform 적용 대상 (측정 용도 없음)

  // ── Idle→Active 모프 전환 ──
  const [morphing, setMorphing] = useState(false)
  const [morphRect, setMorphRect] = useState<MorphRect | null>(null)
  const [morphVisible, setMorphVisible] = useState(false)   // 모프 레이어 표시 — morphing과 분리 (크로스페이드)
  // 모프 레이어 상위(원본/카드 썸네일) 표시 여부. 진입에서는 원본 onLoad가, 역-morph에서는
  // 도착 직전 타이머가 켠다. 하위 레이어가 그 전까지 화면을 채워 깜빡임을 막는다 (작업 ①·③)
  const [morphFullLoaded, setMorphFullLoaded] = useState(false)
  // 역-morph 출발 이미지 = 지금 보고 있던 슬라이드. 진입 시에는 null(= 커버 썸네일에서 출발)
  const [morphFromSrc, setMorphFromSrc] = useState<string | null>(null)
  // 역-morph 동안 흰 배경을 유지해 그리드 조기 노출을 막는다 — 진입의 역재생 대칭 (작업 ②)
  const [holdBackdrop, setHoldBackdrop] = useState(false)
  const prevModeRef = useRef(mode)
  // 진입 모프는 vpSize가 잡힌 렌더에서 1회만 발동한다 (리사이즈로 effect가 재실행돼도 재발동 금지)
  const morphStartedRef = useRef(false)
  // 진입/역-morph 타이머 — 언마운트에서만 정리한다 (effect 재실행에 끊기면 모프가 멈춘다)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  // ── 연속 트랙 (픽셀 스크롤 모델) ──
  // scrollPos 0 = 트랙 좌측 끝 = 뷰포트 좌측 끝 ([정보 슬라이드][히어로]가 좌측부터 보임).
  // 하한은 0이 아니라 minScroll이다 — 좁은 히어로를 정중앙에 세우려면 트랙이 0보다 우측으로
  // 밀려야 하므로 음수를 허용한다 (GRID_CONTENT_center_fix §1-1)
  const [scrollPos, setScrollPos] = useState(0)
  const [vpSize, setVpSize] = useState({ w: 0, h: 0 })   // viewportRef의 clientWidth/Height — 유일한 관찰 대상
  const [dragging, setDragging] = useState(false)
  const [animated, setAnimated] = useState(false)      // 화살표/키보드/플릭 이동 시에만 transition
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)
  const [diagramHover, setDiagramHover] = useState(false)
  const [infoIn, setInfoIn] = useState(false)
  const [trackIn, setTrackIn] = useState(false)
  // 직접 진입(enterRect null)의 닫기 — 되돌아갈 카드 rect가 없어 역-morph 대신 페이드아웃한다.
  // 콘텐츠 블록은 mode==='active'로만 마운트되므로 페이드가 재생될 창을 이 플래그가 연다
  // (GRID_URL_split §3-2). 클릭 진입은 이 플래그를 켜지 않아 기존 역-morph 그대로다.
  const [fadingOut, setFadingOut] = useState(false)
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
    const widths: number[] = [META_SLOT_W]   // 트랙 자식 0 = 정보 슬라이드 (패딩 포함 슬롯 폭)
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

  // ── 중앙정렬 산식 (GRID_CONTENT_center_fix §1-1) ──
  // 트랙 자식 i의 화면 좌측 = TRACK_INSET + rects[i].x - scrollPos.
  // 이를 (viewportW - rects[i].w)/2 (= 정중앙)에 맞추는 scrollPos가 중앙정렬 값이다.
  // ⚠ centers[i](슬롯 중심) 기준 역산은 실제 이미지 폭을 반영하지 못한다 — 폐기.
  //   초기 진입·화살표·리사이즈 재중앙 전부 이 한 함수를 쓴다(경로 간 24px 어긋남 방지).
  //   반환값 px 정수. transform 퍼센트 정렬은 쓰지 않는다(Safari).
  const centerScroll = (i: number) =>
    i >= 0 && i < rects.length
      ? Math.round((TRACK_INSET + rects[i].x) - (viewportW / 2 - rects[i].w / 2))
      : 0

  // 모든 슬라이드를 뷰포트 정중앙에 스냅 가능하게 — 콘텐츠 슬라이드(인덱스 1..)의
  // centerScroll 최소/최대를 경계로 삼는다. 양 끝 슬라이드에서 반대편 여백은 허용한다.
  // (인덱스 0 = 정보 슬라이드는 스냅 대상이 아니므로 제외)
  const contentCenterScrolls = rects.length >= 2
    ? Array.from({ length: rects.length - 1 }, (_, k) => centerScroll(k + 1))
    : [0]
  const minScroll = Math.min(...contentCenterScrolls)
  const maxScroll = Math.max(...contentCenterScrolls)

  // 뷰포트 중심을 트랙 좌표계로 환산 — 트랙은 TRACK_INSET만큼 우측에서 시작한다
  const viewportCenter = scrollPos - TRACK_INSET + viewportW / 2
  let nearest = 0
  for (let i = 1; i < centers.length; i++) {
    if (Math.abs(centers[i] - viewportCenter) < Math.abs(centers[nearest] - viewportCenter)) nearest = i
  }

  const clampScroll = (v: number) => Math.min(maxScroll, Math.max(minScroll, v))

  // 메타 sticky — 자연 위치(TRACK_INSET - scrollPos)가 여백선보다 왼쪽이면 그만큼 우측 보정.
  // 트랙과 같은 transition을 타므로 클램프 구간에서도 점프 없이 연속으로 붙는다 (v2 작업 ①)
  const metaShift = Math.max(0, META_MARGIN - (TRACK_INSET - scrollPos))

  // 다이어그램 화살표 우선순위 — 슬라이드 중앙이 뷰포트 중앙 ±20% 이내일 때만 활성
  const isNearCenter = (trackIdx: number) =>
    viewportW > 0 && trackIdx < centers.length &&
    Math.abs(centers[trackIdx] - viewportCenter) < viewportW * 0.2

  // 모프 effect가 최신 기하를 읽는 통로 — effect deps(mode·vpSize)만으로는 scrollPos가 stale해진다
  const geomRef = useRef({ rects, centers, scrollPos, clampScroll, centerScroll })
  geomRef.current = { rects, centers, scrollPos, clampScroll, centerScroll }

  // ── 리사이즈 재중앙 — 변경 직전 nearest를 새 rects 기준으로 무애니메이션 재정렬. 드래그 중 생략 ──
  const nearestRef = useRef(0)
  useEffect(() => { nearestRef.current = nearest })

  useLayoutEffect(() => {
    if (vpSize.w === 0 || dragState.current) return
    const idx = Math.min(nearestRef.current, centers.length - 1)
    if (idx < 0) return
    setAnimated(false)
    setScrollPos(clampScroll(centerScroll(idx)))
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
      setFadingOut(false)
      // 이전 세션(역-morph)의 잔존 차단 — 배경 유지·출발 이미지·상위 레이어를 초기화한다.
      // 특히 holdBackdrop이 남으면 다음 닫기에서 배경이 걷히지 않는다 (작업 ② 정리)
      setHoldBackdrop(false)
      setMorphFromSrc(null)
      setMorphFullLoaded(false)

      const { rects: rc, clampScroll: cs, centerScroll: ccs } = geomRef.current
      const rh = rootRef.current.clientHeight

      // 슬라이드 0개 엣지 케이스 대비: rects가 2개 미만이면 링월과 동일한 좌측 상주로 폴백 (§2-5)
      const hasHero = rc.length >= 2
      // 초기 scrollPos = 히어로 실제 폭(rects[1].width) 기준 중앙정렬 역산
      // (GRID_CONTENT_center_fix §1-1). goToSlide·리사이즈 재중앙과 동일 함수를 쓴다.
      // 직접 진입·클릭 진입 공통이다: 양쪽 모두 히어로 중앙에 정착한다 (GRID_URL_split §3-1)
      const initScroll = hasHero ? Math.round(cs(ccs(1))) : 0

      setScrollPos(initScroll)
      setAnimated(false)

      // ── 직접 진입(enterRect === null) — morph 생략, 콘텐츠 즉시 표시 (GRID_URL_split §3-1) ──
      // 새로고침·공유로 /work-grid/[slug]를 열면 출발 카드 rect가 존재하지 않는다. 모프 레이어를
      // 아예 띄우지 않고 트랙·정보 슬라이드만 켠다(직후 trackIn/infoIn effect가 페이드인 처리).
      if (enterRect === null) {
        setMorphing(false)
        setMorphVisible(false)
        setMorphRect(null)
        setMorphFullLoaded(false)
        setTrackIn(true)
        setInfoIn(true)
        return
      }

      // ── 클릭 진입 — 기존 카드→히어로 morph ──
      // 도착 aspect = Sanity metadata 원본 비율 (GRID_CONTENT_v3 §2-1). 출발은 4:3 카드 rect이므로
      // 모프 중 종횡비가 4:3 → 원본비로 변하며 확대된다. 4/3은 metadata 부재 시 폴백일 뿐이다.
      const aspect = project.coverRatio && project.coverRatio > 0
        ? project.coverRatio
        : FALLBACK_RATIO
      // 도착 높이는 트랙 슬라이드와 **동일한 기준**이어야 한다 — 폭(rc[1].w)은 slideH 기준으로
      // 계산된 값이므로 높이를 루트 컨테이너(rh) 기준으로 잡으면 종횡비가 어긋나
      // objectFit:'cover'가 확대 크롭한다(= 모프 종료 찰나의 "큰 이미지"). slideH로 통일한다.
      const th = slideH
      // 도착 폭은 트랙이 예약한 rects[1].w 그대로 — getSlides가 주입한 coverRatio로 계산된 값이라
      // aspect 기반 재계산과 같지만, 1px도 어긋나지 않도록 동일 소스를 쓴다
      const tw = hasHero ? rc[1].w : th * aspect
      // morph 도착 left = 정중앙 vpSize.w/2 - heroW/2 (GRID_CONTENT_center_fix §1-2).
      // 단 clamp된 initScroll에서 파생시킨다 — 정착 scrollPos와 morph 도착이 항상 동일
      // 픽셀을 가리켜야 모프 종료 시 이미지가 튀지 않는다. clamp가 걸리지 않는 한(=평시)
      // 이 값은 vpSize.w/2 - tw/2 와 정확히 같다. 좌측 고정 잔재는 제거했다 (전부 px 정수)
      const heroScreenLeft = hasHero
        ? Math.round(TRACK_INSET + rc[1].x - initScroll)
        : Math.round(vpSize.w / 2 - tw / 2)

      setMorphing(true)
      setMorphVisible(true)
      // 개조 2 — 시작 rect는 클릭한 카드
      setMorphRect(enterRect)

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
        setTimeout(() => {
          if (cancelled) return
          setMorphRect(null)
          setMorphFullLoaded(false)   // 다음 morph가 상위 레이어를 물려받지 않도록 초기화
        }, MORPH_MS + MORPH_HOLD_MS + MORPH_FADE_MS),
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
        const hasHero = rc.length >= 2

        // 작업 ③ — 출발은 커버(rc[1]) 고정이 아니라 **지금 보고 있는 슬라이드**다.
        // 커버 고정은 슬라이드를 넘긴 뒤(sp가 커진 뒤) 화면 밖 좌측 좌표가 되어 "날아오는"
        // 모습을 만든다. nearest(= centers와 viewportCenter의 최근접 트랙 자식, 매 렌더 갱신)를
        // 그대로 쓴다 — 중앙 최근접 산출이 이미 이 값이므로 별도 계산은 중복이다.
        // 0은 메타 슬라이드라 스냅 대상이 아니므로 콘텐츠 인덱스 1.. 로 클램프한다.
        const curIdx = hasHero
          ? Math.min(Math.max(1, nearestRef.current), rc.length - 1)
          : 1
        // 슬라이드마다 높이가 다르다 — rects에는 폭(x·w)만 있고 높이는 트랙 렌더와 동일한
        // 값(isDiagram ? diagramH : slideH)을 그대로 쓴다. 진입 morph와 같은 이유로 rh 기준
        // 재계산은 폭(rc[curIdx].w)과 기준이 어긋나 종횡비가 깨진다 — 트랙 높이를 직접 참조한다.
        // 트랙은 alignItems:center이므로 세로 중앙 정렬은 두 높이 모두 (rh - th)/2로 같다.
        const curSlide = hasHero ? slides[curIdx - 1] : undefined
        const curSlideH = curSlide && isDiagram(curSlide) ? diagramH : slideH
        const th = curSlideH
        const tw = hasHero
          ? rc[curIdx].w
          : th * (project.coverRatio && project.coverRatio > 0 ? project.coverRatio : FALLBACK_RATIO)
        // 출발 left = 그 슬라이드가 지금 화면에서 서 있는 자리 (트랙 좌표 → 화면 좌표)
        const heroScreenLeft = hasHero
          ? Math.round(TRACK_INSET + rc[curIdx].x - sp)
          : Math.round(vpSize.w / 2 - tw / 2)

        // 출발 이미지도 그 슬라이드여야 자연스럽다. image 슬라이드가 아니면(텍스트·인용·
        // 크레딧·다이어그램셋) null로 두어 커버 썸네일에서 출발한다 — rect만 현재 자리를 쓴다
        const fromSrc = curSlide && curSlide.kind === 'image' ? curSlide.src : null
        setMorphFromSrc(fromSrc)
        // 상위(카드 썸네일)는 도착 직전에 올린다. 여기서는 반드시 내려둔 채 시작
        setMorphFullLoaded(false)

        // 작업 ② — 배경을 morph 도착까지 유지한다. 300ms에 걷히던 기존 동작은 역-morph
        // 700ms의 남은 400ms를 허공에서 재생시켜 "다른 카드 위에서 축소"처럼 보이게 했다
        setHoldBackdrop(true)
        setMorphVisible(true)
        setMorphRect({ top: (rh - th) / 2, left: heroScreenLeft, width: tw, height: th })

        let cancelled = false
        requestAnimationFrame(() => requestAnimationFrame(() => {
          if (cancelled) return
          setMorphRect(enterRect)   // 카드 rect로 축소
        }))

        timersRef.current.push(
          // 도착 직전 — 슬라이드 이미지 → 카드 썸네일 크로스페이드. 도착 프레임에서 카드와
          // 완전히 같은 URL·같은 크롭이 되어 그리드로 이음매 없이 넘어간다
          setTimeout(() => {
            if (cancelled) return
            setMorphFullLoaded(true)
          }, Math.max(0, MORPH_MS - MORPH_SWAP_LEAD_MS)),
          // 배경은 도착과 함께 걷히도록 페이드 지속만큼 앞당겨 해제한다
          setTimeout(() => {
            if (cancelled) return
            setHoldBackdrop(false)
          }, Math.max(0, MORPH_MS - BACKDROP_FADE_MS)),
          setTimeout(() => {
            if (cancelled) return
            setMorphVisible(false)
            setMorphRect(null)
            setMorphFullLoaded(false)
            setMorphFromSrc(null)
          }, MORPH_MS + REVERSE_MORPH_TAIL_MS),
        )

        return () => { cancelled = true }
      }

      // ── 직접 진입(enterRect === null) — 되돌아갈 카드 rect가 없다. 역-morph를 생략하고
      //    콘텐츠를 페이드아웃시킨 뒤 그리드 랜딩을 드러낸다 (GRID_URL_split §3-2).
      //    위에서 trackIn·infoIn을 이미 false로 내렸으므로 fadingOut이 그 페이드가 재생될
      //    동안 콘텐츠 블록을 마운트 상태로 유지한다. scrollPos 리셋은 페이드 후로 미룬다
      //    — 보이는 중에 트랙이 좌측 끝으로 튀지 않게 한다.
      // holdBackdrop은 켜지 않는다 — 이 경로는 기존 페이드아웃 동작 그대로다 (작업 ② 단서)
      setMorphVisible(false)
      setMorphRect(null)
      setMorphFullLoaded(false)
      setMorphFromSrc(null)
      setFadingOut(true)
      timersRef.current.push(setTimeout(() => {
        setFadingOut(false)
        setScrollPos(0)
        setAnimated(false)
      }, FADE_OUT_MS))
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
    setScrollPos(clampScroll(centerScroll(i)))
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
    // 좌측 글리프는 하한(minScroll — 히어로 중앙정렬 지점, 음수일 수 있다) 위에서만
    (glyphSide === 'right' ? scrollPos < maxScroll - 1 : scrollPos > minScroll + 1)

  // 카운터: 정보 슬라이드 제외 — 콘텐츠 슬라이드 번호(1..) 기준
  const displayIdx = Math.min(Math.max(nearest, 1), total)

  // 정보 슬라이드 본문 — 항상 sticky 오버레이 한 곳에만 렌더된다
  // (GRID_CONTENT_meta_sticky_260804 작업 ①. 트랙 자식 0은 폭 예약 전용 빈 자리)
  const infoContent = (
    <>
      {/* ── Back — 정보 슬라이드 최상단(careerNo 위). 좌상단 로고와 겹치지 않도록
          오버레이가 아니라 트랙 안에 둔다 (v2 §3). 링월 ContentArea의 버튼 스타일 동일 ── */}
      <div>
        <button
          onClick={onBack}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
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

      {/* 타이틀 세트 — 고정 높이 슬롯. AWARDS 시작 y를 전 프로젝트 동일화 */}
      <div style={{ minHeight: TITLE_SET_MIN_H, marginBottom: 14 }}>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <MetaField label="CLIENT" value={project.client} />
        <MetaField label="LOCATION" value={project.location} />
      </div>

      {/* 2블록 — TYPOLOGY / SIZE / STATUS / YEAR 세로 스택 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
    </>
  )

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
        // holdBackdrop — 역-morph가 카드 자리에 도착할 때까지 배경을 유지한다. idle 즉시
        // 걷히던 기존 동작은 morph 700ms의 나머지를 그리드 위에서 재생시켰다 (작업 ②)
        background: (mode === 'active' || holdBackdrop) ? '#FFFFFF' : 'transparent',
        transition: `background-color ${BACKDROP_FADE_MS}ms ease-out`,
      }}
    >
      {/* fadingOut = 직접 진입 닫기 페이드 창 (§3-2). 클릭 진입은 항상 false라 기존과 동일 */}
      {(mode === 'active' || fadingOut) && (
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
                  {/* 트랙 첫 자식 = 메타 본문. 트랙의 translateX/transition을 물려받아 슬라이드와 완전 동기화된다.
                      sticky 클램프는 transform translateX(shift)로 처리하며, shift에도 트랙과 동일한 600ms
                      transition을 걸어 전 구간 동일 곡선을 탄다(GRID_CONTENT_meta_sticky_v2 작업 ①).
                      폭 META_SLOT_W 예약은 rects 인덱싱(0=정보, 1..=콘텐츠)·중앙정렬이 의존하므로 필수 유지
                      (rects widths[0]와 반드시 동일한 상수를 참조할 것).
                      transform은 레이아웃 폭에 영향을 주지 않으므로 rects는 그대로 유효하다 */}
                  <div style={{
                    width: META_SLOT_W,
                    flexShrink: 0,
                    height: slideH,
                    boxSizing: 'border-box',
                    position: 'relative',
                    zIndex: 7,                        // 이웃 슬라이드 위에 얹히도록 (겹칠 때 메타가 위)
                    transform: `translateX(${metaShift}px)`,                      // sticky 클램프
                    transition: animated && !dragging ? `transform 600ms ${EASE}` : 'none',  // 트랙과 동일
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    gap: META_GAP,
                    paddingLeft: META_PAD_X,   // 260804: 302 - 16 - 16 = 텍스트 실폭 INFO_SLIDE_W(270) 유지
                    paddingRight: META_PAD_X,
                    paddingTop: META_TOP_PAD,
                    fontFamily: FONT,
                    color: '#080706',
                    background: 'rgba(255,255,255,0.82)',       // 작업 ② — blur와 함께 사용
                    backdropFilter: 'blur(10px)',               // 작업 ② — 뿌옇게 유지
                    WebkitBackdropFilter: 'blur(10px)',
                    opacity: infoIn ? 1 : 0,
                    overflowY: 'auto',
                  }}>
                    {infoContent}
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

          {/* Back 버튼은 좌상단 오버레이(로고와 충돌)에서 정보 슬라이드 최상단으로 이동했다 (v2 §3) */}
        </>
      )}

      {/* ── 모프 레이어: 카드 rect ↔ 현재 슬라이드 rect ──
          2겹이다. 두 겹은 **동일한 rect·objectFit**을 공유해야 교체 순간 어긋나지 않는다.
            하위 = 즉시 그려져야 하는 쪽. 진입에서는 폭 전용 저해상 썸네일(morphThumbSrc —
                   상위 원본과 화각 동일, crop_match §2-2), 역-morph에서는 보고 있던 슬라이드
                   원본(morphFromSrc).
            상위 = 목적지 이미지. 진입에서는 원본(onLoad 시), 역-morph에서는 카드 썸네일
                   (도착 직전 타이머). 둘 다 morphFullLoaded 하나로 켠다. */}
      {morphRect && (
        project.coverImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={morphFromSrc ?? morphThumbSrc}
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={morphFromSrc ? coverThumb : project.coverImage}
              alt=""
              draggable={false}
              // 역-morph(morphFromSrc 있음)에서는 onLoad로 켜지 않는다 — 카드 썸네일은 이미
              // 캐시돼 즉시 load되므로, 켜면 출발 프레임에서 곧바로 커버로 튄다. 그 경로는
              // 도착 직전 타이머가 켠다
              onLoad={() => { if (!morphFromSrc) setMorphFullLoaded(true) }}
              style={{
                position: 'absolute',
                top: morphRect.top,
                left: morphRect.left,
                width: morphRect.width,
                height: morphRect.height,
                objectFit: 'cover',
                opacity: morphVisible && morphFullLoaded ? 1 : 0,
                transition: `all ${MORPH_MS}ms ${EASE}, opacity ${FULL_FADE_MS}ms ease-out`,
                pointerEvents: 'none',
                zIndex: 7,
              }}
            />
          </>
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
