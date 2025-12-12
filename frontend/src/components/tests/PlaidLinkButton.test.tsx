// Updated 2025-12-11 17:55 CST by ChatGPT - cover Plaid post-link sync flow
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlaidLinkButton } from '../PlaidLinkButton'
import { vi } from 'vitest'

const postMock = vi.fn()
const syncAccountMock = vi.fn()

vi.mock('../../services/api', () => ({
  api: { post: (...args: unknown[]) => postMock(...args) },
}))

vi.mock('../../services/accounts', () => ({
  syncAccount: (...args: unknown[]) => syncAccountMock(...args),
}))

const usePlaidLinkMock = vi.fn()
vi.mock('react-plaid-link', () => ({
  usePlaidLink: (...args: unknown[]) => usePlaidLinkMock(...args),
}))

describe('PlaidLinkButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // First call: link token; second call: exchange token with two accounts
    postMock.mockResolvedValueOnce({ data: { link_token: 'ltok' } })
    postMock.mockResolvedValueOnce({
      data: { accounts: [{ id: 'acc-1' }, { id: 'acc-2' }] },
    })
    syncAccountMock.mockResolvedValue(undefined)

    usePlaidLinkMock.mockImplementation((config: { onSuccess?: (token: string, metadata: unknown) => void }) => {
      return {
        open: vi.fn(() => config?.onSuccess?.('public-token', { institution: { name: 'Bank' } })),
        ready: true,
      }
    })
  })

  it('syncs linked accounts and calls onSuccess after Plaid success', async () => {
    const onSuccess = vi.fn().mockResolvedValue(undefined)
    render(<PlaidLinkButton onSuccess={onSuccess} />)

    const button = await screen.findByRole('button', { name: /connect with plaid/i })
    await waitFor(() => expect(button).not.toBeDisabled())

    await userEvent.click(button)

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/plaid/exchange-token', {
        public_token: 'public-token',
        institution_name: 'Bank',
      })
      expect(syncAccountMock).toHaveBeenCalledWith('acc-1')
      expect(syncAccountMock).toHaveBeenCalledWith('acc-2')
      expect(onSuccess).toHaveBeenCalledTimes(1)
    })
  })
})
