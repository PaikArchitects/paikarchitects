/**
 * result(string) → awards(array) 이관 마이그레이션 (1회성)
 *
 * 실행:
 *   npx tsx --env-file=.env.local scripts/migrateAwards.ts
 *   또는
 *   SANITY_WRITE_TOKEN=<token> npx tsx scripts/migrateAwards.ts
 *
 * 토큰 발급: sanity.io/manage → API → Tokens → Editor 권한
 *
 * 변환 규칙 (260720 명세 §2-D):
 *  - result 값이 '-' 또는 빈 문자열이면 awards를 만들지 않는다 (result만 unset).
 *  - 그 외에는 awards:[{_key,_type:'award',title:result,visible:true}] 단일 항목으로 이관.
 *  - 이관 후 result를 unset.
 *  - 복수 수상은 자동 분해하지 않는다 (Studio에서 수동 분해). ex) Cheongju Culture Factory
 *  - 표기 오기(WInner/4th prize/Grand prize)도 자동 교정하지 않는다 (Studio 수동).
 *
 * 실행 후 이 파일은 삭제해도 무방하다.
 */
import { createClient } from '@sanity/client'
import { randomUUID } from 'node:crypto'

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

function isBlank(v: string): boolean {
  const t = v.trim()
  return t === '' || t === '-'
}

async function main() {
  // 전수 조사 — result가 정의된 모든 문서 센서스
  const docs = await client.fetch<{ _id: string; title: string | null; result: string }[]>(
    `*[_type == "project" && defined(result)]{ _id, "title": title.en, result }`
  )
  console.log(`result 보유 문서: ${docs.length}건`)

  if (docs.length === 0) {
    console.log('이관할 문서가 없습니다.')
    return
  }

  let tx = client.transaction()
  for (const d of docs) {
    if (isBlank(d.result)) {
      console.log(`  [unset only] ${d.title ?? d._id}: result="${d.result}" (빈값·'-' → awards 미생성)`)
      tx = tx.patch(d._id, p => p.unset(['result']))
    } else {
      const award = { _key: randomUUID(), _type: 'award', title: d.result, visible: true }
      console.log(`  [migrate]    ${d.title ?? d._id}: "${d.result}" → awards[1]`)
      tx = tx.patch(d._id, p => p.set({ awards: [award] }).unset(['result']))
    }
  }

  await tx.commit()
  console.log('이관 완료.')

  // 잔존 확인 — result가 남은 문서가 없어야 한다
  const remaining = await client.fetch<{ _id: string }[]>(
    `*[_type == "project" && defined(result)]{ _id }`
  )
  if (remaining.length > 0) {
    console.warn(`경고 — result가 아직 남은 문서 ${remaining.length}건:`, remaining.map(r => r._id))
  } else {
    console.log('검증 통과 — result 필드가 남은 문서가 없습니다.')
  }

  console.log('\n수동 후속 조치 (Studio):')
  console.log('  - Cheongju Culture Factory: 1항목 → 2항목 분해')
  console.log('      ① Competition Winner')
  console.log('      ② Grand Prize, 2020 Korea Remodeling Architecture Competition')
  console.log('  - 표기 교정: WInner→Winner / 4th prize→4th Prize / Grand prize→Grand Prize')
}

main().catch(e => { console.error(e); process.exit(1) })
