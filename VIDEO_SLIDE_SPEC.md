# VIDEO SLIDE (YouTube 임베드) 신설 명세 (260722-C)

프로젝트 상세 슬라이드에 YouTube 영상 슬라이드를 추가한다. 자체 호스팅 없음, YouTube 임베드 단일. 자동재생 없음(클릭 재생).

## 0. 범위와 제약

**수정 대상 파일 (이외 파일 수정 금지)**

- `sanity/schemaTypes/slides.ts` (videoSlide 타입 추가)
- `sanity/schemaTypes/project.ts` (slides 배열에 videoSlide 등록)
- `src/types/index.ts` (VideoSlide 인터페이스 + union 확장)
- `src/lib/sanity/queries.ts` (GROQ 분기 + normalizeSlide case)
- `src/components/ContentArea.tsx` (SlideContent case + 렌더 컴포넌트 + 폭 상수)
- `src/components/MobileProjectWall.tsx` (MobileSlide case + 렌더 컴포넌트)

**금지 사항**

- `LandingExperience.tsx`, `ProjectWall.tsx`, `SiteHeader.tsx`, `useRingWall.ts` 수정 금지.
- 기존 슬라이드 5종(image/diagramSet/credits/text/quote)의 렌더·폭·로직 변경 금지. **순수 추가만.**
- `INFO_SLIDE_W`, `TEXT_SLIDE_W`, `QUOTE_SLIDE_W`, `CREDITS_SLIDE_W` 등 기존 폭 상수 변경 금지.
- 자동재생 금지. iframe에 `autoplay=1`을 넣지 않는다.
- `npm run dev`, `npm run build` 실행 금지. 검증은 `npx tsc --noEmit`만.

## 0-1. exhaustive switch 3지점 (전부 수정 필요)

`ProjectSlide` union에 멤버를 추가하면 다음 3곳의 switch가 `tsc`에서 미처리 case로 드러난다. **셋 다 수정해야 컴파일된다.** 이것이 누락 방지 장치다.

1. `queries.ts` — `normalizeSlide`
2. `ContentArea.tsx` L475 — `SlideContent`
3. `MobileProjectWall.tsx` L498 — `MobileSlide`

---

## 1. `src/types/index.ts` — VideoSlide 추가

### 조치 1-A — 인터페이스 신설

기존 `QuoteSlide` 인터페이스 **바로 아래**에 추가한다.

```ts
export interface VideoSlide {
  kind: 'video'
  /** YouTube 영상 ID (URL 아님). 예: dQw4w9WgXcQ */
  youtubeId: string
  /** BIG 형식 캡션: "LABEL — description". 없으면 미표시 */
  caption?: LocaleString
}
```

### 조치 1-B — union 확장

```ts
export type ProjectSlide = ImageSlide | DiagramSetSlide | CreditsSlide | TextSlide | QuoteSlide | VideoSlide
```

기존 union 끝에 `| VideoSlide`를 추가한다.

---

## 2. `sanity/schemaTypes/slides.ts` — videoSlide 타입

### 조치 2-A — 파일 최하단에 추가

```ts
/** 영상 슬라이드 — YouTube 임베드. 자체 호스팅 없음 */
export const videoSlide = defineType({
  name: 'videoSlide',
  title: '영상 (YouTube)',
  type: 'object',
  fields: [
    defineField({
      name: 'youtubeId',
      title: 'YouTube 영상 ID',
      type: 'string',
      description: 'URL이 아니라 ID만 입력. youtube.com/watch?v=XXXX 의 XXXX 부분, 또는 youtu.be/XXXX 의 XXXX. 예: dQw4w9WgXcQ',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'caption',
      title: '캡션',
      type: 'localeString',
      description: '형식: LABEL — description (이미지 슬라이드와 동일)',
    }),
  ],
  preview: {
    select: { youtubeId: 'youtubeId', caption: 'caption' },
    prepare({ youtubeId, caption }) {
      const cap = (caption as { en?: string } | undefined)?.en
      return { title: cap ?? '영상', subtitle: `YouTube: ${youtubeId ?? '(ID 없음)'}` }
    },
  },
})
```

`defineType`·`defineField`는 파일 상단에서 이미 import되어 있다.

---

## 3. `sanity/schemaTypes/project.ts` — slides 배열 등록

### 조치 3-A — slides의 of 배열에 추가

