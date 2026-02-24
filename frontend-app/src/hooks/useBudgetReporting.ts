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

// Core Purpose: Hooks for backend-computed budget status + history (Personal/Household).
// Last Modified: 2026-02-03
import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../services/auth'
import { useAuth } from './useAuth'

export type BudgetPeriod = 'monthly' | 'quarterly' | 'annual'

export type BudgetStatusItem = {
  category: string
  period: BudgetPeriod
  window_start: string
  window_end: string
  budget_amount: number
  spent: number
  delta: number
  percent_used: number
  status: 'under' | 'at' | 'over'
}

export type BudgetStatusResponse = {
  scope: 'personal' | 'household'
  budget_owner_uid: string
  spend_uids: string[]
  items: BudgetStatusItem[]
  total_budget: number
  total_spent: number
  percent_used: number
  counts: Record<'under' | 'at' | 'over', number>
}

export type BudgetHistoryBucket = {
  key: string
  start: string
  end: string
  total_budget: number
  total_spent: number
  percent_used: number
  counts: Record<'under' | 'at' | 'over', number>
}

export type BudgetHistoryResponse = {
  scope: 'personal' | 'household'
  budget_owner_uid: string
  spend_uids: string[]
  period: BudgetPeriod
  buckets: BudgetHistoryBucket[]
}

export const useBudgetStatus = (scope: 'personal' | 'household' = 'personal') => {
  const { user } = useAuth()
  const [data, setData] = useState<BudgetStatusResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch(`/budgets/status?scope=${scope}`)
      if (!res.ok) {
        throw new Error(`Failed to fetch budget status (${res.status})`)
      }
      const json = (await res.json()) as BudgetStatusResponse
      setData(json)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch budget status'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [user, scope])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}

export const useBudgetHistory = (
  period: BudgetPeriod,
  lookback: number,
  scope: 'personal' | 'household' = 'personal',
) => {
  const { user } = useAuth()
  const [data, setData] = useState<BudgetHistoryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch(
        `/budgets/history?scope=${scope}&period=${period}&lookback=${lookback}`,
      )
      if (!res.ok) {
        throw new Error(`Failed to fetch budget history (${res.status})`)
      }
      const json = (await res.json()) as BudgetHistoryResponse
      setData(json)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch budget history'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [user, scope, period, lookback])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}
