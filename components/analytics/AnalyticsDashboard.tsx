'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { TrendingUp } from 'lucide-react'

import type { AnalyticsData, AnalyticsMoodRow } from '@/lib/analytics/load-analytics-data'
import { moodChartColor } from '@/lib/mood/chart-colors'

const STOPWORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'from',
  'your',
  'have',
  'been',
  'were',
  'are',
  'not',
  'but',
  'what',
  'when',
  'you',
  'has',
  'may',
  'can',
  'its',
  'into',
  'more',
  'than',
  'also',
  'some',
  'about',
  'their',
  'there',
  'will',
  'would',
  'could',
  'very',
  'much',
  'today',
  'entry',
  'journal',
  'feeling',
  'feels',
])

function formatShortDate(iso: string) {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(d)
  } catch {
    return iso
  }
}

function cutoffIso(days: number): string {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString()
}

function filterSince(rows: AnalyticsMoodRow[], days: number): AnalyticsMoodRow[] {
  const cut = cutoffIso(days)
  return rows.filter((r) => r.created_at >= cut)
}

function averageScoreByDay(rows: AnalyticsMoodRow[]): { dateKey: string; avg: number; dateLabel: string }[] {
  const byDay = new Map<string, number[]>()
  for (const r of rows) {
    const k = r.created_at.slice(0, 10)
    if (!byDay.has(k)) byDay.set(k, [])
    byDay.get(k)!.push(r.score)
  }
  const keys = [...byDay.keys()].sort()
  return keys.map((dateKey) => {
    const scores = byDay.get(dateKey)!
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    return { dateKey, avg, dateLabel: formatShortDate(`${dateKey}T12:00:00Z`) }
  })
}

