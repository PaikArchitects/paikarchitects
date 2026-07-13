# VERTICAL_STACK_SPEC — 모바일 열람 레이어 세로 스택 전환 (2026-07-13)

## 0. 배경 및 목표

**원칙:** 가로 화면은 가로답게, 세로 화면은 세로답게.

현행 모바일 열람 레이어(`ExpandedBlock`)는 **가로 스크롤 트랙**이다. 세로가 긴 화면에서 가로로 슬라이드를 넘기는 구조는 다음 문제를 낳는다.

1. 세로 공간이 남는데도 이미지가 `TRACK_IMG_H`(= 히어로 높이)로 제한된다
2. 세로가 긴 이미지(초상형 사진, 입면도, 단면도)가 폭 기준으로 축소되어 작게 보인다
3. 휠 입력(= 세로)이 가로 트랙과 축이 어긋나 데스크톱 브라우저에서 조작이 부자연스럽다
4. 슬라이드 개수 편차(프로젝트당 1~10장)에 취약하다

**목표:** 열람 레이어를 **세로 스크롤 문서**로 전환한다.

- 모든 슬라이드가 **동일 폭**(`100vw - 32px`), 높이는 **콘텐츠 비율이 결정**
- 현행의 전치 관계: `[동일 높이 / 폭 가변]` → `[동일 폭 / 높이 가변]`
- 스크롤이 곧 진행도이므로 **카운터 제거**
- `ratio` 메타(Sanity 공급)로 **레이아웃 시프트 없이** 높이를 사전 예약

**대상 파일 (1개):** `src/components/MobileProjectWall.tsx`

---

## 1. 확정된 설계 결정

| # | 항목 | 결정 |
|---|---|---|
| 1 | 정보 슬라이드 위치 | **히어로 바로 아래 고정** (커버 → 정보 → 이후 슬라이드) |
| 2 | 카운터 | **제거** (스크롤 자체가 어포던스) |
| 3 | 슬라이드 높이 | `ratio` 메타로 사전 예약, 레이아웃 시프트 없음 |
| 4 | `credits` 슬라이드 | 폭 100%, 높이 **행 수에 따라 자연 결정** (고정 높이 폐지) |
| 5 | `diagramSet` 슬라이드 | **캐러셀 유지.** 동일 위치에서 자동/탭 전환 — 매스 프로세스처럼 형태 변화를 읽으려면 프레임이 고정되어야 한다. 세로로 나열할 다이어그램은 `image` 슬라이드로 등록하는 것이 콘텐츠 레이어의 책임이다 |
| 6 | 캡션 | 고정 높이(`CAPTION_H`) 예약 폐지, **자연 높이** |
| 7 | **핀치 줌** | **열람 레이어에서 허용.** 도면·다이어그램·상세 이미지를 확대해 볼 수 있어야 포트폴리오로 기능한다 (§7) |

---

## 2. 상수 개정

### 2-1. 제거 대상

```ts
const TRACK_IMG_H = 'calc((100vw - 32px) * 2 / 3)'
const TRACK_DIAGRAM_H = 'calc((100vw - 32px) * 4 / 9)'
const CAPTION_H = 28
```

**참조 지점 (전부 §3의 신규 구현으로 교체):**
- `MobileCaption` — 루트 div의 `height: CAPTION_H`
- `MobileImageSlide` — 래퍼 `height: TRACK_IMG_H`, 이미지 `height: diagram ? TRACK_DIAGRAM_H : '100%'`, 캡션 부재 시 `<div style={{height: CAPTION_H}} />`
- `MobileDiagramSetSlide` — 래퍼 `height: TRACK_IMG_H`, 내부 `height: TRACK_DIAGRAM_H`
- `MobileCreditsSlide` — 래퍼 `height: TRACK_IMG_H`, 말미 `<div style={{height: CAPTION_H}} />`
- `MobileInfoSlide` — 래퍼 `height: TRACK_IMG_H`, 말미 `<div style={{height: CAPTION_H}} />`
- `ExpandedBlock` — 히어로의 `height: TRACK_IMG_H`, 말미 `<div style={{height: CAPTION_H}} />`

