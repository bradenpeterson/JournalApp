import 'server-only'

import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * Supabase client for Server Components, Server Actions, and Route Handlers.
 * Sends the **default Clerk session token** on each request so Postgres RLS sees `auth.jwt()`.
 *
 * Use Clerk’s native Supabase integration (Dashboard → [Supabase setup](https://dashboard.clerk.com/setup/supabase)
 * → Activate). That adds `role: "authenticated"` to session tokens — a separate JWT template is not required
 * ([Clerk docs](https://clerk.com/docs/guides/development/integrations/databases/supabase)).
 */
export async function createSupabaseServerClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  const { getToken } = await auth()

  return createClient(supabaseUrl, supabaseAnonKey, {
    async accessToken() {
      return (await getToken()) ?? null
    },
  })
}
