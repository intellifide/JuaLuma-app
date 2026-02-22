/*
 * Copyright (c) 2026 Intellifide, LLC.
 * Licensed under PolyForm Noncommercial License 1.0.0.
 * See "PolyForm-Noncommercial-1.0.0.txt" for full text.
 *
 * COMMUNITY RIGHTS:
 * - You CAN modify this code for personal use.
 * - You CAN build and share widgets/plugins for the ecosystem.
 *
 * RESTRICTIONS:
 * - You CANNOT resell, repackage, or distribute this application for a fee.
 * - You CANNOT use this application for commercial enterprise purposes.
 */

// Marketing site top nav with animated interactions.
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from '@/lib/motion'
import { ThemeToggle } from './ThemeToggle'
import { APP_URL } from '@/lib/constants'

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
  const brandLetters = 'JuaLuma'.split('')
  const [brandScales, setBrandScales] = useState<number[]>(() => brandLetters.map(() => 1))
  const brandCharRefs = React.useRef<(HTMLSpanElement | null)[]>([])
  const rafRef = React.useRef<number | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 18)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  const handleBrandMouseMove = (event: React.MouseEvent<HTMLSpanElement>) => {
    const pointerX = event.clientX
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const influenceRadius = 48
      const nextScales = brandLetters.map((_, index) => {
        const node = brandCharRefs.current[index]
        if (!node) return 1
        const rect = node.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const distance = Math.abs(pointerX - centerX)
        const strength = Math.max(0, 1 - distance / influenceRadius)
        return 1 + 0.4 * strength
      })
      setBrandScales(nextScales)
    })
  }

  const handleBrandMouseLeave = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    setBrandScales(brandLetters.map(() => 1))
  }

  const showBlur = scrolled || mobileMenuOpen
  const isLandingPage = pathname === '/'

  /* Landing: header text always light (hero has dark bg). Other pages: follow theme (light text in dark mode, dark text in light mode). */
  const navLinkActive = isLandingPage ? 'text-white' : 'text-text-primary'
  const navLinkInactive = isLandingPage ? 'text-slate-200 hover:text-white' : 'text-text-secondary hover:text-text-primary'
  const navSoon = isLandingPage ? 'text-slate-300' : 'text-text-muted'
  const navSoonBadge = isLandingPage ? 'border-white/30 text-slate-300' : 'border-[var(--text-muted)] text-text-muted'
  const navLogIn = isLandingPage ? 'text-slate-200 hover:text-white' : 'text-text-secondary hover:text-text-primary'
  const hamburgerIcon = isLandingPage ? 'text-white' : 'text-text-primary'

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        showBlur
          ? 'bg-surface-1/72 backdrop-blur-glass border-b border-white/10 shadow-glass'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto pl-6 pr-8 h-20 flex items-center justify-between gap-6">
        <Link href="/" className="flex flex-shrink-0 items-center gap-3 group mr-2">
          <span className="flex flex-col leading-none">
            <span
              className="text-2xl font-bold tracking-tight select-none"
              onMouseMove={handleBrandMouseMove}
              onMouseLeave={handleBrandMouseLeave}
            >
              {brandLetters.map((letter, index) => (
                <span
                  key={`${letter}-${index}`}
                  ref={(el) => {
                    brandCharRefs.current[index] = el
                  }}
                  aria-hidden="true"
                  style={{
                    display: 'inline-block',
                    transform: `scale(${brandScales[index]})`,
                    transformOrigin: 'center bottom',
                    transition: 'transform 130ms cubic-bezier(0.22, 1, 0.36, 1)',
                    backgroundImage: 'linear-gradient(90deg, #8e2de2 0%, #5d4cd8 38%, #4c8cdc 66%, #2bdde6 100%)',
                    backgroundSize: `${brandLetters.length * 100}% 100%`,
                    backgroundPosition: `${(index / Math.max(brandLetters.length - 1, 1)) * 100}% 0%`,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textShadow: '0 0 11px rgba(109, 129, 224, 0.28)',
                  }}
                >
                  {letter}
                </span>
              ))}
            </span>
            <span className="text-[11px] font-semibold tracking-wide text-text-muted mt-1">
              by Intellifide
            </span>
          </span>
        </Link>

        <div className="hidden lg:flex items-center gap-7 min-w-0 ml-4">
          {navLinks.map((link) =>
            link.comingSoon ? (
              <span
                key={link.path}
                className={`text-sm font-medium cursor-not-allowed flex items-center gap-2 ${navSoon}`}
              >
                {link.name}
                <span className={`text-[10px] uppercase tracking-wider border px-2 py-0.5 rounded-full ${navSoonBadge}`}>
                  Soon
                </span>
              </span>
            ) : (
              <Link
                key={link.path}
                href={link.path}
                className={`nav-link relative text-sm font-medium transition-colors ${
                  pathname === link.path ? navLinkActive : navLinkInactive
                }`}
              >
                {link.name}
                {pathname === link.path && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute left-0 right-0 -bottom-1 h-[2px] bg-gradient-to-r from-primary to-secondary rounded-full"
                  />
                )}
              </Link>
            ),
          )}
        </div>

        <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
          <ThemeToggle />
          <a
            href={`${APP_URL}/login`}
            className={`nav-link text-sm font-medium transition-colors ${navLogIn}`}
          >
            Log In
          </a>
          <a href={`${APP_URL}/signup`} className="btn btn-sm">
            Get Started
          </a>
        </div>

        <button
          className={`lg:hidden p-2 ${hamburgerIcon}`}
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label="Toggle mobile menu"
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

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="lg:hidden bg-white/98 backdrop-blur-glass border-b border-slate-200 overflow-hidden"
          >
            <div className="px-6 py-7 flex flex-col gap-4 text-slate-800">
              {navLinks.map((link) =>
                link.comingSoon ? (
                  <span
                    key={link.path}
                    className="text-lg font-medium text-slate-600 cursor-not-allowed flex items-center gap-2"
                  >
                    {link.name}
                    <span className="text-[10px] uppercase tracking-wider border border-slate-400 text-slate-600 px-2 py-0.5 rounded-full">
                      Soon
                    </span>
                  </span>
                ) : (
                  <Link
                    key={link.path}
                    href={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`text-lg font-medium hover:text-slate-900 transition-colors ${pathname === link.path ? 'text-slate-900 font-semibold' : 'text-slate-700'}`}
                  >
                    {link.name}
                  </Link>
                ),
              )}
              <div className="h-px bg-slate-200 my-1" />
              <div className="flex items-center justify-between">
                <span className="text-lg font-medium text-slate-700">Theme</span>
                <ThemeToggle />
              </div>
              <div className="h-px bg-slate-200 my-1" />
              <a
                href={`${APP_URL}/login`}
                onClick={() => setMobileMenuOpen(false)}
                className="text-lg font-medium text-slate-700 hover:text-slate-900 transition-colors"
              >
                Log In
              </a>
              <a
                href={`${APP_URL}/signup`}
                onClick={() => setMobileMenuOpen(false)}
                className="btn btn-sm w-full"
              >
                Sign Up
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