```ts
defineField({
  name: 'slides',
  title: 'SLIDES',
  type: 'array',
  of: [
    defineArrayMember({ type: 'imageSlide' }),
    defineArrayMember({ type: 'diagramSetSlide' }),
    defineArrayMember({ type: 'creditsSlide' }),
    defineArrayMember({ type: 'textSlide' }),
    defineArrayMember({ type: 'quoteSlide' }),
    defineArrayMember({ type: 'videoSlide' }),
  ],
}),
```

기존 5개 뒤에 `videoSlide` 한 줄을 추가한다.

### 조치 3-B — schema index 등록 확인

`sanity/schemaTypes/index.ts`에서 slides 관련 import에 `videoSlide`를 추가하고 `schemaTypes` 배열에 넣는다.

```ts
import { imageSlide, diagramSetSlide, creditsSlide, textSlide, quoteSlide, videoSlide } from './slides'
```

`schemaTypes` 배열의 슬라이드 나열 부분에 `videoSlide`를 추가한다.

---

## 4. `src/lib/sanity/queries.ts` — GROQ + normalize

### 조치 4-A — PROJECTS_QUERY의 slides 분기에 추가

기존 slides 프로젝션의 quoteSlide 분기 **뒤에** 추가한다.

```groq
_type == "videoSlide" => {
  "kind": "video",
  youtubeId, caption
},
```

### 조치 4-B — normalizeSlide에 case 추가

`normalizeSlide`의 switch에 case를 추가한다.

```ts
case 'video':
  return {
    kind: 'video',
    youtubeId: slide.youtubeId,
    caption: slide.caption ?? undefined,
  }
```

---

## 5. `src/components/ContentArea.tsx` — 데스크톱 렌더

### 조치 5-A — 폭 상수 신설

기존 폭 상수 근처(`QUOTE_SLIDE_W` 아래)에 추가한다.

```ts
const VIDEO_SLIDE_W = 640    // 영상 — 16:9. 높이는 트랙 slideH, 폭은 이 상수로 고정하지 않고 ratio로 산출 (아래 참조)
```

**주의**: 영상은 16:9 고정 종횡비다. 트랙에서 다른 이미지 슬라이드처럼 **높이(slideH)에 종횡비를 곱해 폭을 정한다.** 따라서 `VIDEO_SLIDE_W`는 텍스트/인용 슬라이드처럼 고정 폭으로 쓰지 않는다. 대신 조치 5-C의 폭 배열에서 `ratio * slideH` 방식을 쓴다(16:9 = 1.778).

`VIDEO_SLIDE_W` 상수는 실제로는 사용하지 않으므로 **추가하지 않는다.** 위 설명은 왜 고정 폭이 아닌지에 대한 근거다. 폭 산출은 5-C를 따른다.

### 조치 5-B — SlideContent switch에 case 추가

L475 switch에 추가한다.

```ts
case 'video':
  return <VideoSlideView slide={slide} />
```

### 조치 5-C — 폭 배열(widths)에 분기 추가

L554~562의 widths 계산에 video 분기를 추가한다. 영상은 16:9이므로 높이 기준으로 폭을 산출한다.

```ts
if (slide.kind === 'credits') widths.push(CREDITS_SLIDE_W)
else if (slide.kind === 'text') widths.push(TEXT_SLIDE_W)
else if (slide.kind === 'quote') widths.push(QUOTE_SLIDE_W)
else if (slide.kind === 'video') widths.push((16 / 9) * slideH)
else if (isDiagram(slide)) widths.push(ratio * diagramH)
else widths.push(ratio * slideH)
```

`video` 분기를 `quote` 뒤, `isDiagram` 앞에 넣는다.

### 조치 5-D — VideoSlideView 컴포넌트 신설

`QuoteSlideView` 함수 아래에 추가한다.

