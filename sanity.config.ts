'use client'

import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { projectId, dataset } from './sanity/env'
import { schemaTypes } from './sanity/schemaTypes'
import { BarChartIcon } from '@sanity/icons/BarChart'
import AnalyticsTool from './sanity/AnalyticsTool'

// 싱글턴 — 고정 ID 문서 1개만 존재해야 한다. 신규 생성·복제·삭제 경로를 모두 막는다
const SINGLETON_TYPES = new Set(['siteSettings', 'about', 'contact'])

export default defineConfig({
  name: 'paikarchitects',
  title: 'Architect Chang-hyun Paik',
  projectId: projectId!,
  dataset,
  basePath: '/studio',
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            S.listItem()
              .title('SITE SETTINGS')
              .id('siteSettings')
              .child(
                S.document()
                  .schemaType('siteSettings')
                  .documentId('siteSettings')
                  .title('SITE SETTINGS')
              ),
            S.divider(),
            S.listItem()
              .title('ABOUT')
              .id('about')
              .child(
                S.document()
                  .schemaType('about')
                  .documentId('about')
                  .title('ABOUT')
              ),
            S.listItem()
              .title('CONTACT')
              .id('contact')
              .child(
                S.document()
                  .schemaType('contact')
                  .documentId('contact')
                  .title('CONTACT')
              ),
            S.divider(),
            S.listItem()
              .title('ESSAYS')
              .id('essays')
              .child(
                S.documentTypeList('essay')
                  .title('Essays')
                  .defaultOrdering([{ field: 'publishedAt', direction: 'desc' }])
              ),
            S.divider(),
            S.listItem()
              .title('PROJECTS — PUBLISHED')
              .id('projectsPublished')
              .child(
                S.documentList()
                  .title('Published Projects')
                  .filter('_type == "project" && published != false')
                  .defaultOrdering([{ field: 'careerNo', direction: 'desc' }])
              ),
            S.listItem()
              .title('PROJECTS — HIDDEN')
              .id('projectsHidden')
              .child(
                S.documentList()
                  .title('Hidden Projects')
                  .filter('_type == "project" && published == false')
                  .defaultOrdering([{ field: 'careerNo', direction: 'desc' }])
              ),
          ]),
    }),
    visionTool(),
  ],
  tools: [{ name: 'analytics', title: 'ANALYTICS', icon: BarChartIcon, component: AnalyticsTool }],
  schema: { types: schemaTypes },
  document: {
    // 전역 "새 문서" 메뉴에서 싱글턴 템플릿 제외
    newDocumentOptions: (prev) => prev.filter((item) => !SINGLETON_TYPES.has(item.templateId)),
    // 싱글턴 문서에서 복제·삭제 액션 제거
    actions: (prev, { schemaType }) =>
      SINGLETON_TYPES.has(schemaType)
        ? prev.filter(({ action }) => action !== 'duplicate' && action !== 'delete')
        : prev,
  },
})
