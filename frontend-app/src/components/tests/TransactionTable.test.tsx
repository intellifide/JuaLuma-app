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

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TransactionTable } from '../TransactionTable'
import { Transaction } from '../../types'
import { useAuth } from '../../hooks/useAuth'

vi.mock('../../hooks/useAuth', () => ({
    useAuth: vi.fn(),
}))

const mockTransactions: Transaction[] = [
    {
        id: '1',
        uid: 'u1',
        accountId: 'a1',
        amount: 50.00,
        currency: 'USD',
        ts: '2023-01-01T10:00:00Z',
        description: 'Groceries',
        merchantName: 'Supermarket',
        category: 'Food',
        isManual: false,
        archived: false,
    },
    {
        id: '2',
        uid: 'u1',
        accountId: 'a1',
        amount: 20.00,
        currency: 'USD',
        ts: '2023-01-02T10:00:00Z',
        description: 'Gas',
        merchantName: 'Gas Station',
        category: 'Transport',
        isManual: false,
        archived: false,
    }
]

describe('TransactionTable', () => {
    beforeEach(() => {
        vi.mocked(useAuth).mockReturnValue({
            profile: { time_zone: 'UTC' },
        } as any)
    })

    it('renders transactions correctly', () => {
        render(<TransactionTable transactions={mockTransactions} />)

        expect(screen.getByText('Supermarket')).toBeInTheDocument()
        expect(screen.getByText('Gas Station')).toBeInTheDocument()
        expect(screen.getByText('$50.00')).toBeInTheDocument()
        expect(screen.getByText('$20.00')).toBeInTheDocument()
    })

    it('renders empty state when no transactions', () => {
        render(<TransactionTable transactions={[]} />)
        expect(screen.getByText('No transactions yet.')).toBeInTheDocument()
    })

    it('sorts transactions by amount', () => {
        render(<TransactionTable transactions={mockTransactions} />)

        const amountHeader = screen.getByText('Amount')
        fireEvent.click(amountHeader) // First click: asc

        const rows = screen.getAllByRole('row')
        // Row 0 is header. Row 1 should be $20, Row 2 should be $50
        expect(rows[1]).toHaveTextContent('$20.00')
        expect(rows[2]).toHaveTextContent('$50.00')

        fireEvent.click(amountHeader) // Second click: desc
        const rowsDesc = screen.getAllByRole('row')
        expect(rowsDesc[1]).toHaveTextContent('$50.00')
        expect(rowsDesc[2]).toHaveTextContent('$20.00')
    })

    it('calls onPageChange when pagination buttons are clicked', () => {
        const onPageChange = vi.fn()
        // Force pagination by setting pageSize=1 and having 2 items
        render(
            <TransactionTable
                transactions={mockTransactions}
                onPageChange={onPageChange}
                page={1}
                pageSize={1}
                total={2}
            />
        )

        const nextButton = screen.getByText('Next')
        fireEvent.click(nextButton)
        expect(onPageChange).toHaveBeenCalledWith(2)
    })
})
