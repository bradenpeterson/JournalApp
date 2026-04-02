/** §5.3 — Storage bucket + upload limits (matches `20260330160000_storage_entry_images.sql`). */
export const ENTRY_IMAGES_BUCKET = 'entry-images' as const

export const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const

export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIME_TYPES)[number]

export function isAllowedImageMime(mime: string): mime is AllowedImageMime {
  return (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(mime)
}
