/**
 * Sanity 이관 스크립트 (2단계) — 코드 정본 → Sanity production dataset
 *
 * 원본: src/data/projects.ts (30건) + src/data/projectSlides.ts (슬라이드)
 * 대상: project document 30건. Cloudinary 이미지는 내려받아 Sanity 에셋으로 업로드.
 *
 * 실행: npx tsx scripts/migrate-to-sanity.ts
 * 필요 환경변수 (.env.local):
 *   NEXT_PUBLIC_SANITY_PROJECT_ID / NEXT_PUBLIC_SANITY_DATASET / SANITY_API_TOKEN(쓰기 권한)
 *
 * 재실행 안전: document는 createOrReplace(_id 고정), 에셋은 Sanity가 내용 해시로
 * 중복 제거하므로 여러 번 실행해도 중복이 생기지 않는다.
 * 이 스크립트는 사이트 코드 경로를 일절 변경하지 않는다 — 데이터 읽기 전환은 3단계.
 */

import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@sanity/client'
import { sortedProjects } from '../src/data/projects'
import { projectSlides } from '../src/data/projectSlides'
import type { ProjectSlide } from '../src/types'

// ── .env.local 판독 (dotenv 의존성 없이) ──

function loadEnvLocal(): void {
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2]
  }
}

loadEnvLocal()

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production'
const token = process.env.SANITY_API_TOKEN

if (!projectId) {
  throw new Error('NEXT_PUBLIC_SANITY_PROJECT_ID가 설정되지 않았습니다 (.env.local 확인)')
}
if (!token) {
  throw new Error('SANITY_API_TOKEN이 설정되지 않았습니다 (.env.local 확인 — Editor 이상 권한의 쓰기 토큰 필요)')
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2026-07-10',
  token,
  useCdn: false,
})

// ── 이미지 업로드 (URL → Sanity image asset, URL 단위 캐시) ──

interface SanityImageRef {
  _type: 'image'
  asset: { _type: 'reference'; _ref: string }
}

const assetCache = new Map<string, string>() // 원본 URL → asset _id
let uploadCount = 0

async function fetchWithRetry(url: string, attempts = 3): Promise<Buffer> {
  let lastError: unknown
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`)
      return Buffer.from(await res.arrayBuffer())
    } catch (err) {
      lastError = err
      if (i < attempts) await new Promise((r) => setTimeout(r, 1000 * i))
    }
  }
  throw lastError
}

async function uploadImage(url: string): Promise<SanityImageRef> {
  let assetId = assetCache.get(url)
  if (!assetId) {
    const buffer = await fetchWithRetry(url)
    const rawName = new URL(url).pathname.split('/').pop() ?? 'image'
    const filename = decodeURIComponent(rawName)
    const asset = await client.assets.upload('image', buffer, { filename })
    assetId = asset._id
    assetCache.set(url, assetId)
    uploadCount++
  }
  return { _type: 'image', asset: { _type: 'reference', _ref: assetId } }
}

// ── 슬라이드 변환 (ProjectSlide 유니언 → 스키마 object 3종) ──
// object 이름·필드는 sanity/schemaTypes/slides.ts 정의와 1:1 일치:
//   imageSlide { image, caption, diagram }
//   diagramSetSlide { items: diagramItem[{ image, label, description }], autoAdvanceMs }
//   creditsSlide { rows: creditRow[{ label, value }] }

async function buildSlides(slug: string, slides: ProjectSlide[]): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = []
  for (const [i, slide] of slides.entries()) {
    const key = `${slug}-slide-${i}`
    if (slide.kind === 'image') {
      out.push({
        _type: 'imageSlide',
        _key: key,
        image: await uploadImage(slide.src),
        ...(slide.caption ? { caption: slide.caption } : {}),
        diagram: slide.diagram ?? false,
      })
    } else if (slide.kind === 'diagramSet') {
      const items: Record<string, unknown>[] = []
      for (const [j, item] of slide.items.entries()) {
        items.push({
          _type: 'diagramItem',
          _key: `${key}-item-${j}`,
          image: await uploadImage(item.src),
          label: item.label,
          description: item.description,
        })
      }
      out.push({
        _type: 'diagramSetSlide',
        _key: key,
        items,
        autoAdvanceMs: slide.autoAdvanceMs ?? 3000,
      })
    } else {
      out.push({
        _type: 'creditsSlide',
        _key: key,
        rows: slide.rows.map((row, j) => ({
          _type: 'creditRow',
          _key: `${key}-row-${j}`,
          label: row.label,
          value: row.value,
        })),
      })
    }
  }
  return out
}

// ── 본 이관 ──

async function main(): Promise<void> {
  const startedAt = Date.now()
  const total = sortedProjects.length
  console.log(`Sanity 이관 시작 — project ${total}건 → ${projectId}/${dataset}\n`)

  let slideTotal = 0

  for (const [idx, p] of sortedProjects.entries()) {
    const uploadsBefore = uploadCount
    const coverImage = p.coverImage ? await uploadImage(p.coverImage) : undefined
    const slides = projectSlides[p.id]
    const slideDocs = slides ? await buildSlides(p.id, slides) : []
    slideTotal += slideDocs.length

    await client.createOrReplace({
      _id: `project-${p.id}`,
      _type: 'project',
      title: p.title,
      titleKr: p.titleKr,
      slug: { _type: 'slug', current: p.id },
      careerNo: p.careerNo,
      year: p.year,
      mainType: p.type,
      ...(p.subTypes?.length ? { subTypes: p.subTypes } : {}),
      status: p.status,
      result: p.result,
      featured: p.featured,
      displayOrder: p.displayOrder,
      ...(coverImage ? { coverImage } : {}),
      coverColor: p.coverColor,
      ...(p.location ? { location: p.location } : {}),
      ...(slideDocs.length ? { slides: slideDocs } : {}),
    })

    const n = String(idx + 1).padStart(2, ' ')
    const newUploads = uploadCount - uploadsBefore
    console.log(
      `[${n}/${total}] ${p.id} — 슬라이드 ${slideDocs.length}장, 신규 업로드 이미지 ${newUploads}컷` +
        (coverImage ? '' : ' (커버 없음 → coverColor)')
    )
  }

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1)
  console.log(`\n이관 완료 — document ${total}건 / 슬라이드 ${slideTotal}장 / 이미지 에셋 ${uploadCount}컷 업로드 (${elapsed}s)`)
}

main().catch((err) => {
  console.error('\n이관 실패:', err instanceof Error ? err.message : err)
  process.exit(1)
})
