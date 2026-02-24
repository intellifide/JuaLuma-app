/*
 * Copyright (c) 2026 Intellifide, LLC.
 * Licensed under PolyForm Noncommercial License 1.0.0.
 * See "/legal/license" for full license terms.
 */

// This file replaces the Firebase SDK with direct REST API calls to GCP Identity Platform
// Documentation: https://cloud.google.com/identity-platform/docs/use-rest-api

const API_KEY = import.meta.env.VITE_GCP_API_KEY
if (!API_KEY || API_KEY === 'undefined') {
  throw new Error(
    'VITE_GCP_API_KEY is not set. Set it in support-portal/.env or root .env (local), or pass as build-arg when building the Docker image.'
  )
}
const IDENTITY_TOOLKIT_BASE = 'https://identitytoolkit.googleapis.com/v1'
const SECURE_TOKEN_BASE = 'https://securetoken.googleapis.com/v1'

export interface User {
  uid: string
  email: string | null
  emailVerified: boolean
  displayName: string | null
  isAnonymous: boolean
  getIdToken: (forceRefresh?: boolean) => Promise<string>
}

// In-memory storage for the current session
let currentUser: User | null = null
let _refreshToken: string | null = null
let _idToken: string | null = null
let _expiresAt = 0

// Listeners for auth state changes
type AuthStateListener = (user: User | null) => void
const listeners: AuthStateListener[] = []

const notifyListeners = () => {
    listeners.forEach(l => l(currentUser))
}

export const onAuthStateChanged = (_auth: any, listener: AuthStateListener) => {
    listeners.push(listener)
    // Immediately trigger with current user
    listener(currentUser)
    return () => {
        const index = listeners.indexOf(listener)
        if (index > -1) {
            listeners.splice(index, 1)
        }
    }
}

// Helper: Persist session to localStorage (simple implementation)
const saveSession = (idToken: string, refreshToken: string, expiresIn: string, localId: string, email: string) => {
  const expiresAppx = Date.now() + parseInt(expiresIn, 10) * 1000
  _idToken = idToken
  _refreshToken = refreshToken
  _expiresAt = expiresAppx

  // Construct User object
  currentUser = {
    uid: localId,
    email: email,
    emailVerified: false, // Default, would need to check response
    displayName: null,
    isAnonymous: false,
    getIdToken: async (forceRefresh = false) => {
        if (forceRefresh || Date.now() > _expiresAt - 60000) { // Refresh if close to expiring
            await refreshAuthToken()
        }
        return _idToken!
    }
  }

  localStorage.setItem('gcp_auth_session', JSON.stringify({
    idToken,
    refreshToken,
    expiresAt: expiresAppx,
    uid: localId,
    email
  }))
  notifyListeners()
}

const clearSession = () => {
  currentUser = null
  _idToken = null
  _refreshToken = null
  _expiresAt = 0
  localStorage.removeItem('gcp_auth_session')
  notifyListeners()
}

// Restore session on load
const restoreSession = () => {
    const json = localStorage.getItem('gcp_auth_session')
    if (json) {
        try {
            const data = JSON.parse(json)
            // Validate if expired? We can try to refresh immediately if needed,
            // but for now just load it.
            _idToken = data.idToken
            _refreshToken = data.refreshToken
            _expiresAt = data.expiresAt
            currentUser = {
                uid: data.uid,
                email: data.email,
                emailVerified: false,
                displayName: null,
                isAnonymous: false,
                getIdToken: async (forceRefresh = false) => {
                     // Check if expired
                     if (forceRefresh || Date.now() > _expiresAt - 60000) {
                         await refreshAuthToken()
                     }
                     return _idToken!
                }
            }
        } catch (e) {
            console.error("Failed to restore session", e)
            clearSession()
        }
    }
}
restoreSession()


