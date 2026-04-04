'use client'

import { useThemePreference } from '@/components/theme/ThemeProvider'
import { THEME_VALUES, type ThemePreference } from '@/lib/theme/constants'

const LABELS: Record<ThemePreference, string> = {
  light: 'Light',
  system: 'System',
  dark: 'Dark',
}

const fieldsetDefault =
  'inline-flex rounded-xl border border-sanctuary-border bg-sanctuary-sidebar/60 p-1 dark:border-zinc-700 dark:bg-zinc-900/80'

const skeletonDefault =
  'inline-flex h-9 min-w-[200px] rounded-xl border border-sanctuary-border bg-sanctuary-sidebar/80 dark:border-zinc-700 dark:bg-zinc-900'

export function ThemeSegmentedControl({ className }: { className?: string }) {
  const { preference, setPreference, ready } = useThemePreference()

  if (!ready) {
    return <div className={className ?? skeletonDefault} aria-hidden />
  }

  return (
    <fieldset className={className ?? fieldsetDefault}>
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
                  ? 'rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-sanctuary-text shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
                  : 'rounded-lg px-3 py-1.5 text-xs font-medium text-sanctuary-muted transition-colors hover:text-sanctuary-text dark:text-zinc-500 dark:hover:text-zinc-200'
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
