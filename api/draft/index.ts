import type { VercelRequest, VercelResponse } from '@vercel/node'
import { and, eq } from 'drizzle-orm'
import { db, applyCors, isTrustedService } from '../_draft.js'
import { drafts, draftItems, draftParticipants } from '../../src/lib/db/schema.js'

// POST /api/draft — create a draft (server-to-server from a game app).
// GET  /api/draft?gameSlug=&scopeType=&scopeId= — look one up.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return

  if (req.method === 'GET') {
    const { gameSlug, scopeType, scopeId } = req.query as Record<string, string>
    if (!gameSlug || !scopeType || !scopeId) {
      return res.status(400).json({ error: 'gameSlug, scopeType and scopeId are required' })
    }
    const [draft] = await db
      .select()
      .from(drafts)
      .where(
        and(
          eq(drafts.gameSlug, gameSlug),
          eq(drafts.scopeType, scopeType),
          eq(drafts.scopeId, scopeId)
        )
      )
      .limit(1)
    return res.status(200).json({ draft: draft ?? null })
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!isTrustedService(req)) return res.status(403).json({ error: 'Forbidden' })

  const {
    gameSlug,
    scopeType,
    scopeId,
    name,
    lobbyUrl,
    mode = 'draft',
    orderType = 'snake',
    rounds,
    pickSeconds = null,
    slowPickHours = 12,
    createdBy,
    participants = [],
    items = [],
  } = req.body ?? {}

  if (!gameSlug || !scopeType || !scopeId || !name || !lobbyUrl || !rounds || !createdBy) {
    return res.status(400).json({
      error: 'gameSlug, scopeType, scopeId, name, lobbyUrl, rounds and createdBy are required',
    })
  }
  if (!Array.isArray(participants) || participants.length < 2) {
    return res.status(400).json({ error: 'At least 2 participants are required' })
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one item is required' })
  }

  try {
    const [existing] = await db
      .select({ id: drafts.id, status: drafts.status })
      .from(drafts)
      .where(
        and(
          eq(drafts.gameSlug, gameSlug),
          eq(drafts.scopeType, scopeType),
          eq(drafts.scopeId, scopeId)
        )
      )
      .limit(1)
    if (existing) {
      return res.status(409).json({ error: 'A draft already exists for this scope', draftId: existing.id })
    }

    const [draft] = await db
      .insert(drafts)
      .values({
        gameSlug,
        scopeType,
        scopeId,
        name,
        lobbyUrl,
        mode,
        orderType,
        rounds,
        pickSeconds,
        slowPickHours,
        createdBy,
      })
      .returning()

    await db.insert(draftParticipants).values(
      participants.map((p: Record<string, unknown>, i: number) => ({
        draftId: draft.id,
        userId: String(p.userId),
        email: p.email ? String(p.email) : null,
        teamName: String(p.teamName ?? `Team ${i + 1}`),
        slot: Number(p.slot ?? i + 1),
      }))
    )

    await db.insert(draftItems).values(
      items.map((it: Record<string, unknown>) => ({
        draftId: draft.id,
        ref: String(it.ref),
        name: String(it.name),
        meta: (it.meta ?? null) as never,
        rankHint: it.rankHint == null ? null : Number(it.rankHint),
      }))
    )

    return res.status(201).json({ draft })
  } catch (error) {
    console.error('POST /api/draft error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
