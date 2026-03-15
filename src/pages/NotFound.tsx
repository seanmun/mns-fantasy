import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

export function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] py-12 px-4 text-center">
      <h1 className="font-display text-6xl sm:text-8xl text-neon-green mb-4">404</h1>
      <p className="text-xl text-[var(--color-muted-foreground)] mb-8">Page not found</p>
      <Link to="/">
        <Button>Back to Home</Button>
      </Link>
    </div>
  )
}
