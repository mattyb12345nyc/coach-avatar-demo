import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/roleplay-session — log one voice session (both of the two per
// persona are logged; the best becomes the persona score on submit).
// { teamId, personaSlug, sessionNo, percentage, scores?, language?, endedReason? }
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ persisted: false, reason: "not_configured" });
  }
  let b: {
    teamId?: number;
    personaSlug?: string;
    sessionNo?: number;
    percentage?: number;
    scores?: unknown;
    language?: string;
    endedReason?: string;
  };
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (
    typeof b.teamId !== "number" ||
    !b.personaSlug ||
    (b.sessionNo !== 1 && b.sessionNo !== 2) ||
    typeof b.percentage !== "number"
  ) {
    return NextResponse.json(
      { error: "teamId, personaSlug, sessionNo (1|2), percentage required" },
      { status: 400 },
    );
  }
  const pct = Math.max(0, Math.min(100, Math.round(b.percentage)));
  const sb = getServerSupabase();
  const { data, error } = await sb
    .from("role_play_sessions")
    .insert({
      team_id: b.teamId,
      persona_slug: b.personaSlug,
      session_no: b.sessionNo,
      percentage: pct,
      scores: b.scores ?? null,
      language: b.language ?? "en",
      ended_reason: b.endedReason ?? null,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ persisted: true, sessionId: data.id });
}
