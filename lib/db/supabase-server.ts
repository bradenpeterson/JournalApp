import 'server-only'

import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

import { CLERK_SUPABASE_JWT_TEMPLATE } from './clerk-supabase-constants'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * Supabase client for Server Components, Server Actions, and Route Handlers.
 * Sends the current user's Clerk JWT on each request so Postgres RLS sees `auth.jwt()`.
 */
export async function createSupabaseServerClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  const { getToken } = await auth()

  return createClient(supabaseUrl, supabaseAnonKey, {
    async accessToken() {
      return (await getToken({ template: CLERK_SUPABASE_JWT_TEMPLATE })) ?? null
    },
  })
}
