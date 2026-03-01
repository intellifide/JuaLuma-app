import { Capacitor, registerPlugin } from '@capacitor/core'

type NativePlaidLinkPlatform = 'ios' | 'android'

type NativePlaidLinkOpenRequest = {
  linkToken: string
}

type NativePlaidLinkOpenResponse = {
  status?: string
  publicToken?: string
  institutionName?: string
  selectedAccountIds?: string[]
  errorMessage?: string
  errorCode?: string
}

interface NativePlaidLinkPlugin {
  openLink(options: NativePlaidLinkOpenRequest): Promise<NativePlaidLinkOpenResponse>
}

export type NativePlaidLinkResult =
  | {
      status: 'success'
      publicToken: string
      institutionName: string
      selectedAccountIds: string[]
    }
  | {
      status: 'exit'
      errorMessage?: string
      errorCode?: string
    }

const NativePlaidLink = registerPlugin<NativePlaidLinkPlugin>('NativePlaidLink')

const toNativePlatform = (platform: string): NativePlaidLinkPlatform | null => {
  if (platform === 'ios' || platform === 'android') {
    return platform
  }
  return null
}

export const isNativePlaidSupportedRuntime = (platform = Capacitor.getPlatform()): boolean =>
  toNativePlatform(platform) !== null

export const openNativePlaidLink = async (
  linkToken: string,
  platform = Capacitor.getPlatform(),
): Promise<NativePlaidLinkResult> => {
  if (!isNativePlaidSupportedRuntime(platform)) {
    throw new Error('Native Plaid Link is only supported on iOS and Android.')
  }

  const normalizedToken = linkToken.trim()
  if (!normalizedToken) {
    throw new Error('linkToken is required')
  }

  const response = await NativePlaidLink.openLink({ linkToken: normalizedToken })

  if (response.status === 'success') {
    const publicToken = (response.publicToken ?? '').trim()
    if (!publicToken) {
      throw new Error('Native Plaid Link did not return a public token.')
    }
    return {
      status: 'success',
      publicToken,
      institutionName: (response.institutionName ?? 'plaid').trim() || 'plaid',
      selectedAccountIds: Array.isArray(response.selectedAccountIds)
        ? response.selectedAccountIds.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        : [],
    }
  }

  return {
    status: 'exit',
    errorMessage: response.errorMessage,
    errorCode: response.errorCode,
  }
}
