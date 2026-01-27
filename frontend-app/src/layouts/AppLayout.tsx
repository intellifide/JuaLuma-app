import React, { useEffect, useMemo, useState } from 'react'
import { NavLink, Link, useNavigate, Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { ThemeToggle } from '../components/ThemeToggle'
import { NotificationDrawer } from '../components/notifications/NotificationDrawer'
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
  LifeBuoy
} from 'lucide-react'

const sidebarLinks = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Financial Analysis', path: '/financial-analysis', icon: LineChart },
  { name: 'Transactions', path: '/transactions', icon: CreditCard },
  { name: 'Connect Accounts', path: '/connect-accounts', icon: Wallet },
  { name: 'Marketplace', path: '/marketplace', icon: Store, comingSoon: true },
  { name: 'AI Assistant', path: '/ai-assistant', icon: Bot },
  { name: 'Settings', path: '/settings', icon: Settings },
  { name: 'Support', path: '/support', icon: LifeBuoy },
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
    const pageTitle = useMemo(() => {
        const match = sidebarLinks.find((link) => location.pathname.startsWith(link.path))
        return match?.name ?? 'Dashboard'
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
    }, [profile, welcomeKey])

    const isAiAssistant = location.pathname.startsWith('/ai-assistant')

    const handleLogout = async () => {
        await logout()
        navigate('/login')
    }

    return (
        <div className="flex h-screen bg-bg-primary text-text-primary overflow-hidden font-sans selection:bg-primary/30">
            {/* Sidebar (Desktop) */}
            <motion.aside 
                initial={{ width: 280 }}
                animate={{ width: sidebarOpen ? 280 : 80 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="hidden md:flex flex-col border-r border-white/5 bg-surface-1/50 backdrop-blur-xl relative z-20"
            >
                {/* Header */}
                <div className="h-20 flex items-center px-6 border-b border-white/5">
                   <Link to="/" className="flex items-center gap-3 overflow-hidden">
                        <div className="w-9 h-9 min-w-9 rounded-lg bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary/20 shrink-0">
                            J
                        </div>
                        <AnimatePresence>
                            {sidebarOpen && (
                                <motion.span 
                                    initial={{ opacity: 0, x: -10 }} 
                                    animate={{ opacity: 1, x: 0 }} 
                                    exit={{ opacity: 0, x: -10 }}
                                    className="font-bold text-xl tracking-tight whitespace-nowrap"
                                >
                                    jualuma
                                </motion.span>
                            )}
                        </AnimatePresence>
                   </Link>
                   
                   <button 
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="absolute -right-3 top-24 w-6 h-6 rounded-full bg-surface-2 border border-white/10 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors shadow-sm"
                   >
                     <ChevronLeft className={`w-3 h-3 transition-transform ${!sidebarOpen ? 'rotate-180' : ''}`} />
                   </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
                    {sidebarLinks.map((link) => {
                        if (link.comingSoon) {
                            return (
                                <div
                                    key={link.path}
                                    aria-disabled="true"
                                    title="Marketplace coming soon"
                                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-text-muted opacity-70 cursor-not-allowed"
                                >
                                    <link.icon className={`w-5 h-5 shrink-0 ${sidebarOpen ? '' : 'mx-auto'}`} />
                                    {sidebarOpen && <span>{link.name}</span>}
                                    {sidebarOpen && (
                                        <span className="ml-auto text-[10px] uppercase tracking-wider border border-border/60 text-text-muted px-2 py-0.5 rounded-full">
                                          Soon
                                        </span>
                                    )}
                                </div>
                            )
                        }

                        return (
                            <NavLink
                                key={link.path}
                                to={link.path}
                                className={({ isActive }) => `
                                    flex items-center gap-3 px-3 py-3 rounded-xl transition-all group relative overflow-hidden
                                    ${isActive 
                                        ? 'bg-primary/10 text-primary font-medium shadow-inner-glow' 
                                        : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                                    }
                                `}
                            >
                                {({ isActive }) => (
                                    <>
                                        <link.icon className={`w-5 h-5 shrink-0 transition-colors ${sidebarOpen ? '' : 'mx-auto'}`} />
                                        {sidebarOpen && <span>{link.name}</span>}
                                        
                                        {/* Active Indicator Bar */}
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeTab"
                                                className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                            />
                                        )}
                                    </>
                                )}
                            </NavLink>
                        )
                    })}
                </nav>

                {/* Footer Actions */}
                <div className="p-4 border-t border-white/5 space-y-2">
                    <button
                        onClick={() => setDrawerOpen(true)}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors ${!sidebarOpen && 'justify-center'}`}
                    >
                        <Bell className="w-5 h-5" />
                        {sidebarOpen && <span>Notifications</span>}
                    </button>
                    <button
                        onClick={handleLogout}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-text-secondary hover:text-red-500 hover:bg-red-500/10 transition-colors ${!sidebarOpen && 'justify-center'}`}
                    >
                        <LogOut className="w-5 h-5" />
                        {sidebarOpen && <span>Sign Out</span>}
                    </button>

                    <div className={`mt-4 flex items-center ${sidebarOpen ? 'justify-between px-2' : 'justify-center'}`}>
                        {sidebarOpen && <span className="text-xs text-text-muted">Theme</span>}
                        <ThemeToggle />
                    </div>
                </div>
            </motion.aside>

            {/* Mobile Header */}
            <header className="md:hidden flex items-center justify-between px-6 h-20 bg-surface-1/80 backdrop-blur-md border-b border-white/5 fixed top-0 w-full z-40">
                <Link to="/" className="font-bold text-xl text-primary">jualuma</Link>
                <div className="flex items-center gap-4">
                    <button onClick={() => setDrawerOpen(true)} className="p-2 text-text-secondary hover:text-text-primary"><Bell className="w-5 h-5" /></button>
                     <button onClick={() => setMobileMenuOpen(true)} className="p-2 text-text-primary"><Menu className="w-6 h-6" /></button>
                </div>
            </header>

            {/* Mobile Menu Overlay */}
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
                            className="absolute right-0 top-0 bottom-0 w-3/4 max-w-sm bg-surface-1 border-l border-white/10 p-6 flex flex-col shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-end mb-8">
                                <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-text-secondary hover:text-text-primary">
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
                                                <span className="ml-auto text-[10px] uppercase tracking-wider border border-border/60 text-text-muted px-2 py-0.5 rounded-full">
                                                  Soon
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
                                                ${isActive ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:text-text-primary'}
                                            `}
                                        >
                                            <link.icon className="w-6 h-6" />
                                            {link.name}
                                        </NavLink>
                                    )
                                })}
                            </nav>

                            <div className="pt-8 border-t border-white/10 space-y-4">
                                <ThemeToggle />
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 font-medium"
                                >
                                    <LogOut className="w-5 h-5" />
                                    Sign Out
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative pt-20 md:pt-0">
                {/* Top Bar (Contextual - Optional for now, mostly for breadcrumbs or page title) */}
                <div className="hidden md:flex h-20 items-center justify-between px-8 border-b border-white/5 bg-bg-primary/50 backdrop-blur-sm sticky top-0 z-10">
                   <h1 className="text-xl font-semibold text-text-primary capitalize">
                        {showWelcome ? `Welcome back, ${displayName}.` : pageTitle}
                   </h1>
                   <div className="flex items-center gap-4">
                        <Link to="/" className="text-sm font-medium text-text-muted hover:text-primary transition-colors">
                            ← Return to Website
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
        </div>
    )
}
