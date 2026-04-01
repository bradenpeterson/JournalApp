import { NextResponse } from 'next/server'

import { MAX_CAPSULE_DELAY_MS, isRedisConfigured, scheduleCapsuleUnlockJob } from '@/lib/bullmq/time-capsule-queue'
import { getSupabaseAuthContext } from '@/lib/db/supabase-auth-context'

const DEFAULT_BODY = { type: 'doc', content: [] } as const

type CapsuleRow = {
  id: string
  user_id: string
  title: string
  body: unknown
  unlock_at: string
  is_unlocked: boolean
  notification_sent: boolean
  bull_job_id: string | null
  created_at: string
}

function toPublicListItem(row: CapsuleRow) {
  const base = {
    id: row.id,
    title: row.title,
    unlock_at: row.unlock_at,
    is_unlocked: row.is_unlocked,
    created_at: row.created_at,
  }
  if (row.is_unlocked) {
    return { ...base, body: row.body }
  }
  return base
}

function toPublicFull(row: CapsuleRow) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    unlock_at: row.unlock_at,
    is_unlocked: row.is_unlocked,
    notification_sent: row.notification_sent,
    created_at: row.created_at,
  }
}

export async function GET() {
  const ctx = await getSupabaseAuthContext()
  if (!ctx.ok) return ctx.response

  const { supabase } = ctx

  const { data, error } = await supabase
    .from('time_capsules')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('GET /api/capsules', error)
    return NextResponse.json({ error: 'Failed to load capsules' }, { status: 500 })
  }

  const rows = (data ?? []) as CapsuleRow[]
  return NextResponse.json(rows.map(toPublicListItem))
}

export async function POST(req: Request) {
  const ctx = await getSupabaseAuthContext()
  if (!ctx.ok) return ctx.response

  if (!isRedisConfigured()) {
    return NextResponse.json(
      { error: 'Time capsules require REDIS_URL to schedule unlock jobs' },
      { status: 503 },
    )
  }

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (typeof json !== 'object' || json === null) {
    return NextResponse.json({ error: 'Expected JSON object' }, { status: 400 })
  }

  const b = json as Record<string, unknown>
  const title = typeof b.title === 'string' && b.title.trim() ? b.title.trim() : 'Untitled'
  const body = b.body !== undefined ? b.body : DEFAULT_BODY
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'body must be a JSON object' }, { status: 400 })
  }

  if (typeof b.unlock_at !== 'string' || !b.unlock_at.trim()) {
    return NextResponse.json({ error: 'unlock_at must be an ISO 8601 date string' }, { status: 400 })
  }

  const unlockAt = new Date(b.unlock_at.trim())
  if (Number.isNaN(unlockAt.getTime())) {
    return NextResponse.json({ error: 'unlock_at is not a valid date' }, { status: 400 })
  }

  const delayMs = Math.max(0, unlockAt.getTime() - Date.now())
  if (delayMs > MAX_CAPSULE_DELAY_MS) {
    return NextResponse.json(
      { error: `unlock_at is too far in the future (max ${MAX_CAPSULE_DELAY_MS} ms delay)` },
      { status: 400 },
    )
  }

  const { supabase, dbUserId } = ctx

  const { data: row, error: insError } = await supabase
    .from('time_capsules')
    .insert({
      user_id: dbUserId,
      title,
      body,
      unlock_at: unlockAt.toISOString(),
      is_unlocked: false,
      notification_sent: false,
      bull_job_id: null,
    })
    .select('*')
    .single()

  if (insError || !row) {
    console.error('POST /api/capsules insert', insError)
    return NextResponse.json({ error: 'Failed to create capsule' }, { status: 500 })
  }

  const capsule = row as CapsuleRow

  try {
    const jobId = await scheduleCapsuleUnlockJob(capsule.id, delayMs)
    const { error: upError } = await supabase
      .from('time_capsules')
      .update({ bull_job_id: jobId })
      .eq('id', capsule.id)

    if (upError) {
      console.error('POST /api/capsules bull_job_id update', upError)
      await supabase.from('time_capsules').delete().eq('id', capsule.id)
      return NextResponse.json({ error: 'Failed to schedule unlock job' }, { status: 500 })
    }

    const created: CapsuleRow = { ...capsule, bull_job_id: jobId }
    return NextResponse.json(toPublicFull(created), { status: 201 })
  } catch (e) {
    console.error('POST /api/capsules queue', e)
    await supabase.from('time_capsules').delete().eq('id', capsule.id)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to schedule unlock job' },
      { status: 503 },
    )
  }
}
