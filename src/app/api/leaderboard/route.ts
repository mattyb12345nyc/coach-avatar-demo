import { NextResponse } from "next/server";
import { getServerSupabase, isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/leaderboard — ranked teams from the team_leaderboard view.
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ rows: [], configured: false });
  }
  const sb = getServerSupabase();
  const { data, error } = await sb
    .from("team_leaderboard")
    .select("*")
    .order("total", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ rows: data ?? [], configured: true });
}
