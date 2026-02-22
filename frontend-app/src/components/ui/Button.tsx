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
import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'

type Variant = 'primary' | 'secondary' | 'outline' | 'accent'
type Size = 'sm' | 'md' | 'lg'

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant
    size?: Size
  }
>

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ')

export const Button = ({ children, className, variant = 'primary', size = 'md', ...props }: ButtonProps) => {
  const base = 'btn inline-flex items-center justify-center'
  const variantClass =
    variant === 'primary'
      ? 'btn'
      : variant === 'secondary'
        ? 'btn btn-secondary'
        : variant === 'outline'
          ? 'btn btn-outline'
          : 'btn btn-accent'
  const sizeClass = size === 'sm' ? 'px-3 py-2 text-sm' : size === 'lg' ? 'btn-lg' : ''

  return (
    <button className={cx(base, variantClass, sizeClass, className)} {...props}>
      {children}
    </button>
  )
}
