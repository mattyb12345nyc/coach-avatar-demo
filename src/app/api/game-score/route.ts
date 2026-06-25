import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { GAMES } from "@/config/event";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/game-score { teamId, gameSlug, points } [admin]
// Station leaders enter manual game points (0–15). Upsert so corrections work.
export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }
  let b: { teamId?: number; gameSlug?: string; points?: number };
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const game = GAMES.find((g) => g.slug === b.gameSlug);
  if (typeof b.teamId !== "number" || !game || typeof b.points !== "number") {
    return NextResponse.json({ error: "teamId, valid gameSlug, points required" }, { status: 400 });
  }
  const points = Math.max(0, Math.min(game.maxPoints, Math.round(b.points)));

  const sb = getServerSupabase();
  const { error } = await sb
    .from("game_scores")
    .upsert(
      { team_id: b.teamId, game_slug: game.slug, points, updated_at: new Date().toISOString() },
      { onConflict: "team_id,game_slug" },
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ saved: true, points });
}

// GET /api/game-score?teamId= — current game points for a team (admin view).
export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.json({ scores: [] });
  const teamId = Number(new URL(request.url).searchParams.get("teamId"));
  if (!teamId) return NextResponse.json({ scores: [] });
  const sb = getServerSupabase();
  const { data, error } = await sb
    .from("game_scores")
    .select("game_slug, points")
    .eq("team_id", teamId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ scores: data ?? [] });
}
