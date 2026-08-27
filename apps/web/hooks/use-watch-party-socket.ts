"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";

import { useAuthStore } from "@/stores/auth.store";

function getSocketUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) return "http://localhost:4000";

  if (apiUrl.startsWith("/")) {
    const path = apiUrl.replace(/\/api(?:\/v\d+)?\/?$/, "").replace(/\/$/, "");
    return typeof window === "undefined"
      ? "http://localhost:4000"
      : `${window.location.origin}${path}`;
  }

  try {
    const url = new URL(apiUrl);
    url.pathname = url.pathname.replace(/\/api(?:\/v\d+)?\/?$/, "");
    url.search = "";
    url.hash = "";

    if (typeof window !== "undefined" && url.host === window.location.host) {
      return window.location.origin;
    }

    return url.toString().replace(/\/$/, "");
  } catch {
    return apiUrl.replace(/\/api(?:\/v\d+)?\/?$/, "").replace(/\/$/, "");
  }
}

export type WatchPartyPlaybackStatus = "PLAYING" | "PAUSED";

export type WatchPartyPlaybackState = {
  roomId: string;
  inviteToken?: string;
  hostUserId: string;
  contentId: string;
  episodeId?: string | null;
  status: "WAITING" | "ACTIVE" | "ENDED";
  playbackStatus: WatchPartyPlaybackStatus;
  currentTime: number;
  effectiveCurrentTime: number;
  playbackRate: number;
  sequence: number;
  updatedAt: string;
  serverTime: string;
};

export type WatchPartyParticipant = {
  userId: string;
  displayName?: string;
  avatarUrl?: string | null;
  role: "HOST" | "PARTICIPANT";
  connectionStatus: "ONLINE" | "OFFLINE";
  joinedAt: string;
};

export type WatchPartyReactionType = "❤️" | "🔥" | "😂" | "👏" | "😮";

export type WatchPartyReactionEvent = {
  id: string;
  roomId: string;
  reaction: WatchPartyReactionType;
  sender: WatchPartyParticipant;
  timestamp: string;
};

export type WatchPartyChatMessage = {
  id: string;
  roomId: string;
  text: string;
  senderId: string;
  senderDisplayName: string;
  senderAvatarUrl?: string | null;
  createdAt: string;
};

export type WatchPartyChatHistory = {
  items: WatchPartyChatMessage[];
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
};

export type WatchPartyPollOption = {
  id: string;
  pollId: string;
  contentId: string;
  episodeId?: string | null;
  content?: {
    id: string;
    title: string;
    thumbnailUrl?: string | null;
    duration?: number | null;
    contentType?: string;
    series?: { seasonNumber: number; episodeNumber: number } | null;
  };
  episode?: {
    id: string;
    title: string;
    thumbnailUrl?: string | null;
    duration?: number | null;
  } | null;
  voteCount: number;
  isLeading: boolean;
  isWinner: boolean;
  votedByCurrentUser: boolean;
};

export type WatchPartyPoll = {
  id: string;
  roomId: string;
  createdByUserId: string;
  status: "ACTIVE" | "CLOSED";
  createdAt: string;
  closedAt?: string | null;
  currentUserOptionId?: string | null;
  leadingOptionIds: string[];
  winnerOptionIds: string[];
  options: WatchPartyPollOption[];
};

export type WatchPartyNextEpisode = {
  id: string;
  slug?: string;
  title: string;
  contentType?: string;
  thumbnailUrl?: string | null;
  duration?: number | null;
  seasonNumber?: number;
  episodeNumber?: number;
};

export type WatchPartyNextEpisodeCountdown = {
  id: string;
  roomId: string;
  currentContentId: string;
  currentSequence: number;
  nextEpisode: WatchPartyNextEpisode;
  durationSeconds: number;
  startedAt: string;
  startsAt: string;
};

export type WatchPartyRoom = {
  id: string;
  inviteToken: string;
  invitationUrl: string;
  hostUserId: string;
  contentId: string;
  episodeId?: string | null;
  status: "WAITING" | "ACTIVE" | "ENDED";
  content?: {
    id: string;
    title: string;
    description?: string | null;
    contentType?: string;
    thumbnailUrl?: string | null;
    duration?: number | null;
    series?: { seasonNumber: number; episodeNumber: number } | null;
  };
  episode?: {
    id: string;
    title: string;
    description?: string | null;
    thumbnailUrl?: string | null;
    duration?: number | null;
    contentType?: string;
    series?: { seasonNumber: number; episodeNumber: number } | null;
  } | null;
  participants: WatchPartyParticipant[];
  currentParticipant?: WatchPartyParticipant | null;
  playbackState: WatchPartyPlaybackState;
};

