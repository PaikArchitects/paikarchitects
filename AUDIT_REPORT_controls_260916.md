# AUDIT_REPORT_controls_260916 — 컨트롤·헤더 영역 보완 감사

감사 대상: `D:\00 Web\paikarchitects`
실행일: 2026-09-16 (LANDING_SWITCH_P1_260916 적용 후 상태)
생성 파일: 본 파일 1개. 소스 파일 수정·삭제·포맷 없음. `npm run dev`/`build`/`install` 미실행.
기록 원칙: 줄 번호 포함 원문 발췌만. 결과 없으면 "없음(0건)".

---

## 1. `HEADER_H` · `UI_PAD` · `BAR_RESERVE` 전수 검색 (`src/` 전체)

총 **16건**.

```
src\components\GridExperience.tsx:46:const UI_PAD = 34               // 헤더·컨트롤·그리드 공유 좌우 여백 (링월 헤더 기준)
src\components\GridExperience.tsx:55:const HEADER_H = 80             // 전역 헤더(워드마크·nav) 존 회피 상단 여백
src\components\GridExperience.tsx:56:const BAR_RESERVE = 120         // 하단 플로팅 밀도바 회피 여백
src\components\GridExperience.tsx:228:    const full = Math.max(1, vp.w - UI_PAD * 2)
src\components\GridExperience.tsx:238:    const originX = UI_PAD + (full - rowW) / 2
src\components\GridExperience.tsx:398:      paddingTop: HEADER_H,
src\components\GridExperience.tsx:399:      paddingBottom: BAR_RESERVE,
src\components\GridExperience.tsx:495:        paddingLeft: UI_PAD,
src\components\GridExperience.tsx:496:        paddingRight: UI_PAD,
src\components\LandingExperience.tsx:14:const HEADER_H = 80   // 데스크톱 헤더 존. 필터 행 포함 여유치
src\components\LandingExperience.tsx:395:          top: HEADER_H,
src\components\MobileProjectWall.tsx:21:const HEADER_H = 56          // 모바일 헤더 바 높이 (SiteHeader .mobile-header-bar와 일치)
src\components\MobileProjectWall.tsx:1030:      const containerH = window.innerHeight - HEADER_H
src\components\MobileProjectWall.tsx:1034:      const cardTop = HEADER_H + containerH / 2 - slot0 / 2   // 슬롯 상단 (= 이미지 상단)
src\components\MobileProjectWall.tsx:1077:          top: HEADER_H,
src\components\MobileProjectWall.tsx:1219:          top: HEADER_H,
```

식별자별 정의:

| 식별자 | 정의 파일:행 | 값 | 사용처 건수 |
|---|---|---|---|
| `UI_PAD` | `GridExperience.tsx:46` | `34` | 4건 (228, 238, 495, 496) |
| `HEADER_H` | `GridExperience.tsx:55` | `80` | 1건 (398) |
| `HEADER_H` | `LandingExperience.tsx:14` | `80` | 1건 (395) |
| `HEADER_H` | `MobileProjectWall.tsx:21` | `56` | 4건 (1030, 1034, 1077, 1219) |
| `BAR_RESERVE` | `GridExperience.tsx:56` | `120` | 1건 (399) |

`HEADER_H`는 3개 파일에 각각 독립 정의되어 있고 값이 **80 / 80 / 56**으로 갈린다. `UI_PAD`·`BAR_RESERVE`는 `GridExperience.tsx` 단일 정의다.

---

## 2. `src/components/GridExperience.tsx`

파일 총 행수: **748행** (LANDING_SWITCH_P1 적용 후).

### 2-(a) 파일 시작 ~ 컴포넌트 선언 직전 (1–105행)

