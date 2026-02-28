import { describe, expect, it } from 'vitest'
import { extractAppRouteFromDeepLink } from './deepLinkRouting'

describe('extractAppRouteFromDeepLink', () => {
  it('maps allowed https deep links to app routes', () => {
    const route = extractAppRouteFromDeepLink('https://app.jualuma.com/verify-email?token=abc123')
    expect(route).toBe('/verify-email?token=abc123')
  })

  it('maps custom scheme links with host and nested path', () => {
    const route = extractAppRouteFromDeepLink('jualuma://household/accept-invite?token=invite123')
    expect(route).toBe('/household/accept-invite?token=invite123')
  })

  it('maps custom scheme links with host only', () => {
    const route = extractAppRouteFromDeepLink('jualuma://login?next=%2Fdashboard')
    expect(route).toBe('/login?next=%2Fdashboard')
  })

  it('rejects unknown web hosts', () => {
    const route = extractAppRouteFromDeepLink('https://example.com/reset-password?token=abc123')
    expect(route).toBeNull()
  })
})
