'use client'

import type { JSONContent } from '@tiptap/core'
import { EditorContent, useEditor } from '@tiptap/react'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useRef } from 'react'

import { CAPSULE_EDITOR_CLASS, CAPSULE_EDITOR_SURFACE } from '@/components/capsules/capsule-editor-shared'

const EMPTY_DOC: JSONContent = { type: 'doc', content: [] }

export function CapsuleReadOnlyBody({ doc }: { doc: unknown }) {
  const lastJson = useRef<string | null>(null)

  const editor = useEditor({
    editable: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder: '' }),
      Typography,
    ],
    content: EMPTY_DOC,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: CAPSULE_EDITOR_CLASS,
      },
    },
  })

  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    const json =
      doc === undefined || doc === null ? null : JSON.stringify(doc)
    if (json === lastJson.current) return
    lastJson.current = json
    if (json === null) {
      editor.commands.setContent(EMPTY_DOC, { emitUpdate: false })
      return
    }
    try {
      editor.commands.setContent(JSON.parse(json) as JSONContent, { emitUpdate: false })
    } catch {
      editor.commands.setContent(EMPTY_DOC, { emitUpdate: false })
    }
  }, [editor, doc])

  if (!editor) {
    return <div className={`min-h-[8rem] ${CAPSULE_EDITOR_SURFACE}`} />
  }

  return (
    <div className={CAPSULE_EDITOR_SURFACE}>
      <EditorContent editor={editor} />
    </div>
  )
}
