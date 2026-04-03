'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

import { TiptapEditor } from '@/components/editor/TiptapEditor'
import { clearPendingEntryIdFromSession } from '@/lib/journal/pending-entry'

const TITLE_DEBOUNCE_MS = 2000

type EntryEditFormProps = {
  entryId: string
  initialTitle: string
  initialBody: unknown
}

export function EntryEditForm({ entryId, initialTitle, initialBody }: EntryEditFormProps) {
  const [title, setTitle] = useState(initialTitle)
  const [titleSaveError, setTitleSaveError] = useState<string | null>(null)

  const titleRef = useRef(title)
  titleRef.current = title

  const lastSavedTitleRef = useRef(initialTitle)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const entryIdRef = useRef(entryId)
  entryIdRef.current = entryId

  /** `/entries/new` stores this to avoid double-POST on refresh; clear once edit loads so “New entry” can create again. */
  useEffect(() => {
    clearPendingEntryIdFromSession()
  }, [])

  useEffect(() => {
    setTitle(initialTitle)
    lastSavedTitleRef.current = initialTitle
    titleRef.current = initialTitle
  }, [entryId, initialTitle])

  const saveTitleNow = useCallback(async (id: string, value: string) => {
    if (value === lastSavedTitleRef.current) return true

    setTitleSaveError(null)
    try {
      const res = await fetch(`/api/entries/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: value }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? `Save failed (${res.status})`)
      }
      lastSavedTitleRef.current = value
      return true
    } catch (e) {
      setTitleSaveError(e instanceof Error ? e.message : 'Could not save title')
      return false
    }
  }, [])

  const scheduleTitleSave = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null
      void saveTitleNow(entryIdRef.current, titleRef.current)
    }, TITLE_DEBOUNCE_MS)
  }, [saveTitleNow])

  const onTitleChange = (value: string) => {
    setTitle(value)
    scheduleTitleSave()
  }

  useEffect(() => {
    const flushEntryId = entryId
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
      const pending = titleRef.current
      if (pending === lastSavedTitleRef.current) return
      void fetch(`/api/entries/${encodeURIComponent(flushEntryId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: pending }),
        keepalive: true,
      })
    }
  }, [entryId])

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/entries/new"
          className="text-sm text-violet-600 underline-offset-2 hover:underline dark:text-violet-400"
        >
          New entry
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="entry-title" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Title
        </label>
        <input
          id="entry-title"
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-lg font-semibold text-neutral-900 outline-none ring-violet-500/30 focus:border-violet-500 focus:ring-4 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
          placeholder="Untitled"
          autoComplete="off"
        />
        {titleSaveError ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {titleSaveError}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Body</span>
        <TiptapEditor entryId={entryId} initialDoc={initialBody} />
      </div>
    </div>
  )
}
