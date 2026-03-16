import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { GameGrid } from '@/components/games/GameGrid'
import { NotifyModal } from '@/components/games/NotifyModal'
import { GAMES, type GameConfig } from '@/lib/games-config'

export function Landing() {
  const [notifyModal, setNotifyModal] = useState(false)
  const [selectedGame, setSelectedGame] = useState<GameConfig | null>(null)

  const activeGame = GAMES.find((g) => g.status === 'active')

  const handleNotify = (game: GameConfig) => {
    setSelectedGame(game)
    setNotifyModal(true)
  }

  return (
    <>
      {/* Hero */}
      <section className="hero-grain relative min-h-[50vh] flex items-center justify-center bg-gradient-to-b from-[var(--color-background)] via-[#0d0d14] to-[var(--color-background)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="font-display text-5xl sm:text-7xl lg:text-8xl tracking-tight mb-6"
          >
            Fantasy Sports That
            <br />
            <span className="text-neon-green">Never Sleep.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-lg sm:text-xl text-[var(--color-muted-foreground)] mb-8 max-w-xl mx-auto"
          >
            Bespoke fantasy competitions built for the biggest events in sports.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            {activeGame && (
              <a href={activeGame.url} target="_blank" rel="noopener noreferrer">
                <Button size="lg">
                  Play Now <ArrowRight size={16} className="ml-2" />
                </Button>
              </a>
            )}
            <a href="#games">
              <Button variant="secondary" size="lg">
                See All Games
              </Button>
            </a>
          </motion.div>
        </div>

        {/* Powered by badge */}
        <motion.a
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          href="https://www.moneyneversleeps.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors flex items-center gap-1"
        >
          Powered by MoneyNeverSleeps.app <ExternalLink size={10} />
        </motion.a>
      </section>

      {/* Games Grid */}
      <GameGrid onNotify={handleNotify} />

      {/* MoneyNeverSleeps Section */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-8 sm:p-12 text-center"
          >
            <h3 className="font-display text-2xl sm:text-3xl mb-4">
              Built by <span className="text-neon-green">MoneyNeverSleeps</span>
            </h3>
            <p className="text-[var(--color-muted-foreground)] mb-6 max-w-md mx-auto">
              MNSfantasy is built by the team behind MoneyNeverSleeps.app — the fantasy platform where sports meets investing. Follow the money.
            </p>
            <a href="https://www.moneyneversleeps.app/" target="_blank" rel="noopener noreferrer">
              <Button variant="secondary">
                Visit MoneyNeverSleeps.app <ArrowRight size={14} className="ml-2" />
              </Button>
            </a>
          </motion.div>
        </div>
      </section>

      {/* Notify Modal */}
      <NotifyModal
        open={notifyModal}
        onClose={() => setNotifyModal(false)}
        game={selectedGame}
      />
    </>
  )
}
