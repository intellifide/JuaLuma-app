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

/**
 * CORE PURPOSE: Authentication service using Firebase Client SDK and custom Backend API.
 * LAST MODIFIED: 2025-12-21 17:15 CST
 */
import { FirebaseError } from 'firebase/app'
import {
  User,
  createUserWithEmailAndPassword,
  deleteUser,
  confirmPasswordReset as firebaseConfirmPasswordReset,
  verifyPasswordResetCode as firebaseVerifyPasswordResetCode,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { auth } from './firebase'
import { AgreementAcceptanceInput } from '../types/legal'

export interface UserSessionData {
  id: string
  uid: string
  iat: number
  ip_address: string | null
  user_agent: string | null
  device_type: string | null
  location: string | null
  is_active: boolean
  created_at: string
  last_active: string
  is_current: boolean
}

export type MfaMethod = 'totp' | 'passkey'

export class MfaRequiredError extends Error {
  method: MfaMethod

  constructor(method: MfaMethod) {
    super(method === 'passkey' ? 'MFA_PASSKEY_REQUIRED' : 'MFA_REQUIRED')
    this.name = 'MfaRequiredError'
    this.method = method
  }
}

type ApiRequestInit = RequestInit & { skipAuth?: boolean; throwOnError?: boolean }

const TOKEN_MAX_AGE_MS = 4 * 60 * 1000 // refresh cached token every 4 minutes
let cachedToken: string | null = null
let lastTokenAt = 0

const mapFirebaseError = (error: unknown): string => {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/invalid-email':
        return 'Please use a valid email address.'
      case 'auth/weak-password':
        return 'Password must meet the strength requirements.'
      case 'auth/email-already-in-use':
        return 'This email is already registered.'
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
        return 'Invalid credentials. Please try again.'
      case 'auth/user-not-found':
        return 'Account not found. Please sign up first.'
      case 'auth/expired-action-code':
        return 'This reset link has expired. Request a new one.'
      case 'auth/invalid-action-code':
        return 'This reset link is invalid. Request a new one.'
      case 'auth/user-disabled':
        return 'This account is disabled. Please contact support.'
      default:
        return 'Something went wrong with authentication. Try again.'
    }
  }

  return 'Unexpected authentication error. Please retry.'
}

export const signup = async (
  email: string,
  password: string,
  agreements: AgreementAcceptanceInput[] = [],
  first_name?: string,
  last_name?: string,
  username?: string,
): Promise<User> => {
  try {
    // 1. Create user in Firebase Client SDK (establishes session)
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    clearCachedToken()

    // 2. Store pending signup details in backend (no full DB user yet)
    await getIdToken(true)
    await apiFetch('/auth/signup/pending', {
      method: 'POST',
      body: JSON.stringify({
        agreements,
        first_name,
        last_name,
        username,
      }),
    })

    return credential.user
  } catch (error) {
    // Best effort cleanup if backend fails after Firebase user creation
    if (auth.currentUser) {
      try {
        await deleteUser(auth.currentUser)
      } catch (cleanupError) {
        console.error('Failed to cleanup Firebase user after signup failure:', cleanupError)
      } finally {
        clearCachedToken()
      }
    }

    if (error instanceof Error && !(error instanceof FirebaseError)) {
      throw error // Re-throw backend errors as-is
    }
    throw new Error(mapFirebaseError(error))
  }
}

export const login = async (email: string, password: string): Promise<User> => {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password)
    clearCachedToken()
    return credential.user
  } catch (error) {
    throw new Error(mapFirebaseError(error))
  }
}

