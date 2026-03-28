import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyToken } from '@clerk/backend'
import { createHmac } from 'crypto'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, and, isNull } from 'drizzle-orm'
import { Resend } from 'resend'
import { marketingSubscribers } from '../../src/lib/db/schema'
import { GAMES } from '../../src/lib/games-config'
import { buildGameLaunchEmail } from '../../src/emails/GameLaunchEmail'

const ADMIN_IDS = (process.env.ADMIN_USER_IDS || '').split(',').filter(Boolean)

function generateUnsubscribeToken(userId: string): string {
  const secret = process.env.UNSUBSCRIBE_HMAC_SECRET!
  const payload = `${userId}:${Date.now()}`
  const sig = createHmac('sha256', secret).update(payload).digest('hex')
  return Buffer.from(`${payload}:${sig}`).toString('base64url')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
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

    const { gameSlug } = req.body
    const game = GAMES.find((g) => g.slug === gameSlug)
    if (!game) {
      return res.status(400).json({ error: 'Invalid game slug' })
    }

    const sqlClient = neon(process.env.DATABASE_URL!)
    const db = drizzle(sqlClient)

    // Get eligible subscribers
    const subscribers = await db
      .select()
      .from(marketingSubscribers)
      .where(
        and(
          eq(marketingSubscribers.globalOptIn, true),
          eq(marketingSubscribers.prefNewGames, true),
          isNull(marketingSubscribers.unsubscribedAt)
        )
      )

    const resend = new Resend(process.env.RESEND_API_KEY!)
    let sentCount = 0

    for (const sub of subscribers) {
      const token = sub.userId ? generateUnsubscribeToken(sub.userId) : ''
      const unsubscribeUrl = token
        ? `https://mnsfantasy.com/preferences?token=${token}`
        : 'https://mnsfantasy.com/preferences'

      const { subject, html } = buildGameLaunchEmail({ game, unsubscribeUrl })

      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'updates@mnsfantasy.com',
          to: sub.email,
          subject,
          html,
        })
        sentCount++
      } catch (emailError) {
        console.error(`Failed to send to ${sub.email}:`, emailError)
      }
    }

    return res.status(200).json({ success: true, recipientCount: sentCount })
  } catch (error) {
    console.error('POST /api/admin/send-launch-email error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
