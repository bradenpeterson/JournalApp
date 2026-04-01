'use client'

import { useSession } from '@clerk/nextjs'
import { useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useSupabaseClient } from '@/lib/db/supabase-client'
import { moodChartColor } from '@/lib/mood/chart-colors'

const FETCH_LIMIT = 30
const TOOLTIP_SUMMARY_MAX = 140
const CHART_HEIGHT = 280

type MoodRow = {
  id: string
  score: number
  mood_label: string
  summary: string | null
  created_at: string
}

type ChartPoint = MoodRow & {
  /** Short x-axis label */
  dateLabel: string
}

function formatAxisDate(iso: string) {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(d)
  } catch {
    return iso
  }
}

function truncateSummary(text: string | null, max: number) {
  if (!text) return '—'
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

type DotRenderProps = {
  cx?: number
  cy?: number
  payload?: ChartPoint
}

function MoodDot({ cx, cy, payload }: DotRenderProps) {
  if (cx == null || cy == null || !payload) return null
  const fill = moodChartColor(payload.mood_label)
  return <circle cx={cx} cy={cy} r={6} fill={fill} stroke="var(--background, #fff)" strokeWidth={2} />
}

export function MoodChart() {
  const { isLoaded, session } = useSession()
  const supabase = useSupabaseClient()
  const [rows, setRows] = useState<MoodRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoaded) return

    let cancelled = false

    async function run() {
      if (!session) {
        if (!cancelled) {
          setRows([])
          setLoading(false)
        }
        return
      }

      if (!cancelled) {
        setLoading(true)
        setError(null)
      }

      const { data, error: qError } = await supabase
        .from('mood_analyses')
        .select('id, score, mood_label, summary, created_at')
        .order('created_at', { ascending: false })
        .limit(FETCH_LIMIT)

      if (cancelled) return

      if (qError) {
        console.error('MoodChart load', qError)
        setError('Could not load mood data')
        setRows([])
        setLoading(false)
        return
      }

      setRows((data ?? []) as MoodRow[])
      setLoading(false)
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [isLoaded, session, supabase])

  const chartData = useMemo((): ChartPoint[] => {
    const chronological = [...rows].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    return chronological.map((r) => ({
      ...r,
      dateLabel: formatAxisDate(r.created_at),
    }))
  }, [rows])

  function tooltipContent({
    active,
    payload,
  }: {
    active?: boolean
    payload?: ReadonlyArray<{ payload?: ChartPoint }>
  }) {
    if (!active || !payload?.[0]?.payload) return null
    const p = payload[0].payload
    return (
      <div className="max-w-xs rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm shadow-md dark:border-neutral-700 dark:bg-neutral-900">
        <p className="font-semibold capitalize text-neutral-900 dark:text-neutral-100">
          {p.mood_label} · {p.score}/10
        </p>
        <p className="mt-1 text-neutral-600 dark:text-neutral-300">
          {truncateSummary(p.summary, TOOLTIP_SUMMARY_MAX)}
        </p>
        <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">{p.dateLabel}</p>
      </div>
    )
  }

  if (!isLoaded || loading) {
    return (
      <section aria-busy="true" aria-label="Mood trend chart loading" className="flex flex-col gap-3">
        <div className="h-5 w-40 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        <div
          className="w-full animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800"
          style={{ height: CHART_HEIGHT }}
        />
      </section>
    )
  }

  if (error) {
    return (
      <section aria-label="Mood trend chart" className="text-sm text-red-600 dark:text-red-400">
        {error}
      </section>
    )
  }

  if (chartData.length < 2) {
    return (
      <section
        aria-label="Mood trend chart"
        className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-600 dark:text-neutral-400"
      >
        <p className="font-medium text-neutral-700 dark:text-neutral-300">Not enough data yet</p>
        <p className="mt-1 max-w-sm">
          The mood chart needs at least two saved analyses. Keep journaling!
        </p>
      </section>
    )
  }

  return (
    <section aria-label="Mood trend chart" className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        Mood trend
      </h2>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        Last {Math.min(chartData.length, FETCH_LIMIT)} analyses · score 1–10 over time
      </p>
      <div className="w-full" style={{ height: CHART_HEIGHT }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-200 dark:stroke-neutral-800" />
            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 11 }}
              className="text-neutral-500"
              interval="preserveStartEnd"
            />
            <YAxis domain={[1, 10]} tickCount={6} width={32} tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip content={tooltipContent} />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#64748b"
              strokeWidth={2}
              dot={<MoodDot />}
              activeDot={{ r: 8 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-wrap gap-3 text-xs text-neutral-500 dark:text-neutral-400">
        {Array.from(new Set(chartData.map((d) => d.mood_label))).map((label) => (
          <li key={label} className="flex items-center gap-1.5">
            <span
              className="inline-block size-2.5 rounded-full"
              style={{ backgroundColor: moodChartColor(label) }}
            />
            <span className="capitalize">{label}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
