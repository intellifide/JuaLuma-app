// Updated 2025-12-09 17:15 CST by ChatGPT
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type ToastKind = 'success' | 'error'
type ToastEntry = { id: string; message: string; kind: ToastKind }

type ToastContextValue = {
  show: (message: string, kind?: ToastKind) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ')

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastEntry[]>([])

  const show = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, message, kind }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  const value = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-container" style={{ position: 'fixed', bottom: 'var(--spacing-lg)', right: 'var(--spacing-lg)', zIndex: 2000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--spacing-sm)', pointerEvents: 'none' }}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cx('toast show', toast.kind === 'success' ? 'toast-success' : 'toast-error')}
            role="alert"
            aria-live="polite"
          >
            <span>{toast.kind === 'success' ? '✓' : '✕'}</span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
