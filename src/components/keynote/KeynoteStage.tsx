"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LiveAvatarSession, SessionEvent, AgentEventsEnum } from "@heygen/liveavatar-web-sdk";
import { Mic } from "lucide-react";
import { requestMicPermission } from "@/lib/requestMicPermission";

type Stage = "idle" | "connecting" | "live";

// Per-pixel green-screen keyer. The avatar streams over a flat green backdrop;
// pixels whose green channel clearly dominates get knocked out (soft edge +
// despill on the fringe) so she composites onto the store photo behind the canvas.
function keyFrame(px: Uint8ClampedArray) {
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    const diff = g - Math.max(r, b);
    if (diff > 42) {
      px[i + 3] = 0;
    } else if (diff > 14) {
      // Edge zone: fade alpha and pull the green spill down toward neutral.
      px[i + 3] = Math.round(255 * (1 - (diff - 14) / 28));
      px[i + 1] = Math.max(r, b);
    }
  }
}

export function KeynoteStage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<LiveAvatarSession | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number>(0);
  const [stage, setStage] = useState<Stage>("idle");
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopRender = () => cancelAnimationFrame(rafRef.current);

  const startRender = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Key the full frame offscreen, then crop a portrait window around the
    // figure — the stream is landscape with her centered, and displaying the
    // whole frame either distorts or shrinks her.
    const off = document.createElement("canvas");
    const offCtx = off.getContext("2d", { willReadFrequently: true });
    if (!offCtx) return;
    let cropX = -1; // smoothed left edge of the crop window
    let cropW = 0; // persists between measurements to avoid resize churn
    let tick = 0;

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w) return;
      if (off.width !== w || off.height !== h) {
        off.width = w;
        off.height = h;
        cropX = -1;
        cropW = 0;
      }
      offCtx.drawImage(video, 0, 0);
      const frame = offCtx.getImageData(0, 0, w, h);
      keyFrame(frame.data);
      offCtx.putImageData(frame, 0, 0);

      // Portrait crop: at least 9:16, widened if her gestures spread further.
      const baseW = Math.round((h * 9) / 16);
      if (!cropW) cropW = baseW;
      if (tick++ % 15 === 0 || cropX < 0) {
        let minX = w;
        let maxX = 0;
        const px = frame.data;
        for (let y = 0; y < h; y += 6) {
          for (let x = 0; x < w; x += 6) {
            if (px[(y * w + x) * 4 + 3] > 40) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
            }
          }
        }
        if (maxX > minX) {
          cropW = Math.min(w, Math.max(baseW, cropW, Math.round((maxX - minX) * 1.15)));
          const target = Math.min(Math.max(Math.round((minX + maxX) / 2 - cropW / 2), 0), w - cropW);
          cropX = cropX < 0 ? target : Math.round(cropX + (target - cropX) * 0.2);
        } else if (cropX < 0) {
          cropX = Math.round((w - cropW) / 2);
        }
      }
      if (canvas.width !== cropW || canvas.height !== h) {
        canvas.width = cropW;
        canvas.height = h;
      }
      ctx.clearRect(0, 0, cropW, h);
      ctx.drawImage(off, cropX, 0, cropW, h, 0, 0, cropW, h);
    };
    rafRef.current = requestAnimationFrame(draw);
  }, []);

  // Tear the session down on BOTH ends: SDK stop + raw LiveKit disconnect
  // (stop() no-ops unless the SDK reached CONNECTED), then a server-side
  // force-stop so abandoned sessions don't keep consuming credits.
  const teardown = useCallback((s: LiveAvatarSession | null) => {
    if (watchdogRef.current) clearTimeout(watchdogRef.current);
    try {
      s?.stop().catch(() => {});
    } catch {
      /* not connected */
    }
    try {
      (s as unknown as { room?: { disconnect: () => Promise<void> } })?.room?.disconnect()?.catch?.(() => {});
    } catch {
      /* already disconnected */
    }
    const id = sessionIdRef.current;
    if (id) {
      sessionIdRef.current = null;
      fetch("/api/liveavatar/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: id }),
        keepalive: true, // survives pagehide
      }).catch(() => {});
    }
  }, []);

  const end = useCallback(() => {
    stopRender();
    const s = sessionRef.current;
    sessionRef.current = null;
    setStage("idle");
    setSpeaking(false);
    teardown(s);
  }, [teardown]);

  const begin = useCallback(async () => {
    setError(null);
    setStage("connecting");
    try {
      await requestMicPermission();
      const res = await fetch("/api/liveavatar/token", { method: "POST" });
      const d = await res.json();
      if (!res.ok || !d.sessionToken) throw new Error(d.error || "Could not start the session");
      sessionIdRef.current = d.sessionId ?? null;

      // voiceChat: false — we start the mic ourselves on stream-ready. The
      // SDK's start() awaits its event websocket with NO error/timeout path,
      // so it can hang forever even while the LiveKit media room is healthy.
      // Nothing below waits on start(): the stream-ready event (pure LiveKit)
      // flips the UI live, and agent events also arrive via the data channel.
      const session = new LiveAvatarSession(d.sessionToken, { voiceChat: false });
      sessionRef.current = session;
      let ready = false;

      session.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, () => setSpeaking(true));
      session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, () => setSpeaking(false));
      session.on(SessionEvent.SESSION_STREAM_READY, () => {
        ready = true;
        if (watchdogRef.current) clearTimeout(watchdogRef.current);
        const video = videoRef.current;
        if (video) {
          session.attach(video);
          video.play().catch(() => {});
        }
        session.voiceChat.start({}).catch(() => {});
        setStage("live");
        startRender();
      });

      const bail = (msg: string) => {
        if (ready || sessionRef.current !== session) return;
        sessionRef.current = null;
        teardown(session);
        setError(msg);
        setStage("idle");
      };

      // If the avatar stream hasn't arrived in 25s, reset cleanly for a retry.
      watchdogRef.current = setTimeout(() => bail("Joon couldn't connect. Tap to try again."), 25_000);

      session.start().catch((e: Error) => bail(e.message || "Could not start the session"));
    } catch (e) {
      setError((e as Error).message || "Could not start the session");
      setStage("idle");
      teardown(sessionRef.current);
      sessionRef.current = null;
    }
  }, [startRender, teardown]);

  useEffect(() => {
    // Best-effort stop when the tab closes/reloads — otherwise the server
    // session lives on (and consumes credits) until max_session_duration.
    const onPageHide = () => teardown(sessionRef.current);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      stopRender();
      teardown(sessionRef.current);
    };
  }, [teardown]);

  return (
    <div className="absolute inset-0 z-10">
      {/* Source video (green screen) — invisible but NOT display:none. The SDK's
          LiveKit room uses adaptiveStream, which pauses video delivery entirely
          for hidden/zero-size elements; opacity keeps frames (and audio) flowing
          while the canvas shows the keyed result. */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={false}
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
      />

      {/* Keyed avatar, standing on the store floor */}
      <div className="absolute inset-0 flex items-end justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          className={`transition-opacity duration-700 ${stage === "live" ? "opacity-100" : "opacity-0"}`}
          style={{
            height: "min(94svh, 1100px)",
            maxWidth: "100vw",
            // Keeps her proportions if the viewport is narrower than the crop.
            objectFit: "cover",
            objectPosition: "center bottom",
          }}
        />
      </div>

      {/* Idle / connecting overlay */}
      {stage !== "live" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 text-center">
          {stage === "connecting" ? (
            <>
              <div className="h-[72px] w-[72px] animate-spin rounded-full border-4 border-coach-cream/30 border-t-coach-cream" />
              <p className="font-pulse-ext text-[11px] uppercase tracking-[0.28em] text-coach-cream drop-shadow-[0_1px_8px_rgba(0,0,0,0.7)]">
                Joon is walking over…
              </p>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={begin}
                className="inline-flex items-center gap-2.5 rounded-pulse-pill bg-coach-cream px-12 py-5 font-pulse-ext text-[13px] font-medium uppercase tracking-[0.14em] text-coach-black shadow-[0_24px_80px_-12px_rgba(0,0,0,0.7)] transition-transform hover:scale-[1.03]"
              >
                <Mic size={16} /> Meet Joon
              </button>
              <p className="font-pulse-body text-[13px] text-coach-cream/80 drop-shadow-[0_1px_8px_rgba(0,0,0,0.7)]">
                Live conversation · speak naturally into the mic
              </p>
              {error && (
                <p className="font-pulse-body text-[13px] text-red-300 drop-shadow-[0_1px_8px_rgba(0,0,0,0.7)]">{error}</p>
              )}
            </>
          )}
        </div>
      )}

      {/* Live controls */}
      {stage === "live" && (
        <div className="absolute inset-x-0 bottom-6 z-20 flex items-center justify-center gap-4">
          <span className="inline-flex items-center gap-2 rounded-pulse-pill bg-coach-black/60 px-4 py-2 font-pulse-body text-[12px] text-coach-cream backdrop-blur">
            <span className={`h-2 w-2 rounded-full ${speaking ? "bg-pulse-success" : "bg-pulse-error animate-pulse"}`} />
            {speaking ? "Joon speaking" : "Listening"}
          </span>
          <button
            type="button"
            onClick={end}
            className="rounded-pulse-pill border border-coach-cream/50 bg-coach-black/40 px-6 py-2 font-pulse-ext text-[11px] uppercase tracking-[0.14em] text-coach-cream backdrop-blur hover:bg-coach-cream/15"
          >
            End
          </button>
        </div>
      )}
    </div>
  );
}
