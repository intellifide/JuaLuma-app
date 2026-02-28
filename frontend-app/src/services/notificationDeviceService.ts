import { apiFetch } from './auth'

export type NotificationDevicePlatform = 'ios' | 'android'

export type NotificationDeviceRecord = {
  id: string
  device_token: string
  platform: string
  is_active: boolean
  last_seen_at?: string | null
}

export const registerNotificationDevice = async (
  deviceToken: string,
  platform: NotificationDevicePlatform,
): Promise<NotificationDeviceRecord> => {
  const response = await apiFetch('/notifications/devices', {
    method: 'POST',
    body: JSON.stringify({
      device_token: deviceToken,
      platform,
    }),
  })
  return response.json() as Promise<NotificationDeviceRecord>
}

export const deactivateNotificationDevice = async (deviceToken: string): Promise<void> => {
  await apiFetch('/notifications/devices', {
    method: 'DELETE',
    body: JSON.stringify({
      device_token: deviceToken,
    }),
  })
}
