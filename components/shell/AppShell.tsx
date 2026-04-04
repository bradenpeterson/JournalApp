'use client'

import type { ReactNode } from 'react'

import { SideNav } from '@/components/shell/SideNav'
import { TopBar } from '@/components/shell/TopBar'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-sanctuary-canvas text-sanctuary-text dark:bg-zinc-950 dark:text-zinc-100">
      <SideNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
