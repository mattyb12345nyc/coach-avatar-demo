import type { Metadata } from "next";
import { Leaderboard } from "@/components/Leaderboard";

export const metadata: Metadata = {
  title: "Coach Pulse — Live Leaderboard",
};

export default function LeaderboardPage() {
  return <Leaderboard />;
}
