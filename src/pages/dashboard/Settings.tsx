import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function Settings() {
  const { user, profile, refreshProfile } = useAuth()

  const [businessName,    setBusinessName]    = useState(profile?.business_name ?? '')
  const [website,         setWebsite]         = useState(profile?.website ?? '')
  const [solWallet,       setSolWallet]       = useState(profile?.sol_wallet ?? '')
  const [polygonWallet,   setPolygonWallet]   = useState(profile?.polygon_wallet ?? '')
  const [ethWallet,       setEthWallet]       = useState(profile?.eth_wallet ?? '')
  const [defaultMethod,   setDefaultMethod]   = useState(profile?.default_payout_method ?? 'usdc_solana')
  const [loading,         setLoading]         = useState(false)

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    try {
      const { error } = await supabase.from('profiles').update({
        business_name:         businessName,
        website:               website || null,
        sol_wallet:            solWallet || null,
        polygon_wallet:        polygonWallet || null,
        eth_wallet:            ethWallet || null,
        default_payout_method: defaultMethod as 'usdc_solana' | 'usdt_polygon' | 'eth_ethereum' | 'bank_wire',
      }).eq('id', user.id)

      if (error) throw error
      await refreshProfile()
      toast.success('Settings saved')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-ink">Settings</h1>
        <p className="text-sm text-ink-muted">Manage your account and payout preferences</p>
      </div>

      <form onSubmit={save} className="flex flex-col gap-5">

        {/* Business */}
        <div className="card">
          <h2 className="text-sm font-semibold text-ink mb-4">Business details</h2>
          <div className="flex flex-col gap-4">
            <div className="form-group">
              <label className="label">Business name</label>
              <input type="text" className="input" value={businessName}
                     onChange={e => setBusinessName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="label">Website <span className="text-ink-faint">(optional)</span></label>
              <input type="url" className="input" placeholder="https://yoursite.com"
                     value={website} onChange={e => setWebsite(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Payout wallets */}
        <div className="card">
          <h2 className="text-sm font-semibold text-ink mb-4">Payout wallets</h2>
          <div className="flex flex-col gap-4">
            <div className="form-group">
              <label className="label">Solana address (USDC / SOL)</label>
              <input type="text" className="input font-mono text-xs"
                     placeholder="5YNmS1R9nNSCDzb5…" value={solWallet}
                     onChange={e => setSolWallet(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Polygon address (USDC / MATIC)</label>
              <input type="text" className="input font-mono text-xs"
                     placeholder="0x742d35Cc…" value={polygonWallet}
                     onChange={e => setPolygonWallet(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Ethereum address (ETH)</label>
              <input type="text" className="input font-mono text-xs"
                     placeholder="0x742d35Cc…" value={ethWallet}
                     onChange={e => setEthWallet(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Default payout method</label>
              <select className="input" value={defaultMethod}
                      onChange={e => setDefaultMethod(e.target.value)}>
                <option value="usdc_solana">USDC on Solana</option>
                <option value="usdt_polygon">USDT on Polygon</option>
                <option value="eth_ethereum">ETH on Ethereum</option>
                <option value="bank_wire">Bank wire (Wise)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Account */}
        <div className="card">
          <h2 className="text-sm font-semibold text-ink mb-4">Account</h2>
          <div className="form-group">
            <label className="label">Email</label>
            <input type="email" className="input" value={profile?.email ?? ''} disabled
                   title="Email cannot be changed here" />
            <p className="text-xs text-ink-faint mt-1">Contact support to change your email</p>
          </div>
        </div>

        <button type="submit" className="btn-primary btn-lg justify-center" disabled={loading}>
          {loading ? <Loader2 size={18} className="animate-spin" /> : 'Save settings'}
        </button>
      </form>
    </div>
  )
}
