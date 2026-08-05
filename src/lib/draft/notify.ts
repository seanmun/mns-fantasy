import { and, asc, desc, eq, isNotNull, lt } from 'drizzle-orm'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { Resend } from 'resend'
import {
  draftItems,
  draftParticipants,
  draftPicks,
  type Draft,
} from '../db/schema.js'
import { buildOnTheClockEmail } from '../../emails/DraftOnTheClockEmail.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = NeonHttpDatabase<any>

// "in 11h 42m (6:14 AM Thu)" — relative first, since that's what the
// reader actually acts on.
function describeDeadline(deadline: Date | null): string {
  if (!deadline) return 'when the commissioner advances the draft'
  const ms = deadline.getTime() - Date.now()
  if (ms <= 0) return 'any moment now'
  const mins = Math.round(ms / 60000)
  const rel =
    mins < 60
      ? `in ${mins} min`
      : `in ${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`
  const clock = deadline.toLocaleString('en-US', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
  })
  return `${rel} (${clock} ET)`
}

// Email whoever is on the clock. Skipped for autodraft owners (their
// pick happens instantly) and for anyone without an address on file.
// Never throws — a mail failure must not break a draft.
export async function notifyOnTheClock(db: Db, draft: Draft): Promise<boolean> {
  try {
    if (draft.status !== 'active' || !draft.currentOverall) return false
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) return false

    const [pick] = await db
      .select()
      .from(draftPicks)
      .where(and(eq(draftPicks.draftId, draft.id), eq(draftPicks.overall, draft.currentOverall)))
      .limit(1)
    if (!pick || pick.itemId) return false

    const [owner] = await db
      .select()
      .from(draftParticipants)
      .where(eq(draftParticipants.id, pick.participantId))
      .limit(1)
    if (!owner?.email || owner.autodraft) return false

    // The three completed picks before this one, oldest first.
    const previous = await db
      .select({
        round: draftPicks.round,
        pickInRound: draftPicks.pickInRound,
        teamName: draftParticipants.teamName,
        golferName: draftItems.name,
      })
      .from(draftPicks)
      .innerJoin(draftParticipants, eq(draftPicks.participantId, draftParticipants.id))
      .innerJoin(draftItems, eq(draftPicks.itemId, draftItems.id))
      .where(
        and(
          eq(draftPicks.draftId, draft.id),
          isNotNull(draftPicks.itemId),
          lt(draftPicks.overall, draft.currentOverall)
        )
      )
      .orderBy(desc(draftPicks.overall))
      .limit(3)

    // Their next queued golfer, if it's still available.
    let nextInQueue: string | null = null
    const queue = (owner.queue ?? []) as string[]
    if (queue.length > 0) {
      const taken = await db
        .select({ itemId: draftPicks.itemId })
        .from(draftPicks)
        .where(eq(draftPicks.draftId, draft.id))
      const takenIds = new Set(taken.map((t) => t.itemId).filter(Boolean) as string[])
      for (const itemId of queue) {
        if (takenIds.has(itemId)) continue
        const [item] = await db
          .select()
          .from(draftItems)
          .where(eq(draftItems.id, itemId))
          .limit(1)
        if (item?.available) {
          nextInQueue = item.name
          break
        }
      }
    }

    const [{ total }] = await db
      .select({ total: draftPicks.overall })
      .from(draftPicks)
      .where(eq(draftPicks.draftId, draft.id))
      .orderBy(desc(draftPicks.overall))
      .limit(1)

    const { subject, html } = buildOnTheClockEmail({
      teamName: owner.teamName,
      draftName: draft.name,
      round: pick.round,
      pickInRound: pick.pickInRound,
      overall: pick.overall,
      totalPicks: total ?? pick.overall,
      lobbyUrl: draft.lobbyUrl,
      deadlineText: describeDeadline(draft.currentDeadline),
      nextInQueue,
      recentPicks: previous.reverse(),
    })

    const resend = new Resend(apiKey)
    await resend.emails.send({
      // Sender name shows in the inbox; RESEND_FROM_EMAIL is the address
      // only, so it's wrapped here rather than duplicated in the env var.
      from: `MNS Golf <${process.env.RESEND_FROM_EMAIL || 'updates@e.mnsfantasy.com'}>`,
      to: owner.email,
      subject,
      html,
    })
    return true
  } catch (err) {
    console.error('notifyOnTheClock failed:', err)
    return false
  }
}
