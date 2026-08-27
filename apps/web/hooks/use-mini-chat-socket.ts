"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useAuthStore } from "@/stores/auth.store";

export type MiniChatUserSummary = {
  id: string;
  firstName?: string;
  lastName?: string;
  username?: string | null;
  avatarUrl?: string | null;
  displayName: string;
};

export type DirectMessage = {
  id: string;
  conversationId: string;
  senderUserId: string;
  type: "TEXT" | "QUICK_REACTION";
  text?: string | null;
  reactionCode?: string | null;
  clientMessageId?: string | null;
  createdAt: string;
  sender?: MiniChatUserSummary | null;
};

export type DirectConversation = {
  id: string;
  createdAt: string;
  updatedAt: string;
  otherUser: MiniChatUserSummary | null;
  latestMessage: DirectMessage | null;
  unreadCount: number;
};

type SocketAck<T = unknown> = {
  ok: boolean;
  data?: T;
  code?: string;
  message?: string;
};

type UseMiniChatSocketOptions = {
  onMessage?: (payload: {
    conversationId: string;
    message: DirectMessage;
  }) => void;
  onConversationUpdated?: (conversation: DirectConversation) => void;
  onUnreadUpdated?: (payload: { unreadCount: number }) => void;
  onError?: (payload: { code?: string; message?: string }) => void;
};

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
    return url.toString().replace(/\/$/, "");
  } catch {
    return apiUrl.replace(/\/api(?:\/v\d+)?\/?$/, "").replace(/\/$/, "");
  }
}

export function useMiniChatSocket(options: UseMiniChatSocketOptions = {}) {
  const { accessToken, isAuthenticated } = useAuthStore();
  const socketRef = useRef<ReturnType<
    typeof import("socket.io-client").io
  > | null>(null);
  const optionsRef = useRef(options);
  const [connected, setConnected] = useState(false);

  optionsRef.current = options;

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      setConnected(false);
      return;
    }

    let mounted = true;

    async function connect() {
      const { io } = await import("socket.io-client");
      if (!mounted) return;

      const socket = io(`${getSocketUrl()}/chat`, {
        auth: { token: accessToken },
        path: "/socket.io",
        transports: ["polling", "websocket"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 3000,
      });

      socketRef.current = socket;
      socket.on("connect", () => setConnected(true));
      socket.on("disconnect", () => setConnected(false));
      socket.on("chat:message", (payload) => {
        optionsRef.current.onMessage?.(payload);
      });
      socket.on("chat:conversation-updated", (conversation) => {
        optionsRef.current.onConversationUpdated?.(conversation);
      });
      socket.on("chat:unread-updated", (payload) => {
        optionsRef.current.onUnreadUpdated?.(payload);
      });
      socket.on("chat:error", (payload) => {
        optionsRef.current.onError?.(payload);
      });
    }

    connect();

    return () => {
      mounted = false;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [accessToken, isAuthenticated]);

  const joinConversation = useCallback((conversationId: string) => {
    socketRef.current?.emit(
      "chat:join",
      { conversationId },
      (_ack: SocketAck<DirectConversation>) => undefined,
    );
  }, []);

  const sendMessage = useCallback(
    (payload: {
      conversationId: string;
      text?: string;
      reactionCode?: string;
      type?: "TEXT" | "QUICK_REACTION";
      clientMessageId?: string;
    }) =>
      new Promise<SocketAck<DirectMessage>>((resolve) => {
        if (!socketRef.current) {
          resolve({ ok: false, message: "Mini Chat is not connected" });
          return;
        }
        socketRef.current?.emit("chat:message-send", payload, resolve);
      }),
    [],
  );

  const markRead = useCallback(
    (payload: { conversationId: string; messageId?: string }) =>
      new Promise<SocketAck>((resolve) => {
        if (!socketRef.current) {
          resolve({ ok: false, message: "Mini Chat is not connected" });
          return;
        }
        socketRef.current?.emit("chat:read", payload, resolve);
      }),
    [],
  );

  return {
    connected,
    joinConversation,
    sendMessage,
    markRead,
  };
}
