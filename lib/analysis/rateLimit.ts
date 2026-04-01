/**
 * In-memory rate limit for §3.3 mood analysis (max N calls per Clerk user per hour).
 * Per-process only — use Redis if you scale to multiple instances (see PLAN §3.3).
 */

const WINDOW_MS = 60 * 60 * 1000
const MAX_REQUESTS_PER_WINDOW = 10

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

/** @returns `true` if the request is allowed (and consumes one slot). */
export function consumeMoodAnalysisRateLimit(clerkUserId: string): boolean {
  const now = Date.now()
  const existing = buckets.get(clerkUserId)

  if (!existing || now >= existing.resetAt) {
    buckets.set(clerkUserId, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }

  if (existing.count >= MAX_REQUESTS_PER_WINDOW) {
    return false
  }

  existing.count += 1
  return true
}
