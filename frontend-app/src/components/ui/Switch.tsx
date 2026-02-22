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

// Core Purpose: Provide an accessible, styled toggle switch UI component.
// Last Modified: 2026-01-26 13:05 CST

import { useId, ReactNode } from 'react'
import React from 'react'

type SwitchProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: ReactNode
  description?: ReactNode
  disabled?: boolean
  className?: string
  compact?: boolean
}

// Renders a labeled toggle switch with optional description text.
export default function Switch({ checked, onChange, label, description, disabled, className = '', compact = false }: SwitchProps) {
  const labelId = useId()
  const descriptionId = useId()
  const hasLabel = Boolean(label)
  const hasDescription = Boolean(description)

  // Handle a user-triggered toggle while respecting disabled state.
  const handleToggle = () => {
    if (disabled) return
    onChange(!checked)
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        {label && (
          <span id={labelId} className="text-xs text-text-muted whitespace-nowrap">
            {label}
          </span>
        )}
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-labelledby={hasLabel ? labelId : undefined}
          aria-label={hasLabel ? undefined : 'Toggle'}
          aria-disabled={disabled ? true : undefined}
          disabled={disabled}
          onClick={handleToggle}
          className={`${
            checked ? 'bg-primary border-primary' : 'bg-slate-300 border-slate-400 dark:bg-slate-600 dark:border-slate-500'
          } relative inline-flex h-4 w-8 flex-shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-primary focus:ring-offset-1 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span
            aria-hidden="true"
            className={`${
              checked ? 'translate-x-4' : 'translate-x-0'
            } pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white border border-slate-300 dark:border-slate-500 shadow ring-0 transition duration-200 ease-in-out`}
          />
        </button>
      </div>
    )
  }

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <span className="flex-grow flex flex-col">
        {label && (
          <span id={labelId} className="text-sm font-medium text-text-primary">
            {label}
          </span>
        )}
        {description && (
          <span id={descriptionId} className="text-sm text-text-secondary">
            {description}
          </span>
        )}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={hasLabel ? labelId : undefined}
        aria-describedby={hasDescription ? descriptionId : undefined}
        aria-label={hasLabel ? undefined : 'Toggle'}
        aria-disabled={disabled ? true : undefined}
        disabled={disabled}
        onClick={handleToggle}
        className={`${
          checked ? 'bg-primary border-primary' : 'bg-slate-300 border-slate-400 dark:bg-slate-600 dark:border-slate-500'
        } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span
          aria-hidden="true"
          className={`${
            checked ? 'translate-x-5' : 'translate-x-0'
          } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white border border-slate-300 dark:border-slate-500 shadow ring-0 transition duration-200 ease-in-out`}
        />
      </button>
    </div>
  )
}
