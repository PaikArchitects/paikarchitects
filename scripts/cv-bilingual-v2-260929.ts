/**
 * About — CV 결과·장소·기간 국영문 병기 변환 (1회성, v2)
 *
 *   education[].period                 string → { _type: 'localeString', en, ko }
 *   employment[].period                string → { _type: 'localeString', en, ko }
 *   employment[].projects[].result     string → { _type: 'localeString', en, ko }
 *   awards[].result                    string → { _type: 'localeString', en, ko }
 *   exhibitions[].venue                string → { _type: 'localeString', en, ko }
 *
 * 근거: CV_BILINGUAL_v2_260929.md §4-2. 대상 63건(period 2 + project result 46 + award result 7 + venue 8).
 * year는 건드리지 않는다. en은 기존 문자열을 그대로 옮긴다(대소문자 포함).
 *
 * 실행 (먼저 --dry-run으로 확인할 것):
 *   npx tsx --env-file=.env.local scripts/cv-bilingual-v2-260929.ts --dry-run
 *   npx tsx --env-file=.env.local scripts/cv-bilingual-v2-260929.ts
 *
 * --env-file 없이 실행하면 .env.local이 로드되지 않는다 (tsx는 자동 로드하지 않음).
 * 토큰은 .env.local의 SANITY_API_TOKEN — Editor 이상 권한 필요.
 * 매핑: result·venue는 대소문자 무시 정확 일치, period는 'Present' → '현재' 치환.
 * 쓰기는 항목 _key 경로 지정(field[_key=="…"].result)으로 set — 다른 필드·항목은 건드리지 않는다.
 * 매핑 누락·값 없음·이미 변환된 값(문자열 아님)·건수 불일치가 하나라도 있으면 쓰기 전에 중단한다.
 * 드래프트(drafts.about)가 있으면 함께 변환한다 — 미발행 편집본 발행 시 되돌아가지 않도록.
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

const EXPECTED_TOTAL = 63

// §4-2 result — EN(대소문자 무시) → KO
const RESULT_KO: Record<string, string> = {
  'Winner': '당선',
  '2nd Prize': '2등',
  '3rd Prize': '3등',
  '4th Prize': '4등',
  'Selected, Seoul Creative Innovation Architecture Design Project': '서울시 도시건축디자인혁신사업 선정',
  'Honorable Mention': '가작',
  'Excellence Prize': '우수상',
  'Selected Prize': '입선',
  'Special Prize': '특별상',
  'Silver Prize': '은상',
}

// §4-2 venue — EN(대소문자 무시) → KO
const VENUE_KO: Record<string, string> = {
  'Jeongdong 1928 Art Center, Seoul': '정동1928 아트센터, 서울',
  'Seoul Hall of Urbanism and Architecture, Seoul': '서울도시건축전시관, 서울',
  'YouTube': '유튜브',
  'Published': '출판',
  'Dongdaemun Design Plaza, Seoul': '동대문디자인플라자, 서울',
  'POSCO Center, Seoul': '포스코센터, 서울',
  'Chonnam National University, Gwangju': '전남대학교, 광주',
}

const lookup = (table: Record<string, string>) => {
  const lower = new Map(Object.entries(table).map(([en, ko]) => [en.toLowerCase(), ko]))
  return (en: string) => lower.get(en.toLowerCase()) ?? null
}
const resultKo = lookup(RESULT_KO)
const venueKo = lookup(VENUE_KO)
/** §4-2 period — Present → 현재, 그 외 동일 */
const periodKo = (en: string) => en.replace(/Present/g, '현재')

// ── 문서 형태 (변환 전: 문자열 / 변환 후: localeString) ──

type Raw = string | { en?: string; ko?: string } | null | undefined

interface Item { _key: string; period?: Raw; result?: Raw; venue?: Raw }
interface EmploymentItem extends Item { projects?: Item[] | null }

interface AboutDoc {
  _id: string
  education: Item[] | null
  employment: EmploymentItem[] | null
  awards: Item[] | null
  exhibitions: Item[] | null
}

const QUERY = `*[_id in ["about", "drafts.about"]]{
  _id,
  education[]{ _key, period },
  employment[]{ _key, period, "projects": projects[]{ _key, result } },
  awards[]{ _key, result },
  exhibitions[]{ _key, venue }
}`

/** 한 필드 변환 1건 — path는 문서 루트 기준 _key 경로 */
interface Change { path: string; en: string; ko: string }

const locale = (en: string, ko: string) => ({ _type: 'localeString', en, ko })

/** 매핑 누락·검증 실패 목록. 하나라도 있으면 쓰기 없이 중단 */
const errors: string[] = []

