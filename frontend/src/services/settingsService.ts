import { apiFetch } from './auth'

export type NotificationPreference = {
  event_key: string
  channel_email: boolean
  channel_sms: boolean
}

export type PrivacySettings = {
  data_sharing_consent: boolean
}

export const settingsService = {
  async getNotificationPreferences(): Promise<NotificationPreference[]> {
    const response = await apiFetch('/notifications/preferences')
    return response.json()
  },

  async updateNotificationPreference(data: { event_key: string; channel_email?: boolean; channel_sms?: boolean }): Promise<NotificationPreference> {
    const response = await apiFetch('/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return response.json()
  },

  async updatePrivacySettings(data: { data_sharing_consent: boolean }): Promise<any> {
    const response = await apiFetch('/users/me/privacy', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    return response.json()
  }
}
