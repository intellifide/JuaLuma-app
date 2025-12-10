import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import Dashboard from '../../pages/Dashboard'
import { useAuth } from '../../hooks/useAuth'
import { useAccounts } from '../../hooks/useAccounts'
import { useTransactions } from '../../hooks/useTransactions'
import { Account, Transaction } from '../../types'

vi.mock('../../hooks/useAuth', () => ({ useAuth: vi.fn() }))
vi.mock('../../hooks/useAccounts', () => ({ useAccounts: vi.fn() }))
vi.mock('../../hooks/useTransactions', () => ({ useTransactions: vi.fn() }))
// Mock PlaidLinkButton since it might try to load external scripts
vi.mock('../../components/PlaidLinkButton', () => ({
    PlaidLinkButton: () => <button>Connect a bank account</button>
}))

const mockUser = { uid: 'u1', email: 'user@example.com', displayName: 'Test User' }

const mockAccounts: Account[] = [
    {
        id: 'acc1',
        uid: 'u1',
        accountName: 'Main Checking',
        accountType: 'traditional',
        balance: 5000,
        currency: 'USD',
        provider: 'plaid'
    }
]

const mockTransactions: Transaction[] = [
    {
        id: 'tx1',
        uid: 'u1',
        accountId: 'acc1',
        amount: 50,
        currency: 'USD',
        ts: new Date().toISOString(),
        description: 'Grocery Store',
        category: 'Food',
        isManual: false,
        archived: false,
        merchantName: 'Grocery Store'
    }
]

describe('Dashboard Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks()
            ; (useAuth as any).mockReturnValue({ user: mockUser })
            ; (useAccounts as any).mockReturnValue({ accounts: mockAccounts, refetch: vi.fn() })
            ; (useTransactions as any).mockReturnValue({ transactions: mockTransactions, loading: false })
    })

    it('renders user info, accounts and transactions', async () => {
        render(
            <BrowserRouter>
                <Dashboard />
            </BrowserRouter>
        )

        expect(screen.getByText(/Test User/)).toBeInTheDocument()
        expect(screen.getByText('Main Checking')).toBeInTheDocument()
        const balanceElements = screen.getAllByText(/5,000/)
        expect(balanceElements.length).toBeGreaterThan(0)
        expect(screen.getByText('Grocery Store')).toBeInTheDocument()
    })

    it('handles empty state', () => {
        ; (useAccounts as any).mockReturnValue({ accounts: [], refetch: vi.fn() })
            ; (useTransactions as any).mockReturnValue({ transactions: [], loading: false })

        render(
            <BrowserRouter>
                <Dashboard />
            </BrowserRouter>
        )

        expect(screen.getByText(/No accounts connected/i)).toBeInTheDocument()
        expect(screen.getByText(/No transactions found/i)).toBeInTheDocument()
    })
})
