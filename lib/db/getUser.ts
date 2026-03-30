import type { SupabaseClient } from '@supabase/supabase-js'

/** Resolve Clerk `userId` to the internal `users.id` UUID used as `entries.user_id`. */
export async function getSupabaseUserId(
  supabase: SupabaseClient,
  clerkUserId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', clerkUserId)
    .maybeSingle()

  if (error || !data) return null
  return data.id
}
