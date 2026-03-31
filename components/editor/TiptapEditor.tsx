'use client'

import CharacterCount from '@tiptap/extension-character-count'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import type { Editor, JSONContent } from '@tiptap/core'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useCallback, useEffect, useRef, useState } from 'react'

import { wordCountFromPlainText } from '@/lib/utils/wordCount'

const DEBOUNCE_MS = 2000

const EMPTY_DOC: JSONContent = { type: 'doc', content: [] }

function buildPatchPayload(editor: Editor) {
  const body = editor.getJSON()
  const body_text = editor.getText({ blockSeparator: ' ' })
  const word_count = wordCountFromPlainText(body_text)
  return { body, body_text, word_count }
}

export type TiptapEditorProps = {
  entryId: string
  /** Tiptap / ProseMirror JSON document; omit or null for an empty doc until loaded. */
  initialDoc?: unknown | null
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function TiptapEditor({ entryId, initialDoc }: TiptapEditorProps) {
  const [saveState, setSaveState] = useState<SaveState>('idle')

  const entryIdRef = useRef(entryId)
  entryIdRef.current = entryId

  const editorRef = useRef<Editor | null>(null)
  /** Latest body snapshot per entry so unmount flush targets the correct id when `entryId` changes. */
  const lastPayloadByEntryIdRef = useRef<Map<string, ReturnType<typeof buildPatchPayload>>>(new Map())
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savingRef = useRef(false)
  const pendingAgainRef = useRef(false)

  const scheduleDebouncedSave = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null
      void performSaveRef.current()
    }, DEBOUNCE_MS)
  }, [])

  const performSave = useCallback(async () => {
    const editor = editorRef.current
    if (!editor || editor.isDestroyed) return

    const payload = buildPatchPayload(editor)
    lastPayloadByEntryIdRef.current.set(entryIdRef.current, payload)

    if (savingRef.current) {
      pendingAgainRef.current = true
      return
    }

    savingRef.current = true
    setSaveState('saving')

    try {
      const res = await fetch(`/api/entries/${encodeURIComponent(entryIdRef.current)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        throw new Error(`PATCH ${res.status}`)
      }
      setSaveState('saved')
    } catch {
      setSaveState('error')
    } finally {
      savingRef.current = false
      if (pendingAgainRef.current) {
        pendingAgainRef.current = false
        void performSave()
      }
    }
  }, [])

  const performSaveRef = useRef(performSave)
  performSaveRef.current = performSave

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
        }),
        Placeholder.configure({
          placeholder: 'Write something…',
        }),
        CharacterCount,
        Typography,
      ],
      content: EMPTY_DOC,
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class:
            'max-w-none min-h-[240px] px-3 py-2 text-[15px] leading-relaxed focus:outline-none [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:text-lg [&_h3]:font-semibold [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5',
        },
      },
      onCreate: ({ editor: ed }) => {
        editorRef.current = ed
        lastPayloadByEntryIdRef.current.set(entryIdRef.current, buildPatchPayload(ed))
      },
      onUpdate: ({ editor: ed }) => {
        editorRef.current = ed
        lastPayloadByEntryIdRef.current.set(entryIdRef.current, buildPatchPayload(ed))
        scheduleDebouncedSave()
      },
    },
    [entryId, scheduleDebouncedSave]
  )

  useEffect(() => {
    editorRef.current = editor
    if (editor && !editor.isDestroyed) {
      lastPayloadByEntryIdRef.current.set(entryIdRef.current, buildPatchPayload(editor))
    }
  }, [editor])

  const lastInitialJsonRef = useRef<string | null>(null)

  useEffect(() => {
    if (!editor || editor.isDestroyed) return

    const json =
      initialDoc === undefined || initialDoc === null ? null : JSON.stringify(initialDoc)

    if (json === lastInitialJsonRef.current) return
    lastInitialJsonRef.current = json

    if (json === null) return

    editor.commands.setContent(JSON.parse(json) as JSONContent, { emitUpdate: false })
    lastPayloadByEntryIdRef.current.set(entryIdRef.current, buildPatchPayload(editor))
  }, [editor, initialDoc])

  useEffect(() => {
    lastInitialJsonRef.current = null
  }, [entryId])

  useEffect(() => {
    const flushEntryId = entryId
    const payloadByEntry = lastPayloadByEntryIdRef.current
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }

      const payload = payloadByEntry.get(flushEntryId)
      if (!payload) return

      void fetch(`/api/entries/${encodeURIComponent(flushEntryId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      })
      payloadByEntry.delete(flushEntryId)
    }
  }, [entryId])

  useEffect(() => {
    if (saveState !== 'saved') return
    const t = setTimeout(() => setSaveState('idle'), 2000)
    return () => clearTimeout(t)
  }, [saveState])

  return (
    <div className="tiptap-editor flex flex-col gap-2">
      <div className="rounded-md border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <EditorContent editor={editor} className="tiptap-editor-content" />
      </div>
      <p className="min-h-5 text-sm text-neutral-500 dark:text-neutral-400" aria-live="polite">
        {saveState === 'saving' && 'Saving…'}
        {saveState === 'saved' && 'Saved'}
        {saveState === 'error' && 'Could not save. Keep editing to retry.'}
      </p>
    </div>
  )
}
