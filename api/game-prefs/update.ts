import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyToken } from '@clerk/backend'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, and } from 'drizzle-orm'
import { marketingGamePrefs } from '../../src/lib/db/schema.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '')
    if (!sessionToken) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const payload = await verifyToken(sessionToken, { secretKey: process.env.CLERK_SECRET_KEY! })
    const userId = payload.sub

    const { gameSlug, prefs } = req.body
    if (!gameSlug || !prefs) {
      return res.status(400).json({ error: 'Missing gameSlug or prefs' })
    }

    const sql = neon(process.env.DATABASE_URL!)
    const db = drizzle(sql)

    const updates: Record<string, any> = { updatedAt: new Date() }
    if (prefs.prefMorningUpdate !== undefined) updates.prefMorningUpdate = prefs.prefMorningUpdate
    if (prefs.prefEliminationAlerts !== undefined) updates.prefEliminationAlerts = prefs.prefEliminationAlerts
    if (prefs.prefScoreAlerts !== undefined) updates.prefScoreAlerts = prefs.prefScoreAlerts
    if (prefs.prefRosterLockReminders !== undefined) updates.prefRosterLockReminders = prefs.prefRosterLockReminders

    // Check if game pref exists
    const [existing] = await db
      .select()
      .from(marketingGamePrefs)
      .where(
        and(
          eq(marketingGamePrefs.userId, userId),
          eq(marketingGamePrefs.gameSlug, gameSlug)
        )
      )
      .limit(1)

    if (existing) {
      await db
        .update(marketingGamePrefs)
        .set(updates)
        .where(
          and(
            eq(marketingGamePrefs.userId, userId),
            eq(marketingGamePrefs.gameSlug, gameSlug)
          )
        )
    } else {
      await db.insert(marketingGamePrefs).values({
        userId,
        gameSlug,
        ...updates,
      })
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('PUT /api/game-prefs error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
