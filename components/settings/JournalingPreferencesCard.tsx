'use client'

import { SETTINGS_SECTION_SHELL } from '@/components/settings/settings-section-shell'
import { NotificationSettings } from '@/components/settings/NotificationSettings'
import { ThemeSegmentedControl } from '@/components/theme/ThemeSegmentedControl'

export function JournalingPreferencesCard() {
  return (
    <section className={SETTINGS_SECTION_SHELL}>
      <h2 className="font-serif text-2xl text-sanctuary-text dark:text-zinc-100">Journaling preferences</h2>
      <p className="mt-2 text-sm leading-relaxed text-sanctuary-muted dark:text-zinc-400">
        How the app looks and when we email you. In-app behavior for capsules and insights stays the same when a toggle
        only affects email.
      </p>

      <div className="mt-8">
        <h3 className="text-sm font-semibold text-sanctuary-text dark:text-zinc-200">Appearance</h3>
        <p className="mt-1 text-xs leading-relaxed text-sanctuary-muted dark:text-zinc-500">
          Light, dark, or match your system. Updates when your OS or browser theme changes.
        </p>
        <div className="mt-4">
          <ThemeSegmentedControl />
        </div>
      </div>

      <div className="my-8 border-t border-sanctuary-border dark:border-zinc-800" />

      <div>
        <h3 className="text-sm font-semibold text-sanctuary-text dark:text-zinc-200">Email notifications</h3>
        <NotificationSettings variant="embedded" />
      </div>
    </section>
  )
}
