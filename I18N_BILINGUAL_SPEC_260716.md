# 한/영 병기(i18n) 구현 명세 — 260716

## 0. 목적과 범위

실물 포트폴리오의 한/영 병기 원칙을 홈페이지에 이식한다. **로케일 오브젝트 방식**(필드를 `{ en, ko }` 오브젝트로 담는 방식)을 채택한다. `en`은 필수, `ko`는 선택이며, `ko`가 없으면 영문만 렌더링한다(빈 요소·빈 줄 없음).

이 명세는 **코드 구조 변경 전체**를 다룬다. 30개 프로젝트의 실제 콘텐츠 값(title/subtitle/prize 텍스트) 입력은 이 명세의 범위가 아니다 — 구조 완성 후 Studio에서 수작업으로 채운다.

### 대상 파일 (전수)
- `sanity/schemaTypes/` — `localeTypes.ts`(신설), `project.ts`(수정), `slides.ts`(수정), `index.ts`(수정)
- `src/types/index.ts` — 타입 정의 수정
- `src/lib/queries.ts` — GROQ·정규화 수정
- `src/lib/projectMeta.ts` — (기존) 변경 없음, 단 splitRole/sizeLabel 유지 확인만
- `src/lib/bilingual.tsx` — `BilingualText` 컴포넌트(신설)
- `src/components/ContentArea.tsx` — 렌더러 수정
- `src/components/MobileProjectWall.tsx` — 렌더러 수정
- `src/components/ProjectWall.tsx` — 카드 타이틀 병기(선택적, §7 참조)

> **경로 주의**: Sanity 스키마는 `sanity/schemaTypes` 아래에 있다(`schemas` 폴더는 존재하지 않는다). 컴포넌트 경로는 실제 리포지토리 구조(`src/components` 등)에 맞춰 조정한다.

---

## 1. 로케일 타입 3종 신설

### 1-A. Sanity 스키마 — `sanity/schemaTypes/localeTypes.ts` (신설)

```ts
import { defineField, defineType } from 'sanity'

/** 단일 행 병기 문자열 — 타이틀·서브타이틀·캡션·라벨·인용문 */
export const localeString = defineType({
  name: 'localeString',
  title: '다국어 문자열',
  type: 'object',
  fields: [
    defineField({ name: 'en', title: 'English', type: 'string', validation: (R) => R.required() }),
    defineField({ name: 'ko', title: '한국어', type: 'string' }),
  ],
})

/** 여러 줄 병기 텍스트 (서식 없음) — 다이어그램 설명 */
export const localeText = defineType({
  name: 'localeText',
  title: '다국어 텍스트',
  type: 'object',
  fields: [
    defineField({ name: 'en', title: 'English', type: 'text', rows: 3, validation: (R) => R.required() }),
    defineField({ name: 'ko', title: '한국어', type: 'text', rows: 3 }),
  ],
})

/** 다문단 병기 서식 텍스트 (strong·em만) — 본문 서술·About */
export const localePortableText = defineType({
  name: 'localePortableText',
  title: '다국어 서식 텍스트',
  type: 'object',
  fields: [
    defineField({
      name: 'en', title: 'English', type: 'array',
      of: [{
        type: 'block',
        styles: [{ title: '본문', value: 'normal' }],
        lists: [],
        marks: { decorators: [{ title: '강조', value: 'strong' }, { title: '기울임', value: 'em' }], annotations: [] },
      }],
      validation: (R) => R.required().min(1),
    }),
    defineField({
      name: 'ko', title: '한국어', type: 'array',
      of: [{
        type: 'block',
        styles: [{ title: '본문', value: 'normal' }],
        lists: [],
        marks: { decorators: [{ title: '강조', value: 'strong' }, { title: '기울임', value: 'em' }], annotations: [] },
      }],
    }),
  ],
})
```

### 1-B. 스키마 등록 — `sanity/schemaTypes/index.ts`

기존 `index.ts`에 세 타입을 등록 배열에 추가한다. **로케일 타입은 다른 타입보다 먼저 등록**한다(참조 순서 보장).

