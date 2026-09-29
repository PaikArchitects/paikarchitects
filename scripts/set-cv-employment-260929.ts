/**
 * About — SPACE GROUP 재직분 프로젝트 목록 교체 (1회성)
 *
 *   about.employment[SPACE GROUP].projects  →  CV_EMPLOYMENT_260929.md 목록 46건 (표 순서 그대로)
 *
 * 실행 (먼저 --dry-run으로 확인할 것):
 *   npx tsx --env-file=.env.local scripts/set-cv-employment-260929.ts --dry-run
 *   npx tsx --env-file=.env.local scripts/set-cv-employment-260929.ts
 *
 * --env-file 없이 실행하면 .env.local이 로드되지 않는다 (tsx는 자동 로드하지 않음).
 * 토큰은 .env.local의 SANITY_API_TOKEN — Editor 이상 권한 필요.
 * projects 배열만 경로 지정(employment[_key==…].projects)으로 set 한다 —
 * 같은 employment 항목의 title·detail·period, 다른 employment 항목, about의 다른 필드는 건드리지 않는다.
 * _key는 엑셀 연번 기반(sg-071 등)으로 고정 — 재실행해도 같은 결과다.
 * 드래프트(drafts.about)가 있으면 함께 교체한다 — 미발행 편집본 발행 시 되돌아가지 않도록.
 * 실행 후 이 파일은 삭제해도 무방하다.
 */
import { createClient } from '@sanity/client'

const DRY_RUN = process.argv.includes('--dry-run')

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

// CV_EMPLOYMENT_260929.md 목록 (최신순, 46건) — [연번, title, result, year]
const ROWS: [string, string, string, string][] = [
  ['071', 'Sajik Baseball Stadium Temporary Ballpark', '2nd Prize', '2026'],
  ['070', 'Chojeon-myeon Eoulrim Complex Town', '2nd Prize', '2025'],
  ['064', 'Seongnam Baseball Park', '2nd Prize', '2025'],
  ['067', 'Gwangju Suwan District Mixed-Use Complex', 'Winner', '2025'],
  ['066', 'Daejeon Seobu KFCC Office Building', '2nd Prize', '2025'],
  ['065', 'Dosan-daero 229 Development', 'Winner', '2025'],
  ['063', 'Jangheung-myeon Complex Government Building', '2nd Prize', '2024'],
  ['057', 'Seongnae-dong Mixed-Use Development', 'Selected, Seoul Creative Innovation Architecture Design Project', '2024'],
  ['053', "UNPRECEDENTED Resort, ResomA's Hwajinpo", '2nd Prize', '2024'],
  ['048', 'Orion New Factory', 'Winner', '2023'],
  ['047', 'The-K Yedaham Funeral Parlor Complex', 'Winner', '2023'],
  ['051', 'Hahoe Scientists Town', '2nd Prize', '2023'],
  ['045', 'Hyundai Motor India Chennai Technical School', 'Winner', '2022'],
  ['043', 'Jinju Sinan-dong Sports Complex', 'Winner', '2022'],
  ['042', 'Hyundai Motor India Technical Center, Test Building', 'Winner', '2022'],
  ['041', 'Cheongju Agricultural and Marine Products Wholesale Market', '3rd Prize', '2022'],
  ['040', 'Hanam Seongwon Smart Building', '2nd Prize', '2022'],
  ['039', 'Pyeongtaek West Youth Facility', '2nd Prize', '2022'],
  ['038', 'Garak Market Modernization, Wholesale Zone 2', '2nd Prize', '2022'],
  ['037', 'Orion Dogok Headquarters', 'Winner', '2021'],
  ['034', 'Bobath Hospital', '2nd Prize', '2021'],
  ['033', 'Green Remodeling of the Korean Embassy in India', 'Winner', '2021'],
  ['031', 'Hanyang University Park Hwa-young Music Hall', 'Winner', '2021'],
  ['030', 'Wirye District Apartment Complex', '3rd Prize', '2021'],
  ['029', 'Seongju-gun Urban Regeneration', 'Winner', '2021'],
  ['028', 'Chungnam International Exhibition and Convention Center', '2nd Prize', '2021'],
  ['027', 'Remodeling of the KyoWon Building', 'Winner', '2021'],
  ['025', 'The 2nd Complex of Seoul Court House', '4th Prize', '2020'],
  ['024', 'Guri Smart City', '2nd Prize', '2020'],
  ['022', 'Gangil Seoul Compact City', '3rd Prize', '2020'],
  ['020', 'JB Financial Group Training Center', '2nd Prize', '2020'],
  ['018', 'Hwaseong KFCC Office Building', 'Winner', '2019'],
  ['017', 'Hwaseong Independence Movement Memorial Hall', '2nd Prize', '2019'],
  ['016', 'Wonju Innovation City Complex Innovation Center', '3rd Prize', '2019'],
  ['015', 'Seoul Animation Center Reconstruction', 'Winner', '2019'],
  ['014', 'Cheonan Samgeori Park', 'Winner', '2018'],
  ['013', 'Siheung public housing', '3rd Prize', '2018'],
  ['012', 'Yangju public housing', '2nd Prize', '2018'],
  ['010', 'Cheongju Culture Factory', 'Winner', '2017'],
  ['008', 'Gwacheon Jugong Complex 12 Reconstruction', 'Winner', '2016'],
  ['007', 'KB Kookmin Bank Integrated Headquarters', '2nd Prize', '2016'],
  ['006', 'General Medical Complex, Phase 2', '2nd Prize', '2016'],
  ['005', 'Factorium, Simmons Headquarters and Production Facility', 'Winner', '2015'],
  ['004', 'Woongbu Middle School', 'Winner', '2015'],
  ['003', 'Ulleung Middle School', '2nd Prize', '2015'],
  ['001', 'Incheon Terminal Complex', 'Winner', '2015'],
]

