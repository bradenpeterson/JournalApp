import 'server-only'

import { auth } from '@clerk/nextjs/server'

import { createSupabaseServerClient } from '@/lib/db/supabase-server'

export type AnalyticsMoodRow = {
  id: string
  score: number
  mood_label: string
  summary: string | null
  created_at: string
}

export type AnalyticsData = {
  analyses: AnalyticsMoodRow[]
  /** UTC date key `yyyy-mm-dd` → number of entries created that day. */
  entryCountByDay: Record<string, number>
}

const empty: AnalyticsData = { analyses: [], entryCountByDay: {} }

function utcDayKey(iso: string): string {
  try {
    return new Date(iso).toISOString().slice(0, 10)
  } catch {
    return ''
  }
}

export async function loadAnalyticsData(): Promise<AnalyticsData> {
  const { userId } = await auth()
  if (!userId) return { ...empty }

  const supabase = await createSupabaseServerClient()
  const since = new Date()
  since.setUTCDate(since.getUTCDate() - 90)
  const sinceIso = since.toISOString()

  const [analysesRes, entriesRes] = await Promise.all([
    supabase
      .from('mood_analyses')
      .select('id, score, mood_label, summary, created_at')
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: true }),
    supabase.from('entries').select('created_at').gte('created_at', sinceIso),
  ])

  if (analysesRes.error) {
    console.error('loadAnalyticsData mood_analyses', analysesRes.error)
  }
  if (entriesRes.error) {
    console.error('loadAnalyticsData entries', entriesRes.error)
  }

  const analyses = (analysesRes.data ?? []) as AnalyticsMoodRow[]
  const entryCountByDay: Record<string, number> = {}

  for (const row of entriesRes.data ?? []) {
    const raw = row && typeof row === 'object' && 'created_at' in row ? (row as { created_at: string }).created_at : ''
    const k = utcDayKey(raw)
    if (!k) continue
    entryCountByDay[k] = (entryCountByDay[k] ?? 0) + 1
  }

  return { analyses, entryCountByDay }
}
