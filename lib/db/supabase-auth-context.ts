import 'server-only'

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

import { getSupabaseUserId } from '@/lib/db/getUser'
import { createSupabaseServerClient } from '@/lib/db/supabase-server'

type UserSupabase = Awaited<ReturnType<typeof createSupabaseServerClient>>

export type SupabaseAuthContext =
  | { ok: true; supabase: UserSupabase; dbUserId: string }
  | { ok: false; response: NextResponse }

/**
 * Clerk session + Supabase client using the **user's Clerk JWT** (anon key + `accessToken`).
 * Postgres **RLS** applies — use for user-owned tables. Still resolves `dbUserId` for `POST` bodies.
 */
export async function getSupabaseAuthContext(): Promise<SupabaseAuthContext> {
  const { userId } = await auth()
  if (!userId) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const supabase = await createSupabaseServerClient()
  const dbUserId = await getSupabaseUserId(supabase, userId)
  if (!dbUserId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'User profile not found' }, { status: 404 }),
    }
  }

  return { ok: true, supabase, dbUserId }
}
