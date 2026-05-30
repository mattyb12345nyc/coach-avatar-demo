-- Coach Pulse — SMC activation event layer
-- ------------------------------------------------------------------
-- The avatar demo already produces a 6-category score per role-play.
-- This schema persists those runs against a TEAM and a STATION, then
-- rolls them up into a live leaderboard. 6 stations, 10–12 teams.
--
-- Apply with the Supabase CLI (supabase db push) or paste into the SQL
-- editor. RLS is intentionally permissive for the event window — this is
-- a closed, in-person activation, not a public app. Lock down before any
-- reuse outside the event.

-- Regional teams competing (10–12). Deck slide 5: Northeast x2, Southeast x2,
-- West x2, Central x2, Canada x2, Europe DTC, MEAI. Identity is lightweight:
-- a fun team name + region.
create table if not exists teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  region      text,
  created_at  timestamptz not null default now()
);

-- Individual managers, tied to a team. Registration is a QR deep-link +
-- dropdown — no passwords. `device_id` is the cookie we set per phone/tablet.
-- Deck team rule: each participant may be used once across the 6 scenarios.
--
-- `email` / `employee_id` are the CORPORATE SSO identity — the ONLY join key
-- that lets event badges migrate back into the main Coach Pulse app later.
-- Capture at least one at registration; without it, post-event reconciliation
-- is impossible. This is the one irreversible decision of the event.
create table if not exists participants (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references teams(id) on delete cascade,
  name        text not null,
  region      text,
  email       text,        -- corporate SSO email (migration join key)
  employee_id text,        -- corporate employee id (migration join key)
  device_id   text,
  created_at  timestamptz not null default now()
);

-- The 6 physical stations. Mirrors src/config/scenarios.ts so the app and
-- DB agree on scenario ids and hero skills.
create table if not exists stations (
  id           text primary key,            -- e.g. 'culture'
  station_no   int  not null,               -- 1–6
  label        text not null,
  hero_skill   text not null,               -- one of the 6 rubric category keys
  avatar_id    text
);

-- One completed avatar role-play. `scores` is the verbatim /api/score
-- object; the generated columns pull out the numbers the leaderboard needs
-- so aggregation stays in SQL.
create table if not exists sessions (
  id              uuid primary key default gen_random_uuid(),
  team_id         uuid not null references teams(id) on delete cascade,
  participant_id  uuid references participants(id) on delete set null,
  station_id      text not null references stations(id),
  hero_skill      text not null,
  scores          jsonb not null,
  scenario_total  int  not null,            -- overall_score (0–100)
  hero_component  int  not null,            -- raw value of the hero category
  hero_pct        real not null,            -- hero_component / category max
  earned_badge    boolean not null default false,
  duration_seconds int,
  created_at      timestamptz not null default now()
);

create index if not exists sessions_team_idx    on sessions(team_id);
create index if not exists sessions_station_idx on sessions(station_id);

-- Pulse Alerts — surprise SMS prompts pushed during the event. Teams answer
-- in Coach Pulse; fastest-correct earns bonus points.
create table if not exists pulse_alerts (
  id            uuid primary key default gen_random_uuid(),
  prompt        text not null,
  answer        text,                       -- expected answer (nullable for freeform)
  bonus_points  int not null default 10,
  sent_at       timestamptz,
  active        boolean not null default false,
  created_at    timestamptz not null default now()
);

create table if not exists alert_responses (
  id          uuid primary key default gen_random_uuid(),
  alert_id    uuid not null references pulse_alerts(id) on delete cascade,
  team_id     uuid not null references teams(id) on delete cascade,
  answer      text,
  correct     boolean not null default false,
  awarded     int not null default 0,       -- bonus points actually granted
  created_at  timestamptz not null default now(),
  unique (alert_id, team_id)                 -- one shot per team per alert
);

-- Live leaderboard. Joon's formula:
--   total = Σ(scenario totals) + Σ(hero components) + pulse bonus + badge bonus
-- Badge bonus = 25 per station where the team cleared the hero threshold.
create or replace view team_leaderboard as
with sess as (
  select
    team_id,
    sum(scenario_total)                              as scenario_points,
    sum(hero_component)                              as hero_points,
    count(*) filter (where earned_badge) * 25        as badge_bonus,
    count(*) filter (where earned_badge)             as badges_earned,
    count(*)                                         as stations_completed
  from sessions
  group by team_id
),
pulse as (
  select team_id, coalesce(sum(awarded), 0) as pulse_bonus
  from alert_responses
  group by team_id
)
select
  t.id   as team_id,
  t.name,
  t.region,
  coalesce(s.scenario_points, 0)
    + coalesce(s.hero_points, 0)
    + coalesce(s.badge_bonus, 0)
    + coalesce(p.pulse_bonus, 0)            as total,
  coalesce(s.scenario_points, 0)            as scenario_points,
  coalesce(s.hero_points, 0)                as hero_points,
  coalesce(s.badge_bonus, 0)                as badge_bonus,
  coalesce(p.pulse_bonus, 0)                as pulse_bonus,
  coalesce(s.badges_earned, 0)              as badges_earned,
  coalesce(s.stations_completed, 0)         as stations_completed
from teams t
left join sess  s on s.team_id = t.id
left join pulse p on p.team_id = t.id
order by total desc;

-- Post-event migration seam. Badges are earned at the TEAM level; the main
-- Coach Pulse app is per-associate. This view fans each team-earned badge out
-- to every manager on that team, keyed on corporate SSO identity. Export it
-- as CSV after the event and hand to Tapestry IT to import on their schedule —
-- no live integration, no dependency on the migration timeline.
create or replace view badge_export as
select
  p.email,
  p.employee_id,
  p.name              as participant_name,
  t.name              as team_name,
  st.label            as badge,
  st.hero_skill,
  max(s.hero_pct)     as best_hero_pct,
  max(s.created_at)   as earned_at
from sessions s
join teams t        on t.id  = s.team_id
join stations st    on st.id = s.station_id
join participants p on p.team_id = t.id
where s.earned_badge
group by p.email, p.employee_id, p.name, t.name, st.label, st.hero_skill;

-- Seed the 6 stations to match src/config/scenarios.ts (deck slide 6).
-- 'explorer' (Theo) is mapped to exploringTogether — see scenarios.ts note.
insert into stations (id, station_no, label, hero_skill) values
  ('culture',  1, 'Culture Champ',          'culturalRelevance'),
  ('moment',   2, 'Moment Maker',           'understandingTheMoment'),
  ('empathy',  3, 'Empathy Expert',         'emotionalConnection'),
  ('closer',   4, 'Closer',                 'guidingTheDecision'),
  ('explorer', 5, 'Acquisition Accelerator','exploringTogether'),
  ('brand',    6, 'Brand Fluency',          'productKnowledge')
on conflict (id) do nothing;

-- Closed, in-person event: expose tables to the publishable/anon key directly
-- (no RLS). Lock this down before any reuse outside the activation window.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on
  teams, participants, stations, sessions, pulse_alerts, alert_responses
  to anon, authenticated;
grant select on team_leaderboard, badge_export to anon, authenticated;

-- Realtime for the live leaderboard (sessions + pulse responses).
alter publication supabase_realtime add table sessions;
alter publication supabase_realtime add table alert_responses;
