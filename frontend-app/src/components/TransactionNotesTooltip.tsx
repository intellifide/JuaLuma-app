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

// Core Purpose: Reusable tooltip component for displaying transaction notes/descriptions
// Last Updated: 2026-01-24 03:15 CST

import React from 'react'

interface TransactionNotesTooltipProps {
  description: string
  isVisible: boolean
}

/**
 * Standardized tooltip for displaying transaction notes/descriptions.
 * Features:
 * - Responsive width (min-w-64 max-w-md)
 * - Proper text wrapping for long content
 * - Consistent styling across the app
 */
export const TransactionNotesTooltip: React.FC<TransactionNotesTooltipProps> = ({
  description,
  isVisible,
}) => {
  if (!isVisible) return null

  return (
    <div className="absolute left-0 top-full mt-2 min-w-64 max-w-md rounded-lg border border-white/10 bg-surface-1/90 p-3 text-xs text-text-secondary shadow-xl backdrop-blur z-50 break-words">
      <p className="text-xs font-semibold text-text-primary mb-1">Notes</p>
      <p className="text-xs text-text-secondary whitespace-pre-wrap break-all">
        {description}
      </p>
    </div>
  )
}
