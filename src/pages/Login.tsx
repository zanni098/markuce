import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import toast from 'react-hot-toast'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [show,     setShow]     = useState(false)
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign in failed'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center px-4">
      {/* Background grid */}
      <div className="pointer-events-none fixed inset-0"
           style={{
             backgroundImage: `
               linear-gradient(rgba(88,101,242,0.03) 1px, transparent 1px),
               linear-gradient(90deg, rgba(88,101,242,0.03) 1px, transparent 1px)
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
          <h1 className="text-xl font-bold text-ink mb-1">Welcome back</h1>
          <p className="text-sm text-ink-muted mb-6">Sign in to your merchant account</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="form-group">
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <div className="flex justify-between items-center mb-1.5">
                <label className="label mb-0">Password</label>
                <a href="#" className="text-xs text-primary hover:text-primary/80 transition-colors">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
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
                <>Sign in <ArrowRight size={16}/></>
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-ink-muted">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary hover:text-primary/80 transition-colors">
              Create one free
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-ink-faint">
          By signing in you agree to our{' '}
          <a href="#" className="hover:text-ink-muted">Terms</a>
          {' '}and{' '}
          <a href="#" className="hover:text-ink-muted">Privacy Policy</a>.
        </p>
      </div>
    </div>
  )
}
