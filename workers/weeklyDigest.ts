import { Queue, Worker, type Job } from 'bullmq'
import type IORedis from 'ioredis'
import type OpenAI from 'openai'
import type { SupabaseClient } from '@supabase/supabase-js'

import { sendWeeklyDigestEmail } from '@/lib/email/send-weekly-digest'
import { createServiceRoleClient } from '@/lib/db/supabase-service-role'
import { getOpenAIClient } from '@/lib/openai/openai-client-core'
import {
  WEEKLY_DIGEST_RESPONSE_FORMAT,
  WEEKLY_DIGEST_SYSTEM_PROMPT,
  parseWeeklyDigestSummary,
  weeklyDigestUserMessage,
} from '@/lib/openai/weekly-digest-prompt'
import { type MoodLabel, isMoodLabel } from '@/lib/mood/labels'

import { QUEUE_WEEKLY_DIGEST } from './queue-names'

/** §4.3 — BullMQ job scheduler id (upsert is idempotent across restarts). */
export const WEEKLY_DIGEST_SCHEDULER_ID = 'weekly-digest-sunday-08-utc'

/** Every Sunday 08:00 UTC */
export const WEEKLY_DIGEST_CRON_PATTERN = '0 8 * * 0'

const JOB_NAME = 'run-weekly-digest'
const MODEL = 'gpt-4o-mini' as const
const PAGE_SIZE = 500
const BODY_PREVIEW = 800

type UserRow = { id: string; email: string; display_name: string | null }

type EntryWithMood = {
  id: string
  title: string
  body_text: string | null
  updated_at: string
  mood_analyses: unknown
}

function weekWindow() {
  const end = new Date()
  const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000)
  return {
    week_start: start.toISOString().slice(0, 10),
    week_end: end.toISOString().slice(0, 10),
    sinceIso: start.toISOString(),
  }
}

function firstMood(row: EntryWithMood) {
  const raw = row.mood_analyses
  if (!Array.isArray(raw) || raw.length === 0) return null
  const m = raw[0] as Record<string, unknown>
  if (typeof m.score !== 'number' || typeof m.mood_label !== 'string') return null
  return {
    score: m.score,
    mood_label: m.mood_label,
    summary: typeof m.summary === 'string' ? m.summary : null,
  }
}

function averageScore(scores: number[]): number {
  if (scores.length === 0) return 5
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length
  return Math.round(mean * 10) / 10
}

function topMoodFromLabels(labels: string[]): MoodLabel {
  const valid = labels.filter((l): l is MoodLabel => isMoodLabel(l))
  if (valid.length === 0) return 'neutral'
  const counts = new Map<MoodLabel, number>()
  for (const l of valid) {
    counts.set(l, (counts.get(l) ?? 0) + 1)
  }
  let best: MoodLabel = 'neutral'
  let bestN = -1
  for (const [label, n] of counts) {
    if (n > bestN || (n === bestN && label < best)) {
      best = label
      bestN = n
    }
  }
  return best
}

async function fetchAllUsers(supabase: SupabaseClient): Promise<UserRow[]> {
  const out: UserRow[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, display_name')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (error) throw error
    if (!data?.length) break
    out.push(...(data as UserRow[]))
    if (data.length < PAGE_SIZE) break
  }
  return out
}

function buildDigestBlock(entries: EntryWithMood[]): string {
  return entries
    .map((e, i) => {
      const mood = firstMood(e)
      const body = (e.body_text ?? '').replace(/\s+/g, ' ').trim()
      const clipped = body.length > BODY_PREVIEW ? `${body.slice(0, BODY_PREVIEW)}…` : body
      const moodLine = mood
        ? `Mood: ${mood.mood_label} (${mood.score}/10). Note: ${(mood.summary ?? '—').replace(/\s+/g, ' ').trim().slice(0, 200)}`
        : 'Mood: (no analysis for this entry)'
      return `--- Entry ${i + 1} (${e.updated_at}) — ${e.title?.trim() || 'Untitled'} ---\n${moodLine}\n${clipped || '(empty body)'}\n`
    })
    .join('\n')
}

