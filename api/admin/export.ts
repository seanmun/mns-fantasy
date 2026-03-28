import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyToken } from '@clerk/backend'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { desc } from 'drizzle-orm'
import { marketingSubscribers } from '../../src/lib/db/schema'

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

    const subscribers = await db
      .select()
      .from(marketingSubscribers)
      .orderBy(desc(marketingSubscribers.createdAt))

    // Build CSV
    const headers = [
      'id', 'email', 'user_id', 'global_opt_in', 'pref_new_games',
      'pref_league_invites', 'pref_platform_news', 'pref_mns_insights',
      'source', 'unsubscribed_at', 'created_at', 'updated_at',
    ]
    const rows = subscribers.map((s) => [
      s.id, s.email, s.userId || '', s.globalOptIn, s.prefNewGames,
      s.prefLeagueInvites, s.prefPlatformNews, s.prefMnsInsights,
      s.source || '', s.unsubscribedAt?.toISOString() || '',
      s.createdAt.toISOString(), s.updatedAt.toISOString(),
    ])

    const csv = [
      headers.join(','),
      ...rows.map((r) => r.map((v) => `"${v}"`).join(',')),
    ].join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="subscribers-${new Date().toISOString().split('T')[0]}.csv"`)
    return res.status(200).send(csv)
  } catch (error) {
    console.error('GET /api/admin/export error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
