import { pgTable, pgSchema, text, boolean, timestamp, uuid } from 'drizzle-orm/pg-core'

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

// Read-only references to NCAA game tables, which live in the `ncaa`
// Postgres schema (authoritative schema lives in ncaa-mns-fantasy).
const ncaaSchema = pgSchema('ncaa')

export const leagues = ncaaSchema.table('leagues', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  gameSlug: text('game_slug').notNull(),
  createdAt: timestamp('created_at'),
})

export const leagueMembers = ncaaSchema.table('league_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  leagueId: uuid('league_id').notNull(),
  userId: text('user_id').notNull(),
  teamName: text('team_name'),
  joinedAt: timestamp('joined_at'),
})

// Types
export type MarketingSubscriber = typeof marketingSubscribers.$inferSelect
export type NewMarketingSubscriber = typeof marketingSubscribers.$inferInsert
export type MarketingGamePref = typeof marketingGamePrefs.$inferSelect
export type NewMarketingGamePref = typeof marketingGamePrefs.$inferInsert
