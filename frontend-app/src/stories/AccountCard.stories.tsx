/*
 * Copyright (c) 2026 Intellifide, LLC.
 * Licensed under PolyForm Noncommercial License 1.0.0.
 * See "PolyForm-Noncommercial-1.0.0.txt" for full text.
 *
 * COMMUNITY RIGHTS:
 * - You CAN modify this code for personal use.
 * - You CAN build and share widgets/plugins for the ecosystem.
 *
 * RESTRICTIONS:
 * - You CANNOT resell, repackage, or distribute this application for a fee.
 * - You CANNOT use this application for commercial enterprise purposes.
 */

import type { Meta, StoryObj } from '@storybook/react'
import { AccountCard } from '../components/AccountCard'

const meta: Meta<typeof AccountCard> = {
    title: 'Components/AccountCard',
    component: AccountCard,
    tags: ['autodocs'],
    argTypes: {
        onSync: { action: 'synced' },
        onEdit: { action: 'edited' },
        onDelete: { action: 'deleted' },
    },
}

export default meta
type Story = StoryObj<typeof AccountCard>

export const Traditional: Story = {
    args: {
        account: {
            id: '123',
            accountType: 'traditional',
            accountName: 'Chase Checking',
            accountNumberMasked: '1234',
            balance: 15420.50,
            currency: 'USD',
            provider: 'plaid',
            createdAt: '2025-01-01',
            updatedAt: '2025-01-01',
            uid: 'user1'
        },
    },
}

export const Investment: Story = {
    args: {
        account: {
            id: '456',
            accountType: 'investment',
            accountName: 'Vanguard ETF',
            accountNumberMasked: '9876',
            balance: 102400.00,
            currency: 'USD',
            provider: 'plaid',
            createdAt: '2025-01-01',
            updatedAt: '2025-01-01',
            uid: 'user1'
        },
    },
}

export const Crypto: Story = {
    args: {
        account: {
            id: '789',
            accountType: 'web3',
            accountName: 'MetaMask Wallet',
            accountNumberMasked: '0x12...3456',
            balance: 2.54,
            currency: 'ETH',
            provider: 'manual',
            createdAt: '2025-01-01',
            updatedAt: '2025-01-01',
            uid: 'user1'
        },
    },
}
