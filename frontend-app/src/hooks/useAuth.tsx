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

// Core Purpose: Provide authentication context and profile state.
// Last Updated: 2026-01-23 22:39 CST
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { User, onAuthStateChanged } from 'firebase/auth'
import { useLocation, useNavigate } from 'react-router-dom'
import { auth } from '../services/firebase'
import {
  apiFetch,
  clearCachedToken,
  completeBackendLogin,
  getIdToken,
  getPasskeyAuthOptions,
  login as loginWithFirebase,
  logout as logoutWithFirebase,
  resetPassword as resetPasswordWithFirebase,
  ResetPasswordStatus,
  signup as signupWithFirebase,
} from '../services/auth'
import { getPasskeyAssertion } from '../services/passkey'
import { AgreementAcceptanceInput } from '../types/legal'

type Subscription = {
  id?: string
  plan?: string
  status?: string
  renew_at?: string | null
  ai_quota_used?: number | null
  created_at?: string
  updated_at?: string
}

type NotificationPreference = {
  id?: string
  event_key?: string
  channel_email?: boolean
  channel_sms?: boolean
  created_at?: string
  updated_at?: string
}

export type HouseholdMemberProfile = {
  uid: string
  household_id: string
  role: string
  can_view_household: boolean
  ai_access_enabled: boolean
}

export type UserProfile = {
  uid?: string
  email?: string
  role?: string
  status?: string
  plan?: string
  subscription_status?: string
  theme_pref?: string | null
  currency_pref?: string | null
  time_zone?: string | null
  first_name?: string | null
  last_name?: string | null
  username?: string | null
  display_name_pref?: string | null
  phone_number?: string | null
  mfa_enabled?: boolean
  mfa_method?: string | null
  totp_enabled?: boolean
  totp_label?: string | null
  passkey_enabled?: boolean
  passkey_label?: string | null
  subscriptions?: Subscription[]
  household_member?: HouseholdMemberProfile | null
  ai_settings?: Record<string, unknown> | null
  notification_preferences?: NotificationPreference[]
  [key: string]: unknown
}

