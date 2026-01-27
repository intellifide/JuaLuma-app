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

const STORAGE_KEY = 'jualuma_goals'

export const loadGoals = (): Goal[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.warn('Failed to load goals:', error)
    return []
  }
}

export const saveGoals = (goals: Goal[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goals))
  } catch (error) {
    console.error('Failed to save goals:', error)
  }
}
