import { useEffect, useState } from 'react'
import { Loader2, ArrowUpFromLine, ExternalLink } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { getPayouts, triggerPayout } from '@/lib/api'
import type { Database } from '@/lib/database.types'
import toast from 'react-hot-toast'

type Payout = Database['public']['Tables']['payouts']['Row']

const fmt  = (c: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(c / 100)
const fmtD = (s: string) => new Intl.DateTimeFormat('en-US', { month:'short', day:'numeric', year:'numeric' }).format(new Date(s))

const STATUS_BADGE: Record<string, string> = {
  pending:    'badge-warning',
  processing: 'badge-primary',
  completed:  'badge-success',
  failed:     'badge-danger',
}

export default function Payouts() {
  const { user, profile } = useAuth()
  const [payouts,  setPayouts]  = useState<Payout[]>([])
  const [loading,  setLoading]  = useState(true)
  const [requesting, setRequesting] = useState(false)

  async function load() {
    if (!user) return
    const d = await getPayouts(user.id)
    setPayouts(d ?? [])
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [user])

  async function requestPayout() {
    setRequesting(true)
    try {
      const result = await triggerPayout()
      toast.success(`Payout of ${fmt(result.amount_usd * 100)} initiated`)
      await load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Payout failed')
    } finally {
      setRequesting(false)
    }
  }

  const walletConfigured = !!(profile?.sol_wallet || profile?.polygon_wallet || profile?.eth_wallet)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-ink">Payouts</h1>
          <p className="text-sm text-ink-muted">Your earnings sent to your wallet or bank</p>
        </div>
        {walletConfigured ? (
          <button onClick={requestPayout} className="btn-primary btn-sm" disabled={requesting}>
            {requesting
              ? <Loader2 size={14} className="animate-spin" />
              : <><ArrowUpFromLine size={14}/> Request payout</>
            }
          </button>
        ) : (
          <span className="text-xs text-ink-faint">Configure wallet in Settings to request payouts</span>
        )}
      </div>

      {/* Wallet status */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Solana (USDC)', addr: profile?.sol_wallet },
          { label: 'Polygon',       addr: profile?.polygon_wallet },
          { label: 'Ethereum',      addr: profile?.eth_wallet },
        ].map(w => (
          <div key={w.label} className="card py-4">
            <div className="text-xs text-ink-muted mb-1">{w.label}</div>
            {w.addr ? (
              <code className="text-xs font-mono text-ink break-all">{w.addr}</code>
            ) : (
              <span className="text-xs text-ink-faint">Not configured</span>
            )}
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={24} className="animate-spin text-ink-faint" />
        </div>
      ) : payouts.length === 0 ? (
        <div className="card text-center py-16 text-ink-muted">No payouts yet.</div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="mkt-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Method</th>
                <th className="text-right">Amount</th>
                <th>Txns</th>
                <th>Status</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {payouts.map(p => (
                <tr key={p.id}>
                  <td className="text-xs">
                    {fmtD(p.period_start)} → {fmtD(p.period_end)}
                  </td>
                  <td>
                    <span className="badge badge-muted">{p.method}</span>
                  </td>
                  <td className="text-right text-ink font-medium">{fmt(p.amount_minor)}</td>
                  <td className="text-ink-muted">{p.transaction_count}</td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[p.status] ?? 'badge-muted'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="text-xs text-ink-faint">{fmtD(p.created_at)}</td>
                  <td>
                    {p.tx_hash && (
                      <a href={`https://solscan.io/tx/${p.tx_hash}`} target="_blank" rel="noreferrer"
                         className="btn-ghost btn-sm p-1.5 text-ink-faint">
                        <ExternalLink size={13}/>
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
