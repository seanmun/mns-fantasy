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
    slug: 'ncaa-2025',
    name: 'March Madness',
    shortName: 'NCAA',
    description: "Pick 10 players across 4 seed tiers. Men's & Women's brackets. Most combined pts+reb+ast wins.",
    url: 'https://ncaa.mnsfantasy.com',
    status: 'active',
    season: '2025',
    icon: '\u{1F3C0}',
    accentColor: '#00ff87',
    startDate: '2025-03-19',
    endDate: '2025-04-06',
  },
  {
    slug: 'golf-masters-2025',
    name: 'Masters Fantasy Golf',
    shortName: 'Golf',
    description: 'Pick 6 golfers. Earn points for birdies, eagles, and more. Compete in private pools.',
    url: 'https://golf.mnsfantasy.com',
    status: 'upcoming',
    season: '2025',
    icon: '\u{26F3}',
    accentColor: '#00ff87',
    startDate: '2026-04-10',
    endDate: '2026-04-13',
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
