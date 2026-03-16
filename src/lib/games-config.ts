export interface GameConfig {
  slug: string
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
    slug: 'ncaa-mens-2025',
    name: "Men's March Madness",
    shortName: "NCAA Men's",
    description: 'Pick 10 players across 4 seed tiers. Most combined pts+reb+ast wins.',
    url: 'https://ncaa.mnsfantasy.com',
    status: 'active',
    season: '2025',
    icon: '\u{1F3C0}',
    accentColor: '#00ff87',
    startDate: '2025-03-20',
    endDate: '2025-04-07',
  },
  {
    slug: 'ncaa-womens-2025',
    name: "Women's March Madness",
    shortName: "NCAA Women's",
    description: "Same format, different bracket. Women's tournament fantasy.",
    url: 'https://wncaa.mnsfantasy.com',
    status: 'upcoming',
    season: '2025',
    icon: '\u{1F3C0}',
    accentColor: '#bf5af2',
    startDate: '2025-03-21',
    endDate: '2025-04-06',
  },
  {
    slug: 'rumble-raffle-2025',
    name: 'Rumble Raffle',
    shortName: 'Rumble Raffle',
    description: 'Create Royal Rumble raffle leagues. Draw entry numbers, track live eliminations, and crown a winner.',
    url: 'https://www.rumbleraffle.com',
    status: 'upcoming',
    season: '2025',
    icon: '\u{1F3AB}',
    accentColor: '#00e5ff',
    startDate: '2025-04-10',
    endDate: '2025-04-13',
  },
]