async function processOneUser(
  supabase: SupabaseClient,
  openai: OpenAI,
  user: UserRow,
  bounds: ReturnType<typeof weekWindow>,
): Promise<void> {
  const { data: entries, error: entErr } = await supabase
    .from('entries')
    .select('id, title, body_text, updated_at, mood_analyses(score, mood_label, summary)')
    .eq('user_id', user.id)
    .gte('updated_at', bounds.sinceIso)
    .order('updated_at', { ascending: false })

  if (entErr) {
    throw new Error(`entries query: ${entErr.message}`)
  }

  const list = (entries ?? []) as EntryWithMood[]
  if (list.length === 0) return

  const scores: number[] = []
  const labels: string[] = []
  for (const e of list) {
    const m = firstMood(e)
    if (m) {
      scores.push(m.score)
      labels.push(m.mood_label)
    }
  }

  const avg_score = averageScore(scores)
  const top_mood = topMoodFromLabels(labels)
  const entry_count = list.length

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: WEEKLY_DIGEST_SYSTEM_PROMPT },
      { role: 'user', content: weeklyDigestUserMessage(buildDigestBlock(list)) },
    ],
    response_format: WEEKLY_DIGEST_RESPONSE_FORMAT,
  })

  const raw = completion.choices[0]?.message?.content?.trim()
  if (!raw) {
    throw new Error('empty completion')
  }

  const summary = parseWeeklyDigestSummary(raw)
  if (!summary) {
    throw new Error('invalid digest JSON')
  }

  const { error: upErr } = await supabase.from('weekly_insights').upsert(
    {
      user_id: user.id,
      week_start: bounds.week_start,
      week_end: bounds.week_end,
      summary,
      avg_score,
      entry_count,
      top_mood,
    },
    { onConflict: 'user_id,week_start' },
  )

  if (upErr) {
    throw new Error(`upsert weekly_insights: ${upErr.message}`)
  }

  const emailResult = await sendWeeklyDigestEmail({
    to: user.email,
    textBody: `${user.display_name?.trim() ? `Hi ${user.display_name.trim()},\n\n` : ''}${summary}\n\n— Journal`,
  })
  if (!emailResult.ok) {
    console.warn('[weekly-digest] email skipped', user.id, emailResult.reason)
  }
}

export async function runWeeklyDigestJob(job: Job): Promise<void> {
  console.info('[weekly-digest] job start', job.id, job.name)

  let supabase: SupabaseClient
  try {
    supabase = createServiceRoleClient()
  } catch (e) {
    console.error('[weekly-digest] Supabase env missing', e)
    return
  }

  const openai = getOpenAIClient()
  if (!openai) {
    console.warn('[weekly-digest] OPENAI_API_KEY missing — skipping run')
    return
  }

  let users: UserRow[]
  try {
    users = await fetchAllUsers(supabase)
  } catch (e) {
    console.error('[weekly-digest] failed to list users', e)
    throw e
  }

  const bounds = weekWindow()

  for (const user of users) {
    try {
      await processOneUser(supabase, openai, user, bounds)
    } catch (e) {
      console.error('[weekly-digest] user failed', user.id, e)
    }
  }

  console.info('[weekly-digest] job done', job.id)
}

/**
 * Registers the Sunday cron scheduler and the queue worker. Close `queue` on shutdown.
 */
export async function startWeeklyDigestWorker(shared: IORedis): Promise<{
  worker: Worker
  queue: Queue
}> {
  const queueConnection = shared.duplicate()
  const workerConnection = shared.duplicate()

  const queue = new Queue(QUEUE_WEEKLY_DIGEST, { connection: queueConnection })

  await queue.upsertJobScheduler(
    WEEKLY_DIGEST_SCHEDULER_ID,
    { pattern: WEEKLY_DIGEST_CRON_PATTERN, tz: 'UTC' },
    {
      name: JOB_NAME,
      data: {},
      opts: {
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 20 },
      },
    },
  )

  const worker = new Worker(QUEUE_WEEKLY_DIGEST, (job) => runWeeklyDigestJob(job), {
    connection: workerConnection,
  })

  console.info(
    '[weekly-digest] scheduler upserted:',
    WEEKLY_DIGEST_SCHEDULER_ID,
    WEEKLY_DIGEST_CRON_PATTERN,
    'UTC',
  )

  return { worker, queue }
}
