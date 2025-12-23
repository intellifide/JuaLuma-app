import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { HouseholdPage } from '../../pages/Household/HouseholdPage'
import { householdService } from '../../services/householdService'
import { useAuth } from '../../hooks/useAuth'
import { Household } from '../../types/household'
import type { User } from 'firebase/auth'
import userEvent from '@testing-library/user-event'

type AuthContextType = ReturnType<typeof useAuth>

vi.mock('../../services/householdService', () => ({
    householdService: {
        getMyHousehold: vi.fn(),
        createHousehold: vi.fn(),
        leaveHousehold: vi.fn(),
        inviteMember: vi.fn(),
        acceptInvite: vi.fn(),
    }
}))

vi.mock('../../hooks/useAuth', () => ({
    useAuth: vi.fn()
}))

const mockUser = {
    uid: 'u1',
    email: 'owner@example.com',
} as unknown as User

const mockHousehold: Household = {
    id: 'hh1',
    name: 'Test Family',
    owner_uid: 'u1',
    created_at: '2025-01-01',
    members: [
        { uid: 'u1', email: 'owner@example.com', role: 'admin', joined_at: '2025-01-01', ai_access_enabled: true },
        { uid: 'u2', email: 'member@example.com', role: 'member', joined_at: '2025-01-02', ai_access_enabled: true }
    ],
    invites: []
}

describe('HouseholdPage Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(useAuth).mockReturnValue({
            user: mockUser,
            loading: false,
            profile: null,
            profileLoading: false,
            error: null,
            signup: vi.fn(),
            login: vi.fn(),
            logout: vi.fn(),
            resetPassword: vi.fn(),
            refetchProfile: vi.fn().mockResolvedValue(null),
        } as unknown as AuthContextType)
    })

    it('renders loading state initially', () => {
        vi.mocked(householdService.getMyHousehold).mockReturnValue(new Promise(() => {})) // Never resolves
        render(
            <BrowserRouter>
                <HouseholdPage />
            </BrowserRouter>
        )
        expect(screen.getByText(/Loading household/i)).toBeInTheDocument()
    })

    it('renders create/join forms when not in a household (404/null)', async () => {
        vi.mocked(householdService.getMyHousehold).mockRejectedValue({ message: "not in a household" })
        
        render(
            <BrowserRouter>
                <HouseholdPage />
            </BrowserRouter>
        )

        await waitFor(() => {
            expect(screen.getByText('Household Management')).toBeInTheDocument()
        })
        expect(screen.getByText('Create a Household')).toBeInTheDocument()
        expect(screen.getByText('Join a Household')).toBeInTheDocument()
    })

    it('renders household dashboard when in a household', async () => {
        vi.mocked(householdService.getMyHousehold).mockResolvedValue(mockHousehold)

        render(
            <BrowserRouter>
                <HouseholdPage />
            </BrowserRouter>
        )

        await waitFor(() => {
            expect(screen.getByText('Test Family')).toBeInTheDocument()
        })
        expect(screen.getByText('owner@example.com')).toBeInTheDocument()
        expect(screen.getByText('member@example.com')).toBeInTheDocument()
        
        // Admin buttons
        expect(screen.getByText('Invite Member')).toBeInTheDocument()
        expect(screen.getByText('Leave Household')).toBeInTheDocument()
    })

    it('allows creating a household', async () => {
        vi.mocked(householdService.getMyHousehold).mockRejectedValue({ message: "not in a household" })
        vi.mocked(householdService.createHousehold).mockResolvedValue(mockHousehold)
        
        const user = userEvent.setup()

        render(
            <BrowserRouter>
                <HouseholdPage />
            </BrowserRouter>
        )

        await waitFor(() => expect(screen.getByText('Create a Household')).toBeInTheDocument())

        const input = screen.getByPlaceholderText('e.g. Smith Family')
        await user.type(input, 'Test Family')
        await user.click(screen.getByText('Create'))

        expect(householdService.createHousehold).toHaveBeenCalledWith({ name: 'Test Family' })
        
        await waitFor(() => {
            expect(screen.getByText('Test Family')).toBeInTheDocument()
        })
    })

    it('allows inviting a member (Admin)', async () => {
        vi.mocked(householdService.getMyHousehold).mockResolvedValue(mockHousehold)
        const user = userEvent.setup()

        render(
            <BrowserRouter>
                <HouseholdPage />
            </BrowserRouter>
        )

        await waitFor(() => expect(screen.getByText('Invite Member')).toBeInTheDocument())
        await user.click(screen.getByText('Invite Member'))

        // Modal should open
        expect(screen.getByText('Invite Member', { selector: 'h2' })).toBeInTheDocument()
        
        const emailInput = screen.getByPlaceholderText('friend@example.com')
        await user.type(emailInput, 'new@example.com')
        
        const sendBtn = screen.getByText('Send Invite')
        await user.click(sendBtn)

        expect(householdService.inviteMember).toHaveBeenCalledWith({ email: 'new@example.com', is_minor: false })
    })

    it('allows leaving the household', async () => {
        vi.mocked(householdService.getMyHousehold).mockResolvedValue(mockHousehold)
        vi.mocked(householdService.leaveHousehold).mockResolvedValue({ status: 'success', detail: 'Left' })
        
        // Check window.confirm mock if needed, but integration test environment usually mocks it or we rely on user clicking ok.
        // Vitest/JSDOM doesn't show alert/confirm by default, need to mock.
        vi.spyOn(window, 'confirm').mockReturnValue(true)
        const user = userEvent.setup()

        render(
            <BrowserRouter>
                <HouseholdPage />
            </BrowserRouter>
        )

        await waitFor(() => expect(screen.getByText('Leave Household')).toBeInTheDocument())
        await user.click(screen.getByText('Leave Household'))

        expect(householdService.leaveHousehold).toHaveBeenCalled()
        
        // Should return to "Create/Join" view (setHousehold(null))
        await waitFor(() => {
             expect(screen.getByText('Create a Household')).toBeInTheDocument()
        })
    })
})
