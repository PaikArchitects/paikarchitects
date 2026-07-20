/**
 * `result` 잔존 정리 (1회성)
 *
 * 실행:
 *   npx tsx --env-file=.env.local scripts/cleanupResult.ts
 *   (dry-run: npx tsx --env-file=.env.local scripts/cleanupResult.ts --dry-run)
 *
 * 선행 조건: scripts/auditUnknownFields.ts 진단을 먼저 실행할 것.
 * 260720 진단 결과 — 미정의 필드는 `result` 하나뿐(30건, draft 0건).
 *
 * 규칙 (명세 §1-B):
 *  - awards가 이미 있는 문서            → result만 unset (awards 보존).
 *  - awards가 없고 result가 blank        → result만 unset.
 *  - awards가 없고 result에 유효값       → awards 1항목으로 이관 후 result unset.
 *  - blank 판정에는 하이픈(-) 외에 en-dash(–)·em-dash(—)도 포함한다.
 *    진단에서 '–'(en-dash)를 쓰는 문서 2건이 확인되었다.
 *  - 복수 수상(예: "Winner + Grand Prize")은 자동 분해하지 않는다 (Studio 수동).
 *
 * result 이외의 필드는 절대 unset하지 않는다.
 */
import { createClient } from '@sanity/client'
import { randomUUID } from 'node:crypto'

const token = process.env.SANITY_API_TOKEN
if (!token) {
  console.error('SANITY_API_TOKEN 환경변수가 필요합니다.')
  process.exit(1)
}

const DRY_RUN = process.argv.includes('--dry-run')

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  token,
  useCdn: false,
  perspective: 'raw',
})

const BLANK_VALUES = new Set(['', '-', '–', '—'])

function isBlank(v: unknown): boolean {
  if (typeof v !== 'string') return true
  return BLANK_VALUES.has(v.trim())
}

type Doc = {
  _id: string
  title: string | null
  result: unknown
  awardsCount: number
}

async function main() {
  // published + draft 전부 (perspective: 'raw')
  const docs = await client.fetch<Doc[]>(
    `*[_type == "project" && defined(result)] | order(_id asc){
      _id,
      "title": title.en,
      result,
      "awardsCount": count(awards[])
    }`
  )

  const draftCount = docs.filter((d) => d._id.startsWith('drafts.')).length
  console.log(
    `result 보유 문서: ${docs.length}건 (published ${docs.length - draftCount} / draft ${draftCount})`
  )
  if (docs.length === 0) {
    console.log('정리할 문서가 없습니다.')
    return
  }

  let tx = client.transaction()
  for (const d of docs) {
    const label = d.title ?? d._id
    const hasAwards = (d.awardsCount ?? 0) > 0

    if (hasAwards) {
      console.log(`  [unset only] ${label}: awards ${d.awardsCount}건 보존, result=${JSON.stringify(d.result)} 제거`)
      tx = tx.patch(d._id, (p) => p.unset(['result']))
    } else if (isBlank(d.result)) {
      console.log(`  [unset only] ${label}: result=${JSON.stringify(d.result)} (빈값·대시 → awards 미생성)`)
      tx = tx.patch(d._id, (p) => p.unset(['result']))
    } else {
      const award = { _key: randomUUID(), _type: 'award', title: d.result as string, visible: true }
      console.log(`  [migrate]    ${label}: ${JSON.stringify(d.result)} → awards[1]`)
      tx = tx.patch(d._id, (p) => p.set({ awards: [award] }).unset(['result']))
    }
  }

  if (DRY_RUN) {
    console.log('\n--dry-run — 커밋하지 않았습니다.')
    return
  }

  await tx.commit()
  console.log('정리 완료.')

  // 검증 (§1-C) — 빈 배열이어야 한다
  const remaining = await client.fetch<{ _id: string }[]>(
    `*[_type == "project" && defined(result)]{ _id }`
  )
  if (remaining.length > 0) {
    console.warn(`경고 — result가 아직 남은 문서 ${remaining.length}건:`, remaining.map((r) => r._id))
  } else {
    console.log('검증 통과 — result 필드가 남은 문서가 없습니다.')
  }

  console.log('\n수동 후속 조치 (Studio):')
  console.log('  - Cheongju Culture Factory: "Winner + Grand Prize" 1항목 → 2항목 분해')
  console.log('  - Studio 새로고침 후 `Unknown field found` 경고 소멸 육안 확인')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
