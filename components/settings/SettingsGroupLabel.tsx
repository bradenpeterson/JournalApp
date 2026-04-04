import type { ReactNode } from 'react'

export function SettingsGroupLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-sanctuary-muted dark:text-zinc-500">
      {children}
    </p>
  )
}
