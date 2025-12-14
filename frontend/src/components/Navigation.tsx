import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ThemeToggle } from './ThemeToggle'
import { NotificationDrawer } from './notifications/NotificationDrawer'
import { useSWRConfig } from 'swr' // Optional if we want to prefetch

const linkClass = 'nav-link'
const activeClass = 'nav-link active'

export const Navigation = () => {
  const { user, logout } = useAuth()

  const [open, setOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const toggleMenu = () => setOpen((prev) => !prev)

  const AuthLinks = () => (
    <>
      <NavLink to="/dashboard" className={({ isActive }) => (isActive ? activeClass : linkClass)}>
        Dashboard
      </NavLink>
      <NavLink to="/connect-accounts" className={({ isActive }) => (isActive ? activeClass : linkClass)}>
        Connect Accounts
      </NavLink>
      <NavLink to="/marketplace" className={({ isActive }) => (isActive ? activeClass : linkClass)}>
        Marketplace
      </NavLink>
      <NavLink to="/ai-assistant" className={({ isActive }) => (isActive ? activeClass : linkClass)}>
        AI Assistant
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => (isActive ? activeClass : linkClass)}>
        Settings
      </NavLink>

      {/* Notification Bell */}
      <button
        onClick={() => setDrawerOpen((prev) => !prev)}
        className="p-2 rounded-full hover:bg-surface-2 transition-colors relative text-text-secondary hover:text-primary"
        aria-label="Toggle Notifications"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      </button>
      <button
        type="button"
        onClick={handleLogout}
        className="btn btn-secondary"
      >
        Logout
      </button>
    </>
  )

  const GuestLinks = () => (
    <>
      <NavLink to="/features" className={({ isActive }) => (isActive ? activeClass : linkClass)}>
        Features
      </NavLink>
      <NavLink to="/pricing" className={({ isActive }) => (isActive ? activeClass : linkClass)}>
        Pricing
      </NavLink>
      <NavLink to="/about" className={({ isActive }) => (isActive ? activeClass : linkClass)}>
        About
      </NavLink>
      <NavLink to="/developer-marketplace" className={({ isActive }) => (isActive ? activeClass : linkClass)}>
        Developer Marketplace
      </NavLink>
      <NavLink to="/login" className={({ isActive }) => (isActive ? activeClass : linkClass)}>
        Login
      </NavLink>
      <Link to="/signup" className="btn">
        Sign Up
      </Link>
    </>
  )

  return (
    <>
      <header className="header">
        <div className="header-container">
          <Link to="/" className="logo" aria-label="Finity home">
            <img src="/assets/finity-logo.png" alt="Finity logo" className="logo-img" />
            <span className="sr-only">Finity</span>
          </Link>

          <nav className="nav" aria-label="Main navigation">
            <NavLink to="/" className={({ isActive }) => (isActive ? activeClass : linkClass)} end>
              Home
            </NavLink>
            {user ? <AuthLinks /> : <GuestLinks />}
          </nav>

          <button
            type="button"
            className="nav-mobile-toggle"
            onClick={toggleMenu}
            aria-label="Toggle navigation menu"
            aria-expanded={open}
          >
            ☰
          </button>

          <ThemeToggle />
        </div>

        <nav className={`nav-mobile ${open ? 'open' : ''}`} aria-label="Mobile navigation">
          {/* Mobile nav items... reusing AuthLinks components logic lightly or duplicating */}
          <NavLink to="/" className={({ isActive }) => (isActive ? activeClass : linkClass)} end onClick={toggleMenu}>
            Home
          </NavLink>
          {user ? (
            <>
              <NavLink to="/dashboard" className={({ isActive }) => (isActive ? activeClass : linkClass)} onClick={toggleMenu}>
                Dashboard
              </NavLink>
              <NavLink to="/connect-accounts" className={({ isActive }) => (isActive ? activeClass : linkClass)} onClick={toggleMenu}>
                Connect Accounts
              </NavLink>
              <NavLink to="/marketplace" className={({ isActive }) => (isActive ? activeClass : linkClass)} onClick={toggleMenu}>
                Marketplace
              </NavLink>
              <NavLink to="/ai-assistant" className={({ isActive }) => (isActive ? activeClass : linkClass)} onClick={toggleMenu}>
                AI Assistant
              </NavLink>
              <NavLink to="/settings" className={({ isActive }) => (isActive ? activeClass : linkClass)} onClick={toggleMenu}>
                Settings
              </NavLink>

              <button
                onClick={() => {
                  setDrawerOpen(true);
                  toggleMenu();
                }}
                className="nav-link text-left"
              >
                Notifications
              </button>
              <button
                type="button"
                onClick={() => {
                  handleLogout()
                  toggleMenu()
                }}
                className="btn btn-secondary"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/features" className={({ isActive }) => (isActive ? activeClass : linkClass)} onClick={toggleMenu}>
                Features
              </NavLink>
              <NavLink to="/pricing" className={({ isActive }) => (isActive ? activeClass : linkClass)} onClick={toggleMenu}>
                Pricing
              </NavLink>
              <NavLink to="/about" className={({ isActive }) => (isActive ? activeClass : linkClass)} onClick={toggleMenu}>
                About
              </NavLink>
              <NavLink to="/developer-marketplace" className={({ isActive }) => (isActive ? activeClass : linkClass)} onClick={toggleMenu}>
                Developer Marketplace
              </NavLink>
              <NavLink to="/login" className={({ isActive }) => (isActive ? activeClass : linkClass)} onClick={toggleMenu}>
                Login
              </NavLink>
              <Link to="/signup" onClick={toggleMenu} className="btn">
                Sign Up
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Notification Drawer */}
      <NotificationDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  )
}
