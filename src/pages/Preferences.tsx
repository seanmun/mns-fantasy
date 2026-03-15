import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react'
import { motion } from 'framer-motion'
import { CheckCircle, AlertCircle } from 'lucide-react'
import { PreferenceCenter } from '@/components/preferences/PreferenceCenter'
import { Button } from '@/components/ui/Button'

function UnsubscribeConfirmation({ token }: { token: string }) {
  const [status, setStatus] = useState<'loading' | 'success' | 'expired' | 'invalid'>('loading')
  const [email, setEmail] = useState('')

  useEffect(() => {
    async function verify() {
      try {
        const res = await fetch(`/api/unsubscribe?token=${encodeURIComponent(token)}`)
        const data = await res.json()
        if (data.success) {
          setStatus('success')
          setEmail(data.email)
        } else {
          setStatus(data.reason === 'expired' ? 'expired' : 'invalid')
        }
      } catch {
        setStatus('invalid')
      }
    }
    verify()
  }, [token])

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-green" />
      </div>
    )
  }

  if (status === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto text-center py-20"
      >
        <CheckCircle className="mx-auto mb-4 text-neon-green" size={48} />
        <h2 className="font-display text-3xl mb-2">You're Unsubscribed</h2>
        <p className="text-[var(--color-muted-foreground)] mb-6">
          {email ? `${email} has` : "You've"} been unsubscribed from all MNSfantasy emails.
          You won't receive any more messages from us.
        </p>
        <p className="text-sm text-[var(--color-muted-foreground)] mb-4">
          Changed your mind? Sign in to manage your preferences.
        </p>
        <a href="/sign-in">
          <Button variant="secondary">Sign In to Re-subscribe</Button>
        </a>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto text-center py-20"
    >
      <AlertCircle className="mx-auto mb-4 text-yellow-400" size={48} />
      <h2 className="font-display text-3xl mb-2">
        {status === 'expired' ? 'Link Expired' : 'Invalid Link'}
      </h2>
      <p className="text-[var(--color-muted-foreground)] mb-6">
        {status === 'expired'
          ? 'This unsubscribe link has expired (30 days). Please sign in to manage your preferences.'
          : 'This unsubscribe link is not valid. Please sign in to manage your preferences.'}
      </p>
      <a href="/sign-in">
        <Button variant="secondary">Sign In to Manage Preferences</Button>
      </a>
    </motion.div>
  )
}

export function Preferences() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  // One-click unsubscribe — no auth required
  if (token) {
    return (
      <div className="py-12 px-4 sm:px-6">
        <UnsubscribeConfirmation token={token} />
      </div>
    )
  }

  // Logged-in preference center
  return (
    <div className="py-12 px-4 sm:px-6">
      <SignedIn>
        <PreferenceCenter />
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </div>
  )
}
