import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ChatMessage } from '../ChatMessage'
import { ToastProvider } from '../ui/Toast'

const renderWithToast = (ui: JSX.Element) => render(<ToastProvider>{ui}</ToastProvider>)

describe('ChatMessage', () => {
    it('renders user message correctly', () => {
        renderWithToast(<ChatMessage role="user" text="Hello AI" time="10:00 AM" />)
        expect(screen.getByText('Hello AI')).toBeInTheDocument()
        expect(screen.getByText('10:00 AM')).toBeInTheDocument()
        expect(screen.getByTitle('Copy your message')).toBeInTheDocument()
    })

    it('renders assistant message correctly', () => {
        renderWithToast(<ChatMessage role="assistant" text="Hello User" time="10:01 AM" />)
        expect(screen.getByText('Hello User')).toBeInTheDocument()
        expect(screen.getByTitle('Copy assistant message')).toBeInTheDocument()
    })

    it('copies text when copy button is clicked', async () => {
        const writeTextMock = vi.fn()
        Object.assign(navigator, {
            clipboard: {
                writeText: writeTextMock,
            },
        });

        renderWithToast(<ChatMessage role="assistant" text="Copy me" time="10:00 AM" />)

        const copyButton = screen.getByTitle('Copy assistant message')
        fireEvent.click(copyButton)

        expect(writeTextMock).toHaveBeenCalledWith('Copy me')
    })
})
