'use client'

import Link from 'next/link'
import { Bell } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'

import { ThemeSegmentedControl } from '@/components/theme/ThemeSegmentedControl'

export function TopBar() {
  return (
    <header className="sticky top-0 z-10 flex h-20 shrink-0 items-center justify-between border-b border-sanctuary-border bg-white/80 px-12 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="flex items-center gap-8">
        <div className="font-serif text-xl italic leading-7 text-sanctuary-text dark:text-zinc-100">
          The Reflective Editorial
        </div>
        <nav className="hidden gap-6 sm:flex" aria-label="Secondary">
          <Link
            href="/settings"
            className="text-sm uppercase tracking-[0.1em] text-sanctuary-muted transition-colors hover:text-sanctuary-text dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Weekly Digest
          </Link>
          <Link
            href="/capsules"
            className="text-sm uppercase tracking-[0.1em] text-sanctuary-muted transition-colors hover:text-sanctuary-text dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Time-Locked
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-6">
        <ThemeSegmentedControl />
        <button
          type="button"
          className="text-sanctuary-muted transition-colors hover:text-sanctuary-text dark:text-zinc-400 dark:hover:text-zinc-200"
          aria-label="Notifications (not wired yet)"
          title="Notifications are not wired yet"
        >
          <Bell className="size-[19px]" aria-hidden />
        </button>
        <UserButton
          appearance={{
            elements: {
              avatarBox: 'size-8 ring-0',
            },
          }}
        />
      </div>
    </header>
  )
}
