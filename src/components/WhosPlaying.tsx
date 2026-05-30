"use client";

import { useEffect, useState } from "react";
import type { Scenario } from "@/config/scenarios";
import type { ActivePlayer } from "@/lib/types";

type Team = {
  id: string;
  name: string;
  region: string | null;
  participants: { id: string; name: string }[];
};

const LAST_TEAM_KEY = "coachpulse.lastTeamId";

// Station gate for the shared kiosk: pick the team + the manager about to
// play, or add them on the fly. Captures corporate email/employee id — the
// one join key that lets badges migrate to the main app later.
export function WhosPlaying({
  scenario,
  onReady,
}: {
  scenario: Scenario;
  onReady: (player: ActivePlayer) => void;
}) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [configured, setConfigured] = useState(true);
  const [teamId, setTeamId] = useState<string>("");
  const [participantId, setParticipantId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // add-new state
  const [addingTeam, setAddingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamRegion, setNewTeamRegion] = useState("");
  const [addingPerson, setAddingPerson] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const team = teams.find((t) => t.id === teamId) || null;

  async function loadRoster() {
    const res = await fetch("/api/roster", { cache: "no-store" });
    const data = await res.json();
    if (data.configured === false) setConfigured(false);
    setTeams(data.teams || []);
    return (data.teams || []) as Team[];
  }

  useEffect(() => {
    loadRoster().then((t) => {
      const last =
        typeof window !== "undefined"
          ? window.localStorage.getItem(LAST_TEAM_KEY)
          : null;
      if (last && t.some((x) => x.id === last)) setTeamId(last);
    });
  }, []);

  async function createTeam() {
    if (!newTeamName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "team",
          name: newTeamName,
          region: newTeamRegion,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not add team");
      await loadRoster();
      setTeamId(data.team.id);
      setAddingTeam(false);
      setNewTeamName("");
      setNewTeamRegion("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function createPerson() {
    if (!newName.trim() || !teamId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "participant",
          teamId,
          name: newName,
          email: newEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not add manager");
      await loadRoster();
      setParticipantId(data.participant.id);
      setAddingPerson(false);
      setNewName("");
      setNewEmail("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function start() {
    if (!team) return;
    const p = team.participants.find((x) => x.id === participantId) || null;
    if (typeof window !== "undefined")
      window.localStorage.setItem(LAST_TEAM_KEY, team.id);
    onReady({
      teamId: team.id,
      teamName: team.name,
      participantId: p?.id ?? null,
      participantName: p?.name ?? "Guest",
    });
  }

  const canStart = Boolean(team && participantId);

  return (
    <div className="flex-1 flex flex-col bg-coach-cream">
      <header className="bg-coach-black text-coach-cream px-6 pt-12 pb-12">
        <p className="font-pulse-ext text-[10px] tracking-[0.22em] uppercase font-medium text-coach-gold">
          Station {scenario.station} · {scenario.heroBadge}
        </p>
        <h1
          className="mt-3 font-bembo text-[32px] leading-[1.05] font-normal"
          style={{ letterSpacing: "-0.01em" }}
        >
          Who&apos;s stepping in?
        </h1>
        <p className="mt-3 font-pulse-body text-[13px] text-coach-cream/75">
          {scenario.persona.name} · {scenario.moment} — step into the moment and
          build the craft.
        </p>
      </header>

      <main className="flex-1 bg-coach-cream rounded-t-3xl -mt-6 px-5 pt-8 pb-16">
        <div className="mx-auto w-full max-w-[480px] flex flex-col gap-6">
          {!configured && (
            <div className="rounded-pulse-tile bg-pulse-warning-tint p-4">
              <p className="font-pulse-body text-[13px] text-pulse-neutral-dark">
                Roster isn&apos;t connected yet — set the Supabase env vars.
                You can still run the practice without recording a score.
              </p>
            </div>
          )}

          {/* Team picker */}
          <Field label="Team">
            {addingTeam ? (
              <div className="flex flex-col gap-2">
                <Input
                  placeholder="Team name (e.g. Northeast Trailblazers)"
                  value={newTeamName}
                  onChange={setNewTeamName}
                />
                <Input
                  placeholder="Region (e.g. Northeast)"
                  value={newTeamRegion}
                  onChange={setNewTeamRegion}
                />
                <div className="flex gap-2">
                  <SmallBtn onClick={createTeam} disabled={busy || !newTeamName.trim()}>
                    Add team
                  </SmallBtn>
                  <SmallBtn ghost onClick={() => setAddingTeam(false)}>
                    Cancel
                  </SmallBtn>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select
                  value={teamId}
                  onChange={(v) => {
                    setTeamId(v);
                    setParticipantId("");
                  }}
                  placeholder="Select team"
                  options={teams.map((t) => ({ value: t.id, label: t.name }))}
                />
                <SmallBtn ghost onClick={() => setAddingTeam(true)}>
                  + New
                </SmallBtn>
              </div>
            )}
          </Field>

          {/* Participant picker */}
          {team && (
            <Field label="Manager playing">
              {addingPerson ? (
                <div className="flex flex-col gap-2">
                  <Input placeholder="Full name" value={newName} onChange={setNewName} />
                  <Input
                    placeholder="Corporate email (for badge sync)"
                    value={newEmail}
                    onChange={setNewEmail}
                  />
                  <div className="flex gap-2">
                    <SmallBtn onClick={createPerson} disabled={busy || !newName.trim()}>
                      Add manager
                    </SmallBtn>
                    <SmallBtn ghost onClick={() => setAddingPerson(false)}>
                      Cancel
                    </SmallBtn>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Select
                    value={participantId}
                    onChange={setParticipantId}
                    placeholder="Select manager"
                    options={team.participants.map((p) => ({
                      value: p.id,
                      label: p.name,
                    }))}
                  />
                  <SmallBtn ghost onClick={() => setAddingPerson(true)}>
                    + New
                  </SmallBtn>
                </div>
              )}
            </Field>
          )}

          {error && (
            <p className="font-pulse-body text-[13px] text-pulse-error">{error}</p>
          )}

          <button
            type="button"
            onClick={start}
            disabled={!canStart}
            className="w-full inline-flex items-center justify-center rounded-pulse-pill bg-coach-black text-coach-cream font-pulse-ext text-[12px] font-medium tracking-[0.12em] uppercase px-10 py-4 transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Step into the moment
          </button>
        </div>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-pulse-ext text-[9px] tracking-[0.22em] uppercase font-medium text-pulse-meta px-1">
        {label}
      </span>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex-1 rounded-pulse-tile bg-pulse-paper border border-pulse-stroke px-4 py-3 font-pulse-body text-[14px] text-pulse-primary focus:outline-none focus:border-coach-black"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Input({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-pulse-tile bg-pulse-paper border border-pulse-stroke px-4 py-3 font-pulse-body text-[14px] text-pulse-primary placeholder:text-pulse-neutral focus:outline-none focus:border-coach-black"
    />
  );
}

function SmallBtn({
  children,
  onClick,
  disabled,
  ghost,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  ghost?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-pulse-pill font-pulse-ext text-[11px] font-medium tracking-[0.12em] uppercase px-5 py-3 transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed ${
        ghost
          ? "bg-transparent border border-pulse-stroke text-pulse-primary hover:bg-pulse-neutral-light"
          : "bg-coach-black text-coach-cream hover:opacity-90"
      }`}
    >
      {children}
    </button>
  );
}
