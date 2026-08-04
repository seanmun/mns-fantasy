import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyToken } from '@clerk/backend'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '../src/lib/db/schema.js'

export const db = drizzle(neon(process.env.DATABASE_URL!), { schema })

// Game apps live on sibling subdomains and call these endpoints from the
// browser with the shared Clerk session, so preflight + credentials have
// to be allowed for *.mnsfantasy.com (plus localhost for development).
export function applyCors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers.origin
  const allowed =
    !!origin &&
    (/^https:\/\/([a-z0-9-]+\.)?mnsfantasy\.com$/.test(origin) ||
      /^http:\/\/localhost:\d+$/.test(origin))
  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type')
  }
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return true
  }
  return false
}

export async function requireUser(req: VercelRequest): Promise<string | null> {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) return null
    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY! })
    return payload.sub ?? null
  } catch {
    return null
  }
}

// Games call server-to-server for privileged actions (create a draft,
// replace the item pool) using the shared service secret.
export function isTrustedService(req: VercelRequest): boolean {
  const secret = process.env.DRAFT_SERVICE_SECRET
  return !!secret && req.headers['x-draft-service-secret'] === secret
}

// Order/turn logic lives in src/lib/draft/engine.ts so the clock cron
// and the API share one implementation.
