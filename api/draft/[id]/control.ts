import type { VercelRequest, VercelResponse } from '@vercel/node'
import { and, eq } from 'drizzle-orm'
import { db, applyCors, requireUser, isTrustedService } from '../../_draft.js'
import { drafts, draftItems, draftParticipants } from '../../../src/lib/db/schema.js'
import { startDraft } from '../../../src/lib/draft/engine.js'

// POST /api/draft/:id/control { action, ... }
//   start | pause | resume | cancel
//   set_items   — replace the pool while still in setup
//   set_available { ref, available } — e.g. a withdrawal mid-draft
// Restricted to the draft's creator (the game's commissioner) or a
// trusted service call.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const id = req.query.id as string
  const action = req.body?.action as string | undefined
  if (!id || !action) return res.status(400).json({ error: 'Draft id and action are required' })

  const service = isTrustedService(req)
  const userId = service ? null : await requireUser(req)
  if (!service && !userId) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const [draft] = await db.select().from(drafts).where(eq(drafts.id, id)).limit(1)
    if (!draft) return res.status(404).json({ error: 'Draft not found' })
    if (!service && draft.createdBy !== userId) {
      return res.status(403).json({ error: 'Only the commissioner can control this draft' })
    }

    const now = new Date()

    switch (action) {
      case 'start': {
        if (draft.status !== 'setup') {
          return res.status(409).json({ error: `Draft is already ${draft.status}` })
        }
        const started = await startDraft(db, draft)
        return res.status(200).json({ draft: started })
      }

      case 'pause': {
        if (draft.status !== 'active') return res.status(409).json({ error: 'Draft is not active' })
        const [paused] = await db
          .update(drafts)
          .set({ status: 'paused', currentDeadline: null, updatedAt: now })
          .where(eq(drafts.id, id))
          .returning()
        return res.status(200).json({ draft: paused })
      }

      case 'resume': {
        if (draft.status !== 'paused') return res.status(409).json({ error: 'Draft is not paused' })
        const deadline = draft.pickSeconds
          ? new Date(now.getTime() + draft.pickSeconds * 1000)
          : new Date(now.getTime() + draft.slowPickHours * 3600 * 1000)
        const [resumed] = await db
          .update(drafts)
          .set({ status: 'active', currentDeadline: deadline, updatedAt: now })
          .where(eq(drafts.id, id))
          .returning()
        return res.status(200).json({ draft: resumed })
      }

      case 'cancel': {
        const [cancelled] = await db
          .update(drafts)
          .set({ status: 'cancelled', currentDeadline: null, updatedAt: now })
          .where(eq(drafts.id, id))
          .returning()
        return res.status(200).json({ draft: cancelled })
      }

      // Late joiners: the roster of participants stays open until the
      // draft starts, so the game re-sends it at start time.
      case 'set_participants': {
        if (draft.status !== 'setup') {
          return res
            .status(409)
            .json({ error: 'Participants can only change before the draft starts' })
        }
        const participants = req.body?.participants
        if (!Array.isArray(participants) || participants.length < 2) {
          return res.status(400).json({ error: 'At least 2 participants are required' })
        }
        await db.delete(draftParticipants).where(eq(draftParticipants.draftId, id))
        await db.insert(draftParticipants).values(
          participants.map((p: Record<string, unknown>, i: number) => ({
            draftId: id,
            userId: String(p.userId),
            email: p.email ? String(p.email) : null,
            teamName: String(p.teamName ?? `Team ${i + 1}`),
            slot: Number(p.slot ?? i + 1),
          }))
        )
        return res.status(200).json({ ok: true, participants: participants.length })
      }

      // Pool settings (roster size, pick clock) can change right up
      // until the draft starts; the game re-sends them at start time.
      case 'set_config': {
        if (draft.status !== 'setup') {
          return res.status(409).json({ error: 'Config can only change before the draft starts' })
        }
        const patch: Record<string, unknown> = { updatedAt: now }
        if (req.body?.rounds != null) patch.rounds = Number(req.body.rounds)
        if ('pickSeconds' in (req.body ?? {})) {
          patch.pickSeconds = req.body.pickSeconds == null ? null : Number(req.body.pickSeconds)
        }
        if (req.body?.slowPickHours != null) patch.slowPickHours = Number(req.body.slowPickHours)
        if (req.body?.name) patch.name = String(req.body.name)
        const [updated] = await db
          .update(drafts)
          .set(patch)
          .where(eq(drafts.id, id))
          .returning()
        return res.status(200).json({ draft: updated })
      }

      // Field changes (Monday qualifiers, late adds) before the draft starts.
      case 'set_items': {
        if (draft.status !== 'setup') {
          return res.status(409).json({ error: 'Items can only be replaced before the draft starts' })
        }
        const items = req.body?.items
        if (!Array.isArray(items) || items.length === 0) {
          return res.status(400).json({ error: 'items are required' })
        }
        await db.delete(draftItems).where(eq(draftItems.draftId, id))
        await db.insert(draftItems).values(
          items.map((it: Record<string, unknown>) => ({
            draftId: id,
            ref: String(it.ref),
            name: String(it.name),
            meta: (it.meta ?? null) as never,
            rankHint: it.rankHint == null ? null : Number(it.rankHint),
          }))
        )
        return res.status(200).json({ ok: true, items: items.length })
      }

      // Withdrawal mid-draft: keep the record, stop it being picked.
      case 'set_available': {
        const ref = req.body?.ref as string | undefined
        const available = req.body?.available
        if (!ref || typeof available !== 'boolean') {
          return res.status(400).json({ error: 'ref and available are required' })
        }
        await db
          .update(draftItems)
          .set({ available })
          .where(and(eq(draftItems.draftId, id), eq(draftItems.ref, ref)))
        return res.status(200).json({ ok: true })
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` })
    }
  } catch (error) {
    console.error('POST /api/draft/[id]/control error:', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    })
  }
}
