// Updated 2025-12-08 20:31 CST by ChatGPT
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
import { auth } from '../services/firebase'
import {
  apiFetch,
  clearCachedToken,
  login as loginWithFirebase,
  logout as logoutWithFirebase,
  resetPassword as resetPasswordWithFirebase,
  signup as signupWithFirebase,
} from '../services/auth'

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
  quiet_hours_start?: string | null
  quiet_hours_end?: string | null
  created_at?: string
  updated_at?: string
}

export type UserProfile = {
  uid?: string
  email?: string
  role?: string
  plan?: string
  subscription_status?: string
  theme_pref?: string | null
  currency_pref?: string | null
  subscriptions?: Subscription[]
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
  signup: (email: string, password: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  refetchProfile: () => Promise<UserProfile | null>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        await refetchProfile()
      } else {
        clearCachedToken()
        setProfile(null)
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [refetchProfile])

  const signup = useCallback(
    async (email: string, password: string) => {
      setError(null)
      setLoading(true)
      try {
        await signupWithFirebase(email, password)
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
        await refetchProfile()
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

  const resetPassword = useCallback(async (email: string) => {
    setError(null)
    try {
      await resetPasswordWithFirebase(email)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to reset password.'
      setError(message)
      throw err
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      profileLoading,
      error,
      signup,
      login,
      logout,
      resetPassword,
      refetchProfile,
    }),
    [user, profile, loading, profileLoading, error, signup, login, logout, resetPassword, refetchProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