```tsx
// ── 영상: YouTube 임베드. 16:9, 높이 100% 기준. 자동재생 없음 ──
function VideoSlideView({ slide }: { slide: VideoSlide }) {
  const src = `https://www.youtube-nocookie.com/embed/${slide.youtubeId}?rel=0&modestbranding=1`
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
      </div>
      {slide.caption && <SlideCaption caption={slide.caption} />}
    </div>
  )
}
```

**캡션 렌더**: 기존 이미지 슬라이드가 캡션을 어떻게 렌더하는지 확인하고 동일 컴포넌트/함수를 재사용한다. 위 코드의 `<SlideCaption>`은 **가정된 이름이다.** 실제로는 `ImageSlideView`가 쓰는 캡션 렌더 방식(별도 컴포넌트가 있으면 그것, 인라인이면 그 JSX를 복제)을 그대로 사용한다. 이미지 캡션과 영상 캡션은 동일 형식이어야 한다. 구현 시 `ImageSlideView`를 열어 캡션 처리부를 확인하고 맞춘다.

### 조치 5-E — import 추가

`ContentArea.tsx` 상단 타입 import에 `VideoSlide`를 추가한다.

```ts
import type { ..., QuoteSlide, VideoSlide } from '@/types'
```

---

## 6. `src/components/MobileProjectWall.tsx` — 모바일 렌더

### 조치 6-A — MobileSlide switch에 case 추가

L498 switch에 추가한다.

```ts
case 'video':
  return <MobileVideoSlide slide={slide} />
```

### 조치 6-B — MobileVideoSlide 컴포넌트 신설

`MobileQuoteSlide` 아래에 추가한다. 모바일은 폭 100%, 16:9로 높이 예약(레이아웃 시프트 방지 — 기존 MobileImageSlide 패턴).

```tsx
// ── 모바일 영상 — 폭 100%, 16:9 예약. 자동재생 없음 ──
function MobileVideoSlide({ slide }: { slide: VideoSlide }) {
  const src = `https://www.youtube-nocookie.com/embed/${slide.youtubeId}?rel=0&modestbranding=1`
  return (
    <div style={{ width: '100%' }}>
      <div style={{ width: '100%', aspectRatio: '16 / 9', position: 'relative', background: '#000' }}>
        <iframe
          src={src}
          title={slide.caption?.en ?? 'Project video'}
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
        />
      </div>
      {/* 캡션 — 기존 MobileImageSlide의 캡션 렌더 방식과 동일하게 맞춘다 */}
    </div>
  )
}
```

**캡션**: `MobileImageSlide`가 캡션을 렌더하는지 확인한다. 렌더한다면 동일 방식을 이 컴포넌트에도 적용한다. `MobileImageSlide` 코드상 캡션 처리가 없다면(현재 L119~ 확인 필요) 영상도 캡션 생략으로 통일한다. **이미지와 영상의 캡션 유무를 일치시킨다.**

### 조치 6-C — import 추가

`MobileProjectWall.tsx` 상단 타입 import에 `VideoSlide`를 추가한다.

---

## 7. 검증

```
npx tsc --noEmit
```

**핵심 확인**: union에 `VideoSlide`를 추가하면 3곳 switch가 미처리 case 오류를 낸다. 셋 다 case를 추가해야 오류가 사라진다. 오류가 남아 있으면 어느 switch를 빠뜨린 것이다.

`npm run dev`·`npm run build`는 실행하지 않는다.

---

## 8. 실행 후 확인 (Claude Code 범위 밖)

**먼저 Studio 입력이 필요하다.** 영상 슬라이드가 아직 없으므로 화면에 나타나지 않는다. Cloud Tectonic 프로젝트에 videoSlide를 추가하고 youtubeId를 입력해야 한다(창현 님 작업).

배포·입력 후:

1. 데스크톱 트랙에서 영상 슬라이드가 16:9로 표시되고, 다른 슬라이드와 높이가 정렬되는가.
2. 재생 버튼 클릭 시 재생되는가. 자동재생되지 않는가(자동재생되면 URL에 autoplay가 들어간 것).
3. 영상 캡션이 이미지 캡션과 같은 형식·위치인가.
4. 모바일 세로 스택에서 영상이 16:9로 폭 100% 표시되는가. 로드 전 높이가 예약되어 레이아웃 시프트가 없는가.
5. 트랙 좌우 스크롤 시 영상 iframe이 스크롤을 방해하지 않는가(iframe 위에서 드래그가 먹히는지).
6. `youtube-nocookie` 도메인이 정상 재생되는가.

**항목 5 주의**: iframe은 포인터 이벤트를 가로챈다. 데스크톱 트랙이 드래그 스크롤이라면, 영상 위에서 드래그가 iframe에 먹혀 트랙이 안 움직일 수 있다. 문제가 되면 재생 전 iframe 위에 투명 오버레이를 두고 클릭 시 제거하는 방식이 필요하나, 이는 별도 명세로 다룬다. 우선 기본 구현 후 실제 동작을 확인한다.
