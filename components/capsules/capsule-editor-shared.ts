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

export const CAPSULE_EDITOR_CLASS =
  'max-w-none min-h-[240px] px-3 py-2 text-[15px] leading-relaxed focus:outline-none [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:text-lg [&_h3]:font-semibold [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5'
