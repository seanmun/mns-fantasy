import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-background)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 text-center">
        <p className="text-sm text-[var(--color-muted-foreground)] mb-2">
          <span className="font-display text-[var(--color-foreground)]">
            MNS<span className="text-neon-green">fantasy</span>
          </span>
          {' '}&mdash; Fantasy Sports That Never Sleep
        </p>
        <Link to="/changelog" className="inline-block text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors mb-4">
          v0.1.0 BETA
        </Link>
        <nav className="flex flex-wrap items-center justify-center gap-1 text-xs text-[var(--color-muted-foreground)] mb-4">
          <Link to="/about" className="hover:text-[var(--color-foreground)] transition-colors">
            About
          </Link>
          <span>&middot;</span>
          <Link to="/privacy" className="hover:text-[var(--color-foreground)] transition-colors">
            Privacy
          </Link>
          <span>&middot;</span>
          <span className="hover:text-[var(--color-foreground)] cursor-pointer transition-colors">
            Terms
          </span>
          <span>&middot;</span>
          <Link to="/changelog" className="hover:text-[var(--color-foreground)] transition-colors">
            Changelog
          </Link>
        </nav>
        <p className="text-xs text-[var(--color-muted-foreground)]">
          &copy; {new Date().getFullYear()} MNS &middot; Built by <a href="https://www.seanmun.com/" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-foreground)] transition-colors">Sean Munley</a>
        </p>
      </div>
    </footer>
  )
}
