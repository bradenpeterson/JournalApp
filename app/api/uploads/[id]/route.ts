import { NextResponse } from 'next/server'

import { getSupabaseAuthContext } from '@/lib/db/supabase-auth-context'
import { ENTRY_IMAGES_BUCKET } from '@/lib/uploads/entry-images'
import { isUuid } from '@/lib/utils/uuid'

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const authCtx = await getSupabaseAuthContext()
  if (!authCtx.ok) return authCtx.response

  const { id } = await ctx.params
  if (!isUuid(id)) {
    return NextResponse.json({ error: 'Invalid image id' }, { status: 400 })
  }

  const { supabase } = authCtx

  const { data: row, error: loadError } = await supabase
    .from('entry_images')
    .select('id, storage_path')
    .eq('id', id)
    .maybeSingle()

  if (loadError) {
    console.error('DELETE /api/uploads/[id] load', loadError)
    return NextResponse.json({ error: 'Failed to load image' }, { status: 500 })
  }

  if (!row) {
    return NextResponse.json({ error: 'Image not found' }, { status: 404 })
  }

  const storagePath = (row as { storage_path: string }).storage_path

  const { data: deleted, error: delError } = await supabase
    .from('entry_images')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (delError) {
    console.error('DELETE /api/uploads/[id] row', delError)
    return NextResponse.json({ error: 'Failed to delete image record' }, { status: 500 })
  }

  if (!deleted) {
    return NextResponse.json({ error: 'Image not found' }, { status: 404 })
  }

  const { error: removeError } = await supabase.storage.from(ENTRY_IMAGES_BUCKET).remove([storagePath])
  if (removeError) {
    console.error('DELETE /api/uploads/[id] storage (row already removed; possible orphan object)', removeError)
  }

  return new NextResponse(null, { status: 204 })
}
