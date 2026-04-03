import type { Metadata } from 'next'

import { ThemeSegmentedControl } from '@/components/theme/ThemeSegmentedControl'

export const metadata: Metadata = {
  title: 'Settings',
}

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-lg p-6">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Settings</h1>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Appearance and account preferences.</p>

      <section className="mt-8 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Theme</h2>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Light, dark, or match your system setting. System follows your OS or browser theme and updates when it
          changes.
        </p>
        <div className="mt-4">
          <ThemeSegmentedControl className="inline-flex rounded-md border border-neutral-200 p-0.5 dark:border-neutral-700" />
        </div>
      </section>
    </main>
  )
}
