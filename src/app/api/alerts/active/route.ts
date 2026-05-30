import { NextResponse } from "next/server";
import { getServerSupabase, isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/alerts/active — the currently live Pulse Alert (for the /pulse
// answer page and the leaderboard banner). Answer text is never exposed.
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ alert: null, configured: false });
  }
  const sb = getServerSupabase();
  const { data, error } = await sb
    .from("pulse_alerts")
    .select("id, prompt, bonus_points, sent_at")
    .eq("active", true)
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ alert: data ?? null, configured: true });
}
