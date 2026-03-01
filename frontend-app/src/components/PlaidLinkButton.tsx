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

// Updated 2026-01-20 03:20 CST by Antigravity - standardize button styling
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePlaidLink, type PlaidLinkOnSuccessMetadata, type PlaidLinkError } from 'react-plaid-link'
import { api } from '../services/api'
import { isNativePlaidSupportedRuntime, openNativePlaidLink } from '../services/nativePlaidLink'
import { ExternalLinkModal } from './ExternalLinkModal'

const PLAID_OAUTH_TOKEN_KEY = 'plaid_oauth_link_token'

type PlaidLinkButtonProps = {
  onSuccess?: () => void | Promise<void>
  onError?: (message: string) => void
  onBeforeOpen?: () => boolean
}

export const PlaidLinkButton = ({ onSuccess, onError, onBeforeOpen }: PlaidLinkButtonProps) => {
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [opening, setOpening] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const linkReadyOnce = useRef(false)
  const fetchedTokenOnce = useRef(false)
  const receivedRedirectUri = useMemo(() => {
    if (typeof window === 'undefined') return undefined
    return window.location.search.includes('oauth_state_id=') ? window.location.href : undefined
  }, [])
  const useNativePlaid = useMemo(() => isNativePlaidSupportedRuntime(), [])

  const clearCachedOauthToken = useCallback(() => {
    if (typeof window === 'undefined') {
      return
    }
    try {
      window.sessionStorage.removeItem(PLAID_OAUTH_TOKEN_KEY)
    } catch {
      // no-op
    }
  }, [])

  useEffect(() => {
    const scripts = document.querySelectorAll('script[src*="plaid/link-initialize.js"]')
    if (scripts.length > 1) {
      scripts.forEach((script, index) => {
        if (index > 0) {
          script.parentElement?.removeChild(script)
        }
      })
    }
  }, [])

  const fetchLinkToken = useCallback(
    async (options?: { allowCachedOauthToken?: boolean }): Promise<string | null> => {
      const allowCachedOauthToken = options?.allowCachedOauthToken ?? true
      if (receivedRedirectUri && allowCachedOauthToken) {
        try {
          const cachedToken = window.sessionStorage.getItem(PLAID_OAUTH_TOKEN_KEY)
          if (cachedToken) {
            setLinkToken(cachedToken)
            return cachedToken
          }
        } catch {
          // Ignore sessionStorage access issues and fall back to API token creation.
        }
      }

      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timed out')), 8000)
        )
        // Race API call against 8s timeout
        const response = (await Promise.race([
          api.post('/plaid/link-token'),
          timeoutPromise,
        ])) as { data: { link_token?: string; linkToken?: string } }

        const resolvedLinkToken = response.data.link_token ?? response.data.linkToken ?? null
        setLinkToken(resolvedLinkToken)
        if (resolvedLinkToken) {
          try {
            window.sessionStorage.setItem(PLAID_OAUTH_TOKEN_KEY, resolvedLinkToken)
          } catch {
            // Ignore sessionStorage access issues.
          }
        }
        return resolvedLinkToken
      } catch (error) {
        // Surface backend token creation failures directly.
        console.warn('Plaid Link Token fetch failed.')
        const message = error instanceof Error ? error.message : 'Unable to start Plaid Link.'
        onError?.(message)
        return null
      }
    },
    [onError, receivedRedirectUri]
  )

  useEffect(() => {
    const createToken = async () => {
      try {
        await fetchLinkToken({ allowCachedOauthToken: true })
      } finally {
        setLoading(false)
      }
    }
    // Fetch the token only once per mount to avoid repeated Plaid.init
    if (!fetchedTokenOnce.current) {
      fetchedTokenOnce.current = true
      createToken()
    }
  }, [fetchLinkToken])

  const linkConfig = useMemo(() => {
    if (!linkToken) return null
    return {
      token: linkToken,
      onSuccess: async (publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => {
        try {
          const selectedAccountIds =
            metadata.accounts
              ?.map((account) => account.id)
              .filter((accountId): accountId is string => Boolean(accountId)) ?? []

          await api.post('/plaid/exchange-token', {
            public_token: publicToken,
            institution_name: metadata.institution?.name ?? 'plaid',
            selected_account_ids: selectedAccountIds,
          })
          clearCachedOauthToken()

          const afterSync = onSuccess?.()
          if (afterSync instanceof Promise) {
            await afterSync
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unable to link account.'
          onError?.(message)
        }
      },
      onExit: (err: PlaidLinkError | null) => {
        clearCachedOauthToken()
        if (err) {
          if (err.error_code === 'INVALID_LINK_TOKEN') {
            setLoading(true)
            void fetchLinkToken({ allowCachedOauthToken: false }).finally(() => {
              setLoading(false)
            })
            onError?.('Your Plaid session expired. Please try again.')
            return
          }
          onError?.(err.display_message || 'Plaid Link closed.')
        }
      },
      receivedRedirectUri,
    }
  }, [clearCachedOauthToken, fetchLinkToken, linkToken, onError, onSuccess, receivedRedirectUri])

  const fallbackConfig = useMemo(() => ({
    token: null,
    onSuccess: () => {},
    onExit: () => {},
  }), [])

  const { open, ready } = usePlaidLink(linkConfig ?? fallbackConfig)

  const exchangeNativePublicToken = useCallback(async (result: {
    publicToken: string
    institutionName: string
    selectedAccountIds: string[]
  }) => {
    await api.post('/plaid/exchange-token', {
      public_token: result.publicToken,
      institution_name: result.institutionName,
      selected_account_ids: result.selectedAccountIds,
    })
    clearCachedOauthToken()
    const afterSync = onSuccess?.()
    if (afterSync instanceof Promise) {
      await afterSync
    }
  }, [clearCachedOauthToken, onSuccess])

  const launchNativeLink = useCallback(async () => {
    let resolvedLinkToken = linkToken
    if (!resolvedLinkToken) {
      setLoading(true)
      resolvedLinkToken = await fetchLinkToken({ allowCachedOauthToken: false })
      setLoading(false)
    }

    if (!resolvedLinkToken) {
      onError?.('Unable to start Plaid Link.')
      return
    }

    const result = await openNativePlaidLink(resolvedLinkToken)
    if (result.status === 'success') {
      await exchangeNativePublicToken(result)
      return
    }

    clearCachedOauthToken()
    if (result.errorCode === 'INVALID_LINK_TOKEN') {
      setLoading(true)
      await fetchLinkToken({ allowCachedOauthToken: false })
      setLoading(false)
      onError?.('Your Plaid session expired. Please try again.')
      return
    }

    if (result.errorMessage) {
      onError?.(result.errorMessage)
    }
  }, [clearCachedOauthToken, exchangeNativePublicToken, fetchLinkToken, linkToken, onError])

  const handleOpenModal = useCallback(() => {
    if (!useNativePlaid && (!linkConfig || !ready)) return

    // Check limit before opening if callback provided
    if (onBeforeOpen && !onBeforeOpen()) {
      return
    }

    setShowModal(true)
  }, [linkConfig, onBeforeOpen, ready, useNativePlaid])

  const handleConfirm = useCallback(() => {
    setShowModal(false)
    setOpening(true)

    if (useNativePlaid) {
      void launchNativeLink()
        .catch((error) => {
          const message = error instanceof Error ? error.message : 'Unable to link account.'
          onError?.(message)
        })
        .finally(() => {
          setOpening(false)
        })
      return
    }

    // Plaid Link should only initialize once per user action.
    linkReadyOnce.current = true
    open()
    // Allow subsequent clicks after the handler returns.
    setTimeout(() => {
      linkReadyOnce.current = false
      setOpening(false)
    }, 0)
  }, [launchNativeLink, onError, open, useNativePlaid])

  return (
    <>
      <button
        type="button"
        onClick={handleOpenModal}
        disabled={(!useNativePlaid && (!linkConfig || !ready)) || loading || opening}
        className="btn btn-primary btn-sm w-full md:w-[170px]"
      >
        {loading ? 'Preparing...' : 'Connect with Plaid'}
      </button>

      <ExternalLinkModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleConfirm}
        providerName="Plaid"
      />
    </>
  )
}
