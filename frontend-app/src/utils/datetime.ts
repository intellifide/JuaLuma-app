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

export type DateInput = string | number | Date

const toDate = (value: DateInput): Date => {
  return value instanceof Date ? value : new Date(value)
}

export const formatDate = (
  value: DateInput,
  timeZone: string,
  options?: Intl.DateTimeFormatOptions,
): string => {
  return toDate(value).toLocaleDateString(undefined, { timeZone, ...options })
}

export const formatDateTime = (
  value: DateInput,
  timeZone: string,
  options?: Intl.DateTimeFormatOptions,
): string => {
  return toDate(value).toLocaleString(undefined, { timeZone, ...options })
}

export const formatTime = (
  value: DateInput,
  timeZone: string,
  options?: Intl.DateTimeFormatOptions,
): string => {
  return toDate(value).toLocaleTimeString(undefined, { timeZone, ...options })
}
