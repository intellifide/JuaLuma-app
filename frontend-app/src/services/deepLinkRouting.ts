import { Capacitor, type PluginListenerHandle, registerPlugin } from '@capacitor/core'

type URLOpenListenerEvent = {
  url: string
}

type LaunchUrl = {
  url?: string | null
}

interface NativeAppPlugin {
  addListener(
    eventName: 'appUrlOpen',
    listenerFunc: (event: URLOpenListenerEvent) => void,
  ): Promise<PluginListenerHandle>
  getLaunchUrl(): Promise<LaunchUrl>
}

const NativeApp = registerPlugin<NativeAppPlugin>('App')

const DEFAULT_DEEP_LINK_SCHEME = 'jualuma'
const DEFAULT_WEB_HOSTS = [
  'app.jualuma.com',
  'jualuma-user-app-stage-ripznron4a-uc.a.run.app',
  'frontend-app-77ybfmw7cq-uc.a.run.app',
]

const configuredHosts = (import.meta.env.VITE_DEEP_LINK_HOSTS ?? '')
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean)

const allowedWebHosts = new Set([...DEFAULT_WEB_HOSTS, ...configuredHosts])
const customScheme = (import.meta.env.VITE_DEEP_LINK_SCHEME ?? DEFAULT_DEEP_LINK_SCHEME).trim().toLowerCase()

const normalizePath = (path: string): string => {
  const collapsed = path.replace(/\/{2,}/g, '/')
  if (!collapsed || collapsed === '/') {
    return '/'
  }
  if (!collapsed.startsWith('/')) {
    return `/${collapsed}`
  }
  return collapsed
}

const withSearchAndHash = (path: string, parsed: URL): string => {
  return `${normalizePath(path)}${parsed.search}${parsed.hash}`
}

const parseCustomSchemeRoute = (parsed: URL): string => {
  const hostPart = parsed.host.trim()
  const pathPart = parsed.pathname.trim()

  if (hostPart && pathPart && pathPart !== '/') {
    return withSearchAndHash(`/${hostPart}${pathPart}`, parsed)
  }

  if (hostPart) {
    return withSearchAndHash(`/${hostPart}`, parsed)
  }

  return withSearchAndHash(pathPart || '/', parsed)
}

export const extractAppRouteFromDeepLink = (rawUrl: string): string | null => {
  if (!rawUrl || !rawUrl.trim()) {
    return null
  }

  try {
    const parsed = new URL(rawUrl)
    const protocol = parsed.protocol.toLowerCase()

    if (protocol === `${customScheme}:`) {
      return parseCustomSchemeRoute(parsed)
    }

    if (protocol === 'https:' || protocol === 'http:') {
      if (!allowedWebHosts.has(parsed.host.toLowerCase())) {
        return null
      }
      return withSearchAndHash(parsed.pathname || '/', parsed)
    }
  } catch {
    if (rawUrl.startsWith('/')) {
      return normalizePath(rawUrl)
    }
  }

  return null
}

export const attachNativeDeepLinkListener = (navigateTo: (route: string) => void): (() => void) => {
  if (Capacitor.getPlatform() === 'web') {
    return () => undefined
  }

  let closed = false
  let listenerHandle: PluginListenerHandle | null = null

  const routeAndNavigate = (incomingUrl?: string | null): void => {
    if (!incomingUrl) {
      return
    }
    const route = extractAppRouteFromDeepLink(incomingUrl)
    if (route) {
      navigateTo(route)
    }
  }

  NativeApp.getLaunchUrl()
    .then((launchUrl) => {
      if (!closed) {
        routeAndNavigate(launchUrl?.url ?? null)
      }
    })
    .catch(() => undefined)

  NativeApp.addListener('appUrlOpen', (event) => {
    routeAndNavigate(event?.url)
  })
    .then((handle) => {
      if (closed) {
        void handle.remove()
        return
      }
      listenerHandle = handle
    })
    .catch(() => undefined)

  return () => {
    closed = true
    if (listenerHandle) {
      void listenerHandle.remove()
      listenerHandle = null
    }
  }
}
