import { Link } from 'react-router-dom'

export function About() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6">
      <h1 className="font-display text-3xl sm:text-4xl mb-2">About</h1>
      <p className="text-sm text-[var(--color-muted-foreground)] mb-10">
        The platform behind the games.
      </p>

      <div className="space-y-10 text-sm text-[var(--color-muted-foreground)] leading-relaxed">
        {/* What is MNSfantasy */}
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-foreground)] mb-3">What is MNSfantasy?</h2>
          <p>
            MNSfantasy is a growing platform of fantasy sports and prediction games — each one purpose-built for a specific sport, season, or event. Every game lives on its own subdomain with its own rules, but they all share one account, one design system, and one home base right here.
          </p>
        </section>

        {/* Built Different */}
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-foreground)] mb-3">Built Different</h2>
          <ul className="space-y-3">
            <li>
              <strong className="text-[var(--color-foreground)]">Game-specific, not one-size-fits-all</strong> — every game is designed from scratch for the sport it covers, not shoehorned into a generic engine
            </li>
            <li>
              <strong className="text-[var(--color-foreground)]">Seasonal by design</strong> — new games launch for new events. Play what's live, get notified for what's next
            </li>
            <li>
              <strong className="text-[var(--color-foreground)]">One account, every game</strong> — sign in once, play across every subdomain
            </li>
            <li>
              <strong className="text-[var(--color-foreground)]">Lightweight and fast</strong> — no bloated apps, no ads, no subscription paywalls
            </li>
          </ul>
        </section>

        {/* Where We're Headed */}
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-foreground)] mb-3">Where We're Headed</h2>
          <p className="mb-4">
            MNSfantasy started with NCAA March Madness. We're expanding into new sports and migrating standalone projects under one roof.
          </p>
          <div className="space-y-4">
            <div className="border-l-2 border-neon-green/40 pl-4">
              <h3 className="text-[var(--color-foreground)] font-medium">NCAA Men's & Women's March Madness</h3>
              <p>Pick 10 players across seed tiers. Most combined stats win. Live now.</p>
            </div>
            <div className="border-l-2 border-[var(--color-border)] pl-4">
              <h3 className="text-[var(--color-foreground)] font-medium">Rumble Raffle</h3>
              <p className="text-xs mb-1">Migrating from rumbleraffle.com</p>
              <p>Royal Rumble raffle leagues. Draw entry numbers, track live eliminations, crown a winner.</p>
            </div>
            <div className="border-l-2 border-[var(--color-border)] pl-4">
              <h3 className="text-[var(--color-foreground)] font-medium">Draft Day Trades</h3>
              <p className="text-xs mb-1">Migrating from draftdaytrades.com</p>
              <p>NFL Draft prediction game. Pick trades, sleepers, and busts before draft night.</p>
            </div>
            <div className="border-l-2 border-[var(--color-border)] pl-4">
              <h3 className="text-[var(--color-foreground)] font-medium">MoneyNeverSleeps — NBA & WNBA</h3>
              <p className="text-xs mb-1">The main product &middot; moneyneversleeps.app</p>
              <p>Fantasy basketball dynasty leagues where fantasy meets Wall Street. Salary caps, keeper selections, live auction drafts, and portfolio tracking across NBA and WNBA seasons.</p>
            </div>
            <div className="border-l-2 border-neon-green/20 pl-4">
              <h3 className="text-[var(--color-foreground)] font-medium">And many more</h3>
              <p>New games every season. New sports. New formats. If there's a competition, we'll build a game for it.</p>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-foreground)] mb-3">Contact</h2>
          <p className="mb-2">
            Built by <a href="https://www.seanmun.com/" target="_blank" rel="noopener noreferrer" className="text-neon-green hover:underline">Sean Munley</a>.
          </p>
          <p>
            <a href="mailto:sean.munley@protonmail.com" className="text-neon-green hover:underline">sean.munley@protonmail.com</a>
            <br />
            <a href="https://www.seanmun.com/" target="_blank" rel="noopener noreferrer" className="text-neon-green hover:underline">seanmun.com</a>
          </p>
        </section>
      </div>
    </div>
  )
}
