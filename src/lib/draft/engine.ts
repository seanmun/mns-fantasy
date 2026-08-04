import { and, asc, eq, isNull } from 'drizzle-orm'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import {
  drafts,
  draftItems,
  draftParticipants,
  draftPicks,
  type Draft,
} from '../db/schema.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = NeonHttpDatabase<any>

export function slotForPick(
  overall: number,
  participantCount: number,
  orderType: 'snake' | 'linear'
): { round: number; pickInRound: number; slot: number } {
  const zero = overall - 1
  const round = Math.floor(zero / participantCount) + 1
  const indexInRound = zero % participantCount
  const reversed = orderType === 'snake' && round % 2 === 0
  const slot = (reversed ? participantCount - 1 - indexInRound : indexInRound) + 1
  return { round, pickInRound: indexInRound + 1, slot }
}

export function deadlineFor(draft: Draft, from: Date): Date | null {
  if (draft.pickSeconds) return new Date(from.getTime() + draft.pickSeconds * 1000)
  if (draft.slowPickHours) return new Date(from.getTime() + draft.slowPickHours * 3600 * 1000)
  return null
}

// Create every pick slot up front so "whose turn" is a lookup and a
// future pick trade is a participant reassignment on an existing row.
export async function startDraft(db: Db, draft: Draft): Promise<Draft> {
  const participants = await db
    .select()
    .from(draftParticipants)
    .where(eq(draftParticipants.draftId, draft.id))
    .orderBy(asc(draftParticipants.slot))
  if (participants.length < 2) throw new Error('Need at least 2 participants')

  const bySlot = new Map(participants.map((p) => [p.slot, p]))
  const total = draft.rounds * participants.length
  const rows = []
  for (let overall = 1; overall <= total; overall++) {
    const { round, pickInRound, slot } = slotForPick(
      overall,
      participants.length,
      draft.orderType
    )
    const participant = bySlot.get(slot)
    if (!participant) throw new Error(`No participant in slot ${slot}`)
    rows.push({
      draftId: draft.id,
      overall,
      round,
      pickInRound,
      participantId: participant.id,
    })
  }
  await db.insert(draftPicks).values(rows)

  const now = new Date()
  const [updated] = await db
    .update(drafts)
    .set({
      status: 'active',
      currentOverall: 1,
      currentDeadline: deadlineFor(draft, now),
      startedAt: now,
      updatedAt: now,
    })
    .where(eq(drafts.id, draft.id))
    .returning()
  return updated
}

export interface MakePickResult {
  ok: boolean
  error?: string
  draft?: Draft
}

// Records a pick for the CURRENT slot and advances the draft. Set
// isAuto for clock-driven picks.
export async function makePick(
  db: Db,
  draft: Draft,
  opts: { itemId: string; byUserId?: string; isAuto?: boolean }
): Promise<MakePickResult> {
  if (draft.status !== 'active') return { ok: false, error: 'Draft is not active' }
  if (!draft.currentOverall) return { ok: false, error: 'Draft has no current pick' }

  const [pick] = await db
    .select()
    .from(draftPicks)
    .where(and(eq(draftPicks.draftId, draft.id), eq(draftPicks.overall, draft.currentOverall)))
    .limit(1)
  if (!pick) return { ok: false, error: 'Current pick not found' }
  if (pick.itemId) return { ok: false, error: 'Pick already made' }

  if (opts.byUserId) {
    const [participant] = await db
      .select()
      .from(draftParticipants)
      .where(eq(draftParticipants.id, pick.participantId))
      .limit(1)
    if (!participant || participant.userId !== opts.byUserId) {
      return { ok: false, error: "It's not your turn" }
    }
  }

  const [item] = await db
    .select()
    .from(draftItems)
    .where(and(eq(draftItems.id, opts.itemId), eq(draftItems.draftId, draft.id)))
    .limit(1)
  if (!item) return { ok: false, error: 'Item not in this draft' }
  if (!item.available) return { ok: false, error: 'Item is unavailable' }

  // In draft mode a player can only go once; pick'em allows duplicates.
  if (draft.mode === 'draft') {
    const [taken] = await db
      .select({ id: draftPicks.id })
      .from(draftPicks)
      .where(and(eq(draftPicks.draftId, draft.id), eq(draftPicks.itemId, item.id)))
      .limit(1)
    if (taken) return { ok: false, error: 'Already drafted' }
  }

  const now = new Date()
  await db
    .update(draftPicks)
    .set({ itemId: item.id, madeAt: now, isAuto: !!opts.isAuto })
    .where(eq(draftPicks.id, pick.id))

  return { ok: true, draft: await advance(db, draft, now) }
}

// Move the pointer to the next unmade slot, or complete the draft.
async function advance(db: Db, draft: Draft, now: Date): Promise<Draft> {
  const [next] = await db
    .select()
    .from(draftPicks)
    .where(and(eq(draftPicks.draftId, draft.id), isNull(draftPicks.itemId)))
    .orderBy(asc(draftPicks.overall))
    .limit(1)

  const [updated] = await db
    .update(drafts)
    .set(
      next
        ? { currentOverall: next.overall, currentDeadline: deadlineFor(draft, now), updatedAt: now }
        : {
            status: 'complete',
            currentOverall: null,
            currentDeadline: null,
            completedAt: now,
            updatedAt: now,
          }
    )
    .where(eq(drafts.id, draft.id))
    .returning()
  return updated
}

// Best available by the game's rankHint; nulls last, then name.
export async function bestAvailable(db: Db, draft: Draft) {
  const taken = await db
    .select({ itemId: draftPicks.itemId })
    .from(draftPicks)
    .where(eq(draftPicks.draftId, draft.id))
  const takenIds = new Set(taken.map((t) => t.itemId).filter(Boolean) as string[])

  const items = await db
    .select()
    .from(draftItems)
    .where(and(eq(draftItems.draftId, draft.id), eq(draftItems.available, true)))
  const pool = draft.mode === 'draft' ? items.filter((i) => !takenIds.has(i.id)) : items
  if (pool.length === 0) return null
  pool.sort((a, b) => {
    const ra = a.rankHint ?? Number.MAX_SAFE_INTEGER
    const rb = b.rankHint ?? Number.MAX_SAFE_INTEGER
    return ra !== rb ? ra - rb : a.name.localeCompare(b.name)
  })
  return pool[0]
}
