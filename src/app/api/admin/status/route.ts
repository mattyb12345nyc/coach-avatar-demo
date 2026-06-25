import { NextResponse } from "next/server";
import { adminPasscodeRequired } from "@/lib/adminAuth";
import { isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/status — what the admin page needs to render.
export async function GET() {
  return NextResponse.json({
    passcodeRequired: adminPasscodeRequired(),
    supabase: isSupabaseConfigured(),
  });
}
