import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'

// Pages — lazy-loaded for code-splitting
import { lazy, Suspense } from 'react'

const Landing      = lazy(() => import('@/pages/Landing'))
const Login        = lazy(() => import('@/pages/Login'))
const Register     = lazy(() => import('@/pages/Register'))
const Onboarding   = lazy(() => import('@/pages/Onboarding'))
const AuthCallback = lazy(() => import('@/pages/AuthCallback'))
const Checkout     = lazy(() => import('@/pages/Checkout'))

// Dashboard shell
const DashboardLayout  = lazy(() => import('@/pages/dashboard/DashboardLayout'))
const Dashboard        = lazy(() => import('@/pages/dashboard/Dashboard'))
const Products         = lazy(() => import('@/pages/dashboard/Products'))
const Transactions     = lazy(() => import('@/pages/dashboard/Transactions'))
const Subscriptions    = lazy(() => import('@/pages/dashboard/Subscriptions'))
const Payouts          = lazy(() => import('@/pages/dashboard/Payouts'))
const Webhooks         = lazy(() => import('@/pages/dashboard/Webhooks'))
const APIKeys          = lazy(() => import('@/pages/dashboard/APIKeys'))
const Settings         = lazy(() => import('@/pages/dashboard/Settings'))

// Spinner shown while code-splitting chunks load
function PageSpinner() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-bg-base">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}

// Route guard — redirects unauthenticated users to /login
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <PageSpinner />
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        {/* Public */}
        <Route path="/"              element={<Landing />} />
        <Route path="/login"         element={<Login />} />
        <Route path="/register"      element={<Register />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/checkout/:id"  element={<Checkout />} />

        {/* Onboarding (auth required but onboarding not yet done) */}
        <Route path="/onboarding" element={
          <PrivateRoute><Onboarding /></PrivateRoute>
        } />

        {/* Dashboard (auth + onboarding required) */}
        <Route path="/dashboard" element={
          <PrivateRoute><DashboardLayout /></PrivateRoute>
        }>
          <Route index              element={<Dashboard />} />
          <Route path="products"    element={<Products />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="subscriptions" element={<Subscriptions />} />
          <Route path="payouts"     element={<Payouts />} />
          <Route path="webhooks"    element={<Webhooks />} />
          <Route path="api-keys"    element={<APIKeys />} />
          <Route path="settings"    element={<Settings />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
