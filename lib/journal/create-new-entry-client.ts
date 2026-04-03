import {
  getPendingEntryIdFromSession,
  setPendingEntryIdInSession,
} from '@/lib/journal/pending-entry'
import { isUuid } from '@/lib/utils/uuid'

/**
 * One in-flight `POST /api/entries` for the whole module so React Strict Mode’s double `useEffect`
 * (dev) does not create two blank rows. Refresh dedup still uses `getPendingEntryIdFromSession`.
 */
let createEntryPromise: Promise<string> | null = null

export function fetchOrReuseNewEntryId(): Promise<string> {
  const existing = getPendingEntryIdFromSession()
  if (existing && isUuid(existing)) {
    return Promise.resolve(existing)
  }

  if (!createEntryPromise) {
    createEntryPromise = (async () => {
      try {
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

        setPendingEntryIdInSession(id)
        return id
      } finally {
        createEntryPromise = null
      }
    })()
  }

  return createEntryPromise
}
