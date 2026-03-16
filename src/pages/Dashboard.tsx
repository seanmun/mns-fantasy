import { useState, useEffect } from 'react'
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react'
import { motion } from 'framer-motion'
import { ArrowRight, Users, Trophy, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useApi } from '@/hooks/useApi'
import { GAMES } from '@/lib/games-config'

interface LeagueInfo {
  id: string
  name: string
  teamName: string | null
  memberCount: number
  joinedAt: string | null
}

interface GameWithLeagues {
  gameSlug: string
  leagues: LeagueInfo[]
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

function DashboardContent() {
  const { apiFetch } = useApi()
  const [data, setData] = useState<{ games: GameWithLeagues[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const result = await apiFetch('/api/dashboard')
        if (!cancelled) setData(result)
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [apiFetch])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-green" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-[var(--color-muted-foreground)]">
          Unable to load your dashboard. Please try again.
        </p>
      </div>
    )
  }

  if (!data || data.games.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center text-center py-20"
      >
        <Trophy size={48} className="text-[var(--color-muted-foreground)] mb-4" />
        <h2 className="font-display text-2xl mb-2">No Games Yet</h2>
        <p className="text-[var(--color-muted-foreground)] max-w-md mb-6">
          You haven&apos;t joined any leagues. Check out our active games below!
        </p>
        <a href="/#games">
          <Button>Browse Games <ArrowRight size={14} className="ml-2" /></Button>
        </a>
      </motion.div>
    )
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-8">
      {data.games.map((game) => {
        const config = GAMES.find((g) => g.slug === game.gameSlug)
        if (!config) return null

        const badgeVariant = config.status === 'active' ? 'live' : config.status === 'upcoming' ? 'upcoming' : 'completed'

        return (
          <motion.section key={game.gameSlug} variants={fadeUp}>
            {/* Game header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{config.icon}</span>
                <div>
                  <h2 className="font-display text-xl tracking-wide">{config.name}</h2>
                  <p className="text-xs text-[var(--color-muted-foreground)]">{config.season}</p>
                </div>
                <Badge variant={badgeVariant}>
                  {config.status === 'active' ? 'LIVE' : config.status.toUpperCase()}
                </Badge>
              </div>
              <a href={config.url} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="secondary">
                  Open Game <ExternalLink size={12} className="ml-1" />
                </Button>
              </a>
            </div>

            {/* League cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {game.leagues.map((league) => (
                <a
                  key={league.id}
                  href={`${config.url}/leagues/${league.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group"
                >
                  <div
                    className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-5 transition-all duration-300 hover:border-opacity-60"
                    style={{ borderLeftWidth: '3px', borderLeftColor: config.accentColor }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-[var(--color-foreground)] group-hover:text-neon-green transition-colors">
                        {league.name}
                      </h3>
                    </div>
                    {league.teamName && (
                      <p className="text-sm text-[var(--color-muted-foreground)] mb-2">
                        Playing as <span className="text-[var(--color-foreground)]">{league.teamName}</span>
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
                      <Users size={12} />
                      <span>{league.memberCount} {league.memberCount === 1 ? 'member' : 'members'}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </motion.section>
        )
      })}
    </motion.div>
  )
}

export function Dashboard() {
  return (
    <div className="py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <SignedIn>
          <div className="mb-8">
            <h1 className="font-display text-3xl sm:text-4xl mb-2">My Games &amp; Leagues</h1>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Your fantasy hub across all MNSfantasy games.
            </p>
          </div>
          <DashboardContent />
        </SignedIn>
        <SignedOut>
          <RedirectToSignIn />
        </SignedOut>
      </div>
    </div>
  )
}
