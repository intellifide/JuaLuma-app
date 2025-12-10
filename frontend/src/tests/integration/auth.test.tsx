import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { Login } from '../../pages/Login'
import { Signup } from '../../pages/Signup'
import { useAuth } from '../../hooks/useAuth'

// Mock useAuth
vi.mock('../../hooks/useAuth', () => ({
    useAuth: vi.fn(),
}))

const mockLogin = vi.fn()
const mockSignup = vi.fn()
const mockNavigate = vi.fn()

// Mock useNavigate
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom')
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    }
})

describe('Auth Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks()
            ; (useAuth as any).mockReturnValue({
                login: mockLogin,
                signup: mockSignup,
                user: null,
                loading: false
            })
    })

    describe('Login Flow', () => {
        it('submits login form with valid credentials', async () => {
            render(
                <BrowserRouter>
                    <Login />
                </BrowserRouter>
            )

            fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } })
            fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } })

            const submitButton = screen.getByRole('button', { name: /Sign In/i })
            fireEvent.click(submitButton)

            await waitFor(() => {
                expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123')
            })
        })

        it('shows error on invalid submission', async () => {
            mockLogin.mockRejectedValue(new Error('Invalid credentials'))

            render(
                <BrowserRouter>
                    <Login />
                </BrowserRouter>
            )

            fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } })
            fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'wrong' } })

            fireEvent.click(screen.getByRole('button', { name: /Sign In/i }))

            await waitFor(() => {
                expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
            })
        })
    })

    describe('Signup Flow', () => {
        it('submits signup form with valid inputs', async () => {
            render(
                <BrowserRouter>
                    <Signup />
                </BrowserRouter>
            )

            fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@example.com' } })
            fireEvent.change(screen.getByLabelText(/^Password$/), { target: { value: 'StrongP@ss1' } })
            fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'StrongP@ss1' } })

            // Fix "Found multiple elements" for checkbox using getAllByRole or more specific selector
            const checkboxes = screen.getAllByRole('checkbox')
            // Assuming first two are Terms and Privacy based on render order (Terms first, Privacy second)
            fireEvent.click(checkboxes[0]) // Terms
            fireEvent.click(checkboxes[1]) // Privacy

            const submitButton = screen.getByRole('button', { name: /Create account/i })
            fireEvent.click(submitButton)

            await waitFor(() => {
                expect(mockSignup).toHaveBeenCalledWith('new@example.com', 'StrongP@ss1')
            })
        })
    })
})
