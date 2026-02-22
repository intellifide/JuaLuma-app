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

import { useEffect, useRef, useState } from 'react'

type InfoPopoverProps = {
  label: string
  children: string
}

export const InfoPopover = ({ label, children }: InfoPopoverProps) => {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [open])

  return (
    <div className="info-popover" ref={containerRef}>
      <button
        type="button"
        className="info-popover-trigger"
        aria-label={label}
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation()
          setOpen((prev) => !prev)
        }}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="9" strokeWidth="1.5" />
          <path d="M12 8h.01" strokeWidth="2" strokeLinecap="round" />
          <path d="M11 12h1v4h1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="info-popover-panel" role="tooltip">
          {children}
        </div>
      )}
    </div>
  )
}
