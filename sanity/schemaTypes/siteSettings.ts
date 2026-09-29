import { defineType, defineField } from 'sanity'

/** 사이트 설정 싱글턴 — 고정 ID 'siteSettings' */
export default defineType({
  name: 'siteSettings',
  title: 'SITE SETTINGS',
  type: 'document',
  fields: [
    defineField({
      name: 'landingMode',
      title: 'LANDING MODE',
      type: 'string',
      description: '첫 화면(/) 표시 모드. 저장 후 1분 내 반영',
      options: {
        list: [
          { title: 'Ring', value: 'ring' },
          { title: 'Grid', value: 'grid' },
          { title: 'Random — 방문마다 무작위', value: 'random' },
        ],
        layout: 'radio',
      },
      initialValue: 'ring',
    }),
  ],
  preview: {
    prepare: () => ({ title: 'SITE SETTINGS' }),
  },
})