```ts
import { localeString, localeText, localePortableText } from './localeTypes'
// ... 기존 import (project, imageSlide, ...)

export const schemaTypes = [
  localeString, localeText, localePortableText,   // 신설 — 최상단
  project,
  imageSlide, diagramSetSlide, creditsSlide, textSlide, quoteSlide,
]
```

> 기존 `index.ts`의 실제 등록 형태(배열명·export 방식)에 맞춰 삽입한다. 배열명이 다르면 그에 맞춘다.

---

## 2. 프론트 로케일 타입 정의 — `src/types/index.ts`

파일 최상단(ProjectType 위 또는 아래)에 추가:

```ts
export interface LocaleString { en: string; ko?: string }
export interface LocaleText { en: string; ko?: string }
export interface LocalePortableText { en: PortableTextBlock[]; ko?: PortableTextBlock[] }
```

`LocaleString`과 `LocaleText`는 런타임 구조가 동일하나(둘 다 `{en, ko?}`), 의미 구분을 위해 별도 선언한다.

---

## 3. 스키마 필드 전환 — 병기 대상 7종

### 3-A. `sanity/schemaTypes/project.ts`

**변경 1 — title 통합.** 기존 `title`(string) + `titleKr`(string) 두 필드를 제거하고 단일 `title: localeString`으로 대체한다.

```ts
// 삭제: name:'title'(string), name:'titleKr'(string) 두 defineField
// 신설:
defineField({
  name: 'title',
  title: '프로젝트명',
  type: 'localeString',
  validation: (Rule) => Rule.required(),
}),
```

> **슬러그 source 주의**: 기존 slug 필드가 `options: { source: 'title' }`를 참조한다. `title`이 오브젝트가 되면 `source`를 함수로 바꾼다: `source: (doc) => doc.title?.en`. 이 수정을 누락하면 신규 프로젝트 슬러그 생성이 깨진다.

**변경 2 — subtitle 신설.** 한 줄 설명 필드가 현재 없다. `title` 아래에 추가:

```ts
defineField({
  name: 'subtitle',
  title: '한 줄 설명',
  type: 'localeString',
}),
```

**변경 3 — result required 해제.** 상(賞)이 없는 프로젝트가 있으므로 필수 해제:

```ts
defineField({
  name: 'result',
  title: '결과',
  type: 'string',
  description: '예: Winner, 2nd Prize, Honorable Mention. 없으면 비움',
  // validation 제거 (기존 Rule.required() 삭제)
}),
```

> `preview.select`가 `title`을 참조한다. 오브젝트가 되었으므로 `title: 'title.en'`으로 수정한다.

### 3-B. `sanity/schemaTypes/slides.ts`

**imageSlide.caption**: `string` → `localeString`
```ts
defineField({
  name: 'caption',
  title: '캡션',
  type: 'localeString',
  description: '형식: LABEL — description (예: SECTION — Public spine)',
}),
```
> `preview.prepare`가 `caption`을 문자열로 쓴다. `caption?.en ?? '(캡션 없음)'`으로 수정.

**diagramItem.label**: `string` → `localeString` (description은 별칭 아래)
```ts
defineField({ name: 'label', title: '라벨', type: 'localeString', validation: (R) => R.required() }),
defineField({ name: 'description', title: '설명', type: 'localeText', validation: (R) => R.required() }),
```
> label의 기존 description 문구("대문자, 예: MASS 01")는 실제 콘텐츠 성격과 맞지 않으므로 제거하거나 "예: Site Conditions"로 교체.
> diagramItem의 `preview.select`가 `title: 'label', subtitle: 'description'`을 참조 → `title: 'label.en', subtitle: 'description.en'`로 수정.

**textSlide.body**: `array of block` → `localePortableText`
```ts
defineField({
  name: 'body',
  title: '본문',
  type: 'localePortableText',
  validation: (R) => R.required(),
}),
```
> `preview.prepare`가 `body[0].children`를 순회한다. `body.en?.[0]?.children`로 경로 수정.

**quoteSlide.text**: `text` → `localeString`
```ts
defineField({ name: 'text', title: '인용문', type: 'localeString', validation: (R) => R.required() }),
```
> `attribution`은 **변경 없음**(영어 전용 string 유지). `preview.prepare`의 `text.slice` → `text?.en?.slice(0, 40)`로 수정.

