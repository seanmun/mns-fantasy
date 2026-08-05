import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export interface DraftPickLine {
  round: number
  pickInRound: number
  teamName: string
  golferName: string
}

interface OnTheClockEmailProps {
  teamName: string
  draftName: string
  round: number
  pickInRound: number
  overall: number
  totalPicks: number
  totalRounds: number
  lobbyUrl: string
  /** When the pick auto-fills, already formatted for the reader. */
  deadlineText: string
  /** Their top still-available queued golfer, if they have one. */
  nextInQueue?: string | null
  /** Completed picks before theirs, oldest first. */
  recentPicks?: DraftPickLine[]
  /** What the recipient has drafted so far, earliest round first. */
  myTeam?: Array<{ round: number; golferName: string }>
  /** Their queue in order, drafted names already removed. */
  myQueue?: string[]
}

// The markup is read from disk and never embedded in a template
// literal: doing that ate backslashes and silently deleted the VML rule
// from the Outlook block. Everything in the .html file is Sean's; this
// only substitutes {{tokens}}.
const TEMPLATE_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  'templates',
  'on-the-clock.html'
)

let cached: string | null = null
function template(): string {
  if (cached === null) cached = readFileSync(TEMPLATE_PATH, 'utf8')
  return cached
}

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildOnTheClockEmail({
  teamName,
  draftName,
  round,
  pickInRound,
  overall,
  totalPicks,
  totalRounds,
  lobbyUrl,
  deadlineText,
  nextInQueue,
  recentPicks = [],
  myTeam = [],
  myQueue = [],
}: OnTheClockEmailProps): { subject: string; html: string } {
  const tokens: Record<string, string> = {
    draftName: esc(draftName),
    teamName: esc(teamName),
    round: String(round),
    pickInRound: String(pickInRound),
    overall: String(overall),
    totalPicks: String(totalPicks),
    deadlineText: esc(deadlineText),
    lobbyUrl,
    year: String(new Date().getFullYear()),
    teamLabel: `Team (${myTeam.length} of ${totalRounds})`,
    queueLabel: `Queue (${myQueue.length})`,
    pickedLines: recentPicks
      .map((p) => `${p.round}.${p.pickInRound} · ${esc(p.golferName)} · ${esc(p.teamName)}`)
      .join('<br>'),
    teamLines: myTeam.map((p) => `R${p.round} · ${esc(p.golferName)}`).join('<br>'),
    queueLines: myQueue.map((n, i) => `${i + 1}. ${esc(n)}`).join('<br>'),
    closingLine: nextInQueue
      ? `Don't get to it and ${esc(nextInQueue)} comes off your queue automatically.`
      : `Don't get to it and the best available golfer is picked for you. Add golfers to your queue to control what happens if you're away.`,
    // There's no hosted copy of the email, so this points at the lobby.
    VIB_URL: lobbyUrl,
  }

  let html = template()
  for (const [key, value] of Object.entries(tokens)) {
    html = html.split(`{{${key}}}`).join(value)
  }

  return {
    // The pick number makes every message a distinct subject, so Gmail
    // doesn't collapse a whole draft into one thread.
    subject: `You're on the clock — ${round}.${pickInRound} · ${draftName}`,
    html,
  }
}
