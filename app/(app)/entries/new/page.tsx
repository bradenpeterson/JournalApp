'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { fetchOrReuseNewEntryId } from '@/lib/journal/create-new-entry-client'

export default function NewEntryPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    void fetchOrReuseNewEntryId()
      .then((id) => {
        if (cancelled) return
        router.replace(`/entries/${id}/edit`)
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Something went wrong')
        }
      })

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
