import { defineArrayMember, defineField, defineType } from 'sanity'
import { TYPOLOGY_ORDER } from '../../src/types'

const TYPE_OPTIONS = TYPOLOGY_ORDER.map((t) => ({ title: t, value: t }))

const STATUS_OPTIONS = [
  'Completed',
  'In Progress',
  'Competition',
  'Published',
  'Under Construction',
].map((s) => ({ title: s, value: s }))

export default defineType({
  name: 'project',
  title: '프로젝트',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: '프로젝트명 (EN)',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'titleKr',
      title: '프로젝트명 (KR)',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'URL 슬러그',
      type: 'slug',
      description: '기존 게재 프로젝트의 슬러그는 SEO상 변경 금지',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'careerNo',
      title: '프로젝트 연번',
      type: 'number',
      description: "Career 엑셀 '프로젝트 연번' 기준",
      validation: (Rule) => Rule.required().integer().positive(),
    }),
    defineField({
      name: 'year',
      title: '설계 시작 연도',
      type: 'number',
      validation: (Rule) => Rule.required().integer().min(2000).max(2100),
    }),
    defineField({
      name: 'mainType',
      title: '용도 (Main)',
      type: 'string',
      description: '카드·메타에 노출되는 유일한 라벨',
      options: { list: TYPE_OPTIONS, layout: 'dropdown' },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'subTypes',
      title: '용도 (Sub)',
      type: 'array',
      description: '필터 매칭 전용 — 화면에 표기되지 않음. 최대 2개',
      of: [defineArrayMember({ type: 'string' })],
      options: { list: TYPE_OPTIONS },
      validation: (Rule) =>
        Rule.max(2)
          .unique()
          .custom((subTypes, context) => {
            const mainType = (context.document as { mainType?: string } | undefined)?.mainType
            if (Array.isArray(subTypes) && mainType && subTypes.includes(mainType)) {
              return '용도 (Main)에서 선택한 값과 중복될 수 없습니다'
            }
            return true
          }),
    }),
    defineField({
      name: 'status',
      title: '상태',
      type: 'string',
      options: { list: STATUS_OPTIONS },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'result',
      title: '결과',
      type: 'string',
      description: '예: Winner, 2nd Prize, Honorable Mention',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'featured',
      title: 'Featured (2배 폭 카드)',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'displayOrder',
      title: '배치 순서',
      type: 'number',
      validation: (Rule) => Rule.required().integer().positive(),
    }),
    defineField({
      name: 'coverImage',
      title: '커버 이미지',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'coverColor',
      title: '커버 대체 색상',
      type: 'string',
      validation: (Rule) =>
        Rule.required().custom((value) => {
          if (value == null) return true
          if (typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value)) return true
          return '＃ 포함 6자리 HEX 색상으로 입력 (예: #1E1C18)'
        }),
    }),
    defineField({
      name: 'location',
      title: '위치',
      type: 'string',
      description: '예: Seoul, KR',
    }),
    defineField({
      name: 'client',
      title: '발주처 (CLIENT)',
      type: 'string',
    }),
    defineField({
      name: 'size',
      title: '규모 (SIZE)',
      type: 'string',
      description: '연면적 등 자유 서식. 예: 137,000㎡',
    }),
    defineField({
      name: 'slides',
      title: '슬라이드',
      type: 'array',
      of: [
        defineArrayMember({ type: 'imageSlide' }),
        defineArrayMember({ type: 'diagramSetSlide' }),
        defineArrayMember({ type: 'creditsSlide' }),
        defineArrayMember({ type: 'quoteSlide' }),
      ],
    }),
  ],
  preview: {
    select: { title: 'title', subtitle: 'titleKr', media: 'coverImage' },
  },
  orderings: [
    {
      title: '배치 순서',
      name: 'displayOrderAsc',
      by: [{ field: 'displayOrder', direction: 'asc' }],
    },
    {
      title: '연번',
      name: 'careerNoAsc',
      by: [{ field: 'careerNo', direction: 'asc' }],
    },
    {
      title: '연도',
      name: 'yearDesc',
      by: [{ field: 'year', direction: 'desc' }],
    },
  ],
})
