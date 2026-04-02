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
    return <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading…</p>
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
      <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-6 dark:border-amber-900/50 dark:bg-amber-950/20">
        <div className="flex items-start gap-3">
          <LockIcon className="mt-0.5 h-8 w-8 text-amber-600 dark:text-amber-400" />
          <div>
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              {row.title?.trim() || 'Untitled'}
            </h1>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
              Unlocks {formatWhen(row.unlock_at)}
            </p>
            <p className="mt-2 font-mono text-lg text-violet-700 dark:text-violet-300">
              {left ? `${left} left` : 'Unlock pending…'}
            </p>
            <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400">
              The body stays on the server until unlock — nothing to preview here.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <article className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          {row.title?.trim() || 'Untitled'}
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Unlocked {formatWhen(row.unlock_at)} · created {formatWhen(row.created_at)}
        </p>
      </div>
      <CapsuleReadOnlyBody doc={row.body} />
    </article>
  )
}
