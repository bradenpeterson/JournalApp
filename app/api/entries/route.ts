import { NextResponse } from 'next/server'

import { getSupabaseAuthContext } from '@/lib/db/supabase-auth-context'
import { wordCountFromPlainText } from '@/lib/utils/wordCount'

const DEFAULT_BODY = { type: 'doc', content: [] } as const

export async function GET(req: Request) {
  const ctx = await getSupabaseAuthContext()
  if (!ctx.ok) return ctx.response

  const { supabase } = ctx
  const search = new URL(req.url).searchParams.get('search')?.trim() ?? ''

  let q = supabase.from('entries').select('*').order('updated_at', { ascending: false })

  if (search) {
    q = q.textSearch('fts', search, { type: 'websearch', config: 'english' })
  }

  const { data, error } = await q
  if (error) {
    console.error('GET /api/entries', error)
    return NextResponse.json({ error: 'Failed to load entries' }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const ctx = await getSupabaseAuthContext()
  if (!ctx.ok) return ctx.response

  const { supabase, dbUserId } = ctx

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
  const title = typeof b.title === 'string' ? b.title : 'Untitled'
  const body = b.body !== undefined ? b.body : DEFAULT_BODY
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'body must be a JSON object' }, { status: 400 })
  }

  const bodyText = typeof b.body_text === 'string' ? b.body_text : ''
  const wordCount =
    typeof b.word_count === 'number' && Number.isFinite(b.word_count)
      ? Math.max(0, Math.floor(b.word_count))
      : wordCountFromPlainText(bodyText)

  const { data, error } = await supabase
    .from('entries')
    .insert({
      user_id: dbUserId,
      title,
      body,
      body_text: bodyText,
      word_count: wordCount,
    })
    .select()
    .single()

  if (error) {
    console.error('POST /api/entries', error)
    return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
