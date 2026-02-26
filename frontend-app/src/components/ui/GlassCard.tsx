/*
 * Copyright (c) 2026 Intellifide, LLC.
 * Licensed under PolyForm Noncommercial License 1.0.0.
 * See "/legal/license" for full license terms.
 *
 * COMMUNITY RIGHTS:
 * - You CAN modify this code for personal use.
 * - You CAN build and share widgets/plugins for the ecosystem.
 *
 * RESTRICTIONS:
 * - You CANNOT resell, repackage, or distribute this application for a fee.
 * - You CANNOT use this application for commercial enterprise purposes.
 */

import type { HTMLAttributes, PropsWithChildren } from 'react'

type GlassCardProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>>

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ')

export const GlassCard = ({ children, className, ...props }: GlassCardProps) => {
  return (
    <div className={cx('glass-card card', className)} {...props}>
      {children}
    </div>
  )
}
