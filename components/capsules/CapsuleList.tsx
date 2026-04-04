'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { LockIcon } from '@/components/capsules/LockIcon'
import { formatUnlockCountdown } from '@/lib/capsules/countdown'
import { useInterval } from '@/lib/hooks/useInterval'

type CapsuleListItem = {
  id: string
  title: string
  unlock_at: string
  is_unlocked: boolean
  created_at: string
  body?: unknown
}

function formatWhen(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function formatShortDate(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function CapsuleList() {
  const [items, setItems] = useState<CapsuleListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const hasLocked = items.some((c) => !c.is_unlocked)
  useInterval(
    useCallback(() => setNow(Date.now()), []),
    hasLocked ? 1000 : null,
  )

  const { locked, unlocked } = useMemo(() => {
    const l = items.filter((c) => !c.is_unlocked)
    const u = items.filter((c) => c.is_unlocked)
    l.sort((a, b) => new Date(a.unlock_at).getTime() - new Date(b.unlock_at).getTime())
    u.sort((a, b) => new Date(b.unlock_at).getTime() - new Date(a.unlock_at).getTime())
    return { locked: l, unlocked: u }
  }, [items])

  useEffect(() => {
    let cancelled = false

    async function run() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/capsules')
        const body = (await res.json().catch(() => null)) as { error?: string } | CapsuleListItem[] | null
        if (!res.ok) {
          const msg =
            body && typeof body === 'object' && !Array.isArray(body) && body.error
              ? body.error
              : `Request failed (${res.status})`
          throw new Error(msg)
        }
        if (!Array.isArray(body)) throw new Error('Invalid response')
        if (!cancelled) setItems(body)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load')
          setItems([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl bg-[#f0f4f6] dark:bg-zinc-800" aria-hidden />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400" role="alert">
        {error}
      </p>
    )
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-sanctuary-border bg-white/60 p-12 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
        <p className="text-sanctuary-muted dark:text-zinc-400">
          No time capsules yet.{' '}
          <Link href="/capsules/new" className="text-sanctuary-primary underline-offset-2 hover:underline dark:text-teal-300">
            Seal your first note
          </Link>
          .
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-12">
      {locked.length > 0 ? (
        <section aria-label="Sealed capsules">
          <h2 className="mb-6 font-serif text-2xl text-sanctuary-text dark:text-zinc-100">Sealed</h2>
          <ul className="grid list-none grid-cols-1 gap-6 p-0 md:grid-cols-2">
            {locked.map((c, i) => (
              <li key={c.id}>
                <CapsuleCard item={c} now={now} sealed variant={i % 3} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {unlocked.length > 0 ? (
        <section aria-label="Opened capsules">
          <h2 className="mb-6 font-serif text-2xl text-sanctuary-text dark:text-zinc-100">Opened</h2>
          <ul className="grid list-none grid-cols-1 gap-6 p-0 md:grid-cols-2">
            {unlocked.map((c, i) => (
              <li key={c.id}>
                <CapsuleCard item={c} now={now} sealed={false} variant={i % 3} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

function CapsuleCard({
  item: c,
  now,
  sealed,
  variant,
}: {
  item: CapsuleListItem
  now: number
  sealed: boolean
  variant: number
}) {
  const shells = sealed
    ? [
        'border border-sanctuary-border bg-gradient-to-br from-sanctuary-sidebar/90 to-white shadow-[0px_8px_24px_0px_rgba(44,52,54,0.06)] dark:from-zinc-900 dark:to-zinc-950 dark:border-zinc-800',
        'border border-[#d1e4fb]/60 bg-white/80 backdrop-blur-sm dark:border-sky-900/40 dark:bg-zinc-900/80',
        'border border-sanctuary-border bg-white pl-4 md:border-l-4 md:border-l-sanctuary-primary dark:bg-zinc-900 dark:md:border-l-teal-400',
      ]
    : [
        'border border-sanctuary-border bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900',
        'border border-transparent bg-gradient-to-br from-[#f0f4f6] to-white dark:from-zinc-900 dark:to-zinc-900/80',
        'border border-sanctuary-tint-teal/40 bg-[rgba(162,240,240,0.12)] dark:border-teal-900/30 dark:bg-teal-950/20',
      ]

  return (
    <Link
      href={`/capsules/${c.id}`}
      className={`relative block min-h-[9rem] overflow-hidden rounded-2xl p-6 transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sanctuary-primary dark:focus-visible:outline-teal-400 ${shells[variant] ?? shells[0]}`}
    >
      {sealed ? (
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white/70 via-white/20 to-transparent backdrop-blur-[2px] dark:from-zinc-950/60 dark:via-transparent"
          aria-hidden
        />
      ) : null}
      <div className="relative flex items-start gap-4">
        <div
          className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
            sealed ? 'bg-[#d1e4fb]/80 dark:bg-sky-900/50' : 'bg-[#a2f0f0]/50 dark:bg-teal-900/40'
          }`}
        >
          {sealed ? (
            <LockIcon className="size-6 text-[#415366] dark:text-sky-200" />
          ) : (
            <span className="text-sm font-semibold text-sanctuary-primary dark:text-teal-300" aria-hidden>
              ✓
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-xl leading-snug text-sanctuary-text dark:text-zinc-100">
            {c.title?.trim() || 'Untitled'}
          </h3>
          {sealed ? (
            <>
              <p className="mt-2 text-sm text-sanctuary-muted dark:text-zinc-400">
                Unlocks {formatWhen(c.unlock_at)}
              </p>
              <p className="mt-2 font-mono text-base text-sanctuary-primary dark:text-teal-300">
                {(() => {
                  const left = formatUnlockCountdown(c.unlock_at, now)
                  return left ? `${left} left` : 'Due now'
                })()}
              </p>
              <p className="mt-3 text-xs text-sanctuary-muted/80 dark:text-zinc-500">Body hidden until unlock</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-sanctuary-muted dark:text-zinc-400">
              Opened · unlocked {formatShortDate(c.unlock_at)}
            </p>
          )}
          <span className="mt-4 inline-block text-sm text-sanctuary-primary dark:text-teal-300">Open →</span>
        </div>
      </div>
    </Link>
  )
}
