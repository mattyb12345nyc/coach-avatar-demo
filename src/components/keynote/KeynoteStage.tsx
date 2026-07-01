"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LiveAvatarSession } from "@heygen/liveavatar-web-sdk";
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

  const end = useCallback(async () => {
    stopRender();
    const s = sessionRef.current;
    sessionRef.current = null;
    setStage("idle");
    setSpeaking(false);
    try {
      await s?.stop();
    } catch {
      /* already gone */
    }
  }, []);

  const begin = useCallback(async () => {
    setError(null);
    setStage("connecting");
    try {
      await requestMicPermission();
      const res = await fetch("/api/liveavatar/token", { method: "POST" });
      const d = await res.json();
      if (!res.ok || !d.sessionToken) throw new Error(d.error || "Could not start the session");

      const session = new LiveAvatarSession(d.sessionToken, { voiceChat: true });
      sessionRef.current = session;
      // Speaking indicator — event names are loose across SDK builds, so listen defensively.
      (session as unknown as { on: (e: string, cb: (...a: unknown[]) => void) => void }).on?.(
        "avatar_start_talking",
        () => setSpeaking(true),
      );
      (session as unknown as { on: (e: string, cb: (...a: unknown[]) => void) => void }).on?.(
        "avatar_stop_talking",
        () => setSpeaking(false),
      );
      await session.start();
      const video = videoRef.current;
      if (video) {
        session.attach(video);
        await video.play().catch(() => {});
      }
      setStage("live");
      startRender();
    } catch (e) {
      setError((e as Error).message || "Could not start the session");
      setStage("idle");
      sessionRef.current?.stop().catch(() => {});
      sessionRef.current = null;
    }
  }, [startRender]);

  useEffect(() => {
    // Best-effort stop when the tab closes/reloads — otherwise the server
    // session lives on (and consumes credits) until max_session_duration.
    const onPageHide = () => sessionRef.current?.stop().catch(() => {});
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      stopRender();
      sessionRef.current?.stop().catch(() => {});
    };
  }, []);

  return (
    <div className="absolute inset-0 z-10">
      {/* Hidden source video (green screen) — the canvas shows the keyed result */}
      <video ref={videoRef} autoPlay playsInline muted={false} className="hidden" />

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
