import { type MoodLabel, isMoodLabel } from '@/lib/mood/labels'

/** Point / legend colors for `MoodChart` (distinct, colorblind-ish friendly). */
export const MOOD_CHART_COLORS: Record<MoodLabel, string> = {
  joyful: '#ca8a04',
  content: '#16a34a',
  neutral: '#64748b',
  anxious: '#9333ea',
  sad: '#2563eb',
  angry: '#dc2626',
  reflective: '#7c3aed',
}

export function moodChartColor(label: string): string {
  return isMoodLabel(label) ? MOOD_CHART_COLORS[label] : '#94a3b8'
}