**creditsSlide**: **변경 없음** (label/value 영어 전용 유지).

---

## 4. GROQ·타입·정규화 — `src/lib/queries.ts` + `src/types/index.ts`

### 4-A. GROQ 쿼리 (`PROJECTS_QUERY`)

로케일 필드는 오브젝트 전체를 가져온다. 프로젝트 레벨:
```groq
title, subtitle,      // { en, ko } 오브젝트 그대로
```
슬라이드 projection 내부:
```groq
_type == "imageSlide" => {
  "kind": "image",
  "src": image.asset->url,
  "ratio": image.asset->metadata.dimensions.aspectRatio,
  caption, diagram      // caption은 { en, ko }
},
_type == "diagramSetSlide" => {
  "kind": "diagramSet",
  autoAdvanceMs,
  "items": items[]{
    "src": image.asset->url,
    "ratio": image.asset->metadata.dimensions.aspectRatio,
    label, description    // 각 { en, ko }
  }
},
_type == "textSlide" => { "kind": "text", body },   // body는 { en, ko }
_type == "quoteSlide" => { "kind": "quote", text, attribution },  // text는 { en, ko }, attribution은 string
```
> 기존 쿼리에서 `title` 단독, `titleKr` 제거. `subtitle` 추가.

### 4-B. 타입 정의 수정 (`src/types/index.ts`)

```ts
export interface Project {
  // 변경:
  title: LocaleString            // 기존 title:string, titleKr:string 두 개를 대체
  subtitle?: LocaleString        // 신설
  // ... 나머지 필드 유지 (titleKr 완전 삭제)
}

export interface ImageSlide {
  kind: 'image'
  src: string
  caption?: LocaleString         // string → LocaleString
  diagram?: boolean
  ratio?: number
}

export interface DiagramItem {
  src: string
  label: LocaleString            // string → LocaleString
  description: LocaleText        // string → LocaleText
  ratio?: number
}

export interface TextSlide {
  kind: 'text'
  body: LocalePortableText       // PortableTextBlock[] → LocalePortableText
}

export interface QuoteSlide {
  kind: 'quote'
  text: LocaleString             // string → LocaleString
  attribution?: string           // 유지
}
```

### 4-C. RawProject 인터페이스 + 정규화 (`queries.ts`)

`RawProject`에서 `title: string` → `title: LocaleString`, `titleKr` 삭제, `subtitle: LocaleString | null` 추가.

`getProjects` 매핑: `title: r.title`, `subtitle: r.subtitle ?? undefined`. `titleKr` 매핑 라인 삭제.

`normalizeSlide`의 각 case에서 로케일 필드는 오브젝트를 그대로 통과시킨다(단순 대입). `caption`/`label`/`description`/`text`/`body`가 `{en, ko}` 형태이므로 별도 가공 없이 전달하되, `?? undefined` 정규화는 유지.

---

## 5. BilingualText 컴포넌트 신설 — `src/lib/bilingual.tsx`

전 병기 요소가 공유하는 단일 컴포넌트. **언어 순서를 파라미터로 받는다**(타이틀·서브타이틀만 ko-first, 나머지 en-first).

```tsx
import type { CSSProperties } from 'react'
import type { LocaleString } from '@/types'

interface BilingualTextProps {
  value: LocaleString
  order: 'en-first' | 'ko-first'
  primaryStyle: CSSProperties    // 주(主) 언어 스타일
  secondaryStyle: CSSProperties  // 종(從) 언어 스타일
  gap?: number                   // 두 줄 사이 간격 (기본 2)
}

/**
 * en 필수, ko 선택. ko 없으면 영문만 렌더.
 * order='ko-first': 한글 위(secondary) / 영문 아래(primary) — 타이틀·서브타이틀
 * order='en-first': 영문 위(primary) / 한글 아래(secondary) — 캡션·다이어그램·본문·인용
 * 위계(크기·굵기·명도)는 primaryStyle/secondaryStyle이 결정한다.
 * en은 항상 primaryStyle, ko는 항상 secondaryStyle (순서와 무관하게 영문이 주).
 */
export function BilingualText({ value, order, primaryStyle, secondaryStyle, gap = 2 }: BilingualTextProps) {
  const en = <div style={primaryStyle}>{value.en}</div>
  const ko = value.ko ? <div style={secondaryStyle}>{value.ko}</div> : null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {order === 'ko-first' ? <>{ko}{en}</> : <>{en}{ko}</>}
    </div>
  )
}
```

