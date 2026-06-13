/**
 * webhook-dispatcher
 * ───────────────────
 * Processes pending webhook_deliveries for a merchant.
 * Sends HMAC-SHA256 signed HTTP POST to the merchant's endpoint.
 * Retries with exponential backoff (max 5 attempts).
 *
 * Called by verify-payment and by a pg_cron job every minute.
 * Auth: service_role only
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleCors, json, err } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const MAX_ATTEMPTS  = 5
const BACKOFF_SECS  = [10, 60, 300, 1800, 7200] // 10s, 1m, 5m, 30m, 2h

async function hmacSignature(secret: string, payload: string): Promise<string> {
  const encoder  = new TextEncoder()
  const key      = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req: Request) => {
  const corsResp = handleCors(req)
  if (corsResp) return corsResp

  const body = await req.json().catch(() => ({})) as { merchant_id?: string }

  // Fetch pending deliveries
  let query = supabase
    .from('webhook_deliveries')
    .select('*')
    .eq('status', 'pending')
    .lte('next_retry_at', new Date().toISOString())
    .lt('attempt_count', MAX_ATTEMPTS)
    .order('created_at', { ascending: true })
    .limit(10)

  if (body.merchant_id) {
    query = query.eq('merchant_id', body.merchant_id)
  }

  const { data: deliveries, error } = await query

  if (error) return err('DB error', 500)
  if (!deliveries?.length) return json({ processed: 0 })

  let processed = 0

  for (const delivery of deliveries) {
    // Get merchant webhook secret
    const { data: secrets } = await supabase
      .from('merchant_secrets')
      .select('webhook_secret')
      .eq('merchant_id', delivery.merchant_id)
      .single()

    const secret  = secrets?.webhook_secret ?? ''
    const payload = JSON.stringify(delivery.payload)
    const ts      = Math.floor(Date.now() / 1000)
    const signed  = `${ts}.${payload}`
    const hmac    = await hmacSignature(secret, signed)

    let responseStatus: number | null = null
    let success = false

    try {
      const resp = await fetch(delivery.url, {
        method:  'POST',
        headers: {
          'Content-Type':         'application/json',
          'Markuce-Signature':    `t=${ts},v1=${hmac}`,
          'Markuce-Event':        String(delivery.event_type),
          'Markuce-Delivery-Id':  delivery.id,
        },
        body: payload,
        signal: AbortSignal.timeout(10_000),
      })
      responseStatus = resp.status
      success        = resp.status >= 200 && resp.status < 300
    } catch {
      // Network error — mark for retry
    }

    const newAttemptCount = delivery.attempt_count + 1
    const nextRetry = success || newAttemptCount >= MAX_ATTEMPTS
      ? null
      : new Date(Date.now() + BACKOFF_SECS[newAttemptCount - 1] * 1000).toISOString()

    await supabase
      .from('webhook_deliveries')
      .update({
        status:          success ? 'delivered' : newAttemptCount >= MAX_ATTEMPTS ? 'failed' : 'pending',
        attempt_count:   newAttemptCount,
        last_attempt_at: new Date().toISOString(),
        next_retry_at:   nextRetry,
        response_status: responseStatus,
      })
      .eq('id', delivery.id)

    if (success) processed++
  }

  return json({ processed, total: deliveries.length })
})
