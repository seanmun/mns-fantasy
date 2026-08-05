import type { VercelRequest, VercelResponse } from '@vercel/node'
import { eq, lte, and } from 'drizzle-orm'
import { db, applyCors, requireUser } from '../_draft.js'
import { drafts, draftPicks } from '../../src/lib/db/schema.js'
import { makePick, autoPickFor, runAutodraft } from '../../src/lib/draft/engine.js'
import { notifyOnTheClock } from '../../src/lib/draft/notify.js'

// Expires overdue picks and auto-picks the best available item.
//
// Two callers, because a 2-minute pick clock can't wait for an hourly
// cron: the hourly cron is the backstop (and the only thing that matters
// for slow drafts), while any signed-in lobby viewer can trigger it with
// ?draftId= the moment a deadline visibly passes. Safe to call
// repeatedly — makePick refuses a slot that's already filled.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return

  const secret = process.env.CRON_SECRET
  const isCron = !!secret && req.headers.authorization === `Bearer ${secret}`
  const draftId = req.query.draftId as string | undefined
  if (!isCron) {
    const userId = await requireUser(req)
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    if (!draftId) return res.status(400).json({ error: 'draftId is required' })
  }

  try {
    const now = new Date()
    const due = await db
      .select()
      .from(drafts)
      .where(
        draftId
          ? and(
              eq(drafts.id, draftId),
              eq(drafts.status, 'active'),
              lte(drafts.currentDeadline, now)
            )
          : and(eq(drafts.status, 'active'), lte(drafts.currentDeadline, now))
      )

    const report: Array<Record<string, unknown>> = []

    for (const draft of due) {
      try {
        // One expiry per run per draft — the next tick handles the next
        // slot, so a stalled draft can't burn through a whole round in
        // one invocation.
        // Whoever is on the clock: their queue first, then best available.
        const [pick] = await db
          .select()
          .from(draftPicks)
          .where(and(eq(draftPicks.draftId, draft.id), eq(draftPicks.overall, draft.currentOverall!)))
          .limit(1)
        const item = pick
          ? await autoPickFor(db, draft, pick.participantId)
          : null
        if (!item) {
          report.push({ draft: draft.name, skipped: 'no items available' })
          continue
        }
        const result = await makePick(db, draft, { itemId: item.id, isAuto: true })
        if (result.ok && result.draft) {
          const after = await runAutodraft(db, result.draft)
          await notifyOnTheClock(db, after)
        }
        report.push({
          draft: draft.name,
          autoPicked: item.name,
          overall: draft.currentOverall,
          ok: result.ok,
          error: result.error,
          status: result.draft?.status,
        })
      } catch (err) {
        report.push({
          draft: draft.name,
          failed: err instanceof Error ? err.message : String(err),
        })
      }
    }

    return res.status(200).json({ ranAt: now.toISOString(), expired: report.length, report })
  } catch (error) {
    console.error('GET /api/cron/draft-clock error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