> 삭제 후 `npx tsc --noEmit`을 실행하면 잔존 참조가 컴파일 오류로 드러난다. 이를 진단 수단으로 활용하라. (명세 ③에서 검증된 방법이다)

### 2-2. 신설

```ts
// ── 세로 스택 상수 — 모든 슬라이드 동일 폭, 높이는 콘텐츠 비율이 결정 ──
const HERO_W = 'calc(100vw - 32px)'      // 기존 유지
const HERO_RATIO = 3 / 2                 // 커버는 3:2 고정 (sanityCard 크롭과 일치)
const SLIDE_GAP = 24                     // 슬라이드 간 수직 간격
const DIAGRAM_RATIO_FALLBACK = 3 / 2     // ratio 메타 부재 시 폴백
const STACK_BOTTOM_PAD = 48              // 스택 하단 여백 — 마지막 슬라이드 이후 스크롤 여유
```

**`HERO_W`는 유지한다.** FLIP 모프의 종착점 산출(`heroW = vw - 32`)이 이 값에 의존하며, 명세 ③에서 확정된 좌표계다.

---

## 3. 슬라이드 렌더러 개정

### 3-1. MobileCaption — 자연 높이

```tsx
// ── 캡션 — 자연 높이. 2줄 초과 시 ellipsis ──
function MobileCaption({ label, description }: { label: string; description: string }) {
  return (
    <div style={{ paddingTop: 6, width: '100%' }}>
      <div style={{
        fontFamily: FONT,
        fontSize: 10,
        fontWeight: 300,
        lineHeight: 1.35,
        color: '#0a0908',
        opacity: 0.55,
        wordBreak: 'keep-all',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical' as const,
        overflow: 'hidden',
      }}>
        <span style={{ fontWeight: 500 }}>{label}</span>
        {description && ` — ${description}`}
      </div>
    </div>
  )
}
```

**변경점:** `height: CAPTION_H` 제거, `width: 0; minWidth: 100%` 해킹 제거(가로 트랙의 flex 자식 폭 붕괴 방지용이었으므로 세로에서 불필요), `lineHeight` 1.2 → 1.35(세로 여유).

### 3-2. MobileImageSlide — 폭 100%, 높이 = ratio 파생

```tsx
// ── 이미지 슬라이드 — 폭 100%, 높이는 ratio(w/h)가 결정. aspectRatio로 사전 예약 ──
function MobileImageSlide({ slide }: { slide: ImageSlide }) {
  const { label, description } = slide.caption
    ? splitCaption(slide.caption)
    : { label: '', description: '' }

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
      {slide.caption && <MobileCaption label={label} description={description} />}
    </div>
  )
}
```

**`slide.diagram` 플래그 무시:** 세로 스택에서는 다이어그램을 축소할 이유가 없다. 가로 트랙에서 `TRACK_DIAGRAM_H`(H×2/3)로 줄인 것은 "모든 슬라이드가 같은 높이"라는 제약 하에 다이어그램에 여백을 주기 위함이었다. 세로에서는 각 이미지가 제 비율대로 흐르므로 이 보정이 불필요하다.

**`objectFit: 'contain'`:** 폭을 채우고 높이는 `aspectRatio`가 결정하므로 `contain`과 `cover`가 동일하게 동작한다. `ratio` 메타가 실제와 어긋날 경우를 대비해 `contain`(잘림 없음)을 택한다.

**캡션 부재 시 빈 div를 넣지 않는다.** 높이 예약이 불필요하다.

### 3-3. MobileDiagramSetSlide — 캐러셀 유지, 세로 적응

**인터랙션 로직(자동 진행 3000ms, 탭 전환, 타이머 리셋)은 일절 변경하지 않는다.** 레이아웃만 세로 스택에 맞춘다.

```tsx
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
      {/* 캡션 — 현재 서브슬라이드의 것 */}
      <MobileCaption label={item.label} description={item.description} />
    </div>
  )
}
```

