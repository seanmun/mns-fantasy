import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod'

// Bumper's WNBA toolset. Same law as NFL: every call hits the game's
// EXISTING member API with the CALLER's own Clerk token — the agent
// sees and does exactly what this member could in the UI, no service
// credential anywhere. Wide reads for reasoning, precise writes for
// action, and one calculator so the numbers are never guessed.

function wnbaUrl(): string {
  const explicit = process.env.WNBA_API_URL
  if (explicit) return explicit
  if (process.env.VERCEL_ENV === 'production') return 'https://wnba.mnsfantasy.com'
  throw new Error('WNBA_API_URL is not set — refusing to fall back to production outside production.')
}

async function wnbaFetch(
  token: string,
  path: string,
  init: RequestInit = {}
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const res = await fetch(`${wnbaUrl()}${path}`, {
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

const asResult = (r: { ok: boolean; status: number; body: unknown }): string =>
  r.ok ? JSON.stringify(r.body) : `Request failed (${r.status}): ${JSON.stringify(r.body)}`

interface WnbaPlayer {
  id: string
  name: string
  position: string | null
  teamCode: string | null
  teamId: string | null
  slot: string | null
  salary: number | null
  age: number | null
  isRookie: boolean
  injuryStatus: string | null
  injuryNote: string | null
}
interface StatAvg {
  gp: number
  ppg: number
  rpg: number
  apg: number
  spg: number
  bpg: number
  tpg: number
  fgPct: number
  cat?: number | null
  catD?: number | null
}

async function myTeamId(token: string, leagueId: string, userId: string): Promise<string | null> {
  const r = await wnbaFetch(token, `/api/leagues/${leagueId}/teams`)
  if (!r.ok) return null
  const teams = r.body as Array<{ id: string; owners: Array<{ userId: string | null }> }>
  return teams.find((t) => t.owners.some((o) => o.userId === userId))?.id ?? null
}

export function buildWnbaTools(token: string, userId: string) {
  const myLeagues = betaZodTool({
    name: 'wnba_my_leagues',
    description:
      "The member's WNBA dynasty leagues. Call first when the league isn't known — league ids feed every other WNBA tool.",
    inputSchema: z.object({}),
    run: async () => {
      const r = await wnbaFetch(token, '/api/leagues')
      if (!r.ok) return asResult(r)
      const leagues = r.body as Array<{ id: string; name: string; leaguePhase: string; seasonYear: number }>
      return JSON.stringify(
        leagues.map((l) => ({ leagueId: l.id, name: l.name, phase: l.leaguePhase, seasonYear: l.seasonYear }))
      )
    },
  })

  const overview = betaZodTool({
    name: 'wnba_league_overview',
    description:
      'The league in one read: phase, current week, standings (wins, category points, salary per team, which is mine), cap ladder, roster rules, the free-agency window (open = instant adds until first tip; waivers = claims clear next 8am ET as a snake), prize pot, and how many games each WNBA club still plays this league week — the streaming number. Start here for anything strategic.',
    inputSchema: z.object({ leagueId: z.string() }),
    run: async (input) => asResult(await wnbaFetch(token, `/api/leagues/${input.leagueId}/overview`)),
  })

  const myTeam = betaZodTool({
    name: 'wnba_my_team',
    description:
      "The member's roster for a date (default today, Eastern): each player's lineup slot (only ACTIVE players score, per date), position, salary, age, injury status and note, plus cap usage and the member's pending waiver queue. Past dates are locked; today and future dates are editable.",
    inputSchema: z.object({
      leagueId: z.string(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }),
    run: async (input) => {
      const teamId = await myTeamId(token, input.leagueId, userId)
      if (!teamId) return 'This member does not own a team in that league.'
      const dateQ = input.date ? `&date=${input.date}` : ''
      const [playersR, lineupR, waiversR] = await Promise.all([
        wnbaFetch(token, `/api/leagues/${input.leagueId}/players`),
        wnbaFetch(token, `/api/leagues/${input.leagueId}/lineup?teamId=${teamId}${dateQ}`),
        wnbaFetch(token, `/api/leagues/${input.leagueId}/waivers`),
      ])
      if (!playersR.ok) return asResult(playersR)
      const players = playersR.body as Array<WnbaPlayer & { avg: StatAvg | null }>
      const lineup = lineupR.ok
        ? (lineupR.body as { date: string; locked: boolean; slots: Record<string, string>; games: Record<string, { opp: string; home: boolean; tip: string; state: string }> })
        : null
      const waivers = waiversR.ok
        ? (waiversR.body as { window: string; clearsOn: string; myClaims: Array<{ addNames: string[]; dropName: string | null; clearsOn: string }> })
        : null
      const roster = players
        .filter((p) => p.teamId === teamId)
        .map((p) => ({
          playerId: p.id,
          name: p.name,
          position: p.position,
          club: p.teamCode,
          age: p.age,
          salary: p.salary,
          slot: lineup?.slots[p.id] ?? p.slot ?? 'active',
          injury: p.injuryStatus ? { status: p.injuryStatus, note: p.injuryNote } : null,
          gameOnDate: p.teamCode && lineup?.games[p.teamCode] ? lineup.games[p.teamCode] : null,
          seasonAvg: p.avg,
        }))
      return JSON.stringify({
        teamId,
        date: lineup?.date ?? 'today',
        dateLocked: lineup?.locked ?? false,
        totalSalary: roster.reduce((n, p) => n + (p.salary ?? 0), 0),
        roster,
        faWindow: waivers?.window ?? null,
        pendingClaims: waivers?.myClaims ?? [],
      })
    },
  })

  const playerPool = betaZodTool({
    name: 'wnba_players',
    description:
      'Search the player pool with stats: filter by name, position, free agents only, salary ceiling; sort by a stat over a range (season, last30, last10). Each row carries age, salary, injury, owner, per-game averages, CAT (nine-category z-score value, 0 = league average) and CAT$ (CAT per $1M — value density). Use freeAgentsOnly for pickup targets; drop it to scout other rosters for trades. Keep limit small; ask again with different filters rather than pulling everything.',
    inputSchema: z.object({
      leagueId: z.string(),
      search: z.string().optional(),
      position: z.string().optional(),
      freeAgentsOnly: z.boolean().optional(),
      ownedByTeamId: z.string().optional(),
      maxSalary: z.number().optional(),
      maxAge: z.number().optional(),
      range: z.enum(['season', 'last30', 'last10']).optional(),
      sortBy: z.enum(['ppg', 'rpg', 'apg', 'spg', 'bpg', 'tpg', 'fgPct', 'cat', 'catD', 'salary', 'age']).optional(),
      limit: z.number().int().min(1).max(40).optional(),
    }),
    run: async (input) => {
      const [playersR, statsR, teamsR] = await Promise.all([
        wnbaFetch(token, `/api/leagues/${input.leagueId}/players`),
        wnbaFetch(token, `/api/leagues/${input.leagueId}/stats`),
        wnbaFetch(token, `/api/leagues/${input.leagueId}/teams`),
      ])
      if (!playersR.ok) return asResult(playersR)
      const players = playersR.body as WnbaPlayer[]
      const ranges = (statsR.ok ? statsR.body : {}) as Record<string, Record<string, StatAvg> | null>
      const teams = (teamsR.ok ? teamsR.body : []) as Array<{ id: string; name: string }>
      const teamName = new Map(teams.map((t) => [t.id, t.name]))
      const range = input.range ?? 'season'
      const stats = ranges[range] ?? {}
      const sortBy = input.sortBy ?? 'catD'
      const q = input.search?.trim().toLowerCase()
      const rows = players
        .filter((p) => (input.freeAgentsOnly ? p.teamId == null : true))
        .filter((p) => (input.ownedByTeamId ? p.teamId === input.ownedByTeamId : true))
        .filter((p) => (input.position ? (p.position ?? '').toUpperCase().includes(input.position.toUpperCase()) : true))
        .filter((p) => (input.maxSalary != null ? (p.salary ?? 0) <= input.maxSalary : true))
        .filter((p) => (input.maxAge != null ? p.age != null && p.age <= input.maxAge : true))
        .filter((p) => (q ? p.name.toLowerCase().includes(q) : true))
        .map((p) => ({
          playerId: p.id,
          name: p.name,
          position: p.position,
          club: p.teamCode,
          age: p.age,
          salary: p.salary,
          isRookie: p.isRookie,
          owner: p.teamId ? teamName.get(p.teamId) ?? p.teamId : null,
          injury: p.injuryStatus,
          stats: stats[p.id] ?? null,
        }))
        .sort((a, b) => {
          const v = (x: typeof a): number =>
            sortBy === 'salary' ? x.salary ?? 0 : sortBy === 'age' ? x.age ?? 99 : ((x.stats?.[sortBy] as number | null) ?? -99)
          return sortBy === 'age' ? v(a) - v(b) : v(b) - v(a)
        })
        .slice(0, input.limit ?? 15)
      return JSON.stringify({ range, sortBy, players: rows })
    },
  })

  const matchup = betaZodTool({
    name: 'wnba_matchup',
    description:
      "The member's current matchup: the category scoreboard (who leads each of the nine), both rosters with each player's week so far, and one DAY of the week in detail (slots, who plays, box lines) — date defaults to today.",
    inputSchema: z.object({
      leagueId: z.string(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }),
    run: async (input) => {
      const teamId = await myTeamId(token, input.leagueId, userId)
      const listR = await wnbaFetch(token, `/api/leagues/${input.leagueId}/matchups`)
      if (!listR.ok) return asResult(listR)
      const list = listR.body as { matchups: Array<{ id: string; homeTeamId: string; awayTeamId: string }> }
      const mineM =
        list.matchups.find((m) => teamId && (m.homeTeamId === teamId || m.awayTeamId === teamId)) ??
        list.matchups[0]
      if (!mineM) return 'No matchups this week.'
      const dateQ = input.date ? `&date=${input.date}` : ''
      return asResult(
        await wnbaFetch(token, `/api/leagues/${input.leagueId}/matchups?matchupId=${mineM.id}${dateQ}`)
      )
    },
  })

  const evaluateTrade = betaZodTool({
    name: 'wnba_evaluate_trade',
    description:
      'The trade calculator — ALWAYS run this before recommending or proposing any deal; never do the math yourself. Returns the per-game category swing from the MEMBER\'s side, the CAT delta, and both teams\' salary and roster verdicts (over the hard cap or roster limit = the deal cannot execute). Dry run, changes nothing.',
    inputSchema: z.object({
      leagueId: z.string(),
      toTeamId: z.string(),
      givePlayerIds: z.array(z.string()),
      getPlayerIds: z.array(z.string()),
    }),
    run: async (input) =>
      asResult(
        await wnbaFetch(token, `/api/leagues/${input.leagueId}/trades`, {
          method: 'POST',
          body: JSON.stringify({
            action: 'evaluate',
            toTeamId: input.toTeamId,
            givePlayerIds: input.givePlayerIds,
            getPlayerIds: input.getPlayerIds,
          }),
        })
      ),
  })

  const setLineup = betaZodTool({
    name: 'wnba_set_lineup',
    description:
      "Move the member's own players between active, bench and ir for a date (default today; future dates stick when the day arrives; past dates are locked). Only ACTIVE players score. State the moves back in plain words after. The server enforces IR limits and locks — report its errors honestly.",
    inputSchema: z.object({
      leagueId: z.string(),
      moves: z.array(
        z.object({
          playerId: z.string(),
          slot: z.enum(['active', 'bench', 'ir']),
        })
      ),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }),
    run: async (input) => {
      const results: Array<{ playerId: string; ok: boolean; error?: string }> = []
      for (const move of input.moves) {
        const r = await wnbaFetch(token, `/api/leagues/${input.leagueId}/roster`, {
          method: 'POST',
          body: JSON.stringify({ playerId: move.playerId, slot: move.slot, ...(input.date ? { date: input.date } : {}) }),
        })
        results.push({
          playerId: move.playerId,
          ok: r.ok,
          ...(r.ok ? {} : { error: String((r.body as { error?: string })?.error ?? r.status) }),
        })
      }
      return JSON.stringify(results)
    },
  })

  const addPlayer = betaZodTool({
    name: 'wnba_add_player',
    description:
      "Add a free agent (naming who to drop unless the roster has room). Before the day's first tip this executes INSTANTLY; after tip it queues a waiver claim that clears next 8am ET in the snake. Check wnba_league_overview's freeAgency window first and TELL the member which of the two will happen before calling. Only call once they've clearly said to do it.",
    inputSchema: z.object({
      leagueId: z.string(),
      addPlayerId: z.string(),
      dropPlayerId: z.string().optional(),
    }),
    run: async (input) =>
      asResult(
        await wnbaFetch(token, `/api/leagues/${input.leagueId}/waivers`, {
          method: 'POST',
          body: JSON.stringify({
            addPlayerIds: [input.addPlayerId],
            ...(input.dropPlayerId ? { dropPlayerId: input.dropPlayerId } : {}),
          }),
        })
      ),
  })

  const dropPlayer = betaZodTool({
    name: 'wnba_drop_player',
    description:
      'Drop one of the member\'s players to free agency, effective immediately. Destructive — only after the member clearly confirms THE NAMED PLAYER.',
    inputSchema: z.object({ leagueId: z.string(), playerId: z.string() }),
    run: async (input) =>
      asResult(
        await wnbaFetch(token, `/api/leagues/${input.leagueId}/roster`, {
          method: 'POST',
          body: JSON.stringify({ playerId: input.playerId, slot: 'drop' }),
        })
      ),
  })

  const proposeTrade = betaZodTool({
    name: 'wnba_propose_trade',
    description:
      "Send a trade proposal to another team (players and/or future picks — pick ids look like pick:2027:r1:<teamId> and come from the trade page's board). Run wnba_evaluate_trade FIRST, state the full deal and its effects back to the member, and only call this on their clear go-ahead. The other owner must accept before anything moves.",
    inputSchema: z.object({
      leagueId: z.string(),
      toTeamId: z.string(),
      givePlayerIds: z.array(z.string()).optional(),
      getPlayerIds: z.array(z.string()).optional(),
      givePickIds: z.array(z.string()).optional(),
      getPickIds: z.array(z.string()).optional(),
      note: z.string().max(300).optional(),
    }),
    run: async (input) =>
      asResult(
        await wnbaFetch(token, `/api/leagues/${input.leagueId}/trades`, {
          method: 'POST',
          body: JSON.stringify({
            action: 'propose',
            toTeamId: input.toTeamId,
            givePlayerIds: input.givePlayerIds ?? [],
            getPlayerIds: input.getPlayerIds ?? [],
            givePickIds: input.givePickIds ?? [],
            getPickIds: input.getPickIds ?? [],
            ...(input.note ? { note: input.note } : {}),
          }),
        })
      ),
  })

  return [
    myLeagues,
    overview,
    myTeam,
    playerPool,
    matchup,
    evaluateTrade,
    setLineup,
    addPlayer,
    dropPlayer,
    proposeTrade,
  ]
}
