import { NextResponse } from 'next/server'

import { getSupabaseAuthContext } from '@/lib/db/supabase-auth-context'

type NotificationPrefs = {
  notify_weekly_digest: boolean
  notify_capsule_unlock: boolean
}

function parseBool(v: unknown): boolean | null {
  if (typeof v === 'boolean') return v
  return null
}

export async function GET() {
  const ctx = await getSupabaseAuthContext()
  if (!ctx.ok) return ctx.response

  const { supabase, dbUserId } = ctx
  const { data, error } = await supabase
    .from('users')
    .select('notify_weekly_digest, notify_capsule_unlock')
    .eq('id', dbUserId)
    .maybeSingle()

  if (error) {
    console.error('[user/notifications GET]', error)
    return NextResponse.json({ error: 'Failed to load preferences' }, { status: 500 })
  }

  const row = data as {
    notify_weekly_digest?: boolean | null
    notify_capsule_unlock?: boolean | null
  } | null

  const prefs: NotificationPrefs = {
    notify_weekly_digest: row?.notify_weekly_digest !== false,
    notify_capsule_unlock: row?.notify_capsule_unlock !== false,
  }

  return NextResponse.json(prefs)
}

export async function PATCH(req: Request) {
  const ctx = await getSupabaseAuthContext()
  if (!ctx.ok) return ctx.response

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Expected JSON object' }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const patch: Partial<NotificationPrefs> = {}

  if ('notify_weekly_digest' in b) {
    const v = parseBool(b.notify_weekly_digest)
    if (v === null) {
      return NextResponse.json({ error: 'notify_weekly_digest must be boolean' }, { status: 400 })
    }
    patch.notify_weekly_digest = v
  }

  if ('notify_capsule_unlock' in b) {
    const v = parseBool(b.notify_capsule_unlock)
    if (v === null) {
      return NextResponse.json({ error: 'notify_capsule_unlock must be boolean' }, { status: 400 })
    }
    patch.notify_capsule_unlock = v
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { supabase, dbUserId } = ctx
  const { error } = await supabase.from('users').update(patch).eq('id', dbUserId)

  if (error) {
    console.error('[user/notifications PATCH]', error)
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 })
  }

  const { data: next } = await supabase
    .from('users')
    .select('notify_weekly_digest, notify_capsule_unlock')
    .eq('id', dbUserId)
    .maybeSingle()

  const row = next as {
    notify_weekly_digest?: boolean | null
    notify_capsule_unlock?: boolean | null
  } | null

  const prefs: NotificationPrefs = {
    notify_weekly_digest: row?.notify_weekly_digest !== false,
    notify_capsule_unlock: row?.notify_capsule_unlock !== false,
  }

  return NextResponse.json(prefs)
}
