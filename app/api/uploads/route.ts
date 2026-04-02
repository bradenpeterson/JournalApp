import { auth } from '@clerk/nextjs/server'
import { fileTypeFromBuffer } from 'file-type'
import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'

import { getSupabaseAuthContext } from '@/lib/db/supabase-auth-context'
import {
  ENTRY_IMAGES_BUCKET,
  isAllowedImageMime,
  MAX_IMAGE_UPLOAD_BYTES,
} from '@/lib/uploads/entry-images'
import { isUuid } from '@/lib/utils/uuid'

function safeDisplayFileName(name: string): string {
  const base = name.replace(/^.*[/\\]/, '').trim().slice(0, 200)
  return base || 'image'
}

export async function POST(req: Request) {
  const ctx = await getSupabaseAuthContext()
  if (!ctx.ok) return ctx.response

  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { supabase, dbUserId } = ctx

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Expected multipart form data' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file field' }, { status: 400 })
  }

  const entryIdRaw = formData.get('entryId')
  let entryId: string | null = null
  if (typeof entryIdRaw === 'string' && entryIdRaw.trim()) {
    if (!isUuid(entryIdRaw.trim())) {
      return NextResponse.json({ error: 'Invalid entryId' }, { status: 400 })
    }
    entryId = entryIdRaw.trim()
  }

  const arrayBuffer = await file.arrayBuffer()
  if (arrayBuffer.byteLength > MAX_IMAGE_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'File exceeds 5MB limit' }, { status: 413 })
  }
  if (arrayBuffer.byteLength === 0) {
    return NextResponse.json({ error: 'Empty file' }, { status: 400 })
  }

  const uint8 = new Uint8Array(arrayBuffer)
  const detected = await fileTypeFromBuffer(uint8)
  if (!detected || !isAllowedImageMime(detected.mime)) {
    return NextResponse.json(
      { error: 'Only JPEG, PNG, WebP, and GIF images are allowed' },
      { status: 400 },
    )
  }

  if (entryId) {
    const { data: entry, error: entryErr } = await supabase
      .from('entries')
      .select('id')
      .eq('id', entryId)
      .eq('user_id', dbUserId)
      .maybeSingle()

    if (entryErr) {
      console.error('POST /api/uploads entry lookup', entryErr)
      return NextResponse.json({ error: 'Failed to verify entry' }, { status: 500 })
    }
    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }
  }

  const objectId = randomUUID()
  const storagePath = `${clerkUserId}/${objectId}.${detected.ext}`

  const { error: uploadError } = await supabase.storage
    .from(ENTRY_IMAGES_BUCKET)
    .upload(storagePath, uint8, {
      contentType: detected.mime,
      upsert: false,
    })

  if (uploadError) {
    console.error('POST /api/uploads storage', uploadError)
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(ENTRY_IMAGES_BUCKET).getPublicUrl(storagePath)

  const displayName = safeDisplayFileName(typeof file.name === 'string' ? file.name : '')

  const { data: row, error: insertError } = await supabase
    .from('entry_images')
    .insert({
      user_id: dbUserId,
      entry_id: entryId,
      storage_path: storagePath,
      public_url: publicUrl,
      file_name: displayName,
      file_size: uint8.byteLength,
      mime_type: detected.mime,
    })
    .select('id')
    .single()

  if (insertError || !row) {
    console.error('POST /api/uploads entry_images', insertError)
    await supabase.storage.from(ENTRY_IMAGES_BUCKET).remove([storagePath])
    return NextResponse.json({ error: 'Failed to save image metadata' }, { status: 500 })
  }

  return NextResponse.json(
    { publicUrl, imageId: (row as { id: string }).id },
    { status: 201 },
  )
}
