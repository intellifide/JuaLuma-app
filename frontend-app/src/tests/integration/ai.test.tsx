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
import AIAssistant from '../../pages/AIAssistant'
import { useAuth, UserProfile } from '../../hooks/useAuth'
import { aiService } from '../../services/aiService'
import { User } from '../../services/gcp_auth_driver'
import { ToastProvider } from '../../components/ui/Toast'

vi.mock('../../hooks/useAuth', () => ({ useAuth: vi.fn() }))
vi.mock('../../services/aiService', () => ({
    aiService: {
        getHistory: vi.fn(),
        getQuota: vi.fn(),
        sendMessage: vi.fn(),
        sendMessageStream: vi.fn(),
    },
    QuotaStatus: {}
}))
vi.mock('../../services/legal', () => ({
    legalService: {
        acceptAgreements: vi.fn().mockResolvedValue({ accepted: 1 }),
    },
}))

// Mock ChatMessage and ChatInput to avoid testing their internals again?
// No, component integration test should use real child components if possible, but mocking complex children is also valid.
// I'll use real child components since they are simple enough.

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn()

const mockUser = {
    uid: 'u1',
    email: 'user@testmail.app',
    getIdToken: vi.fn().mockResolvedValue('fake-token')
} as unknown as User

describe('AI Assistant Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        localStorage.clear()
        localStorage.setItem('jualuma_privacy_accepted', 'true') // Bypass privacy modal for main tests
            ; vi.mocked(useAuth).mockReturnValue({
                user: mockUser,
                logout: vi.fn(),
                login: vi.fn(),
                signup: vi.fn(),
                loading: false,
                error: null,
                refetchProfile: vi.fn(),
                profile: { role: 'user' } as UserProfile,
                profileLoading: false,
                resetPassword: vi.fn()
            })
            ; vi.mocked(aiService.getHistory).mockResolvedValue([])
            ; vi.mocked(aiService.getQuota).mockResolvedValue({
                used: 5,
                limit: 20,
                usage_progress: 0.25,
                usage_copy: 'AI usage this period',
                resets_at: '',
                tier: 'free',
            })
    })

    it('loads and displays initial state', async () => {
        render(
            <BrowserRouter>
                <ToastProvider>
                    <AIAssistant />
                </ToastProvider>
            </BrowserRouter>
        )

        // Initial fetch
        await waitFor(() => {
            expect(aiService.getQuota).toHaveBeenCalled()
        })
        await waitFor(() => {
            expect(screen.getByText(/AI usage this period: 25%/)).toBeInTheDocument()
        }) // Quota display
        // Expect default welcome message if history is empty
        expect(screen.getByText(/Hello! I'm your AI Assistant/i)).toBeInTheDocument()
    })

    it('sends a message and displays response', async () => {
        vi.mocked(aiService.sendMessageStream).mockResolvedValue({
            response: 'This is the AI response',
            tokens: 10,
            quota_remaining: 14
        })

        render(
            <BrowserRouter>
                <ToastProvider>
                    <AIAssistant />
                </ToastProvider>
            </BrowserRouter>
        )

        // Wait for initial load/quota
        await waitFor(() => {
            expect(screen.getByText(/Hello! I'm your AI Assistant/i)).toBeInTheDocument()
            expect(aiService.getQuota).toHaveBeenCalled()
        })

        const input = screen.getByRole('textbox', { name: /Chat input/i })
        const sendButton = screen.getByRole('button', { name: /Send/i })

        fireEvent.change(input, { target: { value: 'Hello AI' } })
        expect(input).toHaveValue('Hello AI')

        expect(sendButton).not.toBeDisabled()
        fireEvent.click(sendButton)

        // User message appears immediately
        expect(screen.getByText('Hello AI')).toBeInTheDocument()

        // Wait for response
        await waitFor(() => {
            expect(aiService.sendMessageStream).toHaveBeenCalled()
            expect(screen.getByText('This is the AI response')).toBeInTheDocument()
        })

        // Quota should update (20 - 14 = 6 used)
        await waitFor(() => {
            expect(screen.getByText(/AI usage this period: 30%/)).toBeInTheDocument()
        })
    })

    it('shows privacy modal if not accepted', async () => {
        localStorage.removeItem('jualuma_privacy_accepted')

        render(
            <BrowserRouter>
                <ToastProvider>
                    <AIAssistant />
                </ToastProvider>
            </BrowserRouter>
        )

        // Expect overlay to be present immediately
        expect(screen.getByText(/Please accept the Privacy & User Agreement/i)).toBeInTheDocument()

        // Wait for privacy modal timeout
        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument()
        }, { timeout: 2000 })

        // Simulate scroll to bottom to enable accept button
        const scrollContainer = screen.getByLabelText(/AI Assistant disclaimer/i)

        // Mock scroll properties
        Object.defineProperty(scrollContainer, 'scrollHeight', { value: 200, configurable: true })
        Object.defineProperty(scrollContainer, 'clientHeight', { value: 100, configurable: true })
        Object.defineProperty(scrollContainer, 'scrollTop', { value: 100, configurable: true })

        fireEvent.scroll(scrollContainer)

        const acceptButton = screen.getByRole('button', { name: /Accept & Continue/i })
        expect(acceptButton).not.toBeDisabled()
        fireEvent.click(acceptButton)

        await waitFor(() => {
            expect(localStorage.getItem('jualuma_privacy_accepted')).toBe('true')
        })
        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        })
    })

    it('reuses pending assistant bubble on stream failure', async () => {
        vi.mocked(aiService.sendMessageStream).mockRejectedValue(
            new Error('We encountered an issue while processing your AI request. Please try again.'),
        )

        const { container } = render(
            <BrowserRouter>
                <ToastProvider>
                    <AIAssistant />
                </ToastProvider>
            </BrowserRouter>
        )

        await waitFor(() => {
            expect(aiService.getQuota).toHaveBeenCalled()
        })

        const input = screen.getByRole('textbox', { name: /Chat input/i })
        const sendButton = screen.getByRole('button', { name: /Send/i })

        fireEvent.change(input, { target: { value: 'Hello AI' } })
        fireEvent.click(sendButton)

        await waitFor(() => {
            expect(screen.getByText(/Error: We encountered an issue while processing your AI request/i)).toBeInTheDocument()
        })

        const assistantBubbles = container.querySelectorAll('.chat-message-assistant')
        expect(assistantBubbles.length).toBe(1)
    })
})
