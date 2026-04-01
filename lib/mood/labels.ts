/**
 * Allowed `mood_analyses.mood_label` values — must match DB CHECK and OpenAI schema (§3.2).
 * Order is not significant for storage; keep in sync with `mood_analyses_mood_label_check` migration.
 */
export const MOOD_LABELS = [
  'joyful',
  'content',
  'neutral',
  'anxious',
  'sad',
  'angry',
  'reflective',
] as const

export type MoodLabel = (typeof MOOD_LABELS)[number]

export function isMoodLabel(value: string): value is MoodLabel {
  return (MOOD_LABELS as readonly string[]).includes(value)
}
