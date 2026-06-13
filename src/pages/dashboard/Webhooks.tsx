import { useEffect, useState, type FormEvent } from 'react'
import { Loader2, Check, X } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { updateWebhook, getWebhookDeliveries } from '@/lib/api'
import type { Database } from '@/lib/database.types'
import toast from 'react-hot-toast'

type WebhookDelivery = Database['public']['Tables']['webhook_deliveries']['Row']

const ALL_EVENTS = [
  'payment.completed',
  'payment.failed',
  'payment.refunded',
  'subscription.created',
  'subscription.renewed',
  'subscription.canceled',
  'payout.completed',
  'payout.failed',
]

const fmtD = (s: string) => new Intl.DateTimeFormat('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }).format(new Date(s))

export default function Webhooks() {
  const { user } = useAuth()

  const [url,      setUrl]      = useState('')
  const [events,   setEvents]   = useState<string[]>(ALL_EVENTS)
  const [saving,   setSaving]   = useState(false)
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!user) return
    Promise.all([
      supabase.from('webhooks').select('url,enabled_events').eq('merchant_id', user.id).single(),
      getWebhookDeliveries(user.id, 50),
    ]).then(([w, d]) => {
      if (w.data) {
        setUrl(w.data.url ?? '')
        setEvents(w.data.enabled_events ?? ALL_EVENTS)
      }
      setDeliveries(d ?? [])
    }).finally(() => setLoading(false))
  }, [user])

  function toggleEvent(evt: string) {
    setEvents(prev =>
      prev.includes(evt) ? prev.filter(e => e !== evt) : [...prev, evt]
    )
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await updateWebhook({ url: url || null, enabled_events: events })
      toast.success('Webhook settings saved')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={24} className="animate-spin text-ink-faint" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-ink">Webhooks</h1>
        <p className="text-sm text-ink-muted">
          Receive HMAC-signed HTTP POST events when payments happen.
          Verify with the <code className="code-tag">Markuce-Signature</code> header.
        </p>
      </div>

      <form onSubmit={save} className="card mb-6">
        <h2 className="text-sm font-semibold text-ink mb-4">Endpoint configuration</h2>

        <div className="form-group mb-5">
          <label className="label">Endpoint URL</label>
          <input
            type="url"
            className="input"
            placeholder="https://yoursite.com/webhooks/markuce"
            value={url}
            onChange={e => setUrl(e.target.value)}
          />
        </div>

        <div className="mb-5">
          <div className="label mb-2">Events to send</div>
          <div className="grid grid-cols-2 gap-2">
            {ALL_EVENTS.map(evt => (
              <label key={evt}
                     className="flex items-center gap-2.5 cursor-pointer text-sm text-ink-muted
                                 hover:text-ink transition-colors">
                <input
                  type="checkbox"
                  checked={events.includes(evt)}
                  onChange={() => toggleEvent(evt)}
                  className="accent-primary"
                />
                <code className="code-tag">{evt}</code>
              </label>
            ))}
          </div>
        </div>

        <button type="submit" className="btn-primary btn-sm" disabled={saving}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : 'Save webhook'}
        </button>
      </form>

      {/* Delivery log */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <span className="text-sm font-medium text-ink">Recent deliveries</span>
        </div>
        {deliveries.length === 0 ? (
          <div className="py-10 text-center text-sm text-ink-muted">No deliveries yet</div>
        ) : (
          <table className="mkt-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Status</th>
                <th>Response</th>
                <th>Attempts</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map(d => (
                <tr key={d.id}>
                  <td><code className="code-tag">{d.event_type}</code></td>
                  <td>
                    <span className={`badge ${d.status === 'delivered' ? 'badge-success' : d.status === 'failed' ? 'badge-danger' : 'badge-warning'}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="text-xs">{d.response_status ?? '—'}</td>
                  <td className="text-xs">{d.attempt_count}</td>
                  <td className="text-xs text-ink-faint">{fmtD(d.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
