/**
 * create-payment-link
 * ────────────────────
 * Creates a checkout session for a given product.
 * For card payments: creates a Stripe PaymentIntent.
 * For crypto: fetches Chainlink prices and stores quoted amounts.
 *
 * Auth: Bearer token (Supabase JWT)
 * Rate limit: 20 req/min per merchant
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14?target=deno'
import { handleCors, json, err } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

// Platform fee: 3.4% + $0.30
const PLATFORM_FEE_PCT  = 0.034
const PLATFORM_FEE_FLAT = 30

function platformFee(grossMinor: number): number {
  return Math.round(grossMinor * PLATFORM_FEE_PCT) + PLATFORM_FEE_FLAT
}

Deno.serve(async (req: Request) => {
  const corsResp = handleCors(req)
  if (corsResp) return corsResp

  // Auth
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return err('Missing Authorization header', 401)

  const { data: { user }, error: authError } =
    await supabase.auth.getUser(authHeader.replace('Bearer ', ''))

  if (authError || !user) return err('Unauthorized', 401)

  // Rate limit: 20 req/min per merchant
  const { data: allowed } = await supabase.rpc('rl_consume', {
    p_key:         `create-payment-link:${user.id}`,
    p_capacity:    20,
    p_refill_rate: 0.333,   // 20/min
    p_cost:        1,
  })
  if (!allowed) return err('Rate limit exceeded. Try again in a moment.', 429)

  const body = await req.json().catch(() => ({})) as {
    product_id?:      string
    price_override?:  number
    metadata?:        Record<string, string>
    idempotency_key?: string
  }

  if (!body.product_id) return err('product_id is required')

  // Fetch product
  const { data: product, error: productErr } = await supabase
    .from('products')
    .select('*')
    .eq('id', body.product_id)
    .eq('merchant_id', user.id)
    .eq('active', true)
    .single()

  if (productErr || !product) return err('Product not found or inactive', 404)

  const priceMinor = body.price_override ?? product.price_minor

  // Fetch merchant payout wallet
  const { data: profile } = await supabase
    .from('profiles')
    .select('sol_wallet, polygon_wallet, eth_wallet, default_payout_method')
    .eq('id', user.id)
    .single()

  // Create Stripe PaymentIntent (card)
  let stripePaymentIntentId: string | null = null
  try {
    const intent = await stripe.paymentIntents.create(
      {
        amount:   priceMinor,
        currency: product.currency.toLowerCase(),
        // Platform application fee
        application_fee_amount: platformFee(priceMinor),
        metadata: {
          merchant_id: user.id,
          product_id:  product.id,
          ...(body.metadata ?? {}),
        },
      },
      // Idempotency key prevents duplicate intents on retry
      body.idempotency_key
        ? { idempotencyKey: `pi-${body.idempotency_key}` }
        : undefined
    )
    stripePaymentIntentId = intent.client_secret
  } catch (e) {
    console.error('[create-payment-link] Stripe error:', e)
    // Continue — crypto still works
  }

  // Insert checkout session
  const { data: session, error: sessionErr } = await supabase
    .from('checkout_sessions')
    .insert({
      merchant_id:              user.id,
      product_id:               product.id,
      price_minor:              priceMinor,
      currency:                 product.currency,
      stripe_payment_intent_id: stripePaymentIntentId,
      // Crypto destination — merchant's wallet
      crypto_address:  profile?.sol_wallet ?? profile?.polygon_wallet ?? profile?.eth_wallet ?? null,
      idempotency_key: body.idempotency_key ?? null,
      metadata:        body.metadata ?? {},
    })
    .select('id, reference, expires_at')
    .single()

  if (sessionErr || !session) {
    console.error('[create-payment-link] session insert error:', sessionErr)
    return err('Failed to create session', 500)
  }

  const checkoutUrl = `${Deno.env.get('APP_URL') ?? ''}/checkout/${session.id}`

  return json({
    session_id:   session.id,
    checkout_url: checkoutUrl,
    expires_in:   1800,
    reference:    session.reference,
  })
})
