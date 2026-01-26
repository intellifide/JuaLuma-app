import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import type { User } from 'firebase/auth'
import { Settings } from '../../pages/Settings'
import { useAuth } from '../../hooks/useAuth'
import { apiFetch } from '../../services/auth'
import { ToastProvider } from '../../components/ui/Toast'

type AuthContextType = ReturnType<typeof useAuth>

vi.mock('../../hooks/useAuth', () => ({
    useAuth: vi.fn(),
}))

vi.mock('../../services/auth', () => ({
    apiFetch: vi.fn(),
    changePassword: vi.fn(),
}))

const mockUser = {
    uid: 'user_1',
    email: 'user@example.com',
    displayName: 'Test User',
} as unknown as User

const baseProfile = {
    uid: 'user_1',
    email: 'user@example.com',
    plan: 'pro_monthly',
    subscription_status: 'active',
    subscriptions: [{ renew_at: '2030-01-01T00:00:00Z' }],
}

const originalLocation = window.location

const setWindowLocation = (href: string) => {
    delete (window as unknown as { location?: Location }).location
    ;(window as unknown as { location: { href: string } }).location = { href }
}

describe('Settings Subscription Management', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        setWindowLocation('http://localhost/settings')
        vi.mocked(apiFetch).mockImplementation(async () => ({
            ok: true,
            json: async () => [],
        } as Response))
    })

    afterEach(() => {
        delete (window as unknown as { location?: Location }).location
        ;(window as unknown as { location: Location }).location = originalLocation
    })

    it('shows household billing notice for restricted members', async () => {
        vi.mocked(useAuth).mockReturnValue({
            user: mockUser,
            profile: {
                ...baseProfile,
                household_member: {
                    uid: 'member_1',
                    household_id: 'hh_1',
                    role: 'member',
                    can_view_household: true,
                    ai_access_enabled: true,
                },
            },
            loading: false,
            profileLoading: false,
            error: null,
            signup: vi.fn(),
            login: vi.fn(),
            logout: vi.fn(),
            resetPassword: vi.fn(),
            refetchProfile: vi.fn().mockResolvedValue(null),
        } as unknown as AuthContextType)

        const user = userEvent.setup()

        render(
            <ToastProvider>
                <Settings />
            </ToastProvider>
        )

        await user.click(screen.getByRole('tab', { name: 'Subscription' }))

        expect(
            screen.getByText(/Your subscription is part of a Household Plan/i),
        ).toBeInTheDocument()
        expect(screen.queryByText('Manage Subscription')).not.toBeInTheDocument()
    })

    it('opens the billing portal for standard members', async () => {
        vi.mocked(useAuth).mockReturnValue({
            user: mockUser,
            profile: baseProfile,
            loading: false,
            profileLoading: false,
            error: null,
            signup: vi.fn(),
            login: vi.fn(),
            logout: vi.fn(),
            resetPassword: vi.fn(),
            refetchProfile: vi.fn().mockResolvedValue(null),
        } as unknown as AuthContextType)

        vi.mocked(apiFetch).mockImplementation(async (path) => {
            if (path === '/billing/invoices') {
                return {
                    ok: true,
                    json: async () => [],
                } as Response
            }

            if (path === '/billing/portal') {
                return {
                    ok: true,
                    json: async () => ({ url: 'https://billing.example.com/portal' }),
                } as Response
            }

            throw new Error(`Unexpected apiFetch path: ${path}`)
        })

        const user = userEvent.setup()

        render(
            <ToastProvider>
                <Settings />
            </ToastProvider>
        )

        await user.click(screen.getByRole('tab', { name: 'Subscription' }))

        const manageButton = await screen.findByText('Manage Subscription')
        await user.click(manageButton)

        await waitFor(() => {
            expect(apiFetch).toHaveBeenCalledWith(
                '/billing/portal',
                expect.objectContaining({
                    method: 'POST',
                }),
            )
        })

        expect(window.location.href).toBe('https://billing.example.com/portal')
    })
})
