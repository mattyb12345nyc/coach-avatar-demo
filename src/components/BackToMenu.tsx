import Link from "next/link";
import { ChevronLeft } from "lucide-react";

// Light "back to the main menu" nav shown in every section. Links to the
// gated entry directory (no re-prompt once you've entered the password).
export function BackToMenu({ tone = "dark" }: { tone?: "dark" | "light" }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-1 font-pulse-ext text-[10px] tracking-[0.16em] uppercase transition-colors ${
        tone === "dark"
          ? "text-coach-cream/65 hover:text-coach-cream"
          : "text-pulse-meta hover:text-coach-black"
      }`}
    >
      <ChevronLeft size={13} /> Menu
    </Link>
  );
}
