/** Human-readable time until `unlockAt` ISO string; empty if already past. */
export function formatUnlockCountdown(unlockAtIso: string, nowMs: number): string {
  const target = new Date(unlockAtIso).getTime()
  const ms = target - nowMs
  if (ms <= 0) return ''
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${sec}s`
  if (m > 0) return `${m}m ${sec}s`
  return `${sec}s`
}
