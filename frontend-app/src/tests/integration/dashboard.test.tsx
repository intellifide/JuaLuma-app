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

// Updated 2026-01-26 14:10 CST - align with Financial Overview dashboard
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import Dashboard from '../../pages/Dashboard'
import { useAuth, UserProfile } from '../../hooks/useAuth'
import { useAccounts } from '../../hooks/useAccounts'
import { useNetWorth, useCashFlow, useSpendingByCategory } from '../../hooks/useAnalytics'
import { useBudgetStatus } from '../../hooks/useBudgetReporting'
import { ToastProvider } from '../../components/ui/Toast'
import { User } from '../../services/gcp_auth_driver'
import { Account } from '../../types'

vi.mock('../../hooks/useAuth', () => ({ useAuth: vi.fn() }))
vi.mock('../../hooks/useAccounts', () => ({ useAccounts: vi.fn() }))
vi.mock('../../hooks/useAnalytics', () => ({
    useNetWorth: vi.fn(),
    useCashFlow: vi.fn(),
    useSpendingByCategory: vi.fn()
}))
vi.mock('../../hooks/useBudgetReporting', () => ({ useBudgetStatus: vi.fn() }))

const mockUser = {
    uid: 'u1',
    email: 'user@testmail.app',
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
    email: 'user@testmail.app',
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
            error: null,
            refetch: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            remove: vi.fn(),
            sync: vi.fn(),
            refreshMetadata: vi.fn(),
            fetchOne: vi.fn()
        });
        vi.mocked(useNetWorth).mockReturnValue({ data: null, loading: false, error: null, refetch: vi.fn() })
        vi.mocked(useCashFlow).mockReturnValue({ data: null, loading: false, error: null, refetch: vi.fn() })
        vi.mocked(useSpendingByCategory).mockReturnValue({ data: null, loading: false, error: null, refetch: vi.fn() })
        vi.mocked(useBudgetStatus).mockReturnValue({ data: null, loading: false, error: null, refetch: vi.fn() })
    })

    it('renders user info and overview modules', async () => {
        render(
            <BrowserRouter>
                <ToastProvider>
                    <Dashboard />
                </ToastProvider>
            </BrowserRouter>
        )

        expect(screen.getByText(/Financial Overview/i)).toBeInTheDocument()
        expect(screen.getByRole('heading', { name: /^Net Worth$/i, level: 3 })).toBeInTheDocument()
        expect(screen.getByText(/Cash Flow Pulse/i)).toBeInTheDocument()
        expect(screen.getByRole('heading', { name: /Spending Health/i })).toBeInTheDocument()
        expect(screen.getByText(/Asset Snapshot/i)).toBeInTheDocument()
        expect(screen.getByText(/Debt Snapshot/i)).toBeInTheDocument()
    })

    it('shows placeholders when no history exists', () => {
        vi.mocked(useAccounts).mockReturnValue({
            accounts: [],
            loading: false,
            error: null,
            refetch: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            remove: vi.fn(),
            sync: vi.fn(),
            refreshMetadata: vi.fn(),
            fetchOne: vi.fn()
        });
        vi.mocked(useCashFlow).mockReturnValue({ data: null, loading: false, error: null, refetch: vi.fn() })
        vi.mocked(useSpendingByCategory).mockReturnValue({ data: null, loading: false, error: null, refetch: vi.fn() })

        render(
            <BrowserRouter>
                <ToastProvider>
                    <Dashboard />
                </ToastProvider>
            </BrowserRouter>
        )

        expect(screen.getByText(/No cash flow activity yet/i)).toBeInTheDocument()
        expect(screen.getByText(/No spending history yet/i)).toBeInTheDocument()
    })

    it('renders cashflow, budget, and top drivers when data is present', async () => {
        const now = Date.now()
        vi.mocked(useCashFlow).mockReturnValue({
            data: {
                income: [{date: new Date(now - 2 * 86400000).toISOString(), value: 2000}],
                expenses: [{date: new Date(now - 1 * 86400000).toISOString(), value: 1000}]
            },
            loading: false,
            error: null,
            refetch: vi.fn()
        })
        vi.mocked(useSpendingByCategory).mockReturnValue({
            data: { data: [{category: 'Rent', amount: 1000}, {category: 'Dining', amount: 250}] },
            loading: false,
            error: null,
            refetch: vi.fn()
        })
        vi.mocked(useBudgetStatus).mockReturnValue({
            data: {
                scope: 'personal',
                budget_owner_uid: 'u1',
                spend_uids: ['u1'],
                items: [],
                total_budget: 3750,
                total_spent: 1000,
                percent_used: (1000 / 3750) * 100,
                counts: { under: 0, at: 0, over: 0 },
            },
            loading: false,
            error: null,
            refetch: vi.fn()
        })

        render(
            <BrowserRouter>
                <ToastProvider>
                    <Dashboard />
                </ToastProvider>
            </BrowserRouter>
        )

        // Updated expectations to match compact currency format and new layout
        // Income 2000 -> $2.0K, Expenses 1000 -> $1.0K
        const incomeElements = await screen.findAllByText(/\$2(\.0)?K/)
        expect(incomeElements.length).toBeGreaterThan(0)
        const outElements = await screen.findAllByText(/\$1(\.0)?K/)
        expect(outElements.length).toBeGreaterThan(0)
        const percentElements = screen.getAllByText(/27%/)
        expect(percentElements.length).toBeGreaterThan(0)
        expect(screen.getByText(/\$1(\.0)?K of \$3\.8K spent/)).toBeInTheDocument()
        expect(screen.getByText(/Top Money Drivers/i)).toBeInTheDocument()
        const rentElements = screen.getAllByText(/Rent/)
        expect(rentElements.length).toBeGreaterThan(0)
    })

    // it('flags recurring subscription patterns', async () => {
    //     const user = userEvent.setup()
    //     const now = Date.now()
    //     const day = 86400000
    //     vi.mocked(useTransactions).mockReturnValue({
    //         transactions: [
    //             {
    //                 id: 'sub1',
    //                 uid: 'u1',
    //                 accountId: 'acc1',
    //                 amount: -15,
    //                 currency: 'USD',
    //                 ts: new Date(now - 25 * day).toISOString(),
    //                 description: 'Streaming Service',
    //                 category: null,
    //                 isManual: false,
    //                 archived: false,
    //                 merchantName: undefined
    //             },
    //             {
    //                 id: 'sub2',
    //                 uid: 'u1',
    //                 accountId: 'acc1',
    //                 amount: -15.2,
    //                 currency: 'USD',
    //                 ts: new Date(now - 55 * day).toISOString(),
    //                 description: 'Streaming Service',
    //                 category: null,
    //                 isManual: false,
    //                 archived: false,
    //                 merchantName: undefined
    //             },
    //             {
    //                 id: 'sub3',
    //                 uid: 'u1',
    //                 accountId: 'acc1',
    //                 amount: -14.9,
    //                 currency: 'USD',
    //                 ts: new Date(now - 85 * day).toISOString(),
    //                 description: 'Streaming Service',
    //                 category: null,
    //                 isManual: false,
    //                 archived: false,
    //                 merchantName: undefined
    //             }
    //         ],
    //         loading: false,
    //         total: 3,
    //         page: 1,
    //         pageSize: 50,
    //         error: null,
    //         refetch: vi.fn(),
    //         updateOne: vi.fn(),
    //         bulkUpdate: vi.fn(),
    //         remove: vi.fn()
    //     })

    //     render(
    //         <BrowserRouter>
    //             <ToastProvider>
    //                 <Dashboard />
    //             </ToastProvider>
    //         </BrowserRouter>
    //     )

    //     // widen timeframe to include all three monthly txns
    //     await user.click(screen.getByRole('button', { name: /3m/i }))

    //     expect((await screen.findAllByText(/Streaming Service/)).length).toBe(3)
    //     expect((await screen.findAllByText(/Subscription/)).length).toBeGreaterThan(0)
    // })

    // Plaid CTA removed from dashboard; sync actions live on Connect Accounts.
})