type AuthContextValue = {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  profileLoading: boolean
  error: string | null
  signup: (
    email: string,
    password: string,
    agreements?: AgreementAcceptanceInput[],
    first_name?: string,
    last_name?: string,
    username?: string,
  ) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  completeLoginMfa?: (mfa_code?: string, passkey_assertion?: Record<string, unknown>) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (
    email: string,
    mfa_code?: string,
    passkey_assertion?: Record<string, unknown>,
  ) => Promise<ResetPasswordStatus>
  refetchProfile: () => Promise<UserProfile | null>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mfaGateOpen, setMfaGateOpen] = useState(false)
  const [mfaGateMethod, setMfaGateMethod] = useState<'totp' | 'passkey'>('totp')
  const [mfaGateCode, setMfaGateCode] = useState('')
  const [mfaGateWorking, setMfaGateWorking] = useState(false)

  const refetchProfile = useCallback(async (): Promise<UserProfile | null> => {
    if (!auth.currentUser) {
      setProfile(null)
      return null
    }

    setProfileLoading(true)
    try {
      const response = await apiFetch('/auth/profile')
      const data = await response.json()
      setProfile(data.user ?? null)
      return data.user ?? null
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to load profile right now.'
      setError(message)
      return null
    } finally {
      setProfileLoading(false)
    }
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser)
      setError(null)

      if (nextUser) {
        // Clear any stale profile while re-establishing backend auth for this session.
        setProfile(null)
        // Prevent infinite loading if backend is unreachable
        const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 5000))
        await Promise.race([refetchProfile(), timeoutPromise])
      } else {
        clearCachedToken()
        setProfile(null)
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [refetchProfile])

  useEffect(() => {
    const handler = (event: Event) => {
      // Only gate if the user is signed in; otherwise normal 401 handling should occur.
      if (!auth.currentUser) return
      if (mfaGateOpen) return

      const detail = (event as CustomEvent).detail as { reason?: string } | undefined
      const reason = detail?.reason
      const primary = profile?.mfa_method === 'passkey' ? 'passkey' : 'totp'
      // Middleware uses MFA_REQUIRED for all methods; prefer primary from profile.
      const method =
        reason === 'MFA_PASSKEY_REQUIRED' ? 'passkey' : primary

      setMfaGateMethod(method)
      setMfaGateCode('')
      setMfaGateOpen(true)
    }

    window.addEventListener('mfa-required', handler as EventListener)
    return () => window.removeEventListener('mfa-required', handler as EventListener)
  }, [mfaGateOpen, profile?.mfa_method])

  const signup = useCallback(
    async (
      email: string, 
      password: string, 
      agreements: AgreementAcceptanceInput[] = [],
      first_name?: string,
      last_name?: string,
      username?: string,
    ) => {
      setError(null)
      setLoading(true)
      try {
        await signupWithFirebase(email, password, agreements, first_name, last_name, username)
        await refetchProfile()
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unable to sign up right now.'
        setError(message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [refetchProfile],
  )

  const login = useCallback(
    async (email: string, password: string) => {
      setError(null)
      setLoading(true)
    try {
      await loginWithFirebase(email, password)
      const token = await getIdToken(true)
      if (!token) {
        throw new Error('Unable to establish a secure session token.')
      }
      await completeBackendLogin(token)
      await refetchProfile()
      const uid = auth.currentUser?.uid
      const welcomeKey = uid ? `jualuma_welcome_back_${uid}` : 'jualuma_welcome_back'
      sessionStorage.setItem(welcomeKey, 'true')
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to log in right now.'
        setError(message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [refetchProfile],
  )

  const completeLoginMfa = useCallback(
    async (mfa_code?: string, passkey_assertion?: Record<string, unknown>) => {
      setError(null)
      if (!auth.currentUser) {
        throw new Error('Please sign in again to continue.')
      }
      const token = await getIdToken(true)
      if (!token) {
        throw new Error('Unable to establish a secure session token.')
      }
      await completeBackendLogin(token, mfa_code, passkey_assertion)
      await refetchProfile()
    },
    [refetchProfile],
  )

  const completeMfaGate = useCallback(async () => {
    if (!auth.currentUser) {
      throw new Error('Please sign in again to continue.')
    }
    setMfaGateWorking(true)
    try {
      if (mfaGateMethod === 'passkey') {
        const token = await getIdToken(true)
        if (!token) {
          throw new Error('Session expired. Please sign in again.')
        }
        const options = await getPasskeyAuthOptions(token)
        const assertion = await getPasskeyAssertion(options)
        await completeBackendLogin(token, undefined, assertion)
      } else {
        const code = mfaGateCode.trim()
        if (!code) {
          throw new Error('Enter your authenticator code to continue.')
        }
        const token = await getIdToken(true)
        if (!token) {
          throw new Error('Session expired. Please sign in again.')
        }
        await completeBackendLogin(token, code, undefined)
      }
      await refetchProfile()
      setMfaGateOpen(false)
      setMfaGateCode('')
      if (location.pathname === '/login') {
        const params = new URLSearchParams(location.search)
        const returnUrl = params.get('returnUrl') || '/dashboard'
        navigate(returnUrl, { replace: true })
      }
    } finally {
      setMfaGateWorking(false)
    }
  }, [location.pathname, location.search, mfaGateCode, mfaGateMethod, navigate, refetchProfile])

  const logout = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      await logoutWithFirebase()
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const resetPassword = useCallback(
    async (email: string, mfa_code?: string, passkey_assertion?: Record<string, unknown>) => {
    setError(null)
    try {
      return await resetPasswordWithFirebase(email, mfa_code, passkey_assertion)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to reset password.'
      setError(message)
      throw err
    }
    },
    [],
  )

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      profileLoading,
      error,
      signup,
      login,
      completeLoginMfa,
      logout,
      resetPassword,
      refetchProfile,
    }),
    [user, profile, loading, profileLoading, error, signup, login, completeLoginMfa, logout, resetPassword, refetchProfile],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
      {mfaGateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay">
          <div className="modal-content max-w-md">
            <div className="modal-header">
              <h3>Verify to continue</h3>
              <button
                onClick={() => {
                  if (mfaGateWorking) return
                  setMfaGateOpen(false)
                  void logout()
                }}
                className="modal-close"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <div>
              <p className="mb-4 text-text-secondary">
                Two-factor authentication is enabled. Verify once to access your account.
              </p>
              {mfaGateMethod === 'totp' ? (
                <div className="mb-6">
                  <label htmlFor="mfa-gate-code" className="form-label">
                    Authenticator code
                  </label>
                  <input
                    id="mfa-gate-code"
                    className="input"
                    type="text"
                    inputMode="numeric"
                    value={mfaGateCode}
                    onChange={(e) => setMfaGateCode(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                    autoFocus
                  />
                </div>
              ) : (
                <p className="mb-6 text-text-secondary">
                  Continue to verify with your passkey.
                </p>
              )}
              <div className="flex gap-4">
                <button
                  type="button"
                  className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => void completeMfaGate().catch((e) => setError(e instanceof Error ? e.message : 'Unable to verify.'))}
                  disabled={mfaGateWorking}
                >
                  {mfaGateWorking
                    ? 'Verifying...'
                    : mfaGateMethod === 'passkey'
                      ? 'Verify with Passkey'
                      : 'Verify'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline flex-1"
                  onClick={() => {
                    setMfaGateOpen(false)
                    void logout()
                  }}
                  disabled={mfaGateWorking}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
