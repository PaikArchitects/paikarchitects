/**
 * `displayOrder` 잔존 정리 (1회성)
 *
 * 실행:
 *   npx tsx --env-file=.env.local scripts/cleanupDisplayOrder.ts
 *   (dry-run: npx tsx --env-file=.env.local scripts/cleanupDisplayOrder.ts --dry-run)
 *
 * 배경 (명세 §3): 프로젝트 월의 정렬이 careerNo 내림차순으로 대체되어
 * `displayOrder` 필드를 스키마에서 삭제했다. 문서에 남은 값은 Studio에서
 * `Unknown field found` 경고를 유발하므로 전 문서(draft 포함)에서 unset한다.
 *
 * **displayOrder 이외의 필드는 절대 건드리지 않는다.**
 *
 * 배포 순서: 데이터 정리 먼저, 빌드 나중.
 */
import { createClient } from '@sanity/client'

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

type Doc = {
  _id: string
  title: string | null
  displayOrder: number | null
}

async function main() {
  // published + draft 전부 (perspective: 'raw')
  const docs = await client.fetch<Doc[]>(
    `*[_type == "project" && defined(displayOrder)] | order(_id asc){
      _id,
      "title": title.en,
      displayOrder
    }`
  )

  const draftCount = docs.filter((d) => d._id.startsWith('drafts.')).length
  console.log(
    `displayOrder 보유 문서: ${docs.length}건 (published ${docs.length - draftCount} / draft ${draftCount})`
  )
  if (docs.length === 0) {
    console.log('정리할 문서가 없습니다.')
    return
  }

  let tx = client.transaction()
  for (const d of docs) {
    const label = d.title ?? d._id
    console.log(`  [unset] ${label}: displayOrder=${JSON.stringify(d.displayOrder)} 제거`)
    tx = tx.patch(d._id, (p) => p.unset(['displayOrder']))
  }

  if (DRY_RUN) {
    console.log('\n--dry-run — 커밋하지 않았습니다.')
    return
  }

  await tx.commit()
  console.log('정리 완료.')

  // 검증 (§7-B) — 빈 배열이어야 한다
  const remaining = await client.fetch<{ _id: string }[]>(
    `*[_type == "project" && defined(displayOrder)]{ _id }`
  )
  if (remaining.length > 0) {
    console.warn(
      `경고 — displayOrder가 아직 남은 문서 ${remaining.length}건:`,
      remaining.map((r) => r._id)
    )
  } else {
    console.log('검증 통과 — displayOrder 필드가 남은 문서가 없습니다.')
  }

  console.log('\n수동 후속 조치: Studio 새로고침 후 `Unknown field found` 경고 소멸 육안 확인')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
