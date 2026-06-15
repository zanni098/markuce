import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Check, ArrowRight } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import toast from 'react-hot-toast'

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ characters',      pass: password.length >= 8 },
    { label: 'Uppercase letter',   pass: /[A-Z]/.test(password) },
    { label: 'Number or symbol',   pass: /[0-9\W]/.test(password) },
  ]
  const score = checks.filter(c => c.pass).length

  return (
    <div className="mt-2">
      <div className="flex gap-1.5 mb-2">
        {[0,1,2].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300
            ${score > i
              ? score === 1 ? 'bg-danger' : score === 2 ? 'bg-warning' : 'bg-success'
              : 'bg-border'}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {checks.map(c => (
          <span key={c.label}
                className={`inline-flex items-center gap-1 text-xs transition-colors
                             ${c.pass ? 'text-success' : 'text-ink-faint'}`}>
            <Check size={10} />
            {c.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const [businessName, setBusinessName] = useState('')
  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [show,         setShow]         = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [done,         setDone]         = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      await signUp(email, password, businessName)
      setDone(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  // ── Email sent screen ──────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center
                           rounded-full bg-success/10 text-success text-2xl">
            ✉️
          </div>
          <h2 className="text-2xl font-bold text-ink mb-2">Account created</h2>
          <p className="text-ink-muted mb-6">
            Your account for <strong className="text-ink">{email}</strong> is ready.
            Sign in to set up your business and start accepting payments.
          </p>
          <Link to="/login" className="btn-primary btn-lg justify-center">
            Continue to sign in <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center px-4">
      {/* Background grid */}
      <div className="pointer-events-none fixed inset-0"
           style={{
             backgroundImage: `
               linear-gradient(rgba(21,20,15,0.035) 1px, transparent 1px),
               linear-gradient(90deg, rgba(21,20,15,0.035) 1px, transparent 1px)
             `,
             backgroundSize: '60px 60px',
           }}
      />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 mb-8 justify-center">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl
                            bg-primary text-white font-bold text-base">M</span>
          <span className="text-xl font-semibold text-ink">Markuce</span>
        </Link>

        <div className="card border-border/80">
          <h1 className="text-xl font-bold text-ink mb-1">Create your account</h1>
          <p className="text-sm text-ink-muted mb-6">
            Start accepting global payments in under 10 minutes
          </p>

          {/* Benefit pills */}
          <div className="flex flex-wrap gap-2 mb-5">
            {['No monthly fee','150+ countries','Cards + Crypto'].map(b => (
              <span key={b} className="badge badge-muted text-xs gap-1">
                <Check size={10} className="text-accent" />{b}
              </span>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="form-group">
              <label className="label">Business name</label>
              <input
                type="text"
                className="input"
                placeholder="Acme Digital"
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint
                              hover:text-ink-muted transition-colors"
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {password && <PasswordStrength password={password} />}
            </div>

            <button
              type="submit"
              className="btn-primary btn-lg justify-center mt-1"
              disabled={loading}
            >
              {loading ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2
                                  border-white border-t-transparent" />
              ) : (
                <>Create account <ArrowRight size={16}/></>
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-ink-muted">
            Already have an account?{' '}
            <Link to="/login" className="text-accent hover:text-accent-dark font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-ink-faint">
          By creating an account you agree to our{' '}
          <a href="#" className="hover:text-ink-muted">Terms</a>
          {' '}and{' '}
          <a href="#" className="hover:text-ink-muted">Privacy Policy</a>.
        </p>
      </div>
    </div>
  )
}
