import { NextResponse } from 'next/server'

import { removeCapsuleJobById } from '@/lib/bullmq/time-capsule-queue'
import { getSupabaseAuthContext } from '@/lib/db/supabase-auth-context'
import { isUuid } from '@/lib/utils/uuid'

type CapsuleRow = {
  id: string
  title: string
  body: unknown
  unlock_at: string
  is_unlocked: boolean
  notification_sent: boolean
  bull_job_id: string | null
  created_at: string
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const authCtx = await getSupabaseAuthContext()
  if (!authCtx.ok) return authCtx.response

  const { id } = await ctx.params
  if (!isUuid(id)) {
    return NextResponse.json({ error: 'Invalid capsule id' }, { status: 400 })
  }

  const { supabase } = authCtx

  const { data, error } = await supabase.from('time_capsules').select('*').eq('id', id).maybeSingle()

  if (error) {
    console.error('GET /api/capsules/[id]', error)
    return NextResponse.json({ error: 'Failed to load capsule' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Capsule not found' }, { status: 404 })
  }

  const row = data as CapsuleRow

  if (row.is_unlocked) {
    return NextResponse.json({
      id: row.id,
      title: row.title,
      body: row.body,
      unlock_at: row.unlock_at,
      is_unlocked: true,
      notification_sent: row.notification_sent,
      created_at: row.created_at,
    })
  }

  return NextResponse.json({
    id: row.id,
    title: row.title,
    unlock_at: row.unlock_at,
    is_unlocked: false,
    created_at: row.created_at,
  })
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const authCtx = await getSupabaseAuthContext()
  if (!authCtx.ok) return authCtx.response

  const { id } = await ctx.params
  if (!isUuid(id)) {
    return NextResponse.json({ error: 'Invalid capsule id' }, { status: 400 })
  }

  const { supabase } = authCtx

  const { data: row, error: loadError } = await supabase
    .from('time_capsules')
    .select('id, bull_job_id')
    .eq('id', id)
    .maybeSingle()

  if (loadError) {
    console.error('DELETE /api/capsules/[id] load', loadError)
    return NextResponse.json({ error: 'Failed to load capsule' }, { status: 500 })
  }

  if (!row) {
    return NextResponse.json({ error: 'Capsule not found' }, { status: 404 })
  }

  await removeCapsuleJobById((row as { bull_job_id: string | null }).bull_job_id)

  const { data: deleted, error: delError } = await supabase
    .from('time_capsules')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (delError) {
    console.error('DELETE /api/capsules/[id]', delError)
    return NextResponse.json({ error: 'Failed to delete capsule' }, { status: 500 })
  }

  if (!deleted) {
    return NextResponse.json({ error: 'Capsule not found' }, { status: 404 })
  }

  return new NextResponse(null, { status: 204 })
}
