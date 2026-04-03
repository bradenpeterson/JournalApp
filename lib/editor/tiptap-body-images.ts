/**
 * Walk Tiptap/ProseMirror JSON (`body`) for image nodes; used to reconcile `entry_images` rows on save.
 */

function normalizePublicUrl(u: string): string {
  const t = u.trim()
  if (!t) return t
  try {
    return new URL(t).href
  } catch {
    return t
  }
}

export function collectReferencedEntryImageIds(body: unknown): Set<string> {
  const ids = new Set<string>()
  const visit = (node: unknown) => {
    if (!node || typeof node !== 'object') return
    const o = node as Record<string, unknown>
    if (o.type === 'image' && o.attrs && typeof o.attrs === 'object') {
      const a = o.attrs as Record<string, unknown>
      if (typeof a.entryImageId === 'string' && a.entryImageId.length > 0) {
        ids.add(a.entryImageId)
      }
    }
    if (Array.isArray(o.content)) {
      for (const c of o.content) visit(c)
    }
  }
  visit(body)
  return ids
}

export function collectReferencedImageSrcUrls(body: unknown): Set<string> {
  const urls = new Set<string>()
  const visit = (node: unknown) => {
    if (!node || typeof node !== 'object') return
    const o = node as Record<string, unknown>
    if (o.type === 'image' && o.attrs && typeof o.attrs === 'object') {
      const a = o.attrs as Record<string, unknown>
      if (typeof a.src === 'string' && a.src.length > 0) {
        urls.add(normalizePublicUrl(a.src))
      }
    }
    if (Array.isArray(o.content)) {
      for (const c of o.content) visit(c)
    }
  }
  visit(body)
  return urls
}

export function entryImageRowStillReferenced(
  row: { id: string; public_url: string },
  refIds: Set<string>,
  refSrcUrls: Set<string>
): boolean {
  if (refIds.has(row.id)) return true
  const n = normalizePublicUrl(row.public_url)
  if (refSrcUrls.has(n)) return true
  try {
    if (refSrcUrls.has(decodeURIComponent(n))) return true
  } catch {
    /* ignore */
  }
  return false
}
