import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/team-summary — store a team's completed session summary (3 persona
// bests + average + aggregated feedback) for later use.
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ stored: false, reason: "not_configured" });
  }
  let b: { teamId?: number; average?: number; payload?: unknown };
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof b.teamId !== "number" || typeof b.average !== "number" || !b.payload) {
    return NextResponse.json({ error: "teamId, average, payload required" }, { status: 400 });
  }
  const sb = getServerSupabase();
  const { data, error } = await sb
    .from("team_summaries")
    .insert({ team_id: b.teamId, average: Math.round(b.average), payload: b.payload })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ stored: true, id: data.id });
}