**변경점 5가지:**
1. 탭 판정 축: `clientX` → **`clientY`** (가로 스와이프 → 세로 스크롤과의 구분)
2. **멀티터치 억제** — `e.isPrimary === false`(두 번째 손가락)면 탭 후보를 무효화한다. 핀치 줌으로 다이어그램을 확대하려다 서브슬라이드가 넘어가는 것을 막는다 (§7)
3. 사이저 이미지(`visibility: hidden`) 제거 — `aspectRatio`가 프레임을 결정하므로 불필요
4. 프레임 비율을 **첫 항목의 `ratio`로 고정** — 서브슬라이드마다 비율이 다르면 전환 시 높이가 변해 스크롤 위치가 튄다. 시리즈 다이어그램은 통상 동일 비율이므로 실질 제약이 아니다
5. 캡션은 항상 렌더 (`label`/`description`이 필수 필드)

**캡션 높이 가변 주의:** 서브슬라이드마다 `description` 길이가 달라 캡션이 1줄↔2줄로 바뀌면 높이가 흔들린다. 이를 막기 위해 캡션 컨테이너에 **최소 높이 2줄 예약**을 둔다.

```tsx
{/* 캡션 — 서브슬라이드 전환 시 높이 흔들림 방지: 2줄 고정 예약 */}
<div style={{ minHeight: 10 * 1.35 * 2 + 6 }}>
  <MobileCaption label={item.label} description={item.description} />
</div>
```

(= `fontSize 10 × lineHeight 1.35 × 2줄 + paddingTop 6` ≈ 33px)

**`diagramSet`에 한해서만 이 예약을 둔다.** `image` 슬라이드는 캡션이 바뀌지 않으므로 불필요하다.

### 3-4. MobileCreditsSlide — 자연 높이

```tsx
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
```

**변경점:** `width: '70vw'` → `100%`, 고정 높이 래퍼 제거, `scrollSnapAlign` 제거, `flexShrink` 제거.

### 3-5. MobileInfoSlide — 히어로 직후 고정, 자연 높이

