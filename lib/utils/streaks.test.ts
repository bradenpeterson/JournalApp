/**
 * Run: `npx tsx lib/utils/streaks.test.ts`
 */
import assert from 'node:assert/strict'

import {
  addUtcDays,
  computeStreaksFromCreatedAt,
  currentWritingStreak,
  longestStreak,
  toUtcDateKey,
} from './streaks'

function ok(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok — ${name}`)
  } catch (e) {
    console.error(`fail — ${name}`, e)
    process.exitCode = 1
  }
}

ok('toUtcDateKey uses UTC calendar date', () => {
  assert.equal(toUtcDateKey('2026-03-15T23:00:00.000Z'), '2026-03-15')
  assert.equal(toUtcDateKey('2026-03-15T01:00:00.000-05:00'), '2026-03-15')
})

ok('addUtcDays', () => {
  assert.equal(addUtcDays('2026-03-10', 1), '2026-03-11')
  assert.equal(addUtcDays('2026-03-01', -1), '2026-02-28')
})

ok('longestStreak gap and merge', () => {
  assert.equal(longestStreak(['2026-03-01', '2026-03-02', '2026-03-03']), 3)
  assert.equal(longestStreak(['2026-03-01', '2026-03-03']), 1)
  assert.equal(longestStreak([]), 0)
})

ok('currentWritingStreak with fixed now', () => {
  const now = new Date('2026-03-15T12:00:00.000Z')
  assert.equal(currentWritingStreak(['2026-03-15', '2026-03-14', '2026-03-13'], now), 3)
  assert.equal(currentWritingStreak(['2026-03-14', '2026-03-13'], now), 2)
  assert.equal(currentWritingStreak(['2026-03-13', '2026-03-12'], now), 0)
})

ok('computeStreaksFromCreatedAt', () => {
  const now = new Date('2026-03-15T12:00:00.000Z')
  const isos = ['2026-03-15T10:00:00.000Z', '2026-03-14T08:00:00.000Z']
  const { currentStreak, longestStreak: longest } = computeStreaksFromCreatedAt(isos, now)
  assert.equal(currentStreak, 2)
  assert.equal(longest, 2)
})

if (process.exitCode !== 1) {
  console.log('\nAll streaks checks passed.')
}
