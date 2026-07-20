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
  fields: [
    defineField({
      name: 'published',
      title: 'PUBLISHED',
      type: 'boolean',
      description: '체크 해제 시 사이트에 표시되지 않는다 (Studio에는 남는다)',
      initialValue: true,
    }),
    defineField({
      name: 'careerNo',
      title: 'CAREER NO.',
      type: 'number',
      description: "Career 엑셀 '프로젝트 연번' 기준 — 사이트 정렬 기준(내림차순) 및 표시 코드",
      validation: (Rule) => Rule.required().integer().positive(),
    }),
    defineField({
      name: 'title',
      title: 'TITLE',
      type: 'localeString',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'subtitle',
      title: 'SUBTITLE',
      type: 'localeString',
      description: '프로젝트의 목적을 요약하는 한 줄. 타이틀 아래 표시된다',
    }),
    defineField({
      name: 'awards',
      title: 'AWARDS',
      type: 'array',
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
    }),
    defineField({
      name: 'location',
      title: 'LOCATION',
      type: 'string',
      description: '예: Seoul, KR',
    }),
    defineField({
      name: 'mainType',
      title: 'TYPOLOGY',
      type: 'string',
      description: '카드·메타에 노출되는 유일한 라벨',
      options: { list: TYPE_OPTIONS, layout: 'dropdown' },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'subTypes',
      title: 'TYPOLOGY (SUB)',
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
      name: 'size',
      title: 'SIZE',
      type: 'string',
      description: '숫자만 입력하면 ㎡가 자동으로 붙는다 (예: "14,296.89"). 면적이 아닌 경우 단위를 포함해 입력한다 — 영상: "5 min." / 판형: "A2". 라벨(AREA·LENGTH·SIZE)은 값에서 자동 파생된다.',
    }),
    defineField({
      name: 'status',
      title: 'STATUS',
      type: 'string',
      options: { list: STATUS_OPTIONS },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'year',
      title: 'YEAR',
      type: 'number',
      description: '설계 시작 연도',
      validation: (Rule) => Rule.required().integer().min(2000).max(2100),
    }),
    defineField({
      name: 'role',
      title: 'ROLE',
      type: 'string',
      description: 'Career 엑셀 Role 열 원문. 형식: 직위 (담당업무1, 담당업무2, ...) — 예: Senior Architect (Concept design, 3d modeling, Visual documentation)',
    }),
    defineField({
      name: 'coverImage',
      title: 'COVER IMAGE',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'coverColor',
      title: 'COVER COLOR',
      type: 'string',
      initialValue: '#1E1C18',
      validation: (Rule) =>
        Rule.custom((value) => {
          if (value == null) return true
          if (typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value)) return true
          return '＃ 포함 6자리 HEX 색상으로 입력 (예: #1E1C18)'
        }),
    }),
    defineField({
      name: 'featured',
      title: 'FEATURED',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'slug',
      title: 'SLUG',
      type: 'slug',
      description: '기존 게재 프로젝트의 슬러그는 SEO상 변경 금지',
      options: {
        source: (doc) => (doc as { title?: { en?: string } }).title?.en ?? '',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
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
      title: '연번 (최신순)',
      name: 'careerNoDesc',
      by: [{ field: 'careerNo', direction: 'desc' }],
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