type Ack<T> =
  | { ok: true; data: T }
  | { ok: false; code?: string; message?: string };

type EmitPlaybackInput = {
  roomId: string;
  currentTime: number;
  playbackRate?: number;
  sequence?: number;
};

type UseWatchPartySocketOptions = {
  roomId?: string;
  inviteToken?: string;
  enabled?: boolean;
  onJoined?: (room: WatchPartyRoom, participants: WatchPartyParticipant[]) => void;
  onParticipantsUpdated?: (participants: WatchPartyParticipant[]) => void;
  onPlaybackState?: (
    state: WatchPartyPlaybackState,
    eventType: "state" | "play" | "pause" | "seek" | "sync",
  ) => void;
  onHostChanged?: (
    hostUserId: string,
    room: WatchPartyRoom,
  ) => void;
  onReaction?: (event: WatchPartyReactionEvent) => void;
  onChatMessage?: (message: WatchPartyChatMessage) => void;
  onChatError?: (message: string) => void;
  onPollChanged?: (poll: WatchPartyPoll) => void;
  onPollClosed?: (poll: WatchPartyPoll) => void;
  onParticipantJoined?: (participant: WatchPartyParticipant) => void;
  onParticipantLeft?: (payload: {
    userId: string;
    participant?: WatchPartyParticipant | null;
  }) => void;
  onContentChanged?: (payload: {
    room: WatchPartyRoom;
    poll?: WatchPartyPoll;
    selectedOptionId?: string;
    countdownId?: string;
    playbackState: WatchPartyPlaybackState;
  }) => void;
  onNextEpisodeCountdown?: (countdown: WatchPartyNextEpisodeCountdown) => void;
  onNextEpisodeCancel?: () => void;
  onRoomEnded?: () => void;
  onConnectionChanged?: (
    state: "connected" | "disconnected" | "error",
    message?: string,
  ) => void;
  onError?: (message: string) => void;
};

