import { defineType, defineField } from 'sanity'
import { EnvelopeIcon } from '@sanity/icons/Envelope'

/** 연락처 싱글턴 — 고정 ID 'contact'. /contact 페이지와 /about 하단이 함께 참조하는 단일 원천 */
export default defineType({
  name: 'contact',
  title: 'CONTACT',
  icon: EnvelopeIcon,
  type: 'document',
  fields: [
    defineField({ name: 'email', title: 'EMAIL', type: 'string' }),
    defineField({ name: 'phone', title: 'PHONE', type: 'string' }),
    defineField({ name: 'location', title: 'LOCATION', type: 'string' }),
    defineField({
      name: 'instagram',
      title: 'INSTAGRAM',
      type: 'url',
      description: '형식: https://www.instagram.com/<handle>/',
    }),
  ],
  preview: {
    prepare: () => ({ title: 'CONTACT' }),
  },
})
