'use client'

import type { JSONContent } from '@tiptap/core'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { FormEvent } from 'react'
import { useCallback, useState } from 'react'

import { CapsuleBodyEditor } from '@/components/capsules/CapsuleBodyEditor'
import { isUuid } from '@/lib/utils/uuid'

const inputClass =
  'w-full max-w-xl rounded-xl border border-sanctuary-border bg-white px-4 py-3 text-sm text-sanctuary-text shadow-sm outline-none ring-sanctuary-primary/20 placeholder:text-sanctuary-muted/60 focus:border-sanctuary-primary focus:ring-4 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500'

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
    <div className="mx-auto w-full max-w-[1280px] px-6 py-6 sm:px-10 lg:px-12">
      <div className="mb-10">
        <Link
          href="/capsules"
          className="text-sm text-sanctuary-primary underline-offset-2 hover:underline dark:text-teal-300"
        >
          ← Back to capsules
        </Link>
        <h1 className="mt-6 font-serif text-4xl italic leading-tight text-sanctuary-text dark:text-zinc-100 sm:text-5xl">
          New time capsule
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-sanctuary-muted dark:text-zinc-400">
          Content is stored on the server but stays hidden from the list until unlock. After the date, open this page to
          read it.
        </p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="flex max-w-2xl flex-col gap-8">
        <div className="flex flex-col gap-2">
          <label htmlFor="capsule-title" className="text-sm font-medium text-sanctuary-text dark:text-zinc-200">
            Title
          </label>
          <input
            id="capsule-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Letter to future me"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="capsule-unlock" className="text-sm font-medium text-sanctuary-text dark:text-zinc-200">
            Unlock at
          </label>
          <input
            id="capsule-unlock"
            type="datetime-local"
            value={unlockLocal}
            onChange={(e) => setUnlockLocal(e.target.value)}
            required
            className={`${inputClass} max-w-xs`}
          />
          <p className="text-xs text-sanctuary-muted dark:text-zinc-500">
            Uses your browser&apos;s local timezone; stored as UTC on the server.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-sanctuary-text dark:text-zinc-200">Body</span>
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
            className="inline-flex items-center justify-center rounded-full bg-sanctuary-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-sanctuary-primary-hover disabled:opacity-60 dark:bg-teal-400 dark:text-zinc-950 dark:hover:bg-teal-300"
          >
            {submitting ? 'Saving…' : 'Seal capsule'}
          </button>
          <Link
            href="/capsules"
            className="inline-flex items-center justify-center rounded-full border border-sanctuary-border bg-white px-6 py-3 text-sm font-medium text-sanctuary-primary transition-colors hover:bg-sanctuary-canvas dark:border-zinc-700 dark:bg-zinc-900 dark:text-teal-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
