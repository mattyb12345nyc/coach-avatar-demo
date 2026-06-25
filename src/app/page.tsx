import type { Metadata } from "next";
import { EntryPage } from "@/components/EntryPage";

export const metadata: Metadata = {
  title: "Coach Pulse Live — SMC",
};

// Password-gated staff entry page + directory of every page in the game site.
export default function Home() {
  return <EntryPage />;
}
