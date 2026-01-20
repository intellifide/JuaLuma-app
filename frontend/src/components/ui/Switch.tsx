// Core Purpose: Provide an accessible, styled toggle switch UI component.
// Last Modified: 2026-01-17 23:40 CST

import { useId, ReactNode } from 'react'
import React from 'react'

type SwitchProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: ReactNode
  description?: ReactNode
  disabled?: boolean
  className?: string
}

// Renders a labeled toggle switch with optional description text.
export default function Switch({ checked, onChange, label, description, disabled, className = '' }: SwitchProps) {
  const labelId = useId()
  const descriptionId = useId()
  const hasLabel = Boolean(label)
  const hasDescription = Boolean(description)

  // Handle a user-triggered toggle while respecting disabled state.
  const handleToggle = () => {
    if (disabled) return
    onChange(!checked)
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
          checked ? 'bg-royal-purple' : 'bg-gray-200'
        } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-royal-purple focus:ring-offset-2 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span
          aria-hidden="true"
          className={`${
            checked ? 'translate-x-5' : 'translate-x-0'
          } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
        />
      </button>
    </div>
  )
}
