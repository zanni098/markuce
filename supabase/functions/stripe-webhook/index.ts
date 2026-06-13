/**
 * stripe-webhook
 * ───────────────
 * Receives Stripe webhook events and updates checkout_sessions / subscriptions.
 * Must be registered as the Stripe webhook endpoint.
 *
 * Handled events:
 *   payment_intent.succeeded         → confirms card checkout session
 *   payment_intent.payment_failed    → marks session failed
 *   customer.subscription.created    → creates subscription row
 *   customer.subscription.updated    → updates subscription status
 *   customer.subscription.deleted    → cancels subscription
 *
 * Auth: Stripe-Signature header (HMAC verification)
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14?target=deno'
import { json, err } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const PLATFORM_FEE_PCT  = 0.034
const PLATFORM_FEE_FLAT = 30
function computeNet(gross: number) {
  const fee = Math.round(gross * PLATFORM_FEE_PCT) + PLATFORM_FEE_FLAT
  return { fee, net: gross - fee }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return err('Method not allowed', 405)

  const signature = req.headers.get('Stripe-Signature')
  if (!signature) return err('Missing Stripe-Signature', 400)

  const rawBody = await req.text()
  let event: Stripe.Event

  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    )
  } catch (e) {
    console.error('[stripe-webhook] signature verification failed:', e)
    return err('Invalid signature', 400)
  }

  switch (event.type) {

    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent
      const merchantId = pi.metadata?.merchant_id
      if (!merchantId) break

      // Find checkout session by payment_intent id
      const { data: session } = await supabase
        .from('checkout_sessions')
        .select('id, price_minor, currency, network, customer_email')
        .eq('stripe_payment_intent_id', `${pi.id}_secret_${pi.client_secret?.split('_secret_')[1]}`)
        .single()

      if (!session) break
      if (session) {
        const { fee, net } = computeNet(session.price_minor)
        await Promise.all([
          supabase.from('checkout_sessions')
            .update({ status: 'confirmed', payment_method: 'card' })
            .eq('id', session.id),
          supabase.from('transactions').insert({
            merchant_id:         merchantId,
            checkout_session_id: session.id,
            gross_minor:         session.price_minor,
            net_minor:           net,
            fee_minor:           fee,
            currency:            session.currency,
            payment_method:      'card',
            stripe_charge_id:    typeof pi.latest_charge === 'string' ? pi.latest_charge : null,
            customer_email:      session.customer_email,
          }),
        ])
      }
      break
    }

    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent
      const { data: session } = await supabase
        .from('checkout_sessions')
        .select('id')
        .like('stripe_payment_intent_id', `${pi.id}%`)
        .single()
      if (session) {
        await supabase.from('checkout_sessions')
          .update({ status: 'failed' })
          .eq('id', session.id)
      }
      break
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const merchantId = sub.metadata?.merchant_id
      const productId  = sub.metadata?.product_id
      if (!merchantId || !productId) break

      await supabase.from('subscriptions').upsert({
        merchant_id:            merchantId,
        product_id:             productId,
        customer_email:         (sub.customer as string),
        status:                 sub.status as 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete',
        current_period_start:   new Date(sub.current_period_start * 1000).toISOString(),
        current_period_end:     new Date(sub.current_period_end * 1000).toISOString(),
        stripe_subscription_id: sub.id,
        trial_end:              sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
        canceled_at:            sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
      }, { onConflict: 'stripe_subscription_id' })
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await supabase.from('subscriptions')
        .update({ status: 'canceled', canceled_at: new Date().toISOString() })
        .eq('stripe_subscription_id', sub.id)
      break
    }

    default:
      console.log(`[stripe-webhook] unhandled event: ${event.type}`)
  }

  return json({ received: true })
})
