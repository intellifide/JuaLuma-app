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

const STORAGE_KEY = 'jualuma_transaction_preferences'

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
export const loadTransactionPreferences = (): TransactionPreferences => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
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
export const saveTransactionPreferences = (preferences: Partial<TransactionPreferences>): void => {
  try {
    const current = loadTransactionPreferences()
    const updated = { ...current, ...preferences }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error('Failed to save transaction preferences:', error)
  }
}

/**
 * Reset transaction preferences to defaults.
 */
export const resetTransactionPreferences = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('Failed to reset transaction preferences:', error)
  }
}
