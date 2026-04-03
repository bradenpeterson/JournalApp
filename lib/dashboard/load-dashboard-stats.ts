import 'server-only'

import { auth } from '@clerk/nextjs/server'

import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import { computeStreaksFromCreatedAt } from '@/lib/utils/streaks'

export type DashboardStats = {
  totalEntries: number
  totalWordCount: number
  currentStreak: number
  longestStreak: number
}

const empty: DashboardStats = {
  totalEntries: 0,
  totalWordCount: 0,
  currentStreak: 0,
  longestStreak: 0,
}

export async function loadDashboardStats(): Promise<DashboardStats> {
  const { userId } = await auth()
  if (!userId) return { ...empty }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.from('entries').select('created_at, word_count')

  if (error) {
    console.error('loadDashboardStats', error)
    return { ...empty }
  }

  const rows = data ?? []
  const totalEntries = rows.length
  const totalWordCount = rows.reduce((sum, r) => sum + (typeof r.word_count === 'number' ? r.word_count : 0), 0)
  const createdAtList = rows
    .map((r) => (typeof r.created_at === 'string' ? r.created_at : ''))
    .filter(Boolean)

  const { currentStreak, longestStreak } = computeStreaksFromCreatedAt(createdAtList)

  return {
    totalEntries,
    totalWordCount,
    currentStreak,
    longestStreak,
  }
}
