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

// Core Purpose: Financial digest settings + history API wrapper.
// Last Updated: 2026-02-03 00:00 CST

import { apiFetch } from './auth'

export type DigestSettings = {
  enabled: boolean
  cadence: 'weekly' | 'monthly' | 'quarterly' | 'annually'
  weekly_day_of_week: number // 0 (Mon) .. 6 (Sun)
  day_of_month: number // 1..28
  send_time_local: string // HH:MM
  delivery_in_app: boolean
  delivery_email: boolean
  thread_id: string
  next_send_at_utc?: string | null
  last_sent_at_utc?: string | null
}

export type DigestThread = {
  thread_id: string
  title: string
  preview: string
  timestamp: string
}

export type DigestThreadMessages = {
  thread_id: string
  title: string
  messages: Array<{ role: 'user' | 'assistant'; text: string; time: string }>
}

export const digestService = {
  async getSettings(): Promise<DigestSettings> {
    const response = await apiFetch('/digests/settings')
    return response.json()
  },

  async updateSettings(
    updates: Partial<
      Pick<
        DigestSettings,
        | 'enabled'
        | 'cadence'
        | 'weekly_day_of_week'
        | 'day_of_month'
        | 'send_time_local'
        | 'delivery_in_app'
        | 'delivery_email'
      >
    >,
  ): Promise<DigestSettings> {
    const response = await apiFetch('/digests/settings', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
    return response.json()
  },

  async listThreads(): Promise<DigestThread[]> {
    const response = await apiFetch('/digests/threads')
    const data = await response.json()
    return data.threads ?? []
  },

  async getThread(threadId: string): Promise<DigestThreadMessages> {
    const response = await apiFetch(`/digests/threads/${encodeURIComponent(threadId)}`)
    return response.json()
  },
}