// _type은 기존 항목과 동일하게 cvProjectEntry — 없으면 Studio가 배열 항목 타입을 판별하지 못한다
const PROJECTS = ROWS.map(([no, title, result, year]) => ({
  _key: `sg-${no}`,
  _type: 'cvProjectEntry',
  title,
  result,
  year,
}))

interface ProjectEntry {
  _key: string
  title?: string
  result?: string
  year?: string
}

interface EmploymentEntry {
  _key: string
  title?: string
  period?: string
  projects?: ProjectEntry[]
}

interface AboutDoc {
  _id: string
  employment: EmploymentEntry[] | null
}

const fmt = (p: ProjectEntry) => `${p.title} — ${p.result} (${p.year})`

function summarize(label: string, list: ProjectEntry[]) {
  console.log(`  ${label} 총 ${list.length}건`)
  if (list.length <= 6) {
    list.forEach((p, i) => console.log(`    ${i + 1}. ${fmt(p)}`))
    return
  }
  list.slice(0, 3).forEach((p, i) => console.log(`    ${i + 1}. ${fmt(p)}`))
  console.log('    …')
  list.slice(-3).forEach((p, i) => console.log(`    ${list.length - 2 + i}. ${fmt(p)}`))
}

async function main() {
  const prefix = DRY_RUN ? '[DRY RUN — 쓰기 없음] ' : ''

  // 사전 검증 — _key 중복·건수
  const keys = new Set(PROJECTS.map(p => p._key))
  if (keys.size !== PROJECTS.length || PROJECTS.length !== 46) {
    console.error(`목록 이상 — ${PROJECTS.length}건, 고유 _key ${keys.size}개 (기대 46/46). 중단합니다.`)
    process.exit(1)
  }

  const docs = await client.fetch<AboutDoc[]>(
    `*[_id in ["about", "drafts.about"]]{ _id, employment }`
  )
  if (!docs.some(d => d._id === 'about')) {
    console.error('about 문서(_id "about")가 없습니다. 중단합니다.')
    process.exit(1)
  }

  let tx = client.transaction()
  for (const doc of docs) {
    const matches = (doc.employment ?? []).filter(e => /SPACE GROUP/i.test(e.title ?? ''))
    if (matches.length !== 1) {
      console.error(`${doc._id}: SPACE GROUP employment 항목이 ${matches.length}개입니다 (기대 1개). 중단합니다.`)
      process.exit(1)
    }
    const emp = matches[0]
    console.log(`\n${prefix}${doc._id} — employment[_key=="${emp._key}"] ${emp.title} · ${emp.period ?? ''}`)
    summarize('교체 전', emp.projects ?? [])
    summarize('교체 후', PROJECTS)

    tx = tx.patch(doc._id, p => p.set({ [`employment[_key=="${emp._key}"].projects`]: PROJECTS }))
  }

  if (DRY_RUN) {
    console.log(`\n[DRY RUN] 위 ${docs.length}개 문서의 projects가 교체될 예정입니다. 실제 쓰기는 하지 않았습니다.`)
    console.log('실행하려면 --dry-run 없이 다시 실행하십시오.')
    return
  }

  await tx.commit()
  console.log('\n완료. Studio에서 값을 확인하십시오.')

  // 검증 — 건수·순서 일치
  const after = await client.fetch<AboutDoc[]>(
    `*[_id in ["about", "drafts.about"]]{ _id, employment }`
  )
  for (const doc of after) {
    const emp = (doc.employment ?? []).find(e => /SPACE GROUP/i.test(e.title ?? ''))
    const got = (emp?.projects ?? []).map(p => p._key).join(',')
    const want = PROJECTS.map(p => p._key).join(',')
    if (got === want) {
      console.log(`검증 통과 — ${doc._id}: ${PROJECTS.length}건, 순서 일치`)
    } else {
      console.warn(`경고 — ${doc._id}: projects가 기대와 다릅니다 (${emp?.projects?.length ?? 0}건)`)
    }
  }
}

main().catch(e => { console.error(e); process.exit(1) })
