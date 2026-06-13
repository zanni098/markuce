/**
 * Markuce Auth Context
 * --------------------
 * Wraps Supabase Auth with a typed React context.
 * Provides session, profile, and KYC status to all children.
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Database, KycStatus } from './database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

// ── Context types ────────────────────────────────────────────────────────────

export interface AuthContextValue {
  /** Supabase session (null while loading or signed-out) */
  session:        Session | null
  /** Supabase user object */
  user:           User | null
  /** Merchant profile from public.profiles */
  profile:        Profile | null
  /** True while the initial session check is in progress */
  loading:        boolean
  kycStatus:      KycStatus
  onboardingDone: boolean

  // ── Actions ──
  signUp:   (email: string, password: string, businessName: string) => Promise<void>
  signIn:   (email: string, password: string) => Promise<void>
  signOut:  () => Promise<void>
  refreshProfile: () => Promise<void>
}

// ── Create context ────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

// ── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session,  setSession]  = useState<Session | null>(null)
  const [profile,  setProfile]  = useState<Profile | null>(null)
  const [loading,  setLoading]  = useState(true)

  // Prevent double-fetch on Strict Mode double-invoke
  const fetchingRef = useRef(false)

  // ── Fetch merchant profile ────────────────────────────────────────────────

  const fetchProfile = useCallback(async (userId: string) => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows (new user, profile not yet created)
        console.error('[Auth] fetchProfile error', error)
      }
      setProfile(data ?? null)
    } finally {
      fetchingRef.current = false
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!session?.user.id) return
    await fetchProfile(session.user.id)
  }, [session, fetchProfile])

  // ── Bootstrap session ─────────────────────────────────────────────────────

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return
      setSession(session)
      if (session) await fetchProfile(session.user.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return
        setSession(session)
        if (session) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  // ── Auth actions ──────────────────────────────────────────────────────────

  const signUp = useCallback(
    async (email: string, password: string, businessName: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { business_name: businessName },
          // After email confirmation, redirect to onboarding
          emailRedirectTo: `${import.meta.env.VITE_APP_URL}/auth/callback`,
        },
      })
      if (error) throw error

      // Upsert profile row immediately so the merchant can start onboarding
      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').upsert({
          id:            data.user.id,
          email,
          business_name: businessName,
          kyc_status:    'none',
          onboarding_complete: false,
          default_payout_method: 'usdc_solana',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          currency: 'USD',
        })
        if (profileError) console.error('[Auth] profile upsert error', profileError)
      }
    },
    []
  )

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setProfile(null)
  }, [])

  // ── Derived state ─────────────────────────────────────────────────────────

  const value: AuthContextValue = {
    session,
    user:           session?.user ?? null,
    profile,
    loading,
    kycStatus:      profile?.kyc_status ?? 'none',
    onboardingDone: profile?.onboarding_complete ?? false,
    signUp,
    signIn,
    signOut,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ── Consumer hook ─────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be called inside <AuthProvider>')
  return ctx
}

/**
 * Returns `true` while session is loading or when the user has no active session.
 * Use for route guards.
 */
export function useRequireAuth(): { ready: boolean; authenticated: boolean } {
  const { loading, session } = useAuth()
  return { ready: !loading, authenticated: !!session }
}
