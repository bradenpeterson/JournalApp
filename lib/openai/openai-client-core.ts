import OpenAI from 'openai'

/** Shared OpenAI factory for route handlers and BullMQ workers (no `server-only`). */
export function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) return null
  return new OpenAI({ apiKey })
}