**핵심 원리**: 영문은 항상 `primaryStyle`(주), 한글은 항상 `secondaryStyle`(종). `order`는 세로 배치 순서만 바꾼다. 타이틀에서 한글이 위에 오더라도, 영문이 크고 진한 주(主)라는 위계는 스타일이 보장한다.

---

## 6. 데스크톱 렌더러 — `src/components/ContentArea.tsx`

### 6-A. 정보 슬라이드 타이틀 (약 line 860-883)

기존 단일 `{project.title}` 블록을 `BilingualText`로 교체. **order='ko-first'**, 영문 주(크게), 한글 종(작게):

```tsx
<div style={{ marginBottom: 20 }}>
  <BilingualText
    value={project.title}
    order="ko-first"
    primaryStyle={{ fontSize: 16, fontWeight: 500, lineHeight: 1.35, letterSpacing: '-0.01em', wordBreak: 'keep-all' }}
    secondaryStyle={{ fontSize: 12, fontWeight: 400, lineHeight: 1.3, opacity: 0.6, wordBreak: 'keep-all' }}
    gap={2}
  />
  {/* subtitle — 신설, ko-first */}
  {project.subtitle && (
    <div style={{ marginTop: 8 }}>
      <BilingualText
        value={project.subtitle}
        order="ko-first"
        primaryStyle={{ fontSize: 11, fontWeight: 300, lineHeight: 1.4, opacity: 0.75, wordBreak: 'keep-all' }}
        secondaryStyle={{ fontSize: 10, fontWeight: 300, lineHeight: 1.4, opacity: 0.5, wordBreak: 'keep-all' }}
        gap={1}
      />
    </div>
  )}
  {project.location && (
    <div style={{ marginTop: 8, fontSize: 11, fontWeight: 300, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.6 }}>
      {project.location}
    </div>
  )}
</div>
```

### 6-B. Prize (result) — 신설, 타이틀 세트와 CLIENT 사이 (약 line 884, `<MetaField label="CLIENT">` 위)

**고정 높이 자리 예약, 값 있을 때만 골드톤 렌더, 없으면 투명.**

```tsx
{/* Prize — 고정 높이 예약. 값 없으면 투명 (하위 항목 세로 위치 불변) */}
<div style={{ minHeight: 20, display: 'flex', alignItems: 'center' }}>
  {project.result && (
    <span style={{ fontSize: 15, fontWeight: 400, color: '#b89773', letterSpacing: '0.01em' }}>
      {project.result}
    </span>
  )}
</div>
```

> `minHeight`는 result 폰트(15px)를 담는 고정값. 값 유무와 무관하게 이 높이가 보전되어 CLIENT 이하 항목의 세로 위치가 전 프로젝트에서 동일하다.

### 6-C. 이미지 캡션 (ImageSlideView, 약 line 63-103)

`splitCaption`을 **언어별로 두 번 호출**. order='en-first', 영문 위/한글 아래.
`slide.caption`이 `{en, ko}`가 되었으므로:

