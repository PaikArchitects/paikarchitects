import { defineArrayMember, defineField, defineType } from 'sanity'
import { TYPOLOGY_ORDER } from '../../src/types'

const TYPE_OPTIONS = TYPOLOGY_ORDER.map((t) => ({ title: t, value: t }))

const STATUS_OPTIONS = [
  'Idea',
  'In progress',
  'Under construction',
  'Completed',
  'Published',
].map((s) => ({ title: s, value: s }))

export default defineType({
  name: 'project',
  title: '프로젝트',
  type: 'document',
  fieldsets: [
    { name: 'display', title: '사이트 노출 항목', options: { collapsible: false } },
    { name: 'admin', title: '관리 항목', options: { collapsible: true, collapsed: true } },
  ],
  fields: [
    // ───── 노출 필드군 — 사이트 표시 순서 ─────
    defineField({
      name: 'title',
      title: 'TITLE',
      type: 'localeString',
      fieldset: 'display',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'subtitle',
      title: 'SUBTITLE',
      type: 'localeString',
      fieldset: 'display',
      description: '프로젝트의 목적을 요약하는 한 줄. 타이틀 아래 표시된다',
    }),
    defineField({
      name: 'awards',
      title: 'AWARDS',
      type: 'array',
      fieldset: 'display',
      description: '수상 내역. 개수 제한 없음. 체크 해제 시 사이트에 노출되지 않는다',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'award',
          title: '수상',
          fields: [
            defineField({
              name: 'title',
              title: '수상명',
              type: 'string',
              description: '최종 표기 그대로 입력 (렌더러는 가공하지 않는다). 예: Competition Winner / 2nd Prize / Grand Prize, 2020 Korea Remodeling Architecture Competition',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'visible',
              title: '노출',
              type: 'boolean',
              description: '체크 시 사이트에 표시',
              initialValue: true,
            }),
          ],
          preview: {
            select: { title: 'title', visible: 'visible' },
            prepare({ title, visible }) {
              return { title, subtitle: visible === false ? '숨김' : '노출' }
            },
          },
        }),
      ],
    }),
    defineField({
      name: 'client',
      title: 'CLIENT',
      type: 'string',
      fieldset: 'display',
    }),
    defineField({
      name: 'location',
      title: 'LOCATION',
      type: 'string',
      fieldset: 'display',
      description: '예: Seoul, KR',
    }),
    defineField({
      name: 'mainType',
      title: 'TYPOLOGY',
      type: 'string',
      fieldset: 'display',
      description: '카드·메타에 노출되는 유일한 라벨',
      options: { list: TYPE_OPTIONS, layout: 'dropdown' },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'size',
      title: 'SIZE',
      type: 'string',
      fieldset: 'display',
      description: '단위를 포함해 입력한다. 면적: "22,333.78 ㎡" / 영상: "5 min." / 판형: "A2". 라벨(AREA·LENGTH·SIZE)은 값에서 자동 파생되므로 별도 지정하지 않는다.',
    }),
    defineField({
      name: 'status',
      title: 'STATUS',
      type: 'string',
      fieldset: 'display',
      options: { list: STATUS_OPTIONS },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'year',
      title: 'YEAR',
      type: 'number',
      fieldset: 'display',
      description: '설계 시작 연도',
      validation: (Rule) => Rule.required().integer().min(2000).max(2100),
    }),
    defineField({
      name: 'role',
      title: 'ROLE',
      type: 'string',
      fieldset: 'display',
      description: 'Career 엑셀 Role 열 원문. 형식: 직위 (담당업무1, 담당업무2, ...) — 예: Senior Architect (Concept design, 3d modeling, Visual documentation)',
    }),

    // ───── 관리 필드군 — 미노출 ─────
    defineField({
      name: 'subTypes',
      title: 'TYPOLOGY (SUB)',
      type: 'array',
      fieldset: 'admin',
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
      name: 'slug',
      title: 'SLUG',
      type: 'slug',
      fieldset: 'admin',
      description: '기존 게재 프로젝트의 슬러그는 SEO상 변경 금지',
      options: {
        source: (doc) => (doc as { title?: { en?: string } }).title?.en ?? '',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'careerNo',
      title: 'CAREER NO.',
      type: 'number',
      fieldset: 'admin',
      description: "Career 엑셀 '프로젝트 연번' 기준",
      validation: (Rule) => Rule.required().integer().positive(),
    }),
    defineField({
      name: 'displayOrder',
      title: 'DISPLAY ORDER',
      type: 'number',
      fieldset: 'admin',
      validation: (Rule) => Rule.required().integer().positive(),
    }),
    defineField({
      name: 'featured',
      title: 'FEATURED',
      type: 'boolean',
      fieldset: 'admin',
      initialValue: false,
    }),
    defineField({
      name: 'coverImage',
      title: 'COVER IMAGE',
      type: 'image',
      fieldset: 'admin',
      options: { hotspot: true },
    }),
    defineField({
      name: 'coverColor',
      title: 'COVER COLOR',
      type: 'string',
      fieldset: 'admin',
      validation: (Rule) =>
        Rule.required().custom((value) => {
          if (value == null) return true
          if (typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value)) return true
          return '＃ 포함 6자리 HEX 색상으로 입력 (예: #1E1C18)'
        }),
    }),

    // ───── 슬라이드 ─────
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
      ],
    }),
  ],
  preview: {
    select: { title: 'title.en', subtitle: 'title.ko', media: 'coverImage' },
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
