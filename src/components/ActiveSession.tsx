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
  // Mount the LiveAvatar context only once per session token. Re-mounting
  // would spin up a new LiveKit room each render.
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
  const [countdown, setCountdown] = useState(12);
  const startedRef = useRef(false);
  const endedRef = useRef(false);
  const transcriptRef = useRef<TranscriptLine[]>([]);
  const [chromaOptions, setChromaOptions] = useState<ChromaKeyOptions>(
    DEFAULT_CHROMA_KEY_OPTIONS,
  );

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  // Kick off the session on mount.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    startSession().catch((err) => {
      console.error("Failed to start LiveAvatar session:", err);
    });
  }, [startSession]);

  // Timer.
  useEffect(() => {
    if (!isStreamReady) return;
    const t = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [isStreamReady]);

  // 7-second loading countdown. Ticks while the stream isn't ready yet.
  useEffect(() => {
    if (isStreamReady) return;
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, isStreamReady]);

  // Max duration enforcement.
  useEffect(() => {
    if (elapsed >= MAX_SESSION_SECONDS && !endedRef.current) {
      endSession("max_duration");
    }
  }, [elapsed]);

  // External disconnect.
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
    : { backgroundColor: BACKGROUND.color || "#1C1917" };

  const minutes = Math.floor(elapsed / 60).toString().padStart(2, "0");
  const seconds = (elapsed % 60).toString().padStart(2, "0");
  const remaining = Math.max(0, MAX_SESSION_SECONDS - elapsed);

  const isConnecting =
    sessionState === SessionState.INACTIVE ||
    sessionState === SessionState.CONNECTING ||
    !isStreamReady;

  return (
    <div className="fixed inset-0 overflow-hidden bg-coach-black">
      {/* Background layer */}
      <div className="absolute inset-0 z-0" style={bgStyle} />
      {/* Subtle dark wash to keep text legible against busy bg */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-coach-black/30 via-transparent to-coach-black/60" />

      {/* Avatar layer */}
      <div className="absolute inset-0 z-10">
        <ChromaKeyVideo offset={BACKGROUND.avatarOffset} chromaOptions={chromaOptions} />
      </div>

      {/* Connecting overlay */}
      {isConnecting && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-coach-black/75 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-6">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg className="absolute inset-0 w-24 h-24 -rotate-90" aria-hidden>
                <circle
                  cx="48"
                  cy="48"
                  r="42"
                  stroke="rgba(245, 240, 235, 0.12)"
                  strokeWidth="3"
                  fill="none"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="42"
                  stroke="#C9A227"
                  strokeWidth="3"
                  fill="none"
                  strokeDasharray={2 * Math.PI * 42}
                  strokeDashoffset={(2 * Math.PI * 42) * (countdown / 12)}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 1s linear" }}
                />
              </svg>
              <span className="text-coach-cream text-[32px] font-medium tabular-nums">
                {Math.max(0, countdown)}
              </span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <p className="text-coach-cream text-[14px] tracking-[0.2em] uppercase font-medium">
                Connecting your practice partner
              </p>
              <p className="text-coach-cream/60 text-[12px]">
                {countdown > 0 ? `Ready in ${countdown}s` : "Almost there..."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top-right timer */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-2 rounded-full bg-coach-black/50 backdrop-blur-md px-4 py-2 border border-coach-cream/15">
        <span className="w-1.5 h-1.5 rounded-full bg-coach-gold animate-pulse" />
        <span className="text-coach-cream font-medium tabular-nums text-[14px]">
          {minutes}:{seconds}
        </span>
        <span className="text-coach-cream/40 text-[11px]">/ 10:00</span>
      </div>

      {/* Top-left Coach Pulse logo */}
      <div className="absolute top-6 left-6 z-20">
        <p className="text-coach-cream text-[12px] tracking-[0.3em] uppercase font-medium">
          Coach Pulse
        </p>
        <p className="text-coach-cream/50 text-[10px] tracking-wider mt-0.5">
          Practice in progress
        </p>
      </div>

      {/* End session button */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
        <button
          type="button"
          onClick={() => endSession("user_ended")}
          className="inline-flex items-center justify-center rounded-full border border-coach-gold px-8 py-3 text-coach-cream text-[13px] font-medium tracking-[0.08em] uppercase bg-transparent hover:bg-coach-gold hover:text-coach-black transition-colors"
        >
          End session
        </button>
      </div>

      {/* Debug chroma sliders */}
      {debug && (
        <div className="absolute top-20 right-6 z-30 bg-coach-black/80 border border-coach-cream/20 rounded-lg p-4 text-coach-cream text-xs space-y-2 w-64">
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
          <p className="text-coach-cream/40 mt-2">elapsed {elapsed}s · remaining {Math.floor(remaining / 60)}:{(remaining % 60).toString().padStart(2, "0")}</p>
        </div>
      )}
    </div>
  );
}
