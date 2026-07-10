/** 데스크톱 월 썸네일 — cldThumb 대체 */
export function sanityThumb(src: string, width = 480): string {
  if (!src.includes('cdn.sanity.io')) return src
  return `${src}?w=${width}&q=75&auto=format`
}

/** 모바일 카드 3:2 크롭 — cldCard 대체. hotspot 있으면 초점 크롭 */
export function sanityCard(
  src: string,
  width = 800,
  hotspot?: { x: number; y: number },
): string {
  if (!src.includes('cdn.sanity.io')) return src
  const h = Math.round((width * 2) / 3)
  const fp = hotspot ? `&crop=focalpoint&fp-x=${hotspot.x}&fp-y=${hotspot.y}` : ''
  return `${src}?w=${width}&h=${h}&fit=crop${fp}&q=75&auto=format`
}
