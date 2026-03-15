import { motion } from 'framer-motion'
import { ArrowRight, Bell } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { daysUntil, formatDate } from '@/lib/utils'
import type { GameConfig } from '@/lib/games-config'

interface GameCardProps {
  game: GameConfig
  onNotify?: (game: GameConfig) => void
}

export function GameCard({ game, onNotify }: GameCardProps) {
  const statusBadge = {
    active: 'live' as const,
    upcoming: 'upcoming' as const,
    completed: 'completed' as const,
  }

  const countdown = game.status === 'upcoming' ? daysUntil(game.startDate) : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="relative group"
    >
      <div
        className="relative bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-6 transition-all duration-300 hover:border-opacity-60 overflow-hidden"
        style={{
          borderLeftWidth: '3px',
          borderLeftColor: game.accentColor,
          ['--pulse-color' as string]: game.accentColor,
        }}
      >
        {game.status === 'active' && (
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-xl"
            style={{
              boxShadow: `inset 0 0 30px ${game.accentColor}10, 0 0 20px ${game.accentColor}08`,
            }}
          />
        )}

        <div className="relative">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{game.icon}</span>
              <h3 className="font-semibold text-lg text-[var(--color-foreground)]">{game.name}</h3>
            </div>
            <Badge variant={statusBadge[game.status]}>
              {game.status === 'active' ? 'LIVE' : game.status === 'upcoming' ? 'UPCOMING' : 'COMPLETED'}
            </Badge>
          </div>

          <p className="text-sm text-[var(--color-muted-foreground)] mb-4">{game.description}</p>

          <div className="flex items-center justify-between">
            <div className="text-xs text-[var(--color-muted-foreground)]">
              {formatDate(game.startDate)} &ndash; {formatDate(game.endDate)}
              {countdown !== null && countdown > 0 && (
                <span className="ml-2 text-neon-purple font-medium">
                  {countdown} day{countdown !== 1 ? 's' : ''} away
                </span>
              )}
            </div>

            {game.status === 'active' && (
              <a href={game.url} target="_blank" rel="noopener noreferrer">
                <Button size="sm">
                  Play Now <ArrowRight size={14} className="ml-1" />
                </Button>
              </a>
            )}
            {game.status === 'upcoming' && (
              <Button size="sm" variant="secondary" onClick={() => onNotify?.(game)}>
                <Bell size={14} className="mr-1" /> Get Notified
              </Button>
            )}
            {game.status === 'completed' && (
              <span className="text-xs text-[var(--color-muted-foreground)]">Season ended</span>
            )}
          </div>
        </div>
      </div>

      {game.status === 'active' && (
        <div
          className="absolute -inset-px rounded-xl animate-pulse-neon pointer-events-none opacity-30"
          style={{ ['--pulse-color' as string]: game.accentColor }}
        />
      )}
    </motion.div>
  )
}
