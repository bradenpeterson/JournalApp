import type { SupabaseClient } from '@supabase/supabase-js'

import {
  buildJournalJsonExport,
  type EntryExportRow,
  type JournalJsonExport,
} from '@/lib/export/build-export-payload'

export async function loadJournalExportPayload(
  supabase: SupabaseClient,
  dbUserId: string
): Promise<{ ok: true; payload: JournalJsonExport } | { ok: false; error: string }> {
  const { data: userRow, error: userErr } = await supabase
    .from('users')
    .select('id, email, display_name')
    .eq('id', dbUserId)
    .maybeSingle()

  if (userErr) {
    console.error('[export] users', userErr)
    return { ok: false, error: 'Failed to load user' }
  }

  if (!userRow) {
    return { ok: false, error: 'User not found' }
  }

  const { data: rows, error: entErr } = await supabase
    .from('entries')
    .select(
      `
      id,
      title,
      body_text,
      word_count,
      created_at,
      updated_at,
      mood_analyses ( id, score, mood_label, summary, created_at ),
      entry_images ( id, public_url, file_name, mime_type )
    `
    )
    .eq('user_id', dbUserId)
    .order('created_at', { ascending: true })

  if (entErr) {
    console.error('[export] entries', entErr)
    return { ok: false, error: 'Failed to load entries' }
  }

  const user = {
    id: userRow.id as string,
    email: userRow.email as string,
    display_name: (userRow.display_name as string | null) ?? null,
  }

  const payload = buildJournalJsonExport(user, (rows ?? []) as EntryExportRow[])
  return { ok: true, payload }
}
