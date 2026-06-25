-- A captured record of each team's completed role-play session: the 3 persona
-- bests, the average, and the aggregated feedback/insights — stored for later.
create table if not exists team_summaries (
  id          uuid primary key default gen_random_uuid(),
  team_id     int references teams(id) on delete cascade,
  average     int not null,
  payload     jsonb not null, -- { teamName, personas:[{slug,name,score,stars,summary,highlights,recommendedNext}], strengths[], growthAreas[] }
  created_at  timestamptz not null default now()
);
create index if not exists team_summaries_team_idx on team_summaries(team_id);

grant select, insert, update, delete on team_summaries to anon, authenticated;
