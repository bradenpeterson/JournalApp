'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, LayoutGrid, Library, LifeBuoy, Plus, Settings, TrendingUp } from 'lucide-react'

function navActive(pathname: string, href: string) {
  if (href === '/dashboard') {
    return pathname === '/dashboard'
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function SideNav() {
  const pathname = usePathname()

  const linkClass = (href: string) => {
    const active = navActive(pathname, href)
    return [
      'flex items-center gap-4 rounded-lg px-4 py-3 transition-colors',
      active
        ? 'bg-white text-sanctuary-primary dark:bg-zinc-800 dark:text-teal-300'
        : 'text-sanctuary-muted hover:bg-white/50 dark:text-zinc-400 dark:hover:bg-zinc-800/60',
    ].join(' ')
  }

  return (
    <aside className="flex h-full w-[288px] shrink-0 flex-col bg-sanctuary-sidebar px-8 py-12 dark:bg-zinc-950">
      <div className="mb-12">
        <div className="mb-2 font-serif text-2xl italic leading-8 text-sanctuary-primary dark:text-teal-300">
          Sanctuary
        </div>
        <div className="text-xs font-normal uppercase leading-4 tracking-widest text-sanctuary-muted opacity-60 dark:text-zinc-500">
          Personal Journal
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-2">
        <Link href="/dashboard" className={linkClass('/dashboard')}>
          <LayoutGrid className="size-5 shrink-0" aria-hidden />
          <span className="text-sm leading-5">Dashboard</span>
        </Link>
        <Link href="/journal" className={linkClass('/journal')}>
          <BookOpen className="size-5 shrink-0" aria-hidden />
          <span className="text-sm leading-5">Journal</span>
        </Link>
        <Link href="/analytics" className={linkClass('/analytics')}>
          <TrendingUp className="size-5 shrink-0" aria-hidden />
          <span className="text-sm leading-5">Analytics</span>
        </Link>
        <Link href="/entries" className={linkClass('/entries')}>
          <Library className="size-5 shrink-0" aria-hidden />
          <span className="text-sm leading-5">Entries</span>
        </Link>
      </nav>

      <div className="mt-auto">
        <Link
          href="/journal"
          className="mb-8 flex w-full items-center justify-center gap-2 rounded-full bg-sanctuary-primary px-6 py-4 text-sm text-white transition-colors hover:bg-sanctuary-primary-hover dark:bg-teal-300 dark:text-zinc-950 dark:hover:bg-teal-200"
        >
          <Plus className="size-[18px] shrink-0" aria-hidden />
          New Entry
        </Link>

        <Link href="/settings" className={linkClass('/settings')}>
          <Settings className="size-5 shrink-0" aria-hidden />
          <span className="text-sm leading-5">Settings</span>
        </Link>

        <a
          href="https://support.clerk.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex w-full items-center gap-4 rounded-lg px-4 py-3 text-sanctuary-muted transition-colors hover:bg-white/50 dark:text-zinc-400 dark:hover:bg-zinc-800/60"
        >
          <LifeBuoy className="size-5 shrink-0" aria-hidden />
          <span className="text-sm leading-5">Support</span>
        </a>
      </div>
    </aside>
  )
}
