/**
 * Dashboard shell — left sidebar + main content area.
 * All dashboard routes render as <Outlet /> inside here.
 */
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, ArrowDownUp, Repeat2,
  ArrowUpFromLine, Webhook, Key, Settings, LogOut,
  ChevronLeft, ChevronRight, Menu, X,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import toast from 'react-hot-toast'

const NAV_ITEMS = [
  { to: '/dashboard',              icon: LayoutDashboard, label: 'Overview',      end: true },
  { to: '/dashboard/products',     icon: Package,         label: 'Products'       },
  { to: '/dashboard/transactions', icon: ArrowDownUp,     label: 'Transactions'   },
  { to: '/dashboard/subscriptions',icon: Repeat2,         label: 'Subscriptions'  },
  { to: '/dashboard/payouts',      icon: ArrowUpFromLine, label: 'Payouts'        },
  { to: '/dashboard/webhooks',     icon: Webhook,         label: 'Webhooks'       },
  { to: '/dashboard/api-keys',     icon: Key,             label: 'API Keys'       },
]

const BOTTOM_ITEMS = [
  { to: '/dashboard/settings', icon: Settings, label: 'Settings' },
]

function Sidebar({ collapsed, setCollapsed }: { collapsed: boolean; setCollapsed: (v: boolean) => void }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    try {
      await signOut()
      navigate('/', { replace: true })
    } catch {
      toast.error('Failed to sign out')
    }
  }

  return (
    <aside className={`flex flex-col border-r border-border bg-bg-surface
                        transition-all duration-200 h-screen sticky top-0
                        ${collapsed ? 'w-[60px]' : 'w-[220px]'}`}>
      {/* Logo */}
      <div className={`flex items-center h-16 px-4 border-b border-border flex-shrink-0
                        ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg
                          bg-primary text-white font-bold text-sm flex-shrink-0">M</span>
        {!collapsed && <span className="font-semibold text-ink text-sm">Markuce</span>}
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 px-2 py-3 flex-1 overflow-y-auto no-scrollbar">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm
               transition-all duration-150
               ${isActive
                 ? 'bg-primary/10 text-primary font-medium'
                 : 'text-ink-muted hover:text-ink hover:bg-bg-hover'}`
            }
          >
            <item.icon size={17} className="flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="flex flex-col gap-0.5 px-2 py-3 border-t border-border">
        {BOTTOM_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm
               transition-all duration-150
               ${isActive
                 ? 'bg-primary/10 text-primary font-medium'
                 : 'text-ink-muted hover:text-ink hover:bg-bg-hover'}`
            }
          >
            <item.icon size={17} className="flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}

        <button
          onClick={handleSignOut}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm
                      text-ink-muted hover:text-danger hover:bg-danger/5 transition-all"
        >
          <LogOut size={17} className="flex-shrink-0" />
          {!collapsed && 'Sign out'}
        </button>

        {!collapsed && profile && (
          <div className="mt-2 mx-0.5 rounded-lg bg-bg-card border border-border
                           px-3 py-2.5 flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center
                             justify-center text-primary text-xs font-bold flex-shrink-0">
              {(profile.business_name?.[0] ?? '?').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-ink truncate">{profile.business_name}</div>
              <div className="text-[10px] text-ink-faint truncate">{profile.email}</div>
            </div>
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="mt-1 flex items-center justify-center gap-1 px-2.5 py-1.5
                      rounded-lg text-ink-faint hover:text-ink-muted hover:bg-bg-hover
                      text-xs transition-all"
        >
          {collapsed ? <ChevronRight size={14}/> : <><ChevronLeft size={14}/> Collapse</>}
        </button>
      </div>
    </aside>
  )
}

function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/', { replace: true })
    onClose()
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={onClose} />
      )}
      <div className={`fixed inset-y-0 left-0 w-64 bg-bg-surface border-r border-border
                        z-50 flex flex-col transition-transform duration-200 lg:hidden
                        ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 h-14 px-4 border-b border-border">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg
                            bg-primary text-white font-bold text-sm">M</span>
          <span className="font-semibold text-ink text-sm">Markuce</span>
        </div>
        <nav className="flex flex-col gap-0.5 px-2 py-3 flex-1 overflow-y-auto">
          {[...NAV_ITEMS, ...BOTTOM_ITEMS].map(item => (
            <NavLink key={item.to} to={item.to} end={'end' in item ? item.end : undefined} onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm
                 ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-ink-muted hover:text-ink hover:bg-bg-hover'}`
              }>
              <item.icon size={17} />{item.label}
            </NavLink>
          ))}
          <button onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-ink-muted hover:text-danger hover:bg-danger/5">
            <LogOut size={17} />Sign out
          </button>
        </nav>
      </div>
    </>
  )
}

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-bg-base">
      <div className="hidden lg:flex">
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      </div>

      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="flex h-14 items-center px-4 border-b border-border
                             bg-bg-surface/80 backdrop-blur sticky top-0 z-20 lg:hidden">
          <button className="mr-3 text-ink-muted" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={20}/> : <Menu size={20}/>}
          </button>
          <span className="flex h-7 w-7 items-center justify-center rounded-lg
                            bg-primary text-white font-bold text-sm">M</span>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
