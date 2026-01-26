import React, { useState, useEffect } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ThemeToggle } from './ThemeToggle'

const navLinks = [
  { name: 'Features', path: '/features' },
  { name: 'Pricing', path: '/pricing' },
  { name: 'About', path: '/about' },
  { name: 'Developers', path: '/developers' },
  { name: 'Support', path: '/support' },
]

export const WebsiteNavbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-surface-1/80 backdrop-blur-glass border-b border-white/10 shadow-glass'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative w-10 h-10 overflow-hidden rounded-xl">
             <img src="/assets/jualuma-logo.png" alt="jualuma logo" className="object-cover w-full h-full transform group-hover:scale-110 transition-transform duration-500" />
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70 tracking-tight">
            jualuma
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                `text-sm font-medium transition-colors hover:text-accent ${
                  isActive ? 'text-accent' : 'text-text-secondary'
                }`
              }
            >
              {link.name}
            </NavLink>
          ))}
        </div>

        {/* Actions */}
        <div className="hidden md:flex items-center gap-4">
          <ThemeToggle />
          <Link
            to="/login"
            className="text-sm font-medium text-text-primary hover:text-accent transition-colors"
          >
            Log In
          </Link>
          <Link
            to="/signup"
            className="px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-dark text-white text-sm font-semibold shadow-lg shadow-primary/25 transition-all hover:scale-105 active:scale-95"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden p-2 text-text-primary"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <div className="w-6 flex flex-col gap-1.5 items-end">
            <span
              className={`block h-0.5 bg-current transition-all duration-300 ${
                mobileMenuOpen ? 'w-6 rotate-45 translate-y-2' : 'w-6'
              }`}
            />
            <span
              className={`block h-0.5 bg-current transition-all duration-300 ${
                mobileMenuOpen ? 'opacity-0' : 'w-4'
              }`}
            />
            <span
              className={`block h-0.5 bg-current transition-all duration-300 ${
                mobileMenuOpen ? 'w-6 -rotate-45 -translate-y-2' : 'w-5'
              }`}
            />
          </div>
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-surface-1 border-b border-white/5 overflow-hidden"
          >
            <div className="px-6 py-8 flex flex-col gap-4">
              {navLinks.map((link) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `text-lg font-medium ${
                      isActive ? 'text-accent' : 'text-text-secondary'
                    }`
                  }
                >
                  {link.name}
                </NavLink>
              ))}
              <div className="h-px bg-white/5 my-2" />
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-lg font-medium text-text-primary"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="text-lg font-medium text-primary"
              >
                Sign Up
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
