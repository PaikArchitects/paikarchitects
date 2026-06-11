/** Cloudinary 전송 URL에 on-the-fly 변환 파라미터 삽입. 비-Cloudinary 경로는 원본 반환 */
export function cldThumb(src: string, width = 480): string {
  return src.includes('/upload/')
    ? src.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`)
    : src
}
