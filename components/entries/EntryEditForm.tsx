'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import { WritingPromptCard } from '@/components/dashboard/WritingPromptCard'
import {
  TiptapEditor,
  type SaveState,
  type TiptapEditorHandle,
} from '@/components/editor/TiptapEditor'
import { clearPendingEntryIdFromSession } from '@/lib/journal/pending-entry'

const TITLE_DEBOUNCE_MS = 2000

const JOURNAL_MOODS = [
  { name: 'Radiant', color: 'rgba(167, 209, 238, 0.2)', icon: '☀️' },
  { name: 'Calm', color: 'rgba(162, 240, 240, 0.3)', icon: '🌊' },
  { name: 'Stable', color: 'rgba(209, 228, 251, 0.3)', icon: '⚖️' },
  { name: 'Heavy', color: 'rgba(250, 116, 111, 0.2)', icon: '⛈️' },
  { name: 'Custom', color: '#dce4e6', icon: '+' },
] as const

type EntryEditFormProps = {
  entryId: string
  initialTitle: string
  initialBody: unknown
  /** Sanctuary journal composer layout (Figma Make). */
  presentation?: 'default' | 'journal'
}

export function EntryEditForm({
  entryId,
  initialTitle,
  initialBody,
  presentation = 'default',
}: EntryEditFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState(initialTitle)
  const [titleSaveError, setTitleSaveError] = useState<string | null>(null)
  const [wordCount, setWordCount] = useState(0)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [selectedMood, setSelectedMood] = useState<string | null>(null)
  const [finishing, setFinishing] = useState(false)

  const editorRef = useRef<TiptapEditorHandle>(null)

  const titleRef = useRef(title)
  titleRef.current = title

  const lastSavedTitleRef = useRef(initialTitle)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const entryIdRef = useRef(entryId)
  entryIdRef.current = entryId

  const onWordCountChange = useCallback((n: number) => {
    setWordCount(n)
  }, [])

  /** `/entries/new` and `/journal` store this to avoid double-POST on refresh; clear once edit loads. */
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

  const handleJournalDone = useCallback(async () => {
    if (wordCount <= 0) return
    setFinishing(true)
    try {
      await saveTitleNow(entryIdRef.current, titleRef.current)
      await editorRef.current?.saveNow()
      router.push('/entries')
    } finally {
      setFinishing(false)
    }
  }, [router, saveTitleNow, wordCount])

  const longDate = new Intl.DateTimeFormat(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date())

  const draftLabel =
    saveState === 'saving'
      ? 'Saving…'
      : saveState === 'error'
        ? 'Save issue'
        : saveState === 'saved'
          ? 'Draft saved'
          : 'Autosave on'

  if (presentation === 'journal') {
    return (
      <div className="mx-auto flex w-full max-w-[896px] flex-col px-6 py-10 sm:px-10">
        <div className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-sanctuary-muted dark:text-zinc-500">
              {longDate}
            </p>
            <label htmlFor="journal-entry-title" className="sr-only">
              Entry title
            </label>
            <input
              id="journal-entry-title"
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Untitled Reflection"
              autoComplete="off"
              className="w-full border-none bg-transparent font-serif text-4xl italic leading-tight text-sanctuary-text placeholder:text-[rgba(172,179,182,0.35)] focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-600 sm:text-5xl"
            />
            {titleSaveError ? (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                {titleSaveError}
              </p>
            ) : null}
          </div>
          <div
            className="flex shrink-0 items-center gap-2 self-start rounded-full bg-[#f0f4f6] px-4 py-2 dark:bg-zinc-800 sm:self-auto"
            aria-live="polite"
          >
            <span className="size-2 shrink-0 rounded-full bg-sanctuary-muted/50 dark:bg-zinc-500" aria-hidden />
            <span className="text-xs text-sanctuary-muted dark:text-zinc-400">{draftLabel}</span>
          </div>
        </div>

        <div className="mb-12">
          <TiptapEditor
            ref={editorRef}
            entryId={entryId}
            initialDoc={initialBody}
            skin="journal"
            onSaveStateChange={setSaveState}
            onWordCountChange={onWordCountChange}
          />
        </div>

        <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-2">
          <section
            className="rounded-xl bg-white p-8 shadow-[0px_12px_32px_0px_rgba(44,52,54,0.03)] dark:border dark:border-zinc-800 dark:bg-zinc-900"
            aria-label="Mood"
          >
            <h2 className="mb-6 text-sm uppercase tracking-wider text-sanctuary-text dark:text-zinc-100">
              How are you feeling today?
            </h2>
            <div className="flex flex-wrap gap-4">
              {JOURNAL_MOODS.map((mood) => (
                <button
                  key={mood.name}
                  type="button"
                  onClick={() => setSelectedMood(mood.name === selectedMood ? null : mood.name)}
                  className={`flex flex-col items-center gap-2 transition-transform ${
                    selectedMood === mood.name ? 'scale-110' : 'hover:scale-105'
                  }`}
                >
                  <span
                    className="flex size-12 items-center justify-center rounded-full text-lg"
                    style={{ backgroundColor: mood.color }}
                  >
                    {mood.icon}
                  </span>
                  <span className="text-[10px] uppercase tracking-tight text-sanctuary-muted dark:text-zinc-400">
                    {mood.name}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section
            className="rounded-xl border border-white/20 bg-white/40 p-8 shadow-[0px_24px_48px_0px_rgba(0,0,0,0.02)] backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/60"
            aria-label="Time-locked writing"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="mb-1 text-sm uppercase tracking-wider text-sanctuary-text dark:text-zinc-100">
                  Time-lock a note
                </h2>
                <p className="text-xs leading-relaxed text-sanctuary-muted dark:text-zinc-400">
                  Journal entries are not sealed by date here. Use a time capsule to unlock text on a future date.
                </p>
              </div>
            </div>
            <Link
              href="/capsules/new"
              className="mt-4 inline-flex items-center justify-center rounded-lg bg-[#d1e4fb] px-4 py-3 text-sm font-medium text-[#415366] transition-colors hover:bg-[#c2d8f5] dark:bg-sky-900/50 dark:text-sky-100 dark:hover:bg-sky-900/70"
            >
              New time capsule
            </Link>
          </section>
        </div>

        <div className="mb-12 flex flex-col gap-6 rounded-3xl border border-white/20 bg-white/40 p-10 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/40 sm:flex-row sm:items-center sm:gap-8">
          <div
            className="flex size-24 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sanctuary-tint-teal to-sanctuary-tint-blue shadow-[inset_0px_2px_4px_0px_rgba(0,0,0,0.05)] dark:from-teal-900/60 dark:to-sky-900/50"
            aria-hidden
          >
            <span className="text-3xl text-sanctuary-primary dark:text-teal-300">✦</span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="mb-3 font-serif text-2xl italic text-sanctuary-text dark:text-zinc-100">
              A gentle prompt for you…
            </h3>
            <WritingPromptCard
              hideHeading
              className="border-0 bg-transparent p-0 shadow-none dark:bg-transparent"
              bodyClassName="text-base leading-relaxed text-sanctuary-muted dark:text-zinc-400"
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={() => void handleJournalDone()}
            disabled={wordCount <= 0 || finishing}
            className="flex items-center gap-3 rounded-full bg-sanctuary-primary px-12 py-4 text-base uppercase tracking-widest text-white transition-colors hover:bg-sanctuary-primary-hover disabled:opacity-50 dark:bg-teal-400 dark:text-zinc-950 dark:hover:bg-teal-300"
          >
            {finishing ? 'Saving…' : 'Complete entry'}
            <span aria-hidden>→</span>
          </button>
          {wordCount > 0 ? (
            <p className="text-center text-xs text-sanctuary-muted opacity-70 dark:text-zinc-500">
              {wordCount} {wordCount === 1 ? 'word' : 'words'}
            </p>
          ) : (
            <p className="text-center text-xs text-sanctuary-muted dark:text-zinc-500">
              Add body text to finish and return to your entries.
            </p>
          )}
        </div>

        <p className="mt-10 text-center text-xs text-sanctuary-muted dark:text-zinc-500">
          <Link href="/entries" className="text-sanctuary-primary underline-offset-2 hover:underline dark:text-teal-300">
            All entries
          </Link>
          {' · '}
          <Link
            href={`/entries/${entryId}/edit`}
            className="text-sanctuary-primary underline-offset-2 hover:underline dark:text-teal-300"
          >
            Classic editor
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/journal"
          className="text-sm text-violet-600 underline-offset-2 hover:underline dark:text-violet-400"
        >
          Journal view
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
