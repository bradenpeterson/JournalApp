import type { DashboardStats } from '@/lib/dashboard/load-dashboard-stats'

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">{value}</p>
      {sub ? <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{sub}</p> : null}
    </div>
  )
}

function StatSkeleton() {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="h-3 w-20 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      <div className="mt-2 h-8 w-14 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
    </div>
  )
}

export function DashboardStatsSkeleton() {
  return (
    <section className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50/80 p-6 dark:border-neutral-600 dark:bg-neutral-900/40">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        Stats
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
      </div>
    </section>
  )
}

export function DashboardStatsDisplay({ stats }: { stats: DashboardStats }) {
  return (
    <section className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50/80 p-6 dark:border-neutral-600 dark:bg-neutral-900/40">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        Stats
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Current streak" value={stats.currentStreak} />
        <StatCard label="Longest streak" value={stats.longestStreak} />
        <StatCard label="Total entries" value={stats.totalEntries} />
        <StatCard
          label="Total words"
          value={stats.totalWordCount.toLocaleString()}
        />
      </div>
      <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400">
        Streaks use consecutive UTC calendar days from each entry&apos;s <span className="font-medium">created</span>{' '}
        time (not your local timezone).
      </p>
    </section>
  )
}
