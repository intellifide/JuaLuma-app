// Core Purpose: Standardized select UI wrapper with consistent dropdown arrow.
// Last Updated: 2026-02-03 00:00 CST

import React from 'react'

type Props = React.SelectHTMLAttributes<HTMLSelectElement> & {
  variant?: 'form-select' | 'input' | 'none'
  wrapperClassName?: string
}

export const Select: React.FC<Props> = ({
  className,
  wrapperClassName,
  variant = 'form-select',
  children,
  ...props
}) => {
  const variantClass =
    variant === 'input' ? 'input w-full' : variant === 'none' ? '' : 'form-select w-full'

  return (
    <div className={wrapperClassName ?? 'relative'}>
      <select
        className={`${variantClass} pr-10 appearance-none ${className ?? ''}`.trim()}
        {...props}
      >
        {children}
      </select>
      {/* Standard dropdown chevron (same SVG as TimeZonePicker) */}
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted">
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </div>
  )
}
