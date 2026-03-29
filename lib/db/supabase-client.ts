'use client'

import { useSession } from '@clerk/nextjs'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { useMemo } from 'react'

import { CLERK_SUPABASE_JWT_TEMPLATE } from './clerk-supabase-constants'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Supabase client for Client Components, scoped to the signed-in user via Clerk's session token.
 * Prefer server-side `createSupabaseServerClient` when you can (secrets, simpler RLS story).
 */
export function useSupabaseClient(): SupabaseClient {
  const { session, isLoaded } = useSession()

  return useMemo(() => {
    return createClient(supabaseUrl, supabaseAnonKey, {
      async accessToken() {
        if (!isLoaded || !session) return null
        return (await session.getToken({ template: CLERK_SUPABASE_JWT_TEMPLATE })) ?? null
      },
    })
  }, [session, isLoaded])
}
