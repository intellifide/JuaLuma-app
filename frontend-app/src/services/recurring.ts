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

// Core Purpose: Fetch recurring transaction forecasts.
// Last Updated: 2026-01-28 12:10 CST

import { apiFetch } from './auth'

export type RecurringForecastItem = {
  merchant: string
  category?: string | null
  average_amount: number
  cadence: string
  cadence_days: number
  next_date: string
  last_date: string
  occurrence_count: number
  confidence: number
}

export const getRecurringForecast = async (
  lookaheadDays = 30,
  lookbackDays = 180,
): Promise<RecurringForecastItem[]> => {
  const response = await apiFetch(
    `/recurring/forecast?lookahead_days=${lookaheadDays}&lookback_days=${lookbackDays}`,
    { throwOnError: false },
  )
  if (!response.ok) {
    return []
  }
  return response.json()
}
