# 텍스트·인용 슬라이드 구현 명세 (260714)

## 0. 목적

Sanity Studio에 존재하나 프론트에 도달하지 않는 슬라이드 타입을 개방하고, 서술문 타입을 신설한다. 부수적으로 모바일 캡션 조판을 데스크톱과 정합시킨다.

**작업 범위 4건**

| # | 항목 | 계층 |
|---|---|---|
| A | `textSlide` 신설 (서술문) | 스키마 + 쿼리 + 타입 + 렌더러(D/M) |
| B | `quoteSlide` 개방 (인용문) | 쿼리 + 타입 + 렌더러(D/M) |
| C | 모바일 캡션 중앙정렬 | 렌더러(M) |
| D | 모바일 diagramSet 카운터 추가 | 렌더러(M) |

**이미 구현되어 손대지 않는 것**
- 데스크톱 `DiagramSetSlideView`의 캡션 중앙정렬·카운터 (ContentArea.tsx 221–240행) — 완성 상태. 수정 금지.

---

## 1. 금지 사항 (Forbidden changes)

다음은 이번 명세의 범위 밖이며, 절대 수정하지 않는다.

1. `useRingWall.ts` — 물리 코어. 일절 접촉 금지.
2. `ProjectWall.tsx` — 데스크톱 월. 접촉 금지.
3. `ContentArea.tsx`의 트랙 스크롤 물리 (`scrollPos`, `dragState`, 플릭, `maxScroll`, `clampScroll`, `isNearCenter`) — 접촉 금지.
4. `ContentArea.tsx`의 모프 시퀀스 (`morphing`, `morphRect`, `MORPH_MS`) — 접촉 금지.
5. `MobileProjectWall.tsx`의 링 렌더링·FLIP 모프·셔플 로직 — 접촉 금지.
6. 기존 `ImageSlide` / `DiagramSetSlide` / `CreditsSlide`의 데이터 계약 — 필드 추가·삭제 금지.
7. 데스크톱 `DiagramSetSlideView` — 캡션·카운터 이미 정상. 수정 금지.
8. `INFO_SLIDE_W`, `CREDITS_SLIDE_W`, `SLIDE_GAP_PX`, `TRACK_INSET`, `SLIDE_H_RATIO`, `DIAGRAM_H_RATIO` 등 기존 상수 값 변경 금지.

---

## 2. 스키마 — `sanity/schemas/slides.ts`

### 2-1. `textSlide` 신설

파일 하단, `quoteSlide` 정의 **앞에** 다음을 추가한다.

```ts
/** 서술문 — 좌정렬 본문. 프로젝트 설명 텍스트 */
export const textSlide = defineType({
  name: 'textSlide',
  title: '본문 텍스트',
  type: 'object',
  fields: [
    defineField({
      name: 'body',
      title: '본문',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [{ title: '본문', value: 'normal' }],
          lists: [],
          marks: {
            decorators: [
              { title: '강조', value: 'strong' },
              { title: '기울임', value: 'em' },
            ],
            annotations: [],
          },
        }),
      ],
      description: '문단 단위로 입력. 줄바꿈이 아니라 문단(Enter)으로 나눈다',
      validation: (Rule) => Rule.required().min(1),
    }),
  ],
  preview: {
    select: { body: 'body' },
    prepare({ body }) {
      const first = Array.isArray(body) ? body[0] : undefined
      const text = first?.children?.map((c: { text?: string }) => c.text ?? '').join('') ?? ''
      return {
        title: text ? text.slice(0, 50) : '(본문 없음)',
        subtitle: '본문 텍스트',
      }
    },
  },
})
```

**주석 정정:** `quoteSlide` 정의 위의 주석
`/** 인용구 — 신설. 이번 단계에서는 스키마에만 존재 (프론트 렌더러는 4단계) */`
을 다음으로 교체한다.
`/** 인용구 — 중앙정렬, 따옴표, 출처 병기 */`

### 2-2. 스키마 등록

`textSlide`가 export되었으므로, 이를 배열 멤버로 등록하는 지점을 찾아 추가한다. `project` 스키마의 `slides` 필드 `of` 배열에 `{ type: 'textSlide' }`를, 스키마 인덱스(`sanity/schemas/index.ts` 또는 `sanity.config.ts`의 `schema.types`)에 `textSlide`를 추가한다.

