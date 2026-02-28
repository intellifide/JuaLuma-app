/*
 * Copyright (c) 2026 Intellifide, LLC.
 * Licensed under PolyForm Noncommercial License 1.0.0.
 * See "/legal/license" for full license terms.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { trackMock, getPlatformMock } = vi.hoisted(() => ({
  trackMock: vi.fn(),
  getPlatformMock: vi.fn(() => 'web'),
}))

vi.mock('./eventTracking', () => ({
  eventTracking: {
    track: trackMock,
  },
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: getPlatformMock,
  },
  registerPlugin: vi.fn(() => ({
    consumePendingCrashReport: vi.fn().mockResolvedValue({ report: null }),
    recordBreadcrumb: vi.fn().mockResolvedValue(undefined),
  })),
}))

import { initializeClientObservability } from './clientObservability'

describe('clientObservability', () => {
  beforeEach(() => {
    trackMock.mockClear()
    getPlatformMock.mockReturnValue('web')
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
  })

  it('tracks runtime bootstrap event on initialization', async () => {
    const dispose = await initializeClientObservability()

    expect(trackMock).toHaveBeenCalledWith(
      'client_observability',
      expect.objectContaining({
        category: 'runtime_boot',
        severity: 'info',
      }),
    )

    dispose()
  })

  it('captures window error events with structured category', async () => {
    const dispose = await initializeClientObservability()

    window.dispatchEvent(new ErrorEvent('error', { message: 'boom', error: new Error('boom') }))

    expect(trackMock).toHaveBeenCalledWith(
      'client_observability',
      expect.objectContaining({
        category: 'window_error',
        severity: 'error',
      }),
    )

    dispose()
  })
})
