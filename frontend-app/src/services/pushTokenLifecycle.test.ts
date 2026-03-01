import { describe, expect, it, vi } from 'vitest'
import { createPushTokenLifecycle } from './pushTokenLifecycle'

type ListenerMap = {
  registration?: (token: { value: string }) => void
  registrationError?: (error: { error?: string }) => void
}

const createStorage = () => {
  const map = new Map<string, string>()
  return {
    getItem(key: string): string | null {
      return map.has(key) ? map.get(key)! : null
    },
    setItem(key: string, value: string): void {
      map.set(key, value)
    },
  }
}

const createPluginMock = () => {
  const listeners: ListenerMap = {}

  type RegistrationListener = (token: { value: string }) => void
  type RegistrationErrorListener = (error: { error?: string }) => void

  const plugin = {
    requestPermissions: vi.fn(async () => ({ receive: 'granted' as const })),
    register: vi.fn(async () => undefined),
    addListener: vi.fn(async (
      eventName: 'registration' | 'registrationError',
      listener: RegistrationListener | RegistrationErrorListener,
    ) => {
      if (eventName === 'registration') {
        listeners.registration = listener as RegistrationListener
      } else {
        listeners.registrationError = listener as RegistrationErrorListener
      }
      return {
        remove: vi.fn(async () => undefined),
      }
    }),
  }

  return {
    plugin,
    emitRegistration(token: string) {
      listeners.registration?.({ value: token })
    },
  }
}

const flushQueue = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0))
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe('createPushTokenLifecycle', () => {
  it('registers token for authenticated user', async () => {
    const registerDevice = vi.fn(async () => undefined)
    const deactivateDevice = vi.fn(async () => undefined)
    const { plugin, emitRegistration } = createPluginMock()

    const lifecycle = createPushTokenLifecycle({
      platform: 'ios',
      plugin,
      storage: createStorage(),
      registerDevice,
      deactivateDevice,
      logger: { warn: vi.fn(), error: vi.fn() },
    })

    await lifecycle.setAuthenticatedUid('uid-1')
    emitRegistration('token-1')
    await flushQueue()

    expect(registerDevice).toHaveBeenCalledWith('token-1', 'ios')
    expect(deactivateDevice).not.toHaveBeenCalled()
  })

  it('deactivates stale token when native token rotates', async () => {
    const registerDevice = vi.fn(async () => undefined)
    const deactivateDevice = vi.fn(async () => undefined)
    const { plugin, emitRegistration } = createPluginMock()

    const lifecycle = createPushTokenLifecycle({
      platform: 'android',
      plugin,
      storage: createStorage(),
      registerDevice,
      deactivateDevice,
      logger: { warn: vi.fn(), error: vi.fn() },
    })

    await lifecycle.setAuthenticatedUid('uid-2')
    emitRegistration('token-old')
    await flushQueue()
    emitRegistration('token-new')
    await flushQueue()

    expect(registerDevice).toHaveBeenNthCalledWith(1, 'token-old', 'android')
    expect(deactivateDevice).toHaveBeenCalledWith('token-old')
    expect(registerDevice).toHaveBeenNthCalledWith(2, 'token-new', 'android')
  })

  it('deactivates synced token on explicit deactivation', async () => {
    const registerDevice = vi.fn(async () => undefined)
    const deactivateDevice = vi.fn(async () => undefined)
    const { plugin, emitRegistration } = createPluginMock()

    const lifecycle = createPushTokenLifecycle({
      platform: 'ios',
      plugin,
      storage: createStorage(),
      registerDevice,
      deactivateDevice,
      logger: { warn: vi.fn(), error: vi.fn() },
    })

    await lifecycle.setAuthenticatedUid('uid-3')
    emitRegistration('token-logout')
    await flushQueue()

    await lifecycle.deactivateSyncedTokenForUid('uid-3')
    await flushQueue()

    expect(deactivateDevice).toHaveBeenCalledWith('token-logout')
  })

  it('is inert on web platform', async () => {
    const registerDevice = vi.fn(async () => undefined)
    const deactivateDevice = vi.fn(async () => undefined)
    const { plugin } = createPluginMock()

    const lifecycle = createPushTokenLifecycle({
      platform: 'web',
      plugin,
      storage: createStorage(),
      registerDevice,
      deactivateDevice,
      logger: { warn: vi.fn(), error: vi.fn() },
    })

    await lifecycle.setAuthenticatedUid('uid-web')
    await flushQueue()

    expect(plugin.addListener).not.toHaveBeenCalled()
    expect(plugin.register).not.toHaveBeenCalled()
    expect(registerDevice).not.toHaveBeenCalled()
    expect(deactivateDevice).not.toHaveBeenCalled()
  })
})
