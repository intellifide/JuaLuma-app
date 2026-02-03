// Marketing site top nav. Last modified: 2026-02-02 18:50 CST
'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from './ThemeToggle'

const navLinks = [
  { name: 'Features', path: '/features' },
  { name: 'Pricing', path: '/pricing' },
  { name: 'Marketplace', path: '/marketplace', comingSoon: true },
  { name: 'About', path: '/about' },
  { name: 'Developers', path: '/developers', comingSoon: true },
  { name: 'Support', path: '/support' },
]

export const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

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
        <Link href="/" className="flex items-center gap-3 group">
          <img src="/assets/logo.png" alt="JuaLuma logo" className="w-10 h-10 rounded-xl object-contain shadow-lg shadow-primary/20 transition-transform group-hover:scale-110" />
          <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-text-primary to-text-secondary tracking-tight">
            JuaLuma
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) =>
            link.comingSoon ? (
              <span
                key={link.path}
                className="text-sm font-medium text-text-muted cursor-not-allowed flex items-center gap-2"
              >
                {link.name}
                <span className="text-[10px] uppercase tracking-wider border border-white/20 text-text-muted px-2 py-0.5 rounded-full">
                  Coming soon
                </span>
              </span>
            ) : (
              <Link
                key={link.path}
                href={link.path}
                className={`text-sm font-medium transition-colors hover:text-accent ${
                  pathname === link.path ? 'text-accent' : 'text-text-secondary'
                }`}
              >
                {link.name}
              </Link>
            )
          )}
        </div>

        {/* Actions */}
        <div className="hidden md:flex items-center gap-4">
          <ThemeToggle />
          <a
            href="http://localhost:5175/login"
            className="text-sm font-medium text-text-primary hover:text-accent transition-colors"
          >
            Log In
          </a>
          <a
            href="http://localhost:5175/signup"
            className="px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-dark text-white text-sm font-semibold shadow-lg shadow-primary/25 transition-all hover:scale-105 active:scale-95"
          >
            Get Started
          </a>
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
      {mobileMenuOpen && (
        <div className="md:hidden bg-surface-1 border-b border-white/5 overflow-hidden animate-fade-in">
          <div className="px-6 py-8 flex flex-col gap-4">
            {navLinks.map((link) =>
              link.comingSoon ? (
                <span
                  key={link.path}
                  className="text-lg font-medium text-text-muted cursor-not-allowed flex items-center gap-2"
                >
                  {link.name}
                  <span className="text-[10px] uppercase tracking-wider border border-white/20 text-text-muted px-2 py-0.5 rounded-full">
                    Coming soon
                  </span>
                </span>
              ) : (
                <Link
                  key={link.path}
                  href={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`text-lg font-medium ${
                    pathname === link.path ? 'text-accent' : 'text-text-secondary'
                  }`}
                >
                  {link.name}
                </Link>
              )
            )}
            <div className="h-px bg-white/5 my-2" />
            <a
              href="http://localhost:5175/login"
              onClick={() => setMobileMenuOpen(false)}
              className="text-lg font-medium text-text-primary"
            >
              Log In
            </a>
            <a
              href="http://localhost:5175/signup"
              onClick={() => setMobileMenuOpen(false)}
              className="text-lg font-medium text-primary"
            >
              Sign Up
            </a>
          </div>
        </div>
      )}
    </nav>
  )
}