```tsx
function ImageSlideView({ slide }: { slide: ImageSlide }) {
  const en = slide.caption?.en ? splitCaption(slide.caption.en) : null
  const ko = slide.caption?.ko ? splitCaption(slide.caption.ko) : null
  return (
    <div style={{ height: '100%', position: 'relative' }}>
      <img src={slide.src} alt="" draggable={false}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      {slide.caption && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 12,
          textAlign: 'center', fontFamily: FONT, pointerEvents: 'none' }}>
          {en && (
            <div style={{ fontSize: 12, fontWeight: 300, color: '#0a0908', opacity: 0.7, wordBreak: 'keep-all' }}>
              <span style={{ fontWeight: 500 }}>{en.label}</span>{en.description && ` — ${en.description}`}
            </div>
          )}
          {ko && (
            <div style={{ fontSize: 11, fontWeight: 300, color: '#0a0908', opacity: 0.5, marginTop: 2, wordBreak: 'keep-all' }}>
              <span style={{ fontWeight: 400 }}>{ko.label}</span>{ko.description && ` — ${ko.description}`}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

### 6-D. 다이어그램 텍스트 (DiagramSetSlideView 캡션부, 약 line 226-245)

**영문 세트(제목+설명) 위 / 한글 세트(제목+설명) 아래**, 모두 이미지 하단.
`item.label`·`item.description`이 `{en, ko}`가 되었으므로:

```tsx
{/* 캡션 — 영문 세트 → 한글 세트, 이미지 하단 */}
<div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 12,
  textAlign: 'center', fontFamily: FONT, pointerEvents: 'none', whiteSpace: 'normal', wordBreak: 'keep-all' }}>
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
  {/* 카운터 유지 */}
  <div style={{ fontSize: 11, opacity: 0.5, color: '#0a0908', marginTop: 4 }}>
    {String(subIdx + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
  </div>
</div>
```

### 6-E. 본문 서술 (TextSlideView, 약 line 251-297)

영문 Portable Text 블록 위 / 한글 Portable Text 블록 아래. `slide.body`가 `{en: [], ko: []}`가 되었으므로 렌더 헬퍼를 만들어 두 번 호출.

```tsx
function renderBlocks(blocks: PortableTextBlock[], opacity: number) {
  return blocks.map((block, i) => (
    <p key={block._key ?? i} style={{ margin: 0, fontFamily: FONT, fontSize: 14, fontWeight: 300,
      lineHeight: 1.75, letterSpacing: '-0.01em', color: '#0a0908', opacity, wordBreak: 'keep-all', whiteSpace: 'normal' }}>
      {block.children.map((span, j) => {
        const bold = span.marks?.includes('strong'); const italic = span.marks?.includes('em')
        if (!bold && !italic) return span.text
        return <span key={span._key ?? j} style={{ fontWeight: bold ? 500 : undefined, fontStyle: italic ? 'italic' : undefined }}>{span.text}</span>
      })}
    </p>
  ))
}

function TextSlideView({ slide }: { slide: TextSlide }) {
  return (
    <div style={{ height: '100%', width: TEXT_SLIDE_W, display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxHeight: '100%', overflowY: 'auto' }}>
        {/* 영문 (주) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>{renderBlocks(slide.body.en, 1)}</div>
        {/* 한글 (종) — 있을 때만 */}
        {slide.body.ko && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>{renderBlocks(slide.body.ko, 0.6)}</div>
        )}
      </div>
    </div>
  )
}
```

### 6-F. 인용문 (QuoteSlideView, 약 line 300-342)

**영문·한글 각각 따옴표.** 영문 위 / 한글 아래. attribution은 영어 전용 유지.

```tsx
function QuoteSlideView({ slide }: { slide: QuoteSlide }) {
  return (
    <div style={{ height: '100%', width: QUOTE_SLIDE_W, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16, boxSizing: 'border-box' }}>
      {/* 영문 (주) — 따옴표 */}
      <div style={{ fontFamily: FONT, fontSize: 15, fontWeight: 300, lineHeight: 1.7, letterSpacing: '-0.01em',
        color: '#0a0908', textAlign: 'center', wordBreak: 'keep-all' }}>
        {`\u201C${slide.text.en}\u201D`}
      </div>
      {/* 한글 (종) — 따옴표, 있을 때만 */}
      {slide.text.ko && (
        <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 300, lineHeight: 1.7, letterSpacing: '-0.01em',
          color: '#0a0908', opacity: 0.6, textAlign: 'center', wordBreak: 'keep-all' }}>
          {`\u201C${slide.text.ko}\u201D`}
        </div>
      )}
      {slide.attribution && (
        <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 400, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: '#0a0908', opacity: 0.55, textAlign: 'center' }}>
          {slide.attribution}
        </div>
      )}
    </div>
  )
}
```

### 6-G. 텍스트/인용 슬라이드 좌우 여백 (BIG 문법)

현재 텍스트 슬라이드가 뷰포트에 붙는 문제를 해결한다. `TEXT_SLIDE_W`(560)·`QUOTE_SLIDE_W`(460)는 슬라이드 자체 폭이며, 이들이 뷰포트 중앙에 놓일 때 좌우 여백은 트랙 스크롤 로직이 정한다. **여백을 명시적으로 키우려면** 이 두 상수를 축소하는 대신, 슬라이드 콘텐츠에 좌우 인셋을 주는 방식이 안전하다(폭 자체를 바꾸면 rects 계산·모프 위치에 연쇄 영향). TextSlideView·QuoteSlideView의 최상위 컨테이너에 `paddingLeft/Right`를 추가하되, `width`는 유지하고 `boxSizing: border-box`로 내부만 좁힌다. 권장 인셋: 좌우 각 40px.

> **주의**: `TEXT_SLIDE_W`/`QUOTE_SLIDE_W` 상수 자체는 변경하지 않는다. rects·모프·카운터가 이 값을 참조하므로 변경 시 §6-B 모프 endpoint까지 연쇄 수정이 필요하다. 여백은 padding으로만 처리한다.

### 6-H. 모프 타이틀

모프 레이어는 이미지만 다루므로 title 오브젝트화의 영향을 받지 않는다. **단, 모프 관련 코드에서 `project.title`을 문자열로 쓰는 지점이 있는지 tsc로 확인**(아래 §9).

---

## 7. 데스크톱 Project Wall 카드 — `src/components/ProjectWall.tsx`

카드의 `{project.title}` (약 line 131)이 오브젝트가 되었다. **Wall 카드는 공간이 좁으므로 영문만 표시**(병기 안 함)하는 것을 기본으로 한다.

```tsx
{project.title.en}
```

> 카드에 한글 병기를 원하면 별도 논의. 현 명세는 카드=영문만으로 확정(공간 제약). `alt={project.title}` (line 78)도 `alt={project.title.en}`로 수정.

---

## 8. 모바일 렌더러 — `src/components/MobileProjectWall.tsx`

데스크톱과 동일 원칙. 수정 지점:

- **카드 타이틀** (line 526): `{project.title}` → `{project.title.en}` (모바일 카드도 영문만). `alt={project.title}` (line 499, 1044) → `.en`.
- **모프 타이틀** (line 893, 925, 1180): `activeProject.title`/`project.title`/`morph.title.text`가 문자열을 기대한다. `.en`으로 수정.
- **MobileImageSlide 캡션** (line 113-133): §6-C와 동일 패턴 — `splitCaption`을 en/ko 각각 호출, MobileCaption을 영문·한글 2회 렌더(한글은 있을 때만).
- **MobileDiagramSetSlide** (line 138-211): §6-D와 동일 — `item.label`/`item.description`을 en/ko 분리 렌더.
- **MobileTextSlide** (line 214-245): §6-E와 동일 — `slide.body.en`/`slide.body.ko` 2회 렌더.
- **MobileQuoteSlide** (line 248-287): §6-F와 동일 — `slide.text.en`/`slide.text.ko` 각각 따옴표.

> 모바일은 정보 슬라이드 타이틀·subtitle·prize도 데스크톱과 동일하게 병기·골드톤 처리한다. 해당 렌더 위치(MobileProjectWall 내 정보 표시부)를 찾아 §6-A/6-B 패턴 적용.

---

## 9. 마이그레이션 — 기존 30개 프로젝트 title 데이터 이전

스키마에서 `title`(string)+`titleKr`(string) → `title.{en,ko}`로 바뀌면, **기존 Sanity 문서의 데이터 구조도 이전**해야 한다. 두 경로:

**경로 A (권장) — 일회성 스크립트.** `scripts/migrate-title.ts`:
```ts
// 각 project 문서에서 title(string), titleKr(string)을 읽어
// title = { en: <기존 title>, ko: <기존 titleKr> }로 patch, titleKr unset
// (status 마이그레이션 때와 동일하게 write token 필요)
```

**경로 B — Studio 수작업.** 30개를 직접 다시 입력. status 갱신 전례가 있으나 title은 en/ko 2필드라 부담이 크다 → 경로 A 권장.

> subtitle·caption·label·description·body·quote.text는 기존 데이터가 대부분 비어 있거나 신규이므로 마이그레이션 대상이 아니다. **title만** 마이그레이션한다.

> 스크립트 실행은 사용자가 write token으로 수행. 스크립트 생성까지가 이 명세 범위.

---

## 10. 금지 사항 (forbidden changes)

- **useRingWall.ts 물리 코어 절대 수정 금지.** i18n은 렌더 계층 작업이다.
- **TEXT_SLIDE_W / QUOTE_SLIDE_W / INFO_SLIDE_W 상수 변경 금지.** rects·모프·카운터가 참조한다. 여백은 padding으로만.
- **모프 로직(morphRect·morphVisible·MORPH_* 상수) 변경 금지.** title 오브젝트화는 `.en` 참조 수정으로만 대응.
- **셔플·필터·트랙 스크롤 로직 변경 금지.**
- **coverColor 폴백, aspectRatio 예약, hotspot 크롭 로직 변경 금지.**

---

## 11. 검증 절차 (tsc 진단 기법)

구현 후 반드시 이 순서로 검증한다. **`npm run dev`·`npm run build`는 검증 수단이 아니다. `npx tsc --noEmit`만 사용한다.**

1. **먼저 타입 정의(§2, §4-B)를 바꾸고 `npx tsc --noEmit` 실행.** `title`/`caption`/`label`/`description`/`body`/`text`가 오브젝트가 되면서, 이들을 문자열로 쓰는 **모든 잔존 참조가 컴파일 오류로 드러난다.** 이 오류 목록이 곧 수정해야 할 전체 지점이다 — 누락 방지의 핵심 장치.
2. 오류가 가리키는 각 지점을 §6~§8에 따라 수정.
3. `titleKr`을 타입·쿼리에서 완전 삭제한 뒤 다시 `npx tsc --noEmit` — `titleKr` 잔존 참조가 오류로 드러나면 제거.
4. 최종 `npx tsc --noEmit` 무오류 확인.

> 이 순서(타입 먼저 변경 → tsc로 참조 지점 전수 발견 → 수정)를 반드시 지킨다. 렌더러부터 고치면 놓친 지점이 런타임까지 살아남는다.

---

## 12. 구현 체크리스트

- [ ] `localeTypes.ts` 신설 (localeString/localeText/localePortableText)
- [ ] `schemaTypes/index.ts`에 3종 등록 (최상단)
- [ ] `types/index.ts`에 LocaleString/LocaleText/LocalePortableText 인터페이스 추가
- [ ] `project.ts`: title 통합, subtitle 신설, result required 해제, slug source 함수화, preview.select 수정
- [ ] `slides.ts`: caption/label/description/body/text 타입 전환, 각 preview 경로 수정
- [ ] `queries.ts`: GROQ에서 titleKr 제거·subtitle 추가·로케일 필드 오브젝트 조회, RawProject·정규화 수정
- [ ] `types/index.ts`: Project·ImageSlide·DiagramItem·TextSlide·QuoteSlide 필드 타입 전환, titleKr 삭제
- [ ] `bilingual.tsx` 신설 (BilingualText)
- [ ] `ContentArea.tsx`: 타이틀·subtitle 병기(§6-A), prize(§6-B), 캡션(§6-C), 다이어그램(§6-D), 본문(§6-E), 인용(§6-F), 여백(§6-G)
- [ ] `ProjectWall.tsx`: 카드 title.en, alt.en (§7)
- [ ] `MobileProjectWall.tsx`: 전 슬라이드 렌더러 병기, 모프 title.en, 정보부 병기·골드톤 (§8)
- [ ] `scripts/migrate-title.ts` 신설 (§9)
- [ ] tsc 진단 절차(§11) 통과

---

## 실행 프롬프트 (Claude Code)

```
I18N_BILINGUAL_SPEC_260716.md 파일을 읽고 명세대로 구현해줘. §10 금지 사항(useRingWall 물리 코어·모프 로직·슬라이드 폭 상수 변경 금지)을 반드시 지키고, §11 검증 절차대로 타입 정의를 먼저 바꾼 뒤 npx tsc --noEmit로 잔존 참조를 전부 드러내서 수정해줘. npm run dev/build는 쓰지 마.
```