export function useWatchPartySocket({
  roomId,
  inviteToken,
  enabled = true,
  onJoined,
  onParticipantsUpdated,
  onPlaybackState,
  onHostChanged,
  onReaction,
  onChatMessage,
  onChatError,
  onPollChanged,
  onPollClosed,
  onParticipantJoined,
  onParticipantLeft,
  onContentChanged,
  onNextEpisodeCountdown,
  onNextEpisodeCancel,
  onRoomEnded,
  onConnectionChanged,
  onError,
}: UseWatchPartySocketOptions) {
  const { accessToken, isAuthenticated } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);
  const callbacksRef = useRef({
    onJoined,
    onParticipantsUpdated,
    onPlaybackState,
    onHostChanged,
    onReaction,
    onChatMessage,
    onChatError,
    onPollChanged,
    onPollClosed,
    onParticipantJoined,
    onParticipantLeft,
    onContentChanged,
    onNextEpisodeCountdown,
    onNextEpisodeCancel,
    onRoomEnded,
    onConnectionChanged,
    onError,
  });
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<
    "idle" | "connecting" | "connected" | "disconnected" | "error"
  >("idle");

  useEffect(() => {
    callbacksRef.current = {
      onJoined,
      onParticipantsUpdated,
      onPlaybackState,
      onHostChanged,
      onReaction,
      onChatMessage,
      onChatError,
      onPollChanged,
      onPollClosed,
      onParticipantJoined,
      onParticipantLeft,
      onContentChanged,
      onNextEpisodeCountdown,
      onNextEpisodeCancel,
      onRoomEnded,
      onConnectionChanged,
      onError,
    };
  }, [
    onChatError,
    onChatMessage,
    onConnectionChanged,
    onContentChanged,
    onError,
    onHostChanged,
    onJoined,
    onNextEpisodeCancel,
    onNextEpisodeCountdown,
    onParticipantJoined,
    onParticipantLeft,
    onParticipantsUpdated,
    onPlaybackState,
    onPollChanged,
    onPollClosed,
    onReaction,
    onRoomEnded,
  ]);

  const emitAck = useCallback(
    <T,>(event: string, payload: unknown) =>
      new Promise<Ack<T>>((resolve) => {
        const socket = socketRef.current;
        if (!socket?.connected) {
          resolve({
            ok: false,
            code: "SOCKET_DISCONNECTED",
            message: "Подключение в реальном времени недоступно",
          });
          return;
        }

        let settled = false;
        const timeout = window.setTimeout(() => {
          if (settled) return;
          settled = true;
          resolve({
            ok: false,
            code: "ACK_TIMEOUT",
            message: "Сервер не ответил вовремя. Попробуйте ещё раз.",
          });
        }, 10000);

        socket.emit(event, payload, (response: Ack<T>) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timeout);
          resolve(response);
        });
      }),
    [],
  );

  useEffect(() => {
    if (!enabled || !isAuthenticated || !accessToken || (!roomId && !inviteToken)) {
      return;
    }

    let mounted = true;
    let activeSocket: Socket | null = null;
    let joinApplied = false;
    let joinTimeout: ReturnType<typeof setTimeout> | null = null;

    const clearJoinTimeout = () => {
      if (joinTimeout) {
        clearTimeout(joinTimeout);
        joinTimeout = null;
      }
    };

    const applyJoined = (payload: {
      room: WatchPartyRoom;
      participants: WatchPartyParticipant[];
    }) => {
      if (!mounted || joinApplied) return;

      joinApplied = true;
      clearJoinTimeout();
      callbacksRef.current.onJoined?.(payload.room, payload.participants);

      if (payload.room.playbackState) {
        callbacksRef.current.onPlaybackState?.(
          payload.room.playbackState,
          "state",
        );
      }
    };

    setConnectionState("connecting");

    async function connect() {
      const { io } = await import("socket.io-client");
      if (!mounted) return;

      const socket = io(`${getSocketUrl()}/watch-party`, {
        auth: { token: accessToken },
        path: "/socket.io",
        transports: ["polling", "websocket"],
        reconnection: true,
        reconnectionAttempts: 8,
        reconnectionDelay: 1500,
      });

      activeSocket = socket;
      socketRef.current = socket;

      socket.on("connect", () => {
        if (!mounted || socket !== socketRef.current) return;

        setIsConnected(true);
        setConnectionState("connected");
        callbacksRef.current.onConnectionChanged?.("connected");

        joinApplied = false;
        clearJoinTimeout();
        joinTimeout = setTimeout(() => {
          if (!mounted || joinApplied || socket !== socketRef.current) return;

          const message =
            "Сервер не подтвердил подключение к комнате. Попробуйте ещё раз.";
          setConnectionState("error");
          callbacksRef.current.onConnectionChanged?.("error", message);
          callbacksRef.current.onError?.(message);
        }, 10000);

        socket.emit(
          "watch-party:join",
          {
            ...(roomId ? { roomId } : {}),
            ...(inviteToken ? { inviteToken } : {}),
          },
          (
            response: Ack<{
              room: WatchPartyRoom;
              participants: WatchPartyParticipant[];
            }>,
          ) => {
            if (!mounted || socket !== socketRef.current) return;

            if (!response.ok) {
              clearJoinTimeout();
              const message =
                response.message ||
                "Не удалось присоединиться к совместному просмотру";
              setConnectionState("error");
              callbacksRef.current.onConnectionChanged?.("error", message);
              callbacksRef.current.onError?.(message);
              return;
            }

            // Some gateway versions return the joined room only in the ACK,
            // while others additionally emit `watch-party:joined`.
            // Applying both paths through one guarded function prevents the
            // second participant from waiting forever for an event that may
            // never arrive, without duplicating state updates.
            applyJoined(response.data);
          },
        );
      });

      socket.on("disconnect", () => {
        if (!mounted || socket !== socketRef.current) return;

        clearJoinTimeout();
        setIsConnected(false);
        setConnectionState("disconnected");
        callbacksRef.current.onConnectionChanged?.("disconnected");
      });

      socket.on("connect_error", (error: Error) => {
        if (!mounted || socket !== socketRef.current) return;

        clearJoinTimeout();
        setIsConnected(false);
        setConnectionState("error");
        callbacksRef.current.onConnectionChanged?.("error", error.message);
        callbacksRef.current.onError?.(error.message);
      });

      socket.on(
        "watch-party:joined",
        (payload: {
          room: WatchPartyRoom;
          participants: WatchPartyParticipant[];
        }) => {
          applyJoined(payload);
        },
      );

      socket.on(
        "watch-party:participants-updated",
        (payload: { participants: WatchPartyParticipant[] }) => {
          callbacksRef.current.onParticipantsUpdated?.(payload.participants);
        },
      );
      socket.on(
        "watch-party:participant-joined",
        (payload: { participant: WatchPartyParticipant }) => {
          callbacksRef.current.onParticipantJoined?.(payload.participant);
        },
      );
      socket.on(
        "watch-party:participant-left",
        (payload: {
          userId: string;
          participant?: WatchPartyParticipant | null;
        }) => {
          callbacksRef.current.onParticipantLeft?.({
            userId: payload.userId,
            participant: payload.participant ?? null,
          });
        },
      );

      socket.on("watch-party:playback-state", (state: WatchPartyPlaybackState) => {
        callbacksRef.current.onPlaybackState?.(state, "state");
      });
      socket.on("watch-party:sync-state", (state: WatchPartyPlaybackState) => {
        callbacksRef.current.onPlaybackState?.(state, "sync");
      });
      socket.on("watch-party:play", (state: WatchPartyPlaybackState) => {
        callbacksRef.current.onPlaybackState?.(state, "play");
      });
      socket.on("watch-party:pause", (state: WatchPartyPlaybackState) => {
        callbacksRef.current.onPlaybackState?.(state, "pause");
      });
      socket.on("watch-party:seek", (state: WatchPartyPlaybackState) => {
        callbacksRef.current.onPlaybackState?.(state, "seek");
      });
      socket.on(
        "watch-party:host-changed",
        (payload: { hostUserId: string; room: WatchPartyRoom }) => {
          callbacksRef.current.onHostChanged?.(payload.hostUserId, payload.room);
        },
      );
      socket.on("watch-party:reaction-received", (event: WatchPartyReactionEvent) => {
        callbacksRef.current.onReaction?.(event);
      });
      socket.on(
        "watch-party:chat-message",
        (payload: { roomId: string; message: WatchPartyChatMessage }) => {
          callbacksRef.current.onChatMessage?.(payload.message);
        },
      );
      socket.on("watch-party:chat-error", (error: { message?: string }) => {
        callbacksRef.current.onChatError?.(error.message || "Не удалось отправить сообщение в чат");
      });
      socket.on(
        "watch-party:poll-created",
        (payload: { poll: WatchPartyPoll }) => {
          callbacksRef.current.onPollChanged?.(payload.poll);
        },
      );
      socket.on(
        "watch-party:poll-updated",
        (payload: { poll: WatchPartyPoll }) => {
          callbacksRef.current.onPollChanged?.(payload.poll);
        },
      );
      socket.on(
        "watch-party:poll-closed",
        (payload: { poll: WatchPartyPoll }) => {
          callbacksRef.current.onPollChanged?.(payload.poll);
          callbacksRef.current.onPollClosed?.(payload.poll);
        },
      );
      socket.on(
        "watch-party:content-changed",
        (payload: {
          room: WatchPartyRoom;
          poll?: WatchPartyPoll;
          selectedOptionId?: string;
          countdownId?: string;
          playbackState: WatchPartyPlaybackState;
        }) => {
          callbacksRef.current.onContentChanged?.(payload);
        },
      );
      socket.on(
        "watch-party:next-episode-countdown",
        (countdown: WatchPartyNextEpisodeCountdown) => {
          callbacksRef.current.onNextEpisodeCountdown?.(countdown);
        },
      );
      socket.on("watch-party:next-episode-cancel", () => {
        callbacksRef.current.onNextEpisodeCancel?.();
      });
      socket.on(
        "watch-party:next-episode-start",
        (payload: {
          room: WatchPartyRoom;
          playbackState: WatchPartyPlaybackState;
        }) => {
          callbacksRef.current.onNextEpisodeCancel?.();
          callbacksRef.current.onContentChanged?.(payload);
        },
      );
      socket.on("watch-party:room-ended", () => {
        callbacksRef.current.onRoomEnded?.();
      });
      socket.on("watch-party:error", (error: { message?: string }) => {
        callbacksRef.current.onError?.(error.message || "Ошибка совместного просмотра");
      });
    }

    connect();

    return () => {
      mounted = false;
      clearJoinTimeout();
      setIsConnected(false);

      if (activeSocket) {
        activeSocket.removeAllListeners();
        activeSocket.disconnect();
      }

      if (socketRef.current === activeSocket) {
        socketRef.current = null;
      }
    };
  }, [accessToken, enabled, inviteToken, isAuthenticated, roomId]);

  const requestState = useCallback(
    (targetRoomId: string) =>
      emitAck<WatchPartyPlaybackState>("watch-party:state-request", {
        roomId: targetRoomId,
      }),
    [emitAck],
  );

  const requestSync = useCallback(
    (targetRoomId: string) =>
      emitAck<WatchPartyPlaybackState>("watch-party:sync-request", {
        roomId: targetRoomId,
      }),
    [emitAck],
  );

  const emitPlay = useCallback(
    (payload: EmitPlaybackInput) =>
      emitAck<WatchPartyPlaybackState>("watch-party:play", payload),
    [emitAck],
  );

  const emitPause = useCallback(
    (payload: EmitPlaybackInput) =>
      emitAck<WatchPartyPlaybackState>("watch-party:pause", payload),
    [emitAck],
  );

  const emitSeek = useCallback(
    (payload: EmitPlaybackInput) =>
      emitAck<WatchPartyPlaybackState>("watch-party:seek", payload),
    [emitAck],
  );

  const transferHost = useCallback(
    (payload: { roomId: string; targetUserId: string }) =>
      emitAck<WatchPartyRoom>("watch-party:transfer-host", payload),
    [emitAck],
  );

  const sendReaction = useCallback(
    (payload: {
      roomId: string;
      reaction: WatchPartyReactionType;
      clientReactionId?: string;
    }) =>
      emitAck<WatchPartyReactionEvent>("watch-party:reaction", payload),
    [emitAck],
  );

  const sendChatMessage = useCallback(
    (payload: { roomId: string; text: string; clientMessageId: string }) =>
      emitAck<WatchPartyChatMessage>("watch-party:chat-send", payload),
    [emitAck],
  );

  const createPoll = useCallback(
    (payload: {
      roomId: string;
      options: Array<{ contentId: string; episodeId?: string }>;
    }) => emitAck<WatchPartyPoll>("watch-party:poll-create", payload),
    [emitAck],
  );

  const votePoll = useCallback(
    (payload: { roomId: string; pollId: string; optionId: string }) =>
      emitAck<WatchPartyPoll>("watch-party:poll-vote", payload),
    [emitAck],
  );

  const closePoll = useCallback(
    (payload: { roomId: string; pollId: string }) =>
      emitAck<WatchPartyPoll>("watch-party:poll-close", payload),
    [emitAck],
  );

  const startPollWinner = useCallback(
    (payload: { roomId: string; pollId: string; optionId?: string }) =>
      emitAck<{
        room: WatchPartyRoom;
        poll: WatchPartyPoll;
        selectedOptionId: string;
        playbackState: WatchPartyPlaybackState;
      }>("watch-party:poll-start-winner", payload),
    [emitAck],
  );

  const reportEpisodeEnded = useCallback(
    (payload: { roomId: string }) =>
      emitAck<WatchPartyNextEpisodeCountdown | null>(
        "watch-party:episode-ended",
        payload,
      ),
    [emitAck],
  );

  const startNextEpisode = useCallback(
    (payload: { roomId: string; countdownId?: string }) =>
      emitAck<{
        room: WatchPartyRoom;
        playbackState: WatchPartyPlaybackState;
      } | null>("watch-party:next-episode-start", payload),
    [emitAck],
  );

  const cancelNextEpisode = useCallback(
    (payload: { roomId: string; countdownId?: string }) =>
      emitAck("watch-party:next-episode-cancel", payload),
    [emitAck],
  );

  const leave = useCallback(
    (targetRoomId: string) =>
      emitAck("watch-party:leave", {
        roomId: targetRoomId,
      }),
    [emitAck],
  );

  const endRoom = useCallback(
    (targetRoomId: string) =>
      emitAck<WatchPartyRoom>("watch-party:end", {
        roomId: targetRoomId,
      }),
    [emitAck],
  );

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setIsConnected(false);
    setConnectionState("disconnected");
  }, []);

  return {
    isConnected,
    connectionState,
    requestState,
    requestSync,
    emitPlay,
    emitPause,
    emitSeek,
    transferHost,
    sendReaction,
    sendChatMessage,
    createPoll,
    votePoll,
    closePoll,
    startPollWinner,
    reportEpisodeEnded,
    startNextEpisode,
    cancelNextEpisode,
    endRoom,
    leave,
    disconnect,
  };
}
