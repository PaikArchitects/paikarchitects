import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'essay',
  title: 'ESSAY',
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
      name: 'title',
      title: 'TITLE',
      type: 'localeString',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'SLUG',
      type: 'slug',
      description: '게재 후 변경 금지 (URL)',
      options: {
        source: (doc) => (doc as { title?: { en?: string } }).title?.en ?? '',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'publishedAt',
      title: 'PUBLISHED AT',
      type: 'date',
      validation: (Rule) => Rule.required(),
    }),
    defineField({ name: 'excerpt', title: 'EXCERPT', type: 'localeText' }),
    defineField({ name: 'body', title: 'BODY', type: 'localePortableText' }),
  ],
  preview: {
    select: { title: 'title.en', subtitle: 'publishedAt' },
  },
})