**주의:** `quoteSlide`가 이미 두 지점에 등록되어 있다면 `textSlide`도 동일한 두 지점에 등록한다. `quoteSlide` 등록이 누락되어 있다면 함께 추가한다 — Studio에서 인용구 입력이 가능했다는 사실로 미루어 등록은 되어 있을 것으로 추정되나, 반드시 확인한다.

---

## 3. 타입 — `src/types/index.ts`

### 3-1. Portable Text 블록 타입

`ProjectSlide` 유니온 정의 앞에 다음을 추가한다.

```ts
/** Sanity Portable Text 블록 (textSlide 본문) */
export interface PortableTextBlock {
  _type: 'block'
  _key?: string
  style?: string
  children: { _type: 'span'; _key?: string; text: string; marks?: string[] }[]
  markDefs?: unknown[]
}

export interface TextSlide {
  kind: 'text'
  body: PortableTextBlock[]
}

export interface QuoteSlide {
  kind: 'quote'
  text: string
  /** 예: "BJARKE INGELS - FOUNDER & CREATIVE DIRECTOR, BIG" */
  attribution?: string
}
```

### 3-2. 유니온 확장

```ts
export type ProjectSlide = ImageSlide | DiagramSetSlide | CreditsSlide | TextSlide | QuoteSlide
```

---

## 4. 쿼리 — `src/lib/queries.ts`

### 4-1. GROQ 필터 제거 — **삭제 지시**

다음 두 지점을 **모두** 수정한다. 하나라도 남기면 인용문·본문이 도달하지 않는다.

**삭제 대상 1** — 파일 4행 주석:
```
// QuoteSlide는 이번 단계에서 원천 차단 (렌더러가 4단계 소관)
```
→ 삭제.

**삭제 대상 2** — `PROJECTS_QUERY` 내 슬라이드 필터:
```
"slides": slides[_type != "quoteSlide"]{
```
→ 다음으로 교체:
```
"slides": slides[]{
```

### 4-2. GROQ projection 확장

`PROJECTS_QUERY`의 `slides` 블록 내부, `creditsSlide` 분기 **뒤에** 다음 두 분기를 추가한다.

```
    _type == "textSlide" => {
      "kind": "text",
      body
    },
    _type == "quoteSlide" => {
      "kind": "quote",
      text, attribution
    }
```

**주의:** 기존 `creditsSlide` 분기 끝의 `}` 뒤에 쉼표가 없다면 추가해야 한다. GROQ projection 분기는 쉼표로 구분된다.

### 4-3. `normalizeSlide` 확장 — **삭제 지시 아님, 케이스 추가**

`switch (slide.kind)`에 두 케이스를 추가한다.

```ts
    case 'text':
      return slide
    case 'quote':
      return {
        kind: 'quote',
        text: slide.text,
        attribution: slide.attribution ?? undefined,
      }
```

**검증 기법:** 타입 유니온을 먼저 확장(3절)한 뒤 `npx tsc --noEmit`을 실행하면, `normalizeSlide`의 `switch`가 exhaustive하지 않아 반환 타입 오류로 잔존 누락이 드러난다. 이를 진단 수단으로 사용한다.

---

## 5. 데스크톱 렌더러 — `src/components/ContentArea.tsx`

### 5-1. import 확장

4행:
```ts
import type { CreditsSlide, DiagramSetSlide, ImageSlide, Project, ProjectSlide, QuoteSlide, TextSlide } from '@/types'
```

### 5-2. 상수 추가

`CREDITS_SLIDE_W = 420` 바로 아래에 추가:

```ts
const TEXT_SLIDE_W = 560     // 서술문 — 한글 본문 가독 폭
const QUOTE_SLIDE_W = 460    // 인용문 — 본문보다 좁게 하여 위계 부여
```

### 5-3. `isDiagram` 하단에 텍스트 판정 헬퍼 추가

```ts
// 텍스트 계열 — ratio가 없어 폭이 상수로 결정되는 슬라이드
const isTextual = (s: ProjectSlide) => s.kind === 'text' || s.kind === 'quote'
```

### 5-4. `TextSlideView` 신설

`CreditsSlideView` 정의 **앞에** 추가한다.