```tsx
  1  'use client'
  2
  3  // ── GridExperience — 독립 그리드 뷰 (GRID_REFLOW_film) ──
  4  //
  5  // 링월(/work)·랜딩(/)·ContentArea를 일절 건드리지 않는 완전 독립 라우트(/work-grid)의 루트.
  6  //
  7  // 밀도 전환 모델 — **film movement**(GRID_REFLOW_film §0~§1).
  8  //
  9  // 폐기된 모델 2종:
 10  //   (a) 정수 A·B 격자 매칭 + stay/in/out 교차 페이드 — 같은 카드가 out+in으로 분리돼 교체처럼 보임.
 11  //   (b) 앵커 보존(셀 고정) — 열이 늘 때 대기 카드를 행 끝에 끼워넣으므로 order가 깨진다.
 12  //       총 카드 수 보존이라는 물리적 귀결로 최하단 편입이 생기고, 이는 제거 불가.
 13  //
 14  // 현재 모델 — "순수 행우선 재배치":
 15  //   1) 열 수 nr에서 order 인덱스 k인 카드는 항상 `row = floor(k/nr), col = k % nr`에 놓인다.
 16  //      밀도가 바뀌면 **전 카드가 새 (row,col)로 재배치**된다. 3→4열 시 4열 첫 행은 1·2·3·4번
 17  //      (4번이 (1,0)→(0,3)으로 상승). 이건 결함이 아니라 단일 일관 규칙이다(§0).
 18  //   2) 근거: 순서가 항상 careerNo 역순이라 예측 가능하다 — 620번은 언제나 619번 앞, 줄바꿈
 19  //      시 윗줄 맨 우측. 어디서 봐도 같은 규칙이므로 학습 가능.
 20  //   3) 전환 중(분수 열): **폭 보간은 연속(c), 격자 열 수는 정수(nr = round(c))**. c가 3.0→3.5
 21  //      →4.0으로 흐르면 nr은 3→4로 스냅한다. 폭은 부드럽게, 재배치는 스냅 시점에 트윈 이동.
 22  //   4) 트윈은 CSS가 담당한다 — .gm-card에 transform·width·height·opacity transition을 상시
 23  //      걸어두고 paint는 목표값만 쓴다(§1 하단 주석).
 24  //   5) 렌더는 CSS Grid가 아니라 절대좌표(position:absolute + transform translate, px 정수 전용).
 25  //      좌우 오버플로는 overflow-x: clip으로 잘라 가로 스크롤을 만들지 않는다.
 26  //
 27  // 필터는 카드를 숨기지 않는다. 해당 카드를 좌상단부터 앞쪽에, 비해당 카드를 그 뒤에 이어
 28  // 배치해 그리드를 항상 꽉 채우고, 비해당만 opacity를 낮춘다(§4).
 29  //
 30  // 카드 프레임은 열 수와 무관하게 항상 4:3 균등폭이다. 원본 이미지 비율은 카드 폭에 일절
 31  // 반영하지 않고 object-fit:cover + coverHotspot으로 크롭한다(§2).
 32
 33  import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
 34  import { TYPOLOGY_ORDER, type Project, type ProjectType } from '@/types'
 35  import { GridContentArea } from './GridContentArea'
 36  // 링월 ↔ 그리드 전환 토글 — 링월 측과 동일 컴포넌트 (LANDING_SWITCH_P1 §4)
 37  import { ViewToggle } from './ViewToggle'
 38  // 모바일(<1024) 콘텐츠는 가로 트랙이 아니라 세로 스크롤이다 (GRID_MOBILE §2)
 39  import { MobileGridContent } from './MobileGridContent'
 40  // 4:3 크롭은 GridContentArea의 morph 하위 레이어와 공유한다 — 동일 URL이어야 캐시가 맞는다
 41  import { gridThumb43 } from '@/lib/imageUrl'
 42
 43  const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"
 44
 45  // ── 단일 정의 상수 ──
 46  const UI_PAD = 34               // 헤더·컨트롤·그리드 공유 좌우 여백 (링월 헤더 기준)
 47  const GAP = 16                  // 카드 간격 (수평·수직 공통)
 48  const CARD_RATIO = 4 / 3        // 카드 프레임 비율 — 원본 비율과 무관하게 고정 (§2)
 49  const SLIDE_H_RATIO = 0.72      // ContentArea 히어로 높이 비율 — 1열 폭 공식 (§6)
 50  const MIN_COLS = 1              // 하한. 실물 판단 후 1→3 변경은 이 한 줄만 바꾼다 (§6)
 51  const MAX_COLS = 6              // 절대 상한 (뷰포트 종횡비가 실제 상한을 더 낮출 수 있다)
 52  const DEFAULT_COLS = 3
 53  const COVER_FALLBACK = '#1E1C18'
 54  const AWARD_GOLD = '#b89773'
 55  const HEADER_H = 80             // 전역 헤더(워드마크·nav) 존 회피 상단 여백
 56  const BAR_RESERVE = 120         // 하단 플로팅 밀도바 회피 여백
 57  const TWEEN_MS = 420            // 릴리스 후 정수 정착 트윈 (§1-4)
 58  const DIM_OPACITY = 0.15        // 필터 비해당 카드 (§4)
 59  const FLOW_MS = 560             // 필터 재정렬 트랜지션 지속 — 이 시간만 transition 활성
 60  const FADE_MS = 280             // dim 전환 페이드 — 카드 opacity transition 지속
 61  const ICON_W = 34               // 스냅 아이콘 고정 폭 — 트랙 좌표계의 양단 인셋 기준 (§6)
 62  // 콘텐츠 오버레이 언마운트 지연 — GridContentArea의 역-morph(MORPH_MS 700 + 여유 60)가
 63  // 끝난 뒤에 언마운트되도록 한다 (GRID_CONTENT_AREA_SPEC §3-1 (c))
 64  const CONTENT_EXIT_MS = 760
 65
 66  // 카드 하단 텍스트 — 폭에 연동한 연속 스케일. 정수 열 경계에서 행 피치가 튀지 않게
 67  // 이산 분기(dense 플래그) 대신 폭의 연속 함수로 둔다.
 68  // 타이틀은 1행만 예약한다 — 2행 예약이 요약을 타이틀에서 멀리 밀어내던 결함(§0-2)의 원인.
 69  const META_PT = 10              // 이미지 ↔ 타이틀
 70  const TITLE_LH = 1.35
 71  const TITLE_LINES = 1           // 영문 타이틀 예약 줄 수
 72  const KO_SCALE = 0.82           // 카드 한글 타이틀 크기 비 — 영문 대비 위계를 낮춘다 (260804)
 73  const SUM_MT = 5                // 타이틀 ↔ 요약 (§5: 4~6px)
 74  const SUM_LH = 1.5
 75
 76  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
 77
 78  // 썸네일 4:3 크롭(gridThumb43)은 imageUrl.ts로 이동했다 — GridContentArea의 morph 하위
 79  // 레이어가 같은 함수·같은 인자를 써야 캐시가 맞기 때문이다 (GRID_MORPH_fix 작업 ①).
 80  // 콘텐츠 morph의 **도착** 이미지는 여전히 원본 URL이다 — 원본 비율 morph의 소스 (§4-3).
 81
 82  const titlePx = (w: number) => clamp(w * 0.030, 10, 13)
 83  const sumPx = (w: number) => clamp(w * 0.024, 8.5, 11)
 84  /** 타이틀 블록 예약 높이 — 영문 TITLE_LINES줄 + 한글 1줄. .gm-title의 CSS height와 동일 식이어야
 85   *  격자 배치(paint의 hPx)와 실제 DOM 높이가 어긋나지 않는다. 한글 유무와 무관하게 항상 예약한다 */
 86  const titleBlockH = (w: number) =>
 87    titlePx(w) * TITLE_LH * TITLE_LINES + titlePx(w) * KO_SCALE * TITLE_LH
 88  /** 카드 하단 텍스트 블록 높이 — 폭의 연속 함수 */
 89  const metaH = (w: number) =>
 90    META_PT + titleBlockH(w) + SUM_MT + sumPx(w) * SUM_LH
 91
 92  /** 뷰포트 종횡비 → 열 상한 (§6) */
 93  function maxColsForAspect(r: number): number {
 94    if (r < 0.85) return 3        // portrait — 260804: 2→3 (모바일 밀도 상한 상향)
 95    if (r < 1.25) return 4        // ~square
 96    return 6                      // landscape
 97  }
 98
 99  interface GridExperienceProps {
100    projects: Project[]   // Sanity에서 careerNo 내림차순 정렬 상태로 도착 — 재정렬 불요
101    // 직접 진입(/work-grid/[slug] 새로고침·공유) 시 즉시 열 프로젝트 slug. 없으면 그리드 랜딩만
102    // (GRID_URL_split §2-1)
103    initialSlug?: string
104  }
105
```

### 2-(b) CONTROLS 주석 ~ 컨트롤 바 블록 닫는 태그 (489–534행)

