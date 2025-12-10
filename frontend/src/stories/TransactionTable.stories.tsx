import type { Meta, StoryObj } from '@storybook/react'
import { TransactionTable } from '../components/TransactionTable'

const meta: Meta<typeof TransactionTable> = {
    title: 'Components/TransactionTable',
    component: TransactionTable,
    tags: ['autodocs'],
    argTypes: {
        onEdit: { action: 'edited' },
        onDelete: { action: 'deleted' },
        onPageChange: { action: 'pageChanged' },
    },
}

export default meta
type Story = StoryObj<typeof TransactionTable>

const transactions = [
    {
        id: '1',
        ts: '2025-12-08T10:00:00Z',
        amount: 120.50,
        currency: 'USD',
        merchantName: 'Amazon',
        category: 'Shopping',
        description: 'Holiday gifts',
        accountId: 'acc1',
        isManual: false,
        archived: false,
        uid: 'user1'
    },
    {
        id: '2',
        ts: '2025-12-07T14:30:00Z',
        amount: 15.00,
        currency: 'USD',
        merchantName: 'Starbucks',
        category: 'Dining',
        description: 'Coffee',
        accountId: 'acc1',
        isManual: false,
        archived: false,
        uid: 'user1'
    },
    {
        id: '3',
        ts: '2025-12-06T09:15:00Z',
        amount: 2500.00,
        currency: 'USD',
        merchantName: 'Landlord',
        category: 'Housing',
        description: 'Rent',
        accountId: 'acc1',
        isManual: true,
        archived: false,
        uid: 'user1'
    },
]

export const Default: Story = {
    args: {
        transactions: transactions,
        page: 1,
        pageSize: 10,
        total: 3,
    },
}

export const Empty: Story = {
    args: {
        transactions: [],
        page: 1,
        pageSize: 10,
        total: 0,
    },
}
