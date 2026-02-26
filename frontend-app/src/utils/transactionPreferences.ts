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

// Core Purpose: Manage transaction filter and sort preferences with localStorage persistence.
// Last Updated: 2025-01-30

/** All account types; default is to include all (display all transactions). */
export const ACCOUNT_TYPES = ['traditional', 'investment', 'web3', 'cex', 'manual'] as const
export type AccountTypeFilter = (typeof ACCOUNT_TYPES)[number]

export interface TransactionPreferences {
  // Filter preferences: which account types to include (default = all)
  accountTypesIncluded: AccountTypeFilter[]
  category: string
  timeframe: string
  isManualFilter: 'all' | 'manual' | 'auto'

  // Sort preferences
  sortBy: 'ts_desc' | 'ts_asc' | 'amount_desc' | 'amount_asc' | 'merchant_asc' | 'merchant_desc'

  // Pagination preferences
  pageSize: number

  // Advanced filters visibility
  showAdvancedFilters: boolean
}

const STORAGE_KEY_PREFIX = 'jualuma_transaction_preferences'

export const getTransactionPreferencesStorageKey = (uid?: string | null): string => {
  return uid ? `${STORAGE_KEY_PREFIX}_${uid}` : `${STORAGE_KEY_PREFIX}_anon`
}

const DEFAULT_PREFERENCES: TransactionPreferences = {
  accountTypesIncluded: [...ACCOUNT_TYPES],
  category: '',
  timeframe: 'all',
  isManualFilter: 'all',
  sortBy: 'ts_desc',
  pageSize: 10,
  showAdvancedFilters: false,
}

/**
 * Load transaction preferences from localStorage.
 * Returns default preferences if none are saved or if parsing fails.
 * Migrates old includeWeb3/includeCEX to accountTypesIncluded when present.
 */
export const loadTransactionPreferences = (uid?: string | null): TransactionPreferences => {
  try {
    const stored = localStorage.getItem(getTransactionPreferencesStorageKey(uid))
    if (!stored) return DEFAULT_PREFERENCES

    const parsed = JSON.parse(stored) as Record<string, unknown>
    const base = { ...DEFAULT_PREFERENCES, ...parsed }

    // Migrate from legacy includeWeb3 / includeCEX to accountTypesIncluded
    if (Array.isArray(parsed.accountTypesIncluded)) {
      base.accountTypesIncluded = parsed.accountTypesIncluded.filter((t: string) =>
        ACCOUNT_TYPES.includes(t as AccountTypeFilter),
      )
      if (base.accountTypesIncluded.length === 0) base.accountTypesIncluded = [...ACCOUNT_TYPES]
    } else if (
      typeof parsed.includeWeb3 === 'boolean' ||
      typeof parsed.includeCEX === 'boolean'
    ) {
      const included: AccountTypeFilter[] = ['traditional', 'investment', 'manual']
      if (parsed.includeWeb3 !== false) included.push('web3')
      if (parsed.includeCEX !== false) included.push('cex')
      base.accountTypesIncluded = included
    }

    return base
  } catch (error) {
    console.warn('Failed to load transaction preferences:', error)
    return DEFAULT_PREFERENCES
  }
}

/**
 * Save transaction preferences to localStorage.
 */
export const saveTransactionPreferences = (
  preferences: Partial<TransactionPreferences>,
  uid?: string | null,
): void => {
  try {
    const current = loadTransactionPreferences(uid)
    const updated = { ...current, ...preferences }
    localStorage.setItem(getTransactionPreferencesStorageKey(uid), JSON.stringify(updated))
  } catch (error) {
    console.error('Failed to save transaction preferences:', error)
  }
}

/**
 * Reset transaction preferences to defaults.
 */
export const resetTransactionPreferences = (uid?: string | null): void => {
  try {
    localStorage.removeItem(getTransactionPreferencesStorageKey(uid))
  } catch (error) {
    console.error('Failed to reset transaction preferences:', error)
  }
}
