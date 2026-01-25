// Core Purpose: Manage transaction filter and sort preferences with localStorage persistence.
// Last Updated: 2026-01-25 12:30 CST

export interface TransactionPreferences {
  // Filter preferences
  includeWeb3: boolean
  includeCEX: boolean
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
  includeWeb3: true,
  includeCEX: true,
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
 */
export const loadTransactionPreferences = (): TransactionPreferences => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return DEFAULT_PREFERENCES
    
    const parsed = JSON.parse(stored)
    // Merge with defaults to handle missing fields from older versions
    return { ...DEFAULT_PREFERENCES, ...parsed }
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
