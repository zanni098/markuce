/**
 * Markuce Unified Checkout
 * ─────────────────────────
 * Supports two payment modes on one page:
 *
 * 1. CARD (Stripe)      — Stripe Elements Payment Element
 * 2. CRYPTO (on-chain)  — Chainlink-priced ETH / SOL / MATIC / USDC
 *
 * The session is fetched from Supabase by :id.
 * Crypto prices are fetched once from Chainlink Data Feeds on load.
 * Price quotes are stored in the session row at creation time (server-side).
 */
import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js'
import {
  CreditCard, Coins, Copy, CheckCircle2,
  XCircle, Clock, RefreshCw, Loader2, ExternalLink,
  ShieldCheck,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getStripe, stripeAppearance, confirmCard } from '@/lib/stripe'
import { getAllPrices, computeCryptoAmounts } from '@/lib/chainlink'
import { verifyPayment } from '@/lib/api'
import type { Database } from '@/lib/database.types'
import type { Stripe } from '@stripe/stripe-js'
import toast from 'react-hot-toast'

type CheckoutSession = Database['public']['Tables']['checkout_sessions']['Row']
type Product         = Database['public']['Tables']['products']['Row']
type PaymentMethod   = 'card' | 'usdc_solana' | 'usdt_polygon' | 'eth_ethereum' | 'matic_polygon'

const fmt  = (c: number, cur = 'USD') =>
  new Intl.NumberFormat('en-US', { style:'currency', currency: cur }).format(c / 100)

// ── Status screens ────────────────────────────────────────────────────────────

function SuccessScreen({ amount, currency }: { amount: number; currency: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <CheckCircle2 size={56} className="text-success" />
      <h2 className="text-2xl font-bold text-ink">Payment confirmed!</h2>
      <p className="text-ink-muted">
        You paid <strong className="text-ink">{fmt(amount, currency)}</strong>.
        Check your email for a receipt.
      </p>
    </div>
  )
}

function FailedScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <XCircle size={56} className="text-danger" />
      <h2 className="text-2xl font-bold text-ink">Payment failed</h2>
      <p className="text-ink-muted">Something went wrong. Please try again.</p>
      <button onClick={onRetry} className="btn-primary btn-lg">Try again</button>
    </div>
  )
}

function ExpiredScreen() {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <Clock size={56} className="text-warning" />
      <h2 className="text-2xl font-bold text-ink">Session expired</h2>
      <p className="text-ink-muted">This payment link has expired. Please request a new one.</p>
    </div>
  )
}

// ── Stripe card form ──────────────────────────────────────────────────────────

