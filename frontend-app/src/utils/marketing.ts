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

const DEFAULT_LOCAL_MARKETING_ORIGIN = 'http://localhost:5177'
const DEFAULT_MARKETING_ORIGIN = 'https://marketing-site-77ybfmw7cq-uc.a.run.app'

const normalizeOrigin = (origin: string): string => origin.trim().replace(/\/$/, '')

const deriveMarketingHostname = (hostname: string): string | null => {
  if (hostname.startsWith('frontend-app-')) {
    return `marketing-site-${hostname.slice('frontend-app-'.length)}`
  }
  if (hostname.startsWith('support-portal-')) {
    return `marketing-site-${hostname.slice('support-portal-'.length)}`
  }
  if (hostname.startsWith('jualuma-user-app-stage-')) {
    return `jualuma-marketing-stage-${hostname.slice('jualuma-user-app-stage-'.length)}`
  }
  if (hostname.startsWith('jualuma-support-stage-')) {
    return `jualuma-marketing-stage-${hostname.slice('jualuma-support-stage-'.length)}`
  }
  if (hostname.startsWith('jualuma-user-app-')) {
    return `jualuma-marketing-${hostname.slice('jualuma-user-app-'.length)}`
  }
  if (hostname.startsWith('jualuma-support-')) {
    return `jualuma-marketing-${hostname.slice('jualuma-support-'.length)}`
  }
  return null
}

export const getMarketingSiteUrl = (): string => {
  const env = (import.meta as any).env || {}
  const configured = env.VITE_MARKETING_SITE_URL || env.VITE_MARKETING_URL
  if (configured) {
    return normalizeOrigin(configured)
  }

  if (typeof window === 'undefined') {
    return DEFAULT_MARKETING_ORIGIN
  }

  if (window.location.hostname === 'localhost') {
    return DEFAULT_LOCAL_MARKETING_ORIGIN
  }

  const derivedHostname = deriveMarketingHostname(window.location.hostname)
  if (derivedHostname) {
    return `${window.location.protocol}//${derivedHostname}`
  }

  return DEFAULT_MARKETING_ORIGIN
}

export const getMarketingLegalUrl = (path: 'privacy' | 'terms'): string =>
  new URL(`/legal/${path}`, getMarketingSiteUrl()).toString()
