'use client'

import { UserButton, useUser } from '@clerk/nextjs'

import { SETTINGS_SECTION_SHELL } from '@/components/settings/settings-section-shell'

type SettingsProfileCardProps = {
  email: string | null
  displayLine: string | null
}

export function SettingsProfileCard({ email, displayLine }: SettingsProfileCardProps) {
  const { user, isLoaded } = useUser()

  const name = displayLine?.trim() || user?.fullName?.trim() || user?.username || '—'
  const mail =
    email ?? user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses[0]?.emailAddress ?? '—'
  const img = user?.imageUrl

  return (
    <section className={SETTINGS_SECTION_SHELL}>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-5">
          <div className="relative size-[5.5rem] shrink-0 overflow-hidden rounded-full border border-sanctuary-border bg-sanctuary-sidebar shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            {isLoaded && img ? (
              // eslint-disable-next-line @next/next/no-img-element -- Clerk URLs; avoid remotePatterns setup
              <img src={img} alt="" className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center font-serif text-2xl text-sanctuary-muted dark:text-zinc-500">
                {isLoaded ? '·' : '…'}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-serif text-2xl leading-tight text-sanctuary-text dark:text-zinc-100 sm:text-3xl">
              {isLoaded ? name : '…'}
            </h2>
            <p className="mt-1 truncate text-sm text-sanctuary-muted dark:text-zinc-400">{mail}</p>
            <p className="mt-3 text-xs text-sanctuary-muted/90 dark:text-zinc-500">Signed in with Clerk · manage account from the menu</p>
          </div>
        </div>
        <div className="shrink-0 self-start sm:self-center">
          <UserButton
            appearance={{
              elements: {
                avatarBox: 'size-10',
              },
            }}
          />
        </div>
      </div>
    </section>
  )
}
