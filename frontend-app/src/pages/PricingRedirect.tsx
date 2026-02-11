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

import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

export const PricingRedirect = () => {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const returnUrl = params.get('returnUrl') || ''
    let normalizedReturnUrl = returnUrl

    if (returnUrl.startsWith('/checkout/start')) {
      try {
        const nested = new URL(returnUrl, window.location.origin)
        const nestedReturn = nested.searchParams.get('returnUrl')
        normalizedReturnUrl = nestedReturn && nestedReturn.startsWith('/') ? nestedReturn : ''
      } catch {
        normalizedReturnUrl = ''
      }
    }
    const isLocalhost = window.location.hostname === 'localhost'
    const fallbackMarketing = isLocalhost ? 'http://localhost:5177' : window.location.origin
    const marketingOrigin =
      (import.meta as any).env?.VITE_MARKETING_SITE_URL || fallbackMarketing

    if (marketingOrigin === window.location.origin) {
      navigate(normalizedReturnUrl || '/settings', { replace: true })
      return
    }

    const target = new URL('/pricing', marketingOrigin)
    if (normalizedReturnUrl) {
      target.searchParams.set('returnUrl', normalizedReturnUrl)
    }
    window.location.replace(target.toString())
  }, [location.search, navigate])

  return (
    <div className="min-h-screen bg-midnight-black flex items-center justify-center px-4">
      <div className="max-w-xl w-full bg-surface-1/80 border border-white/10 rounded-2xl p-8 text-center backdrop-blur">
        <p className="text-sm uppercase tracking-[0.3em] text-neon-blue mb-4">Redirecting</p>
        <h1 className="text-2xl font-semibold text-white mb-3">
          You’re being routed to the pricing page
        </h1>
        <p className="text-sm text-text-secondary mb-6">
          After verifying your email we need to confirm your subscription tier before giving you dashboard access.
          We’ll take you to the pricing site (or back to your return destination) in a few seconds.
        </p>
        <div className="text-xs text-text-muted">
          If nothing happens, <button onClick={() => window.location.reload()} className="text-neon-blue underline">reload this page</button>.
        </div>
      </div>
    </div>
  )
}
