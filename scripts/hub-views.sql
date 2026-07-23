-- Hub contract views (applied 2026-07-22).
--
-- Every game schema exposes two views with identical shapes so the hub
-- can aggregate leagues across games without knowing native table
-- structures:
--   <game>.hub_leagues  (id text, name, game_slug, format, created_at)
--   <game>.hub_members  (league_id text, user_id, team_name, joined_at)
-- format: 'season' (long-running) | 'event' (single tournament window).
-- "Pool" is UI vocabulary for an event-format league.
--
-- Each game app owns its views; tweak the adapters as games evolve.
-- Adding a game: create both views in its schema, then add the schema to
-- the unions in src/lib/db/hubViews.ts.

create or replace view ncaa.hub_leagues as
  select id::text as id, name, game_slug, 'event'::text as format, created_at
  from ncaa.leagues;

create or replace view ncaa.hub_members as
  select league_id::text as league_id, user_id, team_name, joined_at
  from ncaa.league_members;

create or replace view wnba.hub_leagues as
  select id, name, game_slug, 'season'::text as format, created_at
  from wnba.leagues;

create or replace view wnba.hub_members as
  select t.league_id, o.user_id, t.name as team_name, o.created_at as joined_at
  from wnba.team_owners o
  join wnba.teams t on t.id = o.team_id
  where o.user_id is not null;

create or replace view golf.hub_leagues as
  select id::text as id, name, 'golf-masters-2026'::text as game_slug,
         'event'::text as format, created_at
  from golf.pools;

create or replace view golf.hub_members as
  select pool_id::text as league_id, user_id, null::text as team_name,
         created_at as joined_at
  from golf.pool_entries;
