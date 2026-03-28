import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyToken, createClerkClient } from '@clerk/backend'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import { marketingSubscribers } from '../../src/lib/db/schema.js'

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
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! })
    const user = await clerk.users.getUser(userId)
    const email = user.emailAddresses[0]?.emailAddress || ''

    const sql = neon(process.env.DATABASE_URL!)
    const db = drizzle(sql)

    const body = req.body
    const updates: Record<string, any> = { updatedAt: new Date() }

    if (body.globalOptIn !== undefined) updates.globalOptIn = body.globalOptIn
    if (body.prefNewGames !== undefined) updates.prefNewGames = body.prefNewGames
    if (body.prefLeagueInvites !== undefined) updates.prefLeagueInvites = body.prefLeagueInvites
    if (body.prefPlatformNews !== undefined) updates.prefPlatformNews = body.prefPlatformNews
    if (body.prefMnsInsights !== undefined) updates.prefMnsInsights = body.prefMnsInsights

    // Handle unsubscribe
    if (body.globalOptIn === false) {
      updates.unsubscribedAt = new Date()
    } else if (body.globalOptIn === true) {
      updates.unsubscribedAt = null
    }

    // Check if subscriber exists
    const [existing] = await db
      .select()
      .from(marketingSubscribers)
      .where(eq(marketingSubscribers.userId, userId))
      .limit(1)

    if (existing) {
      await db
        .update(marketingSubscribers)
        .set(updates)
        .where(eq(marketingSubscribers.userId, userId))
    } else {
      await db.insert(marketingSubscribers).values({
        userId,
        email,
        ...updates,
      })
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('PUT /api/preferences error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
