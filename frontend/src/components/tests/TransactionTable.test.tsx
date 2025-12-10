import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TransactionTable } from '../TransactionTable'
import { Transaction } from '../../types'

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
