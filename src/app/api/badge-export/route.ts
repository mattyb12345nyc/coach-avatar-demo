import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { isAdminAuthorized } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// GET /api/badge-export — the post-event migration artifact, as CSV. Each row
// is a manager's corporate identity + a badge their team earned, ready to hand
// to Tapestry IT for import into the main Coach Pulse app.
export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }
  const sb = getServerSupabase();
  const { data, error } = await sb.from("badge_export").select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const cols = [
    "email",
    "employee_id",
    "participant_name",
    "team_name",
    "badge",
    "hero_skill",
    "best_hero_pct",
    "earned_at",
  ];
  const header = cols.join(",");
  const rows = (data ?? []).map((r) =>
    cols.map((c) => csvCell((r as Record<string, unknown>)[c])).join(","),
  );
  const csv = [header, ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="coach-pulse-badges.csv"',
    },
  });
}
