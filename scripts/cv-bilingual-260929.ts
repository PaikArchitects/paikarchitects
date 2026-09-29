/**
 * About — CV 이름 필드 국영문 병기 변환 (1회성)
 *
 *   education[].title·detail         string → { _type: 'localeString', en, ko }
 *   employment[].title·detail        string → { _type: 'localeString', en, ko }
 *   employment[].projects[].title    string → { _type: 'localeString', en, ko }
 *   awards[].title                   string → { _type: 'localeString', en, ko }
 *   exhibitions[].title              string → { _type: 'localeString', en, ko }
 *
 * 근거: CV_BILINGUAL_260929.md §4. 대상 63건(1 + 1 + 46 + 7 + 8).
 * result·year·period·venue는 건드리지 않는다. en은 기존 문자열을 그대로 옮긴다.
 *
 * 실행 (먼저 --dry-run으로 확인할 것):
 *   npx tsx --env-file=.env.local scripts/cv-bilingual-260929.ts --dry-run
 *   npx tsx --env-file=.env.local scripts/cv-bilingual-260929.ts
 *
 * --env-file 없이 실행하면 .env.local이 로드되지 않는다 (tsx는 자동 로드하지 않음).
 * 토큰은 .env.local의 SANITY_API_TOKEN — Editor 이상 권한 필요.
 * 매칭: Education·Employment·Awards·Exhibitions는 영문 title 정확 일치, 프로젝트는 _key(sg-XXX).
 * 쓰기는 항목 _key 경로 지정(field[_key=="…"].title)으로 set — 다른 필드·항목은 건드리지 않는다.
 * 매칭 누락·중복·건수 불일치·이미 변환된 값(문자열 아님)이 하나라도 있으면 쓰기 전에 중단한다.
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

// §4-1 Education — [EN title, KO title, EN detail, KO detail]
const EDUCATION: [string, string, string, string][] = [
  ['Sejong University, Seoul', '세종대학교', 'Bachelor of Architecture, Architectural Engineering Dept.', '건축공학과 건축학사'],
]

// §4-2 Employment — [EN title, KO title, EN detail, KO detail]
const EMPLOYMENT: [string, string, string, string][] = [
  ['SPACE GROUP of Korea, Seoul', '공간종합건축사사무소', 'Staff – Senior Associate', '사원 – 실장'],
]

// §4-3 Professional Experience projects — [연번, KO title] (key = sg-연번)
const PROJECTS: [string, string][] = [
  ['071', '사직야구장 임시구장'],
  ['070', '초전면 어울림복합타운'],
  ['064', '성남시 야구전용구장'],
  ['067', '광주 수완지구 복합시설'],
  ['066', '대전서부새마을금고 회관'],
  ['065', '도산대로 229 개발'],
  ['063', '장흥면 복합청사'],
  ['057', '성내동 복합개발'],
  ['053', '화진포 관광지 마스터플랜'],
  ['048', '오리온 진천 신공장'],
  ['047', '더케이예다함 복합센터'],
  ['051', '하회과학자마을'],
  ['045', '현대자동차 인도 첸나이 기술학교'],
  ['043', '진주 신안동 복합스포츠타운'],
  ['042', '현대자동차 인도기술연구소 시험동'],
  ['041', '청주 농수산물 도매시장'],
  ['040', '하남 성원 스마트빌딩'],
  ['039', '평택시 서부청소년시설'],
  ['038', '가락시장 현대화 도매권역 2공구'],
  ['037', '오리온 도곡 사옥'],
  ['034', '하남 보바스재활병원'],
  ['033', '주인도대사관 청사 그린리모델링'],
  ['031', '한양대학교 박화영음악관'],
  ['030', '위례지구 신혼희망타운'],
  ['029', '성주군 도시재생뉴딜사업'],
  ['028', '충남 국제전시컨벤션센터'],
  ['027', '교원그룹 구몬빌딩 리모델링'],
  ['025', '서울법원 제2청사'],
  ['024', '구리 한강변 도시개발'],
  ['022', '강일 서울 컴팩트시티'],
  ['020', 'JB금융그룹 통합 연수원'],
  ['018', '화성새마을금고 회관'],
  ['017', '화성 독립운동 기념관'],
  ['016', '원주 혁신도시 복합혁신센터'],
  ['015', '서울애니메이션센터 재건축'],
  ['014', '천안 삼거리공원'],
  ['013', '시흥장현 A-12BL 공동주택'],
  ['012', '양주회천 A25BL 공동주택'],
  ['010', '청주 문화제조창'],
  ['008', '과천 주공12단지 재건축'],
  ['007', 'KB국민은행 통합사옥'],
  ['006', '종합의료복합단지 2단계'],
  ['005', '시몬스 팩토리움'],
  ['004', '웅부중학교'],
  ['003', '울릉중학교'],
  ['001', '인천터미널부지 복합시설'],
]

// §4-4 Awards — [EN title, KO title]
const AWARDS: [string, string][] = [
  ['37th SPACE GRAND PRIZE Poster Contest', '제37회 공간국제학생건축상 포스터 공모'],
  ['SPACE GROUP New Office Competition', '공간그룹 신사옥 사내공모'],
  ['Social Architecture, Young Architect Competition', '소셜 아키텍처 청년건축가 공모'],
  ['The 32nd Korean Inst. of Arch. International Competition', '제32회 대한민국건축대전'],
  ['POSCO Steel Design Festa 2013', '포스코 스틸디자인 페스타 2013'],
  ['Sejong Architecture Graduation Exhibition', '세종대 건축학과 졸업전시'],
  ['Urban Design Institute of Korea UCC Competition', '한국도시설계학회 UCC 공모전'],
]

// §4-5 Exhibitions and Publications — [EN title, KO title]
const EXHIBITIONS: [string, string][] = [
  ['Social Architecture Symposium', '소셜 아키텍처 심포지엄'],
  ['Social Architecture, Young Architect Competition Exhibition', '소셜 아키텍처 청년건축가 공모 전시'],
  ['Young Architect Competition Winner Interview', '청년건축가 공모 수상자 인터뷰'],
  ['KIA International Competition Winner Work Book', '대한민국건축대전 수상작품집'],
  ['Sejong News', '세종대학교 신문'],
  ["The 32nd Korean Inst. of Arch. Int'l Competition Exhibition", '제32회 대한민국건축대전 전시'],
  ['POSCO Steel Design Festa 2013 Exhibition', '포스코 스틸디자인 페스타 2013 전시'],
  ['Screening Urban Design Inst. of Korea UCC Competition', '한국도시설계학회 UCC 공모전 상영'],
]

// ── 문서 형태 (변환 전: 문자열 / 변환 후: localeString) ──

type Raw = string | { en?: string; ko?: string } | null | undefined

interface Item { _key: string; title?: Raw; detail?: Raw }
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
  education[]{ _key, title, detail },
  employment[]{ _key, title, detail, "projects": projects[]{ _key, title } },
  awards[]{ _key, title },
  exhibitions[]{ _key, title }
}`

/** 한 필드 변환 1건 — path는 문서 루트 기준 _key 경로 */
interface Change { path: string; en: string; ko: string }

