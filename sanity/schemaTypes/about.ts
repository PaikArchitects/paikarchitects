import { defineType, defineField, defineArrayMember } from 'sanity'

export default defineType({
  name: 'about',
  title: 'ABOUT',
  type: 'document',
  fields: [
    defineField({
      name: 'position',
      title: 'POSITION',
      type: 'localePortableText',
      description: '입장 서술. 문단 단위로 작성한다.',
    }),
    defineField({
      name: 'preoccupations',
      title: 'PREOCCUPATIONS',
      type: 'array',
      description: '반복적으로 되돌아가는 문제들. 순서대로 표시된다.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'preoccupation',
          fields: [
            defineField({ name: 'heading', title: 'HEADING', type: 'localeString' }),
            defineField({ name: 'body', title: 'BODY', type: 'localeText' }),
          ],
          preview: {
            select: { title: 'heading.en', subtitle: 'body.en' },
          },
        }),
      ],
    }),
    defineField({
      name: 'education',
      title: 'EDUCATION',
      type: 'array',
      of: [{ type: 'cvSimpleEntry' }],
    }),
    defineField({
      name: 'employment',
      title: 'EMPLOYMENT',
      type: 'array',
      description: '재직 이력. 각 재직처 아래에 프로젝트 목록이 붙는다.',
      of: [{ type: 'cvEmployment' }],
    }),
    defineField({
      name: 'awards',
      title: 'AWARDS',
      type: 'array',
      of: [{ type: 'cvRankedEntry' }],
    }),
    defineField({
      name: 'exhibitions',
      title: 'EXHIBITIONS AND PUBLICATIONS',
      type: 'array',
      of: [{ type: 'cvVenueEntry' }],
    }),
    defineField({
      name: 'contact',
      title: 'CONTACT',
      type: 'object',
      fields: [
        defineField({ name: 'location', title: 'LOCATION', type: 'string' }),
        defineField({ name: 'email', title: 'EMAIL', type: 'string' }),
        defineField({ name: 'phone', title: 'PHONE', type: 'string' }),
      ],
    }),
  ],
  preview: {
    prepare: () => ({ title: 'ABOUT' }),
  },
})

export const cvSimpleEntry = defineType({
  name: 'cvSimpleEntry',
  title: 'CV Simple Entry',
  type: 'object',
  fields: [
    defineField({ name: 'title', title: 'TITLE', type: 'string' }),
    defineField({ name: 'detail', title: 'DETAIL', type: 'string', description: '학위·전공 등 부제' }),
    defineField({ name: 'period', title: 'PERIOD', type: 'string', description: '예: 2005–2014' }),
  ],
  preview: { select: { title: 'title', subtitle: 'period' } },
})

export const cvProjectEntry = defineType({
  name: 'cvProjectEntry',
  title: 'CV Project Entry',
  type: 'object',
  fields: [
    defineField({ name: 'title', title: 'TITLE', type: 'string' }),
    defineField({ name: 'result', title: 'RESULT', type: 'string', description: '예: Winner, 2nd Prize' }),
    defineField({ name: 'year', title: 'YEAR', type: 'string' }),
  ],
  preview: { select: { title: 'title', subtitle: 'year' } },
})

export const cvEmployment = defineType({
  name: 'cvEmployment',
  title: 'CV Employment',
  type: 'object',
  fields: [
    defineField({ name: 'title', title: 'TITLE', type: 'string' }),
    defineField({ name: 'detail', title: 'DETAIL', type: 'string', description: '직위 범위 등' }),
    defineField({ name: 'period', title: 'PERIOD', type: 'string' }),
    defineField({
      name: 'projects',
      title: 'PROJECTS',
      type: 'array',
      of: [{ type: 'cvProjectEntry' }],
    }),
  ],
  preview: { select: { title: 'title', subtitle: 'period' } },
})

export const cvRankedEntry = defineType({
  name: 'cvRankedEntry',
  title: 'CV Ranked Entry',
  type: 'object',
  fields: [
    defineField({ name: 'title', title: 'TITLE', type: 'string' }),
    defineField({ name: 'result', title: 'RESULT', type: 'string' }),
    defineField({ name: 'year', title: 'YEAR', type: 'string' }),
  ],
  preview: { select: { title: 'title', subtitle: 'year' } },
})

export const cvVenueEntry = defineType({
  name: 'cvVenueEntry',
  title: 'CV Venue Entry',
  type: 'object',
  fields: [
    defineField({ name: 'title', title: 'TITLE', type: 'string' }),
    defineField({ name: 'venue', title: 'VENUE', type: 'string', description: '장소 또는 Published' }),
    defineField({ name: 'year', title: 'YEAR', type: 'string' }),
  ],
  preview: { select: { title: 'title', subtitle: 'venue' } },
})
