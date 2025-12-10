import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ChatMessage } from '../ChatMessage'

describe('ChatMessage', () => {
    it('renders user message correctly', () => {
        render(<ChatMessage role="user" text="Hello AI" time="10:00 AM" />)
        expect(screen.getByText('Hello AI')).toBeInTheDocument()
        expect(screen.getByText('10:00 AM')).toBeInTheDocument()
        expect(screen.queryByTitle('Copy response')).not.toBeInTheDocument()
    })

    it('renders assistant message correctly', () => {
        render(<ChatMessage role="assistant" text="Hello User" time="10:01 AM" />)
        expect(screen.getByText('Hello User')).toBeInTheDocument()
        expect(screen.getByTitle('Copy response')).toBeInTheDocument()
    })

    it('copies text when copy button is clicked', async () => {
        const writeTextMock = vi.fn()
        Object.assign(navigator, {
            clipboard: {
                writeText: writeTextMock,
            },
        });

        render(<ChatMessage role="assistant" text="Copy me" time="10:00 AM" />)

        const copyButton = screen.getByTitle('Copy response')
        fireEvent.click(copyButton)

        expect(writeTextMock).toHaveBeenCalledWith('Copy me')
        expect(await screen.findByText('Copied!')).toBeInTheDocument()
    })
})
