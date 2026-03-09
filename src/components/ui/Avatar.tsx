import { cn, getInitials } from '@/lib/utils'

const sizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
}

interface AvatarProps {
  src?: string | null
  name: string
  size?: keyof typeof sizes
  className?: string
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover', sizes[size], className)}
      />
    )
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-primary font-semibold text-white',
        sizes[size],
        className,
      )}
    >
      {getInitials(name)}
    </div>
  )
}
