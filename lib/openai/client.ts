import 'server-only'

import OpenAI from 'openai'

/**
 * OpenAI client for server-only routes (e.g. §3.3 analysis).
 * Returns `null` when `OPENAI_API_KEY` is unset — callers can skip LLM work until the key is configured.
 */
export function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) return null
  return new OpenAI({ apiKey })
}
