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

// Marketing site top nav with animated interactions.
'use client'

import React, { useCallback, useState, useEffect } from 'react'
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
  const [useCompactNav, setUseCompactNav] = useState(false)
  const brandLetters = 'JuaLuma'.split('')
  const [brandScales, setBrandScales] = useState<number[]>(() => brandLetters.map(() => 1))
  const brandCharRefs = React.useRef<(HTMLSpanElement | null)[]>([])
  const rafRef = React.useRef<number | null>(null)
  const navRowRef = React.useRef<HTMLDivElement | null>(null)
  const navBrandRef = React.useRef<HTMLDivElement | null>(null)
  const navLinksRef = React.useRef<HTMLDivElement | null>(null)
  const navActionsRef = React.useRef<HTMLDivElement | null>(null)
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

  const recomputeNavMode = useCallback(() => {
    if (!navRowRef.current || !navBrandRef.current || !navLinksRef.current || !navActionsRef.current) return
    const rowWidth = navRowRef.current.clientWidth
    const safeSpacing = 96
    const requiredWidth =
      navBrandRef.current.scrollWidth +
      navLinksRef.current.scrollWidth +
      navActionsRef.current.scrollWidth +
      safeSpacing

    setUseCompactNav(requiredWidth > rowWidth || rowWidth < 1260)
  }, [])

  useEffect(() => {
    const measure = () => requestAnimationFrame(recomputeNavMode)
    measure()
    window.addEventListener('resize', measure)

    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(measure)
      : null

    if (observer) {
      if (navRowRef.current) observer.observe(navRowRef.current)
      if (navBrandRef.current) observer.observe(navBrandRef.current)
      if (navLinksRef.current) observer.observe(navLinksRef.current)
      if (navActionsRef.current) observer.observe(navActionsRef.current)
    }

    return () => {
      window.removeEventListener('resize', measure)
      observer?.disconnect()
    }
  }, [pathname, recomputeNavMode])

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
  const showDesktopNav = !useCompactNav

  const navLinkActive = isLandingPage ? 'marketing-landing-link-active' : 'text-text-primary'
  const navLinkInactive = isLandingPage ? 'marketing-landing-link-inactive' : 'text-text-secondary hover:text-text-primary'
  const navSoon = isLandingPage ? 'marketing-landing-link-soon' : 'text-text-muted'
  const navSoonBadge = isLandingPage ? 'marketing-landing-soon-badge' : 'border-[var(--text-muted)] text-text-muted'
  const navLogIn = isLandingPage ? 'marketing-landing-login' : 'text-text-secondary hover:text-text-primary'
  const hamburgerIcon = isLandingPage ? 'marketing-landing-link-active' : 'text-text-primary'

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        showBlur
          ? 'marketing-nav-blur'
          : 'bg-transparent'
      }`}
    >
      <div ref={navRowRef} className="max-w-7xl mx-auto pl-6 pr-8 h-20 flex items-center justify-between gap-6">
        <div ref={navBrandRef} className="flex flex-shrink-0 mr-2">
          <Link href="/" className="flex items-center group">
            <span className="flex flex-col leading-none">
              <span
                className="text-[2.15rem] font-bold tracking-tight select-none"
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
                    className="marketing-brand-letter"
                    style={{
                      display: 'inline-block',
                      transform: `scale(${brandScales[index]})`,
                      transformOrigin: 'center bottom',
                      transition: 'transform 130ms cubic-bezier(0.22, 1, 0.36, 1)',
                      backgroundImage: 'var(--marketing-brand-wordmark-gradient)',
                      backgroundSize: `${brandLetters.length * 100}% 100%`,
                      backgroundPosition: `${(index / Math.max(brandLetters.length - 1, 1)) * 100}% 0%`,
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      textShadow: 'var(--marketing-brand-wordmark-shadow)',
                    }}
                  >
                    {letter}
                  </span>
                ))}
              </span>
            </span>
          </Link>
        </div>

        <div ref={navLinksRef} className={`${showDesktopNav ? 'hidden md:flex' : 'hidden'} items-center gap-4 shrink-0 ml-4 marketing-nav-links-wrap`}>
          {navLinks.map((link) =>
            link.comingSoon ? (
              <span
                key={link.path}
                className={`text-sm font-medium cursor-not-allowed flex items-center gap-2 whitespace-nowrap ${navSoon}`}
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
                className={`nav-link relative text-sm font-medium transition-colors whitespace-nowrap ${
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

        <div ref={navActionsRef} className={`${showDesktopNav ? 'hidden md:flex' : 'hidden'} items-center gap-3 flex-shrink-0 whitespace-nowrap marketing-nav-actions`}>
          <ThemeToggle className="marketing-theme-btn marketing-theme-btn-nav" />
          <a
            href={`${APP_URL}/login`}
            className={`nav-link text-sm font-medium transition-colors ${navLogIn}`}
          >
            Log In
          </a>
          <a href={`${APP_URL}/signup`} className="btn btn-sm marketing-nav-get-started">
            Get Started
          </a>
        </div>

        <button
          className={`p-2 ${showDesktopNav ? 'md:hidden' : ''} ${hamburgerIcon}`}
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
            className={`${showDesktopNav ? 'md:hidden' : ''} marketing-mobile-menu overflow-hidden`}
          >
            <div className="px-6 py-7 flex flex-col gap-4 marketing-mobile-menu-content">
              {navLinks.map((link) =>
                link.comingSoon ? (
                  <span
                    key={link.path}
                    className="text-lg font-medium cursor-not-allowed flex items-center gap-2 marketing-mobile-menu-soon"
                  >
                    {link.name}
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full marketing-mobile-menu-soon-badge">
                      Soon
                    </span>
                  </span>
                ) : (
                  <Link
                    key={link.path}
                    href={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`text-lg font-medium transition-colors ${pathname === link.path ? 'marketing-mobile-menu-link-active' : 'marketing-mobile-menu-link'}`}
                  >
                    {link.name}
                  </Link>
                ),
              )}
              <div className="marketing-mobile-menu-divider my-1" />
              <div className="flex items-center justify-between">
                <span className="text-lg font-medium marketing-mobile-menu-label">Theme</span>
                <ThemeToggle className="marketing-theme-btn" />
              </div>
              <div className="marketing-mobile-menu-divider my-1" />
              <a
                href={`${APP_URL}/login`}
                onClick={() => setMobileMenuOpen(false)}
                className={`text-lg font-medium transition-colors ${navLogIn}`}
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
