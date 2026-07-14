/**
 * ProjectStatus 정본화 마이그레이션 (1회성)
 *
 * 실행:
 *   SANITY_WRITE_TOKEN=<token> npx tsx scripts/migrate-status.ts
 *
 * 토큰 발급: sanity.io/manage → API → Tokens → Editor 권한
 * 실행 후 이 파일은 삭제해도 무방하다.
 */
import { createClient } from '@sanity/client'

const token = process.env.SANITY_WRITE_TOKEN
if (!token) {
  console.error('SANITY_WRITE_TOKEN 환경변수가 필요합니다.')
  process.exit(1)
}

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  token,
  useCdn: false,
})

const MAP: Record<string, string> = {
  'Competition': 'Idea',
  'In Progress': 'In progress',
  'Under Construction': 'Under construction',
  // Completed·Published는 표기 동일 — 변환 불필요
}

async function main() {
  const docs = await client.fetch<{ _id: string; title: string; status: string }[]>(
    `*[_type == "project"]{ _id, title, status }`
  )

  const targets = docs.filter(d => d.status in MAP)
  console.log(`총 ${docs.length}건 중 ${targets.length}건 변환 대상`)

  if (targets.length === 0) {
    console.log('변환할 문서가 없습니다.')
    return
  }

  let tx = client.transaction()
  for (const d of targets) {
    const next = MAP[d.status]
    console.log(`  ${d.title}: ${d.status} → ${next}`)
    tx = tx.patch(d._id, p => p.set({ status: next }))
  }

  await tx.commit()
  console.log('완료. Studio에서 값을 확인하십시오.')

  // 잔존 확인 — 새 유니온에 없는 값 검출
  const after = await client.fetch<string[]>(
    `array::unique(*[_type == "project"].status)`
  )
  const VALID = ['Idea', 'In progress', 'Under construction', 'Completed', 'Published']
  const invalid = after.filter(s => !VALID.includes(s))
  if (invalid.length > 0) {
    console.warn('경고 — 유니온에 없는 status 값이 남아 있습니다:', invalid)
  } else {
    console.log('검증 통과 — 모든 status가 유니온에 속합니다.')
  }
}

main().catch(e => { console.error(e); process.exit(1) })
