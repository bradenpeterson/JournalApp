import type { ThemePreference } from '@/lib/theme/constants'

/** Resolved appearance for applying Tailwind’s `dark` class (not the stored preference). */
export type EffectiveTheme = 'light' | 'dark'

export function resolveEffectiveTheme(
  preference: ThemePreference,
  prefersDark: boolean
): EffectiveTheme {
  if (preference === 'dark') return 'dark'
  if (preference === 'light') return 'light'
  return prefersDark ? 'dark' : 'light'
}
