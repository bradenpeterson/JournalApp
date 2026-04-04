'use client'

import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { useEffect, useMemo, useState, type ReactNode } from 'react'

import { MoodChart } from '@/components/charts/MoodChart'
import { WritingPromptCard } from '@/components/dashboard/WritingPromptCard'
import type { DashboardStats } from '@/lib/dashboard/load-dashboard-stats'
import { useSupabaseClient } from '@/lib/db/supabase-client'

type EntryRow = {
  id: string
  title: string
  body_text: string | null
  word_count: number
  updated_at: string
  created_at?: string
}

const RECENT_LIMIT = 5
const PREVIEW_MAX = 150
const MOOD_CHIPS = ['Radiant', 'Reflective', 'Calm', 'Vibrant', 'Tired'] as const

function truncatePreview(text: string, max: number) {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function formatShortDate(iso: string) {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(d)
  } catch {
    return iso
  }
}

function utcDateKeyFromIso(iso: string): string | null {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return null
    return d.toISOString().slice(0, 10)
  } catch {
    return null
  }
}

/** Last 7 UTC calendar days, oldest → newest (for bar chart order). */
function lastSevenUtcDateKeys(): string[] {
  const keys: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setUTCHours(0, 0, 0, 0)
    d.setUTCDate(d.getUTCDate() - i)
    keys.push(d.toISOString().slice(0, 10))
  }
  return keys
}

function entryDayKey(e: EntryRow): string | null {
  const raw = e.created_at ?? e.updated_at
  return utcDateKeyFromIso(raw)
}

function countsForLastSevenDays(entries: EntryRow[]): number[] {
  const keys = lastSevenUtcDateKeys()
  const map = new Map(keys.map((k) => [k, 0]))
  for (const e of entries) {
    const k = entryDayKey(e)
    if (k && map.has(k)) map.set(k, (map.get(k) ?? 0) + 1)
  }
  return keys.map((k) => map.get(k) ?? 0)
}

function wordsWrittenLastSevenDays(entries: EntryRow[]): number {
  const keys = new Set(lastSevenUtcDateKeys())
  let sum = 0
  for (const e of entries) {
    const k = entryDayKey(e)
    if (k && keys.has(k)) sum += e.word_count
  }
  return sum
}

