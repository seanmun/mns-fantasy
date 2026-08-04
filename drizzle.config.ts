import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // ONLY the draft schema is managed by push. Never add 'public' here:
  // tablesFilter does not protect sequences, so a push scoped to public
  // tried to drop leaderboard_id_seq (an external app's table) on
  // 2026-08-04. The marketing_* tables in public are stable and are
  // changed by hand.
  schemaFilter: ['draft'],
})
