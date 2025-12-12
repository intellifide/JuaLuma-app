// Updated 2025-12-11 17:55 CST by ChatGPT - match website template structure
import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ThemeToggle } from './ThemeToggle'

const linkClass = 'nav-link'
const activeClass = 'nav-link active'

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
      <NavLink to="/support" className={({ isActive }) => (isActive ? activeClass : linkClass)}>
        Support
      </NavLink>
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
            <NavLink to="/support" className={({ isActive }) => (isActive ? activeClass : linkClass)} onClick={toggleMenu}>
              Support
            </NavLink>
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
  )
}
