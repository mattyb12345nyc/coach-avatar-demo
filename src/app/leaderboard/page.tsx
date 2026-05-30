import type { Metadata } from "next";
import { Leaderboard } from "@/components/Leaderboard";

export const metadata: Metadata = {
  title: "The Pulse Cup — Live Leaderboard",
};

// /leaderboard for the live floor board; /leaderboard?reveal=1 for the gala
// reveal animation.
export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ reveal?: string }>;
}) {
  const { reveal } = await searchParams;
  return <Leaderboard reveal={reveal === "1"} />;
}
