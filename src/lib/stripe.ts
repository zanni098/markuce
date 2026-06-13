/**
 * Markuce × Stripe
 * -----------------
 * Stripe.js loader and payment helpers.
 *
 * NOTE: Markuce is the Merchant of Record. Merchants never need their own
 * Stripe account. All card payments flow through the platform's Stripe account
 * via Stripe Connect. The publishable key here belongs to the Markuce platform.
 */
import { loadStripe, type Stripe, type StripeElements } from '@stripe/stripe-js'

// ── Singleton Stripe instance ─────────────────────────────────────────────────

let _stripe: Stripe | null = null
let _loading = false
const _waiters: Array<(s: Stripe | null) => void> = []

/**
 * Lazily load Stripe.js and return the singleton instance.
 * Safe to call multiple times — only loads the SDK once.
 */
export async function getStripe(): Promise<Stripe | null> {
  if (_stripe) return _stripe

  if (_loading) {
    return new Promise((resolve) => _waiters.push(resolve))
  }

  const pk = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  if (!pk) {
    console.error('[Stripe] VITE_STRIPE_PUBLISHABLE_KEY is not set')
    return null
  }

  _loading = true
  _stripe = await loadStripe(pk)
  _waiters.forEach((fn) => fn(_stripe))
  _waiters.length = 0
  _loading = false
  return _stripe
}

// ── Payment Intent confirmation ───────────────────────────────────────────────

export interface ConfirmCardResult {
  success: boolean
  paymentIntentId?: string
  error?: string
}

/**
 * Confirm a Stripe Payment Intent with card details.
 * @param clientSecret  The `client_secret` returned by our create-payment-link edge function
 * @param elements      Stripe Elements instance (contains card element)
 */
export async function confirmCard(
  clientSecret: string,
  elements: StripeElements
): Promise<ConfirmCardResult> {
  const stripe = await getStripe()
  if (!stripe) return { success: false, error: 'Stripe.js failed to load' }

  const { error, paymentIntent } = await stripe.confirmPayment({
    elements,
    redirect: 'if_required',
    confirmParams: {
      return_url: `${import.meta.env.VITE_APP_URL}/checkout/complete`,
    },
  })

  if (error) {
    return {
      success: false,
      error:   error.message ?? 'Payment failed',
    }
  }

  if (paymentIntent?.status === 'succeeded') {
    return { success: true, paymentIntentId: paymentIntent.id }
  }

  return {
    success: false,
    error:   `Unexpected PaymentIntent status: ${paymentIntent?.status ?? 'unknown'}`,
  }
}

// ── Stripe Elements appearance ────────────────────────────────────────────────

/**
 * Stripe Elements appearance config matching the Markuce dark design system.
 * Pass to `stripe.elements({ appearance })`.
 */
export const stripeAppearance = {
  theme: 'night',
  variables: {
    colorPrimary:        '#5865F2',
    colorBackground:     '#131D35',
    colorText:           '#E8EDF5',
    colorDanger:         '#F43F5E',
    colorSuccess:        '#00C9A7',
    colorTextPlaceholder:'#6B7FA3',
    colorTextSecondary:  '#6B7FA3',
    fontFamily:          'Inter, sans-serif',
    fontSizeBase:        '15px',
    spacingUnit:         '4px',
    borderRadius:        '8px',
  },
  rules: {
    '.Input': {
      border:          '1px solid #1C2B4A',
      backgroundColor: '#0E1528',
      boxShadow:       'none',
      padding:         '10px 12px',
    },
    '.Input:focus': {
      border:    '1px solid #5865F2',
      boxShadow: '0 0 0 3px rgba(88,101,242,0.15)',
    },
    '.Label': {
      color:       '#6B7FA3',
      fontWeight:  '500',
      fontSize:    '13px',
      marginBottom:'6px',
    },
    '.Error': {
      color: '#F43F5E',
    },
  },
} as const

// ── Platform fee helper ───────────────────────────────────────────────────────

/** Platform fee: 2.9% + fixed $0.30 (same as underlying Stripe transaction fee)
 *  Markuce earns 0.5% on top. Total taken from gross: 3.4% + $0.30. */
export const PLATFORM_FEE_PCT  = 0.034
export const PLATFORM_FEE_FLAT = 30 // cents

/**
 * Compute the net amount a merchant earns from a gross transaction amount.
 * @param grossMinor  Amount in minor units (cents)
 */
export function merchantNet(grossMinor: number): {
  net:      number
  fee:      number
  feePct:   string
} {
  const fee = Math.round(grossMinor * PLATFORM_FEE_PCT) + PLATFORM_FEE_FLAT
  const net = grossMinor - fee
  return {
    net,
    fee,
    feePct: `${(PLATFORM_FEE_PCT * 100).toFixed(1)}% + $0.30`,
  }
}
