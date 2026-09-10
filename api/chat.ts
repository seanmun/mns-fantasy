import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod'
import { applyCors, requireUser } from './_draft.js'

// The platform chat agent — one conversation across the member's games,
// NFL first. The privacy model is structural, not prompt-deep: every
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
      "One pool week: the slate with kickoffs and spreads (home-team perspective; negative = home favored), which games are still open, the pick deadline, and the caller's own picks per entry. Others' picks appear ONLY after the deadline reveal — the server enforces that, never work around it. Omit week for the current week.",
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
        // Empty until the server-side reveal at the deadline.
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
const SYSTEM = `You are the MNS Fantasy assistant, talking to one signed-in member about their own pools.

Ground rules:
- Everything you know about pools comes from the tools, which act AS this member. Never guess ids, spreads, deadlines or standings — look them up.
- Privacy: before a week's deadline, other members' picks are secret. The tools will never return them early; if asked, say picks reveal at the deadline. Never speculate about what someone else picked.
- Picks: "save" and "submit" are different acts. Set picks when asked, then confirm the set back in plain words (team names, key pick starred) and submit only on the member's clear go-ahead — a single message like "pick all underdogs and submit" counts as a go-ahead.
- Spreads are stated from the home team's side: -3.5 means the home team is favored by 3.5. An underdog is the team getting points.
- Vocabulary: pools have Entries and Standings; the person running a pool is the Manager; "Locked" means unchangeable.
- Be brief and warm. Plain sentences, team nicknames, no tables unless listing standings or lines. This audience includes 75-year-olds on phones — clarity beats cleverness.
- PLAIN TEXT ONLY — your replies are shown verbatim and often read aloud. Never use markdown: no asterisks, underscores, backticks, hashes or bracket links. For lists, plain lines. Say spreads naturally: "Giants plus 3.5", "Eagles minus 7".
- You cannot change settings, manage pools, invite people, or see anything a member couldn't. If asked, point them to the pool page.`

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
  const context = req.body?.context as { game?: string; poolId?: string } | undefined
  if (context?.poolId && typeof context.poolId === 'string') {
    messages.push({
      role: 'system',
      content: `The member is currently viewing ${context.game === 'nfl' || !context.game ? 'NFL' : context.game} pool id ${context.poolId.slice(0, 64)}. When they say "this pool", "this week" or similar, they mean that pool — resolve it with the tools rather than asking which pool they mean.`,
    } as unknown as Anthropic.Beta.BetaMessageParam)
  }

  try {
    const client = new Anthropic()
    const finalMessage = await client.beta.messages.toolRunner({
      model: 'claude-opus-5',
      max_tokens: 4096,
      max_iterations: 8,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      tools: buildTools(token),
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
