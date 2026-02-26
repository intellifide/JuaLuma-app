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

export interface Message {
  role: 'user' | 'assistant'
  text: string
  time: string
  citations?: Array<{ title: string; url: string }>
  webSearchUsed?: boolean
}

export const AI_STORAGE_UPDATED_EVENT = 'jualuma:ai-storage-updated'

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'to', 'for', 'of', 'on', 'in', 'at', 'by', 'with',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'do', 'does', 'did', 'can', 'could',
  'should', 'would', 'may', 'might', 'will', 'just', 'please', 'show', 'tell', 'give',
  'my', 'your', 'our', 'their', 'me', 'us', 'you', 'i', 'we', 'they', 'this', 'that',
  'these', 'those', 'about', 'from', 'into', 'over', 'under', 'what', 'whats', 'how',
  'when', 'where', 'why', 'who', 's',
])

export interface Thread {
  id: string
  title: string
  timestamp: string
  preview: string
  messages: Message[]
  projectId?: string | null
}

export const getAIStorageKeys = (uid?: string | null) => {
  const keySuffix = uid || 'anon'
  return {
    storageKey: `jualuma_ai_thread_${keySuffix}`,
    threadStorageKey: `jualuma_ai_current_thread_${keySuffix}`,
    threadsStorageKey: `jualuma_ai_threads_${keySuffix}`,
  }
}

export const notifyAIStorageUpdated = (threadId: string) => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(AI_STORAGE_UPDATED_EVENT, { detail: { threadId } }))
}

export const generateThreadTitle = (query: string) => {
  const trimmed = query.trim()
  if (!trimmed) return 'New Chat'
  const normalized = trimmed.toLowerCase()
  const patterns: Array<[RegExp, string]> = [
    [/net worth/, 'Net Worth Snapshot'],
    [/cash flow/, 'Cash Flow Update'],
    [/subscription/, 'Subscription Review'],
    [/budget/, 'Budget Check'],
    [/spend|spending/, 'Spending Summary'],
    [/category|categories/, 'Category Breakdown'],
    [/income/, 'Income Overview'],
    [/investment/, 'Investment Overview'],
    [/debt|loan/, 'Debt Overview'],
  ]

  for (const [pattern, title] of patterns) {
    if (pattern.test(normalized)) {
      return title.toLowerCase() === normalized ? `${title} Overview` : title
    }
  }

  const tokens = normalized.match(/[a-z0-9]+/g) ?? []
  const keywords = tokens.filter((token) => !STOP_WORDS.has(token))
  const unique = Array.from(new Set(keywords)).slice(0, 4)
  if (unique.length === 0) return 'New Chat'
  const base = unique.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  const title = `${base} Overview`
  return title.toLowerCase() === normalized ? `${base} Insights` : title
}

const safeParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export const getStoredThreads = (threadsStorageKey: string) => {
  if (typeof window === 'undefined') return [] as Thread[]
  return safeParse<Thread[]>(localStorage.getItem(threadsStorageKey), [])
}

export const getStoredMessages = (storageKey: string, threadId: string) => {
  if (typeof window === 'undefined') return [] as Message[]
  return safeParse<Message[]>(localStorage.getItem(`${storageKey}_${threadId}`), [])
}
