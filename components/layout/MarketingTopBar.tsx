'use client'

import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'

import { ThemeSegmentedControl } from '@/components/theme/ThemeSegmentedControl'

export function MarketingTopBar() {
  return (
    <header className="flex h-16 flex-wrap items-center gap-3 border-b border-neutral-200 bg-white/90 px-4 backdrop-blur-sm dark:border-neutral-800 dark:bg-zinc-950/90 sm:gap-4">
      <div className="ml-auto flex flex-wrap items-center gap-3 sm:gap-4">
        <ThemeSegmentedControl />
        <Show when="signed-out">
          <SignInButton />
          <SignUpButton>
            <button
              type="button"
              className="h-10 cursor-pointer rounded-full bg-[#6c47ff] px-4 text-sm font-medium text-white sm:h-12 sm:px-5 sm:text-base"
            >
              Sign Up
            </button>
          </SignUpButton>
        </Show>
        <Show when="signed-in">
          <UserButton />
        </Show>
      </div>
    </header>
  )
}
