import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyToken } from '@clerk/backend'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import { marketingSubscribers, marketingGamePrefs } from '../../src/lib/db/schema.js'
import { getUserGameSlugs } from '../../src/lib/db/hubViews.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '')
    if (!sessionToken) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const payload = await verifyToken(sessionToken, { secretKey: process.env.CLERK_SECRET_KEY! })
    const userId = payload.sub

    const sql = neon(process.env.DATABASE_URL!)
    const db = drizzle(sql)

    // Fetch subscriber record
    const [subscriber] = await db
      .select()
      .from(marketingSubscribers)
      .where(eq(marketingSubscribers.userId, userId))
      .limit(1)

    // Fetch game preferences
    const gamePrefs = await db
      .select()
      .from(marketingGamePrefs)
      .where(eq(marketingGamePrefs.userId, userId))

    // Fetch joined games across every game schema (hub contract views)
    const joinedGames = await getUserGameSlugs(sql, userId)

    const gamePrefsBySlug: Record<string, any> = {}
    for (const pref of gamePrefs) {
      gamePrefsBySlug[pref.gameSlug] = {
        prefMorningUpdates: pref.prefMorningUpdates,
        prefEliminationAlerts: pref.prefEliminationAlerts,
        prefScoreAlerts: pref.prefScoreAlerts,
        prefRosterReminders: pref.prefRosterReminders,
      }
    }

    return res.status(200).json({
      global: subscriber
        ? {
            globalOptIn: subscriber.globalOptIn,
            prefNewGames: subscriber.prefNewGames,
            prefLeagueInvites: subscriber.prefLeagueInvites,
            prefPlatformNews: subscriber.prefPlatformNews,
            prefMnsInsights: subscriber.prefMnsInsights,
            unsubscribedAt: subscriber.unsubscribedAt,
          }
        : {
            globalOptIn: true,
            prefNewGames: true,
            prefLeagueInvites: true,
            prefPlatformNews: true,
            prefMnsInsights: false,
            unsubscribedAt: null,
          },
      gamePrefs: gamePrefsBySlug,
      joinedGames,
      email: subscriber?.email || '',
      updatedAt: subscriber?.updatedAt?.toISOString() || null,
    })
  } catch (error) {
    console.error('GET /api/preferences error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
