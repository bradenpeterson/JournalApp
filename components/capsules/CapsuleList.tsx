'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

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
    return <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading capsules…</p>
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
      <p className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-600 dark:text-neutral-400">
        No time capsules yet.{' '}
        <Link href="/capsules/new" className="text-violet-600 underline-offset-2 hover:underline dark:text-violet-400">
          Create one
        </Link>
        .
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((c) => (
        <li key={c.id}>
          <Link
            href={`/capsules/${c.id}`}
            className="block rounded-lg border border-neutral-200 bg-white p-4 transition hover:border-violet-300 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-violet-700"
          >
            <div className="flex items-start gap-3">
              {!c.is_unlocked ? (
                <LockIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
              ) : (
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                  ✓
                </span>
              )}
              <div className="min-w-0 flex-1">
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  {c.title?.trim() || 'Untitled'}
                </span>
                {!c.is_unlocked ? (
                  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                    Unlocks {formatWhen(c.unlock_at)}
                    {(() => {
                      const left = formatUnlockCountdown(c.unlock_at, now)
                      return left ? (
                        <span className="ml-2 font-mono text-violet-600 dark:text-violet-400">
                          · {left} left
                        </span>
                      ) : (
                        <span className="ml-2 text-amber-600 dark:text-amber-400">· due now</span>
                      )
                    })()}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    Unlocked · {formatWhen(c.created_at)}
                  </p>
                )}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
