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

// Core Purpose: Hook to load recurring bill forecasts.
// Last Updated: 2026-01-28 12:10 CST

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { getRecurringForecast, RecurringForecastItem } from '../services/recurring'

export const useRecurringForecast = (lookaheadDays = 30, lookbackDays = 180) => {
  const { user } = useAuth()
  const [data, setData] = useState<RecurringForecastItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchForecast = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const forecast = await getRecurringForecast(lookaheadDays, lookbackDays)
      setData(forecast)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load recurring bills.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [user, lookaheadDays, lookbackDays])

  useEffect(() => {
    fetchForecast()
  }, [fetchForecast])

  return { data, loading, error, refetch: fetchForecast }
}
