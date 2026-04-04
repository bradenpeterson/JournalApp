'use client'

import { useSession } from '@clerk/nextjs'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { LockIcon } from '@/components/capsules/LockIcon'
import { useSupabaseClient } from '@/lib/db/supabase-client'
import { moodChartColor } from '@/lib/mood/chart-colors'
import { MOOD_LABELS } from '@/lib/mood/labels'

type EntryRow = {
  id: string
  title: string
  body_text: string | null
  word_count: number
  updated_at: string
}

const PREVIEW_MAX = 140
const PAGE_SIZE = 12

function truncatePreview(text: string, max: number) {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function formatShortDate(iso: string) {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(d)
  } catch {
    return iso
  }
}

function latestMoodByEntryId(
  rows: { entry_id: string; mood_label: string; created_at: string }[],
): Record<string, string> {
  const map: Record<string, string> = {}
  for (const r of rows) {
    if (!map[r.entry_id]) map[r.entry_id] = r.mood_label
  }
  return map
}

type SortMode = 'updated_desc' | 'updated_asc'

export function EntryList() {
  const { isLoaded, session } = useSession()
  const supabase = useSupabaseClient()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [entries, setEntries] = useState<EntryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [moodByEntry, setMoodByEntry] = useState<Record<string, string>>({})
  const [moodsLoading, setMoodsLoading] = useState(false)

  const [sortMode, setSortMode] = useState<SortMode>('updated_desc')
  const [moodFilter, setMoodFilter] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

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
          setVisibleCount(PAGE_SIZE)
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

  const loadMoods = useCallback(
    async (entryIds: string[]) => {
      if (!isLoaded || !session || entryIds.length === 0) {
        setMoodByEntry({})
        return
      }

      setMoodsLoading(true)
      const { data, error: qErr } = await supabase
        .from('mood_analyses')
        .select('entry_id, mood_label, created_at')
        .in('entry_id', entryIds)
        .order('created_at', { ascending: false })

      setMoodsLoading(false)

      if (qErr) {
        console.error('EntryList mood load', qErr)
        setMoodByEntry({})
        return
      }

      setMoodByEntry(latestMoodByEntryId((data ?? []) as { entry_id: string; mood_label: string; created_at: string }[]))
    },
    [isLoaded, session, supabase],
  )

  useEffect(() => {
    if (!isLoaded || !session) {
      setMoodByEntry({})
      return
    }
    const ids = entries.map((e) => e.id)
    void loadMoods(ids)
  }, [entries, isLoaded, session, loadMoods])

  const sortedFiltered = useMemo(() => {
    let list = [...entries]
    if (moodFilter) {
      list = list.filter((e) => (moodByEntry[e.id] ?? '').toLowerCase() === moodFilter.toLowerCase())
    }
    list.sort((a, b) => {
      const ta = new Date(a.updated_at).getTime()
      const tb = new Date(b.updated_at).getTime()
      return sortMode === 'updated_desc' ? tb - ta : ta - tb
    })
    return list
  }, [entries, moodFilter, moodByEntry, sortMode])

  const visibleEntries = useMemo(
    () => sortedFiltered.slice(0, visibleCount),
    [sortedFiltered, visibleCount],
  )

  const canLoadMore = visibleCount < sortedFiltered.length

  const moodFiltersAvailable = useMemo(() => {
    const set = new Set<string>()
    for (const id of entries.map((e) => e.id)) {
      const m = moodByEntry[id]
      if (m) set.add(m.toLowerCase())
    }
    return [...set].sort()
  }, [entries, moodByEntry])

  return (
    <div className="flex w-full flex-col gap-10">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-4xl italic leading-tight text-sanctuary-text dark:text-zinc-100 sm:text-5xl">
            Journal archive
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-sanctuary-muted dark:text-zinc-400">
            Reflections and fragments, newest updates first by default. Search the full text of titles and bodies.
          </p>
        </div>
        <Link
          href="/journal"
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-sanctuary-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-sanctuary-primary-hover dark:bg-teal-400 dark:text-zinc-950 dark:hover:bg-teal-300"
        >
          New entry
        </Link>
      </header>

      <section
        className="rounded-2xl border border-white/30 bg-white/50 p-6 shadow-sm backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/50"
        aria-label="Time capsules"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#d1e4fb] dark:bg-sky-900/50">
              <LockIcon className="size-6 text-[#415366] dark:text-sky-200" />
            </div>
            <div>
              <h2 className="font-serif text-lg text-sanctuary-text dark:text-zinc-100">Time-locked notes</h2>
              <p className="mt-1 text-sm text-sanctuary-muted dark:text-zinc-400">
                Journal entries here are always readable. Seal a separate capsule to hide text until an unlock date.
              </p>
            </div>
          </div>
          <Link
            href="/capsules"
            className="inline-flex items-center justify-center rounded-full border border-sanctuary-border bg-white px-5 py-2.5 text-sm text-sanctuary-primary transition-colors hover:bg-sanctuary-canvas dark:border-zinc-700 dark:bg-zinc-900 dark:text-teal-300 dark:hover:bg-zinc-800"
          >
            Open capsules
          </Link>
        </div>
      </section>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          <label htmlFor="entries-search" className="sr-only">
            Search entries
          </label>
          <input
            id="entries-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reflections…"
            className="w-full max-w-md rounded-xl border border-sanctuary-border bg-white px-4 py-3 text-sm text-sanctuary-text shadow-sm outline-none ring-sanctuary-primary/20 placeholder:text-sanctuary-muted/60 focus:border-sanctuary-primary focus:ring-4 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            autoComplete="off"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-sanctuary-muted dark:text-zinc-500">Sort</span>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="rounded-lg border border-sanctuary-border bg-white px-3 py-2 text-sm text-sanctuary-text dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            aria-label="Sort entries"
          >
            <option value="updated_desc">Recently updated</option>
            <option value="updated_asc">Oldest updated</option>
          </select>
        </div>
      </div>

      <div>
        <p className="mb-3 text-xs uppercase tracking-wider text-sanctuary-muted dark:text-zinc-500">
          Filter by last analyzed mood
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMoodFilter(null)}
            className={`rounded-full px-4 py-2 text-sm transition-colors ${
              moodFilter === null
                ? 'bg-sanctuary-primary text-white dark:bg-teal-400 dark:text-zinc-950'
                : 'bg-sanctuary-sidebar text-sanctuary-muted hover:bg-[#dce4e6] dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
            }`}
          >
            All
          </button>
          {MOOD_LABELS.map((m) => {
            const active = moodFilter === m
            const disabled = !moodFiltersAvailable.includes(m)
            return (
              <button
                key={m}
                type="button"
                disabled={disabled && !active}
                onClick={() => setMoodFilter(active ? null : m)}
                className={`rounded-full px-4 py-2 text-sm capitalize transition-colors disabled:opacity-40 ${
                  active
                    ? 'bg-sanctuary-primary text-white dark:bg-teal-400 dark:text-zinc-950'
                    : 'bg-sanctuary-sidebar text-sanctuary-muted hover:bg-[#dce4e6] dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                }`}
              >
                {m}
              </button>
            )
          })}
        </div>
        {moodsLoading ? (
          <p className="mt-2 text-xs text-sanctuary-muted dark:text-zinc-500">Loading mood tags…</p>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-2xl bg-[#f0f4f6] dark:bg-zinc-800"
              aria-hidden
            />
          ))}
        </div>
      ) : sortedFiltered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-sanctuary-border bg-white/60 p-12 text-center text-sanctuary-muted dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
          {debouncedSearch || moodFilter
            ? 'No entries match your filters.'
            : 'No entries yet. Open the journal to write your first reflection.'}
        </p>
      ) : (
        <>
          <ul className="grid list-none grid-cols-1 gap-6 p-0 md:grid-cols-2 lg:grid-cols-3">
            {visibleEntries.map((entry, index) => (
              <li
                key={entry.id}
                className={index % 7 === 0 ? 'md:col-span-2 lg:col-span-2' : ''}
              >
                <ArchiveCard entry={entry} moodLabel={moodByEntry[entry.id]} variant={index % 4} />
              </li>
            ))}
          </ul>
          {canLoadMore ? (
            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="rounded-full border border-sanctuary-border bg-white px-8 py-3 text-sm font-medium text-sanctuary-primary transition-colors hover:bg-sanctuary-canvas dark:border-zinc-700 dark:bg-zinc-900 dark:text-teal-300 dark:hover:bg-zinc-800"
              >
                Load more ({sortedFiltered.length - visibleCount} remaining)
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

function ArchiveCard({
  entry,
  moodLabel,
  variant,
}: {
  entry: EntryRow
  moodLabel?: string
  variant: number
}) {
  const base =
    'flex h-full min-h-[11rem] flex-col rounded-2xl p-6 text-left transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sanctuary-primary dark:focus-visible:outline-teal-400'

  const shells = [
    `${base} border border-sanctuary-border bg-white shadow-[0px_4px_12px_0px_rgba(44,52,54,0.05)] dark:border-zinc-800 dark:bg-zinc-900`,
    `${base} border border-transparent bg-gradient-to-br from-[#f0f4f6] to-white dark:from-zinc-900 dark:to-zinc-900/80`,
    `${base} border border-sanctuary-border bg-white pl-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:border-l-4 md:border-l-sanctuary-primary dark:md:border-l-teal-400`,
    `${base} border border-[rgba(167,209,238,0.35)] bg-[rgba(255,255,255,0.9)] shadow-inner dark:border-sky-900/40 dark:bg-zinc-900/90`,
  ]

  const titleClass =
    variant === 3
      ? 'font-serif text-2xl italic leading-snug text-sanctuary-text dark:text-zinc-100'
      : 'font-serif text-xl leading-snug text-sanctuary-text dark:text-zinc-100'

  return (
    <Link href={`/entries/${entry.id}`} className={shells[variant] ?? shells[0]}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <time
          className="text-[10px] uppercase tracking-widest text-sanctuary-muted dark:text-zinc-500"
          dateTime={entry.updated_at}
        >
          {formatShortDate(entry.updated_at)}
        </time>
        {moodLabel ? (
          <span
            className="rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white"
            style={{ backgroundColor: moodChartColor(moodLabel) }}
          >
            {moodLabel}
          </span>
        ) : null}
      </div>
      <h2 className={titleClass}>{entry.title?.trim() || 'Untitled'}</h2>
      <p className="mt-2 text-xs text-sanctuary-muted dark:text-zinc-500">
        {entry.word_count} {entry.word_count === 1 ? 'word' : 'words'}
      </p>
      {entry.body_text ? (
        <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-sanctuary-muted dark:text-zinc-400">
          {truncatePreview(entry.body_text, PREVIEW_MAX)}
        </p>
      ) : (
        <p className="mt-3 flex-1 text-sm italic text-sanctuary-muted/70 dark:text-zinc-600">No preview</p>
      )}
      <span className="mt-4 text-sm text-sanctuary-primary dark:text-teal-300">Read →</span>
    </Link>
  )
}
