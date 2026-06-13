/**
 * Markuce Onboarding — 3-step wizard
 * ─────────────────────────────────────
 * Step 1: Choose payout method (crypto wallet / bank)
 * Step 2: KYC (Sumsub WebSDK embed)
 * Step 3: Create first product
 */
import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wallet, Building2, ChevronRight, Check, Loader2, ArrowRight } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { startKyc } from '@/lib/api'
import { createProduct } from '@/lib/api'
import toast from 'react-hot-toast'

// ── Step indicator ────────────────────────────────────────────────────────────

function StepBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300
          ${i < current ? 'bg-primary' : i === current ? 'bg-primary/50' : 'bg-border'}`} />
      ))}
    </div>
  )
}

// ── Step 1: Payout setup ──────────────────────────────────────────────────────

function PayoutStep({ onNext }: { onNext: () => void }) {
  const { user, refreshProfile } = useAuth()
  const [method, setMethod] = useState<'crypto' | 'bank'>('crypto')
  const [solWallet, setSolWallet] = useState('')
  const [polygonWallet, setPolygonWallet] = useState('')
  const [loading, setLoading] = useState(false)

  async function save(e: FormEvent) {
    e.preventDefault()
    if (method === 'crypto' && !solWallet && !polygonWallet) {
      toast.error('Enter at least one wallet address')
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.from('profiles').update({
        sol_wallet:     solWallet     || null,
        polygon_wallet: polygonWallet || null,
        default_payout_method: method === 'crypto' ? 'usdc_solana' : 'bank_wire',
      }).eq('id', user!.id)

      if (error) throw error
      await refreshProfile()
      onNext()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-ink mb-1">Where should we pay you?</h2>
        <p className="text-sm text-ink-muted">
          Choose how you want to receive your earnings.
          You can change this later in Settings.
        </p>
      </div>

      {/* Method toggle */}
      <div className="grid grid-cols-2 gap-3">
        {([
          { id: 'crypto', label: 'Crypto wallet', sub: 'USDC/ETH/SOL — instant', Icon: Wallet },
          { id: 'bank',   label: 'Bank account',  sub: 'Wise · 160+ countries', Icon: Building2 },
        ] as const).map(({ id, label, sub, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMethod(id)}
            className={`flex flex-col items-start gap-1.5 p-4 rounded-xl border text-left
                         transition-all duration-150
                         ${method === id
                           ? 'border-primary bg-primary/5'
                           : 'border-border bg-bg-card hover:border-border-bright hover:bg-bg-hover'}`}
          >
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg
                              ${method === id ? 'bg-primary/10 text-primary' : 'bg-bg-hover text-ink-muted'}`}>
              <Icon size={18} />
            </div>
            <div className="text-sm font-medium text-ink">{label}</div>
            <div className="text-xs text-ink-muted">{sub}</div>
          </button>
        ))}
      </div>

      {method === 'crypto' && (
        <div className="flex flex-col gap-4">
          <div className="form-group">
            <label className="label">Solana wallet address (for USDC)</label>
            <input
              type="text"
              className="input font-mono text-xs"
              placeholder="5YNmS1R9nNSCDzb5a7mMJ1dwK9uHeAAF4CmPEwKgVWr8"
              value={solWallet}
              onChange={e => setSolWallet(e.target.value)}
            />
            <p className="text-xs text-ink-faint mt-1">Accept USDC and SOL on Solana</p>
          </div>
          <div className="form-group">
            <label className="label">Polygon wallet address (for USDC/MATIC)</label>
            <input
              type="text"
              className="input font-mono text-xs"
              placeholder="0x742d35Cc6634C0532925a3b8D4C9C4e..."
              value={polygonWallet}
              onChange={e => setPolygonWallet(e.target.value)}
            />
            <p className="text-xs text-ink-faint mt-1">Accept USDC and MATIC on Polygon</p>
          </div>
        </div>
      )}

      {method === 'bank' && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm text-ink-muted">
          <strong className="text-warning">Bank payout setup</strong><br/>
          After completing onboarding, connect your Wise account in Settings → Payouts.
          You can still accept payments immediately.
        </div>
      )}

      <button type="submit" className="btn-primary btn-lg justify-center" disabled={loading}>
        {loading ? <Loader2 size={18} className="animate-spin" /> : <>Continue <ChevronRight size={16}/></>}
      </button>
    </form>
  )
}

// ── Step 2: KYC ───────────────────────────────────────────────────────────────

function KycStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const [loading, setLoading] = useState(false)
  const [sdkToken, setSdkToken] = useState<string | null>(null)

  async function launchKyc() {
    setLoading(true)
    try {
      const { sdk_token } = await startKyc()
      setSdkToken(sdk_token)
      // In production: initialize Sumsub WebSDK with sdk_token
      // For now we show the token and a simulated approval
      toast.success('KYC session started — Sumsub SDK would open here')
      // Simulate approval after 2s in dev
      setTimeout(onNext, 2000)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to start KYC')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-ink mb-1">Quick identity check</h2>
        <p className="text-sm text-ink-muted">
          Markuce acts as the Merchant of Record and must verify your identity
          to comply with KYC/AML regulations. This typically takes under 2 minutes.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-bg-card p-5 flex flex-col gap-3">
        {[
          'Government-issued ID (passport, national ID, or driver\'s license)',
          'A selfie photo',
          'Usually approved within 2 hours',
        ].map(item => (
          <div key={item} className="flex items-start gap-2.5 text-sm text-ink-muted">
            <Check size={14} className="text-accent mt-0.5 flex-shrink-0" />
            {item}
          </div>
        ))}
      </div>

      <button onClick={launchKyc} className="btn-primary btn-lg justify-center" disabled={loading}>
        {loading ? <Loader2 size={18} className="animate-spin" /> : 'Start identity check'}
      </button>

      <button
        type="button"
        onClick={onSkip}
        className="text-xs text-ink-faint hover:text-ink-muted text-center transition-colors"
      >
        Skip for now — I'll complete this later
      </button>

      {/* Sumsub WebSDK container */}
      <div id="sumsub-websdk-container" />
    </div>
  )
}

// ── Step 3: First product ─────────────────────────────────────────────────────

function FirstProductStep({ onDone }: { onDone: () => void }) {
  const [name,  setName]  = useState('')
  const [price, setPrice] = useState('')
  const [desc,  setDesc]  = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    const priceMinor = Math.round(parseFloat(price) * 100)
    if (isNaN(priceMinor) || priceMinor < 50) {
      toast.error('Minimum price is $0.50')
      return
    }
    setLoading(true)
    try {
      const result = await createProduct({
        name,
        description: desc || undefined,
        price_minor: priceMinor,
        type: 'one_time',
      })
      toast.success('Product created!')
      onDone()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create product')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleCreate} className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-ink mb-1">Create your first product</h2>
        <p className="text-sm text-ink-muted">
          You'll get a shareable payment link immediately after.
        </p>
      </div>

      <div className="form-group">
        <label className="label">Product name</label>
        <input
          type="text"
          className="input"
          placeholder="Pro Subscription"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          autoFocus
        />
      </div>

      <div className="form-group">
        <label className="label">Price (USD)</label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint text-sm">$</span>
          <input
            type="number"
            className="input pl-7"
            placeholder="29.00"
            min="0.50"
            step="0.01"
            value={price}
            onChange={e => setPrice(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label className="label">Description <span className="text-ink-faint">(optional)</span></label>
        <textarea
          className="input resize-none"
          rows={3}
          placeholder="What does your product include?"
          value={desc}
          onChange={e => setDesc(e.target.value)}
        />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onDone}
          className="btn-secondary btn-lg flex-1 justify-center"
        >
          Skip
        </button>
        <button
          type="submit"
          className="btn-primary btn-lg flex-1 justify-center"
          disabled={loading}
        >
          {loading
            ? <Loader2 size={18} className="animate-spin" />
            : <>Create & go to dashboard <ArrowRight size={16}/></>
          }
        </button>
      </div>
    </form>
  )
}

// ── Onboarding shell ──────────────────────────────────────────────────────────

export default function Onboarding() {
  const { user, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)

  const TOTAL_STEPS = 3

  async function finish() {
    if (!user) return
    await supabase.from('profiles')
      .update({ onboarding_complete: true })
      .eq('id', user.id)
    await refreshProfile()
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center px-4">
      <div className="pointer-events-none fixed inset-0"
           style={{
             backgroundImage: `
               linear-gradient(rgba(88,101,242,0.03) 1px, transparent 1px),
               linear-gradient(90deg, rgba(88,101,242,0.03) 1px, transparent 1px)
             `,
             backgroundSize: '60px 60px',
           }}
      />

      <div className="relative w-full max-w-lg">
        {/* Logo + step indicator */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg
                              bg-primary text-white font-bold text-sm">M</span>
            <span className="font-semibold text-ink">Markuce</span>
          </div>
          <span className="text-xs text-ink-muted">Step {step + 1} of {TOTAL_STEPS}</span>
        </div>

        <StepBar current={step} total={TOTAL_STEPS} />

        <div className="card mt-6 border-border/80">
          {step === 0 && (
            <PayoutStep onNext={() => setStep(1)} />
          )}
          {step === 1 && (
            <KycStep onNext={() => setStep(2)} onSkip={() => setStep(2)} />
          )}
          {step === 2 && (
            <FirstProductStep onDone={finish} />
          )}
        </div>
      </div>
    </div>
  )
}