const locale = (en: string, ko: string) => ({ _type: 'localeString', en, ko })

/** 매칭·검증 실패 목록. 하나라도 있으면 쓰기 없이 중단 */
const errors: string[] = []

/** 기존 값이 문자열인지 확인하고 그대로 en으로 돌려준다. 이미 변환됐거나 비었으면 오류 */
function asString(docId: string, path: string, v: Raw): string | null {
  if (typeof v === 'string') return v
  errors.push(`${docId}: ${path} — 문자열이 아닙니다 (${JSON.stringify(v)}). 이미 변환되었거나 비어 있습니다.`)
  return null
}

/** 영문 title 정확 일치로 항목을 1개 찾는다. 0개·2개 이상이면 오류 */
function findByTitle<T extends Item>(docId: string, field: string, list: T[], en: string): T | null {
  const hits = list.filter(it => it.title === en)
  if (hits.length !== 1) {
    errors.push(`${docId}: ${field} — 영문 title "${en}" 일치 항목 ${hits.length}개 (기대 1개)`)
    return null
  }
  return hits[0]
}

function plan(doc: AboutDoc): Change[] {
  const changes: Change[] = []
  const id = doc._id

  // Education·Employment — title·detail 둘 다
  const pairs: [string, Item[], [string, string, string, string][]][] = [
    ['education', doc.education ?? [], EDUCATION],
    ['employment', doc.employment ?? [], EMPLOYMENT],
  ]
  for (const [field, list, rows] of pairs) {
    if (list.length !== rows.length) {
      errors.push(`${id}: ${field} ${list.length}건 (기대 ${rows.length}건)`)
    }
    for (const [enTitle, koTitle, enDetail, koDetail] of rows) {
      const it = findByTitle(id, field, list, enTitle)
      if (!it) continue
      const base = `${field}[_key=="${it._key}"]`
      const t = asString(id, `${base}.title`, it.title)
      const d = asString(id, `${base}.detail`, it.detail)
      if (d !== null && d !== enDetail) {
        errors.push(`${id}: ${base}.detail — "${d}" ≠ 표 "${enDetail}"`)
      }
      if (t !== null) changes.push({ path: `${base}.title`, en: t, ko: koTitle })
      if (d !== null && d === enDetail) changes.push({ path: `${base}.detail`, en: d, ko: koDetail })
    }
  }

  // Professional Experience projects — _key(sg-XXX)로 매칭
  const emp = (doc.employment ?? []).find(e => e.title === EMPLOYMENT[0][0])
  if (emp) {
    const projects = emp.projects ?? []
    if (projects.length !== PROJECTS.length) {
      errors.push(`${id}: projects ${projects.length}건 (기대 ${PROJECTS.length}건)`)
    }
    for (const [no, ko] of PROJECTS) {
      const key = `sg-${no}`
      const hits = projects.filter(p => p._key === key)
      if (hits.length !== 1) {
        errors.push(`${id}: projects — _key "${key}" 일치 항목 ${hits.length}개 (기대 1개)`)
        continue
      }
      const path = `employment[_key=="${emp._key}"].projects[_key=="${key}"].title`
      const en = asString(id, path, hits[0].title)
      if (en !== null) changes.push({ path, en, ko })
    }
  }

  // Awards·Exhibitions — 영문 title로 매칭
  const titled: [string, Item[], [string, string][]][] = [
    ['awards', doc.awards ?? [], AWARDS],
    ['exhibitions', doc.exhibitions ?? [], EXHIBITIONS],
  ]
  for (const [field, list, rows] of titled) {
    if (list.length !== rows.length) {
      errors.push(`${id}: ${field} ${list.length}건 (기대 ${rows.length}건)`)
    }
    for (const [en, ko] of rows) {
      const it = findByTitle(id, field, list, en)
      if (!it) continue
      const path = `${field}[_key=="${it._key}"].title`
      const got = asString(id, path, it.title)
      if (got !== null) changes.push({ path, en: got, ko })
    }
  }

  return changes
}

