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

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { createCheckoutSession } from '../services/billing'
import { selectFreePlan } from '../services/auth'
import { eventTracking, SignupFunnelEvent } from '../services/eventTracking'

const normalizePlanParam = (plan: string): string => {
  const normalized = plan.trim().toLowerCase()
  if (normalized === 'pro') return 'pro_monthly'
  if (normalized === 'ultimate') return 'ultimate_monthly'
  if (normalized === 'essential') return 'essential_monthly'
  return normalized
}

const safeReturnUrl = (value: string | null): string => {
  if (!value) return '/dashboard'
  if (!value.startsWith('/')) return '/dashboard'
  if (value.startsWith('/checkout/start')) return '/dashboard'
  return value
}

export const CheckoutStart = () => {
  const { user, profile, loading } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  const rawPlan = searchParams.get('plan')
  const returnUrl = searchParams.get('returnUrl')
  const resolvedReturnUrl = useMemo(() => safeReturnUrl(returnUrl), [returnUrl])

  useEffect(() => {
    eventTracking.trackSignupFunnel(SignupFunnelEvent.PLAN_SELECTION_VIEWED, {
      plan: rawPlan || undefined,
    })
  }, [rawPlan])

  useEffect(() => {
    if (loading || processing) return

    if (!rawPlan) {
      navigate('/pricing', { replace: true })
      return
    }

    if (!user) {
      const redirectParams = new URLSearchParams({
        returnUrl: `/checkout/start?${searchParams.toString()}`,
      })
      navigate(`/signup?${redirectParams.toString()}`, { replace: true })
      return
    }

    if (profile?.status === 'pending_verification') {
      const redirectParams = new URLSearchParams({
        returnUrl: `/checkout/start?${searchParams.toString()}`,
      })
      navigate(`/verify-email?${redirectParams.toString()}`, { replace: true })
      return
    }

    const plan = normalizePlanParam(rawPlan)

    const startCheckout = async () => {
      setProcessing(true)
      setError(null)
      try {
        if (plan === 'free') {
          eventTracking.trackSignupFunnel(SignupFunnelEvent.FREE_PLAN_SELECTED)
          await selectFreePlan()
          navigate(resolvedReturnUrl, { replace: true })
          return
        }

        eventTracking.trackSignupFunnel(SignupFunnelEvent.PAID_PLAN_SELECTED, { plan })

        const successUrl = new URL('/checkout/success', window.location.origin)
        if (returnUrl) {
          successUrl.searchParams.set('returnUrl', returnUrl)
        }

        const checkoutUrl = await createCheckoutSession(plan, successUrl.toString())

        eventTracking.trackSignupFunnel(SignupFunnelEvent.CHECKOUT_STARTED, { plan })

        window.location.assign(checkoutUrl)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to start checkout.'
        setError(message)
        eventTracking.trackSignupFunnel(SignupFunnelEvent.CHECKOUT_FAILED, {
          plan,
          error: message,
        })
      } finally {
        setProcessing(false)
      }
    }

    startCheckout()
  }, [
    loading,
    processing,
    rawPlan,
    user,
    profile?.status,
    navigate,
    searchParams,
    resolvedReturnUrl,
    returnUrl,
  ])

  return (
    <div className="min-h-screen flex items-center justify-center bg-midnight-black">
      <div className="card max-w-md w-full text-center">
        <div className="mb-6 flex justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-4">Preparing Your Plan</h1>
        <p className="text-text-secondary">
          We&apos;re getting your subscription ready. You&apos;ll be redirected shortly.
        </p>
        {error && (
          <p className="mt-4 text-sm text-red-400">{error}</p>
        )}
      </div>
    </div>
  )
}
