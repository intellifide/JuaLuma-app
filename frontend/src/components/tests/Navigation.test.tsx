import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Navigation } from '../Navigation'
import { BrowserRouter } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

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
        (useAuth as any).mockReturnValue({ user: null, logout: vi.fn() })

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
        (useAuth as any).mockReturnValue({
            user: { id: '1', email: 'test@example.com' },
            logout: vi.fn()
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
        (useAuth as any).mockReturnValue({
            user: { id: '1' },
            logout: logoutMock
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
