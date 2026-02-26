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

'use client'

import { useEffect, useState } from 'react'

type ThemeToggleProps = {
  className?: string
}

export const ThemeToggle = ({ className = '' }: ThemeToggleProps) => {
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'dark'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  const toggle = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('theme', next)
  }

  const isLight = theme === 'light'

  return (
    <button
      onClick={toggle}
      className={className}
      aria-label={`Switch to ${isLight ? 'dark' : 'light'} theme`}
      type="button"
    >
      {isLight ? (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden>
          <path d="M20.1 15.3A8.5 8.5 0 1 1 8.7 3.9a7 7 0 1 0 11.4 11.4Z" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden>
          <path d="M12 3v2.1M12 18.9V21M4.9 4.9l1.5 1.5M17.6 17.6l1.5 1.5M3 12h2.1M18.9 12H21M4.9 19.1l1.5-1.5M17.6 6.4l1.5-1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="12" cy="12" r="3.6" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      )}
    </button>
  )
}
