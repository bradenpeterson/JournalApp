/**
 * Writing streaks — **day** definition (6.1)
 *
 * Each entry counts toward the **UTC calendar date** of its `created_at` timestamp
 * (`YYYY-MM-DD` in UTC). Streaks do **not** use the viewer’s local timezone; a write at
 * 11pm local time may fall on the next UTC day. To switch to user-local streaks later,
 * pass precomputed local date keys instead of ISO strings from this module’s helpers.
 *
 * **Current streak:** consecutive UTC days with at least one entry, anchored with a one-day
 * grace — if you did not write “today” UTC but did write “yesterday” UTC, the chain still
 * counts (habit apps often treat “today” as still open).
 */

/** `YYYY-MM-DD` in UTC for an ISO / Postgres timestamptz string. */
export function toUtcDateKey(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '1970-01-01'
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Add `delta` whole days to a UTC `YYYY-MM-DD` key. */
export function addUtcDays(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const next = new Date(Date.UTC(y, m - 1, d + delta))
  return toUtcDateKey(next.toISOString())
}

/** Longest run of consecutive UTC days present in `dayKeys`. */
export function longestStreak(dayKeys: readonly string[]): number {
  const sorted = [...new Set(dayKeys)].sort()
  if (sorted.length === 0) return 0
  let best = 1
  let run = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!
    const cur = sorted[i]!
    if (addUtcDays(prev, 1) === cur) {
      run++
      best = Math.max(best, run)
    } else {
      run = 1
    }
  }
  return best
}

/**
 * Streak of consecutive UTC days ending with a grace from `now` (default: real now).
 * Counts only days present in `dayKeys`. Broken if neither today nor yesterday UTC appears.
 */
export function currentWritingStreak(dayKeys: readonly string[], now: Date = new Date()): number {
  const keys = new Set(dayKeys)
  if (keys.size === 0) return 0
  const todayKey = toUtcDateKey(now.toISOString())
  const yesterdayKey = addUtcDays(todayKey, -1)
  if (!keys.has(todayKey) && !keys.has(yesterdayKey)) return 0
  let d = keys.has(todayKey) ? todayKey : yesterdayKey
  let count = 0
  while (keys.has(d)) {
    count++
    d = addUtcDays(d, -1)
  }
  return count
}

/**
 * Derive streaks from entry `created_at` ISO strings (multiple entries same day count once).
 * `now` is only for tests / deterministic “current” streak; omit in production.
 */
export function computeStreaksFromCreatedAt(
  isoDates: readonly string[],
  now?: Date,
): {
  currentStreak: number
  longestStreak: number
} {
  const dayKeys = isoDates.map(toUtcDateKey)
  return {
    currentStreak: currentWritingStreak(dayKeys, now),
    longestStreak: longestStreak(dayKeys),
  }
}
