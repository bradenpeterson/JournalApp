import Link from 'next/link'
import type { ReactNode } from 'react'

import { SETTINGS_SECTION_SHELL } from '@/components/settings/settings-section-shell'
import type { DashboardStats } from '@/lib/dashboard/load-dashboard-stats'

function formatThousands(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
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

function StatRow({
  icon,
  iconWrapClass,
  label,
  value,
  sub,
}: {
  icon: ReactNode
  iconWrapClass: string
  label: string
  value: string | number
  sub: string
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-sanctuary-border bg-white/80 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/40">
      <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${iconWrapClass}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-sanctuary-muted dark:text-zinc-500">{label}</p>
        <p className="font-serif text-xl leading-tight text-sanctuary-text dark:text-zinc-100">
          {value}
          <span className="ml-1 text-xs font-sans font-normal text-sanctuary-muted dark:text-zinc-500">{sub}</span>
        </p>
      </div>
    </div>
  )
}

export function JourneyStatsCard({ stats }: { stats: DashboardStats }) {
  return (
    <aside className={`${SETTINGS_SECTION_SHELL} lg:sticky lg:top-28`}>
      <p className="text-xs uppercase tracking-[0.2em] text-sanctuary-muted opacity-70 dark:text-zinc-500">
        Journey stats
      </p>
      <h2 className="mt-2 font-serif text-2xl leading-tight text-sanctuary-text dark:text-zinc-100">
        Your writing life
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-sanctuary-muted dark:text-zinc-400">
        Snapshot from your journal. Streaks use consecutive UTC calendar days from each entry&apos;s created time.
      </p>

      <div className="mt-6 rounded-2xl bg-gradient-to-br from-[#a2f0f0] to-[#b5e0fd] p-6 dark:from-teal-900/40 dark:to-sky-900/30">
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

      <div className="mt-4 space-y-3">
        <StatRow
          icon={<StarIcon className="size-5 text-[#4F6174] dark:text-sky-300" />}
          iconWrapClass="bg-[#d1e4fb] dark:bg-sky-900/50"
          label="Longest streak"
          value={stats.longestStreak}
          sub="days"
        />
        <StatRow
          icon={<BookIcon className="size-5 text-sanctuary-primary dark:text-teal-300" />}
          iconWrapClass="bg-[#f0f4f6] dark:bg-zinc-800"
          label="Total entries"
          value={stats.totalEntries}
          sub="reflections"
        />
        <StatRow
          icon={<DocIcon className="size-5 text-sanctuary-primary dark:text-teal-300" />}
          iconWrapClass="bg-[#f0f4f6] dark:bg-zinc-800"
          label="Total words"
          value={formatThousands(stats.totalWordCount)}
          sub="written"
        />
      </div>

      <Link
        href="/dashboard"
        className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-sanctuary-primary transition-colors hover:text-sanctuary-primary-hover dark:text-teal-300 dark:hover:text-teal-200"
      >
        View full sanctuary
        <span aria-hidden>→</span>
      </Link>
    </aside>
  )
}
