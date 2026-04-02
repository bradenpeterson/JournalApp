'use client'

import type { JSONContent } from '@tiptap/core'
import { EditorContent, useEditor } from '@tiptap/react'
import { useEffect, useRef } from 'react'

import { CAPSULE_EDITOR_CLASS, CAPSULE_EDITOR_EXTENSIONS } from '@/components/capsules/capsule-editor-shared'

const EMPTY_DOC: JSONContent = { type: 'doc', content: [] }

export type CapsuleBodyEditorProps = {
  onDocChange: (doc: JSONContent) => void
}

export function CapsuleBodyEditor({ onDocChange }: CapsuleBodyEditorProps) {
  const onDocChangeRef = useRef(onDocChange)
  useEffect(() => {
    onDocChangeRef.current = onDocChange
  }, [onDocChange])

  const editor = useEditor({
    extensions: CAPSULE_EDITOR_EXTENSIONS,
    content: EMPTY_DOC,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: CAPSULE_EDITOR_CLASS,
      },
    },
    onUpdate: ({ editor: ed }) => {
      onDocChangeRef.current(ed.getJSON())
    },
    onCreate: ({ editor: ed }) => {
      onDocChangeRef.current(ed.getJSON())
    },
  })

  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      onDocChangeRef.current(editor.getJSON())
    }
  }, [editor])

  if (!editor) {
    return (
      <div className="min-h-[240px] rounded-md border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950" />
    )
  }

  return (
    <div className="rounded-md border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      <EditorContent editor={editor} />
    </div>
  )
}
