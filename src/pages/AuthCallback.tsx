/**
 * AuthCallback — handles Supabase magic link / email confirmation redirect.
 * Supabase appends ?access_token=...&type=... to the URL after email verify.
 * The Supabase client picks these up automatically via detectSessionInUrl: true.
 * We just wait for the session to settle, then route accordingly.
 */
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'

export default function AuthCallback() {
  const { session, loading, onboardingDone } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return
    if (!session) {
      navigate('/login', { replace: true })
      return
    }
    navigate(onboardingDone ? '/dashboard' : '/onboarding', { replace: true })
  }, [session, loading, onboardingDone, navigate])

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-ink-muted text-sm">
        <div className="h-8 w-8 animate-spin rounded-full border-2
                          border-primary border-t-transparent" />
        Confirming your account…
      </div>
    </div>
  )
}
