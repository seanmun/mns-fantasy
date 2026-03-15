# mnsfantasy.com — Platform Root
## Claude Code Build Prompt
### Domain: `mnsfantasy.com`

---

## CONTEXT & RELATIONSHIP TO GAME APPS

This is the **platform hub** for MNSfantasy — a multi-game fantasy sports platform where each game lives on its own subdomain (e.g. `ncaa.mnsfantasy.com`, `pga.mnsfantasy.com`). This root site does three things:

1. **Markets the platform** to new visitors — showcases active and upcoming games, drives signups.
2. **Hosts the global preference center** — a single `/preferences` page where logged-in users manage all their MNSfantasy email settings across every game.
3. **Serves as the auth entry point** — users can sign in here and be redirected to any game, or land here after clicking a preference link in any email.

This is a **lightweight build** — not a full app. It shares the same Clerk app, Neon database, and Resend sending domain as all game subdomains. It does NOT duplicate any game logic.

**Powered by MoneyNeverSleeps.app** — this relationship is the subtle through-line of the entire site.

---

## TECH STACK

| Layer | Choice |
|---|---|
| Framework | React 18 + TypeScript + Vite |
| Routing | React Router v6 |
| Auth | Clerk (same app as all game subdomains) |
| Database | Neon + Drizzle ORM (same DB as game apps — read `marketing_subscribers` + `marketing_game_prefs` tables) |
| Styling | Tailwind CSS v3 + same CSS variables as game apps |
| Animation | Framer Motion |
| Email | Resend (for preference confirmation emails) |
| Icons | Lucide React |
| Forms | React Hook Form + Zod |
| Notifications | Sonner (toast) |
| Deployment | Vercel (separate project from game apps, same team) |

---

## ENVIRONMENT VARIABLES

```
# Clerk (same keys as game apps — same Clerk application)
VITE_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Neon (same database URL as game apps)
DATABASE_URL=

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=updates@mnsfantasy.com

# App
VITE_APP_URL=https://mnsfantasy.com

# HMAC secret for one-click unsubscribe tokens (use CLERK_SECRET_KEY)
UNSUBSCRIBE_HMAC_SECRET=

# Admin
ADMIN_USER_IDS=
```

---

## PROJECT STRUCTURE

```
mnsfantasy-root/
├── src/
│   ├── components/
│   │   ├── ui/              # Same design system as game apps (copy/share)
│   │   ├── layout/          # AppShell, Header, Footer
│   │   ├── games/           # GameCard, GameGrid, ComingSoonCard
│   │   └── preferences/     # PreferenceCenter, GamePrefRow, GlobalPrefRow
│   ├── pages/
│   │   ├── Landing.tsx      # Main marketing page
│   │   ├── Preferences.tsx  # /preferences — the core feature of this app
│   │   ├── SignIn.tsx        # /sign-in (Clerk component, themed)
│   │   ├── SignUp.tsx        # /sign-up (Clerk component, themed)
│   │   └── NotFound.tsx
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts    # Import ONLY marketing tables — do not redefine game tables
│   │   │   └── index.ts
│   │   ├── unsubscribe.ts   # HMAC token generation + verification
│   │   └── utils.ts
│   └── main.tsx
├── api/
│   ├── preferences/
│   │   ├── get.ts           # GET /api/preferences — fetch user prefs
│   │   └── update.ts        # PUT /api/preferences — update global prefs
│   ├── game-prefs/
│   │   └── update.ts        # PUT /api/game-prefs — update per-game prefs
│   └── unsubscribe.ts       # GET /api/unsubscribe?token=... (one-click, no login)
├── drizzle.config.ts        # Points to same DATABASE_URL — DO NOT re-run migrations
└── package.json
```

**IMPORTANT:** This app shares the database with game apps but owns only the `marketing_*` tables. Do NOT run `drizzle-kit push` from this project — migrations are managed by the NCAA app (the primary app). This project connects to the same DB read/write but never alters schema.

---

## PAGES

### `/` — Landing Page

The primary marketing surface. Visitors may or may not be logged in.

**Hero section:**
- Full-width dark hero. Background: subtle animated noise/grain texture (CSS only, no JS).
- Large display headline: **"Fantasy Sports That Never Sleep."**
- Subhead: *"Pick players. Track stats. Win your league. New games every season."*
- Two CTAs: **"Play Now"** (goes to the most active game, e.g. `ncaa.mnsfantasy.com`) and **"See All Games"** (scrolls to game grid).
- Small badge bottom-right of hero: *"Powered by MoneyNeverSleeps.app ↗"* — subtle, links out.

**How It Works section** (3 steps, horizontal on desktop, vertical on mobile):
1. **Join a League** — create or get invited to a private or public league.
2. **Pick Your Roster** — select players within structured tiers.
3. **Win the Season** — track live stats, climb the standings.

