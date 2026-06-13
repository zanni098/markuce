import { useEffect, useState } from 'react'
import { Search, Loader2, ExternalLink } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { getTransactions } from '@/lib/api'
import type { Database } from '@/lib/database.types'

type Transaction = Database['public']['Tables']['transactions']['Row']

const fmt  = (c: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(c / 100)
const fmtD = (s: string) => new Intl.DateTimeFormat('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }).format(new Date(s))

const METHOD_LABELS: Record<string, string> = {
  card:           'Card',
  usdc_solana:    'USDC (SOL)',
  usdt_polygon:   'USDT (POL)',
  eth_ethereum:   'ETH',
  matic_polygon:  'MATIC',
}

function explorerLink(hash: string, network: string | null) {
  if (!hash) return null
  const urls: Record<string, string> = {
    solana:   `https://solscan.io/tx/${hash}`,
    polygon:  `https://polygonscan.com/tx/${hash}`,
    ethereum: `https://etherscan.io/tx/${hash}`,
  }
  return urls[network ?? ''] ?? null
}

export default function Transactions() {
  const { user } = useAuth()
  const [txns,    setTxns]    = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [q,       setQ]       = useState('')

  useEffect(() => {
    if (!user) return
    getTransactions(user.id, 100)
      .then(d => setTxns(d ?? []))
      .finally(() => setLoading(false))
  }, [user])

  const filtered = q
    ? txns.filter(t =>
        t.id.includes(q) ||
        (t.customer_email ?? '').toLowerCase().includes(q.toLowerCase()) ||
        (t.tx_hash ?? '').includes(q)
      )
    : txns

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-ink">Transactions</h1>
          <p className="text-sm text-ink-muted">{txns.length} total</p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="text"
            className="input pl-8 w-56 text-sm"
            placeholder="Search by email, ID, hash…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={24} className="animate-spin text-ink-faint" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16 text-ink-muted">
          {q ? 'No transactions match your search.' : 'No transactions yet.'}
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="table-wrap">
            <table className="mkt-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Method</th>
                  <th className="text-right">Gross</th>
                  <th className="text-right">Net</th>
                  <th className="text-right">Fee</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => {
                  const link = t.tx_hash ? explorerLink(t.tx_hash, t.network) : null
                  return (
                    <tr key={t.id}>
                      <td className="font-mono text-xs">{t.id.slice(0, 8)}…</td>
                      <td className="text-ink">{t.customer_email ?? '—'}</td>
                      <td>
                        <span className={`badge ${t.payment_method === 'card' ? 'badge-primary' : 'badge-muted'}`}>
                          {METHOD_LABELS[t.payment_method] ?? t.payment_method}
                        </span>
                      </td>
                      <td className="text-right text-ink font-medium">{fmt(t.gross_minor)}</td>
                      <td className="text-right text-success">{fmt(t.net_minor)}</td>
                      <td className="text-right text-ink-muted text-xs">{fmt(t.fee_minor)}</td>
                      <td>
                        <span className={`badge ${t.refunded ? 'badge-warning' : 'badge-success'}`}>
                          {t.refunded ? 'Refunded' : 'Confirmed'}
                        </span>
                      </td>
                      <td className="text-xs text-ink-faint">{fmtD(t.created_at)}</td>
                      <td>
                        {link && (
                          <a href={link} target="_blank" rel="noreferrer"
                             className="btn-ghost btn-sm p-1.5 text-ink-faint">
                            <ExternalLink size={13}/>
                          </a>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
