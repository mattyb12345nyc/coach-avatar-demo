import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/alerts/[id]/responses — responses to an alert, with team names,
// for the admin console (newest first).
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ responses: [], configured: false });
  }
  const { id } = await params;
  const sb = getServerSupabase();
  const { data, error } = await sb
    .from("alert_responses")
    .select("id, answer, correct, awarded, created_at, teams(name)")
    .eq("alert_id", id)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ responses: data ?? [], configured: true });
}
