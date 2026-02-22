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

import React, { useCallback, useEffect, useState } from 'react'
import { useToast } from './Toast'

type CopyIconButtonProps = {
  value: string
  label: string
  className?: string
  onCopiedMessage?: string
  disabled?: boolean
}

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ')

export const CopyIconButton: React.FC<CopyIconButtonProps> = ({
  value,
  label,
  className,
  onCopiedMessage = 'Copied to clipboard',
  disabled,
}) => {
  const toast = useToast()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(false), 1500)
    return () => window.clearTimeout(t)
  }, [copied])

  const onCopy = useCallback(async () => {
    if (disabled) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast.show(onCopiedMessage, 'success')
    } catch (err) {
      console.error('Copy failed:', err)
      toast.show('Unable to copy', 'error')
    }
  }, [disabled, onCopiedMessage, toast, value])

  return (
    <button
      type="button"
      onClick={onCopy}
      className={cx(
        'inline-flex items-center justify-center h-7 w-7 rounded-md border border-white/10 bg-white/5 text-text-secondary hover:text-text-primary hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5',
        className,
      )}
      aria-label={label}
      title={label}
      disabled={disabled}
    >
      {copied ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  )
}

