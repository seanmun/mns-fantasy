import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyToken } from '@clerk/backend'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, isNull, isNotNull, desc, sql, count } from 'drizzle-orm'
import { marketingSubscribers } from '../../src/lib/db/schema.js'

const ADMIN_IDS = (process.env.ADMIN_USER_IDS || '').split(',').filter(Boolean)

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
    if (!ADMIN_IDS.includes(payload.sub)) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const sqlClient = neon(process.env.DATABASE_URL!)
    const db = drizzle(sqlClient)

    const [totalResult] = await db.select({ count: count() }).from(marketingSubscribers)
    const [optedInResult] = await db
      .select({ count: count() })
      .from(marketingSubscribers)
      .where(eq(marketingSubscribers.globalOptIn, true))
    const [optedOutResult] = await db
      .select({ count: count() })
      .from(marketingSubscribers)
      .where(isNotNull(marketingSubscribers.unsubscribedAt))

    const recentSignups = await db
      .select({
        id: marketingSubscribers.id,
        email: marketingSubscribers.email,
        source: marketingSubscribers.source,
        createdAt: marketingSubscribers.createdAt,
        globalOptIn: marketingSubscribers.globalOptIn,
      })
      .from(marketingSubscribers)
      .orderBy(desc(marketingSubscribers.createdAt))
      .limit(20)

    return res.status(200).json({
      total: totalResult.count,
      optedIn: optedInResult.count,
      optedOut: optedOutResult.count,
      recentSignups,
    })
  } catch (error) {
    console.error('GET /api/admin/stats error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
