'use client'

import { useAuth } from '@clerk/nextjs'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import {
  DEFAULT_THEME_PREFERENCE,
  isThemePreference,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from '@/lib/theme/constants'
import { resolveEffectiveTheme } from '@/lib/theme/resolve-effective-theme'

type ThemeContextValue = {
  preference: ThemePreference
  setPreference: (next: ThemePreference) => void
  ready: boolean
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readStoredPreference(): ThemePreference {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY)
    if (isThemePreference(v)) return v
  } catch {
    /* ignore */
  }
  return DEFAULT_THEME_PREFERENCE
}

function applyDarkClass(preference: ThemePreference) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const effective = resolveEffectiveTheme(preference, prefersDark)
  document.documentElement.classList.toggle('dark', effective === 'dark')
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth()
  const [preference, setPreferenceState] = useState<ThemePreference>(DEFAULT_THEME_PREFERENCE)
  const [ready, setReady] = useState(false)
  const preferenceRef = useRef(preference)

  useEffect(() => {
    preferenceRef.current = preference
  }, [preference])

  useLayoutEffect(() => {
    const initial = readStoredPreference()
    // After SSR, align React state with localStorage (hydration used a placeholder).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read from localStorage
    setPreferenceState(initial)
    applyDarkClass(initial)
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyDarkClass(preferenceRef.current)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [ready])

  useEffect(() => {
    if (!ready || !isLoaded || !isSignedIn) return

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/user/theme')
        if (!res.ok || cancelled) return
        const data: unknown = await res.json()
        if (
          !data ||
          typeof data !== 'object' ||
          !('theme' in data) ||
          !isThemePreference((data as { theme: unknown }).theme)
        ) {
          return
        }
        const serverTheme = (data as { theme: ThemePreference }).theme
        if (cancelled) return
        setPreferenceState(serverTheme)
        try {
          localStorage.setItem(THEME_STORAGE_KEY, serverTheme)
        } catch {
          /* ignore */
        }
        applyDarkClass(serverTheme)
      } catch {
        /* keep local preference */
      }
    })()

    return () => {
      cancelled = true
    }
  }, [ready, isLoaded, isSignedIn])

  useEffect(() => {
    if (!ready) return
    applyDarkClass(preference)
  }, [preference, ready])

  const setPreference = useCallback(
    (next: ThemePreference) => {
      setPreferenceState(next)
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next)
      } catch {
        /* ignore */
      }
      applyDarkClass(next)

      if (isSignedIn) {
        void fetch('/api/user/theme', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ theme: next }),
        })
      }
    },
    [isSignedIn]
  )

  const value = useMemo(
    () => ({ preference, setPreference, ready }),
    [preference, setPreference, ready]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useThemePreference() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useThemePreference must be used within ThemeProvider')
  }
  return ctx
}
