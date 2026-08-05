import type { VercelRequest, VercelResponse } from '@vercel/node'
import { eq } from 'drizzle-orm'
import { db, applyCors, requireUser, isTrustedService } from '../../_draft.js'
import { drafts } from '../../../src/lib/db/schema.js'
import { makePick, runAutodraft } from '../../../src/lib/draft/engine.js'
import { notifyOnTheClock } from '../../../src/lib/draft/notify.js'

// POST /api/draft/:id/pick { itemId }
// The signed-in owner picks for their own slot; a trusted service may
// pick on anyone's behalf (commissioner override).
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const id = req.query.id as string
  const itemId = req.body?.itemId as string | undefined
  if (!id || !itemId) return res.status(400).json({ error: 'Draft id and itemId are required' })

  const service = isTrustedService(req)
  const userId = service ? null : await requireUser(req)
  if (!service && !userId) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const [draft] = await db.select().from(drafts).where(eq(drafts.id, id)).limit(1)
    if (!draft) return res.status(404).json({ error: 'Draft not found' })

    const result = await makePick(db, draft, {
      itemId,
      byUserId: userId ?? undefined,
    })
    if (!result.ok) return res.status(409).json({ error: result.error })

    // Roll straight through anyone with autodraft switched on.
    const after = result.draft ? await runAutodraft(db, result.draft) : result.draft
    // Tell whoever is up now — after autodraft has rolled through.
    if (after) await notifyOnTheClock(db, after)
    return res.status(200).json({ draft: after })
  } catch (error) {
    console.error('POST /api/draft/[id]/pick error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
