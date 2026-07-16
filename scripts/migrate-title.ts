/**
 * title 병기(로케일 오브젝트) 마이그레이션 (1회성)
 *
 *   title(string) + titleKr(string)  →  title { en, ko },  titleKr 제거
 *
 * 실행:
 *   SANITY_WRITE_TOKEN=<token> npx tsx scripts/migrate-title.ts
 *
 * 토큰 발급: sanity.io/manage → API → Tokens → Editor 권한
 * 이미 오브젝트인 문서는 건너뛴다 — 재실행해도 안전하다.
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

interface RawDoc {
  _id: string
  title: string | { en?: string; ko?: string } | null
  titleKr: string | null
}

async function main() {
  // 드래프트 포함 — Studio에 미발행 편집본이 있으면 그것도 함께 이전해야 한다
  const docs = await client.fetch<RawDoc[]>(
    `*[_type == "project"]{ _id, title, titleKr }`
  )

  const targets = docs.filter(d => typeof d.title === 'string')
  const already = docs.length - targets.length
  console.log(`총 ${docs.length}건 — 변환 대상 ${targets.length}건, 이미 오브젝트 ${already}건`)

  if (targets.length === 0) {
    console.log('변환할 문서가 없습니다.')
    return
  }

  let tx = client.transaction()
  for (const d of targets) {
    const en = d.title as string
    const ko = d.titleKr ?? undefined
    console.log(`  ${en} → { en: "${en}", ko: ${ko ? `"${ko}"` : '없음'} }`)
    tx = tx.patch(d._id, p =>
      p.set({ title: ko ? { en, ko } : { en } }).unset(['titleKr'])
    )
  }

  await tx.commit()
  console.log('완료. Studio에서 값을 확인하십시오.')

  // 잔존 확인 — 문자열 title 또는 titleKr가 남아 있으면 실패
  const after = await client.fetch<RawDoc[]>(
    `*[_type == "project"]{ _id, title, titleKr }`
  )
  const stragglers = after.filter(d => typeof d.title === 'string' || d.titleKr != null)
  if (stragglers.length > 0) {
    console.warn('경고 — 미이전 문서가 남아 있습니다:', stragglers.map(d => d._id))
  } else {
    console.log('검증 통과 — 전 문서의 title이 { en, ko } 오브젝트입니다.')
  }

  // en 누락 검출 — 스키마상 en은 필수
  const missingEn = after.filter(
    d => d.title != null && typeof d.title === 'object' && !d.title.en
  )
  if (missingEn.length > 0) {
    console.warn('경고 — title.en이 비어 있는 문서:', missingEn.map(d => d._id))
  }
}

main().catch(e => { console.error(e); process.exit(1) })
