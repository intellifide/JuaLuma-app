/*
 * Copyright (c) 2026 Intellifide, LLC.
 * Licensed under PolyForm Noncommercial License 1.0.0.
 * See "/legal/license" for full license terms.
 */

const AUTH_ACCESS_ERROR_MESSAGE =
  'Unable to verify your access right now. Please sign in and try again.'
const ACCESS_DENIED_ERROR_MESSAGE =
  'You do not have permission to perform this action.'
const GENERIC_REQUEST_ERROR_MESSAGE =
  'Request could not be completed right now. Please try again.'

const FRIENDLY_STATUS_MESSAGES: Record<number, string> = {
  400: 'We could not process that request. Please review your input and try again.',
  404: 'We could not find what you requested.',
  408: 'The request timed out. Please try again.',
  409: 'This action conflicts with current data. Refresh and try again.',
  413: 'File is too large. Maximum supported size is 20 MB.',
  415: 'Unsupported file format. Please choose a supported file type.',
  422: 'Some input is invalid. Please review and try again.',
  429: 'Too many requests right now. Please wait a moment and try again.',
  500: 'Something went wrong on our side. Please try again.',
  502: 'Service is temporarily unavailable. Please try again shortly.',
  503: 'Service is temporarily unavailable. Please try again shortly.',
  504: 'The service took too long to respond. Please try again.',
}

const isTechnicalMessage = (message: string): boolean => {
  const normalized = message.trim().toLowerCase()
  return (
    /^request failed with status(?: code)? \d{3}$/i.test(message.trim()) ||
    normalized === 'network error' ||
    normalized.includes('timeout') ||
    normalized.startsWith('error: request failed')
  )
}

const fallbackMessageForStatus = (status: number | undefined): string => {
  if (typeof status === 'number' && FRIENDLY_STATUS_MESSAGES[status]) {
    return FRIENDLY_STATUS_MESSAGES[status]
  }
  return GENERIC_REQUEST_ERROR_MESSAGE
}

export const normalizeApiErrorMessage = (
  status: number | undefined,
  raw: unknown,
): string => {
  if (status === 401) return AUTH_ACCESS_ERROR_MESSAGE
  if (status === 403) return ACCESS_DENIED_ERROR_MESSAGE

  if (typeof raw !== 'string') {
    return fallbackMessageForStatus(status)
  }

  const message = raw.trim()
  if (!message) return fallbackMessageForStatus(status)
  if (/<(?:!doctype\s+html|html|body)\b/i.test(message)) {
    return fallbackMessageForStatus(status)
  }
  if (isTechnicalMessage(message)) {
    return fallbackMessageForStatus(status)
  }
  return message
}