```tsx
// ── 정보 — 히어로 바로 아래 고정. 폭 100%, 높이 자연 결정 ──
function MobileInfoSlide({ project }: { project: Project }) {
  return (
    <div style={{
      width: '100%',
      padding: '4px 0',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      fontFamily: FONT,
      color: '#080706',
    }}>
      <div style={{
        fontSize: 10,
        fontWeight: 300,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        opacity: 0.45,
      }}>
        {project.location ?? ''}
      </div>

      {/* 메타 — 세로 폭 여유를 활용해 가로 3열 배치 */}
      <div style={{ display: 'flex', gap: 24 }}>
        {[['TYPOLOGY', project.type], ['STATUS', project.status], ['YEAR', String(project.year)]].map(([l, v]) => (
          <div key={l}>
            <div style={{ fontSize: 9, fontWeight: 300, letterSpacing: '0.1em', opacity: 0.45 }}>{l}</div>
            <div style={{ fontSize: 10, fontWeight: 400, letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: 2 }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

**변경점:** `width: '60vw'` → `100%`, 고정 높이 래퍼 제거, 메타 3항목을 **세로 나열 → 가로 3열**로 전환(폭이 100%로 넓어졌으므로 세로 공간을 절약한다).

**CLIENT/SIZE는 추가하지 않는다.** Stage 4 CMS 범위이며 이번 명세 밖이다.

---

## 4. ExpandedBlock 재구성

```tsx
// ── 확장 블록 — BACK 행 / 타이틀 행 / 세로 스택 [①히어로 ②정보 ③이후 슬라이드] ──
function ExpandedBlock({ project, onBack, heroRef, heroHidden, titleMorphing, titleRef }: {
  project: Project
  onBack: () => void
  heroRef: (el: HTMLDivElement | null) => void
  heroHidden: boolean
  titleMorphing: boolean
  titleRef: (el: HTMLDivElement | null) => void
}) {
  const restSlides = getRestSlides(project)

  return (
    <div>
      {/* BACK 행 — 기존 그대로 (변경 없음) */}
      <button onClick={onBack} style={{ /* 기존 스타일 전부 유지 */ }}>
        ← BACK
      </button>

      {/* 타이틀 행 — 기존 그대로 (변경 없음) */}
      <div ref={titleRef} style={{ /* 기존 스타일 전부 유지 */ }}>
        {project.title}
      </div>

      {/* 세로 스택 — 모든 슬라이드 동일 폭. 스크롤이 곧 진행도 */}
      <div
        className="mpw-track"
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
              alt={project.title}
              draggable={false}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: project.coverColor }} />
          )}
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
```

**제거 대상 (전부 가로 트랙 전용):**
- `trackRef`, `counterIdx` state
- `trackDrag` ref + `onTrackPointerDown` / `onTrackPointerMove` / `onTrackPointerUp` (마우스 드래그-투-가로스크롤)
- `handleScroll` (스냅 안착 기준 카운터 산출)
- `total` 변수
- 카운터 행 JSX 전체
- 트랙 div의 `overflowX`, `overflowY`, `WebkitOverflowScrolling`, `touchAction: 'pan-x'`, `overscrollBehaviorX`, `scrollSnapType`, `scrollPaddingInline`, `paddingRight`
- 히어로 래퍼의 `flexShrink: 0`, `scrollSnapAlign: 'center'`

**`className="mpw-track"` 유지:** 스크롤바 숨김 CSS가 걸려 있으나, 이 div는 더 이상 스크롤 컨테이너가 아니다. **무해하나 불필요하므로 제거한다.** (`globals.css` 수정 금지이므로 CSS 자체는 남긴다 — `.mpw-chips`가 여전히 사용 중이다)

→ 정정: `className`을 **제거한다.**

**히어로 `ref` 위치 변경 주의:** 기존에는 래퍼 div(`flexShrink: 0`) 안의 내부 div에 `heroRef`가 붙었다. 세로 스택에서는 래퍼가 사라지므로 **`heroRef`가 이미지 컨테이너 div에 직접 붙는다.** FLIP 모프의 `getBoundingClientRect()` 실측 대상이 이 div이며, 폭·높이가 동일하므로 **모프 좌표계는 불변이다.**

---

## 5. 스크롤 컨테이너

`ExpandedBlock`은 스크롤을 소유하지 않는다. **상위 열람 레이어(§6-1)가 세로 스크롤 컨테이너가 되어야 한다.**

현행 열람 레이어 컨테이너(`MobileProjectWall` 내 `activeSlug && viewerIn` 조건부 렌더 div)에 다음을 적용한다.

```tsx
<div style={{
  position: 'absolute',
  top: HEADER_H,
  left: 0,
  right: 0,
  bottom: 0,
  overflowY: 'auto',                    // ← 세로 스크롤 소유
  overflowX: 'hidden',
  WebkitOverflowScrolling: 'touch',
  overscrollBehaviorY: 'contain',       // ← 스크롤 체이닝 차단 (부모 링으로 전파 방지)
  touchAction: 'pan-y pinch-zoom',      // ← 세로 팬 + 핀치 줌 허용, 가로 팬만 차단 (§7)
  opacity: activeSlug && viewerIn ? 1 : 0,
  pointerEvents: activeSlug ? 'auto' : 'none',
  transition: `opacity ${MORPH_MS}ms ease`,
}}>
```

**기존 수직 중앙 정렬(`display: flex; alignItems: center` 등)이 있다면 제거한다.** 세로 스택은 상단부터 흐른다.

**`overscrollBehaviorY: 'contain'` 필수:** 이것이 없으면 스택 끝에서 스크롤이 부모(링 컨테이너)로 전파되어 프로젝트가 의도치 않게 바뀐다.

**활성 전환 시 스크롤 초기화:** 다른 프로젝트를 열면 스크롤이 이전 위치에 남는다. `activeSlug` 변경 시 `scrollTop = 0`으로 리셋한다.

```tsx
const viewerScrollRef = useRef<HTMLDivElement>(null)
useEffect(() => {
  if (activeSlug && viewerScrollRef.current) viewerScrollRef.current.scrollTop = 0
}, [activeSlug])
```

---

## 6. 검증 항목

1. **세로 스크롤:** 열람 진입 후 위→아래 스크롤로 커버 → 정보 → 슬라이드 순서로 흐른다.
2. **레이아웃 시프트 없음:** 이미지 로드 전후로 스크롤 위치나 슬라이드 높이가 튀지 않는다 (`aspectRatio` 사전 예약 동작 확인).
3. **세로 긴 이미지:** 초상형(세로가 긴) 슬라이드가 폭 100%로 크게 렌더되고, 높이가 비율대로 흐른다. 가로 트랙 때보다 확연히 크게 보여야 한다.
4. **캡션:** 각 이미지 하단에 자연 높이로 렌더. 2줄 초과 시 ellipsis.
5. **다이어그램 세트:** 동일 위치에서 3초 자동 전환 + 탭 전환 정상. **스크롤 중 세로 이동이 탭으로 오인되지 않는다** (`clientY` 5px 임계).
6. **다이어그램 높이 안정:** 서브슬라이드 전환 시 프레임 높이·캡션 높이가 변하지 않는다. 스크롤 위치 튐 없음.
7. **크레딧:** 행 수만큼 자연 높이. 고정 높이 잔재 없음.
8. **정보:** 히어로 직후, 메타 3항목(TYPOLOGY/STATUS/YEAR) 가로 3열.
9. **스크롤 체이닝:** 스택 최하단에서 계속 스크롤해도 뒤의 링이 움직이지 않는다.
10. **스크롤 리셋:** 프로젝트 A 열람 → 하단까지 스크롤 → BACK → 프로젝트 B 열람 시 스크롤이 최상단에서 시작한다.
11. **탭 모프:** 카드 탭 → 히어로 확대 모프 정상 (회귀 없음).
12. **BACK 역모프:** 열람 → BACK 시 히어로 → 티어0 썸네일 축소 모프 정상 (명세 ③ 결과 유지). **스크롤을 내린 상태에서 BACK을 눌러도** 모프가 정상 동작해야 한다.
13. **타이틀 모프:** 정상 (회귀 없음).
14. **휠 조작:** 데스크톱 브라우저를 768px 미만으로 좁혀 확인 시, 마우스 휠로 세로 스크롤이 자연스럽게 동작한다.
15. **핀치 줌:** 열람 레이어에서 두 손가락으로 이미지·다이어그램·도면을 확대할 수 있다. 화면 전체가 확대된다 (브라우저 네이티브 줌).
16. **핀치 중 오작동 없음:** `diagramSet`을 두 손가락으로 확대해도 서브슬라이드가 넘어가지 않는다.
17. **컴파일:** `npx tsc --noEmit` 무오류. `TRACK_IMG_H` / `TRACK_DIAGRAM_H` / `CAPTION_H` 잔존 참조 0건.

---

## 7. 핀치 줌 (Pinch-to-Zoom)

### 7-1. 요구

건축 도면·다이어그램·상세 이미지를 모바일에서 **두 손가락으로 확대**해 볼 수 있어야 한다. 이것이 불가능하면 포트폴리오로 기능하지 못한다. (BIG도 이를 허용한다)

### 7-2. 현행 차단 원인

`viewport` 메타는 문제가 아니다. `src/app/layout.tsx`에 `viewport` export가 없으므로 Next.js 기본값(`width=device-width, initial-scale=1`)이 적용되며, 여기에는 `maximum-scale`이나 `user-scalable=no`가 포함되지 않는다. **브라우저 레벨에서는 이미 허용 상태다.**

차단 원인은 전적으로 CSS `touch-action`이다. `touch-action` 값에 `pinch-zoom`을 명시하지 않으면 핀치가 차단되며, `pan-x` / `pan-y` / `none` 모두 마찬가지다.

| 지점 | 현재 값 | 조치 |
|---|---|---|
| 열람 스크롤 컨테이너 | `pan-x` (구 트랙) | **`pan-y pinch-zoom`** (§5) |
| 링 컨테이너 | `none` | **유지** (§7-3) |
| 필터 칩 바 (`LandingExperience.tsx`) | `pan-x` | **유지** — 수정 금지 파일이며, 칩 행 위에서 확대할 이유가 없다 |

### 7-3. 링 컨테이너는 `none`을 유지한다

`useRingWall`의 포인터 기반 드래그·플릭 물리가 브라우저 기본 제스처와 충돌하지 않으려면 `touch-action: none`이 필요하다. `none`은 단독 값이므로 `none pinch-zoom` 같은 조합은 **유효하지 않다.**

**링에서 확대할 대상이 없으므로 이는 실질 제약이 아니다.** 확대가 필요한 곳(열람 레이어)에서 확대가 되는 것이 핵심이다.

**알려진 한계:** 열람 중 페이지를 확대한 뒤 BACK으로 링에 복귀하면, 확대 상태가 유지된 채 링 영역의 팬이 막힐 수 있다. 사용자가 핀치 아웃으로 복귀할 수 있으므로 **이번 명세에서는 보정하지 않는다.** 실기기에서 문제가 확인되면 후속 명세에서 "BACK 시 줌 리셋"을 검토한다.

### 7-4. 멀티터치와 탭 전환의 충돌

`diagramSet`은 탭으로 서브슬라이드를 넘긴다. 핀치 중에는 포인터가 2개이므로, 확대하려다 다이어그램이 넘어가는 오작동이 발생한다.

**해법:** `onPointerDown`에서 `e.isPrimary === false`(두 번째 손가락)를 감지해 탭 후보를 무효화한다. 구현은 §3-3에 반영되어 있다.

---

## 8. 알려진 리스크

**스크롤 내린 상태에서의 BACK 역모프.** 명세 ③의 역모프 목표 계산은 링 중앙 d=0 썸네일 rect를 **산식으로** 산출하므로 스크롤 위치와 무관하다. 그러나 모프 **시작점**(`pendingBackRef`의 `from`)은 히어로의 `getBoundingClientRect()` 실측이다. 스크롤을 내려 히어로가 뷰포트 밖으로 나간 상태에서 BACK을 누르면, `from.top`이 음수가 되어 모프가 화면 위쪽에서 내려오는 것처럼 보인다.

**이는 결함이 아니라 올바른 거동이다.** 히어로가 실제로 그 위치에 있으므로, 그 위치에서 출발하는 것이 FLIP의 정의다. 다만 시각적으로 어색하다면 후속 명세에서 "BACK 시 스크롤을 먼저 상단으로 되돌린 후 모프"를 검토한다. **이번 명세에서는 보정하지 않는다.**

---

## 9. 금지 사항 (Forbidden Changes)

1. **`src/hooks/useRingWall.ts` — 파일 전체 수정 금지.**
2. **`src/components/ProjectWall.tsx` — 파일 전체 수정 금지.**
3. **`src/components/LandingExperience.tsx` — 파일 전체 수정 금지.**
4. **`src/components/ContentArea.tsx` — 파일 전체 수정 금지.** 데스크톱 가로 트랙은 유지한다.
5. **`src/app/globals.css` — 파일 전체 수정 금지.** `.mpw-track` CSS는 남긴다 (className만 제거).
6. **`src/lib/*`, `src/types/*` — 파일 전체 수정 금지.**
7. **브라우징 레이어(링) 일체 수정 금지.** 티어 파생식(`tierWidths` / `tierSlotHeights` / `TIER0_RATIO` / `TIER0_MAX` / `TIER0_MIN` / `TIER1_RATIO` / `TIER2_RATIO` / `TIER_ASPECT` / `BELOW_TEXT_H` / `GAP` / `OPACITY`), 카드 렌더 체인(`ring.heights[index]` → `thumbH` → `thumbW`), 텍스트 하단 배치 일체 불변.
8. **FLIP 모프 로직 수정 금지.** `startMorph` / `MorphState` / `PendingMorph` / `TitleMorph` / `pendingTapRef` / `pendingBackRef` / `useLayoutEffect` 내 탭·BACK 분기 / 모프 오버레이 렌더 일체 불변. **역모프 목표 산식(명세 ③ 결과)은 특히 건드리지 마라.**
9. **`diagramSet` 인터랙션 로직 수정 금지.** 자동 진행 3000ms, `subIdx` 키잉 타이머, 탭 전환, `autoAdvanceMs` 옵션 일체 불변. **레이아웃만 세로 적응**하며, 허용되는 로직 변경은 다음 2건뿐이다: (a) 탭 판정 축 `clientX` → `clientY`, (b) 멀티터치(`e.isPrimary === false`) 시 탭 억제 (§7-4).
10. **셔플(§4) 수정 금지.**
11. **필터 패널(§7) 수정 금지.**
12. **`getRestSlides` / `splitCaption` 수정 금지.**
13. **`HERO_W` 상수 수정 금지.** FLIP 모프 종착점 산출이 의존한다.
14. **`scrollSnapType` 도입 금지.** 세로 스택은 자유 스크롤이다. 스냅을 걸면 긴 이미지가 잘려 보인다.
15. **`IntersectionObserver` 도입 금지.** 카운터를 되살리거나 진행도를 추적하려 하지 마라. 결정 2에 의해 카운터는 제거된다.
16. **측정 반응형 도입 금지.** 슬라이드 높이는 `ratio` 메타와 `aspectRatio` CSS로 결정된다. `getBoundingClientRect` / `ResizeObserver` / `offsetHeight`로 이미지 크기를 측정하지 않는다. (기존 FLIP 모프의 rect 캡처는 §9에 의해 불변)
17. **`src/app/layout.tsx` — 파일 전체 수정 금지.** `viewport` export를 추가하지 마라. 기본값이 이미 핀치 줌을 허용하며, `maximumScale`이나 `userScalable`을 명시하면 오히려 차단된다 (§7-2).
18. **링 컨테이너의 `touchAction: 'none'` 수정 금지.** `useRingWall`의 포인터 물리가 이에 의존한다 (§7-3).
19. **`npm run dev` / `npm run build` 실행 금지.** 검증은 `npx tsc --noEmit`만 사용한다.

---

## 10. 완료 조건

- `npx tsc --noEmit` 무오류
- `MobileProjectWall.tsx` 외 파일 변경 없음
- `TRACK_IMG_H` / `TRACK_DIAGRAM_H` / `CAPTION_H` 완전 삭제 및 잔존 참조 0건
- 가로 트랙 잔재(`trackRef` / `trackDrag` / `handleScroll` / `counterIdx` / 카운터 JSX / `scrollSnapAlign`) 완전 제거
- §6 검증 항목 전항 통과

---

## 11. Claude Code 실행 프롬프트

```
VERTICAL_STACK_SPEC.md 파일을 읽고 명세대로 구현해줘.

수정 대상은 src/components/MobileProjectWall.tsx 한 파일뿐이다.

핵심은 열람 레이어(ExpandedBlock)를 가로 스크롤 트랙에서 세로 스크롤 스택으로
전환하는 것이다. 전치 관계가 바뀐다: [동일 높이 / 폭 가변] → [동일 폭 / 높이 가변].

1) TRACK_IMG_H, TRACK_DIAGRAM_H, CAPTION_H 상수를 완전 삭제하고,
   모든 슬라이드를 폭 100% + aspectRatio(ratio 메타 파생) 구조로 교체한다.
2) 가로 트랙 전용 코드(trackRef, trackDrag 핸들러 3종, handleScroll, counterIdx,
   카운터 JSX, scrollSnapType, scrollSnapAlign, touchAction pan-x)를 전부 제거한다.
3) 상위 열람 레이어 컨테이너가 세로 스크롤을 소유하도록 한다 (overflowY auto,
   overscrollBehaviorY contain, touchAction pan-y). activeSlug 변경 시 scrollTop 리셋.
4) diagramSet은 캐러셀을 유지한다. 자동 진행/탭 전환 로직은 그대로 두고,
   (a) 탭 판정 축을 clientX → clientY로 바꾸고,
   (b) 멀티터치(e.isPrimary === false) 시 탭을 억제한다.
5) 핀치 줌을 허용한다. 열람 스크롤 컨테이너의 touchAction을 'pan-y pinch-zoom'으로
   지정한다. layout.tsx는 건드리지 마라 — viewport 기본값이 이미 줌을 허용한다.
   링 컨테이너의 touchAction: 'none'도 그대로 둔다.

삭제 후 npx tsc --noEmit을 실행하면 잔존 참조가 컴파일 오류로 드러난다.
이를 진단 수단으로 활용해서 §3의 신규 구현으로 전부 교체하라.

§8 금지 사항을 반드시 준수할 것. 특히 브라우징 레이어(링)와 FLIP 모프 로직,
그리고 명세 ③에서 확정된 BACK 역모프 목표 산식은 절대 건드리지 마라.
ContentArea.tsx(데스크톱 가로 트랙)도 수정 대상이 아니다.

구현 후 npx tsc --noEmit로 검증하고, npm run dev나 npm run build는 실행하지 마라.
```
