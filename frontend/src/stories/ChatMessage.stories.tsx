import type { Meta, StoryObj } from '@storybook/react'
import { ChatMessage } from '../components/ChatMessage'

const meta: Meta<typeof ChatMessage> = {
    title: 'Components/ChatMessage',
    component: ChatMessage,
    tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof ChatMessage>

export const UserMessage: Story = {
    args: {
        role: 'user',
        text: 'What is my current balance?',
        time: '12:00 PM',
    },
}

export const AssistantMessage: Story = {
    args: {
        role: 'assistant',
        text: 'Your current balance is $15,420.50. You have spent $120.50 on Shopping this week.',
        time: '12:01 PM',
    },
}

export const LongResponse: Story = {
    args: {
        role: 'assistant',
        text: `Here is a breakdown of your spending:
1. Shopping: $500
2. Dining: $200
3. Transport: $150

Would you like to set a budget for next month?`,
        time: '12:05 PM',
    },
}
