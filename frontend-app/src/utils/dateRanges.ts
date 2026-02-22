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

// Core Purpose: Shared helpers for transaction-style date ranges.
// Last Updated: 2026-01-26 13:45 CST

export type TransactionTimeframe = '1w' | '1m' | '3m' | '6m' | '1y' | 'ytd' | 'all'

export type TransactionDateRange = {
  start?: string
  end?: string
}

type RangeOptions = {
  now?: Date
  allowAllDates?: boolean
  allTimeYears?: number
}

export const formatDateParam = (value: Date) => {
  const year = value.getFullYear()
  const month = `${value.getMonth() + 1}`.padStart(2, '0')
  const day = `${value.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const getTransactionDateRange = (
  timeframe: string,
  options: RangeOptions = {},
): TransactionDateRange => {
  const end = options.now ? new Date(options.now) : new Date()
  const start = new Date(end)

  switch (timeframe) {
    case '1w':
      start.setDate(end.getDate() - 7)
      break
    case '1m':
      start.setDate(end.getDate() - 30)
      break
    case '3m':
      start.setDate(end.getDate() - 90)
      break
    case '6m':
      start.setDate(end.getDate() - 180)
      break
    case '1y':
      start.setDate(end.getDate() - 365)
      break
    case 'ytd':
      start.setFullYear(end.getFullYear(), 0, 1)
      break
    case 'all': {
      if (!options.allowAllDates) {
        return { start: undefined, end: undefined }
      }
      const years = options.allTimeYears ?? 5
      start.setFullYear(end.getFullYear() - years, 0, 1)
      break
    }
    default:
      start.setDate(end.getDate() - 30)
  }

  return {
    start: formatDateParam(start),
    end: formatDateParam(end),
  }
}

export const formatTimeframeLabel = (timeframe: string) => {
  switch (timeframe) {
    case '1w':
      return '1W'
    case '1m':
      return '1M'
    case '3m':
      return '3M'
    case '6m':
      return '6M'
    case '1y':
      return '1Y'
    case 'ytd':
      return 'YTD'
    case 'all':
      return 'ALL'
    default:
      return timeframe.toUpperCase()
  }
}
