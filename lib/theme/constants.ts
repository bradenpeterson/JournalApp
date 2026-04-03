export const THEME_STORAGE_KEY = 'journal-theme'

/** Stored in `users.theme`, `localStorage`, and used to resolve the `dark` class on `<html>`. */
export type ThemePreference = 'light' | 'dark' | 'system'

/** When nothing is stored yet or the DB value is invalid. */
export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'system'

export const THEME_VALUES: readonly ThemePreference[] = ['light', 'system', 'dark']

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system'
}
