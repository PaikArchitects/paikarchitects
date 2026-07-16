/**
 * 슬라이드 필드 로케일 마이그레이션 (1회성) — MIGRATE_SLIDE_LOCALE_SPEC_260716.md
 *
 *   imageSlide.caption      string → { _type: 'localeString', en }
 *   diagramItem.label       string → { _type: 'localeString', en }
 *   diagramItem.description string → { _type: 'localeText', en }
 *   textSlide.body          block[] → { _type: 'localePortableText', en: block[] }
 *
 * 실행 (먼저 --dry-run으로 확인할 것):
 *   npx tsx --env-file=.env.local scripts/migrate-slide-locales.ts --dry-run
 *   npx tsx --env-file=.env.local scripts/migrate-slide-locales.ts
 *
 * --env-file 없이 실행하면 .env.local이 로드되지 않는다 (tsx는 자동 로드하지 않음).
 * 토큰은 .env.local의 SANITY_API_TOKEN — Editor 이상 권한 필요.
 * ko는 설정하지 않는다 (en 필수·ko 선택 계약). 한글은 이후 Studio에서 수동 입력.
 * 이미 신형({en})인 필드와 빈 값은 건너뛴다 — 재실행해도 안전하다.
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

type Unknown = Record<string, unknown>

interface RawDoc {
  _id: string
  title?: { en?: string } | string | null
  slides?: Unknown[] | null
}

/** 변환 예정/완료 1건 */
interface Change {
  docId: string
  docTitle: string
  slideIndex: number
  itemIndex?: number
  field: string
  preview: string
}

const isObject = (v: unknown): v is Unknown =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** 신형 판별 — 값이 객체(배열 아님)이고 en 키를 가진다. caption/label/description/body 공통 */
const isNewLocale = (v: unknown): boolean => isObject(v) && 'en' in v

/** 구형 문자열 판별 — 값이 있는 문자열만 대상. 빈 값은 건드리지 않는다 */
const isOldString = (v: unknown): v is string => typeof v === 'string' && v.trim() !== ''

/**
 * 구형 Portable Text 판별 — body는 구형이 배열, 신형이 객체라 판별이 반대다.
 * 배열이면서 항목이 있으면 구형. isNewLocale로 신형을 먼저 걸러낸 뒤 호출한다.
 */
const isOldPortableText = (v: unknown): v is Unknown[] => Array.isArray(v) && v.length > 0

const clip = (s: string, n = 40): string =>
  s.length > n ? `${s.slice(0, n)}…` : s

/** 블록 배열에서 미리보기 텍스트 추출 (_key 등은 건드리지 않음 — 출력용) */
function portableTextPreview(blocks: Unknown[]): string {
  return blocks
    .map((b) => {
      const children = (b as { children?: { text?: string }[] }).children
      return Array.isArray(children) ? children.map((c) => c.text ?? '').join('') : ''
    })
    .join(' ')
    .trim()
}

async function fetchDocs(): Promise<RawDoc[]> {
  // 드래프트 포함 — migrate-title.ts와 동일. Studio 미발행 편집본도 함께 이전한다
  return client.fetch<RawDoc[]>(`*[_type == "project"]{ _id, title, slides }`)
}

const docLabel = (d: RawDoc): string => {
  const t = d.title
  const en = typeof t === 'string' ? t : t?.en
  return en ?? d._id
}

/**
 * 슬라이드 1건 변환. 변경이 있으면 새 객체를, 없으면 원본을 그대로 반환한다.
 * _key를 포함한 그 외 모든 속성은 스프레드로 보존된다.
 */
function convertSlide(
  slide: Unknown,
  ctx: { docId: string; docTitle: string; slideIndex: number },
  changes: Change[]
): { slide: Unknown; changed: boolean } {
  const type = slide._type
  let changed = false
  const next: Unknown = { ...slide }

  const record = (field: string, preview: string, itemIndex?: number) => {
    changes.push({ ...ctx, itemIndex, field, preview: clip(preview) })
    changed = true
  }

  if (type === 'imageSlide') {
    const { caption } = next
    if (!isNewLocale(caption) && isOldString(caption)) {
      next.caption = { _type: 'localeString', en: caption }
      record('caption', caption)
    }
  }

  if (type === 'diagramSetSlide') {
    const items = next.items
    if (Array.isArray(items)) {
      const nextItems = items.map((raw, itemIndex) => {
        if (!isObject(raw)) return raw
        const item: Unknown = { ...raw } // _key 보존
        const { label, description } = item

        if (!isNewLocale(label) && isOldString(label)) {
          item.label = { _type: 'localeString', en: label }
          record('label', label, itemIndex)
        }
        if (!isNewLocale(description) && isOldString(description)) {
          item.description = { _type: 'localeText', en: description }
          record('description', description, itemIndex)
        }
        return item
      })
      if (changed) next.items = nextItems
    }
  }

  if (type === 'textSlide') {
    // 주의: body는 구형이 배열, 신형이 객체 — 판별이 다른 필드와 반대다
    const { body } = next
    if (!isNewLocale(body) && isOldPortableText(body)) {
      next.body = { _type: 'localePortableText', en: body } // 블록 내부 _key 보존
      record('body', `[${body.length} blocks] ${portableTextPreview(body)}`)
    }
  }

  if (type === 'quoteSlide') {
    // 명세 집계상 구형 0건이나, 스키마가 localeString이므로 방어적으로 동일 규칙 적용
    const { text } = next
    if (!isNewLocale(text) && isOldString(text)) {
      next.text = { _type: 'localeString', en: text }
      record('text', text)
    }
  }

  return { slide: changed ? next : slide, changed }
}

