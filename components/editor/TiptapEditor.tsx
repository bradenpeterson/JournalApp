'use client'

import CharacterCount from '@tiptap/extension-character-count'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import type { Editor, JSONContent } from '@tiptap/core'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  createEntryImagePendingDeleteSync,
  EntryImage,
  SKIP_ENTRY_IMAGE_CLEANUP_META,
} from '@/lib/editor/entry-image'
import {
  IMAGE_ACCEPT,
  isAllowedImageMime,
  MAX_IMAGE_UPLOAD_BYTES,
} from '@/lib/uploads/entry-images'
import { wordCountFromPlainText } from '@/lib/utils/wordCount'

const DEBOUNCE_MS = 2000

const EMPTY_DOC: JSONContent = { type: 'doc', content: [] }

function ImageToolbarIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className ?? 'h-5 w-5'}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-5.72-5.72-1.06 1.06L5.25 18H3.898l4.848-4.848-1.06-1.06L3 16.06zm2.25-9.81h-.008v.008h.008V6.25zm9 9.375a2.625 2.625 0 100-5.25 2.625 2.625 0 000 5.25z"
        clipRule="evenodd"
      />
    </svg>
  )
}

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
  const [imageUploadBusy, setImageUploadBusy] = useState(false)
  const [imageUploadError, setImageUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  /** Captured on toolbar mousedown — after the file dialog, `insertContent` would otherwise use a bad selection and replace the whole doc. */
  const savedImageInsertRangeRef = useRef<{ from: number; to: number } | null>(null)

  const entryIdRef = useRef(entryId)
  entryIdRef.current = entryId

  const editorRef = useRef<Editor | null>(null)
  /** Latest body snapshot per entry so unmount flush targets the correct id when `entryId` changes. */
  const lastPayloadByEntryIdRef = useRef<Map<string, ReturnType<typeof buildPatchPayload>>>(new Map())
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savingRef = useRef(false)
  const pendingAgainRef = useRef(false)
  /** `entryImageId`s no longer in the doc; delete from Storage after PATCH succeeds (undo clears these). */
  const pendingImageDeletesRef = useRef<Set<string>>(new Set())

  const entryImagePendingSyncExtension = useMemo(
    () => createEntryImagePendingDeleteSync(pendingImageDeletesRef),
    [],
  )

  const flushPendingImageDeletes = useCallback(async () => {
    const pending = pendingImageDeletesRef.current
    if (pending.size === 0) return
    const ids = [...pending]
    pending.clear()
    const failed: string[] = []
    for (const id of ids) {
      try {
        const res = await fetch(`/api/uploads/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          credentials: 'same-origin',
        })
        if (!res.ok) failed.push(id)
      } catch {
        failed.push(id)
      }
    }
    for (const id of failed) pending.add(id)
  }, [])

  const flushPendingImageDeletesRef = useRef(flushPendingImageDeletes)
  flushPendingImageDeletesRef.current = flushPendingImageDeletes

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
      await flushPendingImageDeletes()
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
  }, [flushPendingImageDeletes])

  const performSaveRef = useRef(performSave)
  performSaveRef.current = performSave

  const onImageFileSelected = useCallback(
    async (file: File) => {
      const ed = editorRef.current
      if (!ed || ed.isDestroyed) return

      setImageUploadError(null)

      if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
        setImageUploadError('Image must be 5MB or smaller.')
        return
      }

      if (!isAllowedImageMime(file.type)) {
        setImageUploadError('Use a JPEG, PNG, WebP, or GIF image.')
        return
      }

      setImageUploadBusy(true)
      try {
        const form = new FormData()
        form.set('file', file)
        form.set('entryId', entryIdRef.current)

        const res = await fetch('/api/uploads', { method: 'POST', body: form })
        const body = (await res.json().catch(() => null)) as {
          error?: string
          publicUrl?: string
          imageId?: string
        } | null

        if (!res.ok) {
          const msg =
            body && typeof body === 'object' && typeof body.error === 'string'
              ? body.error
              : `Upload failed (${res.status})`
          setImageUploadError(msg)
          return
        }

        const publicUrl = body && typeof body === 'object' && typeof body.publicUrl === 'string' ? body.publicUrl : ''
        const imageId = body && typeof body === 'object' && typeof body.imageId === 'string' ? body.imageId : ''
        if (!publicUrl || !imageId) {
          setImageUploadError('Upload succeeded but response was invalid.')
          return
        }

        const alt = file.name.replace(/^.*[/\\]/, '').trim() || 'Image'
        const saved = savedImageInsertRangeRef.current
        savedImageInsertRangeRef.current = null
        const range =
          saved != null
            ? saved
            : { from: ed.state.selection.from, to: ed.state.selection.to }

        ed.chain()
          .focus()
          .insertContentAt(range, {
            type: 'image',
            attrs: { src: publicUrl, alt, entryImageId: imageId },
          })
          .run()
      } catch {
        setImageUploadError('Could not upload image. Try again.')
      } finally {
        setImageUploadBusy(false)
      }
    },
    [],
  )

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
        EntryImage,
        entryImagePendingSyncExtension,
      ],
      content: EMPTY_DOC,
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class:
            'max-w-none min-h-[240px] px-3 py-2 text-[15px] leading-relaxed focus:outline-none [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:text-lg [&_h3]:font-semibold [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5 [&_img]:max-w-full [&_img]:rounded-md [&_img]:border [&_img]:border-neutral-200 dark:[&_img]:border-neutral-700',
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
    [entryId, scheduleDebouncedSave, entryImagePendingSyncExtension]
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

    editor
      .chain()
      .setMeta(SKIP_ENTRY_IMAGE_CLEANUP_META, true)
      .setContent(JSON.parse(json) as JSONContent, { emitUpdate: false })
      .run()
    lastPayloadByEntryIdRef.current.set(entryIdRef.current, buildPatchPayload(editor))
  }, [editor, initialDoc])

  useEffect(() => {
    lastInitialJsonRef.current = null
  }, [entryId])

  /** §3.4 + §3.7 — On leave, persist latest draft then analyze so `/api/analysis` reads up-to-date `body_text`. */
  useEffect(() => {
    const flushEntryId = entryId
    const payloadByEntry = lastPayloadByEntryIdRef.current

    function postAnalysis() {
      void fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId: flushEntryId }),
        keepalive: true,
      })
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }

      const payload = payloadByEntry.get(flushEntryId)
      payloadByEntry.delete(flushEntryId)

      if (!payload) {
        postAnalysis()
        return
      }

      void fetch(`/api/entries/${encodeURIComponent(flushEntryId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      })
        .then(async (res) => {
          if (res.ok) await flushPendingImageDeletesRef.current()
        })
        .finally(() => {
          postAnalysis()
        })
    }
  }, [entryId])

  useEffect(() => {
    if (saveState !== 'saved') return
    const t = setTimeout(() => setSaveState('idle'), 2000)
    return () => clearTimeout(t)
  }, [saveState])

  useEffect(() => {
    if (!imageUploadError) return
    const t = setTimeout(() => setImageUploadError(null), 6000)
    return () => clearTimeout(t)
  }, [imageUploadError])

  return (
    <div className="tiptap-editor flex flex-col gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) void onImageFileSelected(f)
        }}
      />
      <div className="rounded-md border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <div
          className="flex items-center gap-1 border-b border-neutral-200 px-2 py-1.5 dark:border-neutral-800"
          role="toolbar"
          aria-label="Editor toolbar"
        >
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-100 disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-neutral-900"
            disabled={imageUploadBusy || !editor}
            aria-busy={imageUploadBusy}
            aria-label="Insert image"
            title="Insert image"
            onMouseDown={(e) => {
              const ed = editorRef.current
              if (ed && !ed.isDestroyed) {
                const { from, to } = ed.state.selection
                savedImageInsertRangeRef.current = { from, to }
              }
              e.preventDefault()
            }}
            onFocus={() => {
              const ed = editorRef.current
              if (ed && !ed.isDestroyed) {
                const { from, to } = ed.state.selection
                savedImageInsertRangeRef.current = { from, to }
              }
            }}
            onClick={() => {
              setImageUploadError(null)
              fileInputRef.current?.click()
            }}
          >
            {imageUploadBusy ? (
              <span
                className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-violet-600 dark:border-neutral-600 dark:border-t-violet-400"
                aria-hidden
              />
            ) : (
              <ImageToolbarIcon />
            )}
          </button>
        </div>
        <EditorContent editor={editor} className="tiptap-editor-content" />
      </div>
      {imageUploadError ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {imageUploadError}
        </p>
      ) : null}
      <p className="min-h-5 text-sm text-neutral-500 dark:text-neutral-400" aria-live="polite">
        {saveState === 'saving' && 'Saving…'}
        {saveState === 'saved' && 'Saved'}
        {saveState === 'error' && 'Could not save. Keep editing to retry.'}
      </p>
    </div>
  )
}
