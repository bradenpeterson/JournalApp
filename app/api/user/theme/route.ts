import { NextResponse } from 'next/server'

import { getSupabaseAuthContext } from '@/lib/db/supabase-auth-context'
import {
  DEFAULT_THEME_PREFERENCE,
  isThemePreference,
  type ThemePreference,
} from '@/lib/theme/constants'

export async function GET() {
  const ctx = await getSupabaseAuthContext()
  if (!ctx.ok) return ctx.response

  const { supabase, dbUserId } = ctx
  const { data, error } = await supabase
    .from('users')
    .select('theme')
    .eq('id', dbUserId)
    .maybeSingle()

  if (error) {
    console.error('[user/theme GET]', error)
    return NextResponse.json({ error: 'Failed to load theme' }, { status: 500 })
  }

  const raw = data?.theme
  const theme: ThemePreference = isThemePreference(raw) ? raw : DEFAULT_THEME_PREFERENCE

  return NextResponse.json({ theme })
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

  if (!body || typeof body !== 'object' || !('theme' in body)) {
    return NextResponse.json({ error: 'Missing theme' }, { status: 400 })
  }

  const theme = (body as { theme: unknown }).theme
  if (!isThemePreference(theme)) {
    return NextResponse.json({ error: 'theme must be light, dark, or system' }, { status: 400 })
  }

  const { supabase, dbUserId } = ctx
  const { error } = await supabase.from('users').update({ theme }).eq('id', dbUserId)

  if (error) {
    console.error('[user/theme PATCH]', error)
    return NextResponse.json({ error: 'Failed to save theme' }, { status: 500 })
  }

  return NextResponse.json({ theme })
}
