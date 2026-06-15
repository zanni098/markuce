/**
 * Markuce Landing Page
 * ─────────────────────
 * Dark, developer-first — polar.sh × OKX aesthetic.
 * Sections: Nav → Hero → Social Proof → Features → How It Works
 *            → Pricing → FAQ → CTA → Footer
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Globe, Zap, ShieldCheck, Code2, CreditCard, Coins,
  ChevronDown, ArrowRight, Check, ExternalLink, Menu, X,
} from 'lucide-react'

// ── Nav ──────────────────────────────────────────────────────────────────────

function Nav() {
  const [open, setOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50
                        bg-bg-base/80 backdrop-blur-xl">
      <div className="container-wide flex h-16 items-center justify-between px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 font-semibold text-ink">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg
                            bg-primary text-white text-sm font-bold">M</span>
          <span className="text-base tracking-tight">Markuce</span>
        </Link>

        {/* Desktop links */}
        <nav className="hidden md:flex items-center gap-7 text-sm text-ink-muted">
          <a href="#features" className="hover:text-ink transition-colors">Features</a>
          <a href="#how"      className="hover:text-ink transition-colors">How it works</a>
          <a href="#pricing"  className="hover:text-ink transition-colors">Pricing</a>
          <a href="#faq"      className="hover:text-ink transition-colors">FAQ</a>
          <a href="https://docs.markuce.com" className="hover:text-ink transition-colors
             flex items-center gap-1">Docs<ExternalLink size={11}/></a>
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link to="/login"    className="btn-ghost btn-sm text-ink-muted">Sign in</Link>
          <Link to="/register" className="btn-primary btn-sm">Start for free</Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-ink-muted"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={20}/> : <Menu size={20}/>}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-border bg-bg-surface px-6 py-4 flex
                         flex-col gap-4 text-sm text-ink-muted">
          <a href="#features" onClick={() => setOpen(false)} className="hover:text-ink">Features</a>
          <a href="#how"      onClick={() => setOpen(false)} className="hover:text-ink">How it works</a>
          <a href="#pricing"  onClick={() => setOpen(false)} className="hover:text-ink">Pricing</a>
          <a href="#faq"      onClick={() => setOpen(false)} className="hover:text-ink">FAQ</a>
          <div className="flex flex-col gap-2 pt-2 border-t border-border">
            <Link to="/login"    className="btn-secondary btn-sm justify-center">Sign in</Link>
            <Link to="/register" className="btn-primary  btn-sm justify-center">Start for free</Link>
          </div>
        </div>
      )}
    </header>
  )
}

// ── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center
                          pt-24 pb-16 px-4 overflow-hidden text-center">
      {/* Background grid */}
      <div className="pointer-events-none absolute inset-0"
           style={{
             backgroundImage: `
               linear-gradient(rgba(21,20,15,0.04) 1px, transparent 1px),
               linear-gradient(90deg, rgba(21,20,15,0.04) 1px, transparent 1px)
             `,
             backgroundSize: '60px 60px',
           }}
      />

      {/* Radial glow behind hero */}
      <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2
                       w-[900px] h-[600px] rounded-full
                       bg-[radial-gradient(ellipse,rgba(14,122,95,0.12),transparent_70%)]" />

      {/* Pill badge */}
      <div className="relative mb-6 inline-flex items-center gap-2 rounded-full border border-accent/30
                       bg-accent/5 px-4 py-1.5 text-xs text-accent font-medium">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </span>
        Fully non-custodial · Stripe + Crypto in one
      </div>

      {/* Headline */}
      <h1 className="relative max-w-4xl text-balance text-5xl sm:text-6xl lg:text-7xl
                      font-extrabold tracking-tight leading-[1.08]">
        Global payments{' '}
        <span className="gradient-text">without borders</span>
      </h1>

      <p className="relative mt-6 max-w-2xl text-lg text-ink-muted text-balance leading-relaxed">
        Accept credit cards <em>and</em> crypto from any customer on Earth.
        No Stripe account needed — Markuce is the Merchant of Record.
        Ship your first product in under 10 minutes.
      </p>

      {/* CTAs */}
      <div className="relative mt-10 flex flex-col sm:flex-row items-center gap-3">
        <Link to="/register"
              className="btn-primary btn-lg text-base px-8">
          Get started free
          <ArrowRight size={18} />
        </Link>
        <a href="#how"
           className="btn-secondary btn-lg text-base px-8 text-ink-muted">
          See how it works
        </a>
      </div>

      {/* Supported regions pill strip */}
      <div className="relative mt-12 flex flex-wrap justify-center gap-2 text-xs text-ink-faint max-w-2xl">
        {['🇵🇰 Pakistan','🇳🇬 Nigeria','🇧🇩 Bangladesh','🇧🇷 Brazil','🇮🇩 Indonesia',
          '🇪🇬 Egypt','🇵🇭 Philippines','🇻🇳 Vietnam','+ 144 more'].map(r => (
          <span key={r} className="bg-bg-card border border-border rounded-full px-3 py-0.5">{r}</span>
        ))}
      </div>

      {/* Hero mock terminal */}
      <div className="relative mt-14 w-full max-w-2xl rounded-xl border border-border
                       bg-bg-card shadow-2xl overflow-hidden text-left">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3 bg-bg-surface">
          <span className="h-3 w-3 rounded-full bg-danger/60" />
          <span className="h-3 w-3 rounded-full bg-warning/60" />
          <span className="h-3 w-3 rounded-full bg-success/60" />
          <span className="ml-3 text-xs font-mono text-ink-muted">Terminal</span>
        </div>
        <pre className="p-5 text-sm font-mono text-ink-muted overflow-x-auto leading-relaxed">
          <code>
{`$ curl https://api.markuce.com/v1/checkout \\
    -H "Authorization: Bearer sk_live_..." \\
    -d product_id="prod_xyz" \\
    -d amount=2999 \\
    -d currency="usd"

{
  "session_id": "sess_01HZ...",
  "checkout_url": "https://pay.markuce.com/c/sess_01HZ...",
  "expires_in": 1800
}`}
          </code>
        </pre>
      </div>
    </section>
  )
}

