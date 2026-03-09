import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { Spinner } from './Spinner'

const variants = {
  primary: 'bg-primary text-white hover:bg-primary-dark focus:ring-primary/50',
  secondary: 'bg-bg-main text-text-primary hover:bg-border-light focus:ring-primary/50',
  outline: 'border border-border bg-transparent text-text-primary hover:bg-bg-main focus:ring-primary/50',
  danger: 'bg-danger text-white hover:bg-danger/90 focus:ring-danger/50',
  ghost: 'bg-transparent text-text-primary hover:bg-bg-main focus:ring-primary/50',
}

const buttonSizes = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants
  size?: keyof typeof buttonSizes
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading, leftIcon, rightIcon, className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          variants[variant],
          buttonSizes[size],
          className,
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? <Spinner size="sm" /> : leftIcon}
        {children}
        {rightIcon}
      </button>
    )
  },
)

Button.displayName = 'Button'
