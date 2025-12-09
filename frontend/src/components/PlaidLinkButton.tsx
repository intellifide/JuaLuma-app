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
        const { data } = await api.post('/plaid/link-token')
        setLinkToken(data.link_token ?? data.linkToken)
      } catch (error) {
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
