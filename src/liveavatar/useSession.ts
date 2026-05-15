"use client";

import { useCallback } from "react";
import { useLiveAvatarContext } from "./context";

export const useSession = () => {
  const {
    sessionRef,
    sessionState,
    isStreamReady,
    connectionQuality,
    isAvatarTalking,
    transcript,
  } = useLiveAvatarContext();

  const startSession = useCallback(async () => {
    if (!sessionRef.current) throw new Error("Session not initialized");
    return await sessionRef.current.start();
  }, [sessionRef]);

  const stopSession = useCallback(async () => {
    if (!sessionRef.current) return;
    return await sessionRef.current.stop();
  }, [sessionRef]);

  const attachElement = useCallback(
    (element: HTMLMediaElement) => {
      if (!sessionRef.current) return;
      return sessionRef.current.attach(element);
    },
    [sessionRef],
  );

  return {
    sessionState,
    isStreamReady,
    connectionQuality,
    isAvatarTalking,
    transcript,
    startSession,
    stopSession,
    attachElement,
  };
};
