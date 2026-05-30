import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { getScenario } from "@/config/scenarios";
import {
  MAX_PER_CATEGORY,
  EVENT_CONFIG,
} from "@/lib/eventScoring";
import type { ScoringScores } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/sessions — persist one completed avatar role-play against a team
// + station. The hero-skill fields are derived here so the DB and the
// leaderboard view stay consistent with eventScoring.ts.
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    // Don't break the experience if persistence is down — the participant
    // still sees their score; we just can't record it.
    return NextResponse.json({ persisted: false, reason: "not_configured" });
  }

  let body: {
    teamId?: string;
    participantId?: string;
    stationId?: string;
    scores?: ScoringScores;
    overallScore?: number;
    durationSeconds?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { teamId, participantId, stationId, scores, overallScore } = body;
  const scenario = getScenario(stationId);
  if (!teamId || !scenario || !scores) {
    return NextResponse.json(
      { error: "teamId, valid stationId, and scores required" },
      { status: 400 },
    );
  }

  const heroSkill = scenario.heroSkill;
  const heroComponent = scores[heroSkill] ?? 0;
  const heroMax = MAX_PER_CATEGORY[heroSkill];
  const heroPct = heroMax > 0 ? heroComponent / heroMax : 0;
  const scenarioTotal =
    typeof overallScore === "number"
      ? Math.round(overallScore)
      : Object.values(scores).reduce((a, b) => a + (b || 0), 0);

  const sb = getServerSupabase();
  const { data, error } = await sb
    .from("sessions")
    .insert({
      team_id: teamId,
      participant_id: participantId || null,
      station_id: scenario.id,
      hero_skill: heroSkill,
      scores,
      scenario_total: scenarioTotal,
      hero_component: heroComponent,
      hero_pct: heroPct,
      earned_badge: heroPct >= EVENT_CONFIG.badgeThreshold,
      duration_seconds: body.durationSeconds ?? null,
    })
    .select("id, earned_badge")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    persisted: true,
    sessionId: data.id,
    earnedBadge: data.earned_badge,
    badge: data.earned_badge ? scenario.heroBadge : null,
  });
}
