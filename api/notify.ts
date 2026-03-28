import type { VercelRequest, VercelResponse } from '@vercel/node'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import { Resend } from 'resend'
import { marketingSubscribers } from '../src/lib/db/schema.js'
import { GAMES } from '../src/lib/games-config.js'

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 })
    return true
  }

  if (entry.count >= 3) {
    return false
  }

  entry.count++
  return true
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket?.remoteAddress || 'unknown'

  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests. Try again later.' })
  }

  const { email, gameSlug } = req.body
  if (!email || !gameSlug) {
    return res.status(400).json({ error: 'Missing email or gameSlug' })
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' })
  }

  const game = GAMES.find((g) => g.slug === gameSlug)
  if (!game) {
    return res.status(400).json({ error: 'Invalid game' })
  }

  try {
    const sql = neon(process.env.DATABASE_URL!)
    const db = drizzle(sql)

    // Upsert subscriber
    const [existing] = await db
      .select()
      .from(marketingSubscribers)
      .where(eq(marketingSubscribers.email, email))
      .limit(1)

    if (existing) {
      await db
        .update(marketingSubscribers)
        .set({
          globalOptIn: true,
          prefNewGames: true,
          updatedAt: new Date(),
        })
        .where(eq(marketingSubscribers.email, email))
    } else {
      await db.insert(marketingSubscribers).values({
        email,
        globalOptIn: true,
        prefNewGames: true,
        source: 'mnsfantasy-landing',
      })
    }

    // Send confirmation email via Resend
    const resend = new Resend(process.env.RESEND_API_KEY!)
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'updates@mnsfantasy.com',
      to: email,
      subject: `You're on the list for ${game.name}!`,
      html: `
        <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0a0f; color: #f5f5f7;">
          <h1 style="font-size: 24px; margin-bottom: 16px;">You're on the list!</h1>
          <p style="color: #8e8e9a; font-size: 14px; line-height: 1.6;">
            We'll let you know when <strong style="color: #f5f5f7;">${game.name}</strong> launches on MNSfantasy.
          </p>
          <p style="color: #8e8e9a; font-size: 14px; line-height: 1.6; margin-top: 16px;">
            ${game.icon} ${game.description}
          </p>
          <p style="color: #8e8e9a; font-size: 12px; margin-top: 32px; border-top: 1px solid #2a2a35; padding-top: 16px;">
            You're receiving this because you signed up at mnsfantasy.com.<br/>
            <a href="https://mnsfantasy.com/preferences" style="color: #00ff87;">Manage preferences</a>
          </p>
        </div>
      `,
    })

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('POST /api/notify error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
