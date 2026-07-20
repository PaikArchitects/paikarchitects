/**
 * 미정의 필드 전수 진단 (읽기 전용 — 아무것도 수정하지 않는다)
 *
 * 실행:
 *   npx tsx --env-file=.env.local scripts/auditUnknownFields.ts
 *
 * 목적: Studio의 `Unknown field found` 경고 원인을 추정이 아니라 조사로 확정한다.
 *  - published/draft를 모두 포함한다 (perspective: 'raw').
 *  - project 스키마에 정의되지 않은 필드를 문서별로 열거한다.
 *  - result 잔존 현황을 별도로 집계한다.
 */
import { createClient } from '@sanity/client'

const token = process.env.SANITY_API_TOKEN
if (!token) {
  console.error('SANITY_API_TOKEN 환경변수가 필요합니다.')
  process.exit(1)
}

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  token,
  useCdn: false,
  perspective: 'raw',
})

/** project.ts에 정의된 필드명 */
const KNOWN_FIELDS = new Set([
  'title',
  'subtitle',
  'awards',
  'client',
  'location',
  'mainType',
  'size',
  'status',
  'year',
  'role',
  'subTypes',
  'slug',
  'careerNo',
  'displayOrder',
  'featured',
  'coverImage',
  'coverColor',
  'slides',
])

/** Sanity 시스템 필드 — 미정의 필드가 아니다 */
const SYSTEM_FIELDS = new Set([
  '_id',
  '_type',
  '_rev',
  '_createdAt',
  '_updatedAt',
  '_system',
])

type Doc = Record<string, unknown> & { _id: string }

async function main() {
  const docs = await client.fetch<Doc[]>(
    `*[_type == "project"] | order(_id asc)`
  )

  const drafts = docs.filter((d) => d._id.startsWith('drafts.'))
  console.log(`project 문서 총 ${docs.length}건 (published ${docs.length - drafts.length} / draft ${drafts.length})`)
  if (drafts.length === 0) {
    console.log('※ draft 문서가 결과에 없다. perspective:raw 조회이므로 실제로 draft가 없다는 뜻이다.')
  }

  const fieldCount = new Map<string, string[]>()

  for (const doc of docs) {
    const unknown = Object.keys(doc).filter(
      (k) => !KNOWN_FIELDS.has(k) && !SYSTEM_FIELDS.has(k)
    )
    if (unknown.length === 0) continue
    const label = (doc.title as { en?: string } | undefined)?.en ?? '(무제)'
    console.log(`\n[미정의 필드] ${doc._id}  — ${label}`)
    for (const k of unknown) {
      console.log(`    ${k} = ${JSON.stringify(doc[k])}`)
      const list = fieldCount.get(k) ?? []
      list.push(doc._id)
      fieldCount.set(k, list)
    }
  }

  console.log('\n───── 요약 ─────')
  if (fieldCount.size === 0) {
    console.log('미정의 필드가 발견되지 않았다.')
  } else {
    for (const [field, ids] of fieldCount) {
      const d = ids.filter((i) => i.startsWith('drafts.')).length
      console.log(`  ${field}: ${ids.length}건 (published ${ids.length - d} / draft ${d})`)
    }
  }

  const withResult = docs.filter((d) => d.result !== undefined)
  console.log(`\nresult 보유 문서: ${withResult.length}건`)
  for (const d of withResult) {
    const label = (d.title as { en?: string } | undefined)?.en ?? '(무제)'
    const hasAwards = Array.isArray(d.awards) && d.awards.length > 0
    console.log(
      `  ${d._id} — ${label} | result=${JSON.stringify(d.result)} | awards=${hasAwards ? `${(d.awards as unknown[]).length}건` : '없음'}`
    )
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
