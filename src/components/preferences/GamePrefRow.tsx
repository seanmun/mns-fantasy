import { Toggle } from '@/components/ui/Toggle'
import type { GameConfig } from '@/lib/games-config'

interface GamePrefs {
  prefMorningUpdate: boolean
  prefEliminationAlerts: boolean
  prefScoreAlerts: boolean
  prefRosterLockReminders: boolean
}

interface GamePrefRowProps {
  game: GameConfig
  prefs: GamePrefs
  disabled: boolean
  onToggle: (field: keyof GamePrefs, value: boolean) => void
  onUnsubscribeGame: () => void
}

export function GamePrefRow({ game, prefs, disabled, onToggle, onUnsubscribeGame }: GamePrefRowProps) {
  return (
    <div className="border border-[var(--color-border)] rounded-lg p-4" style={{ borderLeftWidth: '3px', borderLeftColor: game.accentColor }}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">{game.icon}</span>
        <h4 className="font-semibold">{game.name} {game.season}</h4>
      </div>
      <div className="space-y-3">
        <Toggle
          label="Morning update emails"
          checked={prefs.prefMorningUpdate}
          onChange={(v) => onToggle('prefMorningUpdate', v)}
          disabled={disabled}
        />
        <Toggle
          label="Elimination alerts"
          checked={prefs.prefEliminationAlerts}
          onChange={(v) => onToggle('prefEliminationAlerts', v)}
          disabled={disabled}
        />
        <Toggle
          label="Score alerts"
          checked={prefs.prefScoreAlerts}
          onChange={(v) => onToggle('prefScoreAlerts', v)}
          disabled={disabled}
        />
        <Toggle
          label="Roster lock reminders"
          checked={prefs.prefRosterLockReminders}
          onChange={(v) => onToggle('prefRosterLockReminders', v)}
          disabled={disabled}
        />
      </div>
      <button
        onClick={onUnsubscribeGame}
        disabled={disabled}
        className="mt-4 text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
      >
        Unsubscribe from {game.shortName} emails only
      </button>
    </div>
  )
}
