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
