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

// Updated 2025-12-09 17:15 CST by ChatGPT
import type { HTMLAttributes, PropsWithChildren } from 'react'

type CardProps = PropsWithChildren<
  HTMLAttributes<HTMLDivElement> & {
    glass?: boolean
  }
>

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ')

export const Card = ({ children, className, glass = false, ...props }: CardProps) => {
  return (
    <div
      className={cx(glass ? 'glass-panel' : 'card', className)}
      {...props}
    >
      {children}
    </div>
  )
}
