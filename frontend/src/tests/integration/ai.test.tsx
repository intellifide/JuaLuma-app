import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import AIAssistant from '../../pages/AIAssistant'
import { useAuth, UserProfile } from '../../hooks/useAuth'
import { aiService } from '../../services/aiService'
import { User } from 'firebase/auth'

vi.mock('../../hooks/useAuth', () => ({ useAuth: vi.fn() }))
vi.mock('../../services/aiService', () => ({
    aiService: {
        getHistory: vi.fn(),
        getQuota: vi.fn(),
        sendMessage: vi.fn()
    },
    QuotaStatus: {}
}))

// Mock ChatMessage and ChatInput to avoid testing their internals again? 
// No, component integration test should use real child components if possible, but mocking complex children is also valid.
// I'll use real child components since they are simple enough. 

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn()

const mockUser = {
    uid: 'u1',
    email: 'user@example.com',
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
            ; vi.mocked(aiService.getQuota).mockResolvedValue({ used: 5, limit: 20, resets_at: '', tier: 'free' })
    })

    it('loads and displays initial state', async () => {
        render(
            <BrowserRouter>
                <AIAssistant />
            </BrowserRouter>
        )

        // Initial fetch
        await waitFor(() => {
            expect(aiService.getQuota).toHaveBeenCalled()
        })
        expect(screen.getByText(/5 \/ 20/)).toBeInTheDocument() // Quota display
        // Expect default welcome message if history is empty
        expect(screen.getByText(/Hello! I am Gemini 2.5 Flash/i)).toBeInTheDocument()
    })

    it('sends a message and displays response', async () => {
        vi.mocked(aiService.sendMessage).mockResolvedValue({
            response: 'This is the AI response',
            tokens: 10,
            quota_remaining: 14
        })

        render(
            <BrowserRouter>
                <AIAssistant />
            </BrowserRouter>
        )

        // Wait for initial load
        await waitFor(() => {
            expect(screen.getByText(/Hello! I am Gemini 2.5 Flash/i)).toBeInTheDocument()
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
            expect(aiService.sendMessage).toHaveBeenCalledWith('Hello AI')
            expect(screen.getByText('This is the AI response')).toBeInTheDocument()
        })

        // Quota should update (20 - 14 = 6 used)
        expect(screen.getByText(/6 \/ 20/)).toBeInTheDocument()
    })

    it('shows privacy modal if not accepted', async () => {
        localStorage.removeItem('jualuma_privacy_accepted')

        render(
            <BrowserRouter>
                <AIAssistant />
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

        expect(localStorage.getItem('jualuma_privacy_accepted')).toBe('true')
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
})
