import { GAMES, type GameConfig } from '@/lib/games-config'
import { GameCard } from './GameCard'

interface GameGridProps {
  onNotify: (game: GameConfig) => void
}

export function GameGrid({ onNotify }: GameGridProps) {
  const activeGames = GAMES.filter((g) => g.status === 'active')
  const upcomingGames = GAMES.filter((g) => g.status === 'upcoming')
  const completedGames = GAMES.filter((g) => g.status === 'completed')

  const sortedGames = [...activeGames, ...upcomingGames, ...completedGames]

  return (
    <section id="games" className="py-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-display text-4xl sm:text-5xl text-center mb-4">
          Active &amp; Upcoming Games
        </h2>
        <p className="text-center text-[var(--color-muted-foreground)] mb-12 max-w-xl mx-auto">
          Jump into a live game or sign up to get notified when new ones launch.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedGames.map((game) => (
            <GameCard key={game.slug} game={game} onNotify={onNotify} />
          ))}
        </div>
      </div>
    </section>
  )
}
