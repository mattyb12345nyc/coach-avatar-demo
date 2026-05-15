"use client";

import { useEffect, useRef, useState } from "react";
import { SessionState } from "@heygen/liveavatar-web-sdk";
import { ChromaKeyVideo } from "./ChromaKeyVideo";
import { LiveAvatarContextProvider, useSession } from "@/liveavatar";
import { BACKGROUND } from "@/config/backgrounds";
import {
  DEFAULT_CHROMA_KEY_OPTIONS,
  type ChromaKeyOptions,
  type TranscriptLine,
} from "@/lib/types";

const MAX_SESSION_SECONDS = 10 * 60;
const COUNTDOWN_START = 12;

type ActiveSessionProps = {
  sessionToken: string;
  onSessionEnd: (info: {
    transcript: TranscriptLine[];
    durationSeconds: number;
    endedReason: "user_ended" | "max_duration" | "disconnected";
  }) => void;
  debug?: boolean;
};

export function ActiveSession(props: ActiveSessionProps) {
  return (
    <LiveAvatarContextProvider sessionAccessToken={props.sessionToken}>
      <ActiveSessionInner {...props} />
    </LiveAvatarContextProvider>
  );
}

function ActiveSessionInner({ onSessionEnd, debug = false }: ActiveSessionProps) {
  const {
    sessionState,
    isStreamReady,
    startSession,
    stopSession,
    transcript,
  } = useSession();

  const [elapsed, setElapsed] = useState(0);
  const [countdown, setCountdown] = useState(COUNTDOWN_START);
  const startedRef = useRef(false);
  const endedRef = useRef(false);
  const transcriptRef = useRef<TranscriptLine[]>([]);
  const [chromaOptions, setChromaOptions] = useState<ChromaKeyOptions>(
    DEFAULT_CHROMA_KEY_OPTIONS,
  );

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    startSession().catch((err) => {
      console.error("Failed to start LiveAvatar session:", err);
    });
  }, [startSession]);

  useEffect(() => {
    if (!isStreamReady) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [isStreamReady]);

  useEffect(() => {
    if (isStreamReady || countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, isStreamReady]);

  useEffect(() => {
    if (elapsed >= MAX_SESSION_SECONDS && !endedRef.current) {
      endSession("max_duration");
    }
  }, [elapsed]);

  useEffect(() => {
    if (sessionState === SessionState.DISCONNECTED && startedRef.current && !endedRef.current) {
      endedRef.current = true;
      onSessionEnd({
        transcript: transcriptRef.current,
        durationSeconds: elapsed,
        endedReason: "disconnected",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionState]);

  const endSession = async (
    reason: "user_ended" | "max_duration" | "disconnected",
  ) => {
    if (endedRef.current) return;
    endedRef.current = true;
    try {
      await stopSession();
    } catch (err) {
      console.warn("stopSession error:", err);
    }
    onSessionEnd({
      transcript: transcriptRef.current,
      durationSeconds: elapsed,
      endedReason: reason,
    });
  };

  const bgStyle: React.CSSProperties = BACKGROUND.image
    ? {
        backgroundImage: `url(${BACKGROUND.image})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : { backgroundColor: "var(--color-coach-black)" };

  const minutes = Math.floor(elapsed / 60).toString().padStart(2, "0");
  const seconds = (elapsed % 60).toString().padStart(2, "0");
  const remaining = Math.max(0, MAX_SESSION_SECONDS - elapsed);

  const isConnecting =
    sessionState === SessionState.INACTIVE ||
    sessionState === SessionState.CONNECTING ||
    !isStreamReady;

  return (
    <div className="fixed inset-0 overflow-hidden bg-coach-black">
      {/* Background image */}
      <div className="absolute inset-0 z-0" style={bgStyle} />
      {/* Subtle dark wash for legibility */}
      <div
        className="absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.45) 100%)",
        }}
      />

      {/* Avatar */}
      <div className="absolute inset-0 z-10">
        <ChromaKeyVideo offset={BACKGROUND.avatarOffset} chromaOptions={chromaOptions} />
      </div>

      {/* Connecting overlay — Coach Pulse cream card with black countdown ring */}
      {isConnecting && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-coach-black/60 backdrop-blur-sm">
          <div className="rounded-pulse-card bg-pulse-paper shadow-pulse-card px-10 py-9 flex flex-col items-center gap-6 max-w-[360px] mx-6">
            <p className="font-pulse-ext text-[9px] tracking-[0.24em] uppercase font-medium text-pulse-meta">
              Coach Pulse
            </p>
            <div className="relative w-[112px] h-[112px] flex items-center justify-center">
              <svg className="absolute inset-0 w-[112px] h-[112px] -rotate-90" aria-hidden>
                <circle
                  cx="56"
                  cy="56"
                  r="48"
                  stroke="var(--color-pulse-stroke)"
                  strokeWidth="6"
                  fill="none"
                />
                <circle
                  cx="56"
                  cy="56"
                  r="48"
                  stroke="var(--color-coach-black)"
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 48}
                  strokeDashoffset={(2 * Math.PI * 48) * (countdown / COUNTDOWN_START)}
                  style={{ transition: "stroke-dashoffset 1s linear" }}
                />
              </svg>
              <span className="font-pulse-ext text-[32px] font-medium tabular-nums text-pulse-primary">
                {Math.max(0, countdown)}
              </span>
            </div>
            <div className="flex flex-col items-center gap-1 text-center">
              <p className="font-bembo text-[20px] leading-[1.2] text-pulse-primary">
                Connecting your practice partner
              </p>
              <p className="font-pulse-body text-[13px] text-pulse-neutral-1">
                {countdown > 0 ? `Ready in ${countdown}s` : "Almost there…"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top-left: Coach Pulse logo */}
      <div className="absolute top-6 left-6 z-20 flex flex-col gap-0.5">
        <p className="font-pulse-ext text-[10px] tracking-[0.24em] uppercase font-medium text-coach-cream">
          Coach Pulse
        </p>
        <p className="font-pulse-body text-[10px] text-coach-cream/65 tracking-wider">
          Practice in progress
        </p>
      </div>

      {/* Top-right: timer pill (white-on-translucent) */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-2 rounded-pulse-pill bg-pulse-paper px-4 py-2 shadow-pulse-soft">
        <span className="w-1.5 h-1.5 rounded-full bg-coach-black" />
        <span className="font-pulse-ext text-[13px] font-medium tabular-nums text-pulse-primary">
          {minutes}:{seconds}
        </span>
        <span className="font-pulse-body text-[11px] text-pulse-neutral">/ 10:00</span>
      </div>

      {/* Bottom-center: end session — black-filled CTA */}
      <div className="absolute bottom-7 left-1/2 -translate-x-1/2 z-20">
        <button
          type="button"
          onClick={() => endSession("user_ended")}
          className="inline-flex items-center justify-center rounded-pulse-pill bg-coach-black text-coach-cream font-pulse-ext text-[12px] font-medium tracking-[0.12em] uppercase px-10 py-3.5 shadow-pulse-card hover:opacity-90 active:scale-[0.99] transition-all"
        >
          End session
        </button>
      </div>

      {/* Debug chroma sliders */}
      {debug && (
        <div className="absolute top-20 right-6 z-30 bg-pulse-paper border border-pulse-stroke rounded-pulse-tile p-4 text-pulse-primary text-xs space-y-2 w-64 shadow-pulse-card font-pulse-body">
          <p className="font-medium mb-2">Chroma key tuning</p>
          <label className="block">
            min hue: {chromaOptions.minHue}
            <input
              type="range" min={0} max={180} value={chromaOptions.minHue}
              onChange={(e) => setChromaOptions((o) => ({ ...o, minHue: Number(e.target.value) }))}
              className="w-full"
            />
          </label>
          <label className="block">
            max hue: {chromaOptions.maxHue}
            <input
              type="range" min={60} max={300} value={chromaOptions.maxHue}
              onChange={(e) => setChromaOptions((o) => ({ ...o, maxHue: Number(e.target.value) }))}
              className="w-full"
            />
          </label>
          <label className="block">
            min sat: {chromaOptions.minSaturation.toFixed(2)}
            <input
              type="range" min={0} max={1} step={0.05} value={chromaOptions.minSaturation}
              onChange={(e) => setChromaOptions((o) => ({ ...o, minSaturation: Number(e.target.value) }))}
              className="w-full"
            />
          </label>
          <label className="block">
            threshold: {chromaOptions.threshold.toFixed(2)}
            <input
              type="range" min={0.5} max={2} step={0.05} value={chromaOptions.threshold}
              onChange={(e) => setChromaOptions((o) => ({ ...o, threshold: Number(e.target.value) }))}
              className="w-full"
            />
          </label>
          <p className="text-pulse-neutral mt-2">elapsed {elapsed}s · remaining {Math.floor(remaining / 60)}:{(remaining % 60).toString().padStart(2, "0")}</p>
        </div>
      )}
    </div>
  );
}
