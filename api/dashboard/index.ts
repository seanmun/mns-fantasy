import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyToken } from '@clerk/backend'
import { neon } from '@neondatabase/serverless'
import { getUserLeagues } from '../../src/lib/db/hubViews.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '')
    if (!sessionToken) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const payload = await verifyToken(sessionToken, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    })
    const userId = payload.sub

    const sqlClient = neon(process.env.DATABASE_URL!)
    const userLeagues = await getUserLeagues(sqlClient, userId)

    // Group by game slug
    const gameMap: Record<
      string,
      {
        gameSlug: string
        leagues: Array<{
          id: string
          name: string
          format: 'season' | 'event'
          teamName: string | null
          memberCount: number
          joinedAt: string | null
        }>
      }
    > = {}

    for (const league of userLeagues) {
      if (!gameMap[league.game_slug]) {
        gameMap[league.game_slug] = { gameSlug: league.game_slug, leagues: [] }
      }
      gameMap[league.game_slug].leagues.push({
        id: league.id,
        name: league.name,
        format: league.format,
        teamName: league.team_name,
        memberCount: league.member_count,
        joinedAt: league.joined_at ? new Date(league.joined_at).toISOString() : null,
      })
    }

    return res.status(200).json({ games: Object.values(gameMap) })
  } catch (error) {
    console.error('GET /api/dashboard error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
