import type { Metadata } from 'next'
import { currentUser } from '@clerk/nextjs/server'

import { ExportDownloads } from '@/components/settings/ExportDownloads'
import { JourneyStatsCard } from '@/components/settings/JourneyStatsCard'
import { JournalingPreferencesCard } from '@/components/settings/JournalingPreferencesCard'
import { SettingsGroupLabel } from '@/components/settings/SettingsGroupLabel'
import { SettingsProfileCard } from '@/components/settings/SettingsProfileCard'
import { loadDashboardStats } from '@/lib/dashboard/load-dashboard-stats'

export const metadata: Metadata = {
  title: 'Settings',
}

function displayNameFromClerk(user: NonNullable<Awaited<ReturnType<typeof currentUser>>>) {
  const full = user.fullName?.trim()
  if (full) return full
  const parts = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
  if (parts) return parts
  const u = user.username?.trim()
  if (u) return `@${u}`
  return null
}

export default async function SettingsPage() {
  const [user, stats] = await Promise.all([currentUser(), loadDashboardStats()])
  const email = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses[0]?.emailAddress ?? null
  const displayLine = user ? displayNameFromClerk(user) : null

  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 py-6 sm:px-10 lg:px-12">
      <header className="mb-10 lg:mb-12">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-sanctuary-muted dark:text-zinc-500">
          Profile & workspace
        </p>
        <h1 className="font-serif text-4xl italic leading-tight text-sanctuary-text dark:text-zinc-100 sm:text-5xl">
          Settings
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-sanctuary-muted dark:text-zinc-400">
          Your account, journaling preferences, exports, and a snapshot of your journey.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start lg:gap-12">
        <div className="flex flex-col gap-10 lg:col-span-7">
          <div>
            <SettingsGroupLabel>Account</SettingsGroupLabel>
            <SettingsProfileCard email={email} displayLine={displayLine} />
          </div>

          <div>
            <SettingsGroupLabel>Preferences</SettingsGroupLabel>
            <JournalingPreferencesCard />
          </div>

          <div>
            <SettingsGroupLabel>Data</SettingsGroupLabel>
            <ExportDownloads />
          </div>
        </div>

        <div className="lg:col-span-5">
          <SettingsGroupLabel>Journey</SettingsGroupLabel>
          <JourneyStatsCard stats={stats} />
        </div>
      </div>
    </div>
  )
}
