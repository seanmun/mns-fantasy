import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Users, ListChecks, Trophy, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { GameGrid } from '@/components/games/GameGrid'
import { NotifyModal } from '@/components/games/NotifyModal'
import { GAMES, type GameConfig } from '@/lib/games-config'

const steps = [
  {
    icon: Users,
    title: 'Join a League',
    description: 'Create or get invited to a private or public league.',
  },
  {
    icon: ListChecks,
    title: 'Pick Your Roster',
    description: 'Select players within structured tiers.',
  },
  {
    icon: Trophy,
    title: 'Win the Season',
    description: 'Track live stats, climb the standings.',
  },
]

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
      <section className="hero-grain relative min-h-[80vh] flex items-center justify-center bg-gradient-to-b from-[var(--color-background)] via-[#0d0d14] to-[var(--color-background)]">
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
            Pick players. Track stats. Win your league. New games every season.
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
          href="https://moneynneversleeps.app"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-6 right-6 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors flex items-center gap-1"
        >
          Powered by MoneyNeverSleeps.app <ExternalLink size={10} />
        </motion.a>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 bg-[var(--color-muted)]">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-4xl sm:text-5xl text-center mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-neon-green/10 text-neon-green mb-4">
                  <step.icon size={24} />
                </div>
                <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-[var(--color-muted-foreground)]">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
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
            <a href="https://moneynneversleeps.app" target="_blank" rel="noopener noreferrer">
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
