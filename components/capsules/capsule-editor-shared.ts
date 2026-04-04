import CharacterCount from '@tiptap/extension-character-count'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import StarterKit from '@tiptap/starter-kit'

export const CAPSULE_EDITOR_EXTENSIONS = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
  }),
  Placeholder.configure({
    placeholder: 'Write what you want to lock away…',
  }),
  CharacterCount,
  Typography,
]

/** Chrome around TipTap for compose + read-only. */
export const CAPSULE_EDITOR_SURFACE =
  'rounded-xl border border-sanctuary-border bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900'

/** Prose surface for capsule compose + read-only (Sanctuary typography). */
export const CAPSULE_EDITOR_CLASS =
  'max-w-none min-h-[min(16rem,40vh)] px-4 py-3 font-serif text-[15px] leading-relaxed text-sanctuary-text focus:outline-none dark:text-zinc-100 [&_h1]:font-serif [&_h1]:text-2xl [&_h1]:font-normal [&_h1]:italic [&_h2]:font-serif [&_h2]:text-xl [&_h2]:italic [&_h3]:font-serif [&_h3]:text-lg [&_h3]:italic [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5'
