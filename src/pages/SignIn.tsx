import { SignIn as ClerkSignIn } from '@clerk/clerk-react'
import { useSearchParams } from 'react-router-dom'

export function SignIn() {
  const [searchParams] = useSearchParams()
  const redirectUrl = searchParams.get('redirect_url')

  // When a satellite subdomain sends users here for sign-in, redirect_url
  // points back to the satellite. Pass it through as-is so Clerk's satellite
  // mode can do the proper FAPI redirect to establish the session cookie.
  // IMPORTANT: Do NOT append __clerk_synced — that would tell the satellite
  // to skip the FAPI redirect, preventing the session from being established.
  const forceUrl = redirectUrl || undefined

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] py-12 px-4">
      <ClerkSignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        forceRedirectUrl={forceUrl}
        fallbackRedirectUrl="/preferences"
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'bg-[var(--color-card)] border border-[var(--color-border)] shadow-xl',
            headerTitle: 'text-[var(--color-foreground)]',
            headerSubtitle: 'text-[var(--color-muted-foreground)]',
            formFieldLabel: 'text-[var(--color-foreground)]',
            formFieldInput: 'bg-[var(--color-muted)] border-[var(--color-border)] text-[var(--color-foreground)]',
            footerActionLink: 'text-neon-green hover:text-neon-green/80',
            formButtonPrimary: 'bg-neon-green text-black hover:bg-neon-green/90',
          },
        }}
      />
    </div>
  )
}
