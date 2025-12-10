import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import Dashboard from '../../pages/Dashboard'
import { useAuth, UserProfile } from '../../hooks/useAuth'
import { useAccounts } from '../../hooks/useAccounts'
import { useTransactions } from '../../hooks/useTransactions'
import { User } from 'firebase/auth'
import { Account, Transaction } from '../../types'

vi.mock('../../hooks/useAuth', () => ({ useAuth: vi.fn() }))
vi.mock('../../hooks/useAccounts', () => ({ useAccounts: vi.fn() }))
vi.mock('../../hooks/useTransactions', () => ({ useTransactions: vi.fn() }))
// Mock PlaidLinkButton since it might try to load external scripts
vi.mock('../../components/PlaidLinkButton', () => ({
    PlaidLinkButton: () => <button>Connect a bank account</button>
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
})
