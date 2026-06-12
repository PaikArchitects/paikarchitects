/** Cloudinary 전송 URL에 on-the-fly 변환 파라미터 삽입. 비-Cloudinary 경로는 원본 반환 */
export function cldThumb(src: string, width = 480): string {
  return src.includes('/upload/')
    ? src.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`)
    : src
}

/**
 * 모바일 카드용 3:2 크롭. 비-Cloudinary 경로는 원본 반환.
 * g_auto = 자동 주제 중심 크롭 — Sanity 이관 시 hotspot 필드로 승계 예정.
 */
export function cldCard(src: string, width = 800): string {
  return src.includes('/upload/')
    ? src.replace('/upload/', `/upload/f_auto,q_auto,w_${width},ar_3:2,c_fill,g_auto/`)
    : src
}