function plan(doc: AboutDoc): Change[] {
  const changes: Change[] = []
  const id = doc._id

  const convert = (path: string, v: Raw, toKo: (en: string) => string | null) => {
    if (typeof v !== 'string' || v === '') {
      errors.push(`${id}: ${path} — 문자열 값이 아닙니다 (${JSON.stringify(v)}). 이미 변환되었거나 비어 있습니다.`)
      return
    }
    const ko = toKo(v)
    if (ko === null) {
      errors.push(`${id}: ${path} — 매핑표에 없는 값 "${v}"`)
      return
    }
    changes.push({ path, en: v, ko })
  }

  for (const e of doc.education ?? []) {
    convert(`education[_key=="${e._key}"].period`, e.period, periodKo)
  }
  for (const emp of doc.employment ?? []) {
    const base = `employment[_key=="${emp._key}"]`
    convert(`${base}.period`, emp.period, periodKo)
    for (const p of emp.projects ?? []) {
      convert(`${base}.projects[_key=="${p._key}"].result`, p.result, resultKo)
    }
  }
  for (const a of doc.awards ?? []) {
    convert(`awards[_key=="${a._key}"].result`, a.result, resultKo)
  }
  for (const x of doc.exhibitions ?? []) {
    convert(`exhibitions[_key=="${x._key}"].venue`, x.venue, venueKo)
  }

  return changes
}

/** 값별 집계 — 요약 출력용 */
function tally(changes: Change[], suffix: string) {
  const m = new Map<string, { ko: string; n: number }>()
  for (const c of changes.filter(c => c.path.endsWith(suffix))) {
    const cur = m.get(c.en)
    if (cur) cur.n++
    else m.set(c.en, { ko: c.ko, n: 1 })
  }
  return m
}

async function main() {
  const prefix = DRY_RUN ? '[DRY RUN — 쓰기 없음] ' : ''

  const docs = await client.fetch<AboutDoc[]>(QUERY)
  if (!docs.some(d => d._id === 'about')) {
    console.error('about 문서(_id "about")가 없습니다. 중단합니다.')
    process.exit(1)
  }

  const plans = docs.map(doc => ({ doc, changes: plan(doc) }))
  for (const { doc, changes } of plans) {
    if (changes.length !== EXPECTED_TOTAL) {
      errors.push(`${doc._id}: 변환 대상 ${changes.length}건 (기대 ${EXPECTED_TOTAL}건)`)
    }
  }

  if (errors.length > 0) {
    console.error(`\n${prefix}검증 실패 ${errors.length}건 — 쓰기 없이 중단합니다.`)
    errors.forEach(e => console.error(`  - ${e}`))
    process.exit(1)
  }

  let tx = client.transaction()
  for (const { doc, changes } of plans) {
    console.log(`\n${prefix}${doc._id} — ${changes.length}건`)
    for (const [label, suffix] of [['period', '.period'], ['result', '.result'], ['venue', '.venue']]) {
      const t = tally(changes, suffix)
      const n = [...t.values()].reduce((s, v) => s + v.n, 0)
      console.log(`  ${label} ${n}건`)
      for (const [en, { ko, n }] of t) console.log(`    "${en}" → { en: "${en}", ko: "${ko}" } ×${n}`)
    }
    const set: Record<string, ReturnType<typeof locale>> = {}
    for (const c of changes) set[c.path] = locale(c.en, c.ko)
    tx = tx.patch(doc._id, p => p.set(set))
  }

  if (DRY_RUN) {
    console.log(`\n[DRY RUN] 위 ${docs.length}개 문서가 변환될 예정입니다. 실제 쓰기는 하지 않았습니다.`)
    console.log('실행하려면 --dry-run 없이 다시 실행하십시오.')
    return
  }

  await tx.commit()
  console.log('\n완료. 재조회로 검증합니다.')

  // 검증 — 전 대상 필드가 { en, ko } 형태이고 en이 기존 문자열과 같은지
  const after = await client.fetch<AboutDoc[]>(QUERY)
  for (const { doc, changes } of plans) {
    const now = after.find(d => d._id === doc._id)
    if (!now) {
      console.warn(`경고 — ${doc._id}: 재조회 결과에 없습니다`)
      continue
    }
    const bad = changes.filter(c => {
      const v = readPath(now, c.path)
      return !v || typeof v !== 'object' || v.en !== c.en || v.ko !== c.ko
    })
    if (bad.length === 0) {
      console.log(`검증 통과 — ${doc._id}: ${changes.length}개 필드 모두 { en, ko }`)
    } else {
      console.warn(`경고 — ${doc._id}: ${bad.length}개 필드가 기대와 다릅니다`)
      bad.forEach(c => console.warn(`  - ${c.path}`))
    }
  }
}

/** field[_key=="a"].sub[_key=="b"].leaf 형식의 경로를 조회 결과에서 읽는다 */
function readPath(doc: AboutDoc, path: string): Raw {
  let cur: unknown = doc
  for (const seg of path.split(/\.(?![^[]*\])/)) {
    const m = seg.match(/^(\w+)\[_key=="([^"]+)"\]$/)
    if (m) {
      const arr = (cur as Record<string, Item[] | null>)?.[m[1]] ?? []
      cur = arr.find(it => it._key === m[2])
    } else {
      cur = (cur as Record<string, unknown>)?.[seg]
    }
  }
  return cur as Raw
}

main().catch(e => { console.error(e); process.exit(1) })
