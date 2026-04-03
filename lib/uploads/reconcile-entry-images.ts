import type { SupabaseClient } from '@supabase/supabase-js'

import {
  collectReferencedEntryImageIds,
  collectReferencedImageSrcUrls,
  entryImageRowStillReferenced,
} from '@/lib/editor/tiptap-body-images'
import { ENTRY_IMAGES_BUCKET } from '@/lib/uploads/entry-images'

/**
 * After `entries.body` is saved, remove `entry_images` rows (and Storage objects) for this entry
 * that are no longer referenced by id or image `src` in the Tiptap JSON.
 */
export async function reconcileEntryImagesForSavedBody(
  supabase: SupabaseClient,
  entryId: string,
  body: unknown
): Promise<void> {
  const refIds = collectReferencedEntryImageIds(body)
  const refSrcUrls = collectReferencedImageSrcUrls(body)

  const { data: rows, error } = await supabase
    .from('entry_images')
    .select('id, storage_path, public_url')
    .eq('entry_id', entryId)

  if (error) {
    console.error('[reconcile-entry-images] list', error)
    return
  }

  for (const raw of rows ?? []) {
    const row = raw as { id: string; storage_path: string; public_url: string }
    if (entryImageRowStillReferenced(row, refIds, refSrcUrls)) continue

    const { error: delErr } = await supabase.from('entry_images').delete().eq('id', row.id)
    if (delErr) {
      console.error('[reconcile-entry-images] delete row', row.id, delErr)
      continue
    }

    const { error: stErr } = await supabase.storage.from(ENTRY_IMAGES_BUCKET).remove([row.storage_path])
    if (stErr) {
      console.error('[reconcile-entry-images] storage remove (row deleted)', row.storage_path, stErr)
    }
  }
}
