export interface GameConfig {
  slug: string
  // Game-app slugs that map to this card (apps may use finer-grained
  // slugs, e.g. ncaa-mens-2026/ncaa-womens-2026 under one NCAA card).
  aliases?: string[]
  // Display qualifier per alias, e.g. "Men's" / "Women's".
  aliasLabels?: Record<string, string>
  name: string
  shortName: string
  description: string
  url: string
  status: 'active' | 'upcoming' | 'completed'
  season: string
  icon: string
  accentColor: string
  startDate: string
  endDate: string
  // Kept in the list but not shown on the grid. Deliberately not a
  // deletion: findGameBySlug still resolves it, so existing notify
  // sign-ups and stored game_slug values keep working while the card is
  // off the site. Flip to show it again.
  hidden?: boolean
}

// PLATFORM PATTERN — add new games here when subdomains launch
export const GAMES: GameConfig[] = [
  {
    slug: 'ncaa-2026',
    aliases: ['ncaa-mens-2026', 'ncaa-womens-2026', 'ncaa-2025'],
    aliasLabels: { 'ncaa-mens-2026': "Men's", 'ncaa-womens-2026': "Women's" },
    name: 'March Madness',
    shortName: 'NCAA',
    description: "Pick 10 players across 4 seed tiers. Men's & Women's brackets. Most combined pts+reb+ast wins.",
    url: 'https://ncaa.mnsfantasy.com',
    status: 'completed',
    season: '2026',
    icon: '\u{1F3C0}',
    accentColor: '#00ff87',
    startDate: '2026-03-17',
    endDate: '2026-04-06',
  },
  {
    slug: 'mns-wnba-2026',
    name: 'MNS WNBA Dynasty',
    shortName: 'WNBA',
    description: 'Money Never Sleeps WNBA. Dynasty keeper league with real salary cap, franchise tags, and a prize pool that grows with every fee.',
    url: 'https://wnba.mnsfantasy.com',
    status: 'active',
    season: '2026',
    icon: '\u{1F3C0}',
    accentColor: '#f472b6',
    startDate: '2026-05-11',
    endDate: '2026-09-30',
  },
  {
    slug: 'golf-masters-2026',
    aliases: ['golf-pga-2026'],
    name: 'PGA Fantasy Golf',
    shortName: 'Golf',
    description: 'Weekly PGA Tour pools all season. Pick your golfers, earn points for birdies, eagles, and more.',
    url: 'https://golf.mnsfantasy.com',
    status: 'active',
    season: '2026',
    icon: '\u{26F3}',
    accentColor: '#00ff87',
    startDate: '2026-01-15',
    endDate: '2026-12-06',
  },
  {
    slug: 'nfl-2026',
    name: 'NFL Pick’em',
    shortName: 'NFL',
    description: 'Weekly NFL pools. Pick against the spread or straight up, mark a key pick, and the standings keep themselves.',
    url: 'https://nfl.mnsfantasy.com',
    status: 'active',
    season: '2026',
    icon: '\u{1F3C8}',
    accentColor: '#bf5af2',
    startDate: '2026-09-10',
    endDate: '2027-01-03',
  },
  {
    slug: 'rumble-raffle-2027',
    name: 'Rumble Raffle',
    shortName: 'Rumble Raffle',
    description: 'Create Royal Rumble raffle leagues. Draw entry numbers, track live eliminations, and crown a winner.',
    url: 'https://www.rumbleraffle.com',
    status: 'upcoming',
    season: '2027',
    icon: '\u{1F3AB}',
    accentColor: '#00e5ff',
    startDate: '2027-01-01',
    endDate: '2027-01-31',
    hidden: true,
  },
]

// Resolve a game-app slug (possibly an alias) to its hub card.
export function findGameBySlug(slug: string): GameConfig | undefined {
  return GAMES.find((g) => g.slug === slug || g.aliases?.includes(slug))
}