```tsx
489        {/* ── CONTROLS — 필터(좌) + 뷰토글 Ring|Grid(우) ── */}
490        <div style={{
491          display: 'flex',
492          alignItems: 'center',
493          justifyContent: 'space-between',
494          gap: 24,
495          paddingLeft: UI_PAD,
496          paddingRight: UI_PAD,
497          paddingTop: 8,
498          paddingBottom: 20,
499        }}>
500          <div style={{ display: 'flex', alignItems: 'center', gap: 24, overflowX: 'auto', minWidth: 0 }}>
501            {FILTER_TYPES.map(t => (
502              <button
503                key={t}
504                onClick={() => { if (t !== activeFilter) { startFlow(); setActiveFilter(t) } }}
505                style={{
506                  background: 'none',
507                  border: 'none',
508                  cursor: 'pointer',
509                  fontFamily: FONT,
510                  fontSize: 11,
511                  fontWeight: t === activeFilter ? 500 : 300,
512                  letterSpacing: '0.08em',
513                  textTransform: 'uppercase',
514                  color: '#080706',
515                  display: 'flex',
516                  alignItems: 'center',
517                  gap: 6,
518                  whiteSpace: 'nowrap',
519                  flexShrink: 0,
520                }}
521              >
522                <span style={{
523                  fontSize: 7,
524                  lineHeight: 1,
525                  opacity: t === activeFilter ? 1 : 0,
526                  transition: 'opacity 200ms',
527                }}>●</span>
528                {t}
529              </button>
530            ))}
531          </div>
532
533          <ViewToggle current="grid" />
534        </div>
```

컨트롤 바 외곽 div(490–534행)에 `position` 지정 없음 — 문서 흐름상 배치이며, 부모(393–400행)의 `paddingTop: HEADER_H`(398행) 아래에 놓인다.

### 2-(c) 밀도 바(DENSITY) JSX 블록 전문과 표시 조건 (610–729행)

**표시 조건: 없음(0건).** 블록 앞에 조건부 렌더 표현식(`{... && (`, 삼항 등)이 없다. 610행 주석 직전은 그리드 카드 map을 닫는 608행 `</div>`이며, `<div style={{ position: 'fixed', ... }}>`가 무조건 렌더된다.

```tsx
610        {/* ── DENSITY BAR — 하단 전용 컴팩트 바. width: min(440px, 64vw) 고정 (§6) ── */}
611        <div style={{
612          position: 'fixed',
613          bottom: 24,
614          left: '50%',
615          transform: 'translateX(-50%)',
616          width: 'min(440px, 64vw)',
617          height: 56,
618          background: '#080706',
619          display: 'flex',
620          alignItems: 'center',
621          gap: 18,
622          paddingLeft: 20,
623          paddingRight: 20,
624          zIndex: 60,
625        }}>
626          <span style={{
627            fontSize: 10,
628            fontWeight: 400,
629            letterSpacing: '0.15em',
630            textTransform: 'uppercase',
631            color: 'rgba(255,255,255,0.5)',
632            flexShrink: 0,
633          }}>
634            Density
635          </span>
636
637          {/*
638            트랙 — 바 폭을 늘리지 않고, 스냅 아이콘이 트랙 안에 완전히 들어오도록 좌표계를
639            레일(양단 ICON_W/2 인셋)로 통일한다. 아이콘은 폭 ICON_W 박스를 left:
640            calc(pos * (100% - ICON_W))로 놓아 첫 아이콘 좌변 = 트랙 좌단, 마지막 아이콘
641            우변 = 트랙 우단이 되고, 그 중심은 레일의 pos와 정확히 일치한다 (§6, §7).
642          */}
643          <div
644            ref={trackRef}
645            onPointerDown={onTrackDown}
646            onPointerMove={onTrackMove}
647            onPointerUp={onTrackUp}
648            onPointerCancel={onTrackUp}
649            style={{
650              position: 'relative',
651              flex: 1,
652              minWidth: 0,
653              height: 30,
654              cursor: 'pointer',
655              touchAction: 'none',
656            }}
657          >
658            {/* 레일 — fill·knob의 % 기준. 아이콘 중심 좌표계와 동일 */}
659            <div style={{
660              position: 'absolute',
661              left: ICON_W / 2,
662              right: ICON_W / 2,
663              top: 0,
664              height: 16,
665              pointerEvents: 'none',
666            }}>
667              <div style={{
668                position: 'absolute', top: 6, left: 0, right: 0, height: 2,
669                background: 'rgba(255,255,255,0.18)',
670              }} />
671              <div ref={fillRef} style={{
672                position: 'absolute', top: 6, left: 0, width: '0%', height: 2,
673                background: 'rgba(255,255,255,0.6)',
674              }} />
675              <div ref={knobRef} style={{
676                position: 'absolute', top: 1, left: '0%',
677                transform: 'translateX(-50%)',
678                width: 12, height: 12, borderRadius: '50%',
679                background: '#FFFFFF',
680              }} />
681            </div>
682
683            {/* 스냅 아이콘 — 박스만(숫자 없음). 트랙 안에 정렬 */}
684            {snapCols.map(c => {
685              const active = c === nLabel
686              return (
687                <div
688                  key={c}
689                  onPointerDown={e => { e.stopPropagation(); animateTo(c) }}
690                  style={{
691                    position: 'absolute',
692                    top: 18,
693                    left: `calc(${colsToPos(c)} * (100% - ${ICON_W}px))`,
694                    width: ICON_W,
695                    display: 'flex',
696                    justifyContent: 'center',
697                    gap: 2,
698                    cursor: 'pointer',
699                  }}
700                >
701                  {Array.from({ length: c }, (_, k) => (
702                    <span
703                      key={k}
704                      style={{
705                        width: 3,
706                        height: 9,
707                        background: active ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
708                        transition: 'background 200ms ease',
709                      }}
710                    />
711                  ))}
712                </div>
713              )
714            })}
715          </div>
716
717          <span style={{
718            fontSize: 10,
719            fontWeight: 400,
720            letterSpacing: '0.15em',
721            textTransform: 'uppercase',
722            color: 'rgba(255,255,255,0.5)',
723            flexShrink: 0,
724            minWidth: 44,
725            textAlign: 'right',
726          }}>
727            {nLabel} cols
728          </span>
729        </div>
```

### 2-(d) `metaH` · `titleBlockH` · `--ts` 계산 코드 전문

정의부 (82–90행):

```tsx
 82  const titlePx = (w: number) => clamp(w * 0.030, 10, 13)
 83  const sumPx = (w: number) => clamp(w * 0.024, 8.5, 11)
 84  /** 타이틀 블록 예약 높이 — 영문 TITLE_LINES줄 + 한글 1줄. .gm-title의 CSS height와 동일 식이어야
 85   *  격자 배치(paint의 hPx)와 실제 DOM 높이가 어긋나지 않는다. 한글 유무와 무관하게 항상 예약한다 */
 86  const titleBlockH = (w: number) =>
 87    titlePx(w) * TITLE_LH * TITLE_LINES + titlePx(w) * KO_SCALE * TITLE_LH
 88  /** 카드 하단 텍스트 블록 높이 — 폭의 연속 함수 */
 89  const metaH = (w: number) =>
 90    META_PT + titleBlockH(w) + SUM_MT + sumPx(w) * SUM_LH
```

