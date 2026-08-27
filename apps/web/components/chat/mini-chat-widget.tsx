"use client";

import {
  ArrowLeft,
  Broadcast,
  ChatCircle,
  MagnifyingGlass,
  Minus,
  PaperPlaneRight,
  X,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/ui/avatar";
import { api, endpoints } from "@/lib/api/endpoints";
import { cn } from "@/lib/utils";
import {
  DirectConversation,
  DirectMessage,
  MiniChatUserSummary,
  useMiniChatSocket,
} from "@/hooks/use-mini-chat-socket";
import { useAuthStore } from "@/stores/auth.store";

type ConversationListResponse = {
  items: DirectConversation[];
  unreadCount: number;
};

type MessageListResponse = {
  items: DirectMessage[];
  nextCursor: string | null;
  hasMore: boolean;
};

type UserSearchResponse = {
  items: MiniChatUserSummary[];
};

const QUICK_REACTIONS = ["❤️", "👍", "😂", "🔥", "👋"] as const;

type ActiveWatchPartyInvite = {
  roomId: string;
  inviteToken: string;
  invitationUrl: string;
  title?: string;
};

type MiniChatWidgetProps = {
  className?: string;
  activeWatchParty?: ActiveWatchPartyInvite;
};

const WATCH_PARTY_INVITE_PATTERN = /(?:https?:\/\/[^\s]+)?\/watch-party\/join\/([A-Za-z0-9_-]+)/i;

function getWatchPartyInvite(text?: string | null) {
  if (!text) return null;
  const match = text.trim().match(WATCH_PARTY_INVITE_PATTERN);
  if (!match?.[1]) return null;
  return {
    inviteToken: match[1],
    href: `/watch-party/join/${match[1]}`,
  };
}

function unwrap<T>(response: unknown): T {
  const candidate = response as { data?: T };
  return candidate && "data" in candidate ? (candidate.data as T) : (response as T);
}

function formatTime(value?: string | Date | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getPreview(message: DirectMessage | null) {
  if (!message) return "Пока нет сообщений";
  if (message.type === "QUICK_REACTION") {
    return `Реакция ${message.reactionCode ?? ""}`;
  }
  if (getWatchPartyInvite(message.text)) {
    return "Приглашение в совместный просмотр";
  }
  return message.text ?? "";
}

function createClientMessageId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function renderSafeText(text: string) {
  const parts = text.split(/(https?:\/\/[^\s<>"']+)/g);

  return parts.map((part, index) => {
    if (!/^https?:\/\//i.test(part)) {
      return <span key={`${part}-${index}`}>{part}</span>;
    }

    return (
      <a
        key={`${part}-${index}`}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#69bfff] underline underline-offset-2"
      >
        {part}
      </a>
    );
  });
}

export function MiniChatWidget({ className, activeWatchParty }: MiniChatWidgetProps = {}) {
  const { isAuthenticated, isHydrated, user } = useAuthStore();
  const [clientMounted, setClientMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [conversations, setConversations] = useState<DirectConversation[]>([]);
  const [activeConversation, setActiveConversation] =
    useState<DirectConversation | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [messageCursor, setMessageCursor] = useState<string | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MiniChatUserSummary[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setClientMounted(true);
  }, []);

  const upsertConversation = useCallback((conversation: DirectConversation) => {
    setConversations((current) => {
      const next = current.filter((item) => item.id !== conversation.id);
      return [conversation, ...next].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    });
    setActiveConversation((current) =>
      current?.id === conversation.id ? conversation : current,
    );
  }, []);

  const { connected, joinConversation, sendMessage, markRead } =
    useMiniChatSocket({
      onMessage: ({ conversationId, message }) => {
        const isActive = activeConversation?.id === conversationId && open;
        if (isActive) {
          setMessages((current) =>
            current.some((item) => item.id === message.id)
              ? current
              : [...current, message],
          );
          markRead({ conversationId, messageId: message.id });
        } else if (message.senderUserId !== user?.id) {
          setNotice(message.sender?.displayName ?? "Новое сообщение");
        }
      },
      onConversationUpdated: upsertConversation,
      onUnreadUpdated: ({ unreadCount }) => setUnreadCount(unreadCount),
      onError: ({ message }) => setNotice(message ?? "Ошибка сообщений"),
    });

  const activeName = activeConversation?.otherUser?.displayName ?? "Диалог";

  const loadConversations = useCallback(async () => {
    const response = await api.get<ConversationListResponse>(
      endpoints.chat.conversations,
      { params: { limit: 30 } },
    );
    const data = unwrap<ConversationListResponse>(response);
    setConversations(data.items ?? []);
    setUnreadCount(data.unreadCount ?? 0);
  }, []);

  const loadMessages = useCallback(
    async (conversationId: string, beforeMessageId?: string | null) => {
      const response = await api.get<MessageListResponse>(
        endpoints.chat.messages(conversationId),
        {
          params: {
            limit: 30,
            beforeMessageId: beforeMessageId ?? undefined,
          },
        },
      );
      const data = unwrap<MessageListResponse>(response);
      setMessages((current) =>
        beforeMessageId ? [...(data.items ?? []), ...current] : data.items ?? [],
      );
      setMessageCursor(data.nextCursor ?? null);
      setHasMoreMessages(Boolean(data.hasMore));

      const latest = data.items?.[data.items.length - 1];
      if (latest) {
        markRead({ conversationId, messageId: latest.id });
      }
    },
    [markRead],
  );

  useEffect(() => {
    if (!isHydrated || !isAuthenticated) return;
    loadConversations().catch(() => undefined);
  }, [isHydrated, isAuthenticated, loadConversations]);

  useEffect(() => {
    if (!activeConversation) return;
    joinConversation(activeConversation.id);
    loadMessages(activeConversation.id).catch(() => undefined);
  }, [activeConversation, joinConversation, loadMessages]);

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timeout = window.setTimeout(() => {
      api
        .get<UserSearchResponse>(endpoints.chat.userSearch, {
          params: { q: searchQuery.trim() },
        })
        .then((response) => setSearchResults(unwrap<UserSearchResponse>(response).items ?? []))
        .catch(() => setSearchResults([]));
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length, activeConversation?.id]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    document.body.classList.toggle("sesh-mini-chat-open", open);
    return () => {
      document.body.classList.remove("sesh-mini-chat-open");
    };
  }, [open]);

  const startConversation = async (targetUserId: string) => {
    const response = await api.post<DirectConversation>(
      endpoints.chat.conversations,
      { targetUserId },
    );
    const conversation = unwrap<DirectConversation>(response);
    upsertConversation(conversation);
    setActiveConversation(conversation);
    setSearchQuery("");
    setSearchResults([]);
  };

  const submitMessage = async () => {
    const text = messageText.trim();
    if (!activeConversation || !text) return;

    setMessageText("");
    const ack = await sendMessage({
      conversationId: activeConversation.id,
      text,
      type: "TEXT",
      clientMessageId: createClientMessageId(),
    });

    if (!ack.ok) {
      setNotice(ack.message ?? "Сообщение не отправлено");
      setMessageText(text);
    }
  };

  const sendQuickReaction = async (reactionCode: string) => {
    if (!activeConversation) return;
    const ack = await sendMessage({
      conversationId: activeConversation.id,
      type: "QUICK_REACTION",
      reactionCode,
      clientMessageId: createClientMessageId(),
    });

    if (!ack.ok) {
      setNotice(ack.message ?? "Реакция не отправлена");
    }
  };

  const sendWatchPartyInvite = async () => {
    if (!activeConversation || !activeWatchParty || isSendingInvite) return;

    setIsSendingInvite(true);
    const ack = await sendMessage({
      conversationId: activeConversation.id,
      type: "TEXT",
      text: activeWatchParty.invitationUrl,
      clientMessageId: createClientMessageId(),
    });
    setIsSendingInvite(false);

    if (!ack.ok) {
      setNotice(ack.message ?? "Не удалось отправить приглашение");
      return;
    }

    setNotice("Приглашение в комнату отправлено");
  };

  const totalUnread = useMemo(
    () =>
      Math.max(
        unreadCount,
        conversations.reduce((sum, item) => sum + (item.unreadCount ?? 0), 0),
      ),
    [conversations, unreadCount],
  );

  if (!clientMounted || !isHydrated || !isAuthenticated) {
    return null;
  }

  return (
    <div className={cn("sesh-mini-chat-root fixed bottom-4 right-4 z-50 md:bottom-6 md:right-6", className)}>
      {!open && (
        <Button
          type="button"
          size="icon-touch"
          className="relative h-14 w-14 rounded-full border border-violet-300/20 bg-[#5d35b8] shadow-[0_20px_48px_rgba(0,0,0,0.46),0_0_22px_rgba(93,53,184,0.22)] transition hover:-translate-y-1 hover:bg-[#6840c4]"
          aria-label="Открыть сообщения"
          onClick={() => {
            setOpen(true);
            setMinimized(false);
          }}
        >
          <ChatCircle weight="fill" />
          {totalUnread > 0 && (
            <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-white px-1.5 text-xs font-bold text-[#120517] shadow-[0_0_18px_rgba(255,255,255,0.34)]">
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </Button>
      )}

      {open && (
        <section
          className={cn(
            "sesh-mini-chat-panel fixed inset-0 z-50 isolate flex flex-col overflow-hidden border border-white/10 bg-[#080411]/96 text-white shadow-2xl backdrop-blur-2xl md:inset-auto md:bottom-6 md:right-6 md:h-[620px] md:w-[420px] md:rounded-[24px]",
            minimized && "hidden md:flex md:h-14",
          )}
          aria-label="Сообщения"
        >
          <header className="sesh-mini-chat-header relative flex h-16 shrink-0 items-center justify-between overflow-hidden border-b border-white/10 px-4">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_0%,rgba(255,45,117,0.18),transparent_52%),radial-gradient(ellipse_at_88%_0%,rgba(76,156,255,0.14),transparent_48%)]" />
            <div className="flex min-w-0 items-center gap-2">
              {activeConversation && !minimized && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Вернуться к диалогам"
                  onClick={() => setActiveConversation(null)}
                  className="relative rounded-full"
                >
                  <ArrowLeft />
                </Button>
              )}
              <div className="relative min-w-0">
                <div className="truncate text-sm font-semibold text-white">
                  {minimized ? "Сообщения" : activeConversation ? activeName : "Сообщения"}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-white/50">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      connected ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.75)]" : "bg-yellow-300",
                    )}
                  />
                  {connected ? "Подключено" : "Подключение..."}
                </div>
              </div>
            </div>
            <div className="relative flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Свернуть сообщения"
                onClick={() => setMinimized((value) => !value)}
                className="rounded-full"
              >
                <Minus />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Закрыть сообщения"
                onClick={() => {
                  setOpen(false);
                  setMinimized(false);
                }}
                className="rounded-full"
              >
                <X />
              </Button>
            </div>
          </header>

          {!minimized && (
            <>
              {notice && (
                <div className="border-b border-[#69bfff]/20 bg-[#102a3c]/70 px-4 py-2 text-xs text-[#d9f1ff]">
                  {notice}
                </div>
              )}

              {!activeConversation ? (
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="border-b border-white/10 p-4">
                    <div className="rounded-full border border-white/10 bg-white/7 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                      <Input
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Поиск пользователей"
                        leftIcon={<MagnifyingGlass size={16} />}
                        className="h-10 border-0 bg-transparent text-white shadow-none"
                      />
                    </div>
                    {searchResults.length > 0 && (
                      <div className="sesh-mini-chat-scroll mt-3 max-h-44 overflow-auto rounded-2xl border border-white/10 bg-[#12091f]/92 p-1 shadow-2xl">
                        {searchResults.map((result) => (
                          <button
                            key={result.id}
                            type="button"
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-white/8"
                            onClick={() => startConversation(result.id)}
                          >
                            <UserAvatar
                              src={result.avatarUrl}
                              name={result.displayName}
                              size="sm"
                            />
                            <span className="truncate">{result.displayName}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="sesh-mini-chat-scroll min-h-0 flex-1 overflow-auto p-2">
                    {conversations.length === 0 ? (
                      <div className="flex h-full min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-white/12 bg-white/5 px-8 text-center">
                        <ChatCircle className="mb-3 h-9 w-9 text-white/38" />
                        <p className="text-sm font-semibold text-white">Пока нет диалогов</p>
                        <p className="mt-1 text-xs text-white/48">
                          Найдите пользователя, чтобы начать личный чат.
                        </p>
                      </div>
                    ) : (
                      conversations.map((conversation) => (
                        <button
                          key={conversation.id}
                          type="button"
                          className={cn(
                            "mb-1 flex w-full items-center gap-3 rounded-2xl border border-transparent px-3 py-3 text-left transition hover:border-white/10 hover:bg-white/7",
                            conversation.unreadCount > 0 && "bg-[#ff2d75]/9",
                          )}
                          onClick={() => setActiveConversation(conversation)}
                        >
                          <UserAvatar
                            src={conversation.otherUser?.avatarUrl}
                            name={conversation.otherUser?.displayName ?? "Пользователь"}
                            size="sm"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <span className="truncate text-sm font-medium">
                                {conversation.otherUser?.displayName ?? "Пользователь"}
                              </span>
                              <span className="shrink-0 text-xs text-white/45">
                                {formatTime(conversation.latestMessage?.createdAt)}
                              </span>
                            </span>
                            <span className="block truncate text-xs text-white/55">
                              {getPreview(conversation.latestMessage)}
                            </span>
                          </span>
                          {conversation.unreadCount > 0 && (
                            <span className="min-w-5 rounded-full bg-gradient-to-r from-[#ff2d75] to-[#6ea5ff] px-1.5 py-0.5 text-center text-xs font-bold text-white shadow-[0_0_18px_rgba(255,45,117,0.28)]">
                              {conversation.unreadCount}
                            </span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col">
                  <div
                    ref={listRef}
                    className="sesh-mini-chat-scroll min-h-0 flex-1 space-y-3 overflow-auto bg-[linear-gradient(180deg,rgba(14,12,31,0.72),rgba(8,7,19,0.34))] px-4 py-4"
                  >
                    {hasMoreMessages && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="mx-auto flex rounded-full"
                        onClick={() =>
                          loadMessages(activeConversation.id, messageCursor)
                        }
                      >
                        Загрузить предыдущие
                      </Button>
                    )}
                    {messages.map((message) => {
                      const mine = message.senderUserId === user?.id;
                      return (
                        <div
                          key={message.id}
                          className={cn(
                            "sesh-message-in flex",
                            mine ? "justify-end" : "justify-start",
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-lg",
                              mine
                                ? "sesh-mini-chat-bubble-mine text-white"
                                : "sesh-mini-chat-bubble-other text-white",
                            )}
                          >
                            {message.type === "QUICK_REACTION" ? (
                              <span className="text-xl">
                                {message.reactionCode}
                              </span>
                            ) : getWatchPartyInvite(message.text) ? (
                              <div className="min-w-[210px] space-y-2.5">
                                <div className="flex items-center gap-2 text-xs font-semibold text-white/80">
                                  <Broadcast className="h-4 w-4 text-[#8fd0ff]" />
                                  Совместный просмотр
                                </div>
                                <p className="text-xs leading-relaxed text-white/65">
                                  Приглашение в комнату. Присоединение доступно, пока комната активна.
                                </p>
                                <a
                                  href={getWatchPartyInvite(message.text)?.href}
                                  className="inline-flex h-9 w-full items-center justify-center rounded-xl border border-violet-400/25 bg-violet-500/18 px-3 text-xs font-semibold text-violet-50 shadow-[0_8px_20px_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5 hover:bg-violet-500/26"
                                >
                                  Присоединиться
                                </a>
                              </div>
                            ) : (
                              <span className="break-words">
                                {renderSafeText(message.text ?? "")}
                              </span>
                            )}
                            <div className="mt-1 text-[11px] text-white/55">
                              {formatTime(message.createdAt)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="sesh-mini-chat-composer border-t border-white/10 bg-[#090512]/88 p-4">
                    <div className="mb-3 flex flex-wrap items-center gap-1.5">
                      {QUICK_REACTIONS.map((reaction) => (
                        <Button
                          key={reaction}
                          type="button"
                          variant="secondary"
                          size="icon"
                          className="sesh-reaction-button h-9 w-9 shrink-0"
                          aria-label={`Отправить ${reaction}`}
                          onClick={() => sendQuickReaction(reaction)}
                        >
                          <span>{reaction}</span>
                        </Button>
                      ))}
                      {activeWatchParty && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="ml-auto h-9 rounded-full border border-[#6ea5ff]/20 bg-[#6ea5ff]/10 px-3 text-xs text-[#dceaff] hover:bg-[#6ea5ff]/18"
                          onClick={sendWatchPartyInvite}
                          disabled={isSendingInvite}
                        >
                          <Broadcast className="mr-1.5 h-4 w-4" />
                          {isSendingInvite ? "Отправляем..." : "Пригласить"}
                        </Button>
                      )}
                    </div>
                    <form
                      className="grid grid-cols-[minmax(0,1fr)_40px] items-center gap-2 rounded-full border border-white/12 bg-white/[0.065] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]"
                      onSubmit={(event) => {
                        event.preventDefault();
                        submitMessage();
                      }}
                    >
                      <Input
                        value={messageText}
                        maxLength={1000}
                        onChange={(event) => setMessageText(event.target.value)}
                        placeholder="Сообщение"
                        className="h-10 min-w-0 flex-1 border-0 bg-transparent px-3 text-white shadow-none focus-visible:ring-0"
                      />
                      <Button
                        type="submit"
                        size="icon"
                        className="!h-10 !w-10 min-w-10 shrink-0 justify-self-end rounded-full border border-violet-400/25 bg-violet-500/20 !p-0 text-violet-100 shadow-[0_8px_20px_rgba(0,0,0,0.24)] hover:bg-violet-500/30 disabled:border-white/5 disabled:bg-white/8 disabled:opacity-35"
                        aria-label="Отправить сообщение"
                        disabled={!messageText.trim()}
                      >
                        <PaperPlaneRight className="h-4 w-4" weight="fill" />
                      </Button>
                    </form>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
