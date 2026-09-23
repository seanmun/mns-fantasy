import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod'
import { applyCors, requireUser } from './_draft.js'
import { buildWnbaTools } from './_wnbaTools.js'

// The platform chat agent — one conversation across the member's games,
// NFL pick'em and WNBA dynasty so far. The privacy model is structural, not prompt-deep: every
// tool call goes to a game's EXISTING member API carrying the CALLER'S
// OWN Clerk token, so the agent can only ever see or do what that
// member could in the UI. Hidden-picks-until-deadline, pick validation,
// per-game locks — all enforced server-side by the game, same as any
// page. There is deliberately NO service credential in this file.
//
// POST /api/chat { messages: [{role:'user'|'assistant', content: string}, ...] }
// → { reply: string }

// Where the NFL API lives. Explicit env wins; production falls back to
// the live app; anywhere else refuses loudly rather than silently
// reaching production (golf's PLATFORM_API_URL landmine, inverted).
function nflUrl(): string {
  const explicit = process.env.NFL_API_URL
  if (explicit) return explicit
  if (process.env.VERCEL_ENV === 'production') return 'https://nfl.mnsfantasy.com'
  throw new Error('NFL_API_URL is not set — refusing to fall back to production outside production.')
}

async function nflFetch(
  token: string,
  path: string,
  init: RequestInit = {}
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const res = await fetch(`${nflUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  })
  const body = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, body }
}

// Tool results feed straight into model context: compact them. An error
// comes back as readable text, never a throw — the model explains it to
// the member and keeps going.
const asResult = (r: { ok: boolean; status: number; body: unknown }): string =>
  r.ok
    ? JSON.stringify(r.body)
    : `Request failed (${r.status}): ${JSON.stringify(r.body)}`

type Game = { gameId: string; kickoffAt: string; status: string; spread: number | null; open: boolean; offBoard: boolean; home: { id: string; nickname: string } | null; away: { id: string; nickname: string } | null; homeScore: number | null; awayScore: number | null }

function buildTools(token: string) {
  const listMyPools = betaZodTool({
    name: 'nfl_list_my_pools',
    description:
      "The member's NFL pools and their entries. Call this first when the pool is not yet known — pool ids and entry ids from here feed every other NFL tool.",
    inputSchema: z.object({}),
    run: async () => {
      const r = await nflFetch(token, '/api/pools')
      if (!r.ok) return asResult(r)
      const data = r.body as { pools: Array<{ pool: Record<string, unknown>; entry: { id: string; entryName: string } }> }
      return JSON.stringify(
        data.pools.map(({ pool, entry }) => ({
          poolId: pool.id,
          name: pool.name,
          poolType: pool.poolType,
          spreadMode: pool.spreadMode,
          status: pool.status,
          entryId: entry.id,
          entryName: entry.entryName,
        }))
      )
    },
  })

  const getWeek = betaZodTool({
    name: 'nfl_get_week',
    description:
      "One pool week: the slate with kickoffs and spreads (home-team perspective; negative = home favored), which games are still open, the pick deadline, and the caller's own picks per entry. Others' picks appear only once they can no longer change — each game's picks from its own kickoff, the whole week from the deadline. The server enforces that; never work around it. Omit week for the current week.",
    inputSchema: z.object({
      poolId: z.string(),
      week: z.number().int().optional(),
    }),
    run: async (input) => {
      const q = input.week != null ? `?week=${input.week}` : ''
      const r = await nflFetch(token, `/api/pools/${input.poolId}/picks${q}`)
      if (!r.ok) return asResult(r)
      const d = r.body as {
        pool: Record<string, unknown>
        week: { week: number; label: string }
        published: string | null
        deadline: string | null
        revealed: boolean
        slate: Game[]
        entries: Array<{ id: string; entryName: string; submittedAt: string | null }>
        myPicks: Array<{ entryId: string; gameId: string; selectedTeamId: string; isKeyPick: boolean; result: string }>
        others: Array<{ entryName: string; gameId: string; selectedTeamId: string; isKeyPick: boolean }>
      }
      return JSON.stringify({
        week: d.week,
        picksRequired: d.pool.picksRequired,
        keyPickRequired: d.pool.keyPick,
        spreadMode: d.pool.spreadMode,
        published: !!d.published,
        deadline: d.deadline,
        revealed: d.revealed,
        slate: d.slate.map((g) => ({
          gameId: g.gameId,
          matchup: `${g.away?.nickname ?? '?'} @ ${g.home?.nickname ?? '?'}`,
          awayTeamId: g.away?.id,
          homeTeamId: g.home?.id,
          kickoffAt: g.kickoffAt,
          homeSpread: g.spread,
          offBoard: g.offBoard,
          open: g.open,
          status: g.status,
          score: g.homeScore != null ? `${g.awayScore}-${g.homeScore}` : null,
        })),
        myEntries: d.entries,
        myPicks: d.myPicks.map((p) => ({
          entryId: p.entryId,
          gameId: p.gameId,
          selectedTeamId: p.selectedTeamId,
          isKeyPick: p.isKeyPick,
          result: p.result,
        })),
        // Only games the server has revealed: each from its kickoff, all
        // from the deadline.
        othersPicks: d.others.map((o) => ({
          entryName: o.entryName,
          gameId: o.gameId,
          selectedTeamId: o.selectedTeamId,
          isKeyPick: o.isKeyPick,
        })),
      })
    },
  })

  const getStandings = betaZodTool({
    name: 'nfl_get_standings',
    description: 'Pool standings: rank, entry, total points, key-pick score, weekly results.',
    inputSchema: z.object({ poolId: z.string() }),
    run: async (input) => {
      const r = await nflFetch(token, `/api/pools/${input.poolId}/standings`)
      if (!r.ok) return asResult(r)
      const d = r.body as { final?: boolean; rows: Array<{ rank: number; entryName: string; ownerName: string | null; totalPoints: number; keyPickScore: number; isMine: boolean }> }
      return JSON.stringify({
        final: d.final ?? false,
        rows: d.rows.map((row) => ({
          rank: row.rank,
          entryName: row.entryName,
          owner: row.ownerName,
          totalPoints: row.totalPoints,
          keyPickScore: row.keyPickScore,
          mine: row.isMine,
        })),
      })
    },
  })

  const setPicks = betaZodTool({
    name: 'nfl_set_picks',
    description:
      "Save the FULL desired pick set for one entry for one week — always send every pick you want to exist, never a delta; picks on already-kicked-off games carry through automatically and cannot change. Exactly one pick should have isKeyPick when the pool uses key picks. Saving is not submitting: after saving, state the picks back to the member and call nfl_submit_picks only when they confirm (or when they already told you to submit in the same breath).",
    inputSchema: z.object({
      poolId: z.string(),
      entryId: z.string(),
      week: z.number().int(),
      picks: z.array(
        z.object({
          gameId: z.string(),
          selectedTeamId: z.string(),
          isKeyPick: z.boolean().optional(),
        })
      ),
    }),
    run: async (input) => {
      const r = await nflFetch(token, `/api/pools/${input.poolId}/picks`, {
        method: 'PUT',
        body: JSON.stringify({ entryId: input.entryId, week: input.week, picks: input.picks }),
      })
      return asResult(r)
    },
  })

  const submitPicks = betaZodTool({
    name: 'nfl_submit_picks',
    description:
      "Submit (confirm) an entry's saved picks for a week — the explicit \"I'm done\". Only call when the member has clearly asked to submit; the server refuses incomplete sets, so save first.",
    inputSchema: z.object({
      poolId: z.string(),
      entryId: z.string(),
      week: z.number().int(),
    }),
    run: async (input) => {
      const r = await nflFetch(token, `/api/pools/${input.poolId}/picks`, {
        method: 'POST',
        body: JSON.stringify({ entryId: input.entryId, week: input.week }),
      })
      return asResult(r)
    },
  })

  return [listMyPools, getWeek, getStandings, setPicks, submitPicks]
}

// Stable system prompt — cached; keep volatile things (dates, user ids)
// OUT of it and let tools carry the current state.
const SYSTEM = `You are Bumper — "Bump" to the members, who reach you through an "Ask Bump" button — the MNS Fantasy assistant: a warm, old-school character, like the favorite uncle who's run the neighborhood pool for forty years. You answer to either name. You're talking to one signed-in member about their own games — NFL pick'em POOLS and WNBA dynasty LEAGUES.

Bumper's voice:
- Friendly, plain-spoken, a little playful. Neighborhood-bar warmth, never corporate.
- Signature sayings, used SPARINGLY — at most one per conversation, only where it genuinely fits, and NEVER in error messages, bad news, or deadline warnings:
  - "Bada bing!" to cap a genuinely exclamatory moment — picks locked in, a big win, a bold call.
  - "Have a lucky day." as a warm send-off when the exchange is wrapping up.
  - "Cooooome ooon" when someone asks the same thing twice, or asks for something you can't do — always followed by a plain, helpful explanation of what's going on.
- Accent: North Jersey tough guy, a touch of mob-movie warmth. Sprinkle it LIGHTLY in casual connective phrases — "whatchu doin'", "wooder" for water, short punchy sentences — a seasoning, not a costume.
- The accent and sayings NEVER touch the facts: team names, spreads, points, deadlines and pick confirmations are always stated in plain, crystal-clear English. When in doubt, skip the shtick.

Ground rules:
- Everything you know about pools and leagues comes from the tools, which act AS this member. Never guess ids, spreads, deadlines, stats or standings — look them up.
- VOCABULARY BY GAME, never mixed: NFL contests are POOLS — a member has an ENTRY, the person running it is the MANAGER, the act is making PICKS. WNBA and NBA dynasty contests are LEAGUES — a member owns a TEAM, the person running it is the COMMISSIONER, the acts are setting LINEUPS, working the WAIVER wire, and making TRADES. Calling a league a pool (or the reverse) reads as not knowing the member's world — match their game every time. "Standings" and "Locked" mean the same everywhere.
- Privacy (NFL): other members' picks stay secret until they can no longer change — a game's picks reveal at its kickoff, the rest of the week at the deadline. The tools never return them early; if asked, say exactly that. Never speculate about what someone else picked.
- Picks (NFL): "save" and "submit" are different acts. Set picks when asked, then confirm the set back in plain words (team names, key pick starred) and submit only on the member's clear go-ahead — a single message like "pick all underdogs and submit" counts as a go-ahead.
- Spreads (NFL) are stated from the home team's side: -3.5 means the home team is favored by 3.5. An underdog is the team getting points.
- Be brief and warm. Plain sentences, team nicknames, no tables unless listing standings or lines. This audience includes 75-year-olds on phones — clarity beats cleverness.
- PLAIN TEXT ONLY — your replies are shown verbatim and often read aloud. Never use markdown: no asterisks, underscores, backticks, hashes or bracket links. For lists, plain lines. Say spreads naturally: "Giants plus 3.5", "Eagles minus 7".
- You cannot change settings, manage pools or leagues, invite people, or see anything a member couldn't. If asked, point them to the pool or league page.

WNBA dynasty leagues (wnba_* tools):
- Nine-category matchups: PTS, REB, AST, STL, BLK, 3PM, FG%, FT%, A/TO. Only ACTIVE players score, judged per DATE — lineups set for a future date stick when the day arrives; past days are locked.
- Free agency has two gears: OPEN (instant adds) until the day's first tip, then WAIVERS — queued claims clear next 8am Eastern as a snake by waiver order. Always check the window and tell the member which gear applies before adding anyone.
- CAT is a player's nine-category value (z-score, 0 = league average); CAT$ is CAT per million of salary — the value-per-dollar number for a salary-cap league. Use wnba_players sorted by catD to find bargains and wnba_evaluate_trade for EVERY trade's math — never arithmetic by hand.
- Salary cap has a ladder: floor, aprons with fees, and a HARD cap no move may cross. A team over the roster limit is frozen out of adds until it drops or IRs someone (IR doesn't hold a roster spot).
- Some leagues name a lineup SHAPE (2 C, 4 F, 4 G); others run all-flex. Where a shape exists, every starter must fit a distinct slot she qualifies for, dual-eligible players float between them, and the server refuses a move that leaves someone unplaceable — read positionSlots from the overview before advising on lineups.
- Five slots, and the difference matters: ACTIVE scores; BENCH doesn't; IR frees a roster spot but STILL counts against the cap; REDSHIRT and INTERNATIONAL free the spot AND the cap room.
- Redshirt and international stash look alike from the box score — both are players with no games — but they are opposites. Redshirt is a ROOKIE who is with a WNBA club and hasn't debuted: it costs a fee to place and another to activate, and activating spends it forever, so always say the fee and the one-way nature and act only on a clear yes. International is for a player who ISN'T with a WNBA club at all, at any experience level: no fee, and she returns free when she reports. Each player's leaguePresence tells you which she is — never guess from games played alone.
- The strategic reads for advice: gamesLeftThisWeek from the overview (a player with more games left is worth more this week), age (veterans vs youth for dynasty timelines), injury status and note, and each team's category production from the overview — a team weak in a category is a trade partner for someone with a surplus.
- Mutations follow the same rule as picks: state the move back in plain words, act on a clear go-ahead. Trades especially — evaluate, recite the deal and both sides' cap/roster effects, then propose only on their yes.
- STRATEGY DIALS: wnba_my_team returns the member's strategy — six 0-100 dials and a philosophy note, the note outranking the dials. Fit every suggestion to them: a rebuilder hears about picks and young CAT$ bargains, a win-now spender hears about the best player available; a punt team's weak category is a feature, not a problem. Null dials mean unset — advise neutrally and, once per conversation at most, mention the dials exist in team settings. Each team's strategy is private: never reveal, compare or assume another team's, and when advising on a trade remember the OTHER owner will judge it by their own lights — a deal can be right for both sides.`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const userId = await requireUser(req)
  if (!userId) return res.status(401).json({ error: 'Sign in to continue.' })
  const token = req.headers.authorization!.replace('Bearer ', '')

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured.' })
  }

  const history = (req.body?.messages ?? []) as Array<{ role: string; content: string }>
  const messages: Anthropic.Beta.BetaMessageParam[] = history
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-30)
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'Send at least one user message.' })
  }

  // Page context rides in as an operator note, not user text — a
  // mid-conversation system message after the last user turn, so the
  // sheet opened on a pool page needs no "which pool?" round-trip.
  // Client-supplied and advisory only: it tells the agent where the
  // member IS, it grants nothing — authority stays with the token.
  const context = req.body?.context as { game?: string; poolId?: string; leagueId?: string } | undefined
  if (context?.poolId && typeof context.poolId === 'string') {
    messages.push({
      role: 'system',
      content: `The member is currently viewing ${context.game === 'nfl' || !context.game ? 'NFL' : context.game} pool id ${context.poolId.slice(0, 64)}. When they say "this pool", "this week" or similar, they mean that pool — resolve it with the tools rather than asking which pool they mean.`,
    } as unknown as Anthropic.Beta.BetaMessageParam)
  }
  if (context?.leagueId && typeof context.leagueId === 'string' && context.game === 'wnba') {
    messages.push({
      role: 'system',
      content: `The member is currently viewing WNBA league id ${context.leagueId.slice(0, 64)}. When they say "my team", "this league", "my matchup" or similar, they mean that league — resolve with the wnba tools rather than asking which league.`,
    } as unknown as Anthropic.Beta.BetaMessageParam)
  }

  try {
    const client = new Anthropic()
    const finalMessage = await client.beta.messages.toolRunner({
      model: 'claude-opus-5',
      max_tokens: 4096,
      max_iterations: 8,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      tools: [...buildTools(token), ...buildWnbaTools(token, userId)],
      messages,
    })

    const reply = finalMessage.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim()

    return res.status(200).json({
      reply: reply || 'Sorry — I came up empty there. Try asking another way.',
      stopReason: finalMessage.stop_reason,
    })
  } catch (error) {
    console.error('POST /api/chat failed:', error)
    if (error instanceof Anthropic.APIError) {
      return res.status(502).json({ error: `The assistant is unavailable right now (${error.status}).` })
    }
    return res.status(500).json({ error: 'The assistant hit an error. Try again.' })
  }
}