/** 항목 수(대상 63건) — 항목당 title은 1건, education·employment의 detail은 같은 항목으로 센다 */
const itemCount = (changes: Change[]) => changes.filter(c => c.path.endsWith('.title')).length

async function main() {
  const prefix = DRY_RUN ? '[DRY RUN — 쓰기 없음] ' : ''

  // 사전 검증 — 표 자체의 건수·중복
  const tableTotal = EDUCATION.length + EMPLOYMENT.length + PROJECTS.length + AWARDS.length + EXHIBITIONS.length
  const projKeys = new Set(PROJECTS.map(([no]) => no))
  if (tableTotal !== EXPECTED_TOTAL || projKeys.size !== PROJECTS.length) {
    console.error(`표 이상 — 합계 ${tableTotal}건 (기대 ${EXPECTED_TOTAL}), 프로젝트 고유 key ${projKeys.size}/${PROJECTS.length}. 중단합니다.`)
    process.exit(1)
  }

  const docs = await client.fetch<AboutDoc[]>(QUERY)
  if (!docs.some(d => d._id === 'about')) {
    console.error('about 문서(_id "about")가 없습니다. 중단합니다.')
    process.exit(1)
  }

  const plans = docs.map(doc => ({ doc, changes: plan(doc) }))
  for (const { doc, changes } of plans) {
    const n = itemCount(changes)
    if (n !== EXPECTED_TOTAL) errors.push(`${doc._id}: 변환 대상 항목 ${n}건 (기대 ${EXPECTED_TOTAL}건)`)
  }

  if (errors.length > 0) {
    console.error(`\n${prefix}검증 실패 ${errors.length}건 — 쓰기 없이 중단합니다.`)
    errors.forEach(e => console.error(`  - ${e}`))
    process.exit(1)
  }

  let tx = client.transaction()
  for (const { doc, changes } of plans) {
    console.log(`\n${prefix}${doc._id} — 항목 ${itemCount(changes)}건 · 필드 ${changes.length}개`)
    for (const c of changes) {
      console.log(`  ${c.path}`)
      console.log(`    전: "${c.en}"`)
      console.log(`    후: { en: "${c.en}", ko: "${c.ko}" }`)
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