function greetingForHour(h: number): string {
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function displayName(user: ReturnType<typeof useUser>['user']): string {
  if (!user) return 'there'
  const first = user.firstName?.trim()
  if (first) return first
  const full = user.fullName?.trim()
  if (full) return full.split(/\s+/)[0] ?? full
  const u = user.username?.trim()
  if (u) return u
  return 'there'
}

function formatThousands(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

export function DashboardHome({ stats }: { stats?: DashboardStats | null } = {}) {
  const { user, isLoaded: userLoaded } = useUser()
  const supabase = useSupabaseClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [entries, setEntries] = useState<EntryRow[]>([])
  const [searchResults, setSearchResults] = useState<EntryRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [topMoodWeek, setTopMoodWeek] = useState<string | null>(null)
  const [topMoodLoading, setTopMoodLoading] = useState(true)

  const [greeting] = useState(() => greetingForHour(new Date().getHours()))

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

        const rows = body as EntryRow[]

        if (debouncedSearch) {
          setSearchResults(rows)
          setEntries([])
        } else {
          setSearchResults(null)
          setEntries(rows)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load')
          setEntries([])
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

  useEffect(() => {
    let cancelled = false

    async function loadTopMood() {
      setTopMoodLoading(true)
      const weekAgo = new Date()
      weekAgo.setUTCDate(weekAgo.getUTCDate() - 7)

      const { data, error: qErr } = await supabase
        .from('mood_analyses')
        .select('mood_label')
        .gte('created_at', weekAgo.toISOString())

      if (cancelled) return

      if (qErr) {
        console.error('Dashboard top mood', qErr)
        setTopMoodWeek(null)
        setTopMoodLoading(false)
        return
      }

      const counts = new Map<string, number>()
      for (const row of data ?? []) {
        const label = typeof row.mood_label === 'string' ? row.mood_label.trim() : ''
        if (!label) continue
        counts.set(label, (counts.get(label) ?? 0) + 1)
      }

      let best: string | null = null
      let bestN = 0
      for (const [label, n] of counts) {
        if (n > bestN) {
          best = label
          bestN = n
        }
      }

      setTopMoodWeek(best)
      setTopMoodLoading(false)
    }

    void loadTopMood()
    return () => {
      cancelled = true
    }
  }, [supabase])

  const showSearchMode = debouncedSearch.length > 0

  const recent = useMemo(() => entries.slice(0, RECENT_LIMIT), [entries])
  const latest = recent[0]
  const moreRecent = recent.slice(1)

  const dayCounts = useMemo(() => countsForLastSevenDays(entries), [entries])
  const weekWords = useMemo(() => wordsWrittenLastSevenDays(entries), [entries])

  const barHeightsPx = useMemo(() => {
    const max = Math.max(...dayCounts, 1)
    return dayCounts.map((c) => 32 + (c / max) * 64)
  }, [dayCounts])
  const peakBarIndex = useMemo(() => {
    let idx = 6
    let m = dayCounts[6] ?? 0
    dayCounts.forEach((c, i) => {
      if (c > m) {
        m = c
        idx = i
      }
    })
    return idx
  }, [dayCounts])

  const name = userLoaded ? displayName(user) : 'there'

  return (
    <div className="w-full max-w-[1280px] px-6 py-10 sm:px-10 lg:px-12">
      <header className="mb-10">
        <h1 className="font-serif text-4xl leading-none text-sanctuary-text dark:text-zinc-100 sm:text-5xl">
          {greeting}, {name}.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-sanctuary-muted dark:text-zinc-400">
          Your sanctuary is waiting.
          {stats != null && stats.currentStreak > 0 ? (
            <>
              {' '}
              You&apos;ve maintained a peaceful rhythm for {stats.currentStreak}{' '}
              {stats.currentStreak === 1 ? 'day' : 'days'}.
            </>
          ) : null}
          <br />
          How does your soul feel today?
        </p>
      </header>

      <section className="mb-10" aria-label="Search entries">
        <label htmlFor="dashboard-search" className="sr-only">
          Search entries
        </label>
        <input
          id="dashboard-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search your reflections…"
          className="w-full max-w-xl rounded-xl border border-sanctuary-border bg-white px-4 py-3 text-sm text-sanctuary-text shadow-sm outline-none ring-sanctuary-primary/20 placeholder:text-sanctuary-muted/50 focus:border-sanctuary-primary focus:ring-4 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
          autoComplete="off"
        />
        <p className="mt-2 text-xs text-sanctuary-muted dark:text-zinc-500">
          Full-text search across entries · same as the{' '}
          <Link href="/entries" className="text-sanctuary-primary underline-offset-2 hover:underline dark:text-teal-300">
            archive
          </Link>
        </p>
      </section>

      {showSearchMode ? (
        <SearchResultsSection
          debouncedSearch={debouncedSearch}
          error={error}
          loading={loading}
          results={searchResults}
          previewMax={PREVIEW_MAX}
        />
      ) : (
        <>
          <section className="mb-8" aria-label="Writing stats">
            {stats == null ? (
              <StatsRowSkeleton />
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl bg-gradient-to-br from-[#a2f0f0] to-[#b5e0fd] p-8 dark:from-teal-900/40 dark:to-sky-900/30">
                  <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-white/50 backdrop-blur-sm dark:bg-zinc-800/80">
                    <FlameIcon className="size-5 text-sanctuary-primary dark:text-teal-300" />
                  </div>
                  <p className="text-xs uppercase leading-4 tracking-widest text-[#005c5c]/80 dark:text-teal-200/80">
                    Current streak
                  </p>
                  <p className="mt-1 font-serif text-4xl leading-tight text-sanctuary-text dark:text-zinc-100">
                    {stats.currentStreak}
                  </p>
                  <p className="text-xs text-[#005c5c] dark:text-teal-200/90">days</p>
                </div>
                <StatTile
                  icon={<StarIcon className="size-5 text-[#4F6174] dark:text-sky-300" />}
                  label="Longest streak"
                  value={stats.longestStreak}
                  sub="days"
                  iconBg="bg-[#d1e4fb] dark:bg-sky-900/50"
                />
                <StatTile
                  icon={<BookIcon className="size-5 text-sanctuary-primary dark:text-teal-300" />}
                  label="Total entries"
                  value={stats.totalEntries}
                  sub="reflections"
                  iconBg="bg-[#f0f4f6] dark:bg-zinc-800"
                />
                <StatTile
                  icon={<DocIcon className="size-5 text-sanctuary-primary dark:text-teal-300" />}
                  label="Total words"
                  value={formatThousands(stats.totalWordCount)}
                  sub="written"
                  iconBg="bg-[#f0f4f6] dark:bg-zinc-800"
                />
              </div>
            )}
            {stats != null ? (
              <p className="mt-3 text-xs text-sanctuary-muted dark:text-zinc-500">
                Streaks use consecutive UTC calendar days from each entry&apos;s{' '}
                <span className="font-medium">created</span> timestamp.
              </p>
            ) : null}
          </section>

          <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-8">
            <div className="rounded-3xl bg-[#f0f4f6] p-10 dark:bg-zinc-900 lg:col-span-5">
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-sanctuary-muted opacity-60 dark:text-zinc-500">
                Consistency
              </p>
              <h2 className="mb-2 font-serif text-4xl leading-tight text-sanctuary-text dark:text-zinc-100">
                {stats?.currentStreak ?? '—'} day streak
              </h2>
              <p className="text-sm leading-5 text-sanctuary-muted dark:text-zinc-400">
                Consistency is the quiet path to clarity. Bars show entries per day (UTC), last seven days.
              </p>
              <div className="mt-12 flex h-24 items-end justify-center gap-1 sm:gap-1.5">
                {barHeightsPx.map((height, i) => (
                  <div
                    key={i}
                    className={`flex-1 max-w-[2.5rem] rounded-t-lg transition-colors ${
                      i === peakBarIndex ? 'bg-sanctuary-primary dark:bg-teal-400' : ''
                    }`}
                    style={{
                      height: `${height}px`,
                      backgroundColor:
                        i === peakBarIndex
                          ? undefined
                          : `rgba(11, 106, 106, ${0.2 + Math.min(i, 5) * 0.08})`,
                    }}
                    title={`${dayCounts[i] ?? 0} entries`}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-white p-10 shadow-[0px_12px_32px_0px_rgba(44,52,54,0.03)] dark:border dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-7">
              <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="mb-2 text-xs uppercase tracking-[0.2em] text-sanctuary-muted opacity-60 dark:text-zinc-500">
                    Quick log
                  </p>
                  <h2 className="font-serif text-3xl leading-9 text-sanctuary-text dark:text-zinc-100">
                    Current state
                  </h2>
                </div>
                <Link
                  href="/analytics"
                  className="flex items-center gap-2 text-sm text-sanctuary-primary dark:text-teal-300"
                >
                  View trends
                  <span aria-hidden className="text-xs">
                    →
                  </span>
                </Link>
              </div>
              <div className="mb-8 flex flex-wrap gap-3">
                {MOOD_CHIPS.map((mood) => (
                  <Link
                    key={mood}
                    href="/journal"
                    className="rounded-full bg-sanctuary-sidebar px-6 py-3 text-sm text-sanctuary-muted transition-colors hover:bg-[#dce4e6] dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    {mood}
                  </Link>
                ))}
              </div>
              <div className="border-t border-sanctuary-border pt-8 dark:border-zinc-800">
                <p className="font-serif text-lg italic leading-7 text-sanctuary-muted dark:text-zinc-400">
                  &ldquo;Today feels like a soft transition between seasons.&rdquo;
                </p>
              </div>
            </div>
          </div>

          {latest ? (
            <section className="mb-8" aria-label="Latest entry">
              <div className="flex flex-col overflow-hidden rounded-3xl bg-white shadow-[0px_12px_32px_0px_rgba(44,52,54,0.05)] dark:border dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row">
                <div
                  className="relative h-40 shrink-0 bg-gradient-to-br from-sanctuary-tint-teal to-sanctuary-tint-blue sm:h-auto sm:w-[196px]"
                  aria-hidden
                />
                <div className="flex flex-1 flex-col justify-between gap-8 p-8 sm:p-10">
                  <div>
                    <div className="mb-4">
                      <span className="inline-block rounded-full bg-[#d1e4fb] px-3 py-1 text-[10px] uppercase leading-4 tracking-widest text-[#415366] dark:bg-sky-900/50 dark:text-sky-200">
                        Last entry · {formatShortDate(latest.updated_at)}
                      </span>
                    </div>
                    <h3 className="mb-4 font-serif text-2xl leading-8 text-sanctuary-text dark:text-zinc-100">
                      {latest.title?.trim() || 'Untitled'}
                    </h3>
                    {latest.body_text ? (
                      <p className="text-base leading-relaxed text-sanctuary-muted dark:text-zinc-400">
                        {truncatePreview(latest.body_text, PREVIEW_MAX)}
                      </p>
                    ) : (
                      <p className="text-sm italic text-sanctuary-muted dark:text-zinc-500">No preview text.</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-4 border-t border-sanctuary-border pt-8 dark:border-zinc-800">
                    <span className="text-xs text-sanctuary-muted dark:text-zinc-500">
                      {latest.word_count} {latest.word_count === 1 ? 'word' : 'words'}
                    </span>
                    <Link
                      href={`/entries/${latest.id}`}
                      className="text-sm text-sanctuary-primary dark:text-teal-300"
                    >
                      Continue reading
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          ) : !loading && !error ? (
            <p className="mb-8 rounded-3xl border border-dashed border-sanctuary-border bg-white/60 p-10 text-center text-sanctuary-muted dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-400">
              No entries yet.{' '}
              <Link href="/journal" className="text-sanctuary-primary underline-offset-2 hover:underline dark:text-teal-300">
                Start writing
              </Link>
              .
            </p>
          ) : null}

          <section
            className="rounded-3xl bg-white p-10 shadow-[0px_12px_32px_0px_rgba(44,52,54,0.03)] dark:border dark:border-zinc-800 dark:bg-zinc-900"
            aria-label="Weekly reflection"
          >
            <p className="mb-6 text-xs uppercase tracking-[0.2em] text-sanctuary-muted opacity-60 dark:text-zinc-500">
              Weekly reflection
            </p>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-8">
              <WeeklyStat
                iconWrapClass="bg-[#a2f0f0] dark:bg-teal-900/50"
                icon={<BellMini className="size-5 text-sanctuary-primary dark:text-teal-300" />}
                label="Top emotion"
                value={
                  topMoodLoading ? '…' : topMoodWeek ? capitalizeWords(topMoodWeek) : '—'
                }
                valueItalic
              />
              <WeeklyStat
                iconWrapClass="bg-[#d1e4fb] dark:bg-sky-900/50"
                icon={<InfoMini className="size-[19px] text-[#4F6174] dark:text-sky-300" />}
                label="Best time to write"
                value="—"
                valueItalic
              />
              <WeeklyStat
                iconWrapClass="bg-[#b5e0fd] dark:bg-sky-800/40"
                icon={<BookmarkMini className="size-4 text-[#3A647D] dark:text-sky-200" />}
                label="Words written"
                value={`${weekWords.toLocaleString()} words this week`}
                valueItalic
              />
            </div>

            <div className="mt-10 border-t border-sanctuary-border pt-6 dark:border-zinc-800">
              <WritingPromptCard
                headingText="Prompt of the week"
                className="border-0 bg-transparent p-0 shadow-none dark:bg-transparent"
                headingClassName="mb-3 text-xs uppercase tracking-[0.15em] text-sanctuary-primary dark:text-teal-300"
                bodyClassName="font-serif text-lg leading-7 text-sanctuary-muted dark:text-zinc-300"
              />
            </div>
          </section>

          <section id="dashboard-mood-trend" className="mt-10 scroll-mt-8" aria-label="Mood trend">
            <div className="rounded-3xl border border-sanctuary-border bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
              <MoodChart />
            </div>
          </section>

          {moreRecent.length > 0 ? (
            <section className="mt-10" aria-label="More recent entries">
              <div className="mb-4 flex items-end justify-between gap-3">
                <h2 className="font-serif text-xl text-sanctuary-text dark:text-zinc-100">More recent</h2>
                <Link
                  href="/entries"
                  className="text-sm text-sanctuary-primary underline-offset-2 hover:underline dark:text-teal-300"
                >
                  View all entries
                </Link>
              </div>
              <ul className="flex flex-col gap-3">
                {moreRecent.map((entry) => (
                  <li key={entry.id}>
                    <EntryRowLink entry={entry} previewMax={PREVIEW_MAX} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <nav className="mt-10 flex flex-wrap gap-4 text-sm" aria-label="Quick links">
            <Link
              href="/journal"
              className="text-sanctuary-primary underline-offset-2 hover:underline dark:text-teal-300"
            >
              New entry
            </Link>
            <Link
              href="/capsules"
              className="text-sanctuary-primary underline-offset-2 hover:underline dark:text-teal-300"
            >
              Time capsules
            </Link>
          </nav>
        </>
      )}
    </div>
  )
}

function capitalizeWords(s: string) {
  return s
    .split(/\s+/)
    .map((w) => (w.length ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ')
}

function SearchResultsSection({
  debouncedSearch,
  error,
  loading,
  results,
  previewMax,
}: {
  debouncedSearch: string
  error: string | null
  loading: boolean
  results: EntryRow[] | null
  previewMax: number
}) {
  return (
    <section aria-label="Search results">
      <h2 className="mb-4 font-serif text-2xl text-sanctuary-text dark:text-zinc-100">Search results</h2>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : loading ? (
        <p className="text-sm text-sanctuary-muted dark:text-zinc-400">Loading…</p>
      ) : (results?.length ?? 0) === 0 ? (
        <p className="rounded-2xl border border-dashed border-sanctuary-border p-8 text-center text-sm text-sanctuary-muted dark:border-zinc-700 dark:text-zinc-400">
          No entries match &ldquo;{debouncedSearch}&rdquo;.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {(results ?? []).map((entry) => (
            <li key={entry.id}>
              <EntryRowLink entry={entry} previewMax={previewMax} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function StatsRowSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl bg-[#f0f4f6] p-8 dark:bg-zinc-800"
          aria-hidden
        >
          <div className="mb-4 h-10 w-10 rounded-xl bg-white/60 dark:bg-zinc-700" />
          <div className="mb-2 h-3 w-24 rounded bg-white/60 dark:bg-zinc-700" />
          <div className="h-9 w-16 rounded bg-white/60 dark:bg-zinc-700" />
        </div>
      ))}
    </div>
  )
}

function StatTile({
  icon,
  label,
  value,
  sub,
  iconBg,
}: {
  icon: ReactNode
  label: string
  value: string | number
  sub: string
  iconBg: string
}) {
  return (
    <div className="rounded-2xl bg-white p-8 shadow-[0px_4px_12px_0px_rgba(44,52,54,0.05)] dark:border dark:border-zinc-800 dark:bg-zinc-900">
      <div className={`mb-2 flex size-10 items-center justify-center rounded-xl ${iconBg}`}>{icon}</div>
      <p className="text-xs uppercase leading-4 tracking-widest text-sanctuary-muted opacity-60 dark:text-zinc-500">
        {label}
      </p>
      <p className="mt-1 font-serif text-4xl leading-tight text-sanctuary-text dark:text-zinc-100">{value}</p>
      <p className="text-xs text-sanctuary-muted dark:text-zinc-500">{sub}</p>
    </div>
  )
}

function WeeklyStat({
  icon,
  iconWrapClass,
  label,
  value,
  valueItalic,
}: {
  icon: ReactNode
  iconWrapClass: string
  label: string
  value: string
  valueItalic?: boolean
}) {
  return (
    <div className="flex gap-4">
      <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${iconWrapClass}`}>{icon}</div>
      <div className="min-w-0">
        <p className="mb-1 text-xs uppercase tracking-wider text-sanctuary-muted/50 dark:text-zinc-500">{label}</p>
        <p
          className={`font-serif text-xl leading-7 text-sanctuary-text dark:text-zinc-100 ${valueItalic ? 'italic' : ''}`}
        >
          {value}
        </p>
      </div>
    </div>
  )
}

function EntryRowLink({ entry, previewMax }: { entry: EntryRow; previewMax: number }) {
  return (
    <Link
      href={`/entries/${entry.id}`}
      className="block rounded-2xl border border-sanctuary-border bg-white p-4 transition hover:border-sanctuary-primary/30 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-teal-700/50"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium text-sanctuary-text dark:text-zinc-100">
          {entry.title?.trim() || 'Untitled'}
        </span>
        <time className="text-xs text-sanctuary-muted dark:text-zinc-500" dateTime={entry.updated_at}>
          {formatShortDate(entry.updated_at)}
        </time>
      </div>
      <p className="mt-1 text-xs text-sanctuary-muted dark:text-zinc-500">
        {entry.word_count} {entry.word_count === 1 ? 'word' : 'words'}
      </p>
      {entry.body_text ? (
        <p className="mt-2 line-clamp-2 text-sm text-sanctuary-muted dark:text-zinc-400">
          {truncatePreview(entry.body_text, previewMax)}
        </p>
      ) : null}
    </Link>
  )
}

function FlameIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20" aria-hidden>
      <path
        fillRule="evenodd"
        d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20" aria-hidden>
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  )
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20" aria-hidden>
      <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
    </svg>
  )
}

function DocIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20" aria-hidden>
      <path
        fillRule="evenodd"
        d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function BellMini({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20" aria-hidden>
      <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
    </svg>
  )
}

function InfoMini({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 19 19" aria-hidden>
      <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 12H9v-2h2v2zm0-4H9V6h2v4z" />
    </svg>
  )
}

function BookmarkMini({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 15 20" aria-hidden>
      <path d="M13 2H6a2 2 0 00-2 2v16l4-2.5L12 20V4a2 2 0 011-1.73A2 2 0 0013 2z" />
    </svg>
  )
}
