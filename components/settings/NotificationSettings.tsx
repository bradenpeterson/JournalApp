'use client'

import { useCallback, useEffect, useState } from 'react'

type Prefs = {
  notify_weekly_digest: boolean
  notify_capsule_unlock: boolean
}

export function NotificationSettings() {
  const [prefs, setPrefs] = useState<Prefs | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/user/notifications')
        if (!res.ok) {
          if (!cancelled) setError('Could not load notification settings.')
          return
        }
        const data = (await res.json()) as Prefs
        if (!cancelled) setPrefs(data)
      } catch {
        if (!cancelled) setError('Could not load notification settings.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const patch = useCallback(async (field: keyof Prefs, value: boolean) => {
    setSaving(field)
    setError(null)
    try {
      const res = await fetch('/api/user/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      if (!res.ok) {
        setError('Could not save. Try again.')
        return
      }
      const next = (await res.json()) as Prefs
      setPrefs(next)
    } catch {
      setError('Could not save. Try again.')
    } finally {
      setSaving(null)
    }
  }, [])

  return (
    <section className="mt-8 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Notifications</h2>
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        Control automated emails. In-app behavior (unlocked capsules, insights data) is unchanged where noted.
      </p>

      {error ? (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {prefs ? (
        <ul className="mt-4 space-y-4">
          <li className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Weekly digest email</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Sunday summary of your week’s entries. When off, the worker skips your account for that run (no digest
                email and no new weekly insight row for that week).
              </p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 shrink-0">
              <span className="sr-only">Weekly digest email</span>
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-neutral-300 text-violet-600 focus:ring-violet-500 dark:border-neutral-600 dark:bg-neutral-900"
                checked={prefs.notify_weekly_digest}
                disabled={saving !== null}
                onChange={(e) => void patch('notify_weekly_digest', e.target.checked)}
              />
            </label>
          </li>
          <li className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Time capsule unlock email</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Email when a capsule unlocks. Capsules still unlock on time; only the email is skipped when off.
              </p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 shrink-0">
              <span className="sr-only">Time capsule unlock email</span>
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-neutral-300 text-violet-600 focus:ring-violet-500 dark:border-neutral-600 dark:bg-neutral-900"
                checked={prefs.notify_capsule_unlock}
                disabled={saving !== null}
                onChange={(e) => void patch('notify_capsule_unlock', e.target.checked)}
              />
            </label>
          </li>
        </ul>
      ) : !error ? (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">Loading…</p>
      ) : null}
    </section>
  )
}
