import { cn } from '@/lib/utils'

interface BadgeProps {
  variant: 'live' | 'upcoming' | 'completed'
  children: React.ReactNode
}

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider',
        {
          'bg-neon-green/20 text-neon-green': variant === 'live',
          'bg-neon-purple/20 text-neon-purple': variant === 'upcoming',
          'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]': variant === 'completed',
        }
      )}
    >
      {variant === 'live' && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-green" />
        </span>
      )}
      {children}
    </span>
  )
}
