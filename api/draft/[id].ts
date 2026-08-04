import type { VercelRequest, VercelResponse } from '@vercel/node'
import { and, asc, eq } from 'drizzle-orm'
import { db, applyCors, requireUser } from '../_draft.js'
import { drafts, draftItems, draftParticipants, draftPicks } from '../../src/lib/db/schema.js'

// GET /api/draft/:id — full board state for the lobby.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const id = req.query.id as string
  if (!id) return res.status(400).json({ error: 'Draft id is required' })

  try {
    const [draft] = await db.select().from(drafts).where(eq(drafts.id, id)).limit(1)
    if (!draft) return res.status(404).json({ error: 'Draft not found' })

    const [participants, picks, items] = await Promise.all([
      db
        .select()
        .from(draftParticipants)
        .where(eq(draftParticipants.draftId, id))
        .orderBy(asc(draftParticipants.slot)),
      db
        .select()
        .from(draftPicks)
        .where(eq(draftPicks.draftId, id))
        .orderBy(asc(draftPicks.overall)),
      db.select().from(draftItems).where(eq(draftItems.draftId, id)),
    ])

    const itemById = new Map(items.map((i) => [i.id, i]))
    const takenIds = new Set(picks.map((p) => p.itemId).filter(Boolean) as string[])
    const board = picks.map((p) => ({
      overall: p.overall,
      round: p.round,
      pickInRound: p.pickInRound,
      participantId: p.participantId,
      madeAt: p.madeAt,
      isAuto: p.isAuto,
      item: p.itemId ? (itemById.get(p.itemId) ?? null) : null,
    }))

    const current = draft.currentOverall
      ? (board.find((b) => b.overall === draft.currentOverall) ?? null)
      : null
    const viewerId = await requireUser(req)
    const viewer = viewerId ? participants.find((p) => p.userId === viewerId) : undefined

    return res.status(200).json({
      draft,
      participants,
      board,
      current,
      // Whose turn it is, and whether that's the caller.
      onTheClock: current
        ? (participants.find((p) => p.id === current.participantId) ?? null)
        : null,
      isMyTurn: !!viewer && !!current && current.participantId === viewer.id,
      available: items
        .filter((i) => i.available && (draft.mode !== 'draft' || !takenIds.has(i.id)))
        .sort((a, b) => (a.rankHint ?? 1e9) - (b.rankHint ?? 1e9) || a.name.localeCompare(b.name)),
    })
  } catch (error) {
    console.error('GET /api/draft/[id] error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