```tsx
// ── 본문 텍스트: 좌정렬, 슬라이드 높이 내 수직 중앙. 폭은 상수 ──
function TextSlideView({ slide }: { slide: TextSlide }) {
  return (
    <div style={{
      height: '100%',
      width: TEXT_SLIDE_W,
      display: 'flex',
      alignItems: 'center',
      boxSizing: 'border-box',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        maxHeight: '100%',
        overflowY: 'auto',
      }}>
        {slide.body.map((block, i) => (
          <p key={block._key ?? i} style={{
            margin: 0,
            fontFamily: FONT,
            fontSize: 14,
            fontWeight: 300,
            lineHeight: 1.75,
            letterSpacing: '-0.01em',
            color: '#0a0908',
            wordBreak: 'keep-all',
            whiteSpace: 'normal',
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
        ))}
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
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
      boxSizing: 'border-box',
    }}>
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
        {`\u201C${slide.text}\u201D`}
      </div>
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
```

**설계 근거:**
- 따옴표는 `\u201C`/`\u201D` (곡선 따옴표). Studio 입력값에 따옴표를 넣지 않고 렌더러가 부여하므로, 입력 일관성이 강제된다.
- `attribution`은 선택 필드이므로 없으면 행 자체를 렌더하지 않는다. 빈 행이 남지 않는다.
- `overflowY: 'auto'` — 본문이 슬라이드 높이를 넘길 경우의 안전판. 정상 분량에서는 발동하지 않는다.

### 5-5. `SlideContent` 분기 확장

```tsx
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
  }
```

### 5-6. `ratios` 확장

`ratios` useMemo 내부, `credits` 폴백 주석 행을 수정한다.

```ts
  const ratios = useMemo(() => slides.map(slide => {
    if (slide.kind === 'image') return slide.ratio ?? FALLBACK_RATIO
    if (slide.kind === 'diagramSet') return slide.items[0]?.ratio ?? FALLBACK_RATIO
    return FALLBACK_RATIO   // credits·text·quote — 폭은 상수, 자리만 채움
  }), [slides])
```

(코드 변경 없음. 주석만 갱신.)

### 5-7. `rects` 폭 결정 확장 — **중요**

`rects` useMemo 내부의 폭 분기를 다음으로 교체한다.

```ts
      slides.forEach((slide, i) => {
        const ratio = ratios?.[i] ?? FALLBACK_RATIO
        if (slide.kind === 'credits') widths.push(CREDITS_SLIDE_W)
        else if (slide.kind === 'text') widths.push(TEXT_SLIDE_W)
        else if (slide.kind === 'quote') widths.push(QUOTE_SLIDE_W)
        else if (isDiagram(slide)) widths.push(ratio * diagramH)
        else widths.push(ratio * slideH)
      })
```

**순서 주의:** `credits`/`text`/`quote` 분기가 `isDiagram` 분기보다 **앞에** 와야 한다.

### 5-8. 트랙 자식 높이 — 변경 없음

트랙 자식 `<div>`의 `height: isDiagram(slide) ? diagramH : slideH`는 그대로 둔다. `text`/`quote`는 `isDiagram`이 false이므로 `slideH`를 받는다. 의도된 동작이다.

**주:** `isTextual` 헬퍼(5-3)는 이번 명세에서 직접 사용되지 않는다. 향후 텍스트 슬라이드에 별도 높이 정책이 필요할 때의 확장점으로만 정의한다. **불필요하다면 5-3을 생략해도 무방하다** — 미사용 변수는 린트 경고를 유발하므로, 생략을 권장한다.

---

## 6. 모바일 렌더러 — `src/components/MobileProjectWall.tsx`

### 6-1. import 확장

12행:
```ts
import type { CreditsSlide, DiagramSetSlide, ImageSlide, Project, ProjectSlide, QuoteSlide, TextSlide } from '@/types'
```

### 6-2. `MobileCaption` 중앙정렬 — **작업 C**

87–107행의 `MobileCaption` 내부 텍스트 `<div>`에 `textAlign: 'center'`를 추가한다.

```tsx
      <div style={{
        fontFamily: FONT,
        fontSize: 10,
        fontWeight: 300,
        lineHeight: 1.35,
        color: '#0a0908',
        opacity: 0.55,
        textAlign: 'center',        // ← 추가. 데스크톱 캡션과 정합
        wordBreak: 'keep-all',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical' as const,
        overflow: 'hidden',
      }}>
```

