// Updated 2025-12-09 17:15 CST by ChatGPT
import type { PropsWithChildren, ReactNode } from 'react'

type ModalProps = PropsWithChildren<{
  open: boolean
  title?: string
  onClose: () => void
  footer?: ReactNode
}>

export const Modal = ({ open, title, onClose, children, footer }: ModalProps) => {
  if (!open) return null
  return (
    <div className="modal open" role="dialog" aria-modal="true" aria-label={title ?? 'Modal'}>
      <div className="modal-content">
        <div className="modal-header">
          {title && <h2>{title}</h2>}
          <button className="modal-close" aria-label="Close modal" onClick={onClose}>
            &times;
          </button>
        </div>
        <div>{children}</div>
        {footer && <div className="mt-md">{footer}</div>}
      </div>
    </div>
  )
}
