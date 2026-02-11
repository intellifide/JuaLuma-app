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

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from '@/lib/motion'
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
      const influenceRadius = 44
      const nextScales = brandLetters.map((_, index) => {
        const node = brandCharRefs.current[index]
        if (!node) return 1
        const rect = node.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const distance = Math.abs(pointerX - centerX)
        const strength = Math.max(0, 1 - distance / influenceRadius)
        return 1 + 0.28 * strength
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

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-surface-1/72 backdrop-blur-glass border-b border-white/10 shadow-glass'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <img
            src="/assets/logo.png"
            alt="JuaLuma logo"
            className="w-10 h-10 rounded-xl object-contain shadow-lg shadow-secondary/20 transition-transform group-hover:scale-105"
          />
          <span
            className="text-2xl font-bold tracking-tight text-text-primary select-none"
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
                  color: 'var(--text-primary)',
                  transform: `scale(${brandScales[index]})`,
                  transformOrigin: 'center bottom',
                  transition: 'transform 120ms linear',
                }}
              >
                {letter}
              </span>
            ))}
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-7">
          {navLinks.map((link) =>
            link.comingSoon ? (
              <span
                key={link.path}
                className="text-sm font-medium text-text-muted cursor-not-allowed flex items-center gap-2"
              >
                {link.name}
                <span className="text-[10px] uppercase tracking-wider border border-white/20 text-text-muted px-2 py-0.5 rounded-full">
                  Soon
                </span>
              </span>
            ) : (
              <Link
                key={link.path}
                href={link.path}
                className={`nav-link relative text-sm font-medium ${
                  pathname === link.path ? 'text-text-primary' : 'text-text-secondary'
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

        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          <a
            href="http://localhost:5175/login"
            className="nav-link text-sm font-medium text-text-secondary"
          >
            Log In
          </a>
          <a href="http://localhost:5175/signup" className="btn btn-sm">
            Get Started
          </a>
        </div>

        <button
          className="md:hidden p-2 text-text-primary"
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
            className="md:hidden bg-surface-1/95 border-b border-white/10 overflow-hidden"
          >
            <div className="px-6 py-7 flex flex-col gap-4">
              {navLinks.map((link) =>
                link.comingSoon ? (
                  <span
                    key={link.path}
                    className="text-lg font-medium text-text-muted cursor-not-allowed flex items-center gap-2"
                  >
                    {link.name}
                    <span className="text-[10px] uppercase tracking-wider border border-white/20 text-text-muted px-2 py-0.5 rounded-full">
                      Soon
                    </span>
                  </span>
                ) : (
                  <Link
                    key={link.path}
                    href={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`nav-link text-lg font-medium ${pathname === link.path ? 'text-text-primary' : 'text-text-secondary'}`}
                  >
                    {link.name}
                  </Link>
                ),
              )}
              <div className="h-px bg-white/10 my-1" />
              <a
                href="http://localhost:5175/login"
                onClick={() => setMobileMenuOpen(false)}
                className="nav-link text-lg font-medium text-text-primary"
              >
                Log In
              </a>
              <a
                href="http://localhost:5175/signup"
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