export const completeBackendLogin = async (
  token: string,
  mfa_code?: string,
  passkey_assertion?: Record<string, unknown>,
): Promise<void> => {
  const response = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ token, mfa_code, passkey_assertion }),
    skipAuth: true,
    throwOnError: false,
  })

  if (response.ok) {
    // Keep shared token cache aligned with the token that just completed backend login.
    // This prevents API clients from continuing to send a pre-MFA token.
    cachedToken = token
    lastTokenAt = Date.now()
    return
  }

  const data = await response.json().catch(() => null)
  const detail = data?.detail || data?.message
  if (response.status === 403 && detail === 'MFA_PASSKEY_REQUIRED') {
    clearCachedToken()
    try {
      window.dispatchEvent(
        new CustomEvent('mfa-required', { detail: { reason: detail } }),
      )
    } catch {
      // no-op (SSR/tests)
    }
    throw new MfaRequiredError('passkey')
  }
  if (response.status === 403 && detail === 'MFA_REQUIRED') {
    clearCachedToken()
    try {
      window.dispatchEvent(
        new CustomEvent('mfa-required', { detail: { reason: detail } }),
      )
    } catch {
      // no-op (SSR/tests)
    }
    throw new MfaRequiredError('totp')
  }

  const fallback = `Request failed with status ${response.status}`
  throw new Error((detail as string) || fallback)
}

export const logout = async (): Promise<void> => {
  try {
    await apiFetch('/auth/logout', { method: 'POST' })
  } catch (error) {
    console.error('Backend logout failed:', error)
  }
  await signOut(auth)
  clearCachedToken()
}

export type ResetPasswordStatus = 'mfa_required' | 'sent'

export const resetPassword = async (
  email: string,
  mfa_code?: string,
  passkey_assertion?: Record<string, unknown>,
): Promise<ResetPasswordStatus> => {
  try {
    // 2025-12-19: Call backend to enforce MFA check if enabled
    const response = await apiFetch('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, mfa_code, passkey_assertion }),
      skipAuth: true,
    })
    const data = await response.json().catch(() => null)
    if (data?.message === 'MFA_REQUIRED' || data?.message === 'MFA_PASSKEY_REQUIRED') {
      return 'mfa_required'
    }
    return 'sent'
  } catch (error) {
    if (error instanceof Error) throw error
    throw new Error(mapFirebaseError(error))
  }
}

export const changePassword = async (
  current_password: string,
  new_password: string,
  mfa_code?: string,
  passkey_assertion?: Record<string, unknown>
): Promise<void> => {
  await apiFetch('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ current_password, new_password, mfa_code, passkey_assertion }),
  })

}

export const requestEmailCode = async (email: string): Promise<void> => {
  await apiFetch('/auth/mfa/email/request-code', {
    method: 'POST',
    body: JSON.stringify({ email }),
    skipAuth: true,
  })
}

export const verifyResetPasswordCode = async (oobCode: string): Promise<string> => {
  try {
    return await firebaseVerifyPasswordResetCode(auth, oobCode)
  } catch (error) {
    throw new Error(mapFirebaseError(error))
  }
}

export const confirmResetPassword = async (
  oobCode: string,
  newPassword: string,
): Promise<void> => {
  try {
    await firebaseConfirmPasswordReset(auth, oobCode, newPassword)
  } catch (error) {
    throw new Error(mapFirebaseError(error))
  }
}

