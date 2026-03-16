import { SignIn as ClerkSignIn } from '@clerk/clerk-react'
import { useSearchParams } from 'react-router-dom'

export function SignIn() {
  const [searchParams] = useSearchParams()
  const redirectUrl = searchParams.get('redirect_url')

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] py-12 px-4">
      <ClerkSignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        fallbackRedirectUrl={redirectUrl || '/preferences'}
        forceRedirectUrl={redirectUrl || undefined}
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
