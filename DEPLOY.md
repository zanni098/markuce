# Markuce — Deployment Guide

## Prerequisites

- Node 20+
- pnpm (or npm)
- Supabase CLI: `npm i -g supabase`
- A [Supabase](https://supabase.com) project (free tier works for dev)
- A [Stripe](https://stripe.com) account (platform / Connect)
- (Optional) [Wise API](https://wise.com/us/business/api) key for bank payouts
- (Optional) [Sumsub](https://sumsub.com) credentials for KYC

---

## 1 · Local development

```bash
cd markuce
cp .env.example .env          # fill in your values

pnpm install
pnpm dev                       # Vite dev server at http://localhost:5173
```

---

## 2 · Supabase setup

```bash
# Login
supabase login

# Link to your remote project
supabase link --project-ref YOUR_PROJECT_REF

# Apply the database migration
supabase db push

# Set edge function secrets
supabase secrets set \
  STRIPE_SECRET_KEY=sk_live_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  APP_URL=https://markuce.com \
  DASHBOARD_ORIGINS=https://markuce.com,http://localhost:5173 \
  HELIUS_API_KEY=... \
  SUMSUB_APP_TOKEN=... \
  SUMSUB_SECRET_KEY=...

# Deploy all edge functions
supabase functions deploy create-payment-link
supabase functions deploy verify-payment
supabase functions deploy webhook-dispatcher
supabase functions deploy stripe-webhook
supabase functions deploy update-webhook
supabase functions deploy rotate-api-keys
supabase functions deploy start-kyc
supabase functions deploy create-product
supabase functions deploy update-product
supabase functions deploy trigger-payout
```

---

## 3 · Stripe webhook

Register the Stripe webhook endpoint in your Stripe dashboard:

```
https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook
```

Select events:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Copy the signing secret and set it as `STRIPE_WEBHOOK_SECRET`.

---

## 4 · Build & deploy frontend

```bash
pnpm build          # outputs to dist/

# Deploy dist/ to Vercel, Netlify, Cloudflare Pages, etc.
# Set the same environment variables from .env.example
```

---

## 5 · Environment variables (production)

| Variable | Where | Description |
|----------|-------|-------------|
| `VITE_SUPABASE_URL` | Frontend | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Frontend | Supabase anon key |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Frontend | Stripe publishable key |
| `VITE_APP_URL` | Frontend | Your production domain |
| `VITE_ETH_RPC_URL` | Frontend | Ethereum JSON-RPC (for Chainlink) |
| `VITE_POLYGON_RPC_URL` | Frontend | Polygon JSON-RPC (for Chainlink) |
| `STRIPE_SECRET_KEY` | Edge fn | Stripe secret key (service role) |
| `STRIPE_WEBHOOK_SECRET` | Edge fn | Stripe webhook signing secret |
| `HELIUS_API_KEY` | Edge fn | Helius RPC for Solana tx verification |
| `SUMSUB_APP_TOKEN` | Edge fn | Sumsub KYC app token |
| `SUMSUB_SECRET_KEY` | Edge fn | Sumsub KYC secret key |
| `WISE_API_KEY` | Edge fn | Wise API for bank payouts (Phase 3) |

---

## 6 · Architecture overview

```
Browser                 Supabase                  External
──────────────────────  ──────────────────────────────────────────
Landing page
Auth (email+pass)  →   auth.users
                        profiles
Dashboard          ↔   products
                        checkout_sessions
                        transactions
                        subscriptions
                        payouts
                        webhooks

Checkout page
  Stripe card      →   create-payment-link  →  Stripe PaymentIntent
                        verify-payment       →  Stripe PI confirm
  Crypto (Chainlink)    Chainlink Data Feeds (on-chain RPC reads)
                        verify-payment       →  Solana/Polygon RPC

Webhooks           ←   webhook-dispatcher   →  Merchant endpoint
                          HMAC-SHA256 signed

Payouts                 trigger-payout       →  Wise API (bank)
                                             →  Direct crypto transfer
```

---

## 7 · Chainlink Data Feeds

Prices are read directly from on-chain contracts — no API key needed.

| Pair | Network | Address |
|------|---------|---------|
| ETH/USD | Ethereum | `0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419` |
| SOL/USD | Polygon  | `0x4ffC43a60e009B551865A93d232E33Fce9f01507` |
| MATIC/USD | Polygon | `0xAB594600376Ec9fD91F8e885dADF0CE036862dE0` |

Feeds older than 1 hour are rejected. A ±2% tolerance window handles price movement between quote and settlement.

---

## 8 · Legal checklist (before launch)

- [ ] Incorporate a US LLC (Wyoming or Delaware recommended)
- [ ] Open a Stripe Connect platform account under the LLC
- [ ] Obtain a registered agent and EIN
- [ ] Draft Terms of Service and Privacy Policy
- [ ] Enable Sumsub KYC for merchant onboarding (AML compliance)
- [ ] Verify Wise API integration for bank payouts
- [ ] Set up accounting (QuickBooks, Wave, or Pilot)
