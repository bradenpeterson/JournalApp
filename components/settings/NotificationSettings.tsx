'use client'

import { useCallback, useEffect, useState } from 'react'

import { SETTINGS_SECTION_SHELL } from '@/components/settings/settings-section-shell'

type Prefs = {
  notify_weekly_digest: boolean
  notify_capsule_unlock: boolean
}

const checkboxClass =
  'h-4 w-4 shrink-0 rounded border-sanctuary-border text-sanctuary-primary focus:ring-sanctuary-primary/30 dark:border-zinc-600 dark:bg-zinc-900 dark:text-teal-400 dark:focus:ring-teal-400/30'

export function NotificationSettings({ variant = 'standalone' }: { variant?: 'standalone' | 'embedded' }) {
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

  const body = (
    <>
      {variant === 'standalone' ? (
        <>
          <h2 className="font-serif text-xl text-sanctuary-text dark:text-zinc-100">Notifications</h2>
          <p className="mt-2 text-sm leading-relaxed text-sanctuary-muted dark:text-zinc-400">
            Control automated emails. In-app behavior (unlocked capsules, insights data) is unchanged where noted.
          </p>
        </>
      ) : (
        <p className="mt-1 text-xs leading-relaxed text-sanctuary-muted dark:text-zinc-500">
          Automated emails only — toggles do not change unlock timing or in-app data.
        </p>
      )}

      {error ? (
        <p className={`text-sm text-red-600 dark:text-red-400 ${variant === 'embedded' ? 'mt-3' : 'mt-4'}`} role="alert">
          {error}
        </p>
      ) : null}

      {prefs ? (
        <ul className={`list-none space-y-0 p-0 ${variant === 'embedded' ? 'mt-5' : 'mt-6'}`}>
          <li className="flex items-start justify-between gap-4 border-b border-sanctuary-border pb-6 dark:border-zinc-800">
            <div className="min-w-0">
              <p className="text-sm font-medium text-sanctuary-text dark:text-zinc-200">Weekly digest email</p>
              <p className="mt-1 text-xs leading-relaxed text-sanctuary-muted dark:text-zinc-500">
                Weekly digest (scheduled <span className="whitespace-nowrap">Sunday 08:00 UTC</span>). When off, the worker
                skips your account for that run (no digest email and no new weekly insight row for that week).
              </p>
            </div>
            <label className="inline-flex shrink-0 cursor-pointer items-center gap-2">
              <span className="sr-only">Weekly digest email</span>
              <input
                type="checkbox"
                className={checkboxClass}
                checked={prefs.notify_weekly_digest}
                disabled={saving !== null}
                onChange={(e) => void patch('notify_weekly_digest', e.target.checked)}
              />
            </label>
          </li>
          <li className="flex items-start justify-between gap-4 pt-6">
            <div className="min-w-0">
              <p className="text-sm font-medium text-sanctuary-text dark:text-zinc-200">Time capsule unlock email</p>
              <p className="mt-1 text-xs leading-relaxed text-sanctuary-muted dark:text-zinc-500">
                Email when a capsule unlocks. Capsules still unlock on time; only the email is skipped when off.
              </p>
            </div>
            <label className="inline-flex shrink-0 cursor-pointer items-center gap-2">
              <span className="sr-only">Time capsule unlock email</span>
              <input
                type="checkbox"
                className={checkboxClass}
                checked={prefs.notify_capsule_unlock}
                disabled={saving !== null}
                onChange={(e) => void patch('notify_capsule_unlock', e.target.checked)}
              />
            </label>
          </li>
        </ul>
      ) : !error ? (
        <div className={`space-y-3 ${variant === 'embedded' ? 'mt-5' : 'mt-6'}`} aria-hidden>
          <div className="h-4 w-full max-w-xs animate-pulse rounded-md bg-[#f0f4f6] dark:bg-zinc-800" />
          <div className="h-4 w-full max-w-md animate-pulse rounded-md bg-[#f0f4f6] dark:bg-zinc-800" />
        </div>
      ) : null}
    </>
  )

  if (variant === 'embedded') {
    return body
  }

  return <section className={SETTINGS_SECTION_SHELL}>{body}</section>
}
