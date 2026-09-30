import { defineField, defineType } from 'sanity'

/** 단일 행 병기 문자열 — 타이틀·서브타이틀·캡션·라벨·인용문 */
export const localeString = defineType({
  name: 'localeString',
  title: '다국어 문자열',
  type: 'object',
  options: { columns: 2 },
  fields: [
    defineField({ name: 'en', title: 'EN', type: 'string', validation: (R) => R.required() }),
    defineField({ name: 'ko', title: 'KO', type: 'string' }),
  ],
})

/** 여러 줄 병기 텍스트 (서식 없음) — 다이어그램 설명 */
export const localeText = defineType({
  name: 'localeText',
  title: '다국어 텍스트',
  type: 'object',
  options: { columns: 2 },
  fields: [
    defineField({ name: 'en', title: 'EN', type: 'text', rows: 3, validation: (R) => R.required() }),
    defineField({ name: 'ko', title: 'KO', type: 'text', rows: 3 }),
  ],
})

/** 다문단 병기 서식 텍스트 (strong·em만) — 본문 서술·About */
export const localePortableText = defineType({
  name: 'localePortableText',
  title: '다국어 서식 텍스트',
  type: 'object',
  options: { columns: 2 },
  fields: [
    defineField({
      name: 'en',
      title: 'EN',
      type: 'array',
      of: [{
        type: 'block',
        styles: [{ title: '본문', value: 'normal' }],
        lists: [],
        marks: {
          decorators: [{ title: '강조', value: 'strong' }, { title: '기울임', value: 'em' }],
          annotations: [],
        },
      }],
      validation: (R) => R.required().min(1),
    }),
    defineField({
      name: 'ko',
      title: 'KO',
      type: 'array',
      of: [{
        type: 'block',
        styles: [{ title: '본문', value: 'normal' }],
        lists: [],
        marks: {
          decorators: [{ title: '강조', value: 'strong' }, { title: '기울임', value: 'em' }],
          annotations: [],
        },
      }],
    }),
  ],
})
