import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createHmac } from 'crypto'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import { marketingSubscribers } from '../src/lib/db/schema'

function verifyUnsubscribeToken(token: string): { userId: string; valid: boolean } {
  try {
    const secret = process.env.UNSUBSCRIBE_HMAC_SECRET!
    const decoded = Buffer.from(token, 'base64url').toString()
    const [userId, ts, sig] = decoded.split(':')
    const payload = `${userId}:${ts}`
    const expected = createHmac('sha256', secret).update(payload).digest('hex')
    const age = Date.now() - parseInt(ts)
    const valid = sig === expected && age < 30 * 24 * 60 * 60 * 1000 // 30 days
    return { userId, valid }
  } catch {
    return { userId: '', valid: false }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const token = req.query.token as string
  if (!token) {
    return res.status(400).json({ error: 'Missing token' })
  }

  const { userId, valid } = verifyUnsubscribeToken(token)

  if (!valid) {
    // Check if it's expired vs invalid
    try {
      const decoded = Buffer.from(token, 'base64url').toString()
      const [, ts, sig] = decoded.split(':')
      const secret = process.env.UNSUBSCRIBE_HMAC_SECRET!
      const payload = `${decoded.split(':')[0]}:${ts}`
      const expected = createHmac('sha256', secret).update(payload).digest('hex')
      if (sig === expected) {
        return res.status(200).json({ success: false, reason: 'expired' })
      }
    } catch {}
    return res.status(200).json({ success: false, reason: 'invalid' })
  }

  try {
    const sql = neon(process.env.DATABASE_URL!)
    const db = drizzle(sql)

    // Set unsubscribed_at
    const [subscriber] = await db
      .select()
      .from(marketingSubscribers)
      .where(eq(marketingSubscribers.userId, userId))
      .limit(1)

    if (subscriber) {
      await db
        .update(marketingSubscribers)
        .set({
          globalOptIn: false,
          unsubscribedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(marketingSubscribers.userId, userId))

      return res.status(200).json({
        success: true,
        email: subscriber.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
      })
    }

    return res.status(200).json({ success: false, reason: 'invalid' })
  } catch (error) {
    console.error('GET /api/unsubscribe error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
