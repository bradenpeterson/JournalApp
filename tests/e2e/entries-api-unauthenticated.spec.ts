import { test, expect } from '@playwright/test'

/** Valid UUID v4 shape for routes that parse `id` (response should still be auth failure, not 200 data). */
const SAMPLE_ENTRY_ID = '00000000-0000-4000-8000-000000000001'

/** Clerk `protect()` often responds with a redirect; following it yields 200 HTML and would false-pass. */
const noFollow = { maxRedirects: 0 } as const

test.describe('Entries API without a session (§2.10)', () => {
  test('GET /api/entries is not a successful API response', async ({ request }) => {
    const res = await request.get('/api/entries', noFollow)
    expect(res.ok(), 'anonymous clients must not get a 2xx JSON list').toBe(false)
  })

  test('POST /api/entries is rejected', async ({ request }) => {
    const res = await request.post('/api/entries', {
      ...noFollow,
      data: { title: 'x' },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status()).not.toBe(201)
    expect(res.ok()).toBe(false)
  })

  test('GET /api/entries/[id] is rejected', async ({ request }) => {
    const res = await request.get(`/api/entries/${SAMPLE_ENTRY_ID}`, noFollow)
    expect(res.ok()).toBe(false)
  })

  test('PATCH /api/entries/[id] is rejected', async ({ request }) => {
    const res = await request.patch(`/api/entries/${SAMPLE_ENTRY_ID}`, {
      ...noFollow,
      data: { title: 'hacked' },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.ok()).toBe(false)
  })

  test('DELETE /api/entries/[id] is rejected', async ({ request }) => {
    const res = await request.delete(`/api/entries/${SAMPLE_ENTRY_ID}`, noFollow)
    expect(res.status()).not.toBe(204)
    expect(res.ok()).toBe(false)
  })
})
