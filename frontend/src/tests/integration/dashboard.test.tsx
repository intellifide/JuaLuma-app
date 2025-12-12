// Updated 2025-12-11 17:55 CST by ChatGPT - cover Plaid success refetch
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import Dashboard from '../../pages/Dashboard'
import { useAuth, UserProfile } from '../../hooks/useAuth'
import { useAccounts } from '../../hooks/useAccounts'
import { useTransactions } from '../../hooks/useTransactions'
import { User } from 'firebase/auth'
import { Account, Transaction } from '../../types'
import userEvent from '@testing-library/user-event'

vi.mock('../../hooks/useAuth', () => ({ useAuth: vi.fn() }))
vi.mock('../../hooks/useAccounts', () => ({ useAccounts: vi.fn() }))
vi.mock('../../hooks/useTransactions', () => ({ useTransactions: vi.fn() }))
// Mock PlaidLinkButton since it might try to load external scripts
vi.mock('../../components/PlaidLinkButton', () => ({
    PlaidLinkButton: ({ onSuccess }: { onSuccess?: () => void }) => (
        <button onClick={() => onSuccess?.()}>Connect a bank account</button>
    )
}))

const mockUser = {
    uid: 'u1',
    email: 'user@example.com',
    emailVerified: true,
    isAnonymous: false,
    metadata: {},
    providerData: [],
    refreshToken: '',
    tenantId: null,
    delete: vi.fn(),
    getIdToken: vi.fn(),
    getIdTokenResult: vi.fn(),
    reload: vi.fn(),
    toJSON: vi.fn(),
    displayName: 'Test User',
    phoneNumber: null,
    photoURL: null,
} as unknown as User;