**Active Games grid** — pull from a hardcoded config (not DB — games are defined in code, not admin-managed at this stage):

```typescript
// src/lib/games-config.ts
// PLATFORM PATTERN — add new games here when subdomains launch
export const GAMES: GameConfig[] = [
  {
    slug: 'ncaa-mens-2025',
    name: "Men's March Madness",
    shortName: 'NCAA Men\'s',
    description: 'Pick 10 players across 4 seed tiers. Most combined pts+reb+ast wins.',
    url: 'https://ncaa.mnsfantasy.com',
    status: 'active', // 'active' | 'upcoming' | 'completed'
    season: '2025',
    icon: '🏀',
    accentColor: '#00ff87', // neon-green
    startDate: '2025-03-20',
    endDate: '2025-04-07',
  },
  {
    slug: 'ncaa-womens-2025',
    name: "Women's March Madness",
    shortName: 'NCAA Women\'s',
    description: 'Same format, different bracket. Women\'s tournament fantasy.',
    url: 'https://wncaa.mnsfantasy.com',
    status: 'upcoming',
    season: '2025',
    icon: '🏀',
    accentColor: '#bf5af2', // neon-purple
    startDate: '2025-03-21',
    endDate: '2025-04-06',
  },
  {
    slug: 'pga-masters-2025',
    name: 'The Masters',
    shortName: 'PGA Masters',
    description: 'Pick your Augusta field. Every birdie counts.',
    url: 'https://pga.mnsfantasy.com',
    status: 'upcoming',
    season: '2025',
    icon: '⛳',
    accentColor: '#00e5ff', // neon-cyan
    startDate: '2025-04-10',
    endDate: '2025-04-13',
  },
];
```

**GameCard component** for each game:
- Shows: icon, game name, status badge (LIVE / UPCOMING / COMPLETED), description, dates, accent color border.
- LIVE cards: pulsing neon border animation.
- UPCOMING cards: countdown to start date.
- COMPLETED cards: muted, shows winner badge if available (hardcoded).
- CTA: "Play Now →" for active, "Get Notified →" for upcoming (triggers email capture modal if not logged in, or updates prefs if logged in).

**"Get Notified" email capture** (for upcoming games, non-logged-in users):
- Small modal: email input + "Notify me when [Game Name] launches" button.
- Inserts into `marketing_subscribers` with `global_opt_in = true`, `source = 'mnsfantasy-landing'`, `pref_new_games = true`.
- No account needed — email only.
- Show: *"We'll email you when the game goes live. No spam, ever. Manage preferences anytime."*

**MoneyNeverSleeps section** (bottom of landing, before footer):
- Tasteful, not loud. Dark card with MNS logo/wordmark area.
- Copy: *"MNSfantasy is built by the team behind MoneyNeverSleeps.app — the fantasy platform where sports meets investing. Follow the money."*
- CTA: "Visit MoneyNeverSleeps.app →"

**Footer:**
- Links: Home · All Games · Preferences · Sign In
- Legal: Privacy Policy · Terms · CAN-SPAM
- *"© 2025 MNSfantasy · Powered by MoneyNeverSleeps.app"*

---

### `/preferences` — Global Preference Center

This is the most important page on this site. It must work for two types of visitors:

**Type A: Logged-in user** (arrived from clicking a link in a game app or an email)
- Show full preference center UI.
- Read their current prefs from DB on load.
- All changes save in real time (debounced PUT to `/api/preferences`).

**Type B: One-click unsubscribe** (arrived via `?token=SIGNED_TOKEN` in an email footer)
- Verify the HMAC token server-side.
- If valid: auto-apply the unsubscribe (set `unsubscribed_at`) and show a confirmation screen with a "Changed your mind? Re-subscribe" option.
- If token expired (>30 days) or invalid: show a gentle error and prompt them to sign in to manage preferences.
- This flow must NOT require login — it's a one-click unsubscribe per CAN-SPAM law.

**Preference Center UI Layout:**

