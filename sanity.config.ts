'use client'

import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { projectId, dataset } from './sanity/env'
import { schemaTypes } from './sanity/schemaTypes'

export default defineConfig({
  name: 'paikarchitects',
  title: 'Paik Architecture',
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
              .title('ABOUT')
              .id('about')
              .child(
                S.document()
                  .schemaType('about')
                  .documentId('about')
                  .title('ABOUT')
              ),
            S.divider(),
            S.documentTypeListItem('project').title('PROJECTS'),
          ]),
    }),
    visionTool(),
  ],
  schema: { types: schemaTypes },
})
