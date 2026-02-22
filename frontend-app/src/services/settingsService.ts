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

// Core Purpose: Wrap notification and privacy settings API calls.
// Last Updated: 2026-01-23 23:05 CST

import { apiFetch } from './auth'

export type NotificationPreference = {
  event_key: string
  channel_email: boolean
  channel_sms: boolean
  channel_push: boolean
  channel_in_app: boolean
}

export type PrivacySettings = {
  data_sharing_consent: boolean
}

export const settingsService = {
  async getNotificationPreferences(): Promise<NotificationPreference[]> {
    // Fetch current notification preferences from the backend.
    const response = await apiFetch('/notifications/preferences')
    return response.json()
  },

  async updateNotificationPreference(data: { event_key: string; channel_email?: boolean; channel_sms?: boolean; channel_push?: boolean; channel_in_app?: boolean }): Promise<NotificationPreference> {
    // Update a specific notification preference on the backend.
    const response = await apiFetch('/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return response.json()
  },

  async getNotificationSettings(): Promise<{ low_balance_threshold: number | null; large_transaction_threshold: number | null }> {
    // Fetch global notification settings such as alert thresholds.
    const response = await apiFetch('/notifications/settings')
    return response.json()
  },

  async updateNotificationSettings(data: { low_balance_threshold?: number | null; large_transaction_threshold?: number | null }): Promise<{ low_balance_threshold: number | null; large_transaction_threshold: number | null }> {
    // Update global notification settings such as alert thresholds.
    const response = await apiFetch('/notifications/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return response.json()
  },

  async updatePrivacySettings(data: { data_sharing_consent: boolean }): Promise<PrivacySettings> {
    // Update privacy settings on the backend.
    const response = await apiFetch('/users/me/privacy', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    return response.json() as Promise<PrivacySettings>
  }
}
