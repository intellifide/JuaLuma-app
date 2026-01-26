import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AccountCard } from '../AccountCard'
import { Account } from '../../types'

const mockAccount: Account = {
    id: '1',
    uid: 'user1',
    accountName: 'Test Account',
    accountType: 'traditional', // matches AccountType
    accountNumberMasked: '1234',
    balance: 1000.50,
    currency: 'USD',
    provider: 'plaid', // matches AccountProvider
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
}

describe('AccountCard', () => {
    it('renders account details correctly', () => {
        render(<AccountCard account={mockAccount} />)

        expect(screen.getByText('Test Account')).toBeInTheDocument()
        expect(screen.getByText('traditional')).toBeInTheDocument()
        expect(screen.getByText(/•••• 1234/)).toBeInTheDocument()
        // Balance check might need flexible matching due to currency formatting
        expect(screen.getByText('$1,000.50')).toBeInTheDocument()
    })

    it('renders correctly for manual accounts (non-plaid)', () => {
        const manualAccount: Account = { ...mockAccount, provider: 'manual', accountType: 'manual' }
        render(<AccountCard account={manualAccount} />)

        expect(screen.getByText('manual')).toBeInTheDocument()
        expect(screen.queryByText('Sync')).not.toBeInTheDocument()
    })

    it('calls onSync when Sync button is clicked', () => {
        const onSync = vi.fn()
        render(<AccountCard account={mockAccount} onSync={onSync} />)

        fireEvent.click(screen.getByText('Sync'))
        expect(onSync).toHaveBeenCalledWith('1')
    })

    it('calls onEdit when Edit button is clicked', () => {
        const onEdit = vi.fn()
        render(<AccountCard account={mockAccount} onEdit={onEdit} />)

        fireEvent.click(screen.getByText('Edit'))
        expect(onEdit).toHaveBeenCalledWith('1')
    })

    it('calls onDelete when Delete button is clicked', () => {
        const onDelete = vi.fn()
        render(<AccountCard account={mockAccount} onDelete={onDelete} />)

        fireEvent.click(screen.getByText('Delete'))
        expect(onDelete).toHaveBeenCalledWith('1')
    })
})
