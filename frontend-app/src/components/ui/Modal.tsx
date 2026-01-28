// Core Purpose: Reusable modal container for dialogs and overlays.
// Last Modified: 2026-01-24 11:55 CST
// Updated 2025-12-09 17:15 CST by ChatGPT
import type { CSSProperties, PropsWithChildren, ReactNode, Ref } from 'react'

type ModalProps = PropsWithChildren<{
  open: boolean
  title?: string
  onClose: () => void
  footer?: ReactNode
  contentClassName?: string
  contentStyle?: CSSProperties
  showHeader?: boolean
  contentRef?: Ref<HTMLDivElement>
  onKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void
}>

// Render a shared modal shell with optional header/footer and sizing overrides.
export const Modal = ({
  open,
  title,
  onClose,
  children,
  footer,
  contentClassName,
  contentStyle,
  showHeader = true,
  contentRef,
  onKeyDown,
}: ModalProps) => {
  if (!open) return null
  const modalContentClass = contentClassName ? `modal-content ${contentClassName}` : 'modal-content'
  return (
    <div className="modal open" role="dialog" aria-modal="true" aria-label={title ?? 'Modal'}>
      <div className={modalContentClass} style={contentStyle} ref={contentRef} onKeyDown={onKeyDown}>
        {showHeader && (
          <div className="modal-header">
            {title && <h2>{title}</h2>}
            <button className="modal-close" aria-label="Close modal" onClick={onClose}>
              &times;
            </button>
          </div>
        )}
        <div>{children}</div>
        {footer && <div className="mt-md">{footer}</div>}
      </div>
    </div>
  )
}
