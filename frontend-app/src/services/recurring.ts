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