// ── Social Proof ──────────────────────────────────────────────────────────────

function SocialProof() {
  const stats = [
    { label: 'Countries supported',   value: '150+' },
    { label: 'Transaction fee',        value: '3.4%'  },
    { label: 'Time to first sale',     value: '<10 min' },
    { label: 'Payout destinations',    value: '160+'  },
  ]

  return (
    <section className="section border-y border-border/50 bg-bg-surface/30">
      <div className="container-wide">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map(s => (
            <div key={s.label} className="text-center">
              <div className="text-4xl font-extrabold text-ink">{s.value}</div>
              <div className="mt-1 text-sm text-ink-muted">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Features ──────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Globe,
    title: 'Merchant of Record',
    desc:  'Markuce is the legal seller. Merchants in Pakistan, Nigeria, or anywhere without Stripe access use our US LLC entity. No setup required.',
    accent: 'primary',
  },
  {
    icon: CreditCard,
    title: 'Card payments via Stripe',
    desc:  'Accept all major cards globally without your own Stripe account. Our platform Stripe account handles compliance, chargebacks, and refunds.',
    accent: 'primary',
  },
  {
    icon: Coins,
    title: 'Chainlink-priced crypto',
    desc:  'Pay in USDC, ETH, SOL, or MATIC. Prices come from Chainlink Data Feeds on-chain — tamper-proof, decentralized oracle data at checkout.',
    accent: 'accent',
  },
  {
    icon: Zap,
    title: 'Under 10 minutes to live',
    desc:  'Sign up, add your wallet address, create a product, paste a payment link. No bureaucratic nightmare — no weeks-long approval queue.',
    accent: 'accent',
  },
  {
    icon: ShieldCheck,
    title: 'Non-custodial payouts',
    desc:  'Crypto funds flow directly to your wallet. Bank payouts via Wise to 160+ countries. Markuce never holds your money.',
    accent: 'primary',
  },
  {
    icon: Code2,
    title: 'Developer-first API',
    desc:  'REST API + typed SDKs. HMAC-signed webhooks. React checkout embed. Idempotency keys. Everything you need for production integrations.',
    accent: 'accent',
  },
]

function Features() {
  return (
    <section id="features" className="section">
      <div className="container-wide">
        <div className="text-center mb-16">
          <div className="badge badge-primary mb-4">Platform</div>
          <h2 className="text-4xl font-bold text-ink">
            Everything Stripe can't offer you
          </h2>
          <p className="mt-4 text-ink-muted max-w-xl mx-auto">
            Built from the ground up for the 3 billion people excluded from global commerce.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(f => (
            <div key={f.title} className="glow-card group">
              <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl
                              ${f.accent === 'accent'
                                ? 'bg-accent/10 text-accent'
                                : 'bg-primary/10 text-primary'}`}>
                <f.icon size={22} />
              </div>
              <h3 className="mb-2 font-semibold text-ink">{f.title}</h3>
              <p className="text-sm text-ink-muted leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── How It Works ──────────────────────────────────────────────────────────────

const HOW_STEPS = [
  {
    step: '01',
    title: 'Sign up in minutes',
    desc:  'Create your account with email. Add your business name and payout wallet address. Light KYC via Sumsub — typically approved in under 2 hours.',
  },
  {
    step: '02',
    title: 'Create your products',
    desc:  'Add a product with a name, price, and description. One-time, subscription, or usage-based. Markuce generates a hosted checkout page instantly.',
  },
  {
    step: '03',
    title: 'Share your payment link',
    desc:  'Share pay.markuce.com/c/your-link or embed our checkout in your site. Customers pay by card or crypto — whatever they prefer.',
  },
  {
    step: '04',
    title: 'Get paid automatically',
    desc:  'Crypto arrives in your wallet in minutes. Card revenue settles to your Wise bank account weekly. Real-time dashboard shows everything.',
  },
]

function HowItWorks() {
  return (
    <section id="how" className="section bg-bg-surface/30 border-y border-border/50">
      <div className="container-tight">
        <div className="text-center mb-14">
          <div className="badge badge-muted mb-4">Process</div>
          <h2 className="text-4xl font-bold text-ink">From signup to first sale</h2>
        </div>

        <div className="relative">
          {/* Connector line */}
          <div className="absolute left-7 top-10 bottom-10 w-px bg-border hidden md:block" />

          <div className="flex flex-col gap-10">
            {HOW_STEPS.map((s, i) => (
              <div key={s.step} className="flex gap-6 items-start">
                <div className="relative z-10 flex-shrink-0 h-14 w-14 rounded-full
                                 border-2 border-primary bg-bg-base
                                 flex items-center justify-center
                                 text-primary font-mono text-sm font-bold">
                  {s.step}
                </div>
                <div className="pt-2">
                  <h3 className="font-semibold text-ink mb-1">{s.title}</h3>
                  <p className="text-sm text-ink-muted leading-relaxed max-w-lg">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Pricing ───────────────────────────────────────────────────────────────────

function Pricing() {
  const features = [
    'All payment methods (card + crypto)',
    '150+ merchant countries',
    'Chainlink oracle-priced crypto',
    'Real-time dashboard',
    'HMAC webhook events',
    'API + React embed',
    'Non-custodial crypto payouts',
    'Bank payouts via Wise (160 countries)',
    'Sumsub KYC included',
    'Unlimited products',
  ]

  return (
    <section id="pricing" className="section">
      <div className="container-tight text-center">
        <div className="badge badge-primary mb-4">Pricing</div>
        <h2 className="text-4xl font-bold text-ink mb-4">Simple, transparent pricing</h2>
        <p className="text-ink-muted mb-12">
          One flat rate. No monthly fee. No surprise charges.
        </p>

        <div className="max-w-lg mx-auto rounded-2xl border border-border
                         bg-bg-card p-8 shadow-card relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-accent to-accent-dark" />
          <div className="text-6xl font-extrabold text-ink mb-1">
            3.4<span className="text-4xl">%</span>
          </div>
          <div className="text-ink-muted text-sm mb-1">per transaction + $0.30</div>
          <div className="text-xs text-ink-faint mb-8">
            Covers Stripe processing + Markuce platform fee
          </div>

          <ul className="text-left space-y-3 mb-8">
            {features.map(f => (
              <li key={f} className="flex items-start gap-3 text-sm text-ink-muted">
                <Check size={15} className="text-accent mt-0.5 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          <Link to="/register" className="btn-primary btn-lg w-full justify-center">
            Start for free — no credit card
          </Link>

          <p className="mt-4 text-xs text-ink-faint text-center">
            Crypto payouts: no fee. Bank payouts: Wise transfer cost only.
          </p>
        </div>
      </div>
    </section>
  )
}

// ── FAQ ────────────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: 'Do I need a US LLC to use Markuce?',
    a: 'No. Markuce itself is the US LLC. You sign up as a merchant and sell through our entity. You just need a wallet address or bank account to receive payouts.',
  },
  {
    q: 'Why use Chainlink for crypto prices instead of CoinGecko?',
    a: 'Chainlink Data Feeds are decentralized oracle networks — prices are aggregated from dozens of data providers on-chain. No single point of failure or manipulation. Every price quote at checkout is backed by tamper-proof on-chain data.',
  },
  {
    q: 'How quickly do I get paid?',
    a: 'Crypto payments arrive in your wallet within minutes of transaction confirmation. Card payments via Stripe are batched and paid out weekly via Wise to 160+ countries.',
  },
  {
    q: 'What\'s the KYC process like?',
    a: 'Light KYC via Sumsub — typically just a government ID photo. Approval usually takes under 2 hours. This is required because Markuce acts as the legal seller and must comply with AML laws.',
  },
  {
    q: 'Can I embed the checkout on my own site?',
    a: 'Yes. Markuce provides a hosted checkout URL and a React component you can embed. We also offer a REST API for fully custom integrations.',
  },
  {
    q: 'What if my customer\'s crypto payment is slightly off due to price movement?',
    a: 'Markuce uses a ±2% tolerance window. If the customer sends slightly more or less than the quoted Chainlink price, we still confirm the payment. The tolerance window accounts for normal price movement between quote and settlement.',
  },
]

function FAQ() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section id="faq" className="section bg-bg-surface/30 border-y border-border/50">
      <div className="container-tight">
        <div className="text-center mb-12">
          <div className="badge badge-muted mb-4">FAQ</div>
          <h2 className="text-4xl font-bold text-ink">Common questions</h2>
        </div>

        <div className="space-y-2">
          {FAQS.map((faq, i) => (
            <div key={i}
                 className="border border-border rounded-xl overflow-hidden transition-all duration-200">
              <button
                className="w-full flex items-center justify-between px-5 py-4
                            text-left text-sm font-medium text-ink hover:bg-bg-hover
                            transition-colors"
                onClick={() => setOpen(open === i ? null : i)}
              >
                {faq.q}
                <ChevronDown
                  size={16}
                  className={`text-ink-muted flex-shrink-0 ml-4 transition-transform
                               ${open === i ? 'rotate-180' : ''}`}
                />
              </button>
              {open === i && (
                <div className="px-5 pb-4 text-sm text-ink-muted leading-relaxed
                                 border-t border-border/50">
                  <div className="pt-3">{faq.a}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Bottom CTA ────────────────────────────────────────────────────────────────

function BottomCTA() {
  return (
    <section className="section">
      <div className="container-tight text-center">
        <div className="relative rounded-2xl border border-accent/20
                         bg-gradient-to-b from-accent/[0.06] to-transparent
                         p-12 overflow-hidden">
          {/* Glow blob */}
          <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2
                           w-96 h-96 rounded-full
                           bg-[radial-gradient(ellipse,rgba(14,122,95,0.14),transparent_70%)]" />

          <h2 className="relative text-4xl font-bold text-ink mb-4">
            Ready to sell everywhere?
          </h2>
          <p className="relative text-ink-muted mb-8 max-w-md mx-auto">
            Join merchants in 150+ countries already accepting global payments through Markuce.
          </p>
          <Link to="/register"
                className="btn-primary btn-lg px-10 text-base inline-flex">
            Create free account
            <ArrowRight size={18} />
          </Link>
          <p className="relative mt-4 text-xs text-ink-faint">
            No monthly fee · 3.4% + $0.30 per transaction · Cancel anytime
          </p>
        </div>
      </div>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-border/50 py-12 px-6">
      <div className="container-wide">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg
                                bg-primary text-white text-xs font-bold">M</span>
              <span className="text-sm font-semibold text-ink">Markuce</span>
            </div>
            <p className="text-xs text-ink-faint leading-relaxed">
              Global payments without borders.
              Accept cards and crypto from any customer on Earth.
            </p>
          </div>

          {[
            { title: 'Product', links: ['Features','Pricing','Changelog','Roadmap'] },
            { title: 'Developers', links: ['Documentation','API Reference','SDKs','Status'] },
            { title: 'Company', links: ['About','Blog','Privacy','Terms'] },
          ].map(col => (
            <div key={col.title}>
              <div className="text-xs font-semibold uppercase tracking-wider
                               text-ink-faint mb-4">{col.title}</div>
              <ul className="space-y-2">
                {col.links.map(l => (
                  <li key={l}>
                    <a href="#" className="text-xs text-ink-muted hover:text-ink transition-colors">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between
                         border-t border-border/50 pt-6 gap-4">
          <p className="text-xs text-ink-faint">
            © 2025 Markuce Inc. All rights reserved. Powered by Chainlink Data Feeds.
          </p>
          <div className="flex gap-4 text-xs text-ink-faint">
            <a href="#" className="hover:text-ink-muted transition-colors">Privacy</a>
            <a href="#" className="hover:text-ink-muted transition-colors">Terms</a>
            <a href="#" className="hover:text-ink-muted transition-colors">Security</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

// ── Page assembly ─────────────────────────────────────────────────────────────

export default function Landing() {
  return (
    <div className="min-h-screen bg-bg-base">
      <Nav />
      <main>
        <Hero />
        <SocialProof />
        <Features />
        <HowItWorks />
        <Pricing />
        <FAQ />
        <BottomCTA />
      </main>
      <Footer />
    </div>
  )
}
