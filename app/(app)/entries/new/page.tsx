'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import {
  getPendingEntryIdFromSession,
  setPendingEntryIdInSession,
} from '@/lib/journal/pending-entry'
import { isUuid } from '@/lib/utils/uuid'

export default function NewEntryPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        const existing = getPendingEntryIdFromSession()
        if (existing && isUuid(existing)) {
          router.replace(`/entries/${existing}/edit`)
          return
        }

        const res = await fetch('/api/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })

        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null
          throw new Error(body?.error ?? `Request failed (${res.status})`)
        }

        const data = (await res.json()) as { id?: unknown }
        const id = data.id
        if (typeof id !== 'string' || !isUuid(id)) {
          throw new Error('Invalid response from server')
        }

        if (cancelled) return

        setPendingEntryIdInSession(id)
        router.replace(`/entries/${id}/edit`)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Something went wrong')
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [router])

  return (
    <main className="mx-auto max-w-2xl p-6">
      {error ? (
        <p className="text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : (
        <p className="text-neutral-500 dark:text-neutral-400">Starting a new entry…</p>
      )}
    </main>
  )
}