`paint` 내 소비부 (226–266행) — `mH = metaH(cardW)`가 행 피치·카드 높이에 들어가고 `--ts`/`--ss`가 카드 엘리먼트에 주입된다:

```tsx
226      if (!ready) return
227
228      const full = Math.max(1, vp.w - UI_PAD * 2)
229      // 1열은 히어로 폭 상한, 그 외는 연속 축소. 폭은 c의 연속 함수다.
230      const heroW = Math.min(full, CARD_RATIO * vp.h * SLIDE_H_RATIO)   // 1열 = 히어로 폭 (§6)
231      const cardW = c <= 1 ? heroW : Math.max(1, (full - GAP * (c - 1)) / c)
232      const cardH = cardW / CARD_RATIO
233      const mH = metaH(cardW)
234      const pitch = cardH + mH + GAP
235      const stride = cardW + GAP                    // 셀 하나의 수평 간격
236      // 목표 정수열 nr 기준 중앙정렬 — 폭은 c(연속), 열 수는 nr(정수) (§1)
237      const rowW = nr * cardW + (nr - 1) * GAP
238      const originX = UI_PAD + (full - rowW) / 2
239      const wPx = Math.round(cardW)                 // 정수화 → 전 카드 clientWidth 완전 동일
240      const hPx = Math.round(cardH + mH)            // 프레임 + 메타 = 카드 실제 높이
241
242      let maxRow = 0
243      for (let k = 0; k < total; k++) {
244        const project = projects[order[k]]
245        if (!project) continue
246        const el = cardEls.current.get(project.id)
247        if (!el) continue
248        // ── 순수 행우선: 열 수 nr 기준 정수 격자 (§1) ──
249        const row = Math.floor(k / nr)
250        const col = k - row * nr
251        const x = originX + col * stride
252        const y = row * pitch
253        if (row > maxRow) maxRow = row
254        const dim = dimSet.has(order[k])
255        el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`
256        el.style.width = `${wPx}px`
257        el.style.height = `${hPx}px`
258        el.style.opacity = `${dim ? DIM_OPACITY : 1}`
259        el.style.setProperty('--ts', `${titlePx(cardW)}px`)
260        el.style.setProperty('--ss', `${sumPx(cardW)}px`)
261      }
262
263      if (gridRef.current) {
264        // 말미 GAP은 pitch에 포함돼 있어 한 번 뺀다
265        gridRef.current.style.height = `${Math.max(0, Math.round((maxRow + 1) * pitch - GAP))}px`
266      }
```

`--ts` CSS 소비부 (인라인 `<style>`, 446–462행):

```tsx
446          .gm-meta { padding-top: ${META_PT}px; }
447          /* 타이틀 — 영문 위/한글 아래(en-first). 높이는 한글 유무와 무관하게 2줄분을 예약한다.
448             metaH의 titleBlockH와 동일 식이어야 격자 피치와 DOM 높이가 어긋나지 않는다 (260804) */
449          .gm-title {
450            height: calc(var(--ts, 13px) * ${TITLE_LH * TITLE_LINES} + var(--ts, 13px) * ${KO_SCALE * TITLE_LH});
451          }
452          .gm-title-en {
453            display: block;
454            font-size: var(--ts, 13px);
455            font-weight: 450;
456            line-height: ${TITLE_LH};
457            word-break: keep-all;
458            white-space: nowrap;
459            overflow: hidden;
460            text-overflow: ellipsis;
461          }
462          .gm-title-ko {
```

### 2-(e) `isMobile` 전 출현 ±5줄

총 **4건** (167, 334, 340, 735).

정의 (162–174행):

```tsx
162    // ── 모바일 판정 — 링월(LandingExperience 74행)과 동일 경계 1024 (GRID_MOBILE §2-3) ──
163    // vp.w에서 파생하지 않는다: vp는 resize 이벤트만 따르고 matchMedia는 초기값도 정확하다.
164    // 초기값 false + useLayoutEffect: SSR/하이드레이션 출력은 false로 일치시키되 판정은 페인트
165    // 전에 끝낸다 — 직접 진입(initialSlug)이 열린 상태로 마운트되므로, useEffect였다면 모바일에서
166    // GridContentArea(가로 트랙)가 한 프레임 그려진 뒤 교체되는 깜빡임이 생긴다.
167    const [isMobile, setIsMobile] = useState(false)
168    useLayoutEffect(() => {
169      const mq = window.matchMedia('(max-width: 1023px)')
170      const fn = () => setIsMobile(mq.matches)
171      fn()
172      mq.addEventListener('change', fn)
173      return () => mq.removeEventListener('change', fn)
174    }, [])
```

닫기 지연 분기 (329–345행):

```tsx
329        }
330      }
331      setContentMode('idle')
332      // 역-morph 재생이 끝난 뒤 언마운트. 모바일은 morph 자체가 없으므로 대기 없이 즉시 닫는다
333      // — 760ms 잔류는 재생할 애니메이션이 없는 순수 지연이다 (GRID_MOBILE §2-4)
334      if (isMobile) setSelected(null)
335      else setTimeout(() => setSelected(null), CONTENT_EXIT_MS)
336      // URL 원복 — pushState 되돌림 없이 replaceState로 그리드 URL 복원
337      if (window.location.pathname !== '/work-grid') {
338        window.history.replaceState({}, '', '/work-grid')
339      }
340    }, [selected, isMobile])
341
342    // 브라우저 뒤로가기 → 닫기
343    useEffect(() => {
344      const onPop = () => { if (selected) closeProject() }
345      window.addEventListener('popstate', onPop)
```

콘텐츠 오버레이 분기 (730–745행):

```tsx
730
731        {/* ── 콘텐츠 오버레이 — fixed inset:0, z-index 100으로 그리드 전체를 덮는다 (§3-1 (f)) ── */}
732        {selected && (
733          // 모바일은 morph 없이 세로 스크롤로 즉시 표시한다 — contentMode·enterRect를 넘기지 않는다
734          // (가로 트랙 morph는 세로 스택 진입에 성립하지 않는다, GRID_MOBILE §2-3)
735          isMobile ? (
736            <MobileGridContent project={selected} onBack={closeProject} />
737          ) : (
738            <GridContentArea
739              project={selected}
740              mode={contentMode}
741              enterRect={enterRectRef.current}
742              onBack={closeProject}
743            />
744          )
745        )}
```

### 2-(f) `position: 'sticky'` / `position: 'fixed'` 전 출현 ±5줄

- `position: 'sticky'` → **없음(0건)**
- `position: 'fixed'` → **1건** (612행, 밀도 바)

```tsx
607          )
608        })}
609      </div>
610
611      {/* ── DENSITY BAR — 하단 전용 컴팩트 바. width: min(440px, 64vw) 고정 (§6) ── */}
612      <div style={{
613        position: 'fixed',
614        bottom: 24,
615        left: '50%',
616        transform: 'translateX(-50%)',
617        width: 'min(440px, 64vw)',
```

(위 발췌는 §2-(c)와 같은 구간이며, 줄 번호는 611행 주석 / 612행 `<div` / 613행 `position: 'fixed'`이다. 앞서 grep이 612행으로 보고한 것은 `position: 'fixed'`가 아니라 `<div style={{`의 다음 줄 계산 차이로, 파일 직접 읽기 기준 `position: 'fixed'`는 **612행**이다.)

정정: 파일 직접 읽기 결과 610행 = 주석, 611행 = `<div style={{`, 612행 = `position: 'fixed',`.

---

## 3. `src/components/LandingExperience.tsx`

파일 총 행수: **441행** (LANDING_SWITCH_P1 적용 후).

### 3-1. 파일 시작 ~ 컴포넌트 선언 직전 (1–26행)

```tsx
 1  'use client'
 2
 3  import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
 4  import { TYPOLOGY_ORDER, type Project, type ProjectType } from '@/types'
 5  import { ProjectWall } from '@/components/ProjectWall'
 6  import { ContentArea } from '@/components/ContentArea'
 7  import { MobileProjectWall } from '@/components/MobileProjectWall'
 8  import { useSiteChrome } from '@/components/SiteChromeContext'
 9  import { ViewToggle } from './ViewToggle'
10  import { shuffle } from '@/lib/shuffle'
11
12  const FONT = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"
13
14  const HEADER_H = 80   // 데스크톱 헤더 존. 필터 행 포함 여유치
15
16  // 뷰 토글(우상단) 예약 폭 — 필터 바가 토글과 겹치지 않도록 좌우 대칭으로 비운다 (LANDING_SWITCH_P1 §6)
17  // 토글 실폭 약 100px + 우측 여백 34px + 간격 → 160
18  const VIEW_TOGGLE_RESERVE = 160
19  const VIEW_TOGGLE_RIGHT = 34
20
21  interface LandingExperienceProps {
22    projects: Project[]         // Sanity에서 careerNo 내림차순 정렬 상태로 도착 — 재정렬 불요
23    initialSlug?: string        // /work/[slug] 딥링크
24    initialShowFilters?: boolean
25  }
26
```

### 3-2. mobile 판정 코드 ±10줄 (67–90행)

판정 방식: **`window.innerWidth` 기반** (`matchMedia` 미사용 — `LandingExperience.tsx` 내 `matchMedia` 0건).

```tsx
67      shuffleQueueRef.current = shuffleQueue
68    }, [shuffleQueue])
69
70    useEffect(() => {
71      filteredRef.current = filteredProjects
72    }, [filteredProjects])
73
74    // mobile detection — 모바일/태블릿세로 <1024, 그 외 데스크탑 분기.
75    // 1024 경계 근거: iPad Air(820)·iPad Pro 11"(834) 세로를 포섭하고,
76    // iPad Pro 12.9" 세로(1024)는 SPA 분할이 성립하므로 데스크톱에 남긴다 (HANDOFF_RACE_FIX_SPEC §3)
77    useEffect(() => {
78      const fn = () => {
79        const w = window.innerWidth
80        const m = w < 1024
81        mobileRef.current = m
82        setMobile(m)
83      }
84      fn()
85      window.addEventListener('resize', fn)
86      return () => window.removeEventListener('resize', fn)
87    }, [])
88
89    // 데스크톱 필터 바 오버플로 페이드 갱신 — scrollLeft 기반 좌/우 스크롤 가능 여부 감지
90    const updateFilterFade = () => {
```

상태 선언 (28–29행):

```tsx
28    const [mobile, setMobile] = useState(false)
29    const mobileRef = useRef(false)   // popstate 등 마운트 시 1회 등록 핸들러의 stale closure 방지
```

`GridExperience.tsx`는 `matchMedia('(max-width: 1023px)')`(169행), `LandingExperience.tsx`는 `window.innerWidth < 1024`(79–80행)로 서로 다른 API를 쓴다. 경계값은 양쪽 모두 1024다.

---

## 4. `src/app/globals.css` — 지정 선택자 규칙 블록 전문

### 4-1. `.mpw-chips` (30–40행, 미디어쿼리 밖)

```css
30  /* ── 스크롤바 숨김 — .mpw-chips: 데스크톱 필터 바 / .mpw-track: 모바일 열람 트랙 ── */
31  .mpw-chips,
32  .mpw-track {
33    scrollbar-width: none;
34    -ms-overflow-style: none;
35  }
36
37  .mpw-chips::-webkit-scrollbar,
38  .mpw-track::-webkit-scrollbar {
39    display: none;
40  }
```

두 규칙 모두 선택자 목록에 `.mpw-track`이 함께 있다.

### 4-2. `.wordmark-intro` (48–109행, 미디어쿼리 밖)

```css
48  .wordmark-intro {
49    position: fixed;
50    top: 50%;
51    left: 50%;
52    transform: translate(-50%, -50%);
53    z-index: 200;
54    display: flex;
55    flex-direction: row;
56    align-items: baseline;
57    font-size: 32px;
58    line-height: 1;
59    letter-spacing: -0.02em;
60    white-space: nowrap;
61    color: #FFFFFF;
62    text-decoration: none;
63    user-select: none;
64    pointer-events: auto;
65    opacity: 0;
66    animation: wordmarkFadeIn 0.3s ease-out forwards;
67    transition:
68      top 1600ms cubic-bezier(0.7, 0, 0.3, 1),
69      left 1600ms cubic-bezier(0.7, 0, 0.3, 1),
70      transform 1600ms cubic-bezier(0.7, 0, 0.3, 1),
71      font-size 1600ms cubic-bezier(0.7, 0, 0.3, 1),
72      color 0.3s ease-out;
73  }
74
75  .wordmark-intro.instant {
76    animation: none;
77    opacity: 1;
78  }
79
80  .wordmark-intro.moved {
81    top: 20px;
82    left: 24px;
83    transform: translate(0, 0);   /* 기존 none → 계산상 동일, 함수형만 통일 (인자별 보간 강제) */
84  }
85
86  .wordmark-intro.on-light {
87    color: #080706;
88  }
89
90  /* 컨텐츠 페이지: 배경이 라우트 전환과 동시에 즉시 바뀌므로,
91     색상도 즉시 전환해야 모노그램이 일시적으로 배경과 같은 색이 되어
92     사라지는 현상을 방지할 수 있음 */
93  .wordmark-intro.no-color-transition {
94    transition:
95      top 1600ms cubic-bezier(0.7, 0, 0.3, 1),
96      left 1600ms cubic-bezier(0.7, 0, 0.3, 1),
97      transform 1600ms cubic-bezier(0.7, 0, 0.3, 1),
98      font-size 1600ms cubic-bezier(0.7, 0, 0.3, 1);
99  }
100
101 .wordmark-intro .word {
102   display: inline-flex;
103   align-items: baseline;
104 }
105
106 .wordmark-intro .wordmark-gap {
107   display: inline-block;
108   width: 0.28em;
109 }
```

관련 `@keyframes` (43–46행):

```css
43  @keyframes wordmarkFadeIn {
44    from { opacity: 0; }
45    to { opacity: 1; }
46  }
```

### 4-3. `.site-nav` (112–142행, 미디어쿼리 밖)

```css
111 /* ── SITE NAVIGATION — 데스크톱: 헤더 존 수평 중앙 ── */
112 .site-nav {
113   position: fixed;
114   top: 24px;
115   left: 50%;
116   transform: translateX(-50%);
117   z-index: 100;
118   display: flex;
119   flex-direction: row;
120   gap: 32px;
121   align-items: center;
122   transition: opacity 400ms ease-out;
123 }
124
125 .site-nav-link {
126   font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif;
127   font-weight: 300;
128   font-size: 13px;
129   letter-spacing: 0.08em;
130   text-transform: uppercase;
131   text-decoration: none;
132   border-bottom: 1px solid transparent;
133   padding-bottom: 2px;
134   transition: color 0.3s ease-out, border-bottom-color 0.3s ease-out;
135 }
136
137 /* 호버와 현재 페이지가 같은 표현을 쓴다 — 서로 다른 속성이면 위치·길이가 어긋난다.
138    현재 페이지에서 호버해도 변화가 없는 것은 의도된 동작이다(클릭해도 이동이 없으므로). */
139 .site-nav-link:hover,
140 .site-nav-link.is-current {
141   border-bottom-color: currentColor;
142 }
```

### 4-4. `.mobile-header-bar` (145–147행, 미디어쿼리 밖)

```css
144 /* ── MOBILE HEADER BAR — 데스크톱에서는 비표시 ── */
145 .mobile-header-bar {
146   display: none;
147 }
```

### 4-5. `@media (max-width: 1023px)` 내 `.mobile-header-bar` · `.wordmark-intro` · `.site-nav` (150–186행)

```css
149 /* ── MOBILE (<1024px) — 컴팩트 헤더: 불투명 56px 바 + 워드마크 중앙 22px + 햄버거/필터 글리프 (§8-1) ── */
150 @media (max-width: 1023px) {
151   .mobile-header-bar {
152     display: block;
153     position: fixed;
154     top: 0;
155     left: 0;
156     right: 0;
157     height: 56px;
158     background: #FFFFFF;
159     z-index: 90; /* 워드마크·글리프 아래, 콘텐츠 위 */
160   }
161
162   /* 워드마크 수평 중앙 — transform 퍼센트 → auto margin(레이아웃) 이관.
163      Safari가 transform 전환 중 퍼센트 참조 박스를 라이브 재해석하지 않아
164      폭 수축 시 좌측 쏠림 → 레이아웃 단계 auto margin은 매 프레임 재해석되어 중앙 유지 */
165   .wordmark-intro {
166     left: 0;
167     right: 0;
168     width: fit-content;
169     margin-left: auto;
170     margin-right: auto;
171     transform: translate(0, -50%);   /* 수평 성분 제거 — 수평은 auto margin이 담당 */
172   }
173
174   /* 워드마크 종착 — 화면 수평 중앙에서 수직 상승 궤적. 데스크톱 종착(left 24px)은 불변 */
175   .wordmark-intro.moved {
176     top: 16px;
177     left: 0;                          /* 기존 left: 50% 대체 — 수평 이동 자체가 없음 */
178     transform: translate(0, 0);
179     font-size: 22px;
180   }
181
182   /* 링크 행은 햄버거 메뉴 패널이 대체 — 우상단은 필터 글리프 전용 */
183   .site-nav {
184     display: none;
185   }
186 }
```

### 4-6. `.mobile-menu-btn` · `.mobile-menu-panel` (189–193행, 미디어쿼리 밖)

```css
188 /* ── MOBILE HAMBURGER MENU — 전역 크롬 (SiteHeader 소유, §8). 데스크톱·태블릿 비표시 ── */
189 .mobile-menu-btn,
190 .mobile-menu-scrim,
191 .mobile-menu-panel {
192   display: none;
193 }
```

선택자 목록에 `.mobile-menu-scrim`이 함께 있다.

### 4-7. `@media (max-width: 1023px)` 내 `.mobile-menu-btn` · `.mobile-menu-panel` (195–260행)

```css
195 @media (max-width: 1023px) {
196   .mobile-menu-btn {
197     display: flex;
198     position: fixed;
199     top: 0;
200     left: 0;
201     width: 56px;
202     height: 56px;
203     align-items: center;
204     justify-content: center;
205     background: none;
206     border: none;
207     padding: 0;
208     cursor: pointer;
209     z-index: 100;
210     transition: opacity 400ms ease-out;
211   }
212
213   .mobile-menu-scrim {
214     display: block;
215     position: fixed;
216     inset: 0;
217     background: rgba(8, 7, 6, 0.25);
218     z-index: 110;
219     opacity: 0;
220     pointer-events: none;
221     transition: opacity 380ms cubic-bezier(0.7, 0, 0.3, 1);
222   }
223
224   .mobile-menu-scrim.open {
225     opacity: 1;
226     pointer-events: auto;
227   }
228
229   .mobile-menu-panel {
230     display: block;
231     position: fixed;
232     top: 0;
233     left: 0;
234     bottom: 0;
235     width: min(62vw, 280px);
236     background: #FFFFFF;
237     z-index: 120;
238     transform: translateX(-100%);
239     transition: transform 380ms cubic-bezier(0.7, 0, 0.3, 1);
240     box-shadow: 8px 0 24px rgba(0, 0, 0, 0.06);
241     padding: 72px 16px 24px 24px;
242     overflow-y: auto;
243   }
244
245   .mobile-menu-panel.open {
246     transform: translateX(0);
247   }
248
249   /* 밑줄은 텍스트 폭에만 — 데스크톱 .site-nav-link와 동일 형태.
250      링크가 display:block이라 밑줄을 링크가 아닌 내부 span에 건다. */
251   .mobile-menu-label {
252     display: inline-block;
253     border-bottom: 1px solid transparent;
254     padding-bottom: 2px;
255   }
256
257   .mobile-menu-link.is-current .mobile-menu-label {
258     border-bottom-color: currentColor;
259   }
260 }
```

### 4-8. `@media (min-width: 1024px) and (max-width: 1439px)` 내 `.site-nav` (263–273행)

```css
262 /* ── TABLET (1024~1439px) — 내비 중앙 정렬 해제 → 우측 이동으로 좌상단 워드마크와 분리 ── */
263 @media (min-width: 1024px) and (max-width: 1439px) {
264   .site-nav {
265     left: auto;
266     right: 24px;
267     transform: none;
268     gap: 24px;
269   }
270   .site-nav-link {
271     font-size: 12px;
272   }
273 }
```

---

## 5. `src/components/MobileProjectWall.tsx` 상단 영역 (읽기만)

### 5-1. 칩 행

**없음(0건).** `src/` 전체에서 `mpw-chips`는 `LandingExperience.tsx:283`(데스크톱 필터 바) 1건과 `globals.css` 규칙뿐이며, `MobileProjectWall.tsx` 내 `chip`/`mpw-chips` 문자열은 0건이다.

관련 원문 (`MobileProjectWall.tsx:663`) — 칩 행이 필터 글리프로 대체되었음을 기록한 prop 주석:

```tsx
663    showFilters: boolean           // [미사용] 필터 글리프가 revealed 동기 상시 표시로 전환되며 유일 소비처 소멸 — 외부 계약(LandingExperience) 불변을 위해 시그니처 유지
```

### 5-2. 필터 패널 열기 버튼(필터 글리프) + 스크림 + 패널 — 1297–1410행

```tsx
1297        {/* ── 필터 글리프 + 우측 슬라이드 패널 (§7) — 햄버거와 동일하게 인트로 완료(revealed)와 동기해 상시 표시 ── */}
1298        {revealed && (
1299          <>
1300            {/* 트리거 — 헤더 존 우측. 길이가 체감하는 수평선 3개 (햄버거와 구분).
1301                 SVG 통일 기하: viewBox 0 0 18 14, 선 중심 y=1/7/13 — 햄버거와 전체 높이·두께·수직 위치 동일 */}
1302            <button
1303              aria-label="Filter"
1304              onClick={() => setFilterOpen(o => !o)}
1305              style={{
1306                position: 'fixed',
1307                top: 0,
1308                right: 0,
1309                width: 56,
1310                height: 56,
1311                zIndex: 95,   // 헤더 바 90 위, 워드마크 200 아래
1312                display: 'flex',
1313                alignItems: 'center',
1314                justifyContent: 'center',
1315                background: 'none',
1316                border: 'none',
1317                padding: 0,
1318                cursor: 'pointer',
1319                color: '#080706',
1320                opacity: revealed ? 1 : 0,
1321                pointerEvents: revealed ? 'auto' : 'none',
1322                transition: 'opacity 400ms ease-out',
1323              }}
1324            >
1325              <svg
1326                viewBox="0 0 18 14"
1327                width={18}
1328                height={14}
1329                style={{ display: 'block' }}
1330                stroke="currentColor"
1331                strokeWidth={1.5}
1332                strokeLinecap="butt"
1333              >
1334                <line x1="0" y1="1" x2="18" y2="1" />
1335                <line x1="3" y1="7" x2="15" y2="7" />
1336                <line x1="6" y1="13" x2="12" y2="13" />
1337              </svg>
1338            </button>
1339
1340            {/* 스크림 — 탭 시 닫힘 */}
1341            <div
1342              onClick={() => setFilterOpen(false)}
1343              aria-hidden="true"
1344              style={{
1345                position: 'fixed',
1346                inset: 0,
1347                background: 'rgba(8, 7, 6, 0.25)',
1348                zIndex: 110,
1349                opacity: filterOpen ? 1 : 0,
1350                pointerEvents: filterOpen ? 'auto' : 'none',
1351                transition: `opacity ${PANEL_MS}ms ${EASE}`,
1352              }}
1353            />
1354
1355            {/* 패널 — 우측 슬라이드 인 */}
1356            <div style={{
1357              position: 'fixed',
1358              top: 0,
1359              right: 0,
1360              bottom: 0,
1361              width: 'min(62vw, 280px)',
1362              background: '#FFFFFF',
1363              zIndex: 120,
1364              transform: filterOpen ? 'translateX(0)' : 'translateX(100%)',
1365              transition: `transform ${PANEL_MS}ms ${EASE}`,
1366              boxShadow: '-8px 0 24px rgba(0, 0, 0, 0.06)',
1367              padding: '72px 16px 24px 24px',
1368              overflowY: 'auto',
1369              fontFamily: FONT,
1370            }}>
1371              {filterTypes.map(t => (
1372                <button
1373                  key={t}
1374                  onClick={() => {
1375                    setFilterOpen(false)
1376                    onFilter(t)   // §5 시퀀스가 이어진다
1377                  }}
1378                  style={{
1379                    display: 'flex',
1380                    alignItems: 'baseline',
1381                    gap: 8,
1382                    width: '100%',
1383                    padding: '12px 0',
1384                    background: 'none',
1385                    border: 'none',
1386                    textAlign: 'left',
1387                    cursor: 'pointer',
1388                    fontFamily: FONT,
1389                    fontSize: 12,
1390                    fontWeight: t === activeFilter ? 500 : 300,
1391                    letterSpacing: '0.08em',
1392                    textTransform: 'uppercase',
1393                    color: '#080706',
1394                    wordBreak: 'keep-all',   // 장문 라벨 2줄 허용
1395                  }}
1396                >
1397                  {/* 불릿 — 활성 항목 앞에만 (칩 문법 승계) */}
1398                  <span style={{
1399                    fontSize: 7,
1400                    lineHeight: 1,
1401                    flexShrink: 0,
1402                    opacity: t === activeFilter ? 1 : 0,
1403                    transition: 'opacity 200ms',
1404                  }}>●</span>
1405                  <span>{t}</span>
1406                </button>
1407              ))}
1408            </div>
1409          </>
1410        )}
```

### 5-3. 상단 영역 요소별 position/top/right/height 정리

| 요소 | 파일:행 | position | top | right | height |
|---|---|---|---|---|---|
| 필터 글리프 버튼 | 1302–1338 | `fixed` | `0` | `0` | `56` (width `56`, zIndex `95`) |
| 필터 스크림 | 1341–1353 | `fixed` | `inset: 0` | `inset: 0` | `inset: 0` (zIndex `110`) |
| 필터 패널 | 1356–1370 | `fixed` | `0` | `0` | `bottom: 0` (width `min(62vw, 280px)`, zIndex `120`) |
| 브라우징 레이어(링) | 1071–1083 | `fixed` | `HEADER_H` (=56) | `0` | `bottom: 0` |
| 열람 레이어 | 1216–1227 | `fixed` | `HEADER_H` (=56) | `0` | `bottom: 0` (zIndex `40`) |

브라우징 레이어 (1068–1083행):

```tsx
1068    return (
1069      <>
1070        {/* ── 브라우징 레이어 — 가상 링. 스크롤 요소 아님, 입력은 useRingWall 전담 (§3-4) ── */}
1071        <div
1072          ref={ring.containerRef}
1073          onPointerDown={() => { lastUserRef.current = Date.now() }}
1074          onWheel={() => { lastUserRef.current = Date.now() }}
1075          style={{
1076            position: 'fixed',
1077            top: HEADER_H,
1078            left: 0,
1079            right: 0,
1080            bottom: 0,
1081            overflow: 'hidden',
1082            background: '#FFFFFF',
1083            fontFamily: FONT,
```

열람 레이어 (1215–1227행):

```tsx
1215        {/* ── 열람 레이어 (§6-1) — 세로 스크롤 문서: BACK/타이틀/세로 스택 ── */}
1216        {viewerProject && (
1217          <div ref={viewerScrollRef} style={{
1218            position: 'fixed',
1219            top: HEADER_H,
1220            left: 0,
1221            right: 0,
1222            bottom: 0,
1223            background: '#FFFFFF',
1224            zIndex: 40,
1225            fontFamily: FONT,
1226            overflowY: 'auto',                    // 세로 스크롤 소유
1227            overflowX: 'hidden',
```

---

## 6. `GridExperience.tsx` — 모바일일 때 컨트롤 바(필터·토글·밀도 바) 분기 코드

### 6-1. 분기 코드 전수

`GridExperience.tsx` 내 `isMobile` 참조는 4건이며(§2-(e)), 그중 렌더 분기는 **735행 1건뿐**이다:

```tsx
732        {selected && (
733          // 모바일은 morph 없이 세로 스크롤로 즉시 표시한다 — contentMode·enterRect를 넘기지 않는다
734          // (가로 트랙 morph는 세로 스택 진입에 성립하지 않는다, GRID_MOBILE §2-3)
735          isMobile ? (
736            <MobileGridContent project={selected} onBack={closeProject} />
737          ) : (
738            <GridContentArea
```

이 분기의 대상은 **콘텐츠 오버레이**다.

### 6-2. 컨트롤 바·밀도 바의 모바일 분기

- CONTROLS 바(489–534행)를 감싸는 조건부 렌더: **없음(0건)**
- DENSITY 바(610–729행)를 감싸는 조건부 렌더: **없음(0건)**
- 두 블록 내부의 `isMobile` 참조: **없음(0건)**
- 두 블록 내부의 미디어쿼리(`@media`) 규칙: **없음(0건)** — 인라인 `<style>` 블록(407–487행) 전체에 `@media` 0건

CONTROLS 바 직전 문맥 (487–490행) — `</style>` 다음에 조건 없이 이어진다:

```tsx
487      `}</style>
488
489      {/* ── CONTROLS — 필터(좌) + 뷰토글 Ring|Grid(우) ── */}
490      <div style={{
```

DENSITY 바 직전 문맥 (607–611행) — 카드 map을 닫는 `</div>` 다음에 조건 없이 이어진다:

```tsx
607          )
608        })}
609      </div>
610
611      {/* ── DENSITY BAR — 하단 전용 컴팩트 바. width: min(440px, 64vw) 고정 (§6) ── */}
```

### 6-3. 뷰포트 폭에 반응하는 유일한 경로

컨트롤 바·밀도 바에서 뷰포트 폭에 따라 값이 바뀌는 지점은 CSS 함수 1건과 `snapCols` 길이 1건이다.

```tsx
616          width: 'min(440px, 64vw)',
```

```tsx
390    const snapCols = Array.from({ length: maxCols - MIN_COLS + 1 }, (_, i) => MIN_COLS + i)
```

`maxCols`는 종횡비 기반이다 (160행, §2-(a) 93–97행의 `maxColsForAspect`):

```tsx
160    const maxCols = ready ? maxColsForAspect(vp.w / vp.h) : MAX_COLS
```

루트 컨테이너의 상·하 여백도 폭과 무관한 고정값이다 (393–400행):

```tsx
393      <div style={{
394        fontFamily: FONT,
395        background: '#FFFFFF',
396        color: '#080706',
397        minHeight: '100vh',
398        paddingTop: HEADER_H,
399        paddingBottom: BAR_RESERVE,
400      }}>
```

---

## 7. 기록상 주의

1. **grep 출력의 주석 기호 표시 문제(재발)** — 일부 grep 출력에서 `//` 주석이 `\`로 표시되었다(`LandingExperience.tsx` 36·75·149행 등). 본 보고서의 모든 코드 발췌는 파일 직접 읽기 결과를 옮긴 것이며, 실제 파일 내용은 `//`다.

2. **`position: 'fixed'` 줄 번호** — grep은 612행으로 보고했으나 파일 직접 읽기 기준 611행이 `<div style={{`, 612행이 `position: 'fixed',`다. §2-(f)에 정정 기록했다.

3. **이전 보고서 오기(미정정)** — `AUDIT_REPORT_landing2_260916.md` §7에 `MobileProjectWall.tsx:1039`로 적힌 항목의 실제 줄 번호는 **1063**이다. 본 감사에서도 1063으로 재확인했다. 해당 보고서는 수정 범위 밖이라 고치지 않았다.
