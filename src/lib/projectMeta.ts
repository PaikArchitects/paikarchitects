// src/lib/projectMeta.ts

/** 순수 숫자 판정 — 쉼표 구분·소수점 허용. 단위 없는 입력은 면적으로 간주한다 */
const BARE_NUMBER = /^[\d,]+(\.\d+)?$/

/** SIZE 라벨 파생 — 값의 순수 함수. Career 엑셀 Size 열은 면적·러닝타임·판형을 모두 담는다 */
export function sizeLabel(size: string): string {
  const s = size.trim()
  if (/\d\s*(min|sec)\b/i.test(s)) return 'LENGTH'
  if (/㎡|m²|sqm/i.test(s)) return 'AREA'
  if (BARE_NUMBER.test(s)) return 'AREA'
  return 'SIZE'
}

/** SIZE 값 파생 — 단위 없는 순수 숫자에 ㎡를 부착. 그 외는 원문 그대로 */
export function sizeValue(size: string): string {
  const s = size.trim()
  if (BARE_NUMBER.test(s)) return `${s} ㎡`
  return s
}

/** ROLE 분해 — "직위 (업무1, 업무2)" → { position, tasks }. 괄호 없으면 전체를 직위로 */
export function splitRole(role: string): { position: string; tasks: string } {
  const m = role.match(/^([^(]+)\((.+)\)\s*$/)
  if (!m) return { position: role.trim(), tasks: '' }
  return { position: m[1].trim(), tasks: m[2].trim() }
}