/** 잔존 집계 — 구형/신형 건수를 필드별로 센다 */
function tally(docs: RawDoc[]) {
  const stats = {
    caption: { old: 0, new: 0 },
    label: { old: 0, new: 0 },
    description: { old: 0, new: 0 },
    body: { old: 0, new: 0 },
    text: { old: 0, new: 0 },
  }
  const count = (key: keyof typeof stats, v: unknown, oldTest: (x: unknown) => boolean) => {
    if (isNewLocale(v)) stats[key].new++
    else if (oldTest(v)) stats[key].old++
  }

  for (const d of docs) {
    for (const slide of d.slides ?? []) {
      if (!isObject(slide)) continue
      if (slide._type === 'imageSlide') count('caption', slide.caption, isOldString)
      if (slide._type === 'textSlide') count('body', slide.body, isOldPortableText)
      if (slide._type === 'quoteSlide') count('text', slide.text, isOldString)
      if (slide._type === 'diagramSetSlide' && Array.isArray(slide.items)) {
        for (const item of slide.items) {
          if (!isObject(item)) continue
          count('label', item.label, isOldString)
          count('description', item.description, isOldString)
        }
      }
    }
  }
  return stats
}

async function main() {
  const docs = await fetchDocs()
  const changes: Change[] = []
  const patches: { id: string; slides: Unknown[] }[] = []

  for (const d of docs) {
    const slides = d.slides
    if (!Array.isArray(slides)) continue

    let docChanged = false
    const newSlides = slides.map((slide, slideIndex) => {
      if (!isObject(slide)) return slide
      const r = convertSlide(
        slide,
        { docId: d._id, docTitle: docLabel(d), slideIndex },
        changes
      )
      if (r.changed) docChanged = true
      return r.slide
    })

    if (docChanged) patches.push({ id: d._id, slides: newSlides })
  }

  const before = tally(docs)
  console.log(
    `${DRY_RUN ? '[DRY RUN — 쓰기 없음] ' : ''}문서 ${docs.length}건 조회 — ` +
    `변환 대상 ${changes.length}건 / 문서 ${patches.length}개`
  )
  console.log(
    '  현재 구형 잔존: ' +
    Object.entries(before).map(([k, v]) => `${k} ${v.old}`).join(', ')
  )

  if (changes.length === 0) {
    console.log('변환할 필드가 없습니다. (이미 전부 신형이거나 빈 값)')
    return
  }

  let lastDoc = ''
  for (const c of changes) {
    if (c.docId !== lastDoc) {
      console.log(`\n  ${c.docTitle}  (${c.docId})`)
      lastDoc = c.docId
    }
    const at = c.itemIndex === undefined
      ? `slides[${c.slideIndex}]`
      : `slides[${c.slideIndex}].items[${c.itemIndex}]`
    console.log(`    ${at}.${c.field}  ←  "${c.preview}"`)
  }

  if (DRY_RUN) {
    console.log(`\n[DRY RUN] 위 ${changes.length}건이 변환될 예정입니다. 실제 쓰기는 하지 않았습니다.`)
    console.log('실행하려면 --dry-run 없이 다시 실행하십시오.')
    return
  }

  let tx = client.transaction()
  for (const p of patches) {
    tx = tx.patch(p.id, (patch) => patch.set({ slides: p.slides }))
  }
  await tx.commit()
  console.log(`\n${patches.length}개 문서 patch 완료.`)

  // 검증 — 전체 재조회해 신형/구형 건수 집계
  const after = tally(await fetchDocs())
  const totalNew = Object.values(after).reduce((s, v) => s + v.new, 0)
  const totalOld = Object.values(after).reduce((s, v) => s + v.old, 0)
  console.log('\n검증 — 재조회 결과:')
  for (const [k, v] of Object.entries(after)) {
    console.log(`  ${k.padEnd(12)} 신형 ${v.new}건 / 구형 잔존 ${v.old}건`)
  }
  console.log(`  ${'합계'.padEnd(11)} 신형 ${totalNew}건 / 구형 잔존 ${totalOld}건`)

  if (totalOld > 0) {
    console.warn('\n경고 — 구형 필드가 남아 있습니다. 재실행하거나 원인을 확인하십시오.')
    process.exit(1)
  }
  console.log('\n검증 통과 — 구형 잔존 0. Vercel에서 9ee768c를 Redeploy 하십시오.')
}

main().catch((e) => { console.error(e); process.exit(1) })
