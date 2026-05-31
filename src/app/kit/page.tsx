"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { SCENARIOS } from "@/config/scenarios";

type Tile = { label: string; sub: string; path: string };

// Printable Station Kit: a QR per surface so the on-site team can scan to
// launch each station screen, the big-board, and the manager phone page.
// Open /kit, hit print — one card per QR.
export default function KitPage() {
  const [origin, setOrigin] = useState("");
  const [qrs, setQrs] = useState<Record<string, string>>({});

  const tiles: Tile[] = [
    ...SCENARIOS.map((s) => ({
      label: `Station ${s.station} · ${s.heroBadge}`,
      sub: `${s.persona.name} · ${s.moment}`,
      path: `/?station=${s.id}&kiosk=1`,
    })),
    { label: "The Pulse Cup", sub: "Big-screen leaderboard", path: "/leaderboard" },
    { label: "Gala Reveal", sub: "Finale leaderboard animation", path: "/leaderboard?reveal=1" },
    { label: "Pulse Alerts", sub: "Manager phone answer page", path: "/pulse" },
    { label: "Floor Console", sub: "Run the room", path: "/admin" },
  ];

  useEffect(() => {
    const o = window.location.origin;
    setOrigin(o);
    (async () => {
      const out: Record<string, string> = {};
      for (const t of tiles) {
        out[t.path] = await QRCode.toDataURL(`${o}${t.path}`, {
          width: 320,
          margin: 1,
          color: { dark: "#000001", light: "#FFFFFE" },
        });
      }
      setQrs(out);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-coach-cream">
      <header className="bg-coach-black text-coach-cream px-6 py-6 print:hidden">
        <p className="font-pulse-ext text-[10px] tracking-[0.28em] uppercase text-coach-gold">
          Coach Pulse Live · SMC
        </p>
        <h1 className="font-bembo text-[28px] mt-1">Station Kit</h1>
        <p className="font-pulse-body text-[13px] text-coach-cream/70 mt-1">
          Scan to launch each surface. Print this page and place a card at each
          station. ⌘P / Ctrl-P.
        </p>
      </header>

      <main className="px-6 py-8 print:py-0">
        <div className="mx-auto max-w-[1000px] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tiles.map((t) => (
            <div
              key={t.path}
              className="rounded-pulse-card bg-pulse-paper border border-pulse-stroke p-5 flex flex-col items-center text-center gap-3 break-inside-avoid"
            >
              <p className="font-pulse-ext text-[9px] tracking-[0.2em] uppercase font-medium text-coach-gold">
                {t.label}
              </p>
              <p className="font-pulse-body text-[14px] font-medium text-pulse-primary -mt-1">
                {t.sub}
              </p>
              {qrs[t.path] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrs[t.path]} alt={t.label} className="w-[180px] h-[180px]" />
              ) : (
                <div className="w-[180px] h-[180px] bg-pulse-neutral-light rounded-pulse-tile" />
              )}
              <code className="font-pulse-body text-[10px] text-pulse-meta break-all">
                {origin}
                {t.path}
              </code>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
