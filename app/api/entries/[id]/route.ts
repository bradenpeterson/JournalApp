import { NextResponse } from 'next/server'

import { getSupabaseAuthContext } from '@/lib/db/supabase-auth-context'
import { reconcileEntryImagesForSavedBody } from '@/lib/uploads/reconcile-entry-images'
import { isUuid } from '@/lib/utils/uuid'
import { wordCountFromPlainText } from '@/lib/utils/wordCount'

type MoodRow = {
  id: string
  entry_id: string
  user_id: string
  mood_label: string
  score: number
  summary: string | null
  prompt_suggestion: string | null
  created_at: string
}

type EntryRowWithMoods = {
  id: string
  user_id: string
  title: string
  body: unknown
  body_text: string | null
  word_count: number
  created_at: string
  updated_at: string
  mood_analyses: MoodRow[] | null
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const authCtx = await getSupabaseAuthContext()
  if (!authCtx.ok) return authCtx.response

  const { id } = await ctx.params
  if (!isUuid(id)) {
    return NextResponse.json({ error: 'Invalid entry id' }, { status: 400 })
  }

  const { supabase } = authCtx

  const { data, error } = await supabase
    .from('entries')
    .select('*, mood_analyses(*)')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('GET /api/entries/[id]', error)
    return NextResponse.json({ error: 'Failed to load entry' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
  }

  const row = data as EntryRowWithMoods
  const { mood_analyses: moodRows, ...entry } = row

  return NextResponse.json({
    ...entry,
    mood_analysis: (moodRows ?? [])[0] ?? null,
  })
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const authCtx = await getSupabaseAuthContext()
  if (!authCtx.ok) return authCtx.response

  const { id } = await ctx.params
  if (!isUuid(id)) {
    return NextResponse.json({ error: 'Invalid entry id' }, { status: 400 })
  }

  const { supabase } = authCtx

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
  const patch: Record<string, unknown> = {}

  if ('title' in b) {
    if (typeof b.title !== 'string') {
      return NextResponse.json({ error: 'title must be a string' }, { status: 400 })
    }
    patch.title = b.title
  }
  if ('body' in b) {
    if (typeof b.body !== 'object' || b.body === null) {
      return NextResponse.json({ error: 'body must be a JSON object' }, { status: 400 })
    }
    patch.body = b.body
  }
  if ('body_text' in b) {
    if (typeof b.body_text !== 'string') {
      return NextResponse.json({ error: 'body_text must be a string' }, { status: 400 })
    }
    patch.body_text = b.body_text
  }
  if ('word_count' in b) {
    if (typeof b.word_count !== 'number' || !Number.isFinite(b.word_count)) {
      return NextResponse.json({ error: 'word_count must be a number' }, { status: 400 })
    }
    patch.word_count = Math.max(0, Math.floor(b.word_count))
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  if ('body_text' in patch && !('word_count' in patch)) {
    patch.word_count = wordCountFromPlainText(patch.body_text as string)
  }

  const { data, error } = await supabase
    .from('entries')
    .update(patch)
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error) {
    console.error('PATCH /api/entries/[id]', error)
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
  }

  if ('body' in patch) {
    await reconcileEntryImagesForSavedBody(supabase, id, patch.body)
  }

  return NextResponse.json(data)
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const authCtx = await getSupabaseAuthContext()
  if (!authCtx.ok) return authCtx.response

  const { id } = await ctx.params
  if (!isUuid(id)) {
    return NextResponse.json({ error: 'Invalid entry id' }, { status: 400 })
  }

  const { supabase } = authCtx

  const { data, error } = await supabase
    .from('entries')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('DELETE /api/entries/[id]', error)
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
  }

  return new NextResponse(null, { status: 204 })
}
