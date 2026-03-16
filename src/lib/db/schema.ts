import { pgTable, text, boolean, timestamp, uuid, primaryKey } from 'drizzle-orm/pg-core'

// marketing_subscribers — owned by this platform, shared with game apps
export const marketingSubscribers = pgTable('marketing_subscribers', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id'),
  email: text('email').notNull().unique(),
  globalOptIn: boolean('global_opt_in').default(true).notNull(),
  prefNewGames: boolean('pref_new_games').default(true).notNull(),
  prefLeagueInvites: boolean('pref_league_invites').default(true).notNull(),
  prefPlatformNews: boolean('pref_platform_news').default(true).notNull(),
  prefMnsInsights: boolean('pref_mns_insights').default(false).notNull(),
  source: text('source').default('mnsfantasy-landing'),
  unsubscribedAt: timestamp('unsubscribed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// marketing_game_prefs — per-game email preferences
export const marketingGamePrefs = pgTable('marketing_game_prefs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  gameSlug: text('game_slug').notNull(),
  prefMorningUpdate: boolean('pref_morning_update').default(true).notNull(),
  prefEliminationAlerts: boolean('pref_elimination_alerts').default(true).notNull(),
  prefScoreAlerts: boolean('pref_score_alerts').default(true).notNull(),
  prefRosterLockReminders: boolean('pref_roster_lock_reminders').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Read-only references to game app tables (authoritative schema lives in each game app)
export const leagues = pgTable('leagues', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  gameSlug: text('game_slug').notNull(),
  createdAt: timestamp('created_at'),
})

export const leagueMembers = pgTable('league_members', {
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
