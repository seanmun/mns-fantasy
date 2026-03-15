import { cn } from '@/lib/utils'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  label?: string
  description?: string
}

export function Toggle({ checked, onChange, disabled, label, description }: ToggleProps) {
  return (
    <label className={cn('flex items-center justify-between gap-4 cursor-pointer', disabled && 'opacity-50 cursor-not-allowed')}>
      <div className="flex-1">
        {label && <span className="text-sm font-medium text-[var(--color-foreground)]">{label}</span>}
        {description && <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'toggle-track',
          checked ? 'bg-neon-green' : 'bg-[var(--color-border)]'
        )}
      >
        <span
          className={cn(
            'toggle-thumb',
            checked ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
    </label>
  )
}
