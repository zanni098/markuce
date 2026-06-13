/**
 * Markuce Edge Function Client
 * ────────────────────────────
 * Typed wrappers for every Supabase Edge Function.
 * All mutations are authenticated — the Supabase SDK
 * attaches the JWT automatically via the client config.
 */
import { supabase } from './supabase'
import type {
  CheckoutStatus,
  Network,
  PaymentMethod,
  ProductType,
  BillingInterval,
  Json,
} from './database.types'

// ── Shared helpers ────────────────────────────────────────────────────────────

type Awaited<T> = T extends Promise<infer U> ? U : T

async function invokeEdge<TBody, TResult>(
  fn: string,
  body?: TBody
): Promise<TResult> {
  const { data, error } = await supabase.functions.invoke<TResult>(fn, {
    body: body ?? {},
  })
  if (error) {
    // Edge functions return { error: string } on application-level errors
    const msg =
      typeof (error as unknown as { message: string }).message === 'string'
        ? (error as unknown as { message: string }).message
        : 'Edge function error'
    throw new Error(msg)
  }
  return data as TResult
}

// ── create-payment-link ───────────────────────────────────────────────────────

export interface CreatePaymentLinkBody {
  product_id:      string
  /** Override price for one-off discounts */
  price_override?: number
  /** Metadata forwarded to webhook events */
  metadata?:       Record<string, string>
  /** Idempotency key — send the same key to avoid duplicate sessions */
  idempotency_key?: string
}

export interface CreatePaymentLinkResult {
  session_id:   string
  checkout_url: string
  /** Seconds until this session expires */
  expires_in:   number
}

export const createPaymentLink = (body: CreatePaymentLinkBody) =>
  invokeEdge<CreatePaymentLinkBody, CreatePaymentLinkResult>(
    'create-payment-link',
    body
  )

// ── verify-payment ────────────────────────────────────────────────────────────

export interface VerifyPaymentBody {
  session_id:     string
  tx_hash?:       string
  payment_method: PaymentMethod
}

export interface VerifyPaymentResult {
  status:       CheckoutStatus
  transaction_id?: string
  error?:       string
}

export const verifyPayment = (body: VerifyPaymentBody) =>
  invokeEdge<VerifyPaymentBody, VerifyPaymentResult>('verify-payment', body)

// ── create-product ────────────────────────────────────────────────────────────

export interface CreateProductBody {
  name:                  string
  description?:          string
  price_minor:           number
  currency?:             string
  type:                  ProductType
  billing_interval?:     BillingInterval
  billing_interval_count?: number
  trial_days?:           number
  image_url?:            string
  metadata?:             Json
}

export interface CreateProductResult {
  id:          string
  checkout_url: string
}

export const createProduct = (body: CreateProductBody) =>
  invokeEdge<CreateProductBody, CreateProductResult>('create-product', body)

// ── update-product ────────────────────────────────────────────────────────────

export type UpdateProductBody = Partial<CreateProductBody> & { id: string }

export const updateProduct = (body: UpdateProductBody) =>
  invokeEdge<UpdateProductBody, { id: string }>('update-product', body)

// ── trigger-payout ────────────────────────────────────────────────────────────

export interface TriggerPayoutBody {
  /** Defaults to the merchant's default_payout_method */
  method?: 'usdc_solana' | 'usdt_polygon' | 'eth_ethereum' | 'bank_wire'
}

export interface TriggerPayoutResult {
  payout_id:  string
  amount_usd: number
  status:     string
}

export const triggerPayout = (body?: TriggerPayoutBody) =>
  invokeEdge<TriggerPayoutBody, TriggerPayoutResult>('trigger-payout', body ?? {})

// ── update-webhook ────────────────────────────────────────────────────────────

export interface UpdateWebhookBody {
  url:             string | null
  enabled_events?: string[]
}

export const updateWebhook = (body: UpdateWebhookBody) =>
  invokeEdge<UpdateWebhookBody, { ok: true }>('update-webhook', body)

// ── rotate-api-keys ───────────────────────────────────────────────────────────

export interface RotateApiKeysResult {
  pk_live:         string
  sk_live_preview: string
  rotated_at:      string
}

export const rotateApiKeys = () =>
  invokeEdge<Record<string, never>, RotateApiKeysResult>('rotate-api-keys', {})

// ── start-kyc ────────────────────────────────────────────────────────────────

export interface StartKycResult {
  /** Sumsub WebSDK token — pass directly to the SDK */
  sdk_token: string
  applicant_id: string
}

export const startKyc = () =>
  invokeEdge<Record<string, never>, StartKycResult>('start-kyc', {})

// ── Supabase table reads (typed shortcuts) ────────────────────────────────────

export async function getProducts(merchantId: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getTransactions(merchantId: string, limit = 50, offset = 0) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (error) throw error
  return data
}

export async function getPayouts(merchantId: string) {
  const { data, error } = await supabase
    .from('payouts')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getSubscriptions(merchantId: string) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getWebhookDeliveries(merchantId: string, limit = 100) {
  const { data, error } = await supabase
    .from('webhook_deliveries')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

// ── Revenue summary (for dashboard chart) ────────────────────────────────────

export interface RevenueSummary {
  total_gross:   number
  total_net:     number
  total_fees:    number
  count:         number
  period_days:   number
}

export async function getRevenueSummary(
  merchantId: string,
  periodDays = 30
): Promise<RevenueSummary> {
  const since = new Date(Date.now() - periodDays * 86_400_000).toISOString()

  const { data, error } = await supabase
    .from('transactions')
    .select('gross_minor, net_minor, fee_minor')
    .eq('merchant_id', merchantId)
    .gte('created_at', since)

  if (error) throw error

  return (data ?? []).reduce<RevenueSummary>(
    (acc, row) => ({
      total_gross: acc.total_gross + row.gross_minor,
      total_net:   acc.total_net   + row.net_minor,
      total_fees:  acc.total_fees  + row.fee_minor,
      count:       acc.count + 1,
      period_days: periodDays,
    }),
    { total_gross: 0, total_net: 0, total_fees: 0, count: 0, period_days: periodDays }
  )
}
