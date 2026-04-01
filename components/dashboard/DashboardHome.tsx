'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { MoodChart } from '@/components/charts/MoodChart'
import { WritingPromptCard } from '@/components/dashboard/WritingPromptCard'

type EntryRow = {
  id: string
  title: string
  body_text: string | null
  word_count: number
  updated_at: string
}

const RECENT_LIMIT = 5
const PREVIEW_MAX = 120

function truncatePreview(text: string, max: number) {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function formatUpdatedAt(iso: string) {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d)
  } catch {
    return iso
  }
}

export function DashboardHome() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [recent, setRecent] = useState<EntryRow[]>([])
  const [searchResults, setSearchResults] = useState<EntryRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams()
        if (debouncedSearch) params.set('search', debouncedSearch)
        const qs = params.toString()

        const res = await fetch(`/api/entries${qs ? `?${qs}` : ''}`)
        const body = (await res.json().catch(() => null)) as { error?: string } | EntryRow[] | null

        if (!res.ok) {
          const msg =
            body && typeof body === 'object' && !Array.isArray(body) && body.error
              ? body.error
              : `Request failed (${res.status})`
          throw new Error(msg)
        }

        if (!Array.isArray(body)) {
          throw new Error('Invalid response')
        }

        if (cancelled) return

        if (debouncedSearch) {
          setSearchResults(body as EntryRow[])
          setRecent([])
        } else {
          setRecent((body as EntryRow[]).slice(0, RECENT_LIMIT))
          setSearchResults(null)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load')
          setRecent([])
          setSearchResults(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [debouncedSearch])

  const showSearchMode = debouncedSearch.length > 0

  return (
    <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-10">
      <div className="min-w-0 flex-1 flex flex-col gap-10">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Dashboard</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Overview, mood trend from recent analyses, and quick access to your journal. Stats arrive in a later phase.
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <label htmlFor="dashboard-search" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Search entries
        </label>
        <input
          id="dashboard-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Full-text search across your entries…"
          className="w-full max-w-xl rounded-md border border-neutral-200 bg-white px-3 py-2 text-neutral-900 outline-none ring-violet-500/30 focus:border-violet-500 focus:ring-4 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
          autoComplete="off"
        />
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Same search as the{' '}
          <Link href="/entries" className="text-violet-600 underline-offset-2 hover:underline dark:text-violet-400">
            entry list
          </Link>
          .
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50/80 p-6 dark:border-neutral-600 dark:bg-neutral-900/40">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Stats
          </h2>
          <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">
            Writing streaks, totals, and summaries will appear here in{' '}
            <span className="font-medium">Phase 3</span> and <span className="font-medium">Phase 5</span>.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="h-16 rounded-lg bg-neutral-200/80 dark:bg-neutral-800/80" />
            <div className="h-16 rounded-lg bg-neutral-200/80 dark:bg-neutral-800/80" />
          </div>
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950 sm:p-6">
          <MoodChart />
        </section>
      </div>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {showSearchMode ? 'Search results' : 'Recent entries'}
          </h2>
          <Link
            href="/entries"
            className="text-sm text-violet-600 underline-offset-2 hover:underline dark:text-violet-400"
          >
            View all entries
          </Link>
        </div>

        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : loading ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading…</p>
        ) : showSearchMode ? (
          (searchResults?.length ?? 0) === 0 ? (
            <p className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-600 dark:text-neutral-400">
              No entries match &ldquo;{debouncedSearch}&rdquo;.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {(searchResults ?? []).map((entry) => (
                <li key={entry.id}>
                  <EntryRowLink entry={entry} previewMax={PREVIEW_MAX} />
                </li>
              ))}
            </ul>
          )
        ) : recent.length === 0 ? (
          <p className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-600 dark:text-neutral-400">
            No entries yet.{' '}
            <Link href="/entries/new" className="text-violet-600 underline-offset-2 hover:underline dark:text-violet-400">
              Start writing
            </Link>
            .
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {recent.map((entry) => (
              <li key={entry.id}>
                <EntryRowLink entry={entry} previewMax={PREVIEW_MAX} />
              </li>
            ))}
          </ul>
        )}
      </section>
      </div>

      <aside className="w-full shrink-0 lg:sticky lg:top-6 lg:w-80 xl:w-96">
        <WritingPromptCard />
      </aside>
    </div>
  )
}

function EntryRowLink({ entry, previewMax }: { entry: EntryRow; previewMax: number }) {
  return (
    <Link
      href={`/entries/${entry.id}`}
      className="block rounded-lg border border-neutral-200 bg-white p-4 transition hover:border-violet-300 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-violet-700"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium text-neutral-900 dark:text-neutral-100">
          {entry.title?.trim() || 'Untitled'}
        </span>
        <time className="text-xs text-neutral-500 dark:text-neutral-400" dateTime={entry.updated_at}>
          {formatUpdatedAt(entry.updated_at)}
        </time>
      </div>
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        {entry.word_count} {entry.word_count === 1 ? 'word' : 'words'}
      </p>
      {entry.body_text ? (
        <p className="mt-2 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-300">
          {truncatePreview(entry.body_text, previewMax)}
        </p>
      ) : null}
    </Link>
  )
}
