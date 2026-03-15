import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/clerk-react'
import { toast } from 'sonner'
import { Check } from 'lucide-react'
import { Toggle } from '@/components/ui/Toggle'
import { Button } from '@/components/ui/Button'
import { GamePrefRow } from './GamePrefRow'
import { GAMES } from '@/lib/games-config'

interface GlobalPrefs {
  globalOptIn: boolean
  prefNewGames: boolean
  prefLeagueInvites: boolean
  prefPlatformNews: boolean
  prefMnsInsights: boolean
  unsubscribedAt: string | null
}

interface GamePrefs {
  prefMorningUpdate: boolean
  prefEliminationAlerts: boolean
  prefScoreAlerts: boolean
  prefRosterLockReminders: boolean
}

interface PrefsData {
  global: GlobalPrefs
  gamePrefs: Record<string, GamePrefs>
  joinedGames: string[]
  email: string
  updatedAt: string
}

export function PreferenceCenter() {
  const { user } = useUser()
  const [prefs, setPrefs] = useState<PrefsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [confirmUnsubAll, setConfirmUnsubAll] = useState(false)

  useEffect(() => {
    fetchPrefs()
  }, [])

  const fetchPrefs = async () => {
    try {
      const res = await fetch('/api/preferences')
      if (res.ok) {
        const data = await res.json()
        setPrefs(data)
      }
    } catch {
      toast.error('Failed to load preferences')
    } finally {
      setLoading(false)
    }
  }

  const saveGlobalPrefs = useCallback(async (updates: Partial<GlobalPrefs>) => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      toast.error('Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }, [])

  const saveGamePrefs = useCallback(async (gameSlug: string, updates: Partial<GamePrefs>) => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/game-prefs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameSlug, prefs: updates }),
      })
      if (!res.ok) throw new Error()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      toast.error('Failed to save game preferences')
    } finally {
      setSaving(false)
    }
  }, [])

  const handleGlobalToggle = (field: keyof GlobalPrefs, value: boolean) => {
    if (!prefs) return
    const updated = { ...prefs, global: { ...prefs.global, [field]: value } }
    if (field === 'globalOptIn' && value) {
      updated.global.unsubscribedAt = null
    }
    setPrefs(updated)
    saveGlobalPrefs({ [field]: value })
  }

  const handleGameToggle = (gameSlug: string, field: keyof GamePrefs, value: boolean) => {
    if (!prefs) return
    const currentGamePrefs = prefs.gamePrefs[gameSlug] || {
      prefMorningUpdate: true,
      prefEliminationAlerts: true,
      prefScoreAlerts: true,
      prefRosterLockReminders: true,
    }
    const updated = {
      ...prefs,
      gamePrefs: {
        ...prefs.gamePrefs,
        [gameSlug]: { ...currentGamePrefs, [field]: value },
      },
    }
    setPrefs(updated)
    saveGamePrefs(gameSlug, { [field]: value })
  }

  const handleUnsubscribeGame = async (gameSlug: string) => {
    if (!prefs) return
    const allOff: GamePrefs = {
      prefMorningUpdate: false,
      prefEliminationAlerts: false,
      prefScoreAlerts: false,
      prefRosterLockReminders: false,
    }
    setPrefs({
      ...prefs,
      gamePrefs: { ...prefs.gamePrefs, [gameSlug]: allOff },
    })
    await saveGamePrefs(gameSlug, allOff)
    toast.success('Unsubscribed from game emails')
  }

  const handleUnsubscribeAll = async () => {
    if (!confirmUnsubAll) {
      setConfirmUnsubAll(true)
      return
    }
    handleGlobalToggle('globalOptIn', false)
    setConfirmUnsubAll(false)
    toast.success("Done. You won't receive any more emails from MNSfantasy. You can re-enable anytime.")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-green" />
      </div>
    )
  }

  if (!prefs) {
    return (
      <div className="text-center py-20">
        <p className="text-[var(--color-muted-foreground)]">Unable to load preferences. Please try again.</p>
      </div>
    )
  }

  const globalDisabled = !prefs.global.globalOptIn

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl sm:text-4xl mb-2">Your MNSfantasy Preferences</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {user?.primaryEmailAddress?.emailAddress} &middot; Last updated {prefs.updatedAt ? new Date(prefs.updatedAt).toLocaleDateString() : 'never'}
        </p>
      </div>

      {/* Saved indicator */}
      {saved && (
        <div className="fixed top-20 right-4 z-50 flex items-center gap-2 bg-neon-green/20 text-neon-green px-3 py-1.5 rounded-lg text-sm animate-fade-in">
          <Check size={14} /> Saved
        </div>
      )}

      {/* Global Settings */}
      <section className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-lg mb-4">Global Settings</h2>
        <div className="mb-4 p-4 bg-[var(--color-muted)] rounded-lg">
          <Toggle
            label="All MNSfantasy emails"
            description="Master switch. Off = nothing sent."
            checked={prefs.global.globalOptIn}
            onChange={(v) => handleGlobalToggle('globalOptIn', v)}
          />
        </div>

        <p className="text-sm text-[var(--color-muted-foreground)] mb-4">
          When global is ON, choose what you receive:
        </p>

        <div className="space-y-3 pl-2">
          <Toggle
            label="New game announcements"
            checked={prefs.global.prefNewGames}
            onChange={(v) => handleGlobalToggle('prefNewGames', v)}
            disabled={globalDisabled}
          />
          <Toggle
            label="League invites from friends"
            checked={prefs.global.prefLeagueInvites}
            onChange={(v) => handleGlobalToggle('prefLeagueInvites', v)}
            disabled={globalDisabled}
          />
          <Toggle
            label="Platform news & updates"
            checked={prefs.global.prefPlatformNews}
            onChange={(v) => handleGlobalToggle('prefPlatformNews', v)}
            disabled={globalDisabled}
          />
          <div>
            <Toggle
              label="MoneyNeverSleeps.app insights"
              description="MoneyNeverSleeps.app is a separate product. This consent is independent."
              checked={prefs.global.prefMnsInsights}
              onChange={(v) => handleGlobalToggle('prefMnsInsights', v)}
              disabled={globalDisabled}
            />
          </div>
        </div>
      </section>

      {/* Per-Game Settings */}
      {prefs.joinedGames.length > 0 && (
        <section className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-6 mb-6">
          <h2 className="font-semibold text-lg mb-4">Per-Game Settings</h2>
          <p className="text-sm text-[var(--color-muted-foreground)] mb-4">
            Only shows games you've joined.
          </p>
          <div className="space-y-4">
            {prefs.joinedGames.map((slug) => {
              const game = GAMES.find((g) => g.slug === slug)
              if (!game) return null
              const gamePrefs = prefs.gamePrefs[slug] || {
                prefMorningUpdate: true,
                prefEliminationAlerts: true,
                prefScoreAlerts: true,
                prefRosterLockReminders: true,
              }
              return (
                <GamePrefRow
                  key={slug}
                  game={game}
                  prefs={gamePrefs}
                  disabled={globalDisabled}
                  onToggle={(field, value) => handleGameToggle(slug, field, value)}
                  onUnsubscribeGame={() => handleUnsubscribeGame(slug)}
                />
              )
            })}
          </div>
        </section>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div />
        {confirmUnsubAll ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-red-400">Are you sure?</span>
            <Button variant="danger" size="sm" onClick={handleUnsubscribeAll}>
              Yes, unsubscribe from everything
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmUnsubAll(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={handleUnsubscribeAll} className="text-red-400 hover:text-red-300">
            Unsubscribe from everything
          </Button>
        )}
      </div>
    </div>
  )
}