const refreshAuthToken = async () => {
    if (!_refreshToken) throw new Error("No refresh token available")

    const response = await fetch(`${SECURE_TOKEN_BASE}/token?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            grant_type: 'refresh_token',
            refresh_token: _refreshToken
        })
    })

    if (!response.ok) {
        const err = await response.json()
        clearSession()
        throw new Error(err.error?.message || "Failed to refresh token")
    }

    const data = await response.json()
    // data.id_token, data.refresh_token, data.expires_in, data.user_id
    saveSession(data.id_token, data.refresh_token, data.expires_in, data.user_id, currentUser?.email || '')
    return data.id_token
}


// --- API Functions mimicking Firebase Auth ---

export class FirebaseError extends Error {
    code: string
    constructor(code: string, message: string) {
        super(message)
        this.code = code
    }
}


const handleGcpError = (error: any) => {
    const msg = error.error?.message || "Unknown error"
    // Map GCP error messages to Firebase error codes for compatibility with existing app logic
    if (msg.includes("EMAIL_EXISTS")) return new FirebaseError('auth/email-already-in-use', "Email already in use")
    if (msg.includes("INVALID_PASSWORD")) return new FirebaseError('auth/wrong-password', "Invalid password")
    if (msg.includes("EMAIL_NOT_FOUND")) return new FirebaseError('auth/user-not-found', "User not found")
    if (msg.includes("USER_DISABLED")) return new FirebaseError('auth/user-disabled', "User disabled")
    // Add more mappings as discovered
    return new FirebaseError('auth/unknown', msg)
}

export const createUserWithEmailAndPassword = async (_auth: any, email: string, password: string) => {
    const url = `${IDENTITY_TOOLKIT_BASE}/accounts:signUp?key=${API_KEY}`
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email,
            password,
            returnSecureToken: true
        })
    })

    const data = await response.json()
    if (!response.ok) {
        throw handleGcpError(data)
    }

    saveSession(data.idToken, data.refreshToken, data.expiresIn, data.localId, data.email)

    return { user: currentUser }
}

export const signInWithEmailAndPassword = async (_auth: any, email: string, password: string) => {
    const url = `${IDENTITY_TOOLKIT_BASE}/accounts:signInWithPassword?key=${API_KEY}`
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email,
            password,
            returnSecureToken: true
        })
    })

    const data = await response.json()
    if (!response.ok) {
        throw handleGcpError(data)
    }

    saveSession(data.idToken, data.refreshToken, data.expiresIn, data.localId, data.email)
    return { user: currentUser }
}

export const signOut = async (_auth: any) => {
   clearSession()
}

// Stub for now, can implement via accounts:sendOobCode if needed
export const confirmPasswordReset = async (_auth: any, oobCode: string, newPassword: string) => {
    const url = `${IDENTITY_TOOLKIT_BASE}/accounts:resetPassword?key=${API_KEY}`
    const response = await fetch(url, {
        method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ oobCode, newPassword })
    })
    if (!response.ok) {
         const data = await response.json()
         throw handleGcpError(data)
    }
}

export const verifyPasswordResetCode = async (_auth: any, oobCode: string) => {
      const url = `${IDENTITY_TOOLKIT_BASE}/accounts:resetPassword?key=${API_KEY}`
    const response = await fetch(url, {
        method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ oobCode })
         // Note: verifyPasswordResetCode in firebase just checks the code.
         // The REST API allows checking by sending oobCode only (no password)
    })
    if (!response.ok) {
         const data = await response.json()
         throw handleGcpError(data)
    }
    const data = await response.json()
    return data.email // Returns email if valid
}

export const deleteUser = async (user: User) => {
    const token = await user.getIdToken()
    const url = `${IDENTITY_TOOLKIT_BASE}/accounts:delete?key=${API_KEY}`
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token })
    })
     if (!response.ok) {
         const data = await response.json()
         throw handleGcpError(data)
    }
    clearSession()
}


// Mock Auth object to satisfy imports
export const auth = {
    get currentUser() { return currentUser }
}