```
┌─────────────────────────────────────────────────────────┐
│  YOUR MNSFANTASY PREFERENCES                             │
│  [user email] · [last updated]                           │
├─────────────────────────────────────────────────────────┤
│  GLOBAL SETTINGS                                         │
│  ┌────────────────────────────────────────────────────┐  │
│  │  ● All MNSfantasy emails          [ON/OFF toggle]  │  │
│  │    Master switch. Off = nothing sent.              │  │
│  └────────────────────────────────────────────────────┘  │
│  When global is ON, choose what you receive:             │
│  ☑  New game announcements                               │
│  ☑  League invites from friends                          │
│  ☑  Platform news & updates                              │
│  ☐  MoneyNeverSleeps.app insights  (separate consent)    │
├─────────────────────────────────────────────────────────┤
│  PER-GAME SETTINGS                                       │
│  (only shows games the user has joined)                  │
│                                                          │
│  🏀 Men's March Madness 2025                             │
│  ☑  Morning update emails                               │
│  ☑  Elimination alerts                                   │
│  ☑  Score alerts                                         │
│  ☑  Roster lock reminders                               │
│  [Unsubscribe from NCAA emails only]                     │
│                                                          │
│  ⛳ PGA Masters 2025  (coming soon)                      │
│  — Not yet joined —                                      │
├─────────────────────────────────────────────────────────┤
│  [Save Preferences]        [Unsubscribe from everything] │
└─────────────────────────────────────────────────────────┘
```

- Master toggle OFF: dims and disables all sub-toggles (visual only — they retain values, just won't send).
- "Unsubscribe from everything" button: requires a confirmation step (type "UNSUBSCRIBE" or click a second confirm button). Sets `unsubscribed_at`. Shows: *"Done. You won't receive any more emails from MNSfantasy. You can re-enable anytime."*
- Per-game section only shows games the user has a `league_members` row for — query the shared DB.
- Changes auto-save with a subtle "Saved ✓" indicator (not a full page reload).
- The MoneyNeverSleeps opt-in has a note: *"MoneyNeverSleeps.app is a separate product. This consent is independent."*

---

### `/sign-in` and `/sign-up`

Same Clerk components as in the game apps, themed identically. After sign-in, redirect to `/preferences` (since users land here from emails) or to `?redirect_url` query param if present.

---

## UNSUBSCRIBE TOKEN SYSTEM

```typescript
// src/lib/unsubscribe.ts
import { createHmac } from 'crypto';

const SECRET = process.env.UNSUBSCRIBE_HMAC_SECRET!;

export function generateUnsubscribeToken(userId: string): string {
  const payload = `${userId}:${Date.now()}`;
  const sig = createHmac('sha256', SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}:${sig}`).toString('base64url');
}

export function verifyUnsubscribeToken(token: string): { userId: string; valid: boolean } {
  try {
    const decoded = Buffer.from(token, 'base64url').toString();
    const [userId, ts, sig] = decoded.split(':');
    const payload = `${userId}:${ts}`;
    const expected = createHmac('sha256', SECRET).update(payload).digest('hex');
    const age = Date.now() - parseInt(ts);
    const valid = sig === expected && age < 30 * 24 * 60 * 60 * 1000; // 30 days
    return { userId, valid };
  } catch {
    return { userId: '', valid: false };
  }
}
```

Include the token in every email footer as:
`https://mnsfantasy.com/preferences?token={generateUnsubscribeToken(userId)}`

The `/api/unsubscribe` serverless function handles this token — no auth required, sets `unsubscribed_at` in `marketing_subscribers`.

---

## DESIGN SYSTEM

**Identical to the game apps.** Same CSS variables, same fonts (Bebas Neue, DM Sans, JetBrains Mono), same color tokens, same dark default, same light mode toggle. The platform root and game apps should feel like one cohesive product.

Copy the Tailwind config and CSS variable definitions exactly from the NCAA app. Do not invent new colors or type styles.

One visual distinction: the platform root uses slightly more generous spacing and a more editorial layout (this is a marketing site, not an app). The game apps are dense and data-forward. The root is spacious and brand-forward.

**Landing page hero:** Consider a subtle particle or noise animation in the background using CSS only (`background-image: url("data:image/svg+xml,...")` with very fine grain). No canvas, no JS for background effects — keep it pure CSS for performance.

**GameCard:** Each card's accent color comes from `GAMES` config. Use it as the card's left border and hover glow. LIVE cards get a slow pulse animation on the border. Upcoming cards get a muted version with a countdown.

---

## API ROUTES

### `GET /api/preferences`
- Auth required (Clerk).
- Returns `marketing_subscribers` row + all `marketing_game_prefs` rows for this user.
- Also returns list of games the user has joined (via `league_members` JOIN `leagues` on `game_slug`).

### `PUT /api/preferences`
- Auth required.
- Body: partial `marketing_subscribers` fields.
- Upserts the row for this user.
- Returns updated record.

### `PUT /api/game-prefs`
- Auth required.
- Body: `{ gameSlug: string, prefs: Partial<MarketingGamePrefs> }`
- Upserts `marketing_game_prefs` for `(userId, gameSlug)`.

### `GET /api/unsubscribe?token=...`
- **No auth required.**
- Verifies HMAC token.
- If valid: sets `unsubscribed_at = now()` on `marketing_subscribers`.
- Returns: `{ success: true, email: string }` — page renders confirmation.
- If invalid/expired: `{ success: false, reason: 'expired' | 'invalid' }`

