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

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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
        vi.clearAllMocks();
        vi.mocked(useAuth).mockReturnValue({
            login: mockLogin,
            signup: mockSignup,
            user: null,
            loading: false,
            error: null,
            logout: vi.fn(),
            refetchProfile: vi.fn(),
            profile: null,
            profileLoading: false,
            resetPassword: vi.fn()
        })
    })

    describe('Login Flow', () => {
        it('submits login form with valid credentials', async () => {
            render(
                <BrowserRouter>
                    <Login />
                </BrowserRouter>
            )

            fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@testmail.app' } })
            fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } })

            const submitButton = screen.getByRole('button', { name: /Sign In/i })
            fireEvent.click(submitButton)

            await waitFor(() => {
                expect(mockLogin).toHaveBeenCalledWith('test@testmail.app', 'password123')
            })
        })

        it('shows error on invalid submission', async () => {
            mockLogin.mockRejectedValue(new Error('Invalid credentials'))

            render(
                <BrowserRouter>
                    <Login />
                </BrowserRouter>
            )

            fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@testmail.app' } })
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

            fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'John' } })
            fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Doe' } })
            fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@testmail.app' } })
            fireEvent.change(screen.getByLabelText(/^Password$/), { target: { value: 'StrongP@ss1' } })
            fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'StrongP@ss1' } })

            // Switches use role="switch"
            const switches = screen.getAllByRole('switch')
            // Assuming first two are Terms and Privacy based on render order (Terms first, Privacy second)
            fireEvent.click(switches[0]) // Terms
            fireEvent.click(switches[1]) // Privacy
            fireEvent.click(switches[2]) // Resident Cert check

            const submitButton = screen.getByRole('button', { name: /Create account/i })
            fireEvent.click(submitButton)

            await waitFor(() => {
                expect(mockSignup).toHaveBeenCalledWith(
                    'new@testmail.app',
                    'StrongP@ss1',
                    expect.any(Array), // Agreements
                    'John',
                    'Doe',
                    undefined // username
                )
            })
        })
    })
})
