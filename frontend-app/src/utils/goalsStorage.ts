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
