'use client'

import { useSession } from '@clerk/nextjs'
import { useEffect, useState } from 'react'

import { useSupabaseClient } from '@/lib/db/supabase-client'
import { DEFAULT_WRITING_PROMPT } from '@/lib/journal/default-writing-prompt'

export function WritingPromptCard() {
  const { isLoaded, session } = useSession()
  const supabase = useSupabaseClient()
  const [prompt, setPrompt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded) return

    let cancelled = false

    async function run() {
      if (!session) {
        if (!cancelled) {
          setPrompt(null)
          setLoading(false)
        }
        return
      }

      if (!cancelled) setLoading(true)

      const { data, error } = await supabase
        .from('mood_analyses')
        .select('prompt_suggestion')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (cancelled) return

      if (error) {
        console.error('WritingPromptCard load', error)
        setPrompt(null)
        setLoading(false)
        return
      }

      const text = data?.prompt_suggestion?.trim()
      setPrompt(text && text.length > 0 ? text : null)
      setLoading(false)
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [isLoaded, session, supabase])

  const display = prompt ?? DEFAULT_WRITING_PROMPT

  return (
    <section
      aria-label="Writing prompt"
      className="rounded-xl border border-neutral-200 bg-gradient-to-b from-violet-50/80 to-white p-5 dark:border-neutral-800 dark:from-violet-950/30 dark:to-neutral-950"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-violet-800 dark:text-violet-300">
        Today&apos;s prompt
      </h2>
      {loading ? (
        <div className="mt-4 space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        </div>
      ) : (
        <>
          <p className="mt-4 text-base leading-relaxed text-neutral-800 dark:text-neutral-100">{display}</p>
        </>
      )}
    </section>
  )
}