export const verifyEmailCode = async (code: string): Promise<void> => {
  await apiFetch('/auth/mfa/email/enable', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
}

export const getPasskeyAuthOptions = async (token: string): Promise<Record<string, unknown>> => {
  const response = await apiFetch('/auth/mfa/passkey/auth/options', {
    method: 'POST',
    body: JSON.stringify({ token }),
    skipAuth: true,
  })
  return response.json()
}

export const getPasskeyRegistrationOptions = async (
  mfa_code?: string,
  passkey_assertion?: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  const response = await apiFetch('/auth/mfa/passkey/register/options', {
    method: 'POST',
    body: JSON.stringify({ mfa_code, passkey_assertion }),
  })
  return response.json()
}

export const verifyPasskeyRegistration = async (
  credential: Record<string, unknown>,
  mfa_code?: string,
  passkey_assertion?: Record<string, unknown>,
): Promise<void> => {
  await apiFetch('/auth/mfa/passkey/register/verify', {
    method: 'POST',
    body: JSON.stringify({ credential, mfa_code, passkey_assertion }),
  })
}

export const setupAuthenticator = async (
  mfa_code?: string,
  passkey_assertion?: Record<string, unknown>,
): Promise<{ secret: string; otpauth_url: string }> => {
  const response = await apiFetch('/auth/mfa/setup', {
    method: 'POST',
    body: JSON.stringify({ mfa_code, passkey_assertion }),
  })
  return response.json()
}

export const enableAuthenticator = async (code: string): Promise<void> => {
  await apiFetch('/auth/mfa/enable', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
}

export const disableMfa = async (
  code?: string,
  passkey_assertion?: Record<string, unknown>,
): Promise<void> => {
  await apiFetch('/auth/mfa/disable', {
    method: 'POST',
    body: JSON.stringify({ code, passkey_assertion }),
  })
}

export const setMfaLabel = async (
  method: 'totp' | 'passkey',
  label: string,
  code?: string,
  passkey_assertion?: Record<string, unknown>,
): Promise<{ user?: Record<string, unknown> }> => {
  const response = await apiFetch('/auth/mfa/label', {
    method: 'POST',
    body: JSON.stringify({ method, label, code, passkey_assertion }),
  })
  return response.json()
}

export const setPrimaryMfaMethod = async (
  method: 'totp' | 'passkey',
  code?: string,
  passkey_assertion?: Record<string, unknown>,
): Promise<{ user?: Record<string, unknown> }> => {
  const response = await apiFetch('/auth/mfa/primary', {
    method: 'POST',
    body: JSON.stringify({ method, code, passkey_assertion }),
  })
  return response.json()
}

export const selectFreePlan = async (): Promise<void> => {
  await apiFetch('/billing/plans/free', {
    method: 'POST',
  })
}

export const listSessions = async (): Promise<UserSessionData[]> => {
  const response = await apiFetch('/auth/sessions')
  return response.json()
}

export const endSession = async (sessionId: string): Promise<void> => {
  await apiFetch(`/auth/sessions/${sessionId}`, {
    method: 'DELETE',
  })
}

export const endOtherSessions = async (): Promise<void> => {
  await apiFetch('/auth/sessions', {
    method: 'DELETE',
  })
}

export const getIdToken = async (forceRefresh = false): Promise<string | null> => {
  const user = auth.currentUser
  if (!user) {
    clearCachedToken()
    return null
  }

  const shouldRefresh =
    forceRefresh || !cachedToken || Date.now() - lastTokenAt > TOKEN_MAX_AGE_MS

  if (shouldRefresh) {
    const token = await user.getIdToken(forceRefresh)
    cachedToken = token
    lastTokenAt = Date.now()
  }

  return cachedToken
}

export const refreshToken = async (): Promise<string | null> => {
  return getIdToken(true)
}

export const clearCachedToken = (): void => {
  cachedToken = null
  lastTokenAt = 0
}

const buildUrl = (path: string): string => {
  if (path.startsWith('http')) return path
  if (!path.startsWith('/')) return `/api/${path}`
  return `/api${path}`
}

export const apiFetch = async (
  path: string,
  init: ApiRequestInit = {},
): Promise<Response> => {
  const headers = new Headers(init.headers || {})
  const isJsonBody =
    init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')

  if (isJsonBody) {
    headers.set('Content-Type', 'application/json')
  }

  if (!init.skipAuth) {
    const token = await getIdToken()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  const url = buildUrl(path)

  const response = await fetch(url, {
    ...init,
    headers,
  })

  if (!response.ok && init.throwOnError !== false) {
    const maybeJson = await response.clone().json().catch(() => null)
    let message =
      (maybeJson && (maybeJson.detail || maybeJson.message || maybeJson.error)) ||
      `Request failed with status ${response.status}`
    if (!maybeJson) {
      const text = await response.text().catch(() => '')
      if (text) {
        message = text
      }
    }

    // Central MFA gating signal: when the backend requires MFA verification for the
    // current session, notify the app shell so it can prompt once, then unblock.
    if (response.status === 403 && (message === 'MFA_REQUIRED' || message === 'MFA_PASSKEY_REQUIRED')) {
      clearCachedToken()
      try {
        window.dispatchEvent(
          new CustomEvent('mfa-required', { detail: { reason: message } }),
        )
      } catch {
        // no-op (SSR/tests)
      }
      // Don't rely on generic Error(message) for control flow.
      throw new MfaRequiredError(message === 'MFA_PASSKEY_REQUIRED' ? 'passkey' : 'totp')
    }
    throw new Error(message as string)
  }

  return response
}