function moodDistribution(rows: AnalyticsMoodRow[]): { mood: string; count: number; pct: number }[] {
  const counts = new Map<string, number>()
  for (const r of rows) {
    const m = r.mood_label.trim() || 'unknown'
    counts.set(m, (counts.get(m) ?? 0) + 1)
  }
  const total = rows.length
  if (total === 0) return []
  return [...counts.entries()]
    .map(([mood, count]) => ({ mood, count, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count)
}

function topKeywordsFromSummaries(rows: AnalyticsMoodRow[], limit: number): string[] {
  const counts = new Map<string, number>()
  for (const r of rows) {
    const s = r.summary?.toLowerCase() ?? ''
    const words = s.match(/\b[a-z]{4,}\b/g) ?? []
    for (const w of words) {
      if (STOPWORDS.has(w)) continue
      counts.set(w, (counts.get(w) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([w]) => w)
}

function last28UtcDayKeys(): string[] {
  const keys: string[] = []
  for (let i = 27; i >= 0; i--) {
    const d = new Date()
    d.setUTCHours(0, 0, 0, 0)
    d.setUTCDate(d.getUTCDate() - i)
    keys.push(d.toISOString().slice(0, 10))
  }
  return keys
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function entriesThisUtcMonth(entryCountByDay: Record<string, number>): number {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  let sum = 0
  for (const [k, v] of Object.entries(entryCountByDay)) {
    const d = new Date(`${k}T12:00:00Z`)
    if (d.getUTCFullYear() === y && d.getUTCMonth() === m) sum += v
  }
  return sum
}

type Props = {
  data: AnalyticsData
}

export function AnalyticsDashboard({ data }: Props) {
  const [rangeDays, setRangeDays] = useState<30 | 90>(30)

  const filtered = useMemo(() => filterSince(data.analyses, rangeDays), [data.analyses, rangeDays])

  const linePoints = useMemo(() => {
    const daily = averageScoreByDay(filtered)
    return daily.map((d) => ({
      dateLabel: d.dateLabel,
      intensity: Math.round(d.avg * 10) / 10,
      dateKey: d.dateKey,
    }))
  }, [filtered])

  const distribution = useMemo(() => moodDistribution(filtered), [filtered])

  const latestSummary = useMemo(() => {
    if (filtered.length === 0) return null
    const last = filtered[filtered.length - 1]
    const t = last.summary?.trim()
    return t && t.length > 0 ? t : null
  }, [filtered])

  const insightBullets = useMemo(() => {
    const bullets: string[] = []
    if (filtered.length === 0) return bullets
    const dist = moodDistribution(filtered)
    if (dist[0]) {
      bullets.push(
        `Most frequent mood label in this window: ${dist[0].mood} (${dist[0].pct}% of analyses).`,
      )
    }
    const byWeekday = new Map<number, number[]>()
    for (const r of filtered) {
      const wd = new Date(r.created_at).getUTCDay()
      if (!byWeekday.has(wd)) byWeekday.set(wd, [])
      byWeekday.get(wd)!.push(r.score)
    }
    let bestWd = -1
    let bestAvg = -1
    for (const [wd, scores] of byWeekday) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length
      if (avg > bestAvg) {
        bestAvg = avg
        bestWd = wd
      }
    }
    if (bestWd >= 0) {
      const name = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][bestWd]
      bullets.push(`Highest average mood scores tend to fall on ${name}s (UTC-based).`)
    }
    bullets.push(`${filtered.length} mood ${filtered.length === 1 ? 'analysis' : 'analyses'} in the selected period.`)
    return bullets.slice(0, 3)
  }, [filtered])

  const keywords = useMemo(() => topKeywordsFromSummaries(filtered, 8), [filtered])

  const heatmapKeys = useMemo(() => last28UtcDayKeys(), [])
  const heatmapRows = useMemo(() => chunk(heatmapKeys, 7), [heatmapKeys])
  const maxEntryDay = useMemo(() => {
    let m = 1
    for (const k of heatmapKeys) {
      m = Math.max(m, data.entryCountByDay[k] ?? 0)
    }
    return m
  }, [heatmapKeys, data.entryCountByDay])

  const entriesThisMonth = useMemo(() => entriesThisUtcMonth(data.entryCountByDay), [data.entryCountByDay])

  const dominantTags = useMemo(() => {
    const moods = moodDistribution(filtered).slice(0, 4)
    const tags = moods.map((m) => m.mood)
    for (const w of keywords) {
      if (tags.length >= 6) break
      if (!tags.includes(w)) tags.push(w)
    }
    return tags.slice(0, 6)
  }, [filtered, keywords])

  const hasLineData = linePoints.length >= 2

  return (
    <div className="w-full max-w-[1280px] px-6 py-10 sm:px-12">
      <header className="mb-12">
        <h1 className="font-serif text-4xl italic leading-none text-sanctuary-text dark:text-zinc-100 sm:text-5xl">
          Mood analytics
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-sanctuary-muted dark:text-zinc-400">
          A quiet window into your emotional landscape. Scores come from saved mood analyses (1–10) tied to each
          journal entry.
        </p>
      </header>

      <div className="mb-10 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-8">
        <section
          className="rounded-xl border border-white/40 bg-white/60 p-10 shadow-[0px_12px_32px_0px_rgba(44,52,54,0.05)] backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/70 lg:col-span-5"
          aria-label="Mood summary"
        >
          <div className="mb-6 flex items-center gap-3">
            <TrendingUp className="size-5 text-sanctuary-primary dark:text-teal-300" aria-hidden />
            <h2 className="text-xs uppercase tracking-[0.2em] text-sanctuary-muted dark:text-zinc-400">
              Mood summary
            </h2>
          </div>

          {latestSummary ? (
            <blockquote className="mb-6 font-serif text-2xl italic leading-snug text-sanctuary-text dark:text-zinc-100">
              &ldquo;{latestSummary.length > 220 ? `${latestSummary.slice(0, 219)}…` : latestSummary}&rdquo;
            </blockquote>
          ) : (
            <p className="mb-6 text-sm leading-relaxed text-sanctuary-muted dark:text-zinc-400">
              No analysis narratives in this window yet. Save a journal entry and let the analyzer run — summaries
              will appear here.
            </p>
          )}

          {insightBullets.length === 0 ? (
            <p className="text-sm leading-relaxed text-sanctuary-muted dark:text-zinc-500">
              No analyses in the last {rangeDays} days. Widen to 90D or keep journaling — stats appear after mood
              analysis runs on your entries.
            </p>
          ) : (
            <ul className="space-y-4">
              {insightBullets.map((text, i) => (
                <li key={i} className="flex gap-4 text-sm leading-relaxed text-sanctuary-muted dark:text-zinc-400">
                  <span
                    className="mt-1.5 size-1.5 shrink-0 rounded-full bg-sanctuary-primary dark:bg-teal-400"
                    aria-hidden
                  />
                  {text}
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            disabled
            title="Not implemented"
            className="mt-10 text-xs uppercase tracking-wider text-sanctuary-primary opacity-50 dark:text-teal-300"
          >
            Full AI report →
          </button>
        </section>

        <section
          className="rounded-xl bg-white p-10 shadow-[0px_12px_32px_0px_rgba(44,52,54,0.05)] dark:border dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-7"
          aria-label="Mood trajectory"
        >
          <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-serif text-3xl italic text-sanctuary-text dark:text-zinc-100">
                Monthly trajectory
              </h2>
              <p className="mt-1 text-xs uppercase tracking-wider text-sanctuary-muted dark:text-zinc-500">
                Average mood score by day
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRangeDays(30)}
                className={`rounded-full px-4 py-2 text-xs ${
                  rangeDays === 30
                    ? 'bg-white text-sanctuary-text shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
                    : 'text-sanctuary-muted dark:text-zinc-400'
                }`}
              >
                30D
              </button>
              <button
                type="button"
                onClick={() => setRangeDays(90)}
                className={`rounded-full px-4 py-2 text-xs ${
                  rangeDays === 90
                    ? 'bg-white text-sanctuary-text shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
                    : 'text-sanctuary-muted dark:text-zinc-400'
                }`}
              >
                90D
              </button>
            </div>
          </div>

          {hasLineData ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={linePoints} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eaeff0" className="dark:stroke-zinc-800" />
                  <XAxis
                    dataKey="dateLabel"
                    tick={{ fontSize: 10, fill: 'var(--tw-prose-body, #596063)' }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis domain={[1, 10]} width={28} tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #eaeff0',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value) => [`${value ?? '—'}`, 'Avg score']}
                  />
                  <Line
                    type="monotone"
                    dataKey="intensity"
                    stroke="#0b6a6a"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-sanctuary-border text-center text-sm text-sanctuary-muted dark:border-zinc-700 dark:text-zinc-500">
              <p>Need at least two days with analyses to draw a trend.</p>
              <p className="mt-2">
                <Link href="/journal" className="text-sanctuary-primary underline-offset-2 hover:underline dark:text-teal-300">
                  Write in the journal
                </Link>
              </p>
            </div>
          )}
        </section>
      </div>

      <div className="mb-10 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-8">
        <section
          className="rounded-xl bg-[rgba(220,228,230,0.3)] p-10 dark:bg-zinc-900/50 lg:col-span-6"
          aria-label="Daily distribution"
        >
          <h2 className="mb-10 text-xs uppercase tracking-[0.2em] text-sanctuary-muted dark:text-zinc-500">
            Daily distribution
          </h2>
          {distribution.length === 0 ? (
            <p className="text-sm text-sanctuary-muted dark:text-zinc-500">No mood labels in this range.</p>
          ) : (
            <div className="space-y-8">
              {distribution.slice(0, 6).map((item) => (
                <div key={item.mood} className="flex items-center gap-6">
                  <div className="w-24 shrink-0 font-serif text-lg italic capitalize text-sanctuary-text dark:text-zinc-200">
                    {item.mood}
                  </div>
                  <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-[#eaeff0] dark:bg-zinc-800">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        width: `${item.pct}%`,
                        backgroundColor: moodChartColor(item.mood),
                      }}
                    />
                  </div>
                  <div className="w-10 text-right text-xs tabular-nums text-sanctuary-text dark:text-zinc-300">
                    {item.pct}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section
          className="rounded-xl bg-[#f0f4f6] p-10 dark:bg-zinc-900/80 lg:col-span-6"
          aria-label="Journaling frequency"
        >
          <div className="mb-10 flex flex-wrap items-start justify-between gap-2">
            <h2 className="text-xs uppercase tracking-[0.2em] text-sanctuary-muted dark:text-zinc-500">
              Journaling frequency
            </h2>
            <p className="font-serif text-sm italic text-sanctuary-text dark:text-zinc-200">
              {entriesThisMonth} {entriesThisMonth === 1 ? 'entry' : 'entries'} this month (UTC)
            </p>
          </div>

          <p className="mb-3 text-[10px] uppercase tracking-wide text-sanctuary-muted/60 dark:text-zinc-600">
            Last 28 days · entries per day (UTC)
          </p>
          <div className="space-y-2">
            {heatmapRows.map((row, ri) => (
              <div key={ri} className="grid grid-cols-7 gap-2">
                {row.map((dayKey) => {
                  const c = data.entryCountByDay[dayKey] ?? 0
                  const opacity = maxEntryDay > 0 ? 0.15 + (c / maxEntryDay) * 0.85 : 0.1
                  return (
                    <div
                      key={dayKey}
                      className="aspect-square rounded-sm bg-sanctuary-primary dark:bg-teal-500"
                      style={{ opacity }}
                      title={`${dayKey}: ${c} ${c === 1 ? 'entry' : 'entries'}`}
                    />
                  )
                })}
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-end gap-2 text-[9px] uppercase tracking-wide text-sanctuary-muted/50 dark:text-zinc-600">
            <span>Less</span>
            <div className="flex gap-1">
              {[0.2, 0.45, 0.7, 1].map((op, i) => (
                <div
                  key={i}
                  className="size-2.5 rounded-sm bg-sanctuary-primary dark:bg-teal-500"
                  style={{ opacity: op }}
                />
              ))}
            </div>
            <span>More</span>
          </div>
        </section>
      </div>

      <section
        className="rounded-xl bg-white p-10 shadow-[0px_12px_32px_0px_rgba(44,52,54,0.05)] dark:border dark:border-zinc-800 dark:bg-zinc-900"
        aria-label="Dominant mood markers"
      >
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <h2 className="font-serif text-3xl text-sanctuary-text dark:text-zinc-100">Dominant mood markers</h2>
          <p className="max-w-xs text-right text-xs leading-relaxed text-sanctuary-muted dark:text-zinc-500">
            Mood labels and recurring words from analysis summaries in the selected range ({rangeDays}D).
          </p>
        </div>
        {dominantTags.length === 0 ? (
          <p className="text-sm text-sanctuary-muted dark:text-zinc-500">Nothing to show yet for this window.</p>
        ) : (
          <div className="flex flex-wrap gap-4">
            {dominantTags.map((word, i) => (
              <span
                key={`${word}-${i}`}
                className={`rounded-full px-6 py-3 font-serif text-base italic ${
                  i === 0
                    ? 'bg-[#a2f0f0] text-[#005c5c] dark:bg-teal-900/50 dark:text-teal-200'
                    : i === 2
                      ? 'bg-[#d1e4fb] text-[#305b73] dark:bg-sky-900/40 dark:text-sky-200'
                      : 'bg-[#f0f4f6] text-sanctuary-muted dark:bg-zinc-800 dark:text-zinc-300'
                }`}
              >
                {word}
              </span>
            ))}
          </div>
        )}
      </section>

      <p className="mt-10 text-center text-xs text-sanctuary-muted dark:text-zinc-600">
        <Link href="/dashboard" className="text-sanctuary-primary underline-offset-2 hover:underline dark:text-teal-300">
          Back to dashboard
        </Link>
      </p>
    </div>
  )
}
