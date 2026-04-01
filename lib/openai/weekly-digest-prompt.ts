/**
 * §4.3 weekly digest — LLM output (stats are computed in the worker from DB).
 */
export const WEEKLY_DIGEST_RESPONSE_FORMAT = { type: 'json_object' as const }

export const WEEKLY_DIGEST_SYSTEM_PROMPT = `You write short, supportive weekly journal reflections for a private app. You are not a therapist; avoid diagnoses and clinical claims.

Respond with a single JSON object and nothing else (no markdown, no code fences).

Required keys:
- "summary" — string, 2–4 sentences in second person ("you") acknowledging patterns in the week with warmth. You may weave in one gentle "insight" or encouragement in the same string.

Do not include other keys.`

export function weeklyDigestUserMessage(block: string): string {
  return `Here is this user's journal activity for the past seven days (newest first). Each block may include a mood score (1–10) and a short AI mood note when available.

${block}

Write the JSON object now.`
}

/** Parse model JSON; returns summary text or null. */
export function parseWeeklyDigestSummary(raw: string): string | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw) as unknown
  } catch {
    return null
  }
  if (typeof parsed !== 'object' || parsed === null) return null
  const summary = (parsed as Record<string, unknown>).summary
  if (typeof summary !== 'string' || summary.trim().length === 0) return null
  return summary.trim()
}
