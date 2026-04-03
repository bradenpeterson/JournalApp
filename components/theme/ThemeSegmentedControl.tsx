'use client'

import { useThemePreference } from '@/components/theme/ThemeProvider'
import { THEME_VALUES, type ThemePreference } from '@/lib/theme/constants'

const LABELS: Record<ThemePreference, string> = {
  light: 'Light',
  system: 'System',
  dark: 'Dark',
}

export function ThemeSegmentedControl({ className }: { className?: string }) {
  const { preference, setPreference, ready } = useThemePreference()

  if (!ready) {
    return (
      <div
        className={
          className
            ? className
            : 'inline-flex h-9 min-w-[200px] rounded-md border border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900'
        }
        aria-hidden
      />
    )
  }

  return (
    <fieldset
      className={className ?? 'inline-flex rounded-md border border-neutral-200 p-0.5 dark:border-neutral-700'}
    >
      <legend className="sr-only">Color theme</legend>
      <div className="flex gap-0.5">
        {THEME_VALUES.map((value) => {
          const selected = preference === value
          return (
            <button
              key={value}
              type="button"
              aria-pressed={selected}
              onClick={() => setPreference(value)}
              className={
                selected
                  ? 'rounded bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-neutral-100'
                  : 'rounded px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
              }
            >
              {LABELS[value]}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
