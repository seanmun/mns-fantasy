export function Changelog() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6">
      <h1 className="font-display text-3xl sm:text-4xl mb-2">Changelog</h1>
      <p className="text-sm text-[var(--color-muted-foreground)] mb-10">
        What's new with MNSfantasy.
      </p>

      <div className="space-y-10">
        {/* v0.1.0 */}
        <section>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-neon-green/10 text-neon-green border border-neon-green/20">
              v0.1.0
            </span>
            <span className="text-xs text-[var(--color-muted-foreground)]">March 15, 2026</span>
          </div>
          <h2 className="text-lg font-semibold text-[var(--color-foreground)] mb-2">Initial Launch</h2>
          <ul className="space-y-1 text-sm text-[var(--color-muted-foreground)] list-disc list-inside">
            <li>Landing page with hero, game grid, and email capture</li>
            <li>Game cards for NCAA Men's, NCAA Women's, and Rumble Raffle</li>
            <li>Google OAuth sign-in via Clerk</li>
            <li>Email notification signup for upcoming games</li>
            <li>Email preference center with global and per-game toggles</li>
            <li>Admin dashboard with subscriber stats, launch emails, and CSV export</li>
            <li>Privacy policy page</li>
            <li>Dark theme with MNS design system</li>
          </ul>
        </section>
      </div>
    </div>
  )
}
