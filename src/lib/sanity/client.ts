import { createClient } from '@sanity/client'

export const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2026-07-10',
  useCdn: false,   // 빌드 시점 1회 조회 — 캐시 계층 불개입 (결정론)
})
