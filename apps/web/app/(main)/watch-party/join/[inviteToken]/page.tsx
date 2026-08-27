"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Broadcast,
  CaretDown,
  CaretUp,
  ChatCircle,
  CheckCircle,
  Crown,
  DoorOpen,
  MagnifyingGlass,
  PaperPlaneRight,
  Play,
  Plus,
  Power,
  Sparkle,
  Users,
  X,
} from "@phosphor-icons/react";

import { VideoPlayerSkeleton } from "@/components/player";
import { MiniChatWidget } from "@/components/chat/mini-chat-widget";
import { UserAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useStreamUrl } from "@/hooks/use-streaming";
import {
  useWatchPartySocket,
  type WatchPartyParticipant,
  type WatchPartyPlaybackState,
  type WatchPartyChatHistory,
  type WatchPartyChatMessage,
  type WatchPartyNextEpisodeCountdown,
  type WatchPartyPoll,
  type WatchPartyPollOption,
  type WatchPartyReactionEvent,
  type WatchPartyReactionType,
  type WatchPartyRoom,
} from "@/hooks/use-watch-party-socket";
import { ApiError, api, endpoints } from "@/lib/api-client";
import { normalizeMediaUrl } from "@/lib/media-url";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth.store";

type RemoteCommand = {
  id: string | number;
  type: "state" | "play" | "pause" | "seek";
  currentTime: number;
  authoritativeCurrentTime?: number;
  playbackStatus?: "PLAYING" | "PAUSED";
  playbackRate?: number;
  serverTime?: string;
  serverClockOffsetMs?: number;
} | null;

type VoteEpisode = {
  id: string;
  title: string;
  seasonNumber?: number;
  episodeNumber?: number;
  thumbnailUrl?: string | null;
  duration?: number | null;
};

type VoteContentResult = {
  id: string;
  slug?: string;
  title: string;
  thumbnailUrl?: string | null;
  year?: number | null;
  duration?: number | null;
  contentType?: string;
  type?: string;
  episodeCount?: number | null;
  seasonCount?: number | null;
  episodes?: VoteEpisode[];
};

type VoteDraftOption = {
  content: VoteContentResult;
  episodeId?: string;
};

type ContentListResponse = {
  items?: VoteContentResult[];
};

type VotePosterProps = {
  src?: string | null;
  title: string;
  className?: string;
};

const VideoPlayer = dynamic(
  () => import("@/components/player/video-player").then((m) => m.VideoPlayer),
  { ssr: false, loading: () => <VideoPlayerSkeleton /> },
);

const DRIFT_IGNORE_SECONDS = 0.75;
const DRIFT_LARGE_SECONDS = 3;
const QUICK_REACTIONS: WatchPartyReactionType[] = [
  "\u2764\uFE0F",
  "\uD83D\uDD25",
  "\uD83D\uDE02",
  "\uD83D\uDC4F",
  "\uD83D\uDE2E",
] as WatchPartyReactionType[];
const REACTION_LANES = [24, 38, 50, 62, 76];
const REACTION_VISIBLE_LIMIT = 16;

type FloatingReaction = WatchPartyReactionEvent & {
  lane: number;
  xOffset: number;
  drift: number;
  rotation: number;
  endRotation: number;
  delayMs: number;
  durationMs: number;
  travel: number;
};

type ConfirmAction = "leave" | "end" | null;

type RoomEventToast = {
  id: string;
  message: string;
};

type JoinStatus =
  | "hydrating"
  | "unauthorized"
  | "loading"
  | "ready"
  | "error"
  | "not-found"
  | "ended";

type PlaybackTiming = {
  serverClockOffsetMs: number;
};

function getServerTimeMs(state: WatchPartyPlaybackState) {
  const serverTime = new Date(state.serverTime || state.updatedAt).getTime();
  return Number.isFinite(serverTime) ? serverTime : Date.now();
}

function getAuthoritativeCurrentTime(state: WatchPartyPlaybackState) {
  if (state.playbackStatus !== "PLAYING") return state.currentTime || 0;
  return state.effectiveCurrentTime || state.currentTime || 0;
}

function getEffectiveTime(
  state: WatchPartyPlaybackState,
  timing?: PlaybackTiming,
) {
  if (state.playbackStatus !== "PLAYING") return state.currentTime || 0;

  const serverTime = getServerTimeMs(state);
  const estimatedServerNow = Date.now() + (timing?.serverClockOffsetMs || 0);
  const elapsed = Math.max(0, (estimatedServerNow - serverTime) / 1000);
  return getAuthoritativeCurrentTime(state) + elapsed * (state.playbackRate || 1);
}

function getParticipantName(participant: WatchPartyParticipant) {
  return participant.displayName || participant.userId;
}

function getJoinedDuration(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "Только что присоединился";
  if (minutes < 60) return `В комнате ${minutes} мин`;
  return `В комнате ${Math.floor(minutes / 60)} ч ${minutes % 60} мин`;
}

function isNearBottom(element: HTMLElement | null) {
  if (!element) return true;
  return element.scrollHeight - element.scrollTop - element.clientHeight < 80;
}

