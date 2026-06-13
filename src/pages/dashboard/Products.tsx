/**
 * Products — list, create, toggle active.
 */
import { useEffect, useState, type FormEvent } from 'react'
import { Plus, Copy, ExternalLink, MoreHorizontal, Loader2, X } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { getProducts, createProduct, updateProduct } from '@/lib/api'
import type { Database } from '@/lib/database.types'
import toast from 'react-hot-toast'

type Product = Database['public']['Tables']['products']['Row']

function fmt(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

// ── Create modal ──────────────────────────────────────────────────────────────

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name,     setName]     = useState('')
  const [price,    setPrice]    = useState('')
  const [desc,     setDesc]     = useState('')
  const [type,     setType]     = useState<'one_time' | 'subscription'>('one_time')
  const [interval, setInterval] = useState<'month' | 'year'>('month')
  const [loading,  setLoading]  = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const priceMinor = Math.round(parseFloat(price) * 100)
    if (isNaN(priceMinor) || priceMinor < 50) {
      toast.error('Minimum price is $0.50')
      return
    }
    setLoading(true)
    try {
      await createProduct({
        name,
        description: desc || undefined,
        price_minor: priceMinor,
        type,
        billing_interval:       type === 'subscription' ? interval : undefined,
        billing_interval_count: type === 'subscription' ? 1 : undefined,
      })
      toast.success('Product created')
      onCreated()
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md card z-10 border-border/80 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-ink">New product</h2>
          <button onClick={onClose} className="btn-ghost btn-sm p-1.5"><X size={16}/></button>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="form-group">
            <label className="label">Name</label>
            <input type="text" className="input" placeholder="Pro Plan" value={name}
                   onChange={e => setName(e.target.value)} required autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="label">Price (USD)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint text-sm">$</span>
                <input type="number" className="input pl-7" placeholder="29.00"
                       min="0.50" step="0.01" value={price}
                       onChange={e => setPrice(e.target.value)} required />
              </div>
            </div>
            <div className="form-group">
              <label className="label">Type</label>
              <select className="input" value={type} onChange={e => setType(e.target.value as typeof type)}>
                <option value="one_time">One-time</option>
                <option value="subscription">Subscription</option>
              </select>
            </div>
          </div>

          {type === 'subscription' && (
            <div className="form-group">
              <label className="label">Billing interval</label>
              <select className="input" value={interval} onChange={e => setInterval(e.target.value as typeof interval)}>
                <option value="month">Monthly</option>
                <option value="year">Yearly</option>
              </select>
            </div>
          )}

          <div className="form-group">
            <label className="label">Description <span className="text-ink-faint">(optional)</span></label>
            <textarea className="input resize-none" rows={2} value={desc} onChange={e => setDesc(e.target.value)} />
          </div>

          <div className="flex gap-2 mt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Create product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Products page ─────────────────────────────────────────────────────────────

export default function Products() {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)

  async function load() {
    if (!user) return
    const data = await getProducts(user.id)
    setProducts(data ?? [])
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [user])

  async function toggleActive(product: Product) {
    try {
      await updateProduct({ id: product.id, active: !product.active })
      setProducts(ps => ps.map(p => p.id === product.id ? { ...p, active: !p.active } : p))
    } catch {
      toast.error('Failed to update')
    }
  }

  function copyLink(id: string) {
    const url = `${import.meta.env.VITE_APP_URL ?? ''}/checkout/${id}`
    navigator.clipboard.writeText(url)
    toast.success('Payment link copied')
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {modal && <CreateModal onClose={() => setModal(false)} onCreated={load} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-ink">Products</h1>
          <p className="text-sm text-ink-muted">Manage your products and payment links</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary btn-sm">
          <Plus size={15}/> New product
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={24} className="animate-spin text-ink-faint" />
        </div>
      ) : products.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-4xl mb-3">📦</div>
          <h3 className="font-semibold text-ink mb-1">No products yet</h3>
          <p className="text-sm text-ink-muted mb-4">Create your first product to get a payment link</p>
          <button onClick={() => setModal(true)} className="btn-primary btn-sm mx-auto">
            <Plus size={15}/> Create product
          </button>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="mkt-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Type</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td>
                    <div className="text-ink font-medium">{p.name}</div>
                    {p.description && (
                      <div className="text-xs text-ink-faint mt-0.5 truncate max-w-xs">{p.description}</div>
                    )}
                  </td>
                  <td className="text-ink font-medium">{fmt(p.price_minor)}</td>
                  <td>
                    <span className={`badge ${p.type === 'subscription' ? 'badge-primary' : 'badge-muted'}`}>
                      {p.type === 'subscription' ? `${p.billing_interval}ly` : 'One-time'}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => toggleActive(p)}
                      className={`badge cursor-pointer transition-colors ${p.active ? 'badge-success' : 'badge-muted'}`}
                    >
                      {p.active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => copyLink(p.id)} className="btn-ghost btn-sm p-1.5" title="Copy payment link">
                        <Copy size={14}/>
                      </button>
                      <a
                        href={`${import.meta.env.VITE_APP_URL ?? ''}/checkout/${p.id}`}
                        target="_blank" rel="noreferrer"
                        className="btn-ghost btn-sm p-1.5" title="Open checkout"
                      >
                        <ExternalLink size={14}/>
                      </a>
                    </div>
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
