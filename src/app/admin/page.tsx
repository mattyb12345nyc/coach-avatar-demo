"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2, Zap, Download, Send, ChevronDown } from "lucide-react";

const PASS_KEY = "coachpulse.admin";

type Status = { passcodeRequired: boolean; supabase: boolean; twilio: boolean };
type Team = {
  id: string;
  name: string;
  region: string | null;
  participants: { id: string; name: string }[];
};
type Alert = {
  id: string;
  prompt: string;
  answer: string | null;
  bonus_points: number;
  active: boolean;
  sent_at: string | null;
};
type Row = {
  team_id: string;
  name: string;
  region: string | null;
  total: number;
  badges_earned: number;
  stations_completed: number;
};

export default function AdminPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [passcode, setPasscode] = useState("");
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<"roster" | "alerts" | "standings">("alerts");

  useEffect(() => {
    fetch("/api/admin/status")
      .then((r) => r.json())
      .then((s: Status) => {
        setStatus(s);
        const stored = window.localStorage.getItem(PASS_KEY) || "";
        setPasscode(stored);
        setAuthed(!s.passcodeRequired || Boolean(stored));
      });
  }, []);

  function savePasscode() {
    window.localStorage.setItem(PASS_KEY, passcode);
    setAuthed(true);
  }

  if (!status) {
    return <Shell><p className="font-pulse-body text-pulse-neutral-1">Loading…</p></Shell>;
  }

  if (!authed) {
    return (
      <Shell>
        <div className="mx-auto max-w-[360px] flex flex-col gap-3 pt-16">
          <h2 className="font-pulse-ext text-[11px] tracking-[0.22em] uppercase text-pulse-meta">
            Floor console
          </h2>
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Passcode"
            className="rounded-pulse-tile bg-pulse-paper border border-pulse-stroke px-4 py-3 font-pulse-body text-[14px] focus:outline-none focus:border-coach-black"
            onKeyDown={(e) => e.key === "Enter" && savePasscode()}
          />
          <button
            onClick={savePasscode}
            className="rounded-pulse-pill bg-coach-black text-coach-cream font-pulse-ext text-[12px] tracking-[0.12em] uppercase px-8 py-3.5"
          >
            Enter
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex gap-2 mb-6">
        {(["alerts", "roster", "standings"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-pulse-pill px-5 py-2.5 font-pulse-ext text-[11px] tracking-[0.12em] uppercase transition-all ${
              tab === t
                ? "bg-coach-black text-coach-cream"
                : "bg-pulse-paper border border-pulse-stroke text-pulse-primary"
            }`}
          >
            {t === "alerts" ? "Pulse Alerts" : t}
          </button>
        ))}
      </div>
      {!status.twilio && tab === "alerts" && (
        <Banner>SMS isn&apos;t configured — alerts go live on the leaderboard
          and the /pulse page, but no texts send. Set the Twilio env vars to
          enable.</Banner>
      )}
      {tab === "alerts" && <AlertsPanel passcode={passcode} />}
      {tab === "roster" && <RosterPanel passcode={passcode} />}
      {tab === "standings" && <StandingsPanel passcode={passcode} />}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-coach-cream">
      <header className="bg-coach-black text-coach-cream px-6 py-5">
        <p className="font-pulse-ext text-[10px] tracking-[0.28em] uppercase text-coach-gold">
          Coach Pulse Live · SMC
        </p>
        <h1 className="font-pulse-ext text-[18px] font-medium mt-1">Floor Console</h1>
      </header>
      <main className="px-5 py-8 max-w-[840px] mx-auto">{children}</main>
    </div>
  );
}

function Banner({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-pulse-tile bg-pulse-warning-tint p-4 mb-5 font-pulse-body text-[13px] text-pulse-neutral-dark">
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 mb-8">
      <h2 className="font-pulse-ext text-[9px] tracking-[0.22em] uppercase font-medium text-pulse-meta px-1">
        {title}
      </h2>
      {children}
    </section>
  );
}

function adminHeaders(passcode: string): HeadersInit {
  return { "Content-Type": "application/json", "x-admin-passcode": passcode };
}

/* ---------------- Pulse Alerts ---------------- */
function AlertsPanel({ passcode }: { passcode: string }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [bonus, setBonus] = useState(10);
  const [open, setOpen] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    const d = await (await fetch("/api/alerts")).json();
    setAlerts(d.alerts || []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    if (!prompt.trim()) return;
    await fetch("/api/alerts", {
      method: "POST",
      headers: adminHeaders(passcode),
      body: JSON.stringify({ prompt, answer, bonusPoints: bonus }),
    });
    setPrompt("");
    setAnswer("");
    setBonus(10);
    load();
  }

  async function fire(id: string) {
    setNote("Firing…");
    const r = await fetch(`/api/alerts/${id}/send`, {
      method: "POST",
      headers: adminHeaders(passcode),
    });
    const d = await r.json();
    setNote(
      d.activated
        ? `Live now. SMS ${d.sms.configured ? `sent to ${d.sms.sent}/${d.sms.attempted}` : "skipped (Twilio off)"}.`
        : d.error || "Failed",
    );
    load();
  }

  return (
    <>
      <Section title="New Pulse Alert">
        <div className="rounded-pulse-card bg-pulse-paper border border-pulse-stroke p-5 flex flex-col gap-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Prompt — e.g. What creator just styled the Tabby with Margiela this week?"
            rows={2}
            className="rounded-pulse-tile bg-pulse-neutral-light border border-pulse-stroke px-4 py-3 font-pulse-body text-[14px] focus:outline-none focus:border-coach-black resize-none"
          />
          <div className="flex gap-3">
            <input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Answer key (optional — blank = floor reviews)"
              className="flex-1 rounded-pulse-tile bg-pulse-neutral-light border border-pulse-stroke px-4 py-3 font-pulse-body text-[14px] focus:outline-none focus:border-coach-black"
            />
            <input
              type="number"
              value={bonus}
              onChange={(e) => setBonus(Number(e.target.value))}
              className="w-24 rounded-pulse-tile bg-pulse-neutral-light border border-pulse-stroke px-4 py-3 font-pulse-body text-[14px] focus:outline-none focus:border-coach-black"
            />
          </div>
          <button
            onClick={create}
            className="self-start rounded-pulse-pill bg-coach-black text-coach-cream font-pulse-ext text-[11px] tracking-[0.12em] uppercase px-6 py-3"
          >
            Save alert
          </button>
        </div>
      </Section>

      {note && <Banner>{note}</Banner>}

      <Section title="Alerts">
        <div className="flex flex-col gap-2">
          {alerts.length === 0 && (
            <p className="font-pulse-body text-[14px] text-pulse-neutral-1 px-1">
              No alerts yet.
            </p>
          )}
          {alerts.map((a) => (
            <div
              key={a.id}
              className={`rounded-pulse-card border p-4 ${
                a.active
                  ? "bg-coach-gold/10 border-coach-gold"
                  : "bg-pulse-paper border-pulse-stroke"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="font-pulse-body text-[14px] text-pulse-primary">
                    {a.prompt}
                  </p>
                  <p className="font-pulse-body text-[11px] text-pulse-meta mt-1">
                    +{a.bonus_points} · {a.answer ? `key: ${a.answer}` : "freeform"}
                    {a.active && " · LIVE"}
                    {!a.active && a.sent_at && " · closed"}
                  </p>
                </div>
                <button
                  onClick={() => fire(a.id)}
                  className="rounded-pulse-pill bg-coach-black text-coach-cream font-pulse-ext text-[10px] tracking-[0.1em] uppercase px-4 py-2 inline-flex items-center gap-1.5 shrink-0"
                >
                  <Zap size={12} /> {a.sent_at ? "Re-fire" : "Fire"}
                </button>
                <button
                  onClick={() => setOpen(open === a.id ? null : a.id)}
                  className="text-pulse-neutral-1 p-2 shrink-0"
                >
                  <ChevronDown size={16} />
                </button>
              </div>
              {open === a.id && <Responses id={a.id} />}
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

function Responses({ id }: { id: string }) {
  const [rows, setRows] = useState<
    { id: string; answer: string; correct: boolean; awarded: number; teams: { name: string } | null }[]
  >([]);
  useEffect(() => {
    fetch(`/api/alerts/${id}/responses`)
      .then((r) => r.json())
      .then((d) => setRows(d.responses || []));
  }, [id]);
  return (
    <div className="mt-3 border-t border-pulse-stroke pt-3 flex flex-col gap-1.5">
      {rows.length === 0 && (
        <p className="font-pulse-body text-[12px] text-pulse-neutral-1">No responses yet.</p>
      )}
      {rows.map((r) => (
        <div key={r.id} className="flex items-center justify-between font-pulse-body text-[12px]">
          <span className="text-pulse-primary">
            {r.teams?.name || "—"}: <span className="text-pulse-meta">{r.answer}</span>
          </span>
          <span className={r.correct ? "text-pulse-success" : "text-pulse-neutral"}>
            {r.awarded > 0 ? `+${r.awarded}` : r.correct ? "correct" : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Roster ---------------- */
function RosterPanel({ passcode }: { passcode: string }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [tName, setTName] = useState("");
  const [tRegion, setTRegion] = useState("");

  const load = useCallback(async () => {
    const d = await (await fetch("/api/roster")).json();
    setTeams(d.teams || []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function addTeam() {
    if (!tName.trim()) return;
    await fetch("/api/roster", {
      method: "POST",
      headers: adminHeaders(passcode),
      body: JSON.stringify({ action: "team", name: tName, region: tRegion }),
    });
    setTName("");
    setTRegion("");
    load();
  }
  async function del(kind: "team" | "participant", id: string) {
    await fetch(`/api/roster?${kind}=${id}`, {
      method: "DELETE",
      headers: adminHeaders(passcode),
    });
    load();
  }

  return (
    <>
      <Section title="Add team">
        <div className="rounded-pulse-card bg-pulse-paper border border-pulse-stroke p-5 flex gap-3">
          <input value={tName} onChange={(e) => setTName(e.target.value)} placeholder="Team name"
            className="flex-1 rounded-pulse-tile bg-pulse-neutral-light border border-pulse-stroke px-4 py-3 font-pulse-body text-[14px] focus:outline-none focus:border-coach-black" />
          <input value={tRegion} onChange={(e) => setTRegion(e.target.value)} placeholder="Region"
            className="w-40 rounded-pulse-tile bg-pulse-neutral-light border border-pulse-stroke px-4 py-3 font-pulse-body text-[14px] focus:outline-none focus:border-coach-black" />
          <button onClick={addTeam}
            className="rounded-pulse-pill bg-coach-black text-coach-cream font-pulse-ext text-[11px] tracking-[0.12em] uppercase px-6">
            Add
          </button>
        </div>
      </Section>
      <Section title={`Teams (${teams.length})`}>
        <div className="flex flex-col gap-3">
          {teams.map((t) => (
            <TeamCard key={t.id} team={t} passcode={passcode} onChange={load} onDelete={del} />
          ))}
        </div>
      </Section>
    </>
  );
}

function TeamCard({
  team,
  passcode,
  onChange,
  onDelete,
}: {
  team: Team;
  passcode: string;
  onChange: () => void;
  onDelete: (kind: "team" | "participant", id: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  async function addPerson() {
    if (!name.trim()) return;
    await fetch("/api/roster", {
      method: "POST",
      headers: adminHeaders(passcode),
      body: JSON.stringify({ action: "participant", teamId: team.id, name, email, phone }),
    });
    setName("");
    setEmail("");
    setPhone("");
    onChange();
  }

  return (
    <div className="rounded-pulse-card bg-pulse-paper border border-pulse-stroke p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-pulse-ext text-[15px] font-medium text-pulse-primary">{team.name}</p>
          <p className="font-pulse-body text-[11px] text-pulse-meta">{team.region || "—"}</p>
        </div>
        <button onClick={() => onDelete("team", team.id)} className="text-pulse-error p-2">
          <Trash2 size={15} />
        </button>
      </div>
      <div className="flex flex-col gap-1 mb-3">
        {team.participants.map((p) => (
          <div key={p.id} className="flex items-center justify-between font-pulse-body text-[13px]">
            <span className="text-pulse-primary">{p.name}</span>
            <button onClick={() => onDelete("participant", p.id)} className="text-pulse-neutral p-1">
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        {team.participants.length === 0 && (
          <p className="font-pulse-body text-[12px] text-pulse-neutral">No managers yet.</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name"
          className="flex-1 min-w-[120px] rounded-pulse-tile bg-pulse-neutral-light border border-pulse-stroke px-3 py-2 font-pulse-body text-[13px] focus:outline-none" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Corp email"
          className="flex-1 min-w-[140px] rounded-pulse-tile bg-pulse-neutral-light border border-pulse-stroke px-3 py-2 font-pulse-body text-[13px] focus:outline-none" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1…"
          className="w-28 rounded-pulse-tile bg-pulse-neutral-light border border-pulse-stroke px-3 py-2 font-pulse-body text-[13px] focus:outline-none" />
        <button onClick={addPerson}
          className="rounded-pulse-pill bg-coach-black text-coach-cream font-pulse-ext text-[10px] tracking-[0.1em] uppercase px-4">
          Add
        </button>
      </div>
    </div>
  );
}

/* ---------------- Standings ---------------- */
function StandingsPanel({ passcode }: { passcode: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((d) => setRows(d.rows || []));
  }, []);

  return (
    <>
      <Section title="Export">
        <a
          href={`/api/badge-export?passcode=${encodeURIComponent(passcode)}`}
          className="self-start inline-flex items-center gap-2 rounded-pulse-pill bg-coach-black text-coach-cream font-pulse-ext text-[11px] tracking-[0.12em] uppercase px-6 py-3"
        >
          <Download size={14} /> Badge CSV for Tapestry IT
        </a>
      </Section>
      <Section title="Standings">
        <div className="rounded-pulse-card bg-pulse-paper border border-pulse-stroke divide-y divide-pulse-stroke">
          {rows.map((r, i) => (
            <div key={r.team_id} className="flex items-center gap-4 px-5 py-3">
              <span className="font-bembo text-[20px] w-7 text-pulse-neutral-1">{i + 1}</span>
              <div className="flex-1">
                <p className="font-pulse-body text-[14px] text-pulse-primary">{r.name}</p>
                <p className="font-pulse-body text-[11px] text-pulse-meta">
                  {r.region || "—"} · {r.stations_completed}/6 · {r.badges_earned} badges
                </p>
              </div>
              <span className="font-pulse-ext text-[18px] tabular-nums text-pulse-primary">
                {r.total}
              </span>
            </div>
          ))}
          {rows.length === 0 && (
            <p className="font-pulse-body text-[14px] text-pulse-neutral-1 p-5">
              No scores yet.
            </p>
          )}
        </div>
      </Section>
    </>
  );
}
