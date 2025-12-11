// Updated 2025-12-11 02:45 CST by ChatGPT
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { api } from '../services/api'

type PlaidLinkButtonProps = {
  onSuccess?: () => void
  onError?: (message: string) => void
}

export const PlaidLinkButton = ({ onSuccess, onError }: PlaidLinkButtonProps) => {
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [opening, setOpening] = useState(false)
  const linkReadyOnce = useRef(false)

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
    // Fetch the token once per mount to avoid repeated Plaid.init
    if (!linkToken) createToken()
  }, [onError])

  const linkConfig = useMemo(() => {
    if (!linkToken) return null
    return {
      token: linkToken,
      onSuccess: async (publicToken: string, metadata: any) => {
        try {
          await api.post('/plaid/exchange-token', {
            public_token: publicToken,
            institution_name: metadata.institution?.name ?? 'plaid',
          })
          onSuccess?.()
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unable to link account.'
          onError?.(message)
        }
      },
      onExit: (err: any) => {
        if (err) onError?.(err.display_message || 'Plaid Link closed.')
      }
    }
  }, [linkToken, onError, onSuccess])

  const { open, ready } = usePlaidLink(
    linkConfig ?? {
      token: '',
      onSuccess: () => {},
      onExit: () => {}
    }
  )

  const handleOpen = useCallback(() => {
    if (!linkConfig || !ready) return
    // Plaid Link should only initialize once per user action.
    linkReadyOnce.current = true
    setOpening(true)
    open()
    // Allow subsequent clicks after the handler returns.
    setTimeout(() => {
      linkReadyOnce.current = false
      setOpening(false)
    }, 0)
  }, [linkConfig, open, ready])

  return (
    <button
      type="button"
      onClick={handleOpen}
      disabled={!linkConfig || !ready || loading || opening}
      className="px-4 py-2 rounded-lg bg-royal-purple text-white hover:bg-deep-indigo disabled:opacity-50 transition-colors"
    >
      {loading ? 'Preparing...' : 'Connect with Plaid'}
    </button>
  )
}
