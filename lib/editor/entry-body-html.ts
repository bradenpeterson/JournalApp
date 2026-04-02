import { generateHTML, type JSONContent } from '@tiptap/core'
import Image from '@tiptap/extension-image'
import Typography from '@tiptap/extension-typography'
import StarterKit from '@tiptap/starter-kit'

/** Same doc shape as `TiptapEditor` so read-only HTML matches the editor. */
const extensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
  }),
  Typography,
  Image.configure({ inline: false }),
]

/**
 * Serialize stored Tiptap JSON to HTML (SSR-safe). Falls back to empty string on parse errors.
 */
export function entryBodyToHtml(body: unknown): string {
  try {
    return generateHTML(body as JSONContent, extensions)
  } catch {
    return ''
  }
}
