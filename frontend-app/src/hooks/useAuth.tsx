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

// Core Purpose: Provide authentication context and profile state.
// Last Updated: 2026-01-23 22:39 CST
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { User, onAuthStateChanged, auth } from '../services/gcp_auth_driver'
import {
  apiFetch,
  clearCachedToken,
  completeBackendLogin,
  getIdToken,
  getPasskeyAuthOptions,
  login as loginWithAuth,
  logout as logoutWithAuth,
  resetPassword as resetPasswordWithAuth,
  ResetPasswordStatus,
  signup as signupWithAuth,
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
const LOCAL_AUTH_BYPASS_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0'])

const isLocalAuthBypassEnabled = (): boolean => {
  if (!import.meta.env.DEV) return false
  if (import.meta.env.VITE_LOCAL_AUTH_BYPASS !== 'true') return false
  const hostname = window.location.hostname
  return LOCAL_AUTH_BYPASS_HOSTS.has(hostname)
}

const buildLocalBypassUser = (): User => ({
  uid: 'local-dev-user',
  email: 'local-dev@localhost',
  emailVerified: true,
  displayName: 'Local Dev User',
  isAnonymous: false,
  getIdToken: async () => 'local-dev-token',
})

const LOCAL_BYPASS_PROFILE: UserProfile = {
  uid: 'local-dev-user',
  email: 'local-dev@localhost',
  role: 'owner',
  status: 'active',
  plan: 'pro',
  subscription_status: 'active',
  first_name: 'Local',
  last_name: 'Dev',
  username: 'local-dev-user',
  display_name_pref: 'username',
  mfa_enabled: false,
}
const LOCAL_BYPASS_USER = buildLocalBypassUser()
const PROFILE_RETRY_DELAY_MS = 5000
const PROFILE_RATE_LIMIT_RETRY_DELAY_MS = 30000

const getApiErrorStatus = (error: unknown): number | null => {
  const status = (error as { status?: unknown })?.status
  if (typeof status === 'number') return status
  return null
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const localAuthBypassEnabled = isLocalAuthBypassEnabled()
  const [user, setUser] = useState<User | null>(localAuthBypassEnabled ? LOCAL_BYPASS_USER : null)
  const [profile, setProfile] = useState<UserProfile | null>(localAuthBypassEnabled ? LOCAL_BYPASS_PROFILE : null)
  const [loading, setLoading] = useState(!localAuthBypassEnabled)
  const [profileLoading, setProfileLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mfaGateOpen, setMfaGateOpen] = useState(false)
  const [mfaGateMethod, setMfaGateMethod] = useState<'totp' | 'passkey'>('totp')
  const [mfaGateCode, setMfaGateCode] = useState('')
  const [mfaGateWorking, setMfaGateWorking] = useState(false)
  const currentProfileUidRef = useRef<string | null>(localAuthBypassEnabled ? LOCAL_BYPASS_PROFILE.uid ?? null : null)
  const profileFetchInFlightRef = useRef<Promise<UserProfile | null> | null>(null)
  const profileRetryAtRef = useRef(0)

  const refetchProfile = useCallback(async (): Promise<UserProfile | null> => {
    if (localAuthBypassEnabled) {
      setProfile(LOCAL_BYPASS_PROFILE)
      currentProfileUidRef.current = LOCAL_BYPASS_PROFILE.uid ?? null
      profileRetryAtRef.current = 0
      return LOCAL_BYPASS_PROFILE
    }

    if (!auth.currentUser) {
      setProfile(null)
      currentProfileUidRef.current = null
      profileRetryAtRef.current = 0
      return null
    }

    if (profileFetchInFlightRef.current) {
      return profileFetchInFlightRef.current
    }

    if (Date.now() < profileRetryAtRef.current) {
      return null
    }

    const fetchPromise = (async (): Promise<UserProfile | null> => {
      setProfileLoading(true)
      try {
        const response = await apiFetch('/auth/profile')
        const data = await response.json()
        const nextProfile = data.user ?? null
        setProfile(nextProfile)
        currentProfileUidRef.current =
          typeof nextProfile?.uid === 'string' ? nextProfile.uid : null
        profileRetryAtRef.current = 0
        setError(null)
        return nextProfile
      } catch (err) {
        const status = getApiErrorStatus(err)
        if (status === 429) {
          profileRetryAtRef.current = Date.now() + PROFILE_RATE_LIMIT_RETRY_DELAY_MS
        } else if (status === 404) {
          profileRetryAtRef.current = Date.now() + PROFILE_RETRY_DELAY_MS
        } else {
          profileRetryAtRef.current = 0
        }

        const message =
          err instanceof Error ? err.message : 'Unable to load profile right now.'
        setError(message)
        return null
      } finally {
        setProfileLoading(false)
      }
    })()

    profileFetchInFlightRef.current = fetchPromise

    try {
      return await fetchPromise
    } finally {
      if (profileFetchInFlightRef.current === fetchPromise) {
        profileFetchInFlightRef.current = null
      }
    }
  }, [localAuthBypassEnabled])

  useEffect(() => {
    if (localAuthBypassEnabled) {
      currentProfileUidRef.current = LOCAL_BYPASS_PROFILE.uid ?? null
      profileRetryAtRef.current = 0
      setUser(LOCAL_BYPASS_USER)
      setProfile(LOCAL_BYPASS_PROFILE)
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      const nextUid = nextUser?.uid ?? null
      setUser(nextUser)
      setError(null)

      if (nextUser) {
        const profileUid = currentProfileUidRef.current
        const shouldRefetchProfile = !profileUid || profileUid !== nextUid

        if (shouldRefetchProfile && profileUid && profileUid !== nextUid) {
          setProfile(null)
          currentProfileUidRef.current = null
        }

        if (shouldRefetchProfile) {
          // Prevent infinite loading if backend is unreachable
          const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 5000))
          await Promise.race([refetchProfile(), timeoutPromise])
        }
      } else {
        clearCachedToken()
        profileRetryAtRef.current = 0
        currentProfileUidRef.current = null
        setProfile(null)
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [localAuthBypassEnabled, refetchProfile])

  useEffect(() => {
    if (localAuthBypassEnabled) return

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
  }, [localAuthBypassEnabled, mfaGateOpen, profile?.mfa_method])

  const signup = useCallback(
    async (
      email: string,
      password: string,
      agreements: AgreementAcceptanceInput[] = [],
      first_name?: string,
      last_name?: string,
      username?: string,
    ) => {
      if (localAuthBypassEnabled) {
        setError(null)
        setLoading(false)
        return
      }

      setError(null)
      setLoading(true)
      try {
        await signupWithAuth(email, password, agreements, first_name, last_name, username)
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
    [localAuthBypassEnabled, refetchProfile],
  )

  const login = useCallback(
    async (email: string, password: string) => {
      if (localAuthBypassEnabled) {
        setError(null)
        setLoading(false)
        return
      }

      setError(null)
      setLoading(true)
    try {
      await loginWithAuth(email, password)
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
    [localAuthBypassEnabled, refetchProfile],
  )

  const completeLoginMfa = useCallback(
    async (mfa_code?: string, passkey_assertion?: Record<string, unknown>) => {
      if (localAuthBypassEnabled) {
        return
      }

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
    [localAuthBypassEnabled, refetchProfile],
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
    if (localAuthBypassEnabled) {
      setError(null)
      setLoading(false)
      return
    }

    setError(null)
    setLoading(true)
    try {
      await logoutWithAuth()
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [localAuthBypassEnabled])

  const resetPassword = useCallback(
    async (email: string, mfa_code?: string, passkey_assertion?: Record<string, unknown>) => {
    if (localAuthBypassEnabled) {
      return 'sent'
    }

    setError(null)
    try {
      return await resetPasswordWithAuth(email, mfa_code, passkey_assertion)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to reset password.'
      setError(message)
      throw err
    }
    },
    [localAuthBypassEnabled],
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