const mockProfile = {
    uid: 'u1',
    email: 'user@example.com',
    role: 'user',
};

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
        vi.clearAllMocks();
        vi.mocked(useAuth).mockReturnValue({
            user: mockUser,
            logout: vi.fn(),
            login: vi.fn(),
            signup: vi.fn(),
            loading: false,
            profileLoading: false,
            error: null,
            refetchProfile: vi.fn(),
            profile: mockProfile as UserProfile,
            resetPassword: vi.fn()
        });
        vi.mocked(useAccounts).mockReturnValue({
            accounts: mockAccounts,
            loading: false,
            error: '',
            refetch: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            remove: vi.fn(),
            sync: vi.fn(),
            fetchOne: vi.fn()
        });
        vi.mocked(useTransactions).mockReturnValue({
            transactions: mockTransactions,
            loading: false,
            total: 1,
            page: 1,
            pageSize: 50,
            error: null,
            refetch: vi.fn(),
            updateOne: vi.fn(),
            bulkUpdate: vi.fn(),
            remove: vi.fn()
        })
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
        vi.mocked(useAccounts).mockReturnValue({
            accounts: [],
            loading: false,
            error: '',
            refetch: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            remove: vi.fn(),
            sync: vi.fn(),
            fetchOne: vi.fn()
        });
        vi.mocked(useTransactions).mockReturnValue({
            transactions: [],
            loading: false,
            total: 0,
            page: 1,
            pageSize: 50,
            error: null,
            refetch: vi.fn(),
            updateOne: vi.fn(),
            bulkUpdate: vi.fn(),
            remove: vi.fn()
        })

        render(
            <BrowserRouter>
                <Dashboard />
            </BrowserRouter>
        )

        expect(screen.getByText(/No accounts connected/i)).toBeInTheDocument()
        expect(screen.getByText(/No transactions found/i)).toBeInTheDocument()
    })

    it('derives categories when none provided', async () => {
        const now = Date.now()
        vi.mocked(useTransactions).mockReturnValue({
            transactions: [
                {
                    id: 'tx-deriv',
                    uid: 'u1',
                    accountId: 'acc1',
                    amount: -12.34,
                    currency: 'USD',
                    ts: new Date(now).toISOString(),
                    description: 'Starbucks Coffee',
                    category: null,
                    isManual: false,
                    archived: false,
                    merchantName: 'Starbucks'
                }
            ],
            loading: false,
            total: 1,
            page: 1,
            pageSize: 50,
            error: null,
            refetch: vi.fn(),
            updateOne: vi.fn(),
            bulkUpdate: vi.fn(),
            remove: vi.fn()
        })

        render(
            <BrowserRouter>
                <Dashboard />
            </BrowserRouter>
        )

        expect(await screen.findByText(/Starbucks/i)).toBeInTheDocument()
        expect((await screen.findAllByText(/Food & Drink/)).length).toBeGreaterThan(0)
    })

    it('shows live budget and cashflow aggregates from transactions', async () => {
        const now = Date.now()
        vi.mocked(useTransactions).mockReturnValue({
            transactions: [
                {
                    id: 'tx-income',
                    uid: 'u1',
                    accountId: 'acc1',
                    amount: 2000,
                    currency: 'USD',
                    ts: new Date(now - 2 * 86400000).toISOString(),
                    description: 'Payroll',
                    category: 'Income',
                    isManual: false,
                    archived: false,
                    merchantName: 'Payroll Co'
                },
                {
                    id: 'tx-expense',
                    uid: 'u1',
                    accountId: 'acc1',
                    amount: -1000,
                    currency: 'USD',
                    ts: new Date(now - 1 * 86400000).toISOString(),
                    description: 'Rent Payment',
                    category: null,
                    isManual: false,
                    archived: false,
                    merchantName: 'Rent LLC'
                }
            ],
            loading: false,
            total: 2,
            page: 1,
            pageSize: 50,
            error: null,
            refetch: vi.fn(),
            updateOne: vi.fn(),
            bulkUpdate: vi.fn(),
            remove: vi.fn()
        })

        render(
            <BrowserRouter>
                <Dashboard />
            </BrowserRouter>
        )

        expect(await screen.findByText(/Income: \$2,000\.00 \| Expenses: \$1,000\.00/)).toBeInTheDocument()
        expect(screen.getByText(/27%/)).toBeInTheDocument() // 1000 / 3750 ~= 26.6 -> 27%
        expect(screen.getByText(/\$1,000\.00 of \$3,750\.00 spent/)).toBeInTheDocument()
    })

    it('flags recurring subscription patterns', async () => {
        const user = userEvent.setup()
        const now = Date.now()
        const day = 86400000
        vi.mocked(useTransactions).mockReturnValue({
            transactions: [
                {
                    id: 'sub1',
                    uid: 'u1',
                    accountId: 'acc1',
                    amount: -15,
                    currency: 'USD',
                    ts: new Date(now - 25 * day).toISOString(),
                    description: 'Streaming Service',
                    category: null,
                    isManual: false,
                    archived: false,
                    merchantName: undefined
                },
                {
                    id: 'sub2',
                    uid: 'u1',
                    accountId: 'acc1',
                    amount: -15.2,
                    currency: 'USD',
                    ts: new Date(now - 55 * day).toISOString(),
                    description: 'Streaming Service',
                    category: null,
                    isManual: false,
                    archived: false,
                    merchantName: undefined
                },
                {
                    id: 'sub3',
                    uid: 'u1',
                    accountId: 'acc1',
                    amount: -14.9,
                    currency: 'USD',
                    ts: new Date(now - 85 * day).toISOString(),
                    description: 'Streaming Service',
                    category: null,
                    isManual: false,
                    archived: false,
                    merchantName: undefined
                }
            ],
            loading: false,
            total: 3,
            page: 1,
            pageSize: 50,
            error: null,
            refetch: vi.fn(),
            updateOne: vi.fn(),
            bulkUpdate: vi.fn(),
            remove: vi.fn()
        })

        render(
            <BrowserRouter>
                <Dashboard />
            </BrowserRouter>
        )

        // widen timeframe to include all three monthly txns
        await user.click(screen.getByRole('button', { name: /3m/i }))

        expect((await screen.findAllByText(/Streaming Service/)).length).toBe(3)
        expect((await screen.findAllByText(/Subscription/)).length).toBeGreaterThan(0)
    })

    it('refetches accounts and transactions after Plaid link success', async () => {
        const refetchAccounts = vi.fn()
        const refetchTransactions = vi.fn()

        vi.mocked(useAccounts).mockReturnValue({
            accounts: mockAccounts,
            loading: false,
            error: '',
            refetch: refetchAccounts,
            create: vi.fn(),
            update: vi.fn(),
            remove: vi.fn(),
            sync: vi.fn(),
            fetchOne: vi.fn()
        })
        vi.mocked(useTransactions).mockReturnValue({
            transactions: mockTransactions,
            loading: false,
            total: 1,
            page: 1,
            pageSize: 50,
            error: null,
            refetch: refetchTransactions,
            updateOne: vi.fn(),
            bulkUpdate: vi.fn(),
            remove: vi.fn()
        })

        render(
            <BrowserRouter>
                <Dashboard />
            </BrowserRouter>
        )

        await userEvent.click(screen.getByText(/Connect a bank account/i))
        expect(refetchAccounts).toHaveBeenCalledTimes(1)
        expect(refetchTransactions).toHaveBeenCalledTimes(1)
    })
})
