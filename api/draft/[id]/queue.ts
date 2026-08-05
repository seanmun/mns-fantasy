import type { VercelRequest, VercelResponse } from '@vercel/node'
import { and, eq, inArray } from 'drizzle-orm'
import { db, applyCors, requireUser } from '../../_draft.js'
import { drafts, draftItems, draftParticipants } from '../../../src/lib/db/schema.js'

// GET  /api/draft/:id/queue        — my queue + autodraft setting
// POST /api/draft/:id/queue        — { itemIds?, autodraft? }
// A queue is private to its owner and is used for auto-picks whether or
// not autodraft is switched on.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return

  const id = req.query.id as string
  if (!id) return res.status(400).json({ error: 'Draft id is required' })

  const userId = await requireUser(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const [draft] = await db.select().from(drafts).where(eq(drafts.id, id)).limit(1)
    if (!draft) return res.status(404).json({ error: 'Draft not found' })

    const [me] = await db
      .select()
      .from(draftParticipants)
      .where(and(eq(draftParticipants.draftId, id), eq(draftParticipants.userId, userId)))
      .limit(1)
    if (!me) return res.status(403).json({ error: 'You are not in this draft' })

    if (req.method === 'GET') {
      return res.status(200).json({ queue: me.queue ?? [], autodraft: me.autodraft })
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    const patch: Record<string, unknown> = {}

    if (req.body?.itemIds !== undefined) {
      const itemIds = req.body.itemIds
      if (!Array.isArray(itemIds)) {
        return res.status(400).json({ error: 'itemIds must be an array' })
      }
      // Drop duplicates, then keep only ids that belong to this draft.
      const unique = [...new Set(itemIds.map(String))]
      if (unique.length > 0) {
        const valid = await db
          .select({ id: draftItems.id })
          .from(draftItems)
          .where(and(eq(draftItems.draftId, id), inArray(draftItems.id, unique)))
        const validIds = new Set(valid.map((v) => v.id))
        const unknown = unique.filter((x) => !validIds.has(x))
        if (unknown.length > 0) {
          return res.status(400).json({ error: 'Some golfers are not in this draft' })
        }
      }
      patch.queue = unique
    }

    if (req.body?.autodraft !== undefined) {
      patch.autodraft = !!req.body.autodraft
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'Nothing to update' })
    }

    const [updated] = await db
      .update(draftParticipants)
      .set(patch)
      .where(eq(draftParticipants.id, me.id))
      .returning()

    // Turning autodraft on while already on the clock should pick now,
    // not wait for the timer.
    let draftAfter = draft
    if (updated.autodraft && draft.status === 'active') {
      const { runAutodraft } = await import('../../../src/lib/draft/engine.js')
      draftAfter = await runAutodraft(db, draft)
    }

    return res.status(200).json({
      queue: updated.queue ?? [],
      autodraft: updated.autodraft,
      draft: draftAfter,
    })
  } catch (error) {
    console.error('/api/draft/[id]/queue error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
