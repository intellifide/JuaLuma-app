// Core Purpose: Store user-created dashboard goals in localStorage.
// Last Updated: 2026-01-27 00:10 CST

export type GoalType = 'emergency_fund' | 'debt_paydown' | 'savings' | 'investment' | 'custom'

export type Goal = {
  id: string
  type: GoalType
  title: string
  targetAmount: number
  currentAmount: number
  targetDate?: string | null
  createdAt: string
}

const STORAGE_KEY_PREFIX = 'jualuma_goals'

const getGoalsStorageKey = (uid?: string | null): string => {
  if (!uid) return `${STORAGE_KEY_PREFIX}_anon`
  return `${STORAGE_KEY_PREFIX}_${uid}`
}

export const loadGoals = (uid?: string | null): Goal[] => {
  try {
    const stored = localStorage.getItem(getGoalsStorageKey(uid))
    if (!stored) return []
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.warn('Failed to load goals:', error)
    return []
  }
}

export const saveGoals = (goals: Goal[], uid?: string | null): void => {
  try {
    localStorage.setItem(getGoalsStorageKey(uid), JSON.stringify(goals))
  } catch (error) {
    console.error('Failed to save goals:', error)
  }
}
