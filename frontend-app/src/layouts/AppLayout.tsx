/*
 * Copyright (c) 2026 Intellifide, LLC.
 * Licensed under PolyForm Noncommercial License 1.0.0.
 * See "/legal/license" for full license terms.
 *
 * COMMUNITY RIGHTS:
 * - You CAN modify this code for personal use.
 * - You CAN build and share widgets/plugins for the ecosystem.
 *
 * RESTRICTIONS:
 * - You CANNOT resell, repackage, or distribute this application for a fee.
 * - You CANNOT use this application for commercial enterprise purposes.
 */

// App shell layout: sidebar, top bar, outlet. Last modified: 2026-02-25
import React, { useEffect, useMemo, useState } from 'react'
import { NavLink, Link, useNavigate, Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { ThemeToggle } from '../components/ThemeToggle'
import { NotificationDrawer } from '../components/notifications/NotificationDrawer'
import { QuickAIChat } from '../components/QuickAIChat'
import { AnimatedBrandText } from '../components/AnimatedBrandText'
import { GalaxyWaveBackground } from '../components/layout/GalaxyWaveBackground'
import {
  LayoutDashboard,
  LineChart,
  CreditCard,
  Wallet,
  Store,
  Bot,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  ChevronLeft,
  LifeBuoy,
  User,
} from 'lucide-react'

const sidebarLinks = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, description: 'Personal and household financial insights at a glance.' },
  { name: 'Financial Analysis', path: '/financial-analysis', icon: LineChart, description: 'Deep dive into budgets, trends, and category spend.' },
  { name: 'Transactions', path: '/transactions', icon: CreditCard, description: 'Filter, search, and bulk edit your transactions.' },
  { name: 'Connect Accounts', path: '/connect-accounts', icon: Wallet, description: 'Manage bank, wallet, exchange, and manual accounts. Connections are read-only.' },
  { name: 'Marketplace', path: '/marketplace', icon: Store, comingSoon: true, description: 'Explore integrations and upcoming partner tools.' },
  { name: 'AI Assistant', path: '/ai-assistant', icon: Bot, description: 'Ask questions about your finances and manage chats.' },
  { name: 'Settings', path: '/settings', icon: Settings, description: 'Manage profile, subscription, security, and preferences.' },
  { name: 'Support', path: '/support', icon: LifeBuoy, description: 'Track your tickets or get help from our team.' },
]

