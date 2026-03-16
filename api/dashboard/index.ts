import type { VercelRequest, VercelResponse } from '@vercel/node'
import { clerkClient } from '@clerk/clerk-sdk-node'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, inArray, sql } from 'drizzle-orm'
import { leagueMembers, leagues } from '../../src/lib/db/schema'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '')
    if (!sessionToken) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const session = await clerkClient.sessions.getSession(sessionToken)
    const userId = session.userId

    const sqlClient = neon(process.env.DATABASE_URL!)
    const db = drizzle(sqlClient)

    // Get all leagues the user belongs to across every game
    const userLeagues = await db
      .select({
        leagueId: leagues.id,
        leagueName: leagues.name,
        gameSlug: leagues.gameSlug,
        teamName: leagueMembers.teamName,
        joinedAt: leagueMembers.joinedAt,
      })
      .from(leagueMembers)
      .innerJoin(leagues, eq(leagueMembers.leagueId, leagues.id))
      .where(eq(leagueMembers.userId, userId))

    // Batch-fetch member counts for all matched leagues
    const leagueIds = userLeagues.map((l) => l.leagueId)
    const memberCounts: Record<string, number> = {}

    if (leagueIds.length > 0) {
      const counts = await db
        .select({
          leagueId: leagueMembers.leagueId,
          count: sql<number>`count(*)::int`,
        })
        .from(leagueMembers)
        .where(inArray(leagueMembers.leagueId, leagueIds))
        .groupBy(leagueMembers.leagueId)

      for (const c of counts) {
        memberCounts[c.leagueId] = c.count
      }
    }

    // Group by game slug
    const gameMap: Record<
      string,
      {
        gameSlug: string
        leagues: Array<{
          id: string
          name: string
          teamName: string | null
          memberCount: number
          joinedAt: string | null
        }>
      }
    > = {}

    for (const league of userLeagues) {
      if (!gameMap[league.gameSlug]) {
        gameMap[league.gameSlug] = { gameSlug: league.gameSlug, leagues: [] }
      }
      gameMap[league.gameSlug].leagues.push({
        id: league.leagueId,
        name: league.leagueName,
        teamName: league.teamName,
        memberCount: memberCounts[league.leagueId] || 0,
        joinedAt: league.joinedAt?.toISOString() || null,
      })
    }

    return res.status(200).json({ games: Object.values(gameMap) })
  } catch (error) {
    console.error('GET /api/dashboard error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
