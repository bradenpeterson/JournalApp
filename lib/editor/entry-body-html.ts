import 'server-only'

import { getSchema, type JSONContent } from '@tiptap/core'
import { DOMSerializer, Node as ProseMirrorNode, type Fragment, type Schema } from '@tiptap/pm/model'
import Typography from '@tiptap/extension-typography'
import StarterKit from '@tiptap/starter-kit'
import { JSDOM } from 'jsdom'

import { EntryImage } from '@/lib/editor/entry-image'

/** Same doc shape as `TiptapEditor` so read-only HTML matches the editor. */
const extensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
  }),
  Typography,
  EntryImage,
]

/**
 * Tiptap `generateHTML` uses `document` internally and throws in Node (RSC).
 * ProseMirror can serialize with a JSDOM document instead.
 */
function fragmentToHtmlString(fragment: Fragment, schema: Schema): string {
  const { window } = new JSDOM('<!DOCTYPE html><html><body></body></html>')
  const doc = window.document
  const serializer = DOMSerializer.fromSchema(schema)
  const domFragment = serializer.serializeFragment(fragment, { document: doc })
  const container = doc.createElement('div')
  container.appendChild(domFragment)
  return container.innerHTML
}

/**
 * Serialize stored Tiptap JSON to HTML for SSR (entry view page). Falls back to empty string on errors.
 */
export function entryBodyToHtml(body: unknown): string {
  try {
    const schema = getSchema(extensions)
    const doc = ProseMirrorNode.fromJSON(schema, body as JSONContent)
    return fragmentToHtmlString(doc.content, schema)
  } catch {
    return ''
  }
}
