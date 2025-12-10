// Updated 2025-12-08 21:49 CST by ChatGPT
import { useEffect, useState } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { api } from '../services/api'

type PlaidLinkButtonProps = {
  onSuccess?: () => void
  onError?: (message: string) => void
}

export const PlaidLinkButton = ({ onSuccess, onError }: PlaidLinkButtonProps) => {
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

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
    createToken()
  }, [onError])


  const { open, ready } = usePlaidLink({
    token: linkToken ?? '',
    onSuccess: async (publicToken, metadata) => {
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
    onExit: (err) => {
      if (err) onError?.(err.display_message || 'Plaid Link closed.')
    },
  })

  return (
    <button
      type="button"
      onClick={() => open()}
      disabled={!ready || loading}
      className="px-4 py-2 rounded-lg bg-royal-purple text-white hover:bg-deep-indigo disabled:opacity-50 transition-colors"
    >
      {loading ? 'Preparing...' : 'Connect with Plaid'}
    </button>
  )
}
