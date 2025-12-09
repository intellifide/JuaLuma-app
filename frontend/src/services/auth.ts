// Updated 2025-12-08 20:31 CST by ChatGPT
import { FirebaseError } from 'firebase/app'
import {
  User,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { auth } from './firebase'

type ApiRequestInit = RequestInit & { skipAuth?: boolean }

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
      default:
        return 'Something went wrong with authentication. Try again.'
    }
  }

  return 'Unexpected authentication error. Please retry.'
}

export const signup = async (email: string, password: string): Promise<User> => {
  try {
    // 1. Create user in Backend (seeds Postgres)
    await apiFetch('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    })

    // 2. Sign in with Client SDK to establish session
    const credential = await signInWithEmailAndPassword(auth, email, password)
    clearCachedToken()
    return credential.user
  } catch (error) {
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

export const logout = async (): Promise<void> => {
  await signOut(auth)
  clearCachedToken()
}

export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email)
  } catch (error) {
    throw new Error(mapFirebaseError(error))
  }
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

  const response = await fetch(buildUrl(path), {
    ...init,
    headers,
  })

  if (!response.ok) {
    const maybeJson = await response
      .clone()
      .json()
      .catch(() => null)
    const message =
      (maybeJson && (maybeJson.detail || maybeJson.message)) ||
      `Request failed with status ${response.status}`
    throw new Error(message as string)
  }

  return response
}
