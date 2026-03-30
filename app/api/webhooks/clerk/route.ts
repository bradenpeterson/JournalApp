import { verifyWebhook } from '@clerk/nextjs/webhooks'
import { NextRequest } from 'next/server'

import { createServiceRoleClient } from '@/lib/db/supabase-service'

export async function POST(req: Request) {
  let event

  try {
    event = await verifyWebhook(req as NextRequest)
  } catch (err) {
    console.error('Webhook verification failed:', err)
    return new Response('Invalid webhook signature', { status: 400 })
  }

  if (event.type === 'user.created') {
    const { id, email_addresses, first_name, last_name } = event.data

    const supabase = createServiceRoleClient()
    const { error } = await supabase.from('users').upsert({
      clerk_id: id,
      email: email_addresses[0].email_address,
      display_name: `${first_name ?? ''} ${last_name ?? ''}`.trim(),
    })

    if (error) {
      console.error('Supabase upsert failed:', error)
      return new Response('Database error', { status: 500 })
    }
  }

  return new Response('OK', { status: 200 })
}
