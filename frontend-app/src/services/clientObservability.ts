/*
 * Copyright (c) 2026 Intellifide, LLC.
 * Licensed under PolyForm Noncommercial License 1.0.0.
 * See "/legal/license" for full license terms.
 */

import { Capacitor, registerPlugin } from '@capacitor/core'
import { eventTracking } from './eventTracking'

type Severity = 'debug' | 'info' | 'warn' | 'error' | 'fatal'
type PrimitiveValue = string | number | boolean | undefined

type NativeCrashReport = {
  capturedAt?: string
  capturedAtMs?: number
  platform?: string
  message?: string
  reason?: string
  exceptionType?: string
  name?: string
  threadName?: string
  stackTrace?: string
}

interface NativeObservabilityPlugin {
  consumePendingCrashReport(): Promise<{ report?: NativeCrashReport | null }>
  recordBreadcrumb(options: {
    severity: Severity
    category: string
    message: string
    attributes?: string
  }): Promise<void>
}

const NativeObservability = registerPlugin<NativeObservabilityPlugin>('NativeObservability')
const isNativeRuntime = (): boolean => Capacitor.getPlatform() !== 'web'

let initialized = false

const flattenContext = (context?: Record<string, unknown>): Record<string, PrimitiveValue> => {
  if (!context) return {}
  const flattened: Record<string, PrimitiveValue> = {}
  for (const [key, value] of Object.entries(context)) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      flattened[`ctx_${key}`] = value
      continue
    }
    if (value !== null && value !== undefined) {
      flattened[`ctx_${key}`] = String(value)
    }
  }
  return flattened
}

const safeMessage = (value: unknown, fallback = 'Unknown client error'): string => {
  if (value instanceof Error) {
    return value.message || fallback
  }
  if (typeof value === 'string' && value.trim()) {
    return value
  }
  if (typeof value === 'object' && value !== null) {
    try {
      return JSON.stringify(value)
    } catch {
      return fallback
    }
  }
  return fallback
}

const safeStack = (value: unknown): string | undefined => {
  if (value instanceof Error && typeof value.stack === 'string' && value.stack.trim()) {
    return value.stack.slice(0, 3000)
  }
  return undefined
}

const buildBaseContext = (): Record<string, unknown> => {
  return {
    app_env: import.meta.env.MODE,
    platform: Capacitor.getPlatform(),
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    path: typeof window !== 'undefined' ? window.location.pathname : '',
  }
}

const emitObservabilityEvent = async (
  category: string,
  severity: Severity,
  message: string,
  context?: Record<string, unknown>,
): Promise<void> => {
  const fullContext = {
    ...buildBaseContext(),
    ...(context ?? {}),
  }
  const payload = {
    category,
    severity,
    message,
    captured_at: new Date().toISOString(),
    ...flattenContext(fullContext),
  }

  if (severity === 'error' || severity === 'fatal') {
    console.error('[ClientObservability]', payload)
  } else if (severity === 'warn') {
    console.warn('[ClientObservability]', payload)
  } else {
    console.info('[ClientObservability]', payload)
  }

  eventTracking.track('client_observability', payload)

  if (isNativeRuntime()) {
    try {
      await NativeObservability.recordBreadcrumb({
        severity,
        category,
        message,
        attributes: JSON.stringify(flattenContext(fullContext)),
      })
    } catch {
      // Native bridge failures should not affect app runtime.
    }
  }
}

const captureNativePendingCrash = async (): Promise<void> => {
  if (!isNativeRuntime()) return

  try {
    const response = await NativeObservability.consumePendingCrashReport()
    const report = response.report
    if (!report) return

    await emitObservabilityEvent(
      'native_crash_recovered',
      'fatal',
      report.message ?? report.reason ?? 'Recovered pending native crash report.',
      {
        native_platform: report.platform,
        native_exception_name: report.name,
        native_exception_type: report.exceptionType,
        native_thread: report.threadName,
        native_captured_at: report.capturedAt,
        native_captured_at_ms: report.capturedAtMs,
        native_stack: report.stackTrace,
      },
    )
  } catch {
    // Ignore plugin availability issues for web runtime or older app builds.
  }
}

export const initializeClientObservability = async (): Promise<() => void> => {
  if (initialized) {
    return () => undefined
  }
  initialized = true

  const handleWindowError = (event: ErrorEvent): void => {
    void emitObservabilityEvent(
      'window_error',
      'error',
      safeMessage(event.error ?? event.message),
      {
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: safeStack(event.error),
      },
    )
  }

  const handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
    void emitObservabilityEvent(
      'unhandled_rejection',
      'error',
      safeMessage(event.reason, 'Unhandled promise rejection'),
      {
        stack: safeStack(event.reason),
      },
    )
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('error', handleWindowError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
  }

  await captureNativePendingCrash()
  await emitObservabilityEvent('runtime_boot', 'info', 'Client observability initialized.')

  return () => {
    initialized = false
    if (typeof window !== 'undefined') {
      window.removeEventListener('error', handleWindowError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }
}
