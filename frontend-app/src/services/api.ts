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

// Updated 2026-01-20 03:40 CST by Antigravity
import axios, { AxiosError, AxiosHeaders } from 'axios'
import { clearCachedToken, getIdToken, MfaRequiredError } from './auth'

const AUTH_ACCESS_ERROR_MESSAGE =
  'Unable to verify your access right now. Please sign in and try again.'
const GENERIC_REQUEST_ERROR_MESSAGE =
  'Request could not be completed right now. Please try again.'

const normalizeApiErrorMessage = (status: number | undefined, raw: unknown): string => {
  if (status === 401) return AUTH_ACCESS_ERROR_MESSAGE
  if (typeof raw !== 'string') return 'Request failed. Please try again.'

  const message = raw.trim()
  if (!message) return 'Request failed. Please try again.'
  if (/<(?:!doctype\s+html|html|body)\b/i.test(message)) {
    return GENERIC_REQUEST_ERROR_MESSAGE
  }
  return message
}

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
    const rawMessage =
      (error.response?.data as { detail?: string; message?: string } | undefined)
        ?.detail ||
      (error.response?.data as { message?: string } | undefined)?.message ||
      error.message
    const message = normalizeApiErrorMessage(status, rawMessage)

    if (status === 403 && (rawMessage === 'MFA_REQUIRED' || rawMessage === 'MFA_PASSKEY_REQUIRED')) {
      clearCachedToken()
      try {
        window.dispatchEvent(
          new CustomEvent('mfa-required', { detail: { reason: rawMessage } }),
        )
      } catch {
        // no-op
      }
      return Promise.reject(
        new MfaRequiredError(rawMessage === 'MFA_PASSKEY_REQUIRED' ? 'passkey' : 'totp'),
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
