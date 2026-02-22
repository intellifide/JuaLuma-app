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

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ConnectAccounts } from '../ConnectAccounts'
import { Account } from '../../types'

const showToastMock = vi.fn()
const syncMock = vi.fn().mockResolvedValue(undefined)
const refetchMock = vi.fn().mockResolvedValue(undefined)

const accounts: Account[] = [
  {
    id: 'plaid-acc',
    uid: 'u1',
    accountType: 'traditional',
    provider: 'plaid',
    accountName: 'Plaid Checking',
    accountNumberMasked: '1234',
    balance: 1250,
    currency: 'USD',
    syncStatus: 'active',
    connectionHealth: 'connected',
    syncMode: 'automatic',
    lastSyncedAt: '2026-02-10T18:00:00Z',
  },
  {
    id: 'cex-acc',
    uid: 'u1',
    accountType: 'cex',
    provider: 'cex',
    accountName: 'CEX Exchange',
    balance: 500,
    currency: 'USD',
    syncStatus: 'active',
    syncMode: 'manual',
  },
]

vi.mock('../../hooks/useAccounts', () => ({
  useAccounts: () => ({
    accounts,
    loading: false,
    error: null,
    refetch: refetchMock,
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    sync: syncMock,
    fetchOne: vi.fn(),
  }),
}))

vi.mock('../../hooks/useManualAssets', () => ({
  useManualAssets: () => ({
    assets: [],
    loading: false,
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  }),
}))

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    profile: { plan: 'pro_monthly', subscriptions: [{ status: 'active', plan: 'pro_monthly' }] },
  }),
}))

vi.mock('../../hooks/useUserTimeZone', () => ({
  useUserTimeZone: () => 'UTC',
}))

vi.mock('../../components/ui/Toast', () => ({
  useToast: () => ({ show: showToastMock }),
}))

vi.mock('../../services/householdService', () => ({
  householdService: {
    getMyHousehold: vi.fn().mockResolvedValue({
      members: [],
    }),
  },
}))

vi.mock('../../services/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue({
      data: {
        tier: 'pro',
        tier_display: 'Pro',
        limits: { plaid: 10, web3: 2, cex: 3, manual: 20 },
        current: { plaid: 1, web3: 0, cex: 1, manual: 0 },
        total_connected: 2,
        total_limit: 35,
        upgrade_url: '/settings/billing',
      },
    }),
  },
}))

vi.mock('../../components/PlaidLinkButton', () => ({
  PlaidLinkButton: () => <button type="button">Connect with Plaid</button>,
}))

describe('ConnectAccounts Plaid Sync Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows Plaid automatic sync status in the all-accounts table', async () => {
    render(<ConnectAccounts />)
    expect(await screen.findByText('Auto-sync active')).toBeInTheDocument()
  })

  it('does not show sync actions for Plaid but keeps manual sync for CEX', async () => {
    const user = userEvent.setup()
    render(<ConnectAccounts />)

    const plaidRow = (await screen.findByText('Plaid Checking')).closest('tr')
    expect(plaidRow).not.toBeNull()
    await user.click(within(plaidRow as HTMLElement).getByRole('button', { name: 'Open actions menu' }))
    expect(screen.queryByRole('button', { name: 'Refresh Sync' })).not.toBeInTheDocument()

    const cexRow = (await screen.findByText('CEX Exchange')).closest('tr')
    expect(cexRow).not.toBeNull()
    await user.click(within(cexRow as HTMLElement).getByRole('button', { name: 'Open actions menu' }))
    expect(await screen.findByRole('button', { name: 'Refresh Sync' })).toBeInTheDocument()
  })
})
