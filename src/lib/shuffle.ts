// ── Fisher-Yates 셔플 — 공용 유틸 (감사 부채 B-1 소멸: 로컬 3본 단일화) ──
export function shuffle<T>(list: T[]): T[] {
  const out = list.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
