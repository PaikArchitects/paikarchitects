import { defineArrayMember, defineField, defineType } from 'sanity'

/** 이미지 슬라이드 — 현행 ImageSlide 1:1 승계 */
export const imageSlide = defineType({
  name: 'imageSlide',
  title: '이미지 슬라이드',
  type: 'object',
  fields: [
    defineField({
      name: 'image',
      title: '이미지',
      type: 'image',
      options: { hotspot: true },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'caption',
      title: '캡션',
      type: 'localeString',
      description: '형식: LABEL — description (예: SECTION — Public spine through the building)',
    }),
    defineField({
      name: 'diagram',
      title: '다이어그램 취급',
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
  title: '다이어그램 묶음 (자동 넘김)',
  type: 'object',
  fields: [
    defineField({
      name: 'items',
      title: '다이어그램 항목',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'diagramItem',
          title: '다이어그램 항목',
          fields: [
            defineField({
              name: 'image',
              title: '이미지',
              type: 'image',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'label',
              title: '라벨',
              type: 'localeString',
              description: '예: Site Conditions',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'description',
              title: '설명',
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
      title: '자동 넘김 간격 (ms)',
      type: 'number',
      initialValue: 3000,
    }),
  ],
  preview: {
    select: { firstLabel: 'items.0.label.en' },
    prepare({ firstLabel }) {
      return { title: '다이어그램 묶음', subtitle: firstLabel }
    },
  },
})

/** 크레딧 — 현행 CreditsSlide 1:1 승계 */
export const creditsSlide = defineType({
  name: 'creditsSlide',
  title: '크레딧',
  type: 'object',
  fields: [
    defineField({
      name: 'rows',
      title: '크레딧 행',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'creditRow',
          title: '크레딧 행',
          fields: [
            defineField({
              name: 'label',
              title: '라벨',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'value',
              title: '내용',
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
      return { title: '크레딧' }
    },
  },
})

/** 서술문 — 좌정렬 본문. 프로젝트 설명 텍스트 */
export const textSlide = defineType({
  name: 'textSlide',
  title: '본문 텍스트',
  type: 'object',
  fields: [
    defineField({
      name: 'body',
      title: '본문',
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
        subtitle: '본문 텍스트',
      }
    },
  },
})

/** 인용구 — 중앙정렬, 따옴표, 출처 병기 */
export const quoteSlide = defineType({
  name: 'quoteSlide',
  title: '인용구',
  type: 'object',
  fields: [
    defineField({
      name: 'text',
      title: '인용문',
      type: 'localeString',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'attribution',
      title: '출처',
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
