'use client'

import { useEffect, useState } from 'react'

import { EntryEditForm } from '@/components/entries/EntryEditForm'
import { fetchOrReuseNewEntryId } from '@/lib/journal/create-new-entry-client'

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; id: string; title: string; body: unknown }

export default function JournalPage() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        const id = await fetchOrReuseNewEntryId()
        const res = await fetch(`/api/entries/${encodeURIComponent(id)}`)
        const data = (await res.json().catch(() => null)) as {
          error?: string
          title?: unknown
          body?: unknown
        } | null

        if (!res.ok) {
          const msg = data && typeof data === 'object' && typeof data.error === 'string' ? data.error : `Failed (${res.status})`
          throw new Error(msg)
        }

        if (!data || typeof data !== 'object') {
          throw new Error('Invalid response')
        }

        const title = typeof data.title === 'string' ? data.title : 'Untitled'
        const body = 'body' in data ? data.body : null

        if (!cancelled) {
          setState({ status: 'ready', id, title, body })
        }
      } catch (e) {
        if (!cancelled) {
          setState({
            status: 'error',
            message: e instanceof Error ? e.message : 'Something went wrong',
          })
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [])

  if (state.status === 'loading') {
    return (
      <div className="mx-auto flex min-h-[40vh] max-w-[896px] items-center justify-center px-6">
        <p className="text-sm text-sanctuary-muted dark:text-zinc-400">Opening your journal…</p>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="mx-auto max-w-[896px] px-6 py-16">
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {state.message}
        </p>
      </div>
    )
  }

  return (
    <EntryEditForm
      key={state.id}
      entryId={state.id}
      initialTitle={state.title}
      initialBody={state.body}
      presentation="journal"
    />
  )
}
