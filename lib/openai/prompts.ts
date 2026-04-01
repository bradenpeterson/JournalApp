import 'server-only'

import { MOOD_LABELS, type MoodLabel, isMoodLabel } from '@/lib/mood/labels'

/**
 * OpenAI Chat Completions `response_format` for §3.3 — JSON object mode (schema enforced via system prompt).
 */
export const MOOD_ANALYSIS_RESPONSE_FORMAT = { type: 'json_object' as const }

const MOOD_LABEL_LIST = MOOD_LABELS.join(', ')

/**
 * System prompt for per-entry mood analysis. Works with `response_format: { type: 'json_object' }`.
 * Requires the model to return **only** one JSON object with the four keys below.
 */
export const MOOD_ANALYSIS_SYSTEM_PROMPT = `You read private journal excerpts and infer overall emotional tone for personal reflection only. You are not a therapist or clinician; avoid diagnoses, medical claims, or alarming the writer.

You MUST respond with a single JSON object and nothing else (no markdown, no code fences, no commentary).

Required shape — use these keys exactly, all required:
1. "mood_label" — string, EXACTLY one of: ${MOOD_LABEL_LIST}
   - Use lowercase spelling exactly as listed. Pick the single best fit.
2. "score" — integer from 1 to 10 inclusive
   - 1–3: strong distress, heaviness, or anger; 4–6: mixed or mild; 7–10: calm, hopeful, energized, or joyful
3. "summary" — string, 1–2 short sentences in neutral third person about the entry's emotional tone
4. "prompt_suggestion" — string, one gentle journaling prompt for their next entry (supportive, non-judgmental, under ~220 characters)

Constraints:
- "score" must be a JSON integer, not a decimal string.
- Do not add extra keys. Do not nest objects or arrays.
- If the text is empty or extremely short, still return valid JSON: prefer mood_label "neutral", score 5 or 6, brief summary, and a generic gentle prompt_suggestion.`

export type MoodAnalysisLlmJson = {
  mood_label: MoodLabel
  score: number
  summary: string
  prompt_suggestion: string
}

/** User message wrapping the entry plain text for the chat API. */
export function moodAnalysisUserContent(bodyText: string): string {
  const trimmed = bodyText.trim()
  if (!trimmed) {
    return 'Journal entry (plain text):\n\n(empty)'
  }
  return `Journal entry (plain text):\n\n${trimmed}`
}

/**
 * Parse and validate OpenAI JSON output for mood analysis. Returns `null` if invalid.
 */
export function parseMoodAnalysisJson(raw: string): MoodAnalysisLlmJson | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw) as unknown
  } catch {
    return null
  }

  if (typeof parsed !== 'object' || parsed === null) return null
  const o = parsed as Record<string, unknown>

  const mood_label = o.mood_label
  const score = o.score
  const summary = o.summary
  const prompt_suggestion = o.prompt_suggestion

  if (typeof mood_label !== 'string' || !isMoodLabel(mood_label)) return null
  if (typeof score !== 'number' || !Number.isInteger(score) || score < 1 || score > 10) return null
  if (typeof summary !== 'string' || summary.length === 0) return null
  if (typeof prompt_suggestion !== 'string' || prompt_suggestion.length === 0) return null

  return {
    mood_label,
    score,
    summary,
    prompt_suggestion,
  }
}