export const AppLayout: React.FC = () => {
  const { user, profile, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)

  const welcomeKey = user?.uid ? `jualuma_welcome_back_${user.uid}` : 'jualuma_welcome_back'
  const displayName = useMemo(() => {
    if (!profile) return user?.email ?? 'there'
    if (profile.display_name_pref === 'username' && profile.username) return profile.username
    const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim()
    return fullName || profile.username || profile.email || user?.email || 'there'
  }, [profile, user?.email])
  const userInitial = useMemo(() => {
    const source = displayName || user?.email || 'U'
    return source.charAt(0).toUpperCase()
  }, [displayName, user?.email])

  const pageMeta = useMemo(() => {
    const overrides = [
      {
        path: '/support/tickets',
        title: 'Ticket Details',
        description: 'Review the full ticket history and updates.',
      },
      {
        path: '/developers/dashboard',
        title: 'Developer Dashboard',
        description: 'Manage widgets, payouts, and submissions.',
      },
      {
        path: '/checkout/success',
        title: 'Checkout Status',
        description: 'We are verifying your payment status.',
      },
      {
        path: '/settings',
        title: 'Account Settings',
        description: 'Manage profile, subscription, security, and preferences.',
      },
      {
        path: '/support',
        title: 'Help & Support',
        description: 'Track your tickets or get help from our team.',
      },
      {
        path: '/household',
        title: 'Household Management',
        description: 'Manage members, roles, and shared access.',
      },
    ]
    const override = overrides.find((item) => location.pathname.startsWith(item.path))
    if (override) return override
    const match = sidebarLinks.find((link) => location.pathname.startsWith(link.path))
    return { title: match?.name ?? 'Dashboard', description: match?.description ?? '' }
  }, [location.pathname])

  useEffect(() => {
    if (!profile) return
    const pending = sessionStorage.getItem(welcomeKey)
    if (pending === 'true') {
      setShowWelcome(true)
      sessionStorage.removeItem(welcomeKey)
      const timer = window.setTimeout(() => setShowWelcome(false), 3500)
      return () => window.clearTimeout(timer)
    }
    return undefined
  }, [profile, welcomeKey])

  const isAiAssistant = location.pathname.startsWith('/ai-assistant')
  const isDashboardRoute = location.pathname.startsWith('/dashboard')
  const sidebarBrandIconSrc = '/assets/jualuma-logo-main.svg'

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const { theme } = useTheme()
  const isDarkTheme = theme === 'dark'

  const sidebarContent = (
    <>
      <div className="sidebar-header flex items-center px-6 relative">
        <Link
          to="/"
          className={`flex items-center ${sidebarOpen ? 'justify-start' : 'justify-center w-full'} gap-3 group`}
        >
          {sidebarOpen ? (
            <AnimatedBrandText className="transition-all duration-200 text-[2.9rem]" text="JuaLuma" />
          ) : (
            <img
              src={sidebarBrandIconSrc}
              alt="JuaLuma logo"
              className="sidebar-brand-logo"
              width={57}
              height={57}
            />
          )}
        </Link>

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="sidebar-collapse-btn"
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <ChevronLeft className={`w-3.5 h-3.5 transition-transform ${!sidebarOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
        {sidebarLinks.map((link) => {
          if (link.comingSoon) {
            return (
              <div
                key={link.path}
                aria-disabled="true"
                title="Marketplace coming soon"
                className="sidebar-link sidebar-coming-soon"
              >
                <link.icon className={`w-5 h-5 shrink-0 ${sidebarOpen ? '' : 'mx-auto'}`} />
                {sidebarOpen && <span>{link.name}</span>}
                {sidebarOpen && <span className="sidebar-badge">Coming soon</span>}
              </div>
            )
          }

          return (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) => `sidebar-link ${isActive ? 'is-active' : ''}`}
            >
              <>
                <link.icon className={`w-5 h-5 shrink-0 transition-colors ${sidebarOpen ? '' : 'mx-auto'}`} />
                {sidebarOpen && <span>{link.name}</span>}
              </>
            </NavLink>
          )
        })}
      </nav>

      <div className="p-4 border-t border-white/10 space-y-2">
        <div className={`mt-2 flex items-center ${sidebarOpen ? 'justify-between px-2' : 'justify-center'}`}>
          {sidebarOpen && <span className="text-xs text-text-muted">Theme</span>}
          <ThemeToggle />
        </div>
        <button
          onClick={handleLogout}
          className={`sidebar-footer-button ${!sidebarOpen ? 'justify-center' : ''}`}
        >
          <LogOut className="w-5 h-5" />
          {sidebarOpen && <span>Sign Out</span>}
        </button>
      </div>
    </>
  )

  const mobileMenuContent = (
    <>
      <div className="flex justify-end mb-8">
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="p-2 text-text-secondary hover:text-text-primary"
          aria-label="Close menu"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <nav className="flex-1 space-y-2">
        {sidebarLinks.map((link) => {
          if (link.comingSoon) {
            return (
              <div
                key={link.path}
                className="flex items-center gap-4 px-4 py-4 rounded-xl text-lg font-medium text-text-muted opacity-70 cursor-not-allowed"
                aria-disabled="true"
                title="Marketplace coming soon"
              >
                <link.icon className="w-6 h-6" />
                {link.name}
                <span className="ml-auto inline-flex items-center justify-center whitespace-nowrap text-center w-max h-6 text-[10px] uppercase tracking-wider leading-none border border-white/20 text-text-muted px-3 rounded-full">
                  Coming soon
                </span>
              </div>
            )
          }

          return (
            <NavLink
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-4 px-4 py-4 rounded-xl text-lg font-medium transition-colors
                ${isActive ? 'bg-primary/20 text-text-primary' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}
              `}
            >
              <link.icon className="w-6 h-6" />
              {link.name}
            </NavLink>
          )
        })}
      </nav>

      <div className="pt-8 border-t border-white/15 space-y-4">
        <ThemeToggle />
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-300 hover:bg-red-500/10 font-medium"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </>
  )

  return (
    <div className="app-shell flex h-screen overflow-hidden font-sans selection:bg-primary/30">
      {isDarkTheme && <GalaxyWaveBackground />}

      {/* Sidebar (Desktop) */}
      {isDarkTheme ? (
        <motion.aside
          initial={{ width: 292 }}
          animate={{ width: sidebarOpen ? 292 : 88 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="app-sidebar hidden md:flex flex-col relative z-20"
        >
          {sidebarContent}
        </motion.aside>
      ) : (
        <aside
          className="app-sidebar hidden md:flex flex-col relative z-20"
          style={{ width: sidebarOpen ? '292px' : '88px' }}
        >
          {sidebarContent}
        </aside>
      )}

      {/* Mobile Header */}
      <header className="app-mobile-header md:hidden fixed top-0 w-full z-40">
        <Link to="/" className="group">
          <AnimatedBrandText className="text-[1.5rem]" text="JuaLuma" />
        </Link>
        <div className="flex items-center gap-2">
          <button onClick={() => setDrawerOpen(true)} className="shell-action-btn" aria-label="Open notifications">
            <Bell className="w-5 h-5" />
          </button>
          <Link to="/settings" className="profile-shell-btn" aria-label="Open profile">
            <User className="w-4 h-4" />
          </Link>
          <button onClick={() => setMobileMenuOpen(true)} className="shell-action-btn" aria-label="Open menu">
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isDarkTheme ? (
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            >
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute right-0 top-0 bottom-0 w-3/4 max-w-sm bg-surface-1/85 border-l border-white/15 p-6 flex flex-col shadow-2xl backdrop-blur-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {mobileMenuContent}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      ) : (
        mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setMobileMenuOpen(false)}>
            <div
              className="absolute right-0 top-0 bottom-0 w-3/4 max-w-sm bg-surface-1/85 border-l border-white/15 p-6 flex flex-col shadow-2xl backdrop-blur-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {mobileMenuContent}
            </div>
          </div>
        )
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10 pt-20 md:pt-0">
        <div className="app-topbar hidden md:flex items-center justify-between px-8 sticky top-0 z-10">
          {!isDashboardRoute ? (
            <div className="flex flex-col">
              <h1 className="text-xl font-semibold text-text-primary mb-0">{pageMeta.title}</h1>
              {pageMeta.description && (
                <p className="text-xs text-text-secondary mb-0">
                  {showWelcome ? `Welcome back, ${displayName}. ` : ''}
                  {pageMeta.description}
                </p>
              )}
            </div>
          ) : (
            <div />
          )}

          <div className="topbar-actions">
            <button onClick={() => setDrawerOpen(true)} className="shell-action-btn" aria-label="Open notifications">
              <Bell className="w-5 h-5" />
              <span className="shell-action-dot" />
            </button>
            <Link to="/settings" className="profile-shell-btn" aria-label="Open profile settings">
              <span className="profile-shell-initial">{userInitial}</span>
            </Link>
          </div>
        </div>

        <div
          className={`flex-1 ${isAiAssistant ? 'overflow-hidden p-0' : 'overflow-y-auto overflow-x-hidden p-4 md:p-8 scroll-smooth'}`}
        >
          <Outlet />
        </div>
      </main>

      <NotificationDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
      {!isAiAssistant && <QuickAIChat />}
    </div>
  )
}
