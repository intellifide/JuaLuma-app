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

// Updated 2026-02-10 14:35 CST - Plaid linking no longer triggers manual sync calls
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlaidLinkButton } from '../PlaidLinkButton'
import { vi } from 'vitest'

const postMock = vi.fn()

vi.mock('../../services/api', () => ({
  api: { post: (...args: unknown[]) => postMock(...args) },
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

    usePlaidLinkMock.mockImplementation((config: { onSuccess?: (token: string, metadata: unknown) => void }) => {
      return {
        open: vi.fn(() =>
          config?.onSuccess?.('public-token', {
            institution: { name: 'Bank' },
            accounts: [{ id: 'plaid-1' }, { id: 'plaid-2' }],
          }),
        ),
        ready: true,
      }
    })
  })

  it('exchanges Plaid token and calls onSuccess after Plaid success', async () => {
    const onSuccess = vi.fn().mockResolvedValue(undefined)
    render(<PlaidLinkButton onSuccess={onSuccess} />)

    const button = await screen.findByRole('button', { name: /connect with plaid/i })
    await waitFor(() => expect(button).not.toBeDisabled())

    // Click trigger button
    await userEvent.click(button)

    // Expect modal to appear and click confirm
    const confirmButton = await screen.findByRole('button', { name: /continue to secure login/i })
    await userEvent.click(confirmButton)

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/plaid/exchange-token', {
        public_token: 'public-token',
        institution_name: 'Bank',
        selected_account_ids: ['plaid-1', 'plaid-2'],
      })
      expect(onSuccess).toHaveBeenCalledTimes(1)
    })
  })
})
