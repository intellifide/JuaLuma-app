import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Navigation } from '../Navigation'
import { BrowserRouter } from 'react-router-dom'
import { useAuth, UserProfile } from '../../hooks/useAuth'
import { User } from 'firebase/auth'

// Mock the useAuth hook
vi.mock('../../hooks/useAuth', () => ({
    useAuth: vi.fn(),
}))

// Mock useTheme to avoid context issues
vi.mock('../../hooks/useTheme', () => ({
    useTheme: vi.fn(() => ({ theme: 'light', toggle: vi.fn() })),
}))

describe('Navigation', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders guest links when not logged in', () => {
        vi.mocked(useAuth).mockReturnValue({
            user: null,
            logout: vi.fn(),
            login: vi.fn(),
            signup: vi.fn(),
            loading: false,
            profileLoading: false,
            error: null,
            refetchProfile: vi.fn(),
            profile: null,
            resetPassword: vi.fn()
        })

        render(
            <BrowserRouter>
                <Navigation />
            </BrowserRouter>
        )

        expect(screen.getAllByText('Features')[0]).toBeInTheDocument()
        expect(screen.getAllByText('Pricing')[0]).toBeInTheDocument()
        expect(screen.getAllByText('Login')[0]).toBeInTheDocument()
        expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
    })

    it('renders auth links when logged in', () => {
        vi.mocked(useAuth).mockReturnValue({
            user: { uid: '1', email: 'test@example.com' } as unknown as User,
            logout: vi.fn(),
            login: vi.fn(),
            signup: vi.fn(),
            loading: false,
            profileLoading: false,
            error: null,
            refetchProfile: vi.fn(),
            profile: { role: 'user' } as UserProfile,
            resetPassword: vi.fn()
        })

        render(
            <BrowserRouter>
                <Navigation />
            </BrowserRouter>
        )

        expect(screen.getAllByText('Dashboard')[0]).toBeInTheDocument()
        expect(screen.getAllByText('Settings')[0]).toBeInTheDocument()
        expect(screen.queryByText('Pricing')).not.toBeInTheDocument()
    })

    it('calls logout when logout button is clicked', () => {
        const logoutMock = vi.fn();
        vi.mocked(useAuth).mockReturnValue({
            user: { uid: '1', email: 'test@example.com' } as unknown as User,
            logout: logoutMock,
            login: vi.fn(),
            signup: vi.fn(),
            loading: false,
            profileLoading: false,
            error: null,
            refetchProfile: vi.fn(),
            profile: { role: 'user' } as UserProfile,
            resetPassword: vi.fn()
        })

        render(
            <BrowserRouter>
                <Navigation />
            </BrowserRouter>
        )

        // Using getAllByText because logout might appear in mobile menu too
        const logoutButtons = screen.getAllByText('Logout')
        fireEvent.click(logoutButtons[0]) // Click desktop logout

        expect(logoutMock).toHaveBeenCalled()
    })
})
