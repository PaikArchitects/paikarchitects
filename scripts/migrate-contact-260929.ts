/**
 * 연락처 싱글턴 이관 (1회성, IDENTITY_P2 §4)
 *
 *   about.contact { location, email, phone }  →  contact 문서(_id 'contact') + instagram
 *
 * 실행 (먼저 --dry-run으로 확인할 것):
 *   npx tsx --env-file=.env.local scripts/migrate-contact-260929.ts --dry-run
 *   npx tsx --env-file=.env.local scripts/migrate-contact-260929.ts
 *   npx tsx --env-file=.env.local scripts/migrate-contact-260929.ts --unset   ← 사이트 배포·확인 후에만
 *
 * 기본 실행은 복사만 한다(createIfNotExists — contact 문서가 이미 있으면 건드리지 않음, 재실행 안전).
 * --unset을 줄 때만 about 문서에서 구 contact 필드를 제거한다 — 되돌릴 수 있도록 단계 분리.
 * --dry-run과 --unset을 함께 주면 unset 예정 내용까지 출력만 한다.
 *
 * --env-file 없이 실행하면 .env.local이 로드되지 않는다 (tsx는 자동 로드하지 않음).
 * 토큰은 .env.local의 SANITY_API_TOKEN — Editor 이상 권한 필요.
 * 실행 후 이 파일은 삭제해도 무방하다.
 */
import { createClient } from '@sanity/client'

const DRY_RUN = process.argv.includes('--dry-run')
const UNSET = process.argv.includes('--unset')

const INSTAGRAM = 'https://www.instagram.com/archipaik/'

// .env.local의 정본 키는 SANITY_API_TOKEN. SANITY_WRITE_TOKEN은 구 스크립트 호환용 폴백
const token = process.env.SANITY_API_TOKEN ?? process.env.SANITY_WRITE_TOKEN
if (!token) {
  console.error(
    'SANITY_API_TOKEN이 없습니다.\n' +
    '.env.local에 키가 있는지, 그리고 --env-file=.env.local을 붙였는지 확인하십시오.'
  )
  process.exit(1)
}

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  token,
  useCdn: false,
})

interface OldContact {
  location?: string | null
  email?: string | null
  phone?: string | null
}

async function main() {
  const prefix = DRY_RUN ? '[DRY RUN — 쓰기 없음] ' : ''

  const about = await client.fetch<{ _id: string; contact: OldContact | null } | null>(
    `*[_type == "about" && _id == "about"][0]{ _id, contact }`
  )
  if (!about) {
    console.error('about 문서(_id "about")가 없습니다. 중단합니다.')
    process.exit(1)
  }

  const old = about.contact ?? {}
  console.log(`${prefix}about.contact 읽은 값:`)
  console.log(JSON.stringify(about.contact, null, 2))

  // 빈 값은 싣지 않는다 — 스키마상 전부 optional
  const doc = {
    _id: 'contact',
    _type: 'contact',
    ...(old.email ? { email: old.email } : {}),
    ...(old.phone ? { phone: old.phone } : {}),
    ...(old.location ? { location: old.location } : {}),
    instagram: INSTAGRAM,
  }

  const existing = await client.fetch<{ _id: string } | null>(`*[_id == "contact"][0]{ _id }`)
  console.log(`\n${prefix}생성할 contact 문서${existing ? ' (이미 존재 — createIfNotExists이므로 쓰지 않음)' : ''}:`)
  console.log(JSON.stringify(doc, null, 2))

  if (UNSET) {
    console.log(`\n${prefix}--unset: about 문서에서 contact 필드를 제거합니다.`)
  }

  if (DRY_RUN) {
    console.log('\n[DRY RUN] 실제 쓰기는 하지 않았습니다. 실행하려면 --dry-run 없이 다시 실행하십시오.')
    return
  }

  await client.createIfNotExists(doc)
  console.log('\ncontact 문서 생성(또는 기존 유지) 완료. Studio의 CONTACT에서 값을 확인하십시오.')

  if (UNSET) {
    // 안전장치 — contact 문서가 실제로 존재할 때만 구 필드를 지운다
    const after = await client.fetch<{ _id: string } | null>(`*[_id == "contact"][0]{ _id }`)
    if (!after) {
      console.error('contact 문서가 확인되지 않아 unset을 중단합니다.')
      process.exit(1)
    }
    await client.patch('about').unset(['contact']).commit()
    console.log('about.contact 제거 완료.')
  }
}

main().catch(e => { console.error(e); process.exit(1) })
