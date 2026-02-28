import { Capacitor, type PluginListenerHandle, registerPlugin } from '@capacitor/core'
import {
  deactivateNotificationDevice,
  registerNotificationDevice,
  type NotificationDevicePlatform,
} from './notificationDeviceService'

type PushPermissionState = 'granted' | 'denied' | 'prompt'

type PushPermissionsResponse = {
  receive: PushPermissionState
}

type PushRegistrationToken = {
  value: string
}

type PushRegistrationError = {
  error?: string
}

interface PushNotificationsPlugin {
  requestPermissions(): Promise<PushPermissionsResponse>
  register(): Promise<void>
  addListener(
    eventName: 'registration',
    listenerFunc: (token: PushRegistrationToken) => void,
  ): Promise<PluginListenerHandle>
  addListener(
    eventName: 'registrationError',
    listenerFunc: (error: PushRegistrationError) => void,
  ): Promise<PluginListenerHandle>
}

interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

type RegisterDeviceFn = (token: string, platform: NotificationDevicePlatform) => Promise<void>
type DeactivateDeviceFn = (token: string) => Promise<void>

type PushLifecycleState = {
  observedToken: string | null
  syncedByUid: Record<string, string>
}

type PushLifecycleOptions = {
  platform?: string
  plugin?: PushNotificationsPlugin
  storage?: StorageLike | null
  registerDevice?: RegisterDeviceFn
  deactivateDevice?: DeactivateDeviceFn
  logger?: Pick<Console, 'warn' | 'error'>
}

const STORAGE_KEY = 'jualuma_push_lifecycle_v1'
const PushNotifications = registerPlugin<PushNotificationsPlugin>('PushNotifications')

const safeWindowStorage = (): StorageLike | null => {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

const loadState = (storage: StorageLike | null): PushLifecycleState => {
  if (!storage) {
    return {
      observedToken: null,
      syncedByUid: {},
    }
  }

  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) {
      return {
        observedToken: null,
        syncedByUid: {},
      }
    }
    const parsed = JSON.parse(raw) as Partial<PushLifecycleState>
    return {
      observedToken: typeof parsed.observedToken === 'string' ? parsed.observedToken : null,
      syncedByUid: parsed.syncedByUid && typeof parsed.syncedByUid === 'object' ? parsed.syncedByUid : {},
    }
  } catch {
    return {
      observedToken: null,
      syncedByUid: {},
    }
  }
}

const normalizeToken = (token: unknown): string | null => {
  if (typeof token !== 'string') return null
  const trimmed = token.trim()
  return trimmed ? trimmed : null
}

const resolvePlatform = (platform: string): NotificationDevicePlatform | null => {
  if (platform === 'ios' || platform === 'android') {
    return platform
  }
  return null
}

export const createPushTokenLifecycle = (options: PushLifecycleOptions = {}) => {
  const platformValue = options.platform ?? Capacitor.getPlatform()
  const devicePlatform = resolvePlatform(platformValue)
  const plugin = options.plugin ?? PushNotifications
  const storage = options.storage ?? safeWindowStorage()
  const logger = options.logger ?? console
  const registerDevice = options.registerDevice ?? registerNotificationDevice
  const deactivateDevice = options.deactivateDevice ?? deactivateNotificationDevice
  const state = loadState(storage)

  let disposed = false
  let listenersAttached = false
  let listenerHandles: PluginListenerHandle[] = []
  let activeUid: string | null = null
  let syncQueue = Promise.resolve()

  const persistState = () => {
    if (!storage) return
    storage.setItem(STORAGE_KEY, JSON.stringify(state))
  }

  const enqueue = async (work: () => Promise<void>): Promise<void> => {
    syncQueue = syncQueue
      .then(work)
      .catch((error) => {
        logger.warn('Push token lifecycle operation failed', error)
      })
    await syncQueue
  }

  const requestNativeTokenRefresh = async (): Promise<void> => {
    if (!devicePlatform) return
    try {
      const permissions = await plugin.requestPermissions()
      if (permissions.receive !== 'granted') {
        return
      }
      await plugin.register()
    } catch (error) {
      logger.warn('Push token registration request failed', error)
    }
  }

  const syncTokenForActiveUser = async (): Promise<void> => {
    if (!devicePlatform) return
    if (!activeUid) return

    const nextToken = normalizeToken(state.observedToken)
    if (!nextToken) return

    const previousToken = normalizeToken(state.syncedByUid[activeUid])
    if (previousToken && previousToken !== nextToken) {
      try {
        await deactivateDevice(previousToken)
      } catch (error) {
        logger.warn('Failed to deactivate stale push token', error)
      }
    }

    await registerDevice(nextToken, devicePlatform)
    state.syncedByUid[activeUid] = nextToken
    persistState()
  }

  const handleNativeToken = async (token: string): Promise<void> => {
    const normalized = normalizeToken(token)
    if (!normalized) return

    state.observedToken = normalized
    persistState()
    await syncTokenForActiveUser()
  }

  const attachListeners = async (): Promise<void> => {
    if (!devicePlatform || listenersAttached || disposed) return

    listenersAttached = true

    const registrationListener = await plugin.addListener('registration', (token) => {
      void enqueue(() => handleNativeToken(token?.value ?? ''))
    })
    const registrationErrorListener = await plugin.addListener('registrationError', (error) => {
      logger.warn('Native push registration error', error?.error ?? error)
    })
    listenerHandles = [registrationListener, registrationErrorListener]

    await requestNativeTokenRefresh()
  }

  const setAuthenticatedUid = async (uid: string | null): Promise<void> => {
    await enqueue(async () => {
      await attachListeners()
      activeUid = uid
      if (!activeUid) {
        return
      }
      await syncTokenForActiveUser()
      if (!state.observedToken) {
        await requestNativeTokenRefresh()
      }
    })
  }

  const deactivateSyncedTokenForUid = async (uid?: string | null): Promise<void> => {
    await enqueue(async () => {
      const targetUid = uid ?? activeUid
      if (!targetUid) return

      const token = normalizeToken(state.syncedByUid[targetUid])
      if (token) {
        await deactivateDevice(token)
      }
      delete state.syncedByUid[targetUid]
      persistState()

      if (activeUid === targetUid) {
        activeUid = null
      }
    })
  }

  const dispose = async (): Promise<void> => {
    disposed = true
    const handles = listenerHandles
    listenerHandles = []
    listenersAttached = false
    await Promise.all(handles.map((handle) => handle.remove().catch(() => undefined)))
  }

  return {
    setAuthenticatedUid,
    deactivateSyncedTokenForUid,
    dispose,
  }
}

const defaultPushTokenLifecycle = createPushTokenLifecycle()

export const setPushLifecycleAuthenticatedUid = async (uid: string | null): Promise<void> => {
  await defaultPushTokenLifecycle.setAuthenticatedUid(uid)
}

export const deactivatePushLifecycleTokenForUid = async (uid?: string | null): Promise<void> => {
  await defaultPushTokenLifecycle.deactivateSyncedTokenForUid(uid)
}

export const disposePushLifecycle = async (): Promise<void> => {
  await defaultPushTokenLifecycle.dispose()
}
