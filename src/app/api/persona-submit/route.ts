import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/persona-submit { teamId, personaSlug }
// Locks in the persona score as the best of the team's two sessions and
// writes it to the leaderboard. Idempotent (upsert).
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ submitted: false, reason: "not_configured" });
  }
  let b: { teamId?: number; personaSlug?: string; bestPercentage?: number };
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof b.teamId !== "number" || !b.personaSlug) {
    return NextResponse.json({ error: "teamId and personaSlug required" }, { status: 400 });
  }

  const sb = getServerSupabase();

  // Best of the logged sessions (authoritative). Fall back to a client-passed
  // value only if no rows are found (e.g. logging blipped).
  const { data: rows } = await sb
    .from("role_play_sessions")
    .select("percentage")
    .eq("team_id", b.teamId)
    .eq("persona_slug", b.personaSlug);
  // Higher of the takes — combine the server's logged sessions with the
  // client's known best so a lagging session insert never loses a good take.
  const serverBest = (rows ?? []).reduce((m, r) => Math.max(m, r.percentage ?? 0), 0);
  const clientBest =
    typeof b.bestPercentage === "number"
      ? Math.max(0, Math.min(100, Math.round(b.bestPercentage)))
      : 0;
  const best = Math.max(serverBest, clientBest);

  const { error } = await sb
    .from("persona_scores")
    .upsert(
      { team_id: b.teamId, persona_slug: b.personaSlug, best_percentage: best, updated_at: new Date().toISOString() },
      { onConflict: "team_id,persona_slug" },
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ submitted: true, best });
}
