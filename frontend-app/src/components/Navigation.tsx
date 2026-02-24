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

import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ThemeToggle } from './ThemeToggle'
import { NotificationDrawer } from './notifications/NotificationDrawer'
import { AnimatedBrandText } from './AnimatedBrandText'
import { getMarketingSiteUrl } from '../utils/marketing'

const MARKETING_URL = getMarketingSiteUrl()

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
      <NavLink to="/financial-analysis" className={({ isActive }) => (isActive ? activeClass : linkClass)}>
        Financial Analysis
      </NavLink>
      <NavLink to="/transactions" className={({ isActive }) => (isActive ? activeClass : linkClass)}>
        Transactions
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
      <a href={`${MARKETING_URL}/features`} className={linkClass}>
        Features
      </a>
      <a href={`${MARKETING_URL}/pricing`} className={linkClass}>
        Pricing
      </a>
      <a href={`${MARKETING_URL}/about`} className={linkClass}>
        About
      </a>
      <a href={`${MARKETING_URL}/developers`} className={linkClass}>
         Developers
      </a>
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
          <a href={`${MARKETING_URL}`} aria-label="JuaLuma home" className="group">
            <AnimatedBrandText className="text-xl" />
          </a>

          <nav className="nav" aria-label="Main navigation">
            <a href={`${MARKETING_URL}`} className={linkClass}>
              Home
            </a>
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
          <a href={`${MARKETING_URL}`} className={linkClass} onClick={toggleMenu}>
            Home
          </a>
          {user ? (
            <>
              <NavLink to="/dashboard" className={({ isActive }) => (isActive ? activeClass : linkClass)} onClick={toggleMenu}>
                Dashboard
              </NavLink>
              <NavLink to="/financial-analysis" className={({ isActive }) => (isActive ? activeClass : linkClass)} onClick={toggleMenu}>
                Financial Analysis
              </NavLink>
              <NavLink to="/transactions" className={({ isActive }) => (isActive ? activeClass : linkClass)} onClick={toggleMenu}>
                Transactions
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
              <a href={`${MARKETING_URL}/features`} className={linkClass} onClick={toggleMenu}>
                Features
              </a>
              <a href={`${MARKETING_URL}/pricing`} className={linkClass} onClick={toggleMenu}>
                Pricing
              </a>
              <a href={`${MARKETING_URL}/about`} className={linkClass} onClick={toggleMenu}>
                About
              </a>
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
