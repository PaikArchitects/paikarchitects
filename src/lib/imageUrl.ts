/** 데스크톱 월 썸네일 — cldThumb 대체 */
export function sanityThumb(src: string, width = 480): string {
  if (!src.includes('cdn.sanity.io')) return src
  return `${src}?w=${width}&q=75&auto=format`
}

/**
 * 그리드 카드 4:3 크롭 (GRID_CONTENT_v3 §4-2).
 * hotspot이 있으면 초점 크롭(fp), 없으면 중앙 크롭. CSS object-fit으로 이중 크롭하지 않는다.
 *
 * GridExperience의 카드 <img>와 GridContentArea의 morph 하위 레이어가 **같은 URL**을 써야
 * 캐시 히트로 진입 깜빡임이 사라진다(GRID_MORPH_fix 작업 ①). 두 파일이 한 함수를 공유하도록
 * 여기로 올렸다 — GridExperience는 GridContentArea를 import하므로 역방향 import는 순환이다.
 * 인자(width 800·hotspot)가 한쪽만 바뀌면 캐시가 어긋나므로 호출부를 함께 볼 것.
 */
export function gridThumb43(
  src: string,
  width: number,
  hotspot?: { x: number; y: number },
): string {
  if (!src.includes('cdn.sanity.io')) return src
  const h = Math.round((width * 3) / 4)
  const fp = hotspot ? `&crop=focalpoint&fp-x=${hotspot.x}&fp-y=${hotspot.y}` : ''
  return `${src}?w=${width}&h=${h}&fit=crop${fp}&q=75&auto=format`
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
