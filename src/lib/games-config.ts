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
    slug: 'golf-masters-2026',
    name: 'Masters Fantasy Golf',
    shortName: 'Golf',
    description: 'Pick 6 golfers. Earn points for birdies, eagles, and more. Compete in private pools.',
    url: 'https://golf.mnsfantasy.com',
    status: 'completed',
    season: '2026',
    icon: '\u{26F3}',
    accentColor: '#00ff87',
    startDate: '2026-04-10',
    endDate: '2026-04-13',
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
  },
]

// Resolve a game-app slug (possibly an alias) to its hub card.
export function findGameBySlug(slug: string): GameConfig | undefined {
  return GAMES.find((g) => g.slug === slug || g.aliases?.includes(slug))
}
