import {
  pgTable,
  pgSchema,
  text,
  boolean,
  integer,
  jsonb,
  timestamp,
  uuid,
  index,
  unique,
} from 'drizzle-orm/pg-core'

// Definitions below mirror the LIVE shared tables exactly (see ncaa app,
// which created them). Do not redeclare with different columns/defaults —
// the live DB is the source of truth.

// marketing_subscribers — shared across the platform
export const marketingSubscribers = pgTable('marketing_subscribers', {
  id: uuid('id').defaultRandom().primaryKey(),
  // Nullable: landing-page signups are anonymous; unique still holds for
  // signed-in users (PG treats NULLs as distinct).
  userId: text('user_id').unique(),
  email: text('email').notNull(),
  globalOptIn: boolean('global_opt_in').default(false).notNull(),
  prefNewGames: boolean('pref_new_games').default(true).notNull(),
  prefLeagueInvites: boolean('pref_league_invites').default(true).notNull(),
  prefPlatformNews: boolean('pref_platform_news').default(true).notNull(),
  prefMnsInsights: boolean('pref_mns_insights').default(false).notNull(),
  source: text('source').notNull(),
  optedInAt: timestamp('opted_in_at'),
  unsubscribedAt: timestamp('unsubscribed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// marketing_game_prefs — per-game email preferences
export const marketingGamePrefs = pgTable('marketing_game_prefs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  gameSlug: text('game_slug').notNull(),
  prefMorningUpdates: boolean('pref_morning_updates').default(true).notNull(),
  prefEliminationAlerts: boolean('pref_elimination_alerts').default(true).notNull(),
  prefScoreAlerts: boolean('pref_score_alerts').default(true).notNull(),
  prefRosterReminders: boolean('pref_roster_reminders').default(true).notNull(),
  optedOutOfGame: boolean('opted_out_of_game').default(false).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Cross-game league reads go through the hub contract views
// (<game>.hub_leagues / <game>.hub_members) — see src/lib/db/hubViews.ts
// and scripts/hub-views.sql. No direct game-table references here.

// ============================================================================
// DRAFT ENGINE — a platform service used by every game (golf, wnba, ...).
// The engine knows nothing about sports: a game pushes an item pool and
// reads back picks. Game-specific rules (fields, caps, eligibility) stay
// in the game app. See project-shared-engines in memory.
// ============================================================================

export const draftSchema = pgSchema('draft')

export type DraftMode = 'draft' | 'pickem'
export type DraftOrderType = 'snake' | 'linear'
export type DraftStatus = 'setup' | 'active' | 'paused' | 'complete' | 'cancelled'

export const drafts = draftSchema.table(
  'drafts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Which game and which of its containers this draft belongs to.
    gameSlug: text('game_slug').notNull(),
    scopeType: text('scope_type').notNull(), // 'pool' | 'league'
    scopeId: text('scope_id').notNull(),
    name: text('name').notNull(),
    // Where the game hosts its lobby — used by on-the-clock emails.
    lobbyUrl: text('lobby_url').notNull(),
    mode: text('mode').$type<DraftMode>().notNull().default('draft'),
    orderType: text('order_type').$type<DraftOrderType>().notNull().default('snake'),
    rounds: integer('rounds').notNull(),
    // null = slow draft (uses slowPickHours instead of a live clock).
    pickSeconds: integer('pick_seconds'),
    slowPickHours: integer('slow_pick_hours').notNull().default(12),
    status: text('status').$type<DraftStatus>().notNull().default('setup'),
    // 1-based pointer into picks.overall; null until the draft starts.
    currentOverall: integer('current_overall'),
    currentDeadline: timestamp('current_deadline'),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    createdBy: text('created_by').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('draft_drafts_scope_idx').on(t.gameSlug, t.scopeType, t.scopeId),
    index('draft_drafts_status_idx').on(t.status),
  ]
)

export const draftParticipants = draftSchema.table(
  'participants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    draftId: uuid('draft_id')
      .notNull()
      .references(() => drafts.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    email: text('email'),
    teamName: text('team_name').notNull(),
    // 1-based position in round one; snake order derives from this.
    slot: integer('slot').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    unique('draft_participants_draft_slot_key').on(t.draftId, t.slot),
    index('draft_participants_draft_idx').on(t.draftId),
  ]
)

export const draftItems = draftSchema.table(
  'items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    draftId: uuid('draft_id')
      .notNull()
      .references(() => drafts.id, { onDelete: 'cascade' }),
    // The game's own id for this player/golfer — opaque to the engine.
    ref: text('ref').notNull(),
    name: text('name').notNull(),
    // Whatever the game wants shown on the board (ranking, tee time,
    // salary, position...). The engine never interprets it.
    meta: jsonb('meta'),
    // Lower = better; drives auto-pick order.
    rankHint: integer('rank_hint'),
    // Games flip this off for withdrawals so nobody can draft them.
    available: boolean('available').notNull().default(true),
  },
  (t) => [
    unique('draft_items_draft_ref_key').on(t.draftId, t.ref),
    index('draft_items_draft_idx').on(t.draftId),
  ]
)

// Every pick slot is created up front when the draft starts, so "whose
// turn" is a lookup and a future pick trade is just reassigning
// participantId on a slot.
export const draftPicks = draftSchema.table(
  'picks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    draftId: uuid('draft_id')
      .notNull()
      .references(() => drafts.id, { onDelete: 'cascade' }),
    overall: integer('overall').notNull(),
    round: integer('round').notNull(),
    pickInRound: integer('pick_in_round').notNull(),
    participantId: uuid('participant_id')
      .notNull()
      .references(() => draftParticipants.id, { onDelete: 'cascade' }),
    itemId: uuid('item_id').references(() => draftItems.id),
    madeAt: timestamp('made_at'),
    isAuto: boolean('is_auto').notNull().default(false),
  },
  (t) => [
    unique('draft_picks_draft_overall_key').on(t.draftId, t.overall),
    index('draft_picks_draft_idx').on(t.draftId),
  ]
)

export type Draft = typeof drafts.$inferSelect
export type DraftParticipant = typeof draftParticipants.$inferSelect
export type DraftItem = typeof draftItems.$inferSelect
export type DraftPick = typeof draftPicks.$inferSelect

// Types
export type MarketingSubscriber = typeof marketingSubscribers.$inferSelect
export type NewMarketingSubscriber = typeof marketingSubscribers.$inferInsert
export type MarketingGamePref = typeof marketingGamePrefs.$inferSelect
export type NewMarketingGamePref = typeof marketingGamePrefs.$inferInsert
