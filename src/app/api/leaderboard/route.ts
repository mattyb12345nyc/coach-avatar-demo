import { NextResponse } from "next/server";
import { getServerSupabase, isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/leaderboard — ranked team totals (persona bests + game points).
// Only teams that have scored anything are returned, to keep the board clean.
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ rows: [], configured: false });
  }
  const sb = getServerSupabase();
  const { data, error } = await sb
    .from("leaderboard")
    .select("*")
    .order("total", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = (data ?? []).filter(
    (r) => (r.personas_done ?? 0) > 0 || (r.games_done ?? 0) > 0,
  );
  return NextResponse.json({ rows, configured: true });
}
