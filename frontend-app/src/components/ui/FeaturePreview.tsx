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

// Updated 2026-01-28 11:35 CST by Codex
import type { PropsWithChildren, ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { eventTracking } from '../../services/eventTracking'
import {
  FeatureKey,
  Tier,
  TierSlug,
  featureRequirements,
  normalizeTierSlug,
  tierFromPlan,
} from '../../shared/accessControl'
import { Modal } from './Modal'
import { Paywall } from './Paywall'

type FeaturePreviewProps = PropsWithChildren<{
  featureKey: FeatureKey
  requiredTier?: Tier | TierSlug
  userTier?: Tier | TierSlug
  previewContent?: ReactNode
  showPreviewBadge?: boolean
  onInteractionBlocked?: (details: {
    featureKey: FeatureKey
    action: string
    requiredTier: Tier
    userTier: Tier
  }) => void
}>

const ACTIONABLE_SELECTOR = [
  'button',
  'a[href]',
  'input',
  'select',
  'textarea',
  '[role="button"]',
  '[role="link"]',
  '[data-interactive="true"]',
  '.fc-event',
  '.fc-daygrid-day',
  '.fc-timegrid-slot',
].join(', ')

const resolveTierEnum = (tier: Tier | TierSlug): Tier => {
  return typeof tier === 'string' ? tierFromPlan(tier) : tier
}

const tierSlugFromEnum = (tier: Tier): TierSlug => {
  switch (tier) {
    case Tier.ULTIMATE:
      return 'ultimate'
    case Tier.PRO:
      return 'pro'
    case Tier.ESSENTIAL:
      return 'essential'
    default:
      return 'free'
  }
}

const formatTierLabel = (tier: Tier): string =>
  tierSlugFromEnum(tier).replace(/^./, (s) => s.toUpperCase())

export const FeaturePreview = ({
  children,
  featureKey,
  requiredTier,
  userTier,
  previewContent,
  showPreviewBadge = true,
  onInteractionBlocked,
}: FeaturePreviewProps) => {
  const { profile } = useAuth()
  const requirement = featureRequirements[featureKey]

  const activeSubscription = profile?.subscriptions?.find(
    (sub) => sub?.status === 'active',
  )
  const derivedTierSlug =
    normalizeTierSlug(profile?.plan) ??
    normalizeTierSlug(activeSubscription?.plan) ??
    'free'
  const derivedTierEnum = tierFromPlan(derivedTierSlug)

  const resolvedUserTier = useMemo(() => {
    return userTier ? resolveTierEnum(userTier) : derivedTierEnum
  }, [userTier, derivedTierEnum])

  const requiredTierEnum = useMemo(() => {
    if (requirement?.tier !== undefined) return requirement.tier
    if (requiredTier !== undefined) return resolveTierEnum(requiredTier)
    return Tier.PRO
  }, [requirement?.tier, requiredTier])

  const blocked = resolvedUserTier < requiredTierEnum
  const [paywallOpen, setPaywallOpen] = useState(false)
  const previewLoggedRef = useRef(false)
  const blockedRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previewLoggedRef.current = false
  }, [featureKey])

  useEffect(() => {
    const node = blockedRef.current
    if (!node) return
    if (blocked) {
      node.setAttribute('inert', '')
      node.setAttribute('aria-hidden', 'true')
    } else {
      node.removeAttribute('inert')
      node.removeAttribute('aria-hidden')
    }
  }, [blocked])

  useEffect(() => {
    if (blocked && !previewLoggedRef.current) {
      previewLoggedRef.current = true
      eventTracking.track('feature_preview.preview_loaded', {
        feature_key: featureKey,
        required_tier: formatTierLabel(requiredTierEnum),
        user_tier: formatTierLabel(resolvedUserTier),
      })
    }
  }, [blocked, featureKey, requiredTierEnum, resolvedUserTier])

  useEffect(() => {
    if (!paywallOpen) {
      previousFocusRef.current?.focus?.()
      return
    }

    previousFocusRef.current = document.activeElement as HTMLElement | null
    const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    if (focusable && focusable.length > 0) {
      focusable[0].focus()
    }
  }, [paywallOpen])

  const handleBlockedInteraction = useCallback(
    (event: React.SyntheticEvent, action: string) => {
      if (!blocked) return
      const target = event.target as HTMLElement | null
      if (!target || !target.closest(ACTIONABLE_SELECTOR)) return

      event.preventDefault()
      event.stopPropagation()
      setPaywallOpen(true)

      eventTracking.track('feature_preview.blocked_interaction', {
        feature_key: featureKey,
        action,
        required_tier: formatTierLabel(requiredTierEnum),
        user_tier: formatTierLabel(resolvedUserTier),
      })

      onInteractionBlocked?.({
        featureKey,
        action,
        requiredTier: requiredTierEnum,
        userTier: resolvedUserTier,
      })
    },
    [blocked, featureKey, onInteractionBlocked, requiredTierEnum, resolvedUserTier],
  )

  const handleKeyDownCapture = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      handleBlockedInteraction(event, 'keydown')
    },
    [handleBlockedInteraction],
  )

  const handleModalKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      setPaywallOpen(false)
      return
    }
    if (event.key !== 'Tab') return
    const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    if (!focusable || focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const active = document.activeElement
    if (event.shiftKey && active === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }, [])

  if (!blocked) return <>{children}</>

  const tierLabel = formatTierLabel(requiredTierEnum)
  const description = requirement?.description || 'Upgrade to unlock this premium workflow.'
  const content = previewContent ?? children

  return (
    <div
      className="feature-preview-wrapper is-blocked"
      data-feature-preview={featureKey}
      onClickCapture={(event) => handleBlockedInteraction(event, 'click')}
      onPointerDownCapture={(event) => handleBlockedInteraction(event, 'pointer')}
      onSubmitCapture={(event) => handleBlockedInteraction(event, 'submit')}
      onKeyDownCapture={handleKeyDownCapture}
    >
      <div className="feature-preview-overlay" aria-hidden="true" />
      {showPreviewBadge && (
        <div className="feature-preview-badge" aria-label="Premium feature">
          Premium
        </div>
      )}
      <div className="feature-preview-blocked" ref={blockedRef}>
        {content}
      </div>
      <Modal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        showHeader={false}
        contentRef={modalRef}
        onKeyDown={handleModalKeyDown}
      >
        <Paywall title="Upgrade Required" description={description} requiredTier={tierLabel} />
      </Modal>
    </div>
  )
}
