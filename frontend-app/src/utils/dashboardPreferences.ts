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

// Core Purpose: Persist dashboard insights preferences without syncing to transactions.
// Last Updated: 2026-01-26 13:45 CST

export type InsightsPeriod = '1w' | '1m' | '3m' | 'ytd' | '1y' | 'all'

export type DashboardPreferences = {
  insightsPeriod: InsightsPeriod
}

const STORAGE_KEY_PREFIX = 'jualuma_dashboard_preferences'

const DEFAULT_PREFERENCES: DashboardPreferences = {
  insightsPeriod: '1m',
}

const getDashboardPreferencesStorageKey = (uid?: string | null): string => {
  if (!uid) return `${STORAGE_KEY_PREFIX}_anon`
  return `${STORAGE_KEY_PREFIX}_${uid}`
}

export const loadDashboardPreferences = (uid?: string | null): DashboardPreferences => {
  try {
    const stored = localStorage.getItem(getDashboardPreferencesStorageKey(uid))
    if (!stored) return DEFAULT_PREFERENCES
    const parsed = JSON.parse(stored)
    return { ...DEFAULT_PREFERENCES, ...parsed }
  } catch (error) {
    console.warn('Failed to load dashboard preferences:', error)
    return DEFAULT_PREFERENCES
  }
}

export const saveDashboardPreferences = (
  preferences: Partial<DashboardPreferences>,
  uid?: string | null,
): void => {
  try {
    const current = loadDashboardPreferences(uid)
    const updated = { ...current, ...preferences }
    localStorage.setItem(getDashboardPreferencesStorageKey(uid), JSON.stringify(updated))
  } catch (error) {
    console.error('Failed to save dashboard preferences:', error)
  }
}
