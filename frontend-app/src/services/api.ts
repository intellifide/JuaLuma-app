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

// Updated 2026-01-20 03:40 CST by Antigravity
import axios, { AxiosError, AxiosHeaders } from 'axios'
import { clearCachedToken, getIdToken, MfaRequiredError } from './auth'

// Accept both env naming conventions across dev/prod.
const envBase =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.API_BASE_URL ||
  import.meta.env.VITE_API_TARGET;
// If envBase contains 'backend' (docker service name), it won't work in browser.
// Fallback to empty string to use relative path (proxy) or let axios handle it.
const baseURL = (envBase && !envBase.includes('backend')) ? envBase : '/api';

const api = axios.create({
  baseURL,
  timeout: 10000, // 10 second timeout
})

api.interceptors.request.use(
  async (config) => {
    const token = await getIdToken()
    if (token) {
      if (!config.headers) {
        config.headers = new AxiosHeaders();
      }
      (config.headers as AxiosHeaders).set('Authorization', `Bearer ${token}`);
    }
    return config
  },
  (error) => Promise.reject(error),
)

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status
    const message =
      (error.response?.data as { detail?: string; message?: string } | undefined)
        ?.detail ||
      (error.response?.data as { message?: string } | undefined)?.message ||
      error.message

    if (status === 403 && (message === 'MFA_REQUIRED' || message === 'MFA_PASSKEY_REQUIRED')) {
      clearCachedToken()
      try {
        window.dispatchEvent(
          new CustomEvent('mfa-required', { detail: { reason: message } }),
        )
      } catch {
        // no-op
      }
      return Promise.reject(
        new MfaRequiredError(message === 'MFA_PASSKEY_REQUIRED' ? 'passkey' : 'totp'),
      )
    }

    if (status === 401) {
      clearCachedToken()
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }

    return Promise.reject(new Error(message))
  },
)

export { api }
