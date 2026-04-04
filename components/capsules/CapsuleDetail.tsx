'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { CapsuleReadOnlyBody } from '@/components/capsules/CapsuleReadOnlyBody'
import { LockIcon } from '@/components/capsules/LockIcon'
import { formatUnlockCountdown } from '@/lib/capsules/countdown'
import { useInterval } from '@/lib/hooks/useInterval'
import { isUuid } from '@/lib/utils/uuid'

type CapsuleDetailLocked = {
  id: string
  title: string
  unlock_at: string
  is_unlocked: false
  created_at: string
}

type CapsuleDetailUnlocked = {
  id: string
  title: string
  body: unknown
  unlock_at: string
  is_unlocked: true
  notification_sent: boolean
  created_at: string
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

export function CapsuleDetail({ capsuleId }: { capsuleId: string }) {
  const [row, setRow] = useState<CapsuleDetailLocked | CapsuleDetailUnlocked | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const locked = row && !row.is_unlocked
  useInterval(
    useCallback(() => setNow(Date.now()), []),
    locked ? 1000 : null,
  )

  const pastUnlockAt = useMemo(
    () => Boolean(row && !row.is_unlocked && new Date(row.unlock_at).getTime() <= now),
    [row, now],
  )

  const loadCapsule = useCallback(
    async (silent: boolean) => {
      if (!isUuid(capsuleId)) {
        setError('Invalid capsule id')
        setLoading(false)
        return
      }

      if (!silent) {
        setLoading(true)
        setError(null)
      }

      try {
        const res = await fetch(`/api/capsules/${encodeURIComponent(capsuleId)}`)
        const data = (await res.json().catch(() => null)) as { error?: string } | CapsuleDetailLocked | CapsuleDetailUnlocked | null

        if (res.status === 404) {
          setError('Capsule not found')
          setRow(null)
          return
        }

        if (!res.ok) {
          const msg =
            data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
              ? data.error
              : `Request failed (${res.status})`
          throw new Error(msg)
        }

        if (!data || typeof data !== 'object' || !('id' in data)) {
          throw new Error('Invalid response')
        }

        setRow(data as CapsuleDetailLocked | CapsuleDetailUnlocked)
      } catch (e) {
        if (!silent) {
          setError(e instanceof Error ? e.message : 'Failed to load')
          setRow(null)
        }
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [capsuleId],
  )

  useEffect(() => {
    void loadCapsule(false)
  }, [capsuleId, loadCapsule])

  useEffect(() => {
    if (!locked || !pastUnlockAt) return
    void loadCapsule(true)
  }, [locked, pastUnlockAt, loadCapsule])

  useInterval(
    useCallback(() => void loadCapsule(true), [loadCapsule]),
    locked && pastUnlockAt ? 2500 : null,
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 max-w-md animate-pulse rounded-lg bg-[#f0f4f6] dark:bg-zinc-800" aria-hidden />
        <div className="h-32 animate-pulse rounded-2xl bg-[#f0f4f6] dark:bg-zinc-800" aria-hidden />
      </div>
    )
  }

  if (error || !row) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400" role="alert">
        {error ?? 'Not found'}
      </p>
    )
  }

  if (!row.is_unlocked) {
    const left = formatUnlockCountdown(row.unlock_at, now)
    return (
      <div className="relative overflow-hidden rounded-2xl border border-sanctuary-border bg-gradient-to-br from-sanctuary-sidebar/90 to-white shadow-[0px_8px_24px_0px_rgba(44,52,54,0.06)] dark:from-zinc-900 dark:to-zinc-950 dark:border-zinc-800">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white/80 via-white/30 to-transparent backdrop-blur-[1px] dark:from-zinc-950/70 dark:via-zinc-950/20"
          aria-hidden
        />
        <div className="relative flex flex-col gap-6 p-8 sm:flex-row sm:items-start sm:gap-8">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#d1e4fb]/90 dark:bg-sky-900/50">
            <LockIcon className="size-8 text-[#415366] dark:text-sky-200" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-3xl italic leading-tight text-sanctuary-text dark:text-zinc-100 sm:text-4xl">
              {row.title?.trim() || 'Untitled'}
            </h1>
            <p className="mt-3 text-base text-sanctuary-muted dark:text-zinc-400">Unlocks {formatWhen(row.unlock_at)}</p>
            <p className="mt-4 font-mono text-xl text-sanctuary-primary dark:text-teal-300">
              {left ? `${left} left` : 'Unlock pending…'}
            </p>
            <p className="mt-6 max-w-xl text-sm leading-relaxed text-sanctuary-muted dark:text-zinc-500">
              The body stays on the server until unlock — nothing to preview here.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <article className="flex max-w-3xl flex-col gap-8">
      <header>
        <h1 className="font-serif text-3xl italic leading-tight text-sanctuary-text dark:text-zinc-100 sm:text-4xl">
          {row.title?.trim() || 'Untitled'}
        </h1>
        <p className="mt-3 text-sm text-sanctuary-muted dark:text-zinc-400">
          Unlocked {formatWhen(row.unlock_at)} · created {formatWhen(row.created_at)}
        </p>
      </header>
      <CapsuleReadOnlyBody doc={row.body} />
    </article>
  )
}
