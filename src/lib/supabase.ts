import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Event Supabase project (coach-pulse-live) — standalone, NOT coach-connect's
// DB. RLS is permissive for the closed event window, so the publishable/anon
// key is enough for both server routes and client realtime.

const URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

export function isSupabaseConfigured(): boolean {
  return Boolean(URL && ANON_KEY);
}

// Server-side client for API routes.
export function getServerSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase not configured: set SUPABASE_URL + SUPABASE_ANON_KEY",
    );
  }
  return createClient(URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Browser singleton for the live leaderboard's realtime subscription.
let browserClient: SupabaseClient | null = null;
export function getBrowserSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!browserClient) {
    browserClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return browserClient;
}
