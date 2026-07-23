import type { NeonQueryFunction } from '@neondatabase/serverless'

// Cross-game "hub contract": every game schema exposes two views with
// identical shapes, adapting its native tables —
//   <game>.hub_leagues  (id text, name, game_slug, format, created_at)
//   <game>.hub_members  (league_id text, user_id, team_name, joined_at)
// The hub only ever reads these. See scripts/hub-views.sql for the
// definitions. New game => add its schema to the unions below.
const LEAGUES_UNION = `
  select * from ncaa.hub_leagues
  union all select * from wnba.hub_leagues
  union all select * from golf.hub_leagues`

const MEMBERS_UNION = `
  select * from ncaa.hub_members
  union all select * from wnba.hub_members
  union all select * from golf.hub_members`

export interface HubLeagueRow {
  id: string
  name: string
  game_slug: string
  format: 'season' | 'event'
  team_name: string | null
  joined_at: string | null
  member_count: number
}

type Sql = NeonQueryFunction<false, false>

export async function getUserLeagues(sql: Sql, userId: string): Promise<HubLeagueRow[]> {
  const rows = await sql.query(
    `with l as (${LEAGUES_UNION}), m as (${MEMBERS_UNION})
     select l.id, l.name, l.game_slug, l.format, m.team_name, m.joined_at,
            (select count(*)::int from m m2 where m2.league_id = l.id) as member_count
     from m join l on l.id = m.league_id
     where m.user_id = $1
     order by m.joined_at desc nulls last`,
    [userId]
  )
  return rows as HubLeagueRow[]
}

export async function getUserGameSlugs(sql: Sql, userId: string): Promise<string[]> {
  const rows = (await sql.query(
    `with l as (${LEAGUES_UNION}), m as (${MEMBERS_UNION})
     select distinct l.game_slug
     from m join l on l.id = m.league_id
     where m.user_id = $1`,
    [userId]
  )) as Array<{ game_slug: string }>
  return rows.map((r) => r.game_slug)
}