### `POST /api/notify` (email capture for upcoming games)
- No auth required.
- Body: `{ email: string, gameSlug: string }`
- Upserts `marketing_subscribers` with `global_opt_in = true`, `pref_new_games = true`, `source = 'mnsfantasy-landing'`.
- Sends a one-time confirmation email via Resend: *"You're on the list for [Game Name]. We'll let you know when it launches."*
- Rate limit: max 3 requests per IP per hour (use a simple in-memory or KV store).

---

## EMAIL TEMPLATES (this app)

### `PreferenceConfirmationEmail.tsx`
Sent after a user updates preferences via the preference center.
- Subject: `Your MNSfantasy preferences have been updated`
- Body: lists their current settings in plain, readable format.
- Footer with unsubscribe token link.

### `GameLaunchEmail.tsx`
Sent to all `marketing_subscribers` where `pref_new_games = true` and `global_opt_in = true` and `unsubscribed_at IS NULL` when a new game goes live.
- Subject: `🆕 [Game Name] is live on MNSfantasy`
- Body: game description, how it works, CTA to play.
- This is triggered manually by admin (no cron) — add a button to the admin panel on this site.

---

## ADMIN PAGE (`/admin`)

Protected by `ADMIN_USER_IDS` env var (same admin users as game apps).

Sections:
1. **Subscriber Overview** — total subscribers, global opt-in count, opted-out count. Table of recent signups.
2. **Game Launch Email** — dropdown of games from `GAMES` config, "Send Launch Email" button (requires confirmation). Shows estimated recipient count before sending.
3. **Preference Stats** — per-game opt-out rates, per-type opt-out breakdown.
4. **Raw Subscriber Export** — CSV download of all `marketing_subscribers` (admin only, for legal compliance / data requests).

---

## CLERK CONFIGURATION NOTES

Since this is the same Clerk app as all subdomains, configure in the Clerk dashboard:

- **Allowed redirect URLs:** Add `https://mnsfantasy.com`, `https://mnsfantasy.com/preferences`, and all game subdomains.
- **After sign-in redirect:** Default to `https://mnsfantasy.com/preferences` from this app (game apps redirect to their own dashboard).
- **Session sharing across subdomains:** Clerk supports this natively with `isSatellite` config. Set `mnsfantasy.com` as the primary domain. All subdomains set `isSatellite: true` in their Clerk provider config and `signInUrl: 'https://mnsfantasy.com/sign-in'`. This means a user logged in at `ncaa.mnsfantasy.com` is automatically logged in at `mnsfantasy.com` too — same session, no re-auth.

```typescript
// In game apps (e.g. ncaa.mnsfantasy.com) — ClerkProvider config
<ClerkProvider
  publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
  isSatellite
  domain="mnsfantasy.com"
  signInUrl="https://mnsfantasy.com/sign-in"
>

// In mnsfantasy.com root — ClerkProvider config (primary domain, no isSatellite)
<ClerkProvider
  publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
>
```

---

## DEPLOYMENT

1. Create Vercel project named `mnsfantasy-root`, set custom domain to `mnsfantasy.com` and `www.mnsfantasy.com`.
2. In DNS: point `mnsfantasy.com` A record to Vercel. Add CNAME `www → cname.vercel-dns.com`.
3. Set all env vars in Vercel project settings.
4. **Do NOT run `drizzle-kit push`** — schema is managed by the NCAA app. This app only reads/writes existing tables.
5. Configure Clerk primary domain as `mnsfantasy.com` in Clerk dashboard.
6. Verify all game app `ClerkProvider` configs have `isSatellite: true` pointing to this domain.
7. Test the full preference flow: sign in at `ncaa.mnsfantasy.com` → visit `mnsfantasy.com/preferences` → should be logged in automatically.
8. Test one-click unsubscribe: generate a token, paste `mnsfantasy.com/preferences?token=...` in incognito → should unsubscribe without login.

---

## FINAL NOTES

- This site should load in under 1 second. It's mostly static. Minimize JS bundle — no heavy libraries beyond what's listed.
- The preference center is the most important feature. It must be bulletproof — legal compliance depends on it.
- The `isSatellite` Clerk config is critical. Test it thoroughly. Session sharing across subdomains is the glue that makes the platform feel like one product.
- Every future game app prompt should reference this document for the shared auth setup and preference center integration.
- The landing page GameCard grid is intentionally hardcoded from `games-config.ts` — do not over-engineer this with a CMS. When a new game launches, a developer adds it to the config array and deploys. That's it.
- Subtle MoneyNeverSleeps presence throughout — never a banner, always a footnote. The brand relationship is *implied* by quality, not announced by size.

Build the complete application now.

## Once copmlete push to github
https://github.com/seanmun/mns-fantasy.git