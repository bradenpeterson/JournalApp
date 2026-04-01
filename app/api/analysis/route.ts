import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

import { consumeMoodAnalysisRateLimit } from '@/lib/analysis/rateLimit'
import { getSupabaseAuthContext } from '@/lib/db/supabase-auth-context'
import { getOpenAIClient } from '@/lib/openai/client'
import {
  MOOD_ANALYSIS_RESPONSE_FORMAT,
  MOOD_ANALYSIS_SYSTEM_PROMPT,
  moodAnalysisUserContent,
  parseMoodAnalysisJson,
} from '@/lib/openai/prompts'
import { isUuid } from '@/lib/utils/uuid'

const MODEL = 'gpt-4o-mini' as const

/**
 * §3.3 — Per-entry mood analysis (synchronous server model).
 * Awaits OpenAI + DB; clients may call without `await` to avoid blocking navigation.
 * Expected failures return **200** with `{ status: 'failed' }` so fire-and-forget `fetch` does not surface as a hard error.
 */
export async function POST(req: Request) {
  const ctx = await getSupabaseAuthContext()
  if (!ctx.ok) return ctx.response

  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

  const entryId = (json as Record<string, unknown>).entryId
  if (typeof entryId !== 'string' || !isUuid(entryId)) {
    return NextResponse.json({ error: 'entryId must be a valid UUID' }, { status: 400 })
  }

  const { supabase, dbUserId } = ctx

  const { data: entry, error: entryError } = await supabase
    .from('entries')
    .select('id, body_text')
    .eq('id', entryId)
    .maybeSingle()

  if (entryError) {
    console.error('POST /api/analysis entry load', entryError)
    return NextResponse.json({ status: 'failed', error: 'Failed to load entry' }, { status: 200 })
  }

  if (!entry) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
  }

  const openai = getOpenAIClient()
  if (!openai) {
    return NextResponse.json(
      { status: 'failed', error: 'OpenAI is not configured (missing OPENAI_API_KEY)' },
      { status: 503 }
    )
  }

  if (!consumeMoodAnalysisRateLimit(userId)) {
    return NextResponse.json(
      { status: 'failed', error: 'Rate limit exceeded (10 analyses per hour)' },
      { status: 429 }
    )
  }

  const bodyText = typeof entry.body_text === 'string' ? entry.body_text : ''

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: MOOD_ANALYSIS_SYSTEM_PROMPT },
        { role: 'user', content: moodAnalysisUserContent(bodyText) },
      ],
      response_format: MOOD_ANALYSIS_RESPONSE_FORMAT,
    })

    const raw = completion.choices[0]?.message?.content?.trim()
    if (!raw) {
      console.error('POST /api/analysis empty completion')
      return NextResponse.json({ status: 'failed' }, { status: 200 })
    }

    const parsed = parseMoodAnalysisJson(raw)
    if (!parsed) {
      console.error('POST /api/analysis invalid model JSON', raw.slice(0, 500))
      return NextResponse.json({ status: 'failed' }, { status: 200 })
    }

    const { error: delError } = await supabase.from('mood_analyses').delete().eq('entry_id', entryId)
    if (delError) {
      console.error('POST /api/analysis delete prior', delError)
      return NextResponse.json({ status: 'failed' }, { status: 200 })
    }

    const { data: row, error: insError } = await supabase
      .from('mood_analyses')
      .insert({
        entry_id: entryId,
        user_id: dbUserId,
        mood_label: parsed.mood_label,
        score: parsed.score,
        summary: parsed.summary,
        prompt_suggestion: parsed.prompt_suggestion,
      })
      .select()
      .single()

    if (insError || !row) {
      console.error('POST /api/analysis insert', insError)
      return NextResponse.json({ status: 'failed' }, { status: 200 })
    }

    return NextResponse.json({ status: 'ok', analysis: row })
  } catch (e) {
    console.error('POST /api/analysis pipeline', e)
    return NextResponse.json({ status: 'failed' }, { status: 200 })
  }
}
