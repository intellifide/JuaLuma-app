/*
 * Copyright (c) 2026 Intellifide, LLC.
 * Licensed under PolyForm Noncommercial License 1.0.0.
 * See "/legal/license" for full license terms.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { readCachedValue, withRetry, writeCachedValue } from './mobileDataResilience'

describe('mobileDataResilience cache helpers', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('persists and reads cached values within max age', () => {
    writeCachedValue('cache-key', { sample: true })
    const value = readCachedValue<{ sample: boolean }>('cache-key', 1000)
    expect(value).toEqual({ sample: true })
  })

  it('returns null when cached value is older than max age', () => {
    vi.spyOn(Date, 'now')
      .mockReturnValueOnce(1_000)
      .mockReturnValueOnce(5_000)
    writeCachedValue('cache-key', { sample: true })
    const value = readCachedValue<{ sample: boolean }>('cache-key', 1000)
    expect(value).toBeNull()
  })
})

describe('mobileDataResilience retry helper', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('retries transient failures and eventually resolves', async () => {
    vi.useFakeTimers()
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(Object.assign(new Error('Service unavailable'), { status: 503 }))
      .mockRejectedValueOnce(Object.assign(new Error('Network timeout'), { status: 503 }))
      .mockResolvedValueOnce('ok')

    const resultPromise = withRetry(operation, {
      attempts: 3,
      baseDelayMs: 10,
      maxDelayMs: 25,
    })

    await vi.runAllTimersAsync()
    await expect(resultPromise).resolves.toBe('ok')
    expect(operation).toHaveBeenCalledTimes(3)
  })

  it('does not retry non-transient failures', async () => {
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValue(Object.assign(new Error('Bad request'), { status: 400 }))

    await expect(
      withRetry(operation, {
        attempts: 3,
        baseDelayMs: 10,
      }),
    ).rejects.toThrow('Bad request')

    expect(operation).toHaveBeenCalledTimes(1)
  })
})
