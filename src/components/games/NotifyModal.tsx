import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { GameConfig } from '@/lib/games-config'

const notifySchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

type NotifyFormData = z.infer<typeof notifySchema>

interface NotifyModalProps {
  open: boolean
  onClose: () => void
  game: GameConfig | null
}

export function NotifyModal({ open, onClose, game }: NotifyModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const { register, handleSubmit, formState: { errors }, reset } = useForm<NotifyFormData>({
    resolver: zodResolver(notifySchema),
  })

  const onSubmit = async (data: NotifyFormData) => {
    if (!game) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email, gameSlug: game.slug }),
      })
      if (!res.ok) throw new Error('Failed to subscribe')
      setSubmitted(true)
      toast.success("You're on the list!")
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    reset()
    setSubmitted(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title={submitted ? 'You\'re In!' : `Get Notified`}>
      {submitted ? (
        <div className="text-center py-4">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            We'll email you when <span className="text-[var(--color-foreground)] font-medium">{game?.name}</span> launches.
            No spam, ever. Manage preferences anytime.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Notify me when <span className="text-[var(--color-foreground)] font-medium">{game?.name}</span> launches.
          </p>
          <Input
            type="email"
            placeholder="your@email.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Subscribing...' : 'Notify Me'}
          </Button>
          <p className="text-xs text-[var(--color-muted-foreground)] text-center">
            We'll email you when the game goes live. No spam, ever. Manage preferences anytime.
          </p>
        </form>
      )}
    </Modal>
  )
}
