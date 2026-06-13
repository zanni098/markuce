/**
 * Markuce database types — auto-generate fresh with:
 *   npx supabase gen types typescript --project-id YOUR_ID > src/lib/database.types.ts
 *
 * The types below are hand-maintained until you have a live Supabase project.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Network = 'solana' | 'polygon' | 'ethereum' | 'bitcoin_lightning'
export type PaymentMethod = 'card' | 'usdc_solana' | 'usdt_polygon' | 'eth_ethereum' | 'matic_polygon'
export type CheckoutStatus = 'awaiting_payment' | 'confirming' | 'confirmed' | 'failed' | 'expired'
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete'
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type PayoutMethod = 'usdc_solana' | 'usdt_polygon' | 'eth_ethereum' | 'bank_wire'
export type KycStatus = 'none' | 'pending' | 'approved' | 'rejected'
export type BillingInterval = 'day' | 'week' | 'month' | 'year'
export type ProductType = 'one_time' | 'subscription' | 'usage'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          business_name: string
          email: string
          website: string | null
          kyc_status: KycStatus
          kyc_provider_id: string | null
          // Payout wallets
          sol_wallet: string | null
          polygon_wallet: string | null
          eth_wallet: string | null
          // Bank payout (Wise)
          wise_account_id: string | null
          default_payout_method: PayoutMethod
          // Platform settings
          stripe_account_id: string | null
          onboarding_complete: boolean
          timezone: string
          currency: string
        }
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string }
        Update: Partial<Database['public']['Tables']['profiles']['Row']>
      }

      merchant_secrets: {
        Row: {
          merchant_id: string
          pk_live: string
          sk_live: string
          sk_test: string
          webhook_secret: string
          created_at: string
          rotated_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['merchant_secrets']['Row']> & { merchant_id: string }
        Update: Partial<Database['public']['Tables']['merchant_secrets']['Row']>
      }

      products: {
        Row: {
          id: string
          merchant_id: string
          created_at: string
          updated_at: string
          name: string
          description: string | null
          price_minor: number
          currency: string
          type: ProductType
          billing_interval: BillingInterval | null
          billing_interval_count: number
          trial_days: number
          active: boolean
          image_url: string | null
          metadata: Json
        }
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['products']['Row']>
      }

      checkout_sessions: {
        Row: {
          id: string
          merchant_id: string
          product_id: string
          created_at: string
          updated_at: string
          expires_at: string
          status: CheckoutStatus
          // Frozen at creation — never trust browser
          price_minor: number
          currency: string
          payment_method: PaymentMethod | null
          // Fiat (Stripe)
          stripe_payment_intent_id: string | null
          // Crypto
          reference: string
          network: Network | null
          crypto_address: string | null
          crypto_amount: string | null
          crypto_amount_quoted: string | null
          // Chainlink oracle data (stored for verification)
          chainlink_feed_address: string | null
          chainlink_round_id: string | null
          chainlink_price_usd: string | null
          // Customer
          customer_email: string | null
          customer_name: string | null
          // Meta
          idempotency_key: string | null
          metadata: Json
        }
        Insert: Omit<Database['public']['Tables']['checkout_sessions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['checkout_sessions']['Row']>
      }

      transactions: {
        Row: {
          id: string
          merchant_id: string
          checkout_session_id: string
          created_at: string
          // What the merchant earns (after platform fee)
          net_minor: number
          gross_minor: number
          fee_minor: number
          currency: string
          payment_method: PaymentMethod
          network: Network | null
          tx_hash: string | null
          stripe_charge_id: string | null
          customer_email: string | null
          refunded: boolean
          refunded_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['transactions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['transactions']['Row']>
      }

      subscriptions: {
        Row: {
          id: string
          merchant_id: string
          product_id: string
          customer_email: string
          created_at: string
          updated_at: string
          status: SubscriptionStatus
          current_period_start: string
          current_period_end: string
          stripe_subscription_id: string | null
          trial_end: string | null
          canceled_at: string | null
          metadata: Json
        }
        Insert: Omit<Database['public']['Tables']['subscriptions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['subscriptions']['Row']>
      }

      payouts: {
        Row: {
          id: string
          merchant_id: string
          created_at: string
          updated_at: string
          amount_minor: number
          currency: string
          method: PayoutMethod
          status: PayoutStatus
          // Crypto
          tx_hash: string | null
          destination_address: string | null
          // Bank
          wise_transfer_id: string | null
          // Batching
          period_start: string
          period_end: string
          transaction_count: number
        }
        Insert: Omit<Database['public']['Tables']['payouts']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['payouts']['Row']>
      }

      webhooks: {
        Row: {
          merchant_id: string
          url: string | null
          enabled_events: string[]
          created_at: string
          updated_at: string
        }
        Insert: Database['public']['Tables']['webhooks']['Row']
        Update: Partial<Database['public']['Tables']['webhooks']['Row']>
      }

      webhook_deliveries: {
        Row: {
          id: string
          merchant_id: string
          event_type: string
          payload: Json
          url: string
          status: 'pending' | 'delivered' | 'failed'
          attempt_count: number
          last_attempt_at: string | null
          next_retry_at: string | null
          response_status: number | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['webhook_deliveries']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['webhook_deliveries']['Row']>
      }

      rate_limit_buckets: {
        Row: {
          key: string
          tokens: number
          last_refill: string
        }
        Insert: Database['public']['Tables']['rate_limit_buckets']['Row']
        Update: Partial<Database['public']['Tables']['rate_limit_buckets']['Row']>
      }
    }

    Functions: {
      rl_consume: {
        Args: { p_key: string; p_capacity: number; p_refill_rate: number; p_cost: number }
        Returns: boolean
      }
    }
  }
}
