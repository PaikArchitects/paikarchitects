// src/lib/projectMeta.ts

/** SIZE 라벨 파생 — 값의 순수 함수. Career 엑셀 Size 열은 면적·러닝타임·판형을 모두 담는다 */
export function sizeLabel(size: string): string {
  if (/\d\s*(min|sec)\b/i.test(size)) return 'LENGTH'
  if (/㎡|m²|sqm/i.test(size)) return 'AREA'
  return 'SIZE'
}

/** ROLE 분해 — "직위 (업무1, 업무2)" → { position, tasks }. 괄호 없으면 전체를 직위로 */
export function splitRole(role: string): { position: string; tasks: string } {
  const m = role.match(/^([^(]+)\((.+)\)\s*$/)
  if (!m) return { position: role.trim(), tasks: '' }
  return { position: m[1].trim(), tasks: m[2].trim() }
}
