// Updated 2025-12-09 17:15 CST by ChatGPT
import type { HTMLAttributes, PropsWithChildren } from 'react'

type Variant = 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'danger'

type BadgeProps = PropsWithChildren<
  HTMLAttributes<HTMLSpanElement> & {
    variant?: Variant
  }
>

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ')

const variantClass: Record<Variant, string> = {
  primary: 'badge',
  secondary: 'badge badge-secondary',
  accent: 'badge badge-accent',
  success: 'badge badge-success',
  warning: 'badge badge-warning',
  danger: 'badge badge-danger',
}

export const Badge = ({ children, variant = 'primary', className, ...props }: BadgeProps) => (
  <span className={cx(variantClass[variant], className)} {...props}>
    {children}
  </span>
)
