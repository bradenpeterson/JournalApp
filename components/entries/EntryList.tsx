'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type EntryRow = {
  id: string
  title: string
  body_text: string | null
  word_count: number
  updated_at: string
}

const PREVIEW_MAX = 160

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

export function EntryList() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [entries, setEntries] = useState<EntryRow[]>([])
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

      const params = new URLSearchParams()
      if (debouncedSearch) params.set('search', debouncedSearch)
      const qs = params.toString()

      try {
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

        if (!cancelled) {
          setEntries(body as EntryRow[])
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load entries')
          setEntries([])
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Journal</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Your entries, newest updates first.
          </p>
        </div>
        <Link
          href="/entries/new"
          className="rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-600"
        >
          New entry
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="entries-search" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Search
        </label>
        <input
          id="entries-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search entries…"
          className="w-full max-w-md rounded-md border border-neutral-200 bg-white px-3 py-2 text-neutral-900 outline-none ring-violet-500/30 focus:border-violet-500 focus:ring-4 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
          autoComplete="off"
        />
      </div>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-neutral-500 dark:border-neutral-600 dark:text-neutral-400">
          {debouncedSearch ? 'No entries match your search.' : 'No entries yet. Start a new one.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {entries.map((entry) => (
            <li key={entry.id}>
              <Link
                href={`/entries/${entry.id}/edit`}
                className="block rounded-lg border border-neutral-200 bg-white p-4 transition hover:border-violet-300 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-violet-700"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
                    {entry.title?.trim() || 'Untitled'}
                  </h2>
                  <time
                    className="text-xs text-neutral-500 dark:text-neutral-400"
                    dateTime={entry.updated_at}
                  >
                    {formatUpdatedAt(entry.updated_at)}
                  </time>
                </div>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  {entry.word_count} {entry.word_count === 1 ? 'word' : 'words'}
                </p>
                {entry.body_text ? (
                  <p className="mt-2 line-clamp-3 text-sm text-neutral-600 dark:text-neutral-300">
                    {truncatePreview(entry.body_text, PREVIEW_MAX)}
                  </p>
                ) : (
                  <p className="mt-2 text-sm italic text-neutral-400 dark:text-neutral-500">No preview</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
