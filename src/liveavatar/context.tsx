"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AgentEventsEnum,
  ConnectionQuality,
  LiveAvatarSession,
  SessionEvent,
  SessionState,
} from "@heygen/liveavatar-web-sdk";
import type { TranscriptLine, TranscriptRole } from "@/lib/types";

type LiveAvatarContextProps = {
  sessionRef: React.RefObject<LiveAvatarSession | null>;
  sessionState: SessionState;
  isStreamReady: boolean;
  connectionQuality: ConnectionQuality;
  isAvatarTalking: boolean;
  transcript: TranscriptLine[];
};

const defaultCtx: LiveAvatarContextProps = {
  sessionRef: { current: null },
  sessionState: SessionState.INACTIVE,
  isStreamReady: false,
  connectionQuality: ConnectionQuality.UNKNOWN,
  isAvatarTalking: false,
  transcript: [],
};

const LiveAvatarContext =
  createContext<LiveAvatarContextProps>(defaultCtx);

type ProviderProps = {
  children: React.ReactNode;
  sessionAccessToken: string;
  onTranscriptUpdate?: (transcript: TranscriptLine[]) => void;
};

export const LiveAvatarContextProvider = ({
  children,
  sessionAccessToken,
  onTranscriptUpdate,
}: ProviderProps) => {
  const sessionRef = useRef<LiveAvatarSession | null>(null);
  if (sessionRef.current === null) {
    sessionRef.current = new LiveAvatarSession(sessionAccessToken, {
      voiceChat: true,
      apiUrl: process.env.NEXT_PUBLIC_LIVEAVATAR_API_URL,
    });
  }

  const [sessionState, setSessionState] = useState<SessionState>(
    SessionState.INACTIVE,
  );
  const [isStreamReady, setIsStreamReady] = useState(false);
  const [connectionQuality, setConnectionQuality] =
    useState<ConnectionQuality>(ConnectionQuality.UNKNOWN);
  const [isAvatarTalking, setIsAvatarTalking] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);

  // Keep a ref to the latest onTranscriptUpdate so we can call it from
  // event handlers without retriggering subscription effects.
  const onTranscriptUpdateRef = useRef(onTranscriptUpdate);
  useEffect(() => {
    onTranscriptUpdateRef.current = onTranscriptUpdate;
  }, [onTranscriptUpdate]);

  useEffect(() => {
    const session = sessionRef.current;
    if (!session) return;

    const onState = (state: SessionState) => {
      setSessionState(state);
      if (state === SessionState.DISCONNECTED) {
        setIsStreamReady(false);
      }
    };
    const onStream = () => setIsStreamReady(true);
    const onQuality = (q: ConnectionQuality) => setConnectionQuality(q);
    const onAvatarSpeakStart = () => setIsAvatarTalking(true);
    const onAvatarSpeakEnd = () => setIsAvatarTalking(false);

    session.on(SessionEvent.SESSION_STATE_CHANGED, onState);
    session.on(SessionEvent.SESSION_STREAM_READY, onStream);
    session.on(SessionEvent.SESSION_CONNECTION_QUALITY_CHANGED, onQuality);
    session.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, onAvatarSpeakStart);
    session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, onAvatarSpeakEnd);

    return () => {
      session.off(SessionEvent.SESSION_STATE_CHANGED, onState);
      session.off(SessionEvent.SESSION_STREAM_READY, onStream);
      session.off(SessionEvent.SESSION_CONNECTION_QUALITY_CHANGED, onQuality);
      session.off(AgentEventsEnum.AVATAR_SPEAK_STARTED, onAvatarSpeakStart);
      session.off(AgentEventsEnum.AVATAR_SPEAK_ENDED, onAvatarSpeakEnd);
    };
  }, []);

  // Transcript subscription — matches the basic demo pattern.
  // User chunks are cumulative (replace). Avatar chunks are individual
  // words (append). Final events overwrite the in-flight line.
  useEffect(() => {
    const session = sessionRef.current;
    if (!session) return;

    let currentSender: TranscriptRole | null = null;

    const upsertLine = (
      role: TranscriptRole,
      text: string,
      mode: "replace" | "append" | "final",
    ) => {
      setTranscript((prev) => {
        let next: TranscriptLine[];
        const last = prev[prev.length - 1];

        if (mode === "final") {
          if (last && last.role === role) {
            next = [...prev.slice(0, -1), { ...last, text }];
          } else {
            next = [...prev, { role, text, timestamp: Date.now() }];
          }
        } else if (currentSender === role && last) {
          const updated =
            mode === "replace" ? text : last.text + text;
          next = [...prev.slice(0, -1), { ...last, text: updated }];
        } else {
          currentSender = role;
          next = [...prev, { role, text, timestamp: Date.now() }];
        }

        onTranscriptUpdateRef.current?.(next);
        return next;
      });
    };

    const handleUserChunk = (event: { text: string }) =>
      upsertLine("user", event.text, "replace");
    const handleAvatarChunk = (event: { text: string }) =>
      upsertLine("avatar", event.text, "append");
    const handleUserFinal = (event: { text: string }) => {
      currentSender = null;
      upsertLine("user", event.text, "final");
    };
    const handleAvatarFinal = (event: { text: string }) => {
      currentSender = null;
      upsertLine("avatar", event.text, "final");
    };

    session.on(AgentEventsEnum.USER_TRANSCRIPTION_CHUNK, handleUserChunk);
    session.on(AgentEventsEnum.AVATAR_TRANSCRIPTION_CHUNK, handleAvatarChunk);
    session.on(AgentEventsEnum.USER_TRANSCRIPTION, handleUserFinal);
    session.on(AgentEventsEnum.AVATAR_TRANSCRIPTION, handleAvatarFinal);

    return () => {
      session.off(AgentEventsEnum.USER_TRANSCRIPTION_CHUNK, handleUserChunk);
      session.off(AgentEventsEnum.AVATAR_TRANSCRIPTION_CHUNK, handleAvatarChunk);
      session.off(AgentEventsEnum.USER_TRANSCRIPTION, handleUserFinal);
      session.off(AgentEventsEnum.AVATAR_TRANSCRIPTION, handleAvatarFinal);
    };
  }, []);

  return (
    <LiveAvatarContext.Provider
      value={{
        sessionRef,
        sessionState,
        isStreamReady,
        connectionQuality,
        isAvatarTalking,
        transcript,
      }}
    >
      {children}
    </LiveAvatarContext.Provider>
  );
};

export const useLiveAvatarContext = () => useContext(LiveAvatarContext);
