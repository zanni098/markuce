import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { getSubscriptions } from '@/lib/api'
import type { Database } from '@/lib/database.types'

type Subscription = Database['public']['Tables']['subscriptions']['Row']

const fmtD = (s: string) => new Intl.DateTimeFormat('en-US', { month:'short', day:'numeric', year:'numeric' }).format(new Date(s))

const STATUS_BADGE: Record<string, string> = {
  active:     'badge-success',
  trialing:   'badge-primary',
  past_due:   'badge-warning',
  canceled:   'badge-muted',
  incomplete: 'badge-danger',
}

export default function Subscriptions() {
  const { user } = useAuth()
  const [subs, setSubs]     = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    getSubscriptions(user.id).then(d => setSubs(d ?? [])).finally(() => setLoading(false))
  }, [user])

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-ink">Subscriptions</h1>
        <p className="text-sm text-ink-muted">{subs.length} active subscriptions</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={24} className="animate-spin text-ink-faint" />
        </div>
      ) : subs.length === 0 ? (
        <div className="card text-center py-16 text-ink-muted">
          No subscriptions yet. Create a subscription product to start.
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="mkt-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Product</th>
                <th>Status</th>
                <th>Current period</th>
                <th>Trial ends</th>
                <th>Started</th>
              </tr>
            </thead>
            <tbody>
              {subs.map(s => (
                <tr key={s.id}>
                  <td className="text-ink">{s.customer_email}</td>
                  <td className="font-mono text-xs text-ink-faint">{s.product_id.slice(0, 8)}…</td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[s.status] ?? 'badge-muted'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="text-xs">
                    {fmtD(s.current_period_start)} → {fmtD(s.current_period_end)}
                  </td>
                  <td className="text-xs">{s.trial_end ? fmtD(s.trial_end) : '—'}</td>
                  <td className="text-xs text-ink-faint">{fmtD(s.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
