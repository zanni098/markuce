import { useEffect, useState } from 'react'
import { Copy, RefreshCw, Eye, EyeOff, Loader2, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { rotateApiKeys } from '@/lib/api'
import toast from 'react-hot-toast'

export default function APIKeys() {
  const { user } = useAuth()

  const [keys, setKeys] = useState<{
    pk_live: string
    sk_live: string
    sk_test: string
    webhook_secret: string
    rotated_at: string | null
  } | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [rotating,  setRotating]  = useState(false)
  const [showSk,    setShowSk]    = useState(false)
  const [confirmRotate, setConfirmRotate] = useState(false)

  async function loadKeys() {
    if (!user) return
    const { data } = await supabase
      .from('merchant_secrets')
      .select('*')
      .eq('merchant_id', user.id)
      .single()
    setKeys(data)
  }

  useEffect(() => { loadKeys().finally(() => setLoading(false)) }, [user])

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied`)
  }

  async function doRotate() {
    setRotating(true)
    setConfirmRotate(false)
    try {
      await rotateApiKeys()
      toast.success('Keys rotated successfully')
      await loadKeys()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Rotation failed')
    } finally {
      setRotating(false)
    }
  }

  function masked(key: string) {
    return key.slice(0, 8) + '•'.repeat(32) + key.slice(-4)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={24} className="animate-spin text-ink-faint" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-ink">API Keys</h1>
          <p className="text-sm text-ink-muted">Use these keys to authenticate API requests</p>
        </div>
        <button
          onClick={() => setConfirmRotate(true)}
          className="btn-secondary btn-sm text-warning border-warning/30 hover:bg-warning/5"
          disabled={rotating}
        >
          {rotating
            ? <Loader2 size={14} className="animate-spin" />
            : <><RefreshCw size={14}/> Rotate keys</>
          }
        </button>
      </div>

      {/* Rotate confirm */}
      {confirmRotate && (
        <div className="card border-warning/30 bg-warning/5 mb-5">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-warning mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium text-ink mb-1">Rotate all keys?</div>
              <p className="text-xs text-ink-muted mb-3">
                Your existing secret key will stop working immediately.
                Update all integrations before rotating.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmRotate(false)} className="btn-secondary btn-sm">Cancel</button>
                <button onClick={doRotate} className="btn-danger btn-sm">Yes, rotate keys</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {keys ? (
        <div className="flex flex-col gap-4">
          {[
            { label: 'Publishable key (safe to expose)',  val: keys.pk_live,        id: 'pk', reveal: false },
            { label: 'Secret key (keep private!)',        val: keys.sk_live,        id: 'sk', reveal: true  },
            { label: 'Webhook signing secret',            val: keys.webhook_secret, id: 'ws', reveal: true  },
          ].map(k => (
            <div key={k.id} className="card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-ink-muted">{k.label}</span>
                {k.reveal && (
                  <button
                    onClick={() => setShowSk(!showSk)}
                    className="text-xs text-ink-faint hover:text-ink-muted flex items-center gap-1"
                  >
                    {showSk ? <EyeOff size={12}/> : <Eye size={12}/>}
                    {showSk ? 'Hide' : 'Reveal'}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-xs text-ink bg-bg-surface border border-border
                                  px-3 py-2.5 rounded-lg truncate">
                  {(k.reveal && !showSk) ? masked(k.val) : k.val}
                </code>
                <button
                  onClick={() => copy(k.val, k.id.toUpperCase())}
                  className="btn-ghost btn-sm flex-shrink-0"
                >
                  <Copy size={13}/>
                </button>
              </div>
            </div>
          ))}

          {keys.rotated_at && (
            <p className="text-xs text-ink-faint text-center">
              Last rotated: {new Date(keys.rotated_at).toLocaleString()}
            </p>
          )}
        </div>
      ) : (
        <div className="card text-center py-12 text-ink-muted text-sm">
          No API keys found. Complete onboarding to generate your keys.
        </div>
      )}

      {/* Code example */}
      <div className="card mt-6 border-border/50">
        <div className="text-xs font-medium text-ink-muted mb-3">Quick start</div>
        <pre className="text-xs font-mono text-ink-muted overflow-x-auto leading-relaxed">
          <code>{`curl https://api.markuce.com/v1/checkout \\
  -H "Authorization: Bearer YOUR_SECRET_KEY" \\
  -d product_id="prod_..." \\
  -d customer_email="buyer@example.com"`}
          </code>
        </pre>
      </div>
    </div>
  )
}
