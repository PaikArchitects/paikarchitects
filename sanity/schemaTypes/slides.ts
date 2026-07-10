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
      type: 'string',
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
      return { media, title: caption ?? '(캡션 없음)' }
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
              type: 'string',
              description: '대문자, 예: MASS 01',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'description',
              title: '한 줄 설명',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: {
            select: { media: 'image', title: 'label', subtitle: 'description' },
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
    select: { firstLabel: 'items.0.label' },
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

/** 인용구 — 신설. 이번 단계에서는 스키마에만 존재 (프론트 렌더러는 4단계) */
export const quoteSlide = defineType({
  name: 'quoteSlide',
  title: '인용구',
  type: 'object',
  fields: [
    defineField({
      name: 'text',
      title: '인용문',
      type: 'text',
      rows: 3,
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
      return {
        title: typeof text === 'string' ? text.slice(0, 40) : '(인용문 없음)',
        subtitle: attribution,
      }
    },
  },
})
