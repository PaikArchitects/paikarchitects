import { defineArrayMember, defineField, defineType } from 'sanity'

/** 이미지 슬라이드 — 현행 ImageSlide 1:1 승계 */
export const imageSlide = defineType({
  name: 'imageSlide',
  title: 'IMAGE',
  type: 'object',
  fields: [
    defineField({
      name: 'image',
      title: 'IMAGE',
      type: 'image',
      options: { hotspot: true },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'caption',
      title: 'CAPTION',
      type: 'localeString',
      description: '형식: LABEL — description (예: SECTION — Public spine through the building)',
    }),
    defineField({
      name: 'diagram',
      title: 'DIAGRAM',
      type: 'boolean',
      description: '체크 시 트랙에서 48% 높이로 표시',
      initialValue: false,
    }),
  ],
  preview: {
    select: { media: 'image', caption: 'caption' },
    prepare({ media, caption }) {
      return { media, title: (caption as { en?: string } | undefined)?.en ?? '(캡션 없음)' }
    },
  },
})

/** 다이어그램 묶음 — 현행 DiagramSetSlide 1:1 승계 */
export const diagramSetSlide = defineType({
  name: 'diagramSetSlide',
  title: 'DIAGRAM SET (AUTO)',
  type: 'object',
  fields: [
    defineField({
      name: 'items',
      title: 'ITEMS',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'diagramItem',
          title: 'DIAGRAM ITEM',
          fields: [
            defineField({
              name: 'image',
              title: 'IMAGE',
              type: 'image',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'label',
              title: 'LABEL',
              type: 'localeString',
              description: '예: Site Conditions',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'description',
              title: 'DESCRIPTION',
              type: 'localeText',
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: {
            select: { media: 'image', title: 'label.en', subtitle: 'description.en' },
          },
        }),
      ],
      validation: (Rule) => Rule.required().min(2),
    }),
    defineField({
      name: 'autoAdvanceMs',
      title: 'AUTO-ADVANCE (MS)',
      type: 'number',
      initialValue: 3000,
    }),
  ],
  preview: {
    select: { firstLabel: 'items.0.label.en' },
    prepare({ firstLabel }) {
      return { title: 'DIAGRAM SET', subtitle: firstLabel }
    },
  },
})

/** 크레딧 — 현행 CreditsSlide 1:1 승계 */
export const creditsSlide = defineType({
  name: 'creditsSlide',
  title: 'CREDITS',
  type: 'object',
  fields: [
    defineField({
      name: 'rows',
      title: 'ROWS',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'creditRow',
          title: 'CREDIT ROW',
          fields: [
            defineField({
              name: 'label',
              title: 'LABEL',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'value',
              title: 'VALUE',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: {
            select: { title: 'label', subtitle: 'value' },
          },
        }),
      ],
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    prepare() {
      return { title: 'CREDITS' }
    },
  },
})

/** 서술문 — 좌정렬 본문. 프로젝트 설명 텍스트 */
export const textSlide = defineType({
  name: 'textSlide',
  title: 'TEXT',
  type: 'object',
  fields: [
    defineField({
      name: 'body',
      title: 'BODY',
      type: 'localePortableText',
      description: '문단 단위로 입력. 줄바꿈이 아니라 문단(Enter)으로 나눈다',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: { body: 'body.en' },
    prepare({ body }) {
      const first = Array.isArray(body) ? body[0] : undefined
      const text = first?.children?.map((c: { text?: string }) => c.text ?? '').join('') ?? ''
      return {
        title: text ? text.slice(0, 50) : '(본문 없음)',
        subtitle: 'TEXT',
      }
    },
  },
})

/** 인용구 — 중앙정렬, 따옴표, 출처 병기 */
export const quoteSlide = defineType({
  name: 'quoteSlide',
  title: 'QUOTE',
  type: 'object',
  fields: [
    defineField({
      name: 'text',
      title: 'TEXT',
      type: 'localeString',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'attribution',
      title: 'ATTRIBUTION',
      type: 'string',
      description: '예: 심사평, 매체명, 발화자',
    }),
  ],
  preview: {
    select: { text: 'text', attribution: 'attribution' },
    prepare({ text, attribution }) {
      const en = (text as { en?: string } | undefined)?.en
      return {
        title: en ? en.slice(0, 40) : '(인용문 없음)',
        subtitle: attribution,
      }
    },
  },
})

/** 영상 슬라이드 — YouTube 임베드. 자체 호스팅 없음 */
export const videoSlide = defineType({
  name: 'videoSlide',
  title: 'VIDEO (YOUTUBE)',
  type: 'object',
  fields: [
    defineField({
      name: 'youtubeId',
      title: 'YOUTUBE ID',
      type: 'string',
      description: 'URL이 아니라 ID만 입력. youtube.com/watch?v=XXXX 의 XXXX 부분, 또는 youtu.be/XXXX 의 XXXX. 예: dQw4w9WgXcQ',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'caption',
      title: 'CAPTION',
      type: 'localeString',
      description: '형식: LABEL — description (이미지 슬라이드와 동일)',
    }),
  ],
  preview: {
    select: { youtubeId: 'youtubeId', caption: 'caption' },
    prepare({ youtubeId, caption }) {
      const cap = (caption as { en?: string } | undefined)?.en
      return { title: cap ?? 'VIDEO', subtitle: `YouTube: ${youtubeId ?? '(ID 없음)'}` }
    },
  },
})
