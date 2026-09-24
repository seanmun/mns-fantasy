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

// A Clerk session token lives 60 seconds and a Bumper run can outlive
// it. Tools draw their token through this instead of holding the
// caller's: it hands back the same token until it is about to expire,
// then mints a fresh one for the SAME session — same member, same
// authority — and keeps the stale one if Clerk refuses, so a late
// call fails with an honest 401 rather than a forged identity.
export type TokenSource = () => Promise<string>

export function refreshingToken(token: string): TokenSource {
  let current = token
  let expiresAt = expiryOf(token)
  let inflight: Promise<string> | null = null
  const mint = async (): Promise<string> => {
    const sid = claimsOf(current).sid
    if (!sid) return current
    try {
      const res = await fetch(`https://api.clerk.com/v1/sessions/${sid}/tokens`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
      })
      const data = (await res.json()) as { jwt?: string }
      if (res.ok && data.jwt) {
        current = data.jwt
        expiresAt = expiryOf(current)
      }
    } catch {
      // keep the token we have
    }
    return current
  }
  return async () => {
    if (Date.now() < expiresAt - 15_000) return current
    if (!inflight) inflight = mint().finally(() => { inflight = null })
    return inflight
  }
}

function claimsOf(jwt: string): { sid?: string; exp?: number } {
  try {
    return JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString())
  } catch {
    return {}
  }
}
const expiryOf = (jwt: string): number => (claimsOf(jwt).exp ?? 0) * 1000

// Games call server-to-server for privileged actions (create a draft,
// replace the item pool) using the shared service secret.
export function isTrustedService(req: VercelRequest): boolean {
  const secret = process.env.DRAFT_SERVICE_SECRET
  return !!secret && req.headers['x-draft-service-secret'] === secret
}

// Order/turn logic lives in src/lib/draft/engine.ts so the clock cron
// and the API share one implementation.