function formatDuration(seconds?: number | null) {
  if (!seconds) return "";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} мин`;
  return `${Math.floor(minutes / 60)} ч ${minutes % 60} мин`;
}

function formatSeasonCount(count?: number | null) {
  if (!count) return "";
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} сезон`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} сезона`;
  return `${count} сезонов`;
}

function formatEpisodeCount(count?: number | null) {
  if (!count) return "";
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} серия`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} серии`;
  return `${count} серий`;
}

function formatOptionCount(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  const suffix =
    mod10 === 1 && mod100 !== 11
      ? "вариант"
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? "варианта"
        : "вариантов";
  return `${count} из 6 ${suffix}`;
}

function formatContentType(value?: string | null) {
  const normalized = (value || "").toUpperCase();
  if (normalized === "MOVIE") return "Фильм";
  if (normalized === "SERIES") return "Сериал";
  if (normalized === "CLIP") return "Клип";
  if (normalized === "SHORT") return "Шортс";
  if (normalized === "TUTORIAL") return "Обучение";
  if (normalized === "EPISODE") return "Серия";
  return "Контент";
}

function formatPollStatus(status?: string | null) {
  if (status === "ACTIVE") return "Активно";
  if (status === "CLOSED") return "Завершено";
  return "Черновик";
}

function getVoteEpisode(content: VoteContentResult, episodeId?: string) {
  return content.episodes?.find((episode) => episode.id === episodeId) || null;
}

function isStructuredVoteContent(content: VoteContentResult) {
  const type = String(content.contentType || content.type || "").toUpperCase();
  return type === "SERIES" || type === "TUTORIAL";
}

function needsPlayableChild(item: VoteDraftOption) {
  return isStructuredVoteContent(item.content) && !item.episodeId;
}

function getVoteContentMeta(content: VoteContentResult) {
  return [
    formatContentType(content.contentType || content.type),
    content.year ? String(content.year) : "",
    formatDuration(content.duration),
  ].filter(Boolean);
}

function getVoteContentDetails(content: VoteContentResult) {
  return [
    formatSeasonCount(content.seasonCount),
    formatEpisodeCount(content.episodeCount),
  ].filter(Boolean);
}

function getVoteDraftTitle(item: VoteDraftOption) {
  const episode = getVoteEpisode(item.content, item.episodeId);
  if (!episode) return item.content.title;

  const season = episode.seasonNumber ? `Сезон ${episode.seasonNumber}` : "Сезон не указан";
  const episodeNumber = episode.episodeNumber ? `Серия ${episode.episodeNumber}` : "серия не указана";
  return `${item.content.title} — ${season}, ${episodeNumber}`;
}

function getVoteDraftSubtitle(item: VoteDraftOption) {
  const episode = getVoteEpisode(item.content, item.episodeId);
  if (episode) return `Серия · ${episode.title}`;
  return getVoteContentMeta(item.content).join(" · ");
}

function formatVoteCount(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} голос`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} голоса`;
  return `${count} голосов`;
}

function getRoomActionError(message?: string | null) {
  const text = (message || "").toLowerCase();
  if (!text) return "Действие не выполнено. Попробуйте еще раз.";
  if (text.includes("socket") || text.includes("disconnect") || text.includes("connection")) {
    return "Соединение потеряно. Переподключитесь и повторите действие.";
  }
  if (text.includes("permission") || text.includes("forbidden") || text.includes("only the host")) {
    return "У вас нет прав для этого действия.";
  }
  if (text.includes("ended") || text.includes("inactive")) {
    return "Комната уже завершена.";
  }
  if (text.includes("not found")) {
    return "Комната недоступна или уже удалена.";
  }
  return message || "Действие не выполнено. Попробуйте еще раз.";
}

function getJoinStatusFromError(error: unknown): JoinStatus {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) return "unauthorized";
    if (error.status === 404) return "not-found";
    if (error.status === 409) return "ended";
  }

  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("ended")) return "ended";
  if (message.includes("not found") || message.includes("invitation")) return "not-found";
  if (message.includes("unauthorized") || message.includes("forbidden") || message.includes("session")) {
    return "unauthorized";
  }
  return "error";
}

function getJoinErrorMessage(status: JoinStatus, fallback?: string | null) {
  if (status === "unauthorized") {
    return "Для входа в комнату необходимо авторизоваться.";
  }
  if (status === "not-found") {
    return "Комната не найдена или ссылка недействительна.";
  }
  if (status === "ended") {
    return "Эта комната уже завершена.";
  }
  if (status === "error") {
    return fallback || "Не удалось подключиться к комнате.";
  }
  return null;
}

function renderMessageText(text: string) {
  const parts = text.split(/(https?:\/\/[^\s<>"']+)/g);
  return parts.map((part, index) => {
    if (!/^https?:\/\//i.test(part)) {
      return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
    }

    return (
      <a
        key={`${part}-${index}`}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#69bfff] underline-offset-4 hover:underline"
      >
        {part}
      </a>
    );
  });
}

function unwrapApiData<T>(response: T | { data?: T }): T {
  if (
    response &&
    typeof response === "object" &&
    Object.prototype.hasOwnProperty.call(response, "data")
  ) {
    return (response as { data?: T }).data as T;
  }

  return response as T;
}

function isWatchPartyPoll(value: unknown): value is WatchPartyPoll {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    typeof (value as WatchPartyPoll).id === "string" &&
    ((value as WatchPartyPoll).status === "ACTIVE" ||
      (value as WatchPartyPoll).status === "CLOSED") &&
    Array.isArray((value as WatchPartyPoll).options)
  );
}

function toRemoteCommand(
  state: WatchPartyPlaybackState,
  eventType: "state" | "play" | "pause" | "seek" | "sync",
  timing?: PlaybackTiming,
): RemoteCommand {
  return {
    id: `${state.sequence}:${eventType}:${Date.now()}`,
    type:
      eventType === "play" || eventType === "pause" || eventType === "seek"
        ? eventType
        : "state",
    currentTime: getEffectiveTime(state, timing),
    authoritativeCurrentTime: getAuthoritativeCurrentTime(state),
    playbackStatus: state.playbackStatus,
    playbackRate: state.playbackRate,
    serverTime: state.serverTime || state.updatedAt,
    serverClockOffsetMs: timing?.serverClockOffsetMs,
  };
}

function getOptionTitle(option: WatchPartyPollOption) {
  return option.episode?.title || option.content?.title || option.contentId;
}

function getOptionImage(option: WatchPartyPollOption) {
  return option.episode?.thumbnailUrl || option.content?.thumbnailUrl;
}

function getRoomContentKind(room: WatchPartyRoom | null) {
  if (!room) return "Видео";
  if (room.episodeId || room.episode?.series) return "Сериал";
  const type = String(room.content?.contentType || "").toUpperCase();
  if (type === "SERIES") return "Сериал";
  if (type === "MOVIE" || type === "FILM") return "Фильм";
  if (type === "SHORT" || type === "SHORTS") return "Шортс";
  return "Видео";
}

function getRoomEpisodeLabel(room: WatchPartyRoom | null) {
  const series = room?.episode?.series;
  if (!series) return null;
  return `Сезон ${series.seasonNumber} · Серия ${series.episodeNumber}`;
}

function getReactionSeed(id: string) {
  return Math.abs(id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0));
}

function getReactionRange(seed: number, salt: number, min: number, max: number) {
  const value = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  const normalized = value - Math.floor(value);
  return min + normalized * (max - min);
}

function createClientEventId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getFloatingReaction(event: WatchPartyReactionEvent): FloatingReaction {
  const seed = getReactionSeed(event.id);
  const lane = REACTION_LANES[seed % REACTION_LANES.length];
  const driftDirection = seed % 2 === 0 ? 1 : -1;

  return {
    ...event,
    lane,
    xOffset: Math.round(getReactionRange(seed, 1, -20, 20)),
    drift: Math.round(getReactionRange(seed, 2, 18, 52)) * driftDirection,
    rotation: Math.round(getReactionRange(seed, 3, -8, 8)),
    endRotation: Math.round(getReactionRange(seed, 4, -10, 10)),
    delayMs: Math.round(getReactionRange(seed, 5, 0, 110)),
    durationMs: Math.round(getReactionRange(seed, 6, 2400, 3000)),
    travel: Math.round(getReactionRange(seed, 7, 220, 300)),
  };
}

function WatchPartyRestoreState({
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  isLoading,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  isLoading?: boolean;
}) {
  return (
    <div className="sesh-watch-party-page">
      <div className="sesh-watch-party-shell flex min-h-screen items-center justify-center px-4 py-10">
        <div className="sesh-glass-panel w-full max-w-lg p-6 text-center">
          {isLoading ? (
            <div className="mx-auto mb-4 h-11 w-11 rounded-full border-4 border-white/15 border-t-[#d5203a] animate-spin" />
          ) : (
            <Power className="mx-auto mb-4 h-10 w-10 text-[#ff6a78]" />
          )}
          <h1 className="text-xl font-semibold text-white md:text-2xl">{title}</h1>
          {description && <p className="mt-2 text-sm text-white/62">{description}</p>}
          {(actionLabel || secondaryLabel) && (
            <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
              {secondaryLabel && (
                <Button type="button" variant="ghost" className="rounded-full" onClick={onSecondary}>
                  {secondaryLabel}
                </Button>
              )}
              {actionLabel && (
                <Button type="button" className="rounded-full" onClick={onAction}>
                  {actionLabel}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VotePoster({ src, title, className }: VotePosterProps) {
  const [failed, setFailed] = React.useState(false);
  const normalizedSrc = src ? normalizeMediaUrl(src) : "";

  React.useEffect(() => {
    setFailed(false);
  }, [normalizedSrc]);

  return (
    <div
      className={cn(
        "relative aspect-[2/3] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#120b22]",
        className,
      )}
    >
      {normalizedSrc && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={normalizedSrc}
          alt={title}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-[linear-gradient(145deg,rgba(255,75,134,0.18),rgba(82,132,255,0.14))] px-2 text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/78">SESH</span>
          <span className="line-clamp-3 text-[10px] leading-tight text-white/48">{title}</span>
        </div>
      )}
    </div>
  );
}

type WatchPartyChildErrorBoundaryProps = {
  label: string;
  resetKey?: string | number | null;
  fallback: React.ReactNode;
  children: React.ReactNode;
};

type WatchPartyChildErrorBoundaryState = {
  hasError: boolean;
};

class WatchPartyChildErrorBoundary extends React.Component<
  WatchPartyChildErrorBoundaryProps,
  WatchPartyChildErrorBoundaryState
> {
  state: WatchPartyChildErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): WatchPartyChildErrorBoundaryState {
    return { hasError: true };
  }

  componentDidUpdate(previousProps: WatchPartyChildErrorBoundaryProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error(`[watch-party:${this.props.label}] render failed`, error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function WatchPartyJoinPageContent() {
  const params = useParams<{ inviteToken?: string | string[] }>();
  const router = useRouter();
  const rawInviteToken = params?.inviteToken;
  const inviteToken = Array.isArray(rawInviteToken)
    ? rawInviteToken[0] || ""
    : rawInviteToken || "";
  const { user, isAuthenticated, isHydrated } = useAuthStore();

  const [room, setRoom] = React.useState<WatchPartyRoom | null>(null);
  const [participants, setParticipants] = React.useState<WatchPartyParticipant[]>([]);
  const [playbackState, setPlaybackState] = React.useState<WatchPartyPlaybackState | null>(null);
  const [remoteCommand, setRemoteCommand] = React.useState<RemoteCommand>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [floatingReactions, setFloatingReactions] = React.useState<FloatingReaction[]>([]);
  const [chatMessages, setChatMessages] = React.useState<WatchPartyChatMessage[]>([]);
  const [chatInput, setChatInput] = React.useState("");
  const [isSendingChatMessage, setIsSendingChatMessage] = React.useState(false);
  const chatSendInFlightRef = React.useRef(false);
  const [chatCollapsed, setChatCollapsed] = React.useState(false);
  const [chatUnreadCount, setChatUnreadCount] = React.useState(0);
  const [chatNextCursor, setChatNextCursor] = React.useState<string | null>(null);
  const [chatHasMore, setChatHasMore] = React.useState(false);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = React.useState(false);
  const [poll, setPoll] = React.useState<WatchPartyPoll | null>(null);
  const [isPollBusy, setIsPollBusy] = React.useState(false);
  const [voteModalOpen, setVoteModalOpen] = React.useState(false);
  const [voteSearch, setVoteSearch] = React.useState("");
  const [voteResults, setVoteResults] = React.useState<VoteContentResult[]>([]);
  const [voteDraft, setVoteDraft] = React.useState<VoteDraftOption[]>([]);
  const [isVoteSearching, setIsVoteSearching] = React.useState(false);
  const [voteSearchError, setVoteSearchError] = React.useState<string | null>(null);
  const [autoVoteMode, setAutoVoteMode] = React.useState(false);
  const [nextEpisodeCountdown, setNextEpisodeCountdown] =
    React.useState<WatchPartyNextEpisodeCountdown | null>(null);
  const [countdownNow, setCountdownNow] = React.useState(() => Date.now());
  const [isJoining, setIsJoining] = React.useState(true);
  const [joinStatus, setJoinStatus] = React.useState<JoinStatus>("hydrating");
  const [joinErrorMessage, setJoinErrorMessage] = React.useState<string | null>(null);
  const [joinRetryNonce, setJoinRetryNonce] = React.useState(0);
  const [confirmAction, setConfirmAction] = React.useState<ConfirmAction>(null);
  const [isLeavingRoom, setIsLeavingRoom] = React.useState(false);
  const [isEndingRoom, setIsEndingRoom] = React.useState(false);
  const [isSyncingPlayback, setIsSyncingPlayback] = React.useState(false);
  const [syncError, setSyncError] = React.useState<string | null>(null);
  const [roomEndedOverlay, setRoomEndedOverlay] = React.useState(false);
  const [eventToasts, setEventToasts] = React.useState<RoomEventToast[]>([]);

  const chatListRef = React.useRef<HTMLDivElement>(null);
  const reactionTimersRef = React.useRef<Map<string, number>>(new Map());
  const latestSequenceRef = React.useRef(-1);
  const localTimeRef = React.useRef(0);
  const serverClockOffsetMsRef = React.useRef(0);
  const hasServerClockSampleRef = React.useRef(false);
  const smoothedRttMsRef = React.useRef(0);
  const playbackCommandQueueRef = React.useRef<Promise<void>>(Promise.resolve());
  const lastPlaybackActionRef = React.useRef<{ type: "play" | "pause" | "seek"; at: number; currentTime: number } | null>(null);
  const isHostRef = React.useRef(false);
  const redirectAfterEndRef = React.useRef<number | null>(null);
  const intentionalDisconnectRef = React.useRef(false);

  const playableContentId = room?.episodeId || room?.contentId;
  const {
    data: streamResponse,
    isLoading: isStreamLoading,
    isError: isStreamError,
    error: streamError,
    refetch: retryStreamLoad,
  } = useStreamUrl(
    playableContentId,
    { enabled: Boolean(playableContentId) },
  );
  const streamData = (streamResponse as any)?.data || streamResponse;
  const content = room?.episode || room?.content;
  const isHost =
    Boolean(room?.hostUserId && user?.id && room.hostUserId === user.id) ||
    room?.currentParticipant?.role === "HOST";
  isHostRef.current = isHost;

  const pushRoomEvent = React.useCallback((message: string) => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    setEventToasts((current) => [...current.slice(-3), { id, message }]);
    toast.message(message, { duration: 3200 });
    window.setTimeout(() => {
      setEventToasts((current) => current.filter((event) => event.id !== id));
    }, 3600);
  }, []);

  const getPlaybackTiming = React.useCallback(
    (): PlaybackTiming => ({
      serverClockOffsetMs: serverClockOffsetMsRef.current,
    }),
    [],
  );

  const observePlaybackTiming = React.useCallback(
    (state: WatchPartyPlaybackState, rttMs?: number) => {
      const serverTimeMs = getServerTimeMs(state);
      const receiveWallMs = Date.now();
      const hasMeasuredRtt = typeof rttMs === "number" && Number.isFinite(rttMs);
      const boundedRttMs = hasMeasuredRtt
        ? Math.max(0, Math.min(rttMs, 30000))
        : 0;
      const nextOffsetMs = hasMeasuredRtt
        ? serverTimeMs + boundedRttMs / 2 - receiveWallMs
        : serverTimeMs - receiveWallMs;

      if (!Number.isFinite(nextOffsetMs)) return;

      if (!hasServerClockSampleRef.current) {
        serverClockOffsetMsRef.current = nextOffsetMs;
        smoothedRttMsRef.current = boundedRttMs;
        hasServerClockSampleRef.current = true;
        return;
      }

      if (hasMeasuredRtt) {
        smoothedRttMsRef.current =
          smoothedRttMsRef.current === 0
            ? boundedRttMs
            : smoothedRttMsRef.current * 0.75 + boundedRttMs * 0.25;
        serverClockOffsetMsRef.current =
          serverClockOffsetMsRef.current * 0.75 + nextOffsetMs * 0.25;
      }
    },
    [],
  );

  const returnFromRoom = React.useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  }, [router]);

  const goHome = React.useCallback(() => {
    router.push("/");
  }, [router]);

  const retryJoinRoom = React.useCallback(() => {
    setJoinRetryNonce((value) => value + 1);
  }, []);

  const goToLogin = React.useCallback(() => {
    router.push(`/login?redirect=${encodeURIComponent(`/watch-party/join/${inviteToken}`)}`);
  }, [inviteToken, router]);

  const handlePlaybackState = React.useCallback(
    (
      state: WatchPartyPlaybackState,
      eventType: "state" | "play" | "pause" | "seek" | "sync",
    ) => {
      if ((state.sequence || 0) < latestSequenceRef.current) return;

      observePlaybackTiming(state);
      const timing = getPlaybackTiming();
      latestSequenceRef.current = state.sequence || 0;
      setPlaybackState(state);

      const drift = Math.abs(getEffectiveTime(state, timing) - localTimeRef.current);
      const isControlEvent =
        eventType === "play" || eventType === "pause" || eventType === "seek";
      // Passive 5-second state polling must not keep seeking the media element.
      // HLS playback naturally drifts by fractions of a second while buffering;
      // correcting that drift on every poll produces the visible stop/start effect.
      // Only hard-correct passive state when the client is genuinely far behind.
      const shouldCorrectDrift = drift > DRIFT_LARGE_SECONDS;

      if (
        eventType === "sync" ||
        isControlEvent ||
        (!isHostRef.current && (eventType === "state" || shouldCorrectDrift))
      ) {
        setRemoteCommand(toRemoteCommand(state, eventType, timing));
      }
    },
    [getPlaybackTiming, observePlaybackTiming],
  );

  const addFloatingReaction = React.useCallback((event: WatchPartyReactionEvent) => {
    const floatingEvent = getFloatingReaction(event);

    setFloatingReactions((current) => {
      if (current.some((item) => item.id === floatingEvent.id)) return current;
      return [...current.slice(-(REACTION_VISIBLE_LIMIT - 1)), floatingEvent];
    });

    const existingTimer = reactionTimersRef.current.get(floatingEvent.id);
    if (existingTimer) {
      window.clearTimeout(existingTimer);
    }

    const timer = window.setTimeout(() => {
      reactionTimersRef.current.delete(floatingEvent.id);
      setFloatingReactions((current) =>
        current.filter((item) => item.id !== floatingEvent.id),
      );
    }, floatingEvent.durationMs + floatingEvent.delayMs + 160);

    reactionTimersRef.current.set(floatingEvent.id, timer);
  }, []);

  React.useEffect(() => {
    return () => {
      reactionTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      reactionTimersRef.current.clear();
    };
  }, []);

  React.useEffect(() => {
    if (!isHydrated) {
      setJoinStatus("hydrating");
      setIsJoining(true);
      return;
    }
    if (!isAuthenticated) {
      setJoinStatus("unauthorized");
      setJoinErrorMessage(getJoinErrorMessage("unauthorized"));
      setIsJoining(false);
      return;
    }

    if (!inviteToken) {
      setJoinStatus("not-found");
      setJoinErrorMessage(getJoinErrorMessage("not-found"));
      setIsJoining(false);
      return;
    }

    let cancelled = false;
    setIsJoining(true);
    setJoinStatus("loading");
    setJoinErrorMessage(null);
    setError(null);
    setRoom(null);
    setParticipants([]);
    setPlaybackState(null);
    setRemoteCommand(null);
    setChatMessages([]);
    setChatNextCursor(null);
    setChatHasMore(false);
    setPoll(null);
    setNextEpisodeCountdown(null);

    api
      .post<WatchPartyRoom>(endpoints.watchParties.join, { inviteToken })
      .then((response) => {
        if (cancelled) return;
        const nextRoom = unwrapApiData(response);
        if (!nextRoom?.id) {
          throw new Error("Room payload is empty");
        }
        setRoom(nextRoom);
        setParticipants(nextRoom.participants || []);
        setJoinStatus(nextRoom.status === "ENDED" ? "ended" : "ready");
        if (nextRoom.status === "ENDED") {
          setJoinErrorMessage(getJoinErrorMessage("ended"));
          setRoomEndedOverlay(true);
        }
        if (nextRoom.playbackState) {
          observePlaybackTiming(nextRoom.playbackState);
          latestSequenceRef.current = nextRoom.playbackState.sequence || 0;
          setPlaybackState(nextRoom.playbackState);
          setRemoteCommand(
            toRemoteCommand(nextRoom.playbackState, "sync", getPlaybackTiming()),
          );
        }
      })
      .catch((joinError) => {
        if (!cancelled) {
          const status = getJoinStatusFromError(joinError);
          const message = getJoinErrorMessage(
            status,
            getRoomActionError(joinError?.message || "Не удалось подключиться к комнате."),
          );
          setJoinStatus(status);
          setJoinErrorMessage(message);
          setError(message);
        }
      })
      .finally(() => {
        if (!cancelled) setIsJoining(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    getPlaybackTiming,
    inviteToken,
    isAuthenticated,
    isHydrated,
    joinRetryNonce,
    observePlaybackTiming,
  ]);

  const {
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
  } = useWatchPartySocket({
    roomId: room?.id,
    inviteToken,
    enabled: Boolean(room?.id),
    onJoined: React.useCallback((joinedRoom: WatchPartyRoom, nextParticipants: WatchPartyParticipant[]) => {
      setRoom(joinedRoom);
      setParticipants(nextParticipants);
    }, []),
    onParticipantsUpdated: React.useCallback((nextParticipants: WatchPartyParticipant[]) => {
      setParticipants(nextParticipants);
    }, []),
    onParticipantJoined: React.useCallback(
      (participant: WatchPartyParticipant) => {
        pushRoomEvent(`👤 ${getParticipantName(participant)} присоединился`);
      },
      [pushRoomEvent],
    ),
    onParticipantLeft: React.useCallback(
      (payload: { userId: string; participant?: WatchPartyParticipant | null }) => {
        const name = payload.participant ? getParticipantName(payload.participant) : "Участник";
        pushRoomEvent(`👤 ${name} покинул комнату`);
      },
      [pushRoomEvent],
    ),
    onPlaybackState: React.useCallback(
      (
        state: WatchPartyPlaybackState,
        eventType: "state" | "play" | "pause" | "seek" | "sync",
      ) => {
        handlePlaybackState(state, eventType);
        if (isHostRef.current) return;
        if (eventType === "pause") pushRoomEvent("⏸ Владелец поставил видео на паузу");
        if (eventType === "play") pushRoomEvent("▶ Владелец продолжил просмотр");
      },
      [handlePlaybackState, pushRoomEvent],
    ),
    onHostChanged: React.useCallback((hostUserId: string, updatedRoom: WatchPartyRoom) => {
      setRoom((current) => ({ ...(current || updatedRoom), ...updatedRoom, hostUserId }));
      setParticipants(updatedRoom.participants || []);
      const host = (updatedRoom.participants || []).find(
        (item: WatchPartyParticipant) => item.userId === hostUserId,
      );
      pushRoomEvent(
        `👑 Права владельца переданы: ${getParticipantName(
          host || ({ userId: hostUserId } as WatchPartyParticipant),
        )}`,
      );
    }, [pushRoomEvent]),
    onReaction: addFloatingReaction,
    onChatMessage: React.useCallback(
      (message: WatchPartyChatMessage) => {
        const shouldScroll = isNearBottom(chatListRef.current);
        setChatMessages((current) =>
          current.some((item) => item.id === message.id) ? current : [...current, message],
        );
        if (chatCollapsed) {
          setChatUnreadCount((count) => count + 1);
        } else if (shouldScroll) {
          window.setTimeout(() => {
            if (typeof chatListRef.current?.scrollTo === "function") {
              chatListRef.current.scrollTo({
                top: chatListRef.current.scrollHeight,
                behavior: "smooth",
              });
            }
          }, 0);
        }
      },
      [chatCollapsed],
    ),
    onChatError: React.useCallback((message: string) => setError(getRoomActionError(message)), []),
    onPollChanged: React.useCallback((nextPoll: WatchPartyPoll) => setPoll(nextPoll), []),
    onPollClosed: React.useCallback(
      () => {
        pushRoomEvent("🎬 Голосование завершено");
      },
      [pushRoomEvent],
    ),
    onContentChanged: React.useCallback(
      (payload: {
        room: WatchPartyRoom;
        poll?: WatchPartyPoll;
        selectedOptionId?: string;
        countdownId?: string;
        playbackState: WatchPartyPlaybackState;
      }) => {
        setRoom(payload.room);
        setParticipants(payload.room.participants || []);
        if (payload.poll) {
          setPoll(payload.poll);
          pushRoomEvent("▶ Начался выбранный контент");
        } else {
          setNextEpisodeCountdown(null);
          pushRoomEvent("▶ Начался следующий эпизод");
        }
        handlePlaybackState(payload.playbackState, "sync");
      },
      [handlePlaybackState, pushRoomEvent],
    ),
    onNextEpisodeCountdown: React.useCallback((countdown: WatchPartyNextEpisodeCountdown) => {
      setNextEpisodeCountdown(countdown);
      setCountdownNow(Date.now());
    }, []),
    onNextEpisodeCancel: React.useCallback(() => setNextEpisodeCountdown(null), []),
    onRoomEnded: React.useCallback(() => {
      pushRoomEvent("🏁 Комната завершена");
      toast.info("Комната завершена");
      setRoom((current) => (current ? { ...current, status: "ENDED" } : current));
      setRoomEndedOverlay(true);
    }, [pushRoomEvent]),
    onConnectionChanged: React.useCallback(
      (state: "connected" | "disconnected" | "error", message?: string) => {
        if (intentionalDisconnectRef.current) return;
        if (state === "connected") {
          pushRoomEvent("Подключение восстановлено");
          setError(null);
          return;
        }

        if (state === "disconnected") {
          setError("Соединение потеряно. Мы пробуем переподключиться автоматически.");
          toast.warning("Соединение потеряно");
          return;
        }

        setError(getRoomActionError(message || "Не удалось подключиться к комнате."));
      },
      [pushRoomEvent],
    ),
    onError: React.useCallback((message: string) => setError(getRoomActionError(message)), []),
  });

  const requestTimedState = React.useCallback(
    async (roomId: string) => {
      const startedAt =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      const response = await requestState(roomId);
      const finishedAt =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      if (response.ok) observePlaybackTiming(response.data, finishedAt - startedAt);
      return response;
    },
    [observePlaybackTiming, requestState],
  );

  const requestTimedSync = React.useCallback(
    async (roomId: string) => {
      const startedAt =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      const response = await requestSync(roomId);
      const finishedAt =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      if (response.ok) observePlaybackTiming(response.data, finishedAt - startedAt);
      return response;
    },
    [observePlaybackTiming, requestSync],
  );

  React.useEffect(() => {
    if (!room?.id || !isConnected) return;
    const interval = window.setInterval(() => {
      requestTimedState(room.id).then((response) => {
        if (response.ok) handlePlaybackState(response.data, "state");
      });
    }, 5000);
    return () => window.clearInterval(interval);
  }, [handlePlaybackState, isConnected, requestTimedState, room?.id]);

  React.useEffect(() => {
    if (!room?.id) return;
    let cancelled = false;
    api
      .get<WatchPartyChatHistory>(`${endpoints.watchParties.messages(room.id)}?limit=30`)
      .then((response) => {
        if (cancelled) return;
        const history = unwrapApiData(response);
        setChatMessages(history.items || []);
        setChatNextCursor(history.nextCursor || null);
        setChatHasMore(Boolean(history.hasMore));
        window.setTimeout(() => {
          if (typeof chatListRef.current?.scrollTo === "function") {
            chatListRef.current.scrollTo({ top: chatListRef.current.scrollHeight });
          }
        }, 0);
      })
      .catch((historyError) => {
        if (!cancelled) setError(getRoomActionError(historyError?.message || "Не удалось загрузить историю чата"));
      });

    return () => {
      cancelled = true;
    };
  }, [room?.id]);

  React.useEffect(() => {
    if (!room?.id) return;
    let cancelled = false;
    api
      .get<WatchPartyPoll | null>(endpoints.watchParties.poll(room.id))
      .then((response) => {
        if (!cancelled) {
          const nextPoll = unwrapApiData(response);
          setPoll(isWatchPartyPoll(nextPoll) ? nextPoll : null);
        }
      })
      .catch(() => {
        if (!cancelled) setPoll(null);
      });
    return () => {
      cancelled = true;
    };
  }, [room?.id]);

  React.useEffect(() => {
    if (!room?.id) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      requestTimedSync(room.id).then((response) => {
        if (response.ok) handlePlaybackState(response.data, "sync");
      });
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [handlePlaybackState, requestTimedSync, room?.id]);

  React.useEffect(() => {
    if (!nextEpisodeCountdown) return;
    const interval = window.setInterval(() => setCountdownNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [nextEpisodeCountdown]);

  React.useEffect(() => {
    if (!roomEndedOverlay) return;
    redirectAfterEndRef.current = window.setTimeout(() => {
      intentionalDisconnectRef.current = true;
      disconnect();
      returnFromRoom();
    }, 1200);

    return () => {
      if (redirectAfterEndRef.current) {
        window.clearTimeout(redirectAfterEndRef.current);
        redirectAfterEndRef.current = null;
      }
    };
  }, [disconnect, returnFromRoom, roomEndedOverlay]);

  React.useEffect(() => {
    const query = voteSearch.trim();
    if (!voteModalOpen || query.length < 2) {
      setVoteResults([]);
      setVoteSearchError(null);
      return;
    }

    let cancelled = false;
    setIsVoteSearching(true);
    setVoteSearchError(null);
    const timeout = window.setTimeout(() => {
      api
        .get<ContentListResponse>(endpoints.content.list, {
          params: { search: query, limit: 8 },
        })
        .then((response) => {
          if (cancelled) return;
          const data = unwrapApiData(response);
          setVoteResults(data.items || []);
        })
        .catch(() => {
          if (!cancelled) {
            setVoteResults([]);
            setVoteSearchError("Не удалось выполнить поиск");
          }
        })
        .finally(() => {
          if (!cancelled) setIsVoteSearching(false);
        });
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [voteModalOpen, voteSearch]);

  const loadAutoSuggestions = React.useCallback(() => {
    if (!room?.contentId) return;
    setAutoVoteMode(true);
    setIsVoteSearching(true);
    api
      .get<ContentListResponse>("/users/me/watch-history/recommendations", {
        params: { contentId: room.contentId, limit: 6 },
      })
      .then((response) => {
        const data = unwrapApiData(response);
        const next = (data.items || []).slice(0, 6).map((item) => ({ content: item }));
        if (next.length >= 2) setVoteDraft(next);
        else setNotice("Рекомендации недоступны. Найдите варианты через поиск.");
      })
      .catch(() => setNotice("Рекомендации недоступны. Найдите варианты через поиск."))
      .finally(() => setIsVoteSearching(false));
  }, [room?.contentId]);

  const handleLocalPlaybackAction = React.useCallback(
    (action: { type: "play" | "pause" | "seek"; currentTime: number; playbackRate: number }) => {
      if (!isHost || !room?.id) return;

      // Media elements can emit two equivalent events very close to each other
      // while a source is being attached or playback is being restored. Sending
      // both with the same room sequence used to create a stale-event race and
      // could flip the player between play/pause. Drop only true duplicates.
      const now = Date.now();
      const previous = lastPlaybackActionRef.current;
      if (
        previous &&
        previous.type === action.type &&
        now - previous.at < 450 &&
        Math.abs(previous.currentTime - action.currentTime) < 0.75
      ) {
        return;
      }
      lastPlaybackActionRef.current = {
        type: action.type,
        at: now,
        currentTime: action.currentTime,
      };

      const roomId = room.id;
      const emit = action.type === "play" ? emitPlay : action.type === "pause" ? emitPause : emitSeek;

      // Serialize host commands. The server increments sequence after every
      // accepted command, so concurrent play/pause/seek requests must not reuse
      // the same sequence value.
      playbackCommandQueueRef.current = playbackCommandQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          const send = () =>
            emit({
              roomId,
              currentTime: action.currentTime,
              playbackRate: action.playbackRate,
              sequence: latestSequenceRef.current,
            });

          let response = await send();
          if (response.ok) {
            handlePlaybackState(response.data, action.type);
            return;
          }

          const message = String(response.message || "");
          const recoverable =
            message.toLowerCase().includes("stale") ||
            response.code === "ACK_TIMEOUT" ||
            response.code === "SOCKET_DISCONNECTED";

          if (!recoverable) {
            setError(getRoomActionError(message || "Команда воспроизведения отклонена"));
            return;
          }

          // Refresh the authoritative sequence and retry the user's command once.
          // Stale/timeout races are recovery events, not user-facing errors.
          const syncResponse = await requestTimedSync(roomId);
          if (!syncResponse.ok) return;
          handlePlaybackState(syncResponse.data, "state");

          response = await send();
          if (response.ok) {
            handlePlaybackState(response.data, action.type);
          }
        });
    },
    [emitPause, emitPlay, emitSeek, handlePlaybackState, isHost, requestTimedSync, room?.id],
  );

  const handleManualSync = React.useCallback(() => {
    if (!room?.id || isSyncingPlayback || room.status === "ENDED") return;
    if (!isConnected) {
      const message = "Соединение потеряно. Переподключитесь и повторите синхронизацию.";
      setSyncError(message);
      setError(message);
      toast.error(message);
      return;
    }

    setSyncError(null);
    setError(null);
    setIsSyncingPlayback(true);
    const toastId = toast.loading("Синхронизация началась...");

    requestTimedSync(room.id)
      .then((response) => {
        if (response.ok) {
          handlePlaybackState(response.data, "sync");
          toast.success("Просмотр синхронизирован.", { id: toastId });
          pushRoomEvent("Просмотр синхронизирован");
        } else {
          const message = getRoomActionError(response.message || "Не удалось синхронизировать воспроизведение.");
          setSyncError(message);
          setError(message);
          toast.error(message, { id: toastId });
        }
      })
      .catch(() => {
        const message = "Не удалось синхронизировать воспроизведение. Попробуйте еще раз.";
        setSyncError(message);
        setError(message);
        toast.error(message, { id: toastId });
      })
      .finally(() => setIsSyncingPlayback(false));
  }, [
    handlePlaybackState,
    isConnected,
    isSyncingPlayback,
    pushRoomEvent,
    requestTimedSync,
    room?.id,
    room?.status,
  ]);

  const handleLeave = React.useCallback(() => {
    setConfirmAction("leave");
  }, []);

  const confirmLeaveRoom = React.useCallback(() => {
    if (!room?.id || isLeavingRoom) {
      returnFromRoom();
      return;
    }

    setIsLeavingRoom(true);
    setError(null);
    leave(room.id)
      .then((response) => {
        if (!response.ok) {
          const message = getRoomActionError(response.message || "Не удалось покинуть комнату. Попробуйте еще раз.");
          setError(message);
          toast.error(message);
          return;
        }

        intentionalDisconnectRef.current = true;
        disconnect();
        toast.success("Вы покинули комнату.");
        returnFromRoom();
      })
      .catch(() => {
        const message = "Не удалось покинуть комнату. Проверьте подключение и повторите попытку.";
        setError(message);
        toast.error(message);
      })
      .finally(() => {
        setIsLeavingRoom(false);
        setConfirmAction(null);
      });
  }, [disconnect, isLeavingRoom, leave, returnFromRoom, room?.id]);

  const handleEnd = React.useCallback(() => {
    if (!room?.id || !isHost || room.status === "ENDED") return;
    setConfirmAction("end");
  }, [isHost, room?.id, room?.status]);

  const confirmEndRoom = React.useCallback(() => {
    if (!room?.id || !isHost || isEndingRoom) return;

    setIsEndingRoom(true);
    setError(null);
    endRoom(room.id)
      .then((response) => {
        if (!response.ok) {
          const message = getRoomActionError(response.message || "Не удалось завершить комнату. Попробуйте ещё раз.");
          setError(message);
          toast.error(message);
          return;
        }

        setRoom(response.data);
        setRoomEndedOverlay(true);
        pushRoomEvent("🏁 Комната завершена");
        toast.success("Комната завершена.");
      })
      .catch(() => {
        const message = "Не удалось завершить комнату. Проверьте подключение и повторите попытку.";
        setError(message);
        toast.error(message);
      })
      .finally(() => {
        setIsEndingRoom(false);
        setConfirmAction(null);
      });
  }, [endRoom, isEndingRoom, isHost, pushRoomEvent, room?.id]);
  const handleInvite = React.useCallback(() => {
    const inviteUrl =
      typeof window !== "undefined"
        ? window.location.href
        : `/watch-party/join/${inviteToken}`;
    navigator.clipboard
      ?.writeText(inviteUrl)
      .then(() => setNotice("Ссылка-приглашение скопирована."))
      .catch(() => setNotice("Скопируйте ссылку-приглашение из адресной строки."));
  }, [inviteToken]);

  const handleTransferHost = React.useCallback(
    (participant: WatchPartyParticipant) => {
      if (!room?.id || !isHost) return;
      const name = getParticipantName(participant);
      if (!window.confirm(`Передать права владельца пользователю ${name}?`)) return;
      transferHost({ roomId: room.id, targetUserId: participant.userId }).then((response) => {
        if (response.ok) {
          setRoom(response.data);
          setParticipants(response.data.participants || []);
          setNotice(`${name} теперь владелец комнаты.`);
        } else {
          setError(getRoomActionError(response.message || "Не удалось передать права владельца"));
        }
      });
    },
    [isHost, room?.id, transferHost],
  );

  const handleReaction = React.useCallback(
    (reaction: WatchPartyReactionType) => {
      if (!room?.id) return;
      const clientReactionId = createClientEventId("reaction");
      const sender =
        room.currentParticipant ||
        participants.find((participant) => participant.userId === user?.id) ||
        ({
          userId: user?.id || "current-user",
          displayName:
            [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
            user?.email ||
            "You",
          avatarUrl: user?.avatarUrl ?? null,
          role: isHost ? "HOST" : "PARTICIPANT",
          connectionStatus: "ONLINE",
          joinedAt: new Date().toISOString(),
        } as WatchPartyParticipant);

      addFloatingReaction({
        id: clientReactionId,
        roomId: room.id,
        reaction,
        sender,
        timestamp: new Date().toISOString(),
      });

      sendReaction({ roomId: room.id, reaction, clientReactionId }).then((response) => {
        if (!response.ok) {
          setFloatingReactions((current) =>
            current.filter((item) => item.id !== clientReactionId),
          );
          const timer = reactionTimersRef.current.get(clientReactionId);
          if (timer) {
            window.clearTimeout(timer);
            reactionTimersRef.current.delete(clientReactionId);
          }
          setError(getRoomActionError(response.message || "Reaction rejected"));
        }
      });
    },
    [addFloatingReaction, isHost, participants, room, sendReaction, user],
  );

  const handleLoadOlderMessages = React.useCallback(() => {
    if (!room?.id || !chatNextCursor || isLoadingOlderMessages) return;
    setIsLoadingOlderMessages(true);
    api
      .get<WatchPartyChatHistory>(
        `${endpoints.watchParties.messages(room.id)}?limit=30&beforeMessageId=${encodeURIComponent(chatNextCursor)}`,
      )
      .then((response) => {
        const history = unwrapApiData(response);
        setChatMessages((current) => {
          const existingIds = new Set(current.map((message) => message.id));
          const older = (history.items || []).filter((message) => !existingIds.has(message.id));
          return [...older, ...current];
        });
        setChatNextCursor(history.nextCursor || null);
        setChatHasMore(Boolean(history.hasMore));
      })
      .catch((loadError) => setError(getRoomActionError(loadError?.message || "Не удалось загрузить старые сообщения")))
      .finally(() => setIsLoadingOlderMessages(false));
  }, [chatNextCursor, isLoadingOlderMessages, room?.id]);

  const handleSendChatMessage = React.useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      if (!room?.id || chatSendInFlightRef.current) return;
      const text = chatInput.trim();
      if (!text) return;

      const clientMessageId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      // Clear immediately so repeated clicks/Enter cannot enqueue the same text
      // while the Socket.IO acknowledgement is still in flight.
      chatSendInFlightRef.current = true;
      setChatInput("");
      setIsSendingChatMessage(true);

      sendChatMessage({ roomId: room.id, text, clientMessageId })
        .then((response) => {
          if (!response.ok) {
            setError(getRoomActionError(response.message || "Не удалось отправить сообщение"));
            // Restore the failed text only when the user has not already started typing a new one.
            setChatInput((current) => (current ? current : text));
          }
        })
        .finally(() => {
          chatSendInFlightRef.current = false;
          setIsSendingChatMessage(false);
        });
    },
    [chatInput, room?.id, sendChatMessage],
  );

  const handleEpisodeEnded = React.useCallback(() => {
    if (!room?.id) return;

    // Only the host advances room content. If a vote is active when the current
    // video ends, close it first and immediately start the sole winner. A tied
    // result stays closed so the host can explicitly choose between leaders.
    if (isHost && poll?.id && poll.status === "ACTIVE") {
      setIsPollBusy(true);
      closePoll({ roomId: room.id, pollId: poll.id })
        .then(async (closeResponse) => {
          if (!closeResponse.ok) {
            setError(
              getRoomActionError(
                closeResponse.message || "Не удалось завершить голосование",
              ),
            );
            return;
          }

          if (!isWatchPartyPoll(closeResponse.data)) {
            setError(getRoomActionError("Не удалось завершить голосование"));
            return;
          }

          const closedPoll = closeResponse.data;
          setPoll(closedPoll);
          const winners = closedPoll.winnerOptionIds || [];
          if (winners.length !== 1) {
            if (winners.length > 1) {
              setNotice("Голосование завершено вничью. Выберите победителя вручную.");
            }
            return;
          }

          const startResponse = await startPollWinner({
            roomId: room.id,
            pollId: closedPoll.id,
            optionId: winners[0],
          });
          if (startResponse.ok) {
            setRoom(startResponse.data.room);
            setParticipants(startResponse.data.room.participants || []);
            if (isWatchPartyPoll(startResponse.data.poll)) setPoll(startResponse.data.poll);
            handlePlaybackState(startResponse.data.playbackState, "sync");
          } else {
            setError(getRoomActionError(startResponse.message || "Не удалось запустить победивший контент"));
          }
        })
        .finally(() => setIsPollBusy(false));
      return;
    }

    // Non-host clients never advance the room on their local ended event.
    if (!isHost) return;

    reportEpisodeEnded({ roomId: room.id }).then((response) => {
      if (response.ok) {
        if (response.data) setNextEpisodeCountdown(response.data);
      } else {
        setError(getRoomActionError(response.message || "Не удалось запустить отсчет до следующей серии"));
      }
    });
  }, [closePoll, handlePlaybackState, isHost, poll, reportEpisodeEnded, room?.id, startPollWinner]);

  const handleStartNextEpisodeNow = React.useCallback(() => {
    if (!room?.id || !nextEpisodeCountdown || !isHost) return;
    startNextEpisode({ roomId: room.id, countdownId: nextEpisodeCountdown.id }).then((response) => {
      if (response.ok) {
        setNextEpisodeCountdown(null);
        if (response.data) {
          setRoom(response.data.room);
          setParticipants(response.data.room.participants || []);
          handlePlaybackState(response.data.playbackState, "sync");
        }
      } else {
          setError(getRoomActionError(response.message || "Не удалось запустить следующую серию"));
      }
    });
  }, [handlePlaybackState, isHost, nextEpisodeCountdown, room?.id, startNextEpisode]);

  const handleCancelNextEpisode = React.useCallback(() => {
    if (!room?.id || !nextEpisodeCountdown || !isHost) return;
    cancelNextEpisode({ roomId: room.id, countdownId: nextEpisodeCountdown.id }).then((response) => {
      if (response.ok) setNextEpisodeCountdown(null);
      else setError(getRoomActionError(response.message || "Не удалось отменить следующую серию"));
    });
  }, [cancelNextEpisode, isHost, nextEpisodeCountdown, room?.id]);

  const addVoteOption = React.useCallback((contentResult: VoteContentResult) => {
    if (voteDraft.some((item) => item.content.id === contentResult.id)) {
      setNotice(`${contentResult.title} уже добавлен в голосование.`);
      return;
    }
    if (voteDraft.length >= 6) {
      setNotice("Можно добавить не более 6 вариантов");
      return;
    }
    setVoteDraft((current) => [...current, { content: contentResult }]);
    setNotice(`${contentResult.title} добавлен в голосование.`);
  }, [voteDraft]);

  const removeVoteOption = React.useCallback((contentId: string) => {
    setVoteDraft((current) => current.filter((draft) => draft.content.id !== contentId));
  }, []);

  const moveVoteOption = React.useCallback((contentId: string, direction: -1 | 1) => {
    setVoteDraft((current) => {
      const index = current.findIndex((draft) => draft.content.id === contentId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  }, []);

  const updateDraftEpisode = React.useCallback((contentId: string, episodeId: string) => {
    setVoteDraft((current) =>
      current.map((item) => (item.content.id === contentId ? { ...item, episodeId } : item)),
    );
  }, []);

  const handleCreatePoll = React.useCallback(() => {
    if (!room?.id || !isHost) return;
    const options = voteDraft.map((item) => ({
      contentId: item.content.id,
      episodeId: item.episodeId || undefined,
    }));

    if (options.length < 2) {
      setError("Добавьте минимум два варианта контента.");
      return;
    }

    if (voteDraft.some(needsPlayableChild)) {
      setError("Выберите конкретную серию или урок для сериала или обучения.");
      return;
    }

    setIsPollBusy(true);
    createPoll({ roomId: room.id, options })
      .then((response) => {
        if (response.ok && isWatchPartyPoll(response.data)) {
          setPoll(response.data);
          setVoteDraft([]);
          setVoteModalOpen(false);
        } else if (response.ok) {
          setVoteDraft([]);
          setVoteModalOpen(false);
        } else {
          setError(getRoomActionError(response.message || "Не удалось создать голосование"));
        }
      })
      .finally(() => setIsPollBusy(false));
  }, [createPoll, isHost, room?.id, voteDraft]);

  const handleVotePoll = React.useCallback(
    (optionId: string) => {
      if (!room?.id || !poll?.id) return;
      votePoll({ roomId: room.id, pollId: poll.id, optionId }).then((response) => {
        if (response.ok && isWatchPartyPoll(response.data)) setPoll(response.data);
        else if (!response.ok) setError(getRoomActionError(response.message || "Не удалось проголосовать"));
      });
    },
    [poll?.id, room?.id, votePoll],
  );

  const handleClosePoll = React.useCallback(() => {
    if (!room?.id || !poll?.id || !isHost) return;
    setIsPollBusy(true);
    closePoll({ roomId: room.id, pollId: poll.id })
      .then((response) => {
        if (response.ok && isWatchPartyPoll(response.data)) setPoll(response.data);
        else if (!response.ok) setError(getRoomActionError(response.message || "Не удалось завершить голосование"));
      })
      .finally(() => setIsPollBusy(false));
  }, [closePoll, isHost, poll?.id, room?.id]);

  const handleStartWinner = React.useCallback(
    (optionId?: string) => {
      if (!room?.id || !poll?.id || !isHost) return;
      setIsPollBusy(true);
      startPollWinner({ roomId: room.id, pollId: poll.id, optionId })
        .then((response) => {
          if (response.ok) {
            setRoom(response.data.room);
            setParticipants(response.data.room.participants || []);
            if (isWatchPartyPoll(response.data.poll)) setPoll(response.data.poll);
            handlePlaybackState(response.data.playbackState, "sync");
          } else {
            setError(getRoomActionError(response.message || "Не удалось запустить выбранный контент"));
          }
        })
        .finally(() => setIsPollBusy(false));
    },
    [handlePlaybackState, isHost, poll?.id, room?.id, startPollWinner],
  );

  const onlineCount = participants.filter((item) => item.connectionStatus === "ONLINE").length;
  const pollIsTied = poll?.status === "CLOSED" && (poll.winnerOptionIds?.length || 0) > 1;
  const totalVotes = (poll?.options || []).reduce((sum, option) => sum + option.voteCount, 0);
  const nextEpisodeRemainingSeconds = nextEpisodeCountdown
    ? Math.max(
        0,
        Math.ceil((new Date(nextEpisodeCountdown.startsAt).getTime() - countdownNow) / 1000),
      )
    : 0;
  const hasIncompleteStructuredVoteOption = voteDraft.some(needsPlayableChild);
  const canCreatePoll =
    voteDraft.length >= 2 && !hasIncompleteStructuredVoteOption && !isPollBusy;
  const nextEpisodeProgressPercent = nextEpisodeCountdown
    ? (nextEpisodeRemainingSeconds / nextEpisodeCountdown.durationSeconds) * 100
    : 0;

  if (!isHydrated || joinStatus === "hydrating") {
    return (
      <WatchPartyRestoreState
        title="Загружаем совместный просмотр..."
        description="Восстанавливаем авторизацию и готовим подключение к комнате."
        isLoading
      />
    );
  }

  if (joinStatus === "unauthorized") {
    return (
      <WatchPartyRestoreState
        title="Для входа в комнату необходимо авторизоваться."
        description="После входа вы вернетесь к этому приглашению."
        actionLabel="Войти"
        onAction={goToLogin}
        secondaryLabel="Вернуться на главную"
        onSecondary={goHome}
      />
    );
  }

  if (isJoining || joinStatus === "loading") {
    return (
      <WatchPartyRestoreState
        title="Подключаемся к комнате..."
        description="Загружаем совместный просмотр..."
        isLoading
      />
    );
  }

  if (!room || joinStatus === "error" || joinStatus === "not-found") {
    return (
      <WatchPartyRestoreState
        title={joinErrorMessage || "Не удалось подключиться к комнате."}
        description={
          joinStatus === "not-found"
            ? "Проверьте ссылку-приглашение или попросите владельца создать новую."
            : "Проверьте соединение и повторите попытку."
        }
        actionLabel={joinStatus === "not-found" ? undefined : "Повторить"}
        onAction={retryJoinRoom}
        secondaryLabel="Вернуться на главную"
        onSecondary={goHome}
      />
    );
  }

  if (joinStatus === "ended" || room.status === "ENDED") {
    return (
      <WatchPartyRestoreState
        title="Эта комната уже завершена."
        description="Совместный просмотр больше недоступен."
        actionLabel="Вернуться на главную"
        onAction={goHome}
      />
    );
  }

  return (
    <div className="sesh-watch-party-page">
      <div
        className="sesh-watch-party-backdrop"
        style={{
          backgroundImage: content?.thumbnailUrl
            ? `url(${normalizeMediaUrl(content.thumbnailUrl)})`
            : undefined,
        }}
      />
      <div className="sesh-room-event-stack" aria-live="polite" aria-atomic="false">
        {eventToasts.map((event) => (
          <div key={event.id} className="sesh-room-event-toast">
            {event.message}
          </div>
        ))}
      </div>
      {roomEndedOverlay && (
        <div className="sesh-room-ended-overlay">
          <div className="sesh-room-ended-panel">
            <Power className="h-10 w-10 text-[#ff6a78]" />
            <h2>Комната завершена</h2>
            <p>Владелец завершил совместный просмотр.</p>
            <Button type="button" className="rounded-full" onClick={goHome}>
              Вернуться на главную
            </Button>
          </div>
        </div>
      )}
      <div className="sesh-watch-party-shell">
        <header className="sesh-watch-party-header">
          <Button className="sesh-premium-button" variant="ghost" onClick={handleLeave}>
            <DoorOpen className="h-4 w-4" />
            Покинуть комнату
          </Button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold text-white md:text-xl">
              Совместный просмотр
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/58">
              <span>
                {isConnected
                    ? "Комната активна"
                    : connectionState === "error"
                      ? "Ошибка подключения"
                      : connectionState === "disconnected"
                        ? "Отключено"
                        : "Подключение..."}
              </span>
              <span className="h-1 w-1 rounded-full bg-white/30" aria-hidden="true" />
              <span>{onlineCount}/{participants.length} в сети</span>
              {isHost && (
                <>
                  <span className="h-1 w-1 rounded-full bg-white/30" aria-hidden="true" />
                  <span className="inline-flex items-center gap-1 text-yellow-100">
                    <Crown className="h-3.5 w-3.5" />
                    Владелец
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button className="sesh-premium-button" variant="ghost" onClick={handleInvite}>
              <Broadcast className="h-4 w-4" />
              Пригласить
            </Button>
          </div>
        </header>

        {(error || notice) && (
          <div className="sesh-watch-party-alerts grid gap-2">
            {error && (
              <div className="sesh-watch-party-inline-alert sesh-watch-party-inline-alert-error">
                {error}
              </div>
            )}
            {notice && (
              <div className="rounded-xl border border-[#0e6fb7]/30 bg-[#0e6fb7]/12 px-4 py-3 text-sm text-[#dbeeff]">
                {notice}
              </div>
            )}
          </div>
        )}

        {syncError && (
          <div className="sesh-watch-party-alerts">
            <div className="flex flex-col gap-3 rounded-xl border border-yellow-300/24 bg-yellow-400/10 px-4 py-3 text-sm text-yellow-50 sm:flex-row sm:items-center sm:justify-between">
              <span>{syncError}</span>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="rounded-full"
                onClick={handleManualSync}
                disabled={isSyncingPlayback || !isConnected}
                isLoading={isSyncingPlayback}
                loadingText="Повтор..."
              >
                Повторить
              </Button>
            </div>
          </div>
        )}

        <div className="sesh-watch-party-theater">
          <main className="min-w-0">
            <section className="sesh-watch-video relative overflow-hidden border border-white/10 bg-black">
              {streamData?.streamUrl ? (
                <WatchPartyChildErrorBoundary
                  label="video-player"
                  resetKey={playableContentId}
                  fallback={
                    <div className="flex aspect-video flex-col items-center justify-center gap-3 bg-black px-6 text-center text-sm text-white/70">
                      <p className="font-medium text-white">Не удалось загрузить видео.</p>
                      <p className="max-w-md text-white/50">
                        Произошла непредвиденная ошибка. Повторите загрузку видео.
                      </p>
                      <Button
                        type="button"
                        variant="secondary"
                        className="rounded-full"
                        onClick={() => retryStreamLoad()}
                      >
                        Повторить загрузку
                      </Button>
                    </div>
                  }
                >
                  <VideoPlayer
                    key={playableContentId}
                    src={normalizeMediaUrl(streamData.streamUrl)}
                    poster={content?.thumbnailUrl || undefined}
                    title="Совместный просмотр"
                    subtitle={isHost ? "Вы управляете просмотром" : "Синхронизация с владельцем"}
                    initialTime={
                      playbackState
                        ? getEffectiveTime(playbackState, getPlaybackTiming())
                        : 0
                    }
                    // On a content switch the new <VideoPlayer> mounts before a
                    // later socket state is guaranteed to arrive. Autoplay the new
                    // source when the authoritative room state says PLAYING.
                    autoPlay={playbackState?.playbackStatus === "PLAYING"}
                    remoteCommand={remoteCommand}
                    onPlaybackAction={handleLocalPlaybackAction}
                    onEnded={handleEpisodeEnded}
                    onTimeUpdate={(time) => {
                      localTimeRef.current = time;
                    }}
                    showPiP
                  />
                </WatchPartyChildErrorBoundary>
              ) : isStreamLoading ? (
                <VideoPlayerSkeleton />
              ) : isStreamError ? (
                <div className="flex aspect-video flex-col items-center justify-center gap-3 bg-black px-6 text-center text-sm text-white/70">
                  <p className="font-medium text-white">Не удалось загрузить видео.</p>
                  <p className="max-w-md text-white/50">
                    {streamError instanceof Error
                      ? getRoomActionError(streamError.message)
                      : "Проверьте соединение и повторите загрузку."}
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="rounded-full"
                    onClick={() => retryStreamLoad()}
                  >
                    Повторить загрузку
                  </Button>
                </div>
              ) : (
                <div className="flex aspect-video items-center justify-center bg-black px-6 text-center text-sm text-white/58">
                  Трансляция для этой комнаты пока недоступна.
                </div>
              )}

              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                {floatingReactions.map((reaction) => (
                  <div
                    key={reaction.id}
                    className="watch-party-reaction-pop"
                    style={
                      {
                        left: `${reaction.lane}%`,
                        "--wp-reaction-x": `${reaction.xOffset}px`,
                        "--wp-reaction-drift": `${reaction.drift}px`,
                        "--wp-reaction-rotation": `${reaction.rotation}deg`,
                        "--wp-reaction-end-rotation": `${reaction.endRotation}deg`,
                        "--wp-reaction-delay": `${reaction.delayMs}ms`,
                        "--wp-reaction-duration": `${reaction.durationMs}ms`,
                        "--wp-reaction-travel": `${reaction.travel}px`,
                      } as React.CSSProperties & Record<`--${string}`, string>
                    }
                    aria-hidden="true"
                  >
                    <span className="watch-party-reaction-bubble">{reaction.reaction}</span>
                  </div>
                ))}
              </div>

              <div className="sesh-watch-party-reaction-bar absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5 rounded-full border border-white/10 bg-black/42 p-1.5 shadow-lg backdrop-blur-xl">
                {QUICK_REACTIONS.map((reaction) => (
                  <Button
                    key={reaction}
                    variant="ghost"
                    size="icon"
                    className="sesh-reaction-button h-9 w-9 bg-white/8 text-lg sm:h-10 sm:w-10 sm:text-xl"
                    aria-label={`Отправить реакцию ${reaction}`}
                    onClick={() => handleReaction(reaction)}
                  >
                    <span>{reaction}</span>
                  </Button>
                ))}
              </div>

              {nextEpisodeCountdown && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/78 p-4 backdrop-blur-md">
                  <div className="sesh-glass-panel w-full max-w-2xl overflow-hidden">
                    <div className="grid sm:grid-cols-[190px_1fr]">
                      <div className="relative aspect-video bg-white/6 sm:aspect-auto">
                        {nextEpisodeCountdown.nextEpisode.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={normalizeMediaUrl(nextEpisodeCountdown.nextEpisode.thumbnailUrl)}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-white/50">
                            Далее
                          </div>
                        )}
                      </div>
                      <div className="p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ff6a78]">
                          Следующая серия
                        </p>
                        <h2 className="mt-2 line-clamp-2 text-xl font-semibold text-white">
                          {nextEpisodeCountdown.nextEpisode.title}
                        </h2>
                        <p className="mt-2 text-sm text-white/62">
                          Начнется через {nextEpisodeRemainingSeconds} сек.
                        </p>
                        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#ff2d75] to-[#6ea5ff] transition-[width] duration-300"
                            style={{
                              width: `${Math.max(0, Math.min(100, nextEpisodeProgressPercent))}%`,
                            }}
                          />
                        </div>
                        {isHost && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Button type="button" size="sm" onClick={handleStartNextEpisodeNow}>
                              Начать сейчас
                            </Button>
                            <Button type="button" variant="secondary" size="sm" onClick={handleCancelNextEpisode}>
                              Отмена
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <div className="sesh-watch-party-floating-controls">
              <Button
                variant="secondary"
                className="sesh-premium-button sesh-watch-party-sync-button"
                onClick={handleManualSync}
                disabled={!isConnected}
                isLoading={isSyncingPlayback}
                loadingText="Синхронизация..."
              >
                <Broadcast className="h-4 w-4" />
                Синхронизировать
              </Button>
              <Button
                variant="secondary"
                className="sesh-premium-button sesh-watch-party-leave-button"
                onClick={handleLeave}
                disabled={isLeavingRoom}
                isLoading={isLeavingRoom}
                loadingText="Выход..."
              >
                <DoorOpen className="h-4 w-4" />
                Покинуть комнату
              </Button>
              {isHost && (
                <Button
                  variant="secondary"
                  className="sesh-premium-button sesh-watch-party-danger-button"
                  onClick={handleEnd}
                  disabled={isEndingRoom}
                  isLoading={isEndingRoom}
                  loadingText="Завершение..."
                >
                  <Power className="h-4 w-4" />
                  Завершить комнату
                </Button>
              )}
            </div>

            <section className="sesh-now-watching mx-auto mt-4 w-full max-w-4xl overflow-hidden rounded-2xl">
              <div className="flex gap-3 p-3">
                {(content?.thumbnailUrl || room?.content?.thumbnailUrl) ? (
                  <img
                    src={normalizeMediaUrl(content?.thumbnailUrl || room?.content?.thumbnailUrl || "")}
                    alt=""
                    className="h-20 w-14 shrink-0 rounded-xl border border-white/10 object-cover shadow-lg sm:h-24 sm:w-16"
                  />
                ) : (
                  <div className="flex h-20 w-14 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xl text-white/35 sm:h-24 sm:w-16">
                    ▶
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-violet-200">
                      Сейчас смотрят · {getRoomContentKind(room)}
                    </span>
                    {getRoomEpisodeLabel(room) && (
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-white/65">
                        {getRoomEpisodeLabel(room)}
                      </span>
                    )}
                  </div>

                  <h3 className="truncate text-base font-bold text-white sm:text-lg">
                    {room?.content?.title || content?.title || "Совместный просмотр"}
                  </h3>

                  {room?.episode?.title && room.episode.title !== room.content?.title && (
                    <p className="mt-1 truncate text-sm font-medium text-white/72">
                      {room.episode.title}
                    </p>
                  )}

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/48">
                    {content?.duration ? (
                      <span>{Math.max(1, Math.round(content.duration / 60))} мин</span>
                    ) : null}
                    <span>{isHost ? "Вы управляете просмотром" : "Управляет владелец комнаты"}</span>
                  </div>

                  {content?.description && (
                    <p className="mt-1.5 line-clamp-2 max-w-2xl text-xs leading-relaxed text-white/48">
                      {content.description}
                    </p>
                  )}
                </div>
              </div>

              {getRoomContentKind(room) === "Сериал" && (
                <div className="flex items-center gap-3 border-t border-white/8 bg-gradient-to-r from-[#d70a2a]/10 via-[#7e174e]/10 to-[#0f66eb]/10 px-4 py-3 sm:px-5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/7 text-sm">↻</div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white">Сериал продолжается автоматически</p>
                    <p className="mt-0.5 text-[11px] text-white/48">После окончания текущей серии начнётся отсчёт, затем следующая серия запустится одновременно у всех участников.</p>
                  </div>
                </div>
              )}
            </section>
          </main>

          <aside className="sesh-room-panel">
            <section
              className={cn(
                "sesh-room-panel-section sesh-room-chat",
                chatCollapsed && "sesh-room-chat-collapsed",
              )}
            >
              <div className="sesh-room-panel-heading flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div className="flex items-center gap-2">
                  <ChatCircle className="h-5 w-5 text-[#69bfff]" />
                  <div>
                    <h2 className="text-sm font-semibold text-white">Чат комнаты</h2>
                    {chatCollapsed && chatUnreadCount > 0 && (
                      <p className="text-xs text-[#69bfff]">{chatUnreadCount} непрочитано</p>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-full"
                  onClick={() => {
                    setChatCollapsed((collapsed) => !collapsed);
                    setChatUnreadCount(0);
                  }}
                >
                  {chatCollapsed ? "Открыть" : "Свернуть"}
                </Button>
              </div>

              {!chatCollapsed && (
                <div className="grid min-h-0 flex-1 grid-rows-[1fr_auto]">
                  <div ref={chatListRef} className="sesh-chat-scroll min-h-0 space-y-3 overflow-y-auto p-4">
                    {chatHasMore && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="w-full rounded-full"
                        isLoading={isLoadingOlderMessages}
                        onClick={handleLoadOlderMessages}
                      >
                        Загрузить предыдущие
                      </Button>
                    )}
                    {chatMessages.length === 0 ? (
                      <div className="flex h-full min-h-44 flex-col items-center justify-center px-6 text-center">
                        <ChatCircle className="mb-3 h-8 w-8 text-white/40" />
                        <p className="text-sm font-medium text-white">Пока нет сообщений</p>
                        <p className="mt-1 text-xs text-white/48">В комнате тихо. Напишите первым, когда будете готовы.</p>
                      </div>
                    ) : (
                      chatMessages.map((message) => {
                        const mine = message.senderId === user?.id;
                        return (
                          <div
                            key={message.id}
                            className={cn("sesh-message-in flex gap-2", mine && "justify-end")}
                          >
                            {!mine && (
                              <UserAvatar
                                src={message.senderAvatarUrl}
                                name={message.senderDisplayName}
                                size="xs"
                              />
                            )}
                            <div
                              className={cn(
                                "max-w-[82%] rounded-2xl px-3 py-2 text-sm",
                                mine
                                  ? "sesh-watch-party-chat-bubble-mine text-white"
                                  : "sesh-watch-party-chat-bubble-other text-white/88",
                              )}
                            >
                              <div className="mb-1 flex items-center justify-between gap-2">
                                <span className="truncate text-xs font-semibold text-white/78">
                                  {message.senderDisplayName}
                                </span>
                                <span className="shrink-0 text-[11px] text-white/45">
                                  {new Date(message.createdAt).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <p className="break-words leading-relaxed">{renderMessageText(message.text)}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <form onSubmit={handleSendChatMessage} className="border-t border-white/10 p-3">
                    <div className="flex gap-2 rounded-full border border-white/10 bg-black/24 p-1.5">
                      <input
                        value={chatInput}
                        onChange={(event) => setChatInput(event.target.value)}
                        maxLength={500}
                        placeholder="Написать сообщение..."
                        className="min-w-0 flex-1 bg-transparent px-3 text-sm text-white outline-none placeholder:text-white/38"
                      />
                      <Button
                        type="submit"
                        size="icon"
                        className="rounded-full"
                        disabled={!chatInput.trim() || isSendingChatMessage}
                        aria-label={isSendingChatMessage ? "Отправка сообщения" : "Отправить сообщение"}
                      >
                        <PaperPlaneRight weight="fill" className={cn(isSendingChatMessage && "opacity-55")} />
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </section>

            <section className="sesh-room-panel-section sesh-room-side-section p-4">
              <div className="sesh-room-panel-heading -mx-4 -mt-4 mb-3 flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Users className="h-5 w-5 text-[#69bfff]" />
                  Участники
                </div>
                <span className="rounded-full bg-white/7 px-2.5 py-1 text-xs text-white/60">
                  {onlineCount}/{participants.length}
                </span>
              </div>
              <div className="sesh-room-participants-list space-y-2">
                {participants.length === 0 ? (
                  <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4 text-center text-sm text-white/50">
                    Ожидание участников.
                  </div>
                ) : (
                  participants.map((participant) => (
                    <div
                      key={participant.userId}
                    className="sesh-watch-party-participant group flex items-start gap-3 rounded-2xl px-3 py-2.5 transition"
                    >
                      <div className="relative">
                        <UserAvatar
                          src={participant.avatarUrl}
                          name={getParticipantName(participant)}
                          size="sm"
                        />
                        <span
                          className={cn(
                            "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#10091d]",
                            participant.connectionStatus === "ONLINE" ? "bg-emerald-400" : "bg-white/30",
                          )}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-white">
                            {getParticipantName(participant)}
                          </span>
                          {participant.role === "HOST" && <Crown className="h-4 w-4 text-yellow-300" />}
                        </div>
                        <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] leading-snug text-white/48">
                          <span className={participant.connectionStatus === "ONLINE" ? "text-emerald-300" : "text-white/38"}>
                            {participant.connectionStatus === "ONLINE" ? "В сети" : "Не в сети"}
                          </span>
                          {participant.role === "HOST" && (
                            <>
                              <span className="text-white/22">•</span>
                              <span className="text-amber-200/85">Владелец</span>
                            </>
                          )}
                          <span className="text-white/22">•</span>
                          <span>Смотрит</span>
                        </div>
                        <p className="mt-0.5 truncate text-[11px] leading-snug text-white/38">
                          {getJoinedDuration(participant.joinedAt)}
                        </p>
                      </div>
                      {isHost &&
                        participant.userId !== user?.id &&
                        participant.connectionStatus === "ONLINE" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-full opacity-0 transition group-hover:opacity-100"
                            aria-label={`Передать права владельца пользователю ${getParticipantName(participant)}`}
                            onClick={() => handleTransferHost(participant)}
                          >
                            <Crown className="h-4 w-4" />
                          </Button>
                        )}
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="sesh-room-panel-section sesh-room-side-section p-4">
              <div className="sesh-room-panel-heading -mx-4 -mt-4 mb-3 flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                <div>
                  <h2 className="text-sm font-semibold text-white">Голосование за следующий контент</h2>
                  {pollIsTied && <p className="mt-1 text-xs text-[#ffd28f]">Владелец выберет победителя при равенстве</p>}
                </div>
                {isHost && poll && poll.status !== "ACTIVE" && (
                  <Button type="button" size="sm" className="rounded-full" onClick={() => setVoteModalOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Создать голосование
                  </Button>
                )}
              </div>

              {poll && Array.isArray(poll.options) ? (
                <div className="sesh-room-poll-body space-y-3">
                  <Badge variant={poll.status === "ACTIVE" ? "secondary" : "success"}>
                    {formatPollStatus(poll.status)}
                  </Badge>
                  {poll.options.map((option) => {
                    const isSelected =
                      poll.currentUserOptionId === option.id || option.votedByCurrentUser;
                    const canVote = poll.status === "ACTIVE" && !poll.currentUserOptionId;
                    const canStart = isHost && poll.status === "CLOSED" && option.isWinner;
                    const percent = totalVotes ? Math.round((option.voteCount / totalVotes) * 100) : 0;

                    return (
                      <div
                        key={option.id}
                        className={cn(
                          "sesh-vote-card rounded-2xl border border-white/10 bg-white/6 p-3",
                          isSelected && "sesh-vote-card-selected border-[#d5203a]/38 bg-[#8f101f]/12",
                          option.isWinner && poll.status === "CLOSED" && "border-emerald-300/40 bg-emerald-300/10",
                        )}
                      >
                        <div className="flex gap-3">
                          <div className="h-24 w-16 shrink-0 overflow-hidden rounded-xl bg-black/50">
                            {getOptionImage(option) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={normalizeMediaUrl(getOptionImage(option) || "")}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-white">{getOptionTitle(option)}</p>
                                <p className="mt-1 text-xs text-white/52">
                                  {option.episode ? "Серия" : "Фильм или сериал"} - {formatVoteCount(option.voteCount)}
                                  {isSelected ? " - ваш голос" : ""}
                                </p>
                              </div>
                              {option.isWinner && poll.status === "CLOSED" ? (
                                <Badge variant="success">Победитель</Badge>
                              ) : option.isLeading && poll.status === "ACTIVE" ? (
                                <Badge variant="secondary">Лидирует</Badge>
                              ) : null}
                            </div>
                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[#ff2d75] to-[#6ea5ff] transition-[width] duration-500"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-white/68">{percent}%</span>
                              <div className="flex gap-2">
                                {poll.status === "ACTIVE" && (
                                  <Button
                                    type="button"
                                    variant={isSelected ? "secondary" : "ghost"}
                                    size="sm"
                                    className="rounded-full"
                                    disabled={!canVote}
                                    onClick={() => handleVotePoll(option.id)}
                                  >
                                    {isSelected ? "Выбрано" : "Голосовать"}
                                  </Button>
                                )}
                                {canStart && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="rounded-full"
                                    disabled={isPollBusy}
                                    onClick={() => handleStartWinner(pollIsTied ? option.id : undefined)}
                                  >
                                    <Play className="h-4 w-4" />
                                    Начать просмотр
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {isHost && poll.status === "ACTIVE" && (
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full rounded-full"
                      disabled={isPollBusy}
                      isLoading={isPollBusy}
                      onClick={handleClosePoll}
                    >
                      Завершить голосование
                    </Button>
                  )}
                </div>
              ) : (
                <div className="sesh-room-poll-body sesh-poll-empty rounded-2xl border border-dashed border-white/12 bg-white/5 p-4 text-center">
                  <Sparkle className="mx-auto mb-2 h-6 w-6 text-white/38" />
                  <p className="text-sm font-medium text-white">Голосование пока не создано</p>
                  <p className="mt-1 text-xs text-white/48">
                    {isHost ? "Создайте голосование, когда пора выбрать, что смотреть дальше." : "Ожидание владельца комнаты."}
                  </p>
                  {isHost && (
                    <Button
                      type="button"
                      size="sm"
                      className="mt-3 rounded-full"
                      onClick={() => setVoteModalOpen(true)}
                    >
                      <Plus className="h-4 w-4" />
                      Создать голосование
                    </Button>
                  )}
                </div>
              )}
            </section>
          </aside>
        </div>

        <Dialog open={confirmAction === "leave"} onOpenChange={(open) => !open && setConfirmAction(null)}>
          <DialogContent className="max-w-md border-white/10 bg-[#090512]/95 text-white">
            <DialogHeader>
              <DialogTitle>Покинуть комнату?</DialogTitle>
              <DialogDescription className="text-white/58">
                Вы действительно хотите покинуть комнату?
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                className="rounded-full"
                onClick={() => setConfirmAction(null)}
                disabled={isLeavingRoom}
              >
                Отмена
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="rounded-full"
                onClick={confirmLeaveRoom}
                isLoading={isLeavingRoom}
                loadingText="Выход..."
              >
                Покинуть
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={confirmAction === "end"} onOpenChange={(open) => !open && setConfirmAction(null)}>
          <DialogContent className="max-w-md border-white/10 bg-[#090512]/95 text-white">
            <DialogHeader>
              <DialogTitle>Завершить комнату?</DialogTitle>
              <DialogDescription className="text-white/58">
                После завершения комнаты все участники будут отключены.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                className="rounded-full"
                onClick={() => setConfirmAction(null)}
                disabled={isEndingRoom}
              >
                Отмена
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="rounded-full"
                onClick={confirmEndRoom}
                isLoading={isEndingRoom}
                loadingText="Завершение..."
              >
                Завершить комнату
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={voteModalOpen} onOpenChange={setVoteModalOpen}>
          <DialogContent className="h-[calc(100dvh-1rem)] max-h-[92dvh] w-[calc(100vw-1rem)] max-w-6xl overflow-hidden border-white/10 bg-[#090512]/95 p-0 text-white shadow-[0_30px_90px_rgba(0,0,0,0.62)] sm:h-auto sm:w-[calc(100vw-2rem)]">
            <div className="grid h-full max-h-[92dvh] min-h-0 grid-rows-[auto_1fr_auto]">
              <DialogHeader className="border-b border-white/10 p-5">
                <DialogTitle>Создать голосование</DialogTitle>
                <DialogDescription className="text-white/54">
                  Найдите контент, добавьте варианты и запустите голосование.
                </DialogDescription>
              </DialogHeader>

              <div className="min-h-0 overflow-hidden p-4 sm:p-5">
                <div className="grid h-full min-h-0 gap-5 lg:grid-cols-[minmax(320px,1fr)_minmax(320px,1fr)]">
                  <section className="flex min-h-0 flex-col gap-4">
                    <div className="flex flex-col gap-3">
                      <div className="relative">
                        <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
                        <Input
                          value={voteSearch}
                          onChange={(event) => {
                            setAutoVoteMode(false);
                            setVoteSearch(event.target.value);
                          }}
                          placeholder="Найдите фильм или сериал"
                          className="h-11 border-white/10 bg-white/7 pl-9 pr-10 text-white placeholder:text-white/35"
                          aria-label="Поиск фильма или сериала"
                        />
                        {isVoteSearching && !autoVoteMode && (
                          <div className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white/15 border-t-[#d5203a] animate-spin" />
                        )}
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-white">Подобрать автоматически</p>
                            <p className="mt-1 text-xs text-white/50">
                              Добавить несколько подходящих вариантов из каталога
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant={autoVoteMode ? "secondary" : "ghost"}
                            className="rounded-full"
                            isLoading={isVoteSearching && autoVoteMode}
                            loadingText="Подбираем..."
                            onClick={loadAutoSuggestions}
                          >
                            <Sparkle className="h-4 w-4" />
                            Подобрать
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto pr-1 sesh-chat-scroll">
                      <div className="space-y-3">
                        {voteSearch.trim().length < 2 ? (
                          <div className="rounded-2xl border border-dashed border-white/12 bg-white/5 p-5 text-sm text-white/50">
                            Начните вводить название
                          </div>
                        ) : isVoteSearching && !autoVoteMode ? (
                          <div className="rounded-2xl border border-white/10 bg-white/6 p-5 text-sm text-white/58">
                            Ищем в каталоге...
                          </div>
                        ) : voteSearchError ? (
                          <div className="rounded-2xl border border-[#d5203a]/30 bg-[#8f101f]/12 p-5 text-sm text-[#f6c8cf]">
                            {voteSearchError}
                          </div>
                        ) : voteResults.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-white/12 bg-white/5 p-5 text-sm text-white/50">
                            Ничего не найдено
                          </div>
                        ) : (
                          voteResults.map((result) => {
                            const isSelected = voteDraft.some((item) => item.content.id === result.id);
                            const meta = getVoteContentMeta(result);
                            const details = getVoteContentDetails(result);

                            return (
                              <button
                                key={result.id}
                                type="button"
                                className={cn(
                                  "sesh-vote-card group flex w-full gap-3 rounded-2xl border border-white/10 bg-white/6 p-3 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-[#d5203a]/45 sm:gap-4",
                                  isSelected && "sesh-vote-card-selected border-[#d5203a]/45 bg-[#8f101f]/16",
                                )}
                                onClick={() => addVoteOption(result)}
                                aria-pressed={isSelected}
                              >
                                <VotePoster
                                  src={result.thumbnailUrl}
                                  title={result.title}
                                  className="w-16 sm:w-[4.75rem] md:w-[5.25rem]"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="line-clamp-2 text-sm font-semibold leading-snug text-white sm:text-base">
                                        {result.title}
                                      </p>
                                      <p className="mt-1 text-xs text-white/58">{meta.join(" · ")}</p>
                                      {details.length > 0 && (
                                        <p className="mt-1 text-xs text-white/45">{details.join(" · ")}</p>
                                      )}
                                    </div>
                                    {isSelected && <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#ff6a78]" />}
                                  </div>
                                  <span
                                    className={cn(
                                      "mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-medium transition",
                                      isSelected
                                        ? "border-[#d5203a]/32 bg-[#8f101f]/18 text-[#f4d7dc]"
                                        : "border-white/10 bg-white/8 text-white/78 group-hover:border-[#d5203a]/32 group-hover:text-white",
                                    )}
                                  >
                                    {isSelected ? "Добавлено" : "Добавить"}
                                  </span>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </section>

                  <section className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-white/6 p-3 sm:p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-white">Выбранные варианты</h3>
                        <p className="mt-1 text-xs text-white/45">
                          {voteDraft.length < 2
                            ? "Нужно выбрать минимум 2 варианта"
                            : "Порядок вариантов можно изменить"}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-white/10 bg-black/18 px-2.5 py-1 text-xs text-white/62">
                        {formatOptionCount(voteDraft.length)}
                      </span>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto pr-1 sesh-chat-scroll">
                      {voteDraft.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-white/12 bg-black/16 p-5 text-center text-sm text-white/45">
                          Добавленные фильмы и сериалы появятся здесь.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {voteDraft.map((item, index) => {
                            const episode = getVoteEpisode(item.content, item.episodeId);
                            const requiresPlayableChild = needsPlayableChild(item);
                            return (
                              <div key={item.content.id} className="rounded-xl border border-white/10 bg-black/18 p-3">
                                <div className="flex gap-3">
                                  <div className="flex w-6 shrink-0 justify-center pt-1 text-xs font-semibold text-white/50">
                                    {index + 1}.
                                  </div>
                                  <VotePoster
                                    src={episode?.thumbnailUrl || item.content.thumbnailUrl}
                                    title={item.content.title}
                                    className="w-14 sm:w-16"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-start gap-2">
                                      <div className="min-w-0 flex-1">
                                        <p className="line-clamp-2 text-sm font-semibold leading-snug text-white">
                                          {getVoteDraftTitle(item)}
                                        </p>
                                        <p className="mt-1 text-xs text-white/50">{getVoteDraftSubtitle(item)}</p>
                                      </div>
                                      <button
                                        type="button"
                                        className="rounded-full p-1 text-white/45 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d5203a]/40"
                                        aria-label={`Удалить ${item.content.title}`}
                                        onClick={() => removeVoteOption(item.content.id)}
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    </div>

                                    <div className="mt-3 flex flex-wrap gap-2">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="rounded-full"
                                        disabled={index === 0}
                                        onClick={() => moveVoteOption(item.content.id, -1)}
                                      >
                                        <CaretUp className="h-4 w-4" />
                                        Выше
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="rounded-full"
                                        disabled={index === voteDraft.length - 1}
                                        onClick={() => moveVoteOption(item.content.id, 1)}
                                      >
                                        <CaretDown className="h-4 w-4" />
                                        Ниже
                                      </Button>
                                    </div>
                                  </div>
                                </div>

                                {isStructuredVoteContent(item.content) && (
                                  <label className="mt-3 block text-xs text-white/52">
                                    Серия
                                    <select
                                      value={item.episodeId || ""}
                                      onChange={(event) => updateDraftEpisode(item.content.id, event.target.value)}
                                      className={cn(
                                        "mt-1 h-10 w-full rounded-lg border bg-[#090512] px-2 text-xs text-white outline-none focus:border-[#d5203a]/45",
                                        requiresPlayableChild
                                          ? "border-[#d5203a]/45"
                                          : "border-white/10",
                                      )}
                                    >
                                      <option value="" disabled>
                                        Выберите серию
                                      </option>
                                      {(item.content.episodes || []).map((episodeOption) => (
                                        <option key={episodeOption.id} value={episodeOption.id}>
                                          Сезон {episodeOption.seasonNumber ?? "-"}, серия{" "}
                                          {episodeOption.episodeNumber ?? "-"} — {episodeOption.title}
                                        </option>
                                      ))}
                                    </select>
                                    {requiresPlayableChild && (
                                      <span className="mt-1 block text-[11px] text-[#ff9baa]">
                                        Выберите конкретную серию или урок.
                                      </span>
                                    )}
                                  </label>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-white/45">
                  {hasIncompleteStructuredVoteOption
                    ? "Для сериала или обучения нужно выбрать конкретную серию или урок."
                    : "Нужно выбрать минимум 2 варианта. Внутренние ID скрыты."}
                </p>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" className="rounded-full" onClick={() => setVoteModalOpen(false)}>
                    Отмена
                  </Button>
                  <Button
                    type="button"
                    className="rounded-full"
                    disabled={!canCreatePoll}
                    isLoading={isPollBusy}
                    loadingText="Создаем..."
                    onClick={handleCreatePoll}
                  >
                    Начать голосование
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <WatchPartyChildErrorBoundary
        label="mini-chat"
        resetKey={room.id}
        fallback={
          <div className="sesh-watch-party-mini-chat sesh-watch-party-mini-chat-error" role="status">
            Сообщения временно недоступны.
          </div>
        }
      >
        <MiniChatWidget
          className="sesh-watch-party-mini-chat"
          activeWatchParty={
            room
              ? {
                  roomId: room.id,
                  inviteToken: room.inviteToken,
                  invitationUrl: room.invitationUrl,
                  title: room.content?.title || room.episode?.title || "Совместный просмотр",
                }
              : undefined
          }
        />
      </WatchPartyChildErrorBoundary>
    </div>
  );
}

type WatchPartyPageBoundaryState = {
  error: Error | null;
};

class WatchPartyPageBoundary extends React.Component<
  { children: React.ReactNode },
  WatchPartyPageBoundaryState
> {
  state: WatchPartyPageBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): WatchPartyPageBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Keep the route visible even when a child fails during direct load/reconnect.
    // eslint-disable-next-line no-console
    console.error("[watch-party] page render failed", error, errorInfo);
  }

  private retry = () => {
    this.setState({ error: null });
    if (typeof window !== "undefined") window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <WatchPartyRestoreState
        title="Не удалось открыть комнату совместного просмотра."
        description="Произошла непредвиденная ошибка. Обновите страницу или вернитесь на главную."
        actionLabel="Повторить"
        onAction={this.retry}
        secondaryLabel="Вернуться на главную"
        onSecondary={() => {
          if (typeof window !== "undefined") window.location.assign("/");
        }}
      />
    );
  }
}

export default function WatchPartyJoinPage() {
  // This route depends heavily on browser-only state (persisted auth, sockets,
  // media APIs, local timezone formatting and live playback timestamps).
  // Render a deterministic shell for SSR + the first client render, then mount
  // the realtime room only after hydration. This prevents React from comparing
  // server markup with already-live client state and eliminates hydration
  // mismatches without disabling SSR for the rest of the application.
  const [clientMounted, setClientMounted] = React.useState(false);

  React.useEffect(() => {
    setClientMounted(true);
  }, []);

  if (!clientMounted) {
    return (
      <WatchPartyRestoreState
        title="Подключаемся к комнате..."
        description="Восстанавливаем состояние совместного просмотра."
        isLoading
      />
    );
  }

  return (
    <WatchPartyPageBoundary>
      <WatchPartyJoinPageContent />
    </WatchPartyPageBoundary>
  );
}
