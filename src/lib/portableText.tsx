import type { PortableTextBlock } from '@/types'

/**
 * localePortableText 한 언어분 렌더 — About POSITION 렌더러를 공용화한 것 (about/page.tsx에서 이관, 동작 동일).
 * 문단 단위 <p>, 서식 마크(strong·em)는 무시하고 텍스트만 잇는다.
 */
export function renderBlocks(blocks: PortableTextBlock[] | undefined) {
  if (!blocks || blocks.length === 0) return null
  return blocks.map((b, i) => (
    <p key={b._key ?? i} style={{ whiteSpace: 'pre-line' }}>
      {b.children?.map(c => c.text).join('') ?? ''}
    </p>
  ))
}
