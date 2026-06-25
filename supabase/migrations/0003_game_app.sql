-- Coach Pulse SMC Game App — schema rebuild (supersedes the HeyGen event layer).
-- Model: 44 teams, 3 voice personas (best-of-2), 6 manual games, 390-pt total.
-- Isolated + disposable; retired after SMC.

-- Drop the old HeyGen/pulse-alert event layer.
drop view if exists team_leaderboard cascade;
drop view if exists badge_export cascade;
drop table if exists alert_responses cascade;
drop table if exists pulse_alerts cascade;
drop table if exists sessions cascade;
drop table if exists participants cascade;
drop table if exists stations cascade;
drop table if exists teams cascade;

-- Teams 1..44, no names. Label scheme (color + number) stays configurable.
create table teams (
  id      int primary key,
  label   text not null,
  color   text,
  number  int
);

-- Every voice session is logged (both of the two per persona). The best of the
-- two becomes the persona score on submit.
create table role_play_sessions (
  id            uuid primary key default gen_random_uuid(),
  team_id       int not null references teams(id) on delete cascade,
  persona_slug  text not null,
  session_no    int not null check (session_no in (1, 2)),
  percentage    int not null check (percentage between 0 and 100),
  scores        jsonb,
  language      text default 'en',
  ended_reason  text,
  created_at    timestamptz not null default now()
);
create index role_play_sessions_team_idx on role_play_sessions(team_id, persona_slug);

-- The locked-in persona score (best of the two sessions), written on submit.
create table persona_scores (
  team_id          int not null references teams(id) on delete cascade,
  persona_slug     text not null,
  best_percentage  int not null check (best_percentage between 0 and 100),
  updated_at       timestamptz not null default now(),
  primary key (team_id, persona_slug)
);

-- Manual game points entered by station leaders in the admin app (15 max each).
create table game_scores (
  team_id     int not null references teams(id) on delete cascade,
  game_slug   text not null,
  points      int not null check (points between 0 and 15),
  admin       text,
  updated_at  timestamptz not null default now(),
  primary key (team_id, game_slug)
);

-- Live leaderboard: persona bests + game points = team total (max 390).
create or replace view leaderboard as
with p as (
  select team_id, sum(best_percentage) as persona_points, count(*) as personas_done
  from persona_scores group by team_id
),
g as (
  select team_id, coalesce(sum(points), 0) as game_points, count(*) as games_done
  from game_scores group by team_id
)
select
  t.id      as team_id,
  t.label,
  t.color,
  t.number,
  coalesce(p.persona_points, 0) + coalesce(g.game_points, 0) as total,
  coalesce(p.persona_points, 0) as persona_points,
  coalesce(g.game_points, 0)    as game_points,
  coalesce(p.personas_done, 0)  as personas_done,
  coalesce(g.games_done, 0)     as games_done
from teams t
left join p on p.team_id = t.id
left join g on g.team_id = t.id
order by total desc, t.id;

-- Seed 44 teams (Team 1 .. Team 44). Labels/colors are configurable later.
insert into teams (id, label, number)
select n, 'Team ' || n, n from generate_series(1, 44) as n
on conflict (id) do nothing;

-- Closed, in-person event: expose tables to the publishable/anon key (no RLS).
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on
  teams, role_play_sessions, persona_scores, game_scores
  to anon, authenticated;
grant select on leaderboard to anon, authenticated;

alter publication supabase_realtime add table role_play_sessions;
alter publication supabase_realtime add table persona_scores;
alter publication supabase_realtime add table game_scores;
