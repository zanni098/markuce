/**
 * Dashboard overview — revenue chart, KPI cards, recent transactions.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import {
  TrendingUp, DollarSign, ShoppingBag, ArrowUpFromLine,
  ArrowRight, ExternalLink, Copy,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { getRevenueSummary, getTransactions } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'
import toast from 'react-hot-toast'

type Transaction = Database['public']['Tables']['transactions']['Row']

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(cents: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency, minimumFractionDigits: 2,
  }).format(cents / 100)
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, label, value, sub, accent,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  accent?: 'primary' | 'accent' | 'warning' | 'success'
}) {
  const colors: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    accent:  'bg-accent/10  text-accent',
    warning: 'bg-warning/10 text-warning',
    success: 'bg-success/10 text-success',
  }
  return (
    <div className="card">
      <div className="flex items-start justify-between mb-3">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center
                          ${colors[accent ?? 'primary']}`}>
          <Icon size={18} />
        </div>
        <TrendingUp size={14} className="text-ink-faint" />
      </div>
      <div className="text-2xl font-bold text-ink">{value}</div>
      <div className="text-sm text-ink-muted mt-0.5">{label}</div>
      {sub && <div className="text-xs text-ink-faint mt-1">{sub}</div>}
    </div>
  )
}

// ── Checkout URL quick-copy ───────────────────────────────────────────────────

function ApiKeyHint({ merchantId }: { merchantId: string }) {
  const [keys, setKeys] = useState<{ pk_live: string } | null>(null)

  useEffect(() => {
    supabase.from('merchant_secrets')
      .select('pk_live')
      .eq('merchant_id', merchantId)
      .single()
      .then(({ data }) => setKeys(data))
  }, [merchantId])

  if (!keys) return null

  function copy(text: string) {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  return (
    <div className="card mt-0 border-primary/20 bg-primary/5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-ink-muted">Publishable Key</span>
        <Link to="/dashboard/api-keys" className="text-xs text-primary hover:underline flex items-center gap-1">
          View all keys <ExternalLink size={11}/>
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 font-mono text-xs text-ink-muted bg-bg-card border border-border
                          px-3 py-2 rounded-lg truncate">
          {keys.pk_live}
        </code>
        <button
          onClick={() => copy(keys.pk_live)}
          className="btn-ghost btn-sm flex-shrink-0"
        >
          <Copy size={13} />
        </button>
      </div>
    </div>
  )
}

// ── Overview page ─────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user, profile } = useAuth()

  const [summary, setSummary] = useState({ total_gross: 0, total_net: 0, total_fees: 0, count: 0 })
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [chartData, setChartData]   = useState<Array<{ date: string; revenue: number }>>([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    if (!user) return
    Promise.all([
      getRevenueSummary(user.id, 30),
      getTransactions(user.id, 10),
    ]).then(([sum, txns]) => {
      setSummary(sum)
      setTransactions(txns ?? [])

      // Build 7-day chart from transaction timestamps
      const byDay: Record<string, number> = {}
      const now = Date.now()
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now - i * 86_400_000)
        byDay[d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })] = 0
      }
      ;(txns ?? []).forEach(t => {
        const key = new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        if (key in byDay) byDay[key] = (byDay[key] ?? 0) + t.gross_minor
      })
      setChartData(Object.entries(byDay).map(([date, revenue]) => ({ date, revenue: revenue / 100 })))
    }).finally(() => setLoading(false))
  }, [user])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-ink">
            Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'},{' '}
            {profile?.business_name ?? 'merchant'}
          </h1>
          <p className="text-sm text-ink-muted">Last 30 days</p>
        </div>
        <Link to="/dashboard/products" className="btn-primary btn-sm">
          + New product
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard icon={DollarSign}       label="Gross revenue"   value={fmt(summary.total_gross)} accent="primary" />
        <KpiCard icon={TrendingUp}       label="Net earnings"    value={fmt(summary.total_net)}   accent="accent" />
        <KpiCard icon={ShoppingBag}      label="Transactions"    value={String(summary.count)}    accent="success" />
        <KpiCard icon={ArrowUpFromLine}  label="Platform fees"   value={fmt(summary.total_fees)}  accent="warning" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-ink">Revenue (7 days)</span>
            <span className="badge badge-muted text-xs">USD</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#5865F2" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#5865F2" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1C2B4A" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#6B7FA3', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6B7FA3', fontSize: 11 }} axisLine={false} tickLine={false}
                     tickFormatter={v => `$${v}`} />
              <Tooltip
                contentStyle={{ background: '#131D35', border: '1px solid #1C2B4A', borderRadius: 8, fontSize: 13 }}
                labelStyle={{ color: '#E8EDF5' }}
                itemStyle={{ color: '#6B7FA3' }}
                formatter={(v: number) => [`$${v.toFixed(2)}`, 'Revenue']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#5865F2" strokeWidth={2}
                    fill="url(#rev)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Quick links */}
        <div className="flex flex-col gap-4">
          <ApiKeyHint merchantId={user!.id} />

          <div className="card">
            <div className="text-sm font-medium text-ink mb-3">Quick actions</div>
            <div className="flex flex-col gap-1">
              {[
                { label: 'Create product',     to: '/dashboard/products' },
                { label: 'View transactions',  to: '/dashboard/transactions' },
                { label: 'Request payout',     to: '/dashboard/payouts' },
                { label: 'Configure webhooks', to: '/dashboard/webhooks' },
              ].map(a => (
                <Link key={a.to} to={a.to}
                  className="flex items-center justify-between px-3 py-2 rounded-lg
                              text-sm text-ink-muted hover:text-ink hover:bg-bg-hover transition-colors">
                  {a.label}
                  <ArrowRight size={13} className="text-ink-faint" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="card mt-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-ink">Recent transactions</span>
          <Link to="/dashboard/transactions"
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
            View all <ArrowRight size={12}/>
          </Link>
        </div>

        {transactions.length === 0 ? (
          <div className="py-10 text-center text-ink-muted text-sm">
            No transactions yet.{' '}
            <Link to="/dashboard/products" className="text-primary">Create a product</Link>
            {' '}to get started.
          </div>
        ) : (
          <div className="table-wrap">
            <table className="mkt-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Method</th>
                  <th>Customer</th>
                  <th className="text-right">Gross</th>
                  <th className="text-right">Net</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(t => (
                  <tr key={t.id}>
                    <td className="font-mono text-xs">{t.id.slice(0, 8)}…</td>
                    <td>
                      <span className={`badge ${t.payment_method === 'card' ? 'badge-primary' : 'badge-muted'}`}>
                        {t.payment_method}
                      </span>
                    </td>
                    <td>{t.customer_email ?? '—'}</td>
                    <td className="text-right text-ink">{fmt(t.gross_minor, t.currency)}</td>
                    <td className="text-right text-success">{fmt(t.net_minor, t.currency)}</td>
                    <td className="text-xs">{fmtDate(t.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