**영향 범위:** `MobileCaption`은 `MobileImageSlide`와 `MobileDiagramSetSlide`가 공유한다. 이미지 캡션·다이어그램 캡션이 동시에 중앙정렬된다. **의도된 동작이다** — 데스크톱이 이미 양쪽 모두 중앙정렬이므로 정합이 회복된다.

### 6-3. `MobileDiagramSetSlide` 카운터 추가 — **작업 D**

192–195행의 캡션 래퍼를 다음으로 교체한다.

```tsx
      {/* 캡션 + 카운터 — 서브슬라이드 전환 시 높이 흔들림 방지: 2줄 고정 예약 */}
      <div style={{ minHeight: 10 * 1.35 * 2 + 6 }}>
        <MobileCaption label={item.label} description={item.description} />
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
```

카운터는 `minHeight` 예약 블록 **바깥**에 둔다. 예약 높이는 캡션 2줄분이며, 카운터는 항상 1줄이므로 높이 변동이 없다.

### 6-4. `MobileTextSlide` / `MobileQuoteSlide` 신설

`MobileCreditsSlide` 정의 **앞에** 추가한다.

```tsx
// ── 본문 텍스트 — 폭 100%, 높이 자연 결정. 좌정렬 ──
function MobileTextSlide({ slide }: { slide: TextSlide }) {
  return (
    <div style={{ width: '100%', padding: '4px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {slide.body.map((block, i) => (
        <p key={block._key ?? i} style={{
          margin: 0,
          fontFamily: FONT,
          fontSize: 12,
          fontWeight: 300,
          lineHeight: 1.75,
          letterSpacing: '-0.01em',
          color: '#0a0908',
          wordBreak: 'keep-all',
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
      ))}
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
        {`\u201C${slide.text}\u201D`}
      </div>
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
```

**모바일 위계 근거:** 세로 스택에서는 모든 슬라이드가 동일 폭(100%)이므로, 데스크톱처럼 폭 차이로 위계를 줄 수 없다. 대신 인용구에만 좌우 `16px` 인셋과 중앙정렬을 적용해 본문(좌정렬, 인셋 없음)과 구분한다.

### 6-5. `MobileSlide` 분기 확장

265–273행:

```tsx
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
```

---

## 7. 검증

**허용된 검증 수단은 다음 하나뿐이다.**

```
npx tsc --noEmit
```

`npm run dev` 및 `npm run build`는 실행하지 않는다.

**단계적 검증 절차 (권장):**
1. 3절(타입 유니온 확장)만 먼저 적용 → `npx tsc --noEmit` 실행
2. 컴파일 오류가 `normalizeSlide` (queries.ts), `SlideContent` (ContentArea.tsx), `MobileSlide` (MobileProjectWall.tsx) 세 지점에서 발생해야 한다 — 이 세 지점이 exhaustive switch이므로, 유니온 확장 시 반드시 오류가 난다
3. 오류 지점이 셋보다 적거나 많으면, 명세가 놓친 분기가 있다는 신호다. 보고할 것
4. 나머지 절을 적용 → `npx tsc --noEmit` 통과 확인

---

## 8. 체크리스트

- [ ] `slides.ts`: `textSlide` 신설, `quoteSlide` 주석 정정
- [ ] 스키마 인덱스 + `project.slides` 배열에 `textSlide` 등록 (`quoteSlide` 등록 여부도 확인)
- [ ] `types/index.ts`: `PortableTextBlock`, `TextSlide`, `QuoteSlide` 추가 + 유니온 확장
- [ ] `queries.ts`: 4행 주석 삭제, `[_type != "quoteSlide"]` → `[]`, projection 2분기 추가, `normalizeSlide` 2케이스 추가
- [ ] `ContentArea.tsx`: 상수 2개, `TextSlideView`, `QuoteSlideView`, `SlideContent` 분기, `rects` 폭 분기
- [ ] `MobileProjectWall.tsx`: `MobileCaption` 중앙정렬, diagramSet 카운터, `MobileTextSlide`, `MobileQuoteSlide`, `MobileSlide` 분기
- [ ] `npx tsc --noEmit` 통과
