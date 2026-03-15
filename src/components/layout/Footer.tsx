import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-background)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="font-display text-xl tracking-wide text-[var(--color-foreground)]">
              MNS<span className="text-neon-green">fantasy</span>
            </span>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-[var(--color-muted-foreground)]">
            <Link to="/" className="hover:text-[var(--color-foreground)] transition-colors">Home</Link>
            <a href="#games" className="hover:text-[var(--color-foreground)] transition-colors">All Games</a>
            <Link to="/preferences" className="hover:text-[var(--color-foreground)] transition-colors">Preferences</Link>
            <Link to="/sign-in" className="hover:text-[var(--color-foreground)] transition-colors">Sign In</Link>
          </nav>
        </div>

        <div className="mt-8 pt-6 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--color-muted-foreground)]">
          <p>&copy; {new Date().getFullYear()} MNSfantasy &middot; Powered by MoneyNeverSleeps.app</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-[var(--color-foreground)] cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-[var(--color-foreground)] cursor-pointer transition-colors">Terms</span>
            <span className="hover:text-[var(--color-foreground)] cursor-pointer transition-colors">CAN-SPAM</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
