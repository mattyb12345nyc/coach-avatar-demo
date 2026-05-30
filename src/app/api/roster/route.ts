import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/roster — teams with their participants, for the station picker.
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ teams: [], configured: false });
  }
  const sb = getServerSupabase();
  const { data: teams, error } = await sb
    .from("teams")
    .select("id, name, region, participants(id, name)")
    .order("name");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ teams: teams ?? [], configured: true });
}

// POST /api/roster — create a team or a participant on the fly at a station.
//   { action: "team", name, region }
//   { action: "participant", teamId, name, email?, employeeId? }
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 },
    );
  }
  let body: {
    action?: string;
    name?: string;
    region?: string;
    teamId?: string;
    email?: string;
    employeeId?: string;
    phone?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sb = getServerSupabase();

  if (body.action === "team") {
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Team name required" }, { status: 400 });
    }
    const { data, error } = await sb
      .from("teams")
      .insert({ name: body.name.trim(), region: body.region?.trim() || null })
      .select("id, name, region")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ team: data });
  }

  if (body.action === "participant") {
    if (!body.teamId || !body.name?.trim()) {
      return NextResponse.json(
        { error: "teamId and name required" },
        { status: 400 },
      );
    }
    const { data, error } = await sb
      .from("participants")
      .insert({
        team_id: body.teamId,
        name: body.name.trim(),
        email: body.email?.trim() || null,
        employee_id: body.employeeId?.trim() || null,
        phone: body.phone?.trim() || null,
      })
      .select("id, name")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ participant: data });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

// DELETE /api/roster?team=<id>  or  ?participant=<id>
export async function DELETE(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }
  const url = new URL(request.url);
  const teamId = url.searchParams.get("team");
  const participantId = url.searchParams.get("participant");
  const sb = getServerSupabase();
  if (teamId) {
    const { error } = await sb.from("teams").delete().eq("id", teamId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ deleted: "team" });
  }
  if (participantId) {
    const { error } = await sb
      .from("participants")
      .delete()
      .eq("id", participantId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ deleted: "participant" });
  }
  return NextResponse.json({ error: "team or participant id required" }, { status: 400 });
}
