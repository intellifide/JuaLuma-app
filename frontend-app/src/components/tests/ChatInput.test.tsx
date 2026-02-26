import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ChatInput } from '../ChatInput'

describe('ChatInput upload allowlist', () => {
  it('applies file input accept filters', () => {
    const onSendMessage = vi.fn()
    const onUploadFile = vi.fn()
    const { container } = render(
      <ChatInput
        onSendMessage={onSendMessage}
        onUploadFile={onUploadFile}
        isLoading={false}
      />,
    )

    const input = container.querySelector('input[type="file"]')
    expect(input).toBeTruthy()
    expect(input?.getAttribute('accept')).toContain('.pdf')
    expect(input?.getAttribute('accept')).toContain('.heic')
    expect(input?.getAttribute('accept')).toContain('.xml')
  })

  it('blocks unsupported extensions pre-submit', () => {
    const onSendMessage = vi.fn()
    const onUploadFile = vi.fn()
    const { container } = render(
      <ChatInput
        onSendMessage={onSendMessage}
        onUploadFile={onUploadFile}
        isLoading={false}
      />,
    )

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const badFile = new File(['bad'], 'malware.exe', {
      type: 'application/octet-stream',
    })

    fireEvent.change(input, { target: { files: [badFile] } })

    expect(onUploadFile).not.toHaveBeenCalled()
    expect(
      screen.getByText(
        'Unsupported file type. Please choose a supported file format.',
      ),
    ).toBeInTheDocument()
  })

  it('allows supported extensions and clears previous error', () => {
    const onSendMessage = vi.fn()
    const onUploadFile = vi.fn()
    const { container } = render(
      <ChatInput
        onSendMessage={onSendMessage}
        onUploadFile={onUploadFile}
        isLoading={false}
      />,
    )

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, {
      target: {
        files: [
          new File(['bad'], 'malware.exe', {
            type: 'application/octet-stream',
          }),
        ],
      },
    })

    const goodFile = new File(['hello'], 'notes.txt', { type: 'text/plain' })
    fireEvent.change(input, { target: { files: [goodFile] } })

    expect(onUploadFile).toHaveBeenCalledTimes(1)
    expect(onUploadFile).toHaveBeenCalledWith(goodFile)
    expect(
      screen.queryByText(
        'Unsupported file type. Please choose a supported file format.',
      ),
    ).not.toBeInTheDocument()
  })

  it('renders attachment chips above input in chronological order with truncate + remove', () => {
    const onSendMessage = vi.fn()
    const onRemoveAttachment = vi.fn()

    render(
      <ChatInput
        onSendMessage={onSendMessage}
        isLoading={false}
        attachments={[
          { id: 'a1', name: 'alpha123456789.txt', fileType: 'txt' },
          { id: 'a2', name: 'beta123456789.pdf', fileType: 'pdf' },
        ]}
        onRemoveAttachment={onRemoveAttachment}
      />,
    )

    const firstChip = screen.getByText('alpha12345...')
    const secondChip = screen.getByText('beta123456...')
    expect(firstChip.compareDocumentPosition(secondChip) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByText('TXT')).toBeInTheDocument()
    expect(screen.getByText('PDF')).toBeInTheDocument()
    expect(screen.getByTestId('attachment-separator')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Remove alpha123456789.txt'))
    expect(onRemoveAttachment).toHaveBeenCalledWith('a1')
  })
})
