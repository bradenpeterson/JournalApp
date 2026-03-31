'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type EntryViewActionsProps = {
  entryId: string
}

export function EntryViewActions({ entryId }: EntryViewActionsProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    const ok = window.confirm('Delete this entry? This cannot be undone.')
    if (!ok) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/entries/${encodeURIComponent(entryId)}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        window.alert(body?.error ?? `Could not delete (${res.status})`)
        setDeleting(false)
        return
      }

      router.push('/entries')
      router.refresh()
    } catch {
      window.alert('Could not delete this entry.')
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Link
        href={`/entries/${entryId}/edit`}
        className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
      >
        Edit
      </Link>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-100 disabled:opacity-50 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200 dark:hover:bg-red-950"
      >
        {deleting ? 'Deleting…' : 'Delete'}
      </button>
    </div>
  )
}
