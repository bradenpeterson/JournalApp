'use client'

import type { JSONContent } from '@tiptap/core'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { FormEvent } from 'react'
import { useCallback, useState } from 'react'

import { CapsuleBodyEditor } from '@/components/capsules/CapsuleBodyEditor'
import { isUuid } from '@/lib/utils/uuid'

export default function NewCapsulePage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [unlockLocal, setUnlockLocal] = useState('')
  const [bodyDoc, setBodyDoc] = useState<JSONContent | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onDocChange = useCallback((doc: JSONContent) => {
    setBodyDoc(doc)
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!unlockLocal.trim()) {
      setError('Choose an unlock date and time.')
      return
    }

    const unlockAt = new Date(unlockLocal)
    if (Number.isNaN(unlockAt.getTime())) {
      setError('Invalid unlock date.')
      return
    }

    const body = bodyDoc ?? { type: 'doc', content: [] }

    setSubmitting(true)
    try {
      const res = await fetch('/api/capsules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || 'Untitled',
          body,
          unlock_at: unlockAt.toISOString(),
        }),
      })

      const data = (await res.json().catch(() => null)) as { error?: string; id?: unknown } | null

      if (!res.ok) {
        throw new Error(data && typeof data === 'object' && data.error ? data.error : `Failed (${res.status})`)
      }

      const id = data && typeof data === 'object' && data.id
      if (typeof id !== 'string' || !isUuid(id)) {
        throw new Error('Invalid response from server')
      }

      router.push(`/capsules/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="mb-6">
        <Link
          href="/capsules"
          className="text-sm text-violet-600 underline-offset-2 hover:underline dark:text-violet-400"
        >
          ← Back to capsules
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">New time capsule</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Content is stored on the server but stays hidden from the list until unlock. You can open this page after
          unlock to read it.
        </p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="capsule-title" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Title
          </label>
          <input
            id="capsule-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Letter to future me"
            className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-neutral-900 outline-none ring-violet-500/30 focus:border-violet-500 focus:ring-4 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="capsule-unlock" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Unlock at
          </label>
          <input
            id="capsule-unlock"
            type="datetime-local"
            value={unlockLocal}
            onChange={(e) => setUnlockLocal(e.target.value)}
            required
            className="max-w-xs rounded-md border border-neutral-200 bg-white px-3 py-2 text-neutral-900 outline-none ring-violet-500/30 focus:border-violet-500 focus:ring-4 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
          />
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Uses your browser&apos;s local timezone; stored as UTC on the server.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Body</span>
          <CapsuleBodyEditor onDocChange={onDocChange} />
        </div>

        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:opacity-60 dark:bg-violet-600 dark:hover:bg-violet-500"
          >
            {submitting ? 'Saving…' : 'Seal capsule'}
          </button>
          <Link
            href="/capsules"
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-900"
          >
            Cancel
          </Link>
        </div>
      </form>
    </main>
  )
}
