import { SignUp as ClerkSignUp } from '@clerk/clerk-react'
import { useSearchParams } from 'react-router-dom'

export function SignUp() {
  const [searchParams] = useSearchParams()
  const redirectUrl = searchParams.get('redirect_url')

  let forceUrl: string | undefined
  if (redirectUrl) {
    try {
      const url = new URL(redirectUrl)
      url.searchParams.set('__clerk_synced', 'false')
      forceUrl = url.toString()
    } catch {
      forceUrl = redirectUrl
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] py-12 px-4">
      <ClerkSignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
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
