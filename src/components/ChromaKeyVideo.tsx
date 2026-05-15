"use client";

import { useEffect, useRef } from "react";
import { useSession } from "@/liveavatar";
import { setupChromaKey } from "@/lib/chromaKey";
import {
  DEFAULT_CHROMA_KEY_OPTIONS,
  type AvatarOffset,
  type ChromaKeyOptions,
} from "@/lib/types";

type ChromaKeyVideoProps = {
  offset: AvatarOffset;
  chromaOptions?: ChromaKeyOptions;
};

export function ChromaKeyVideo({
  offset,
  chromaOptions = DEFAULT_CHROMA_KEY_OPTIONS,
}: ChromaKeyVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const { isStreamReady, attachElement } = useSession();

  useEffect(() => {
    if (isStreamReady && videoRef.current) {
      attachElement(videoRef.current);
    }
  }, [isStreamReady, attachElement]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const stop = () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };

    const start = () => {
      if (video.readyState < 2) return;
      stop();
      cleanupRef.current = setupChromaKey(video, canvas, chromaOptions);
    };

    if (video.readyState >= 2) {
      start();
    } else {
      video.addEventListener("loadedmetadata", start);
      video.addEventListener("loadeddata", start);
    }

    return () => {
      video.removeEventListener("loadedmetadata", start);
      video.removeEventListener("loadeddata", start);
      stop();
    };
  }, [isStreamReady, chromaOptions]);

  const stageStyle: React.CSSProperties = {
    position: "absolute",
    bottom: `${offset.yPercentFromBottom}%`,
    left: "50%",
    transform: `translateX(calc(-50% + ${offset.x}px))`,
    height: `${offset.scaleVh}vh`,
    aspectRatio: "9 / 16",
    maxWidth: "92vw",
  };

  return (
    <div style={stageStyle} className="pointer-events-none select-none">
      {/* Source video — kept playing (visibility:hidden, not display:none) */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={false}
        className="absolute inset-0 w-full h-full object-contain"
        style={{ visibility: "hidden" }}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-contain"
      />
    </div>
  );
}
