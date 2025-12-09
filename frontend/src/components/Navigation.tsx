// Updated 2025-12-08 20:31 CST by ChatGPT
import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const linkClass =
  'text-slate-800 hover:text-royal-purple font-medium transition-colors duration-150'

const activeClass = 'text-royal-purple font-semibold'

export const Navigation = () => {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const toggleMenu = () => setOpen((prev) => !prev)

  const AuthLinks = () => (
    <div className="flex items-center gap-4">
      <NavLink to="/dashboard" className={({ isActive }) => (isActive ? activeClass : linkClass)}>
        Dashboard
      </NavLink>
      <NavLink to="/ai-assistant" className={({ isActive }) => (isActive ? activeClass : linkClass)}>
        AI Assistant
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => (isActive ? activeClass : linkClass)}>
        Settings
      </NavLink>
      <button
        type="button"
        onClick={handleLogout}
        className="px-4 py-2 rounded-lg bg-royal-purple text-white hover:bg-deep-indigo transition-colors duration-150"
      >
        Logout
      </button>
    </div>
  )

  const GuestLinks = () => (
    <div className="flex items-center gap-4">
      <NavLink to="/features" className={({ isActive }) => (isActive ? activeClass : linkClass)}>
        Features
      </NavLink>
      <NavLink to="/pricing" className={({ isActive }) => (isActive ? activeClass : linkClass)}>
        Pricing
      </NavLink>
      <NavLink to="/login" className={({ isActive }) => (isActive ? activeClass : linkClass)}>
        Login
      </NavLink>
      <Link
        to="/signup"
        className="px-4 py-2 rounded-lg bg-royal-purple text-white hover:bg-deep-indigo transition-colors duration-150"
      >
        Sign Up
      </Link>
    </div>
  )

  return (
    <nav className="bg-white/80 border-b border-slate-200 backdrop-blur-md sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold text-deep-indigo">
          Finity
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <NavLink to="/" className={({ isActive }) => (isActive ? activeClass : linkClass)} end>
            Home
          </NavLink>
          {user ? <AuthLinks /> : <GuestLinks />}
        </div>

        <button
          type="button"
          className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-slate-700 hover:bg-slate-100"
          onClick={toggleMenu}
          aria-label="Toggle navigation menu"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-3">
          <NavLink to="/" className={({ isActive }) => (isActive ? activeClass : linkClass)} end onClick={toggleMenu}>
            Home
          </NavLink>
          {user ? (
            <>
              <NavLink
                to="/dashboard"
                className={({ isActive }) => (isActive ? activeClass : linkClass)}
                onClick={toggleMenu}
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/ai-assistant"
                className={({ isActive }) => (isActive ? activeClass : linkClass)}
                onClick={toggleMenu}
              >
                AI Assistant
              </NavLink>
              <NavLink
                to="/settings"
                className={({ isActive }) => (isActive ? activeClass : linkClass)}
                onClick={toggleMenu}
              >
                Settings
              </NavLink>
              <button
                type="button"
                onClick={() => {
                  handleLogout()
                  toggleMenu()
                }}
                className="block w-full text-left px-4 py-2 rounded-lg bg-royal-purple text-white hover:bg-deep-indigo"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink
                to="/features"
                className={({ isActive }) => (isActive ? activeClass : linkClass)}
                onClick={toggleMenu}
              >
                Features
              </NavLink>
              <NavLink
                to="/pricing"
                className={({ isActive }) => (isActive ? activeClass : linkClass)}
                onClick={toggleMenu}
              >
                Pricing
              </NavLink>
              <NavLink
                to="/login"
                className={({ isActive }) => (isActive ? activeClass : linkClass)}
                onClick={toggleMenu}
              >
                Login
              </NavLink>
              <Link
                to="/signup"
                onClick={toggleMenu}
                className="block text-center px-4 py-2 rounded-lg bg-royal-purple text-white hover:bg-deep-indigo"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
