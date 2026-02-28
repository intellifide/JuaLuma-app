/*
 * Copyright (c) 2026 Intellifide, LLC.
 * Licensed under PolyForm Noncommercial License 1.0.0.
 * See "/legal/license" for full license terms.
 */

type RetryPolicy = {
  attempts?: number
  baseDelayMs?: number
  maxDelayMs?: number
}

type CachedPayload<T> = {
  value: T
  cachedAt: number
}

type RetryableError = {
  status?: number
  message?: string
}

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504])

const canUseLocalStorage = (): boolean => {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

const wait = async (delayMs: number): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, delayMs)
  })
}

const isLikelyTransientMessage = (message: string): boolean => {
  const lowered = message.toLowerCase()
  return (
    lowered.includes('network') ||
    lowered.includes('failed to fetch') ||
    lowered.includes('timeout') ||
    lowered.includes('temporarily unavailable')
  )
}

export const isRetryableError = (error: unknown): boolean => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return true
  }

  const retryable = error as RetryableError
  if (typeof retryable.status === 'number' && RETRYABLE_STATUS.has(retryable.status)) {
    return true
  }
  if (typeof retryable.message === 'string' && isLikelyTransientMessage(retryable.message)) {
    return true
  }
  return false
}

export const withRetry = async <T>(
  operation: () => Promise<T>,
  policy: RetryPolicy = {},
): Promise<T> => {
  const attempts = Math.max(1, policy.attempts ?? 3)
  const baseDelayMs = Math.max(50, policy.baseDelayMs ?? 300)
  const maxDelayMs = Math.max(baseDelayMs, policy.maxDelayMs ?? 2000)

  let attempt = 0
  let lastError: unknown = null

  while (attempt < attempts) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      attempt += 1

      if (attempt >= attempts || !isRetryableError(error)) {
        throw error
      }

      const delayMs = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1))
      await wait(delayMs)
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Retry attempts exhausted.')
}

export const readCachedValue = <T>(key: string, maxAgeMs: number): T | null => {
  if (!canUseLocalStorage()) return null

  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<CachedPayload<T>>
    if (typeof parsed.cachedAt !== 'number' || !('value' in parsed)) {
      return null
    }
    if (Date.now() - parsed.cachedAt > maxAgeMs) {
      return null
    }
    return parsed.value as T
  } catch {
    return null
  }
}

export const writeCachedValue = <T>(key: string, value: T): void => {
  if (!canUseLocalStorage()) return

  const payload: CachedPayload<T> = {
    value,
    cachedAt: Date.now(),
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(payload))
  } catch {
    // Ignore local cache persistence failures.
  }
}