function CardForm({ sessionId, onSuccess, onFail }: {
  sessionId: string
  onSuccess: () => void
  onFail:    () => void
}) {
  const stripe   = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handlePay() {
    if (!stripe || !elements) return
    setLoading(true)
    setError(null)
    try {
      const result = await confirmCard('', elements) // client_secret comes via Stripe Elements
      if (result.success) {
        // Verify on our backend
        await verifyPayment({ session_id: sessionId, payment_method: 'card' })
        onSuccess()
      } else {
        setError(result.error ?? 'Payment failed')
        onFail()
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PaymentElement />
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        onClick={handlePay}
        className="btn-primary btn-lg justify-center"
        disabled={loading || !stripe}
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : 'Pay now'}
      </button>
    </div>
  )
}

// ── Crypto payment panel ──────────────────────────────────────────────────────

const CRYPTO_OPTIONS = [
  { id: 'eth_ethereum',  label: 'ETH',  network: 'Ethereum', icon: '⟠', color: '#627EEA' },
  { id: 'usdc_solana',   label: 'USDC', network: 'Solana',   icon: '◎', color: '#9945FF' },
  { id: 'matic_polygon', label: 'MATIC',network: 'Polygon',  icon: '⬟', color: '#8247E5' },
] as const

function CryptoPanel({ session, product }: { session: CheckoutSession; product: Product }) {
  const [selected, setSelected] = useState<typeof CRYPTO_OPTIONS[number]['id']>('usdc_solana')
  const [prices,   setPrices]   = useState<ReturnType<typeof computeCryptoAmounts> | null>(null)
  const [priceAge, setPriceAge] = useState<Date | null>(null)
  const [polling,  setPolling]  = useState(false)
  const [loading,  setLoading]  = useState(true)
  const [verified, setVerified] = useState(false)
  const navigate = useNavigate()

  // Fetch Chainlink prices
  const loadPrices = useCallback(async () => {
    try {
      const all = await getAllPrices()
      const amounts = computeCryptoAmounts(session.price_minor, all)
      setPrices(amounts)
      setPriceAge(all.fetchedAt)
    } catch {
      toast.error('Failed to load crypto prices')
    } finally {
      setLoading(false)
    }
  }, [session.price_minor])

  useEffect(() => { loadPrices() }, [loadPrices])

  // Poll for payment confirmation every 5s
  useEffect(() => {
    if (!polling) return
    const interval = setInterval(async () => {
      try {
        const result = await verifyPayment({
          session_id:     session.id,
          payment_method: selected,
        })
        if (result.status === 'confirmed') {
          clearInterval(interval)
          setPolling(false)
          setVerified(true)
          setTimeout(() => navigate(`/checkout/${session.id}/complete`), 1500)
        } else if (result.status === 'failed' || result.status === 'expired') {
          clearInterval(interval)
          setPolling(false)
          toast.error(`Payment ${result.status}`)
        }
      } catch {
        // silently retry
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [polling, session.id, selected, navigate])

  const currentOption = CRYPTO_OPTIONS.find(o => o.id === selected)!
  const amount = prices?.[selected === 'eth_ethereum' ? 'eth' : selected === 'usdc_solana' ? 'sol' : 'matic']

  // Destination address per network
  const destAddress: Record<string, string | null | undefined> = {
    eth_ethereum:  session.crypto_address,
    usdc_solana:   session.crypto_address,
    matic_polygon: session.crypto_address,
  }
  const address = destAddress[selected]

  function copyAddress() {
    if (!address) return
    navigator.clipboard.writeText(address)
    toast.success('Address copied')
  }

  function copyAmount() {
    if (!amount) return
    navigator.clipboard.writeText(String(amount))
    toast.success('Amount copied')
  }

  if (verified) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle2 size={48} className="text-success" />
        <p className="font-semibold text-ink">Payment confirmed!</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Network selector */}
      <div className="grid grid-cols-3 gap-2">
        {CRYPTO_OPTIONS.map(opt => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setSelected(opt.id)}
            className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-sm
                         font-medium transition-all duration-150
                         ${selected === opt.id
                           ? 'border-primary bg-primary/5 text-ink'
                           : 'border-border bg-bg-card text-ink-muted hover:border-border-bright hover:bg-bg-hover'}`}
          >
            <span className="text-xl">{opt.icon}</span>
            <span>{opt.label}</span>
            <span className="text-[10px] text-ink-faint">{opt.network}</span>
          </button>
        ))}
      </div>

      {/* Price info */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-6 text-ink-muted text-sm">
          <Loader2 size={16} className="animate-spin" />
          Loading Chainlink price…
        </div>
      ) : (
        <div className="rounded-xl bg-bg-card border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-ink-muted">Amount to send</span>
            <button onClick={loadPrices} className="text-xs text-ink-faint hover:text-ink flex items-center gap-1">
              <RefreshCw size={11}/>
              Refresh
            </button>
          </div>

          <div className="flex items-baseline justify-between mb-1">
            <span className="text-2xl font-bold text-ink font-mono">
              {amount != null ? amount : '—'}
            </span>
            <span className="text-ink-muted">{currentOption.label}</span>
          </div>

          {priceAge && (
            <div className="flex items-center gap-1 text-xs text-ink-faint mt-1">
              <ShieldCheck size={11} className="text-success" />
              Chainlink oracle · {Math.round((Date.now() - priceAge.getTime()) / 1000)}s ago
            </div>
          )}
        </div>
      )}

      {/* Send to address */}
      {address && (
        <div className="rounded-xl bg-bg-card border border-border p-4">
          <div className="text-xs text-ink-muted mb-2">Send to address</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-xs text-ink break-all">{address}</code>
            <button onClick={copyAddress} className="btn-ghost btn-sm p-1.5 flex-shrink-0">
              <Copy size={13}/>
            </button>
          </div>
          <p className="text-[11px] text-ink-faint mt-2">
            Send exactly <strong className="text-ink">{amount} {currentOption.label}</strong> to
            this address on {currentOption.network}. Do not send any other token.
          </p>
        </div>
      )}

      {!polling ? (
        <button
          onClick={() => setPolling(true)}
          className="btn-primary btn-lg justify-center"
          disabled={!address || loading}
        >
          I've sent the payment — confirm
        </button>
      ) : (
        <div className="flex items-center justify-center gap-2 py-3 text-sm text-ink-muted">
          <Loader2 size={16} className="animate-spin text-primary" />
          Watching for your transaction…
        </div>
      )}

      <p className="text-xs text-ink-faint text-center">
        ±2% price tolerance. Prices from{' '}
        <a href="https://data.chain.link/feeds" target="_blank" rel="noreferrer"
           className="text-primary hover:underline inline-flex items-center gap-0.5">
          Chainlink Data Feeds <ExternalLink size={10}/>
        </a>
      </p>
    </div>
  )
}

// ── Checkout shell ────────────────────────────────────────────────────────────

export default function Checkout() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [session,   setSession]   = useState<CheckoutSession | null>(null)
  const [product,   setProduct]   = useState<Product | null>(null)
  const [mode,      setMode]      = useState<'card' | 'crypto'>('card')
  const [stripe,    setStripeInst]= useState<Stripe | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [status,    setStatus]    = useState<'idle' | 'success' | 'failed' | 'expired'>('idle')

  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase.from('checkout_sessions').select('*').eq('id', id).single(),
      getStripe(),
    ]).then(([{ data: sess }, stripeInst]) => {
      if (!sess) { navigate('/'); return }
      if (sess.status === 'expired')   { setStatus('expired');  return }
      if (sess.status === 'confirmed') { setStatus('success');  return }

      setSession(sess)
      setStripeInst(stripeInst)

      return supabase.from('products').select('*').eq('id', sess.product_id).single()
        .then(({ data: p }) => setProduct(p))
    }).finally(() => setLoading(false))
  }, [id, navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center px-4 py-12">
      <div className="pointer-events-none fixed inset-0"
           style={{
             backgroundImage: `
               linear-gradient(rgba(88,101,242,0.03) 1px, transparent 1px),
               linear-gradient(90deg, rgba(88,101,242,0.03) 1px, transparent 1px)
             `,
             backgroundSize: '60px 60px',
           }}
      />

      <div className="relative w-full max-w-md">
        {/* Branding */}
        <div className="flex items-center gap-2 mb-6 justify-center">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg
                            bg-primary text-white font-bold text-sm">M</span>
          <span className="text-sm font-semibold text-ink">Markuce</span>
        </div>

        <div className="card border-border/80 shadow-2xl">
          {/* Status screens */}
          {status === 'success'  && <SuccessScreen amount={session?.price_minor ?? 0} currency={session?.currency ?? 'USD'} />}
          {status === 'failed'   && <FailedScreen onRetry={() => setStatus('idle')} />}
          {status === 'expired'  && <ExpiredScreen />}

          {status === 'idle' && session && product && (
            <>
              {/* Product summary */}
              <div className="mb-5 pb-5 border-b border-border">
                <div className="text-xs text-ink-faint mb-1">Paying to</div>
                <h1 className="text-lg font-bold text-ink">{product.name}</h1>
                {product.description && (
                  <p className="text-sm text-ink-muted mt-0.5">{product.description}</p>
                )}
                <div className="mt-3 text-3xl font-extrabold text-ink">
                  {fmt(session.price_minor, session.currency)}
                </div>
              </div>

              {/* Mode toggle */}
              <div className="flex rounded-xl bg-bg-surface border border-border p-1 mb-5 gap-1">
                {([
                  { id: 'card',   icon: CreditCard, label: 'Card' },
                  { id: 'crypto', icon: Coins,       label: 'Crypto' },
                ] as const).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setMode(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg
                                 text-sm font-medium transition-all duration-150
                                 ${mode === tab.id
                                   ? 'bg-bg-card text-ink shadow-sm border border-border'
                                   : 'text-ink-muted hover:text-ink'}`}
                  >
                    <tab.icon size={15} />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Payment content */}
              {mode === 'card' && stripe && session.stripe_payment_intent_id && (
                <Elements
                  stripe={stripe}
                  options={{
                    clientSecret: session.stripe_payment_intent_id,
                    appearance:   stripeAppearance,
                  }}
                >
                  <CardForm
                    sessionId={session.id}
                    onSuccess={() => setStatus('success')}
                    onFail={() => setStatus('failed')}
                  />
                </Elements>
              )}

              {mode === 'card' && !session.stripe_payment_intent_id && (
                <div className="text-sm text-ink-muted text-center py-4">
                  Card payments not available for this session.
                </div>
              )}

              {mode === 'crypto' && (
                <CryptoPanel session={session} product={product} />
              )}
            </>
          )}
        </div>

        {/* Footer trust badges */}
        <div className="flex items-center justify-center gap-4 mt-5 text-xs text-ink-faint">
          <span className="flex items-center gap-1">
            <ShieldCheck size={12} className="text-success" />
            Secured by Markuce
          </span>
          <span>·</span>
          <a href="https://data.chain.link" target="_blank" rel="noreferrer"
             className="flex items-center gap-1 hover:text-ink-muted transition-colors">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Chainlink oracle
          </a>
        </div>
      </div>
    </div>
  )
}
