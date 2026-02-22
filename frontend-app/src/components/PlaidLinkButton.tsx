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

// Updated 2026-01-20 03:20 CST by Antigravity - standardize button styling
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePlaidLink, type PlaidLinkOnSuccessMetadata, type PlaidLinkError } from 'react-plaid-link'
import { api } from '../services/api'
import { ExternalLinkModal } from './ExternalLinkModal'

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

  useEffect(() => {
    const createToken = async () => {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timed out')), 8000)
        )
        // Race API call against 8s timeout
        const response = await Promise.race([
          api.post('/plaid/link-token'),
          timeoutPromise
        ]) as { data: { link_token?: string; linkToken?: string } }

        setLinkToken(response.data.link_token ?? response.data.linkToken)
      } catch (error) {
        // Fallback to testing/sandbox mode if backend fails
        console.warn('Plaid Link Token fetch failed, checking for cached or mock token needed.')
        const message = error instanceof Error ? error.message : 'Unable to start Plaid Link.'
        onError?.(message)
      } finally {
        setLoading(false)
      }
    }
    // Fetch the token only once per mount to avoid repeated Plaid.init
    if (!fetchedTokenOnce.current) {
      fetchedTokenOnce.current = true
      createToken()
    }
  }, [onError])

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

          const response = await api.post('/plaid/exchange-token', {
            public_token: publicToken,
            institution_name: metadata.institution?.name ?? 'plaid',
            selected_account_ids: selectedAccountIds,
          })

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
        if (err) onError?.(err.display_message || 'Plaid Link closed.')
      }
    }
  }, [linkToken, onError, onSuccess])

  const fallbackConfig = useMemo(() => ({
    token: null,
    onSuccess: () => {},
    onExit: () => {},
  }), [])

  const { open, ready } = usePlaidLink(linkConfig ?? fallbackConfig)

  const handleOpenModal = useCallback(() => {
    if (!linkConfig || !ready) return
    
    // Check limit before opening if callback provided
    if (onBeforeOpen && !onBeforeOpen()) {
      return
    }
    
    setShowModal(true)
  }, [linkConfig, ready, onBeforeOpen])

  const handleConfirm = useCallback(() => {
    setShowModal(false)
    // Plaid Link should only initialize once per user action.
    linkReadyOnce.current = true
    setOpening(true)
    open()
    // Allow subsequent clicks after the handler returns.
    setTimeout(() => {
      linkReadyOnce.current = false
      setOpening(false)
    }, 0)
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={handleOpenModal}
        disabled={!linkConfig || !ready || loading || opening}
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
