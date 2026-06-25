import { NextResponse } from "next/server";
import { getServerSupabase, isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/teams — the team list for the room + admin dropdowns.
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ teams: [], configured: false });
  }
  const sb = getServerSupabase();
  const { data, error } = await sb
    .from("teams")
    .select("id, label, color, number")
    .order("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ teams: data ?? [], configured: true });
}
