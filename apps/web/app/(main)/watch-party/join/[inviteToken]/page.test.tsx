import "@testing-library/jest-dom/vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import WatchPartyJoinPage from "./page";

const inviteToken = "GiHbb05WpX4OY1Gr5-l61AsqvjeX3cKdeUxI1oRGb3s";

const mocks = vi.hoisted(() => ({
  inviteToken: "GiHbb05WpX4OY1Gr5-l61AsqvjeX3cKdeUxI1oRGb3s",
  replace: vi.fn(),
  push: vi.fn(),
  back: vi.fn(),
  router: null as null | {
    replace: ReturnType<typeof vi.fn>;
    push: ReturnType<typeof vi.fn>;
    back: ReturnType<typeof vi.fn>;
  },
  apiPost: vi.fn(),
  apiGet: vi.fn(),
  isAuthenticated: true,
  isHydrated: true,
  user: { id: "user-host", firstName: "Host", lastName: "User" },
  streamData: {
    streamUrl: "/clip.m3u8",
    title: "1",
    contentType: "CLIP",
    duration: 60,
  },
  streamLoading: false,
  streamError: null as Error | null,
  streamRefetch: vi.fn(),
  socketDisconnect: vi.fn(),
  socketOptions: null as null | {
    onPlaybackState?: (
      state: Record<string, unknown>,
      eventType: "state" | "play" | "pause" | "seek" | "sync",
    ) => void;
    onReaction?: (event: {
      id: string;
      roomId: string;
      reaction: string;
      sender: Record<string, unknown>;
      timestamp: string;
    }) => void;
  },
  sendReactionAck: vi.fn(),
  leaveAck: vi.fn(),
  endAck: vi.fn(),
  createPollAck: vi.fn(),
  socketState: {
    isConnected: false,
    connectionState: "connecting" as const,
  },
  socketError: null as string | null,
  playerThrows: false,
  lastVideoPlayerProps: null as null | Record<string, unknown>,
  miniChatThrows: false,
}));

function hasText(text: string) {
  return (_content: string, element: Element | null) => element?.textContent === text;
}

afterEach(() => {
  vi.useRealTimers();
});

function buildRoom(overrides: Record<string, unknown> = {}) {
  return {
    id: "cd51ee45-d3d7-4fdd-a6a5-0237a5ce6563",
    inviteToken,
    hostUserId: "user-host",
    contentId: "content-clip",
    episodeId: null,
    status: "WAITING",
    currentTime: 0,
    playbackStatus: "PAUSED",
    playbackRate: 1,
    sequence: 0,
    content: {
      contentType: "CLIP",
      title: "1",
    },
    episode: null,
    participants: [
      {
        userId: "user-host",
        displayName: "Host User",
        avatarUrl: null,
        role: "HOST",
        connectionStatus: "ONLINE",
        joinedAt: "2026-07-25T12:00:00.000Z",
      },
    ],
    currentParticipant: {
      userId: "user-host",
      displayName: "Host User",
      avatarUrl: null,
      role: "HOST",
      connectionStatus: "ONLINE",
      joinedAt: "2026-07-25T12:00:00.000Z",
    },
    playbackState: {
      roomId: "cd51ee45-d3d7-4fdd-a6a5-0237a5ce6563",
      inviteToken,
      hostUserId: "user-host",
      contentId: "content-clip",
      episodeId: null,
      status: "WAITING",
      playbackStatus: "PAUSED",
      currentTime: 0,
      effectiveCurrentTime: 0,
      playbackRate: 1,
      sequence: 0,
      updatedAt: "2026-07-25T12:00:00.000Z",
      serverTime: "2026-07-25T12:00:00.000Z",
    },
    ...overrides,
  };
}

function buildVoteSearchResults() {
  return [
    {
      id: "content-series",
      title: "Ходячие мертвецы",
      thumbnailUrl: "/missing-series.jpg",
      year: 2010,
      contentType: "SERIES",
      seasonCount: 11,
      episodeCount: 177,
      episodes: [
        {
          id: "episode-1",
          title: "Дни, изменившие мир",
          seasonNumber: 1,
          episodeNumber: 1,
          thumbnailUrl: null,
          duration: 2700,
        },
      ],
    },
    {
      id: "content-movie",
      title: "Джон Уик 4",
      thumbnailUrl: null,
      year: 2023,
      duration: 169 * 60,
      contentType: "MOVIE",
    },
    {
      id: "content-clip",
      title: "Mountain Trip",
      thumbnailUrl: null,
      duration: 60,
      contentType: "CLIP",
    },
  ];
}

vi.mock("next/navigation", () => ({
  useParams: () => ({ inviteToken: mocks.inviteToken }),
  useRouter: () => mocks.router,
}));

vi.mock("next/dynamic", () => ({
  default: () => function DynamicMock(props: Record<string, unknown>) {
    if (mocks.playerThrows) throw new Error("player render failed");
    mocks.lastVideoPlayerProps = props;
    return <div data-testid="watch-party-video-player" />;
  },
}));

vi.mock("@/components/player", () => ({
  VideoPlayerSkeleton: () => <div data-testid="video-player-skeleton" />,
}));

vi.mock("@/components/chat/mini-chat-widget", () => ({
  MiniChatWidget: ({ className }: { className?: string }) => {
    if (mocks.miniChatThrows) throw new Error("mini chat render failed");
    return <div data-testid="mini-chat-widget" className={className} />;
  },
}));

vi.mock("@/components/ui/avatar", () => ({
  UserAvatar: ({ name }: { name?: string }) => (
    <div data-testid="avatar">{name || "avatar"}</div>
  ),
}));

vi.mock("@/hooks/use-streaming", () => ({
  useStreamUrl: () => ({
    data: mocks.streamError || mocks.streamLoading ? undefined : { data: mocks.streamData },
    isLoading: mocks.streamLoading,
    isError: Boolean(mocks.streamError),
    error: mocks.streamError,
    refetch: mocks.streamRefetch,
  }),
}));

vi.mock("@/stores/auth.store", () => ({
  useAuthStore: () => ({
    user: mocks.user,
    isAuthenticated: mocks.isAuthenticated,
    isHydrated: mocks.isHydrated,
  }),
}));

vi.mock("@/lib/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-client")>(
    "@/lib/api-client",
  );
  return {
    ...actual,
    api: {
      ...actual.api,
      post: mocks.apiPost,
      get: mocks.apiGet,
    },
  };
});

vi.mock("@/hooks/use-watch-party-socket", async () => {
  const actual = await vi.importActual<typeof import("@/hooks/use-watch-party-socket")>(
    "@/hooks/use-watch-party-socket",
  );

  return {
    ...actual,
    useWatchPartySocket: (options: {
      onError?: (message: string) => void;
      onPlaybackState?: (
        state: Record<string, unknown>,
        eventType: "state" | "play" | "pause" | "seek" | "sync",
      ) => void;
      onReaction?: (event: {
        id: string;
        roomId: string;
        reaction: string;
        sender: Record<string, unknown>;
        timestamp: string;
      }) => void;
    }) => {
      mocks.socketOptions = options;
      if (mocks.socketError) {
        setTimeout(() => options.onError?.(mocks.socketError || ""), 0);
      }

      const okAck = <T,>(data: T) => Promise.resolve({ ok: true as const, data });
      return {
        isConnected: mocks.socketState.isConnected,
        connectionState: mocks.socketState.connectionState,
        requestState: () => okAck(buildRoom().playbackState),
        requestSync: () => okAck(buildRoom().playbackState),
        emitPlay: () => okAck(buildRoom().playbackState),
        emitPause: () => okAck(buildRoom().playbackState),
        emitSeek: () => okAck(buildRoom().playbackState),
        transferHost: () => okAck(buildRoom()),
        sendReaction: (payload: unknown) => mocks.sendReactionAck(payload),
        sendChatMessage: () => okAck({ id: "message-1" }),
        createPoll: (payload: unknown) => mocks.createPollAck(payload),
        votePoll: () => okAck({ id: "poll-1" }),
        closePoll: () => okAck({ id: "poll-1" }),
        startPollWinner: () =>
          okAck({
            room: buildRoom(),
            poll: { id: "poll-1" },
            selectedOptionId: "option-1",
            playbackState: buildRoom().playbackState,
          }),
        reportEpisodeEnded: () => okAck(null),
        startNextEpisode: () =>
          okAck({ room: buildRoom(), playbackState: buildRoom().playbackState }),
        cancelNextEpisode: () => okAck({}),
        endRoom: (roomId: string) => mocks.endAck(roomId),
        leave: (roomId: string) => mocks.leaveAck(roomId),
        disconnect: mocks.socketDisconnect,
      };
    },
  };
});

function renderJoinPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const ui = (
    <QueryClientProvider client={queryClient}>
      <WatchPartyJoinPage />
    </QueryClientProvider>
  );
  const result = render(ui);

  return {
    ...result,
    rerenderPage: () =>
      result.rerender(
        <QueryClientProvider client={queryClient}>
          <WatchPartyJoinPage />
        </QueryClientProvider>,
      ),
  };
}

describe("WatchPartyJoinPage runtime safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.router = {
      replace: mocks.replace,
      push: mocks.push,
      back: mocks.back,
    };
    mocks.isAuthenticated = true;
    mocks.isHydrated = true;
    mocks.user = { id: "user-host", firstName: "Host", lastName: "User" };
    mocks.inviteToken = inviteToken;
    mocks.socketState = {
      isConnected: false,
      connectionState: "connecting",
    };
    mocks.socketError = null;
    mocks.playerThrows = false;
    mocks.lastVideoPlayerProps = null;
    mocks.miniChatThrows = false;
    mocks.streamLoading = false;
    mocks.streamError = null;
    mocks.streamRefetch.mockResolvedValue({ data: { data: mocks.streamData } });
    mocks.socketDisconnect.mockReset();
    mocks.socketOptions = null;
    mocks.sendReactionAck.mockReset();
    mocks.sendReactionAck.mockImplementation((payload: { clientReactionId?: string; reaction?: string }) =>
      Promise.resolve({
        ok: true as const,
        data: {
          id: payload.clientReactionId || "reaction-1",
          roomId: "cd51ee45-d3d7-4fdd-a6a5-0237a5ce6563",
          reaction: payload.reaction || "❤️",
        },
      }),
    );
    mocks.leaveAck.mockResolvedValue({ ok: true, data: {} });
    mocks.endAck.mockResolvedValue({ ok: true, data: buildRoom({ status: "ENDED" }) });
    mocks.createPollAck.mockResolvedValue({ ok: true, data: { id: "poll-1" } });
    mocks.apiPost.mockResolvedValue({ success: true, data: buildRoom() });
    mocks.apiGet.mockImplementation((endpoint: string) => {
      if (endpoint.includes("/poll")) {
        return Promise.resolve({ success: true, data: null });
      }

      return Promise.resolve({
        success: true,
        data: { items: [], nextCursor: null, hasMore: false },
      });
    });
  });

  it("renders after a successful join with CLIP content and null episode", async () => {
    renderJoinPage();

    await waitFor(() => {
      expect(mocks.apiPost).toHaveBeenCalledWith("/watch-parties/join", {
        inviteToken,
      });
    });
    expect((await screen.findAllByText("1")).length).toBeGreaterThan(0);

    expect(await screen.findByText("Подключение...")).toBeInTheDocument();
    expect(screen.getAllByText("Владелец").length).toBeGreaterThan(0);
    expect(screen.getByTestId("watch-party-video-player")).toBeInTheDocument();
    expect(screen.getByTestId("mini-chat-widget")).toBeInTheDocument();
  });

  it("waits safely while the socket is still connecting after REST join", async () => {
    mocks.socketState = {
      isConnected: false,
      connectionState: "connecting",
    };

    renderJoinPage();

    expect(await screen.findByText("Подключение...")).toBeInTheDocument();
    expect((await screen.findAllByText("1")).length).toBeGreaterThan(0);
  });

  it("applies passive authoritative playback state to guests", async () => {
    const guestParticipant = {
      userId: "user-guest",
      displayName: "Guest User",
      avatarUrl: null,
      role: "PARTICIPANT",
      connectionStatus: "ONLINE",
      joinedAt: "2026-07-25T12:00:00.000Z",
    };
    mocks.user = { id: "user-guest", firstName: "Guest", lastName: "User" };
    mocks.apiPost.mockResolvedValueOnce({
      success: true,
      data: buildRoom({
        currentParticipant: guestParticipant,
        participants: [buildRoom().currentParticipant, guestParticipant],
      }),
    });

    renderJoinPage();
    expect(await screen.findByTestId("watch-party-video-player")).toBeInTheDocument();

    act(() => {
      mocks.socketOptions?.onPlaybackState?.(
        {
          ...buildRoom().playbackState,
          sequence: 1,
          playbackStatus: "PAUSED",
          currentTime: 5,
          effectiveCurrentTime: 5,
        },
        "state",
      );
    });

    await waitFor(() => {
      expect(mocks.lastVideoPlayerProps?.remoteCommand).toEqual(
        expect.objectContaining({
          playbackStatus: "PAUSED",
          currentTime: 5,
        }),
      );
    });
  });

  it("fully collapses and restores the room chat without losing room state", async () => {
    const user = userEvent.setup();
    const view = renderJoinPage();

    expect(await screen.findByTestId("watch-party-video-player")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Написать сообщение...")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Свернуть" }));

    const chatCard = view.container.querySelector(".sesh-room-chat");
    expect(chatCard).toHaveClass("sesh-room-chat-collapsed");
    expect(screen.queryByPlaceholderText("Написать сообщение...")).not.toBeInTheDocument();
    expect(screen.getByText("Участники")).toBeInTheDocument();
    expect(screen.getByText("Голосование за следующий контент")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Открыть" }));

    expect(chatCard).not.toHaveClass("sesh-room-chat-collapsed");
    expect(screen.getByPlaceholderText("Написать сообщение...")).toBeInTheDocument();
    expect(screen.getByTestId("watch-party-video-player")).toBeInTheDocument();
  });

  it("shows a reaction immediately for the sender and emits a dedupe id", async () => {
    const user = userEvent.setup();
    renderJoinPage();

    expect(await screen.findByTestId("watch-party-video-player")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /❤️/ }));

    expect(document.querySelectorAll(".watch-party-reaction-pop")).toHaveLength(1);
    expect(mocks.sendReactionAck).toHaveBeenCalledWith(
      expect.objectContaining({
        roomId: "cd51ee45-d3d7-4fdd-a6a5-0237a5ce6563",
        reaction: "❤️",
        clientReactionId: expect.stringMatching(/^reaction-/),
      }),
    );
  });

  it("dedupes the sender's server reaction echo by id", async () => {
    const user = userEvent.setup();
    renderJoinPage();

    expect(await screen.findByTestId("watch-party-video-player")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /🔥/ }));

    const payload = mocks.sendReactionAck.mock.calls[0][0] as {
      clientReactionId: string;
      roomId: string;
      reaction: "🔥";
    };

    act(() => {
      mocks.socketOptions?.onReaction?.({
        id: payload.clientReactionId,
        roomId: payload.roomId,
        reaction: payload.reaction,
        sender: buildRoom().currentParticipant,
        timestamp: "2026-07-25T12:00:01.000Z",
      });
    });

    expect(document.querySelectorAll(".watch-party-reaction-pop")).toHaveLength(1);
  });

  it("renders receiver reactions for the intended lifetime and cleans them up", async () => {
    renderJoinPage();
    expect(await screen.findByTestId("watch-party-video-player")).toBeInTheDocument();

    vi.useFakeTimers();
    act(() => {
      mocks.socketOptions?.onReaction?.({
        id: "server-reaction-1",
        roomId: "cd51ee45-d3d7-4fdd-a6a5-0237a5ce6563",
        reaction: "😂",
        sender: buildRoom().currentParticipant,
        timestamp: "2026-07-25T12:00:01.000Z",
      });
    });

    expect(document.querySelectorAll(".watch-party-reaction-pop")).toHaveLength(1);
    act(() => {
      vi.advanceTimersByTime(1900);
    });
    expect(document.querySelectorAll(".watch-party-reaction-pop")).toHaveLength(1);
    act(() => {
      vi.advanceTimersByTime(1400);
    });
    expect(document.querySelectorAll(".watch-party-reaction-pop")).toHaveLength(0);
  });

  it("keeps rapid reactions as distinct visual events", async () => {
    renderJoinPage();
    expect(await screen.findByTestId("watch-party-video-player")).toBeInTheDocument();

    act(() => {
      ["❤️", "😂", "🔥", "👏", "❤️", "😂"].forEach((reaction, index) => {
        mocks.socketOptions?.onReaction?.({
          id: `server-reaction-${index}`,
          roomId: "cd51ee45-d3d7-4fdd-a6a5-0237a5ce6563",
          reaction,
          sender: buildRoom().currentParticipant,
          timestamp: "2026-07-25T12:00:01.000Z",
        });
      });
    });

    expect(document.querySelectorAll(".watch-party-reaction-pop")).toHaveLength(6);
  });

  it("leaves only after a successful socket ACK, then disconnects intentionally and exits", async () => {
    const user = userEvent.setup();
    const view = renderJoinPage();

    expect(await screen.findByTestId("watch-party-video-player")).toBeInTheDocument();

    await user.click(view.container.querySelector(".sesh-watch-party-leave-button") as HTMLElement);
    await user.click(screen.getByRole("button", { name: "Покинуть" }));

    await waitFor(() => {
      expect(mocks.leaveAck).toHaveBeenCalledWith("cd51ee45-d3d7-4fdd-a6a5-0237a5ce6563");
      expect(mocks.socketDisconnect).toHaveBeenCalledTimes(1);
      expect(mocks.back.mock.calls.length + mocks.push.mock.calls.length).toBeGreaterThan(0);
    });
  });

  it("keeps the user in the room and resets leave loading when the ACK fails", async () => {
    const user = userEvent.setup();
    const view = renderJoinPage();
    mocks.leaveAck.mockResolvedValueOnce({
      ok: false,
      code: "ACK_TIMEOUT",
      message: "Запрос не получил ответа. Попробуйте ещё раз.",
    });

    expect(await screen.findByTestId("watch-party-video-player")).toBeInTheDocument();

    await user.click(view.container.querySelector(".sesh-watch-party-leave-button") as HTMLElement);
    await user.click(screen.getByRole("button", { name: "Покинуть" }));

    await waitFor(() => {
      expect(screen.getByText("Запрос не получил ответа. Попробуйте ещё раз.")).toBeInTheDocument();
    });
    expect(mocks.socketDisconnect).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalledWith("/");
    expect(view.container.querySelector(".sesh-watch-party-leave-button")).not.toBeDisabled();
  });

  it("ends the room through the socket ACK path only and exits after the ended delay", async () => {
    const user = userEvent.setup();
    const view = renderJoinPage();

    expect(await screen.findByTestId("watch-party-video-player")).toBeInTheDocument();

    await user.click(view.container.querySelector(".sesh-watch-party-danger-button") as HTMLElement);
    await user.click(screen.getByRole("button", { name: "Завершить комнату" }));

    await waitFor(() => {
      expect(mocks.endAck).toHaveBeenCalledWith("cd51ee45-d3d7-4fdd-a6a5-0237a5ce6563");
      expect(screen.getByText("Эта комната уже завершена.")).toBeInTheDocument();
    });
    expect(mocks.apiPost.mock.calls.some(([endpoint]) => String(endpoint).includes("/end"))).toBe(false);
    expect(mocks.socketDisconnect).not.toHaveBeenCalled();

    await waitFor(
      () => {
        expect(mocks.socketDisconnect).toHaveBeenCalledTimes(1);
        expect(mocks.back.mock.calls.length + mocks.push.mock.calls.length).toBeGreaterThan(0);
      },
      { timeout: 1800 },
    );
  });

  it("does not REST-fallback, disconnect, or leave the page when ending ACK fails", async () => {
    const user = userEvent.setup();
    const view = renderJoinPage();
    mocks.endAck.mockResolvedValueOnce({
      ok: false,
      code: "ACK_TIMEOUT",
      message: "Запрос не получил ответа. Попробуйте ещё раз.",
    });

    expect(await screen.findByTestId("watch-party-video-player")).toBeInTheDocument();

    await user.click(view.container.querySelector(".sesh-watch-party-danger-button") as HTMLElement);
    await user.click(screen.getByRole("button", { name: "Завершить комнату" }));

    await waitFor(() => {
      expect(screen.getByText("Запрос не получил ответа. Попробуйте ещё раз.")).toBeInTheDocument();
    });
    expect(mocks.apiPost.mock.calls.some(([endpoint]) => String(endpoint).includes("/end"))).toBe(false);
    expect(mocks.socketDisconnect).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalledWith("/");
    expect(view.container.querySelector(".sesh-watch-party-danger-button")).not.toBeDisabled();
  });
  it("shows a namespace connect error without crashing", async () => {
    mocks.socketError = "Invalid namespace";

    renderJoinPage();

    await waitFor(() => {
      expect(screen.getByText("Invalid namespace")).toBeInTheDocument();
    });
  });

  it("handles malformed successful payloads without throwing", async () => {
    mocks.apiPost.mockResolvedValue({
      success: true,
      data: {
        id: "room-malformed",
        inviteToken: "token",
        contentId: "content-clip",
        episodeId: null,
        status: "WAITING",
        content: { contentType: "CLIP", title: "Malformed clip" },
        participants: [],
        currentParticipant: null,
        playbackState: {
          sequence: 0,
          status: "WAITING",
          currentTime: 0,
        },
      },
    });

    renderJoinPage();

    await waitFor(() => {
      expect(screen.getAllByText("Malformed clip").length).toBeGreaterThan(0);
    });
    expect(screen.getByText("Подключение...")).toBeInTheDocument();
  });

  it("shows a restoration state until auth hydration completes", () => {
    mocks.isHydrated = false;

    const view = renderJoinPage();

    expect(screen.getByText("Загружаем совместный просмотр...")).toBeInTheDocument();
    expect(mocks.apiPost).not.toHaveBeenCalled();
    expect(view.container.querySelector(".sesh-watch-party-page")).toBeInTheDocument();
  });

  it("joins when auth hydration becomes available after the first render", async () => {
    mocks.isHydrated = false;

    const view = renderJoinPage();

    expect(screen.getByText("Загружаем совместный просмотр...")).toBeInTheDocument();
    expect(mocks.apiPost).not.toHaveBeenCalled();

    mocks.isHydrated = true;
    view.rerenderPage();

    await waitFor(() => {
      expect(mocks.apiPost).toHaveBeenCalledWith("/watch-parties/join", {
        inviteToken,
      });
    });
    expect(await screen.findByTestId("watch-party-video-player")).toBeInTheDocument();
  });

  it("joins when the route token becomes available after the first render", async () => {
    mocks.inviteToken = "";

    const view = renderJoinPage();

    expect(screen.getByText("Комната не найдена или ссылка недействительна.")).toBeInTheDocument();
    expect(mocks.apiPost).not.toHaveBeenCalled();

    mocks.inviteToken = inviteToken;
    view.rerenderPage();

    await waitFor(() => {
      expect(mocks.apiPost).toHaveBeenCalledWith("/watch-parties/join", {
        inviteToken,
      });
    });
    expect((await screen.findAllByText("1")).length).toBeGreaterThan(0);
  });

  it("keeps a direct invite URL recoverable when the user is not authenticated", async () => {
    const user = userEvent.setup();
    mocks.isAuthenticated = false;

    renderJoinPage();

    expect(screen.getByText("Для входа в комнату необходимо авторизоваться.")).toBeInTheDocument();
    expect(screen.getByText("После входа вы вернетесь к этому приглашению.")).toBeInTheDocument();
    expect(mocks.apiPost).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Войти" }));

    expect(mocks.push).toHaveBeenCalledWith(
      `/login?redirect=${encodeURIComponent(`/watch-party/join/${inviteToken}`)}`,
    );
  });

  it("shows a retryable Russian error when direct join restoration fails", async () => {
    const user = userEvent.setup();
    mocks.apiPost
      .mockRejectedValueOnce(new Error("connection failed"))
      .mockResolvedValueOnce({ success: true, data: buildRoom() });

    renderJoinPage();

    expect(
      await screen.findByText("Соединение потеряно. Переподключитесь и повторите действие."),
    ).toBeInTheDocument();
    expect(screen.getByText("Проверьте соединение и повторите попытку.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Повторить" }));

    await waitFor(() => {
      expect(mocks.apiPost).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByTestId("watch-party-video-player")).toBeInTheDocument();
  });

  it("shows an ended-room state instead of a blank Watch Party page", async () => {
    mocks.apiPost.mockResolvedValue({
      success: true,
      data: buildRoom({ status: "ENDED" }),
    });

    renderJoinPage();

    expect(await screen.findByText("Эта комната уже завершена.")).toBeInTheDocument();
    expect(screen.getByText("Совместный просмотр больше недоступен.")).toBeInTheDocument();
    expect(screen.queryByTestId("watch-party-video-player")).not.toBeInTheDocument();
  });

  it("keeps the restored room visible and offers retry when stream URL loading fails", async () => {
    const user = userEvent.setup();
    mocks.streamError = new Error("stream unavailable");

    const view = renderJoinPage();

    expect(await screen.findByText(hasText("Не удалось загрузить видео."))).toBeInTheDocument();
    expect(screen.getByText("stream unavailable")).toBeInTheDocument();
    expect(view.container.querySelector(".sesh-watch-party-page")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Повторить загрузку" }));

    expect(mocks.streamRefetch).toHaveBeenCalled();
    expect(screen.getByTestId("mini-chat-widget")).toBeInTheDocument();
  });

  it("renders vote search results as readable Russian cards and prevents duplicates", async () => {
    const user = userEvent.setup();
    mocks.apiGet.mockImplementation((endpoint: string) => {
      if (endpoint === "/content") {
        return Promise.resolve({ success: true, data: { items: buildVoteSearchResults() } });
      }
      if (endpoint.includes("/poll")) {
        return Promise.resolve({ success: true, data: null });
      }
      return Promise.resolve({ success: true, data: { items: [], nextCursor: null, hasMore: false } });
    });

    renderJoinPage();

    await user.click((await screen.findAllByRole("button", { name: /Создать голосование/ }))[0]);
    expect(screen.getByRole("button", { name: "Начать голосование" })).toBeDisabled();

    await user.type(screen.getByLabelText("Поиск фильма или сериала"), "ход");

    expect(await screen.findByText("Ходячие мертвецы")).toBeInTheDocument();
    expect(screen.getByText("Сериал · 2010")).toBeInTheDocument();
    expect(screen.getByText("11 сезонов · 177 серий")).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /Ходячие мертвецы/ })[0]);

    expect(screen.getByText("Добавлено")).toBeInTheDocument();
    expect(screen.getByText("1 из 6 вариант")).toBeInTheDocument();
    expect(screen.getByText("Нужно выбрать минимум 2 варианта")).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /Ходячие мертвецы/ })[0]);

    expect(screen.getByText("Ходячие мертвецы уже добавлен в голосование.")).toBeInTheDocument();
  });

  it("keeps selected vote options readable when adding, reordering, selecting an episode, and removing", async () => {
    const user = userEvent.setup();
    mocks.apiGet.mockImplementation((endpoint: string) => {
      if (endpoint === "/content") {
        return Promise.resolve({ success: true, data: { items: buildVoteSearchResults() } });
      }
      if (endpoint.includes("/poll")) {
        return Promise.resolve({ success: true, data: null });
      }
      return Promise.resolve({ success: true, data: { items: [], nextCursor: null, hasMore: false } });
    });

    renderJoinPage();

    await user.click((await screen.findAllByRole("button", { name: /Создать голосование/ }))[0]);
    await user.type(screen.getByLabelText("Поиск фильма или сериала"), "джон");

    await screen.findAllByText("Джон Уик 4");
    await user.click(screen.getAllByRole("button", { name: /Ходячие мертвецы/ })[0]);
    await user.click(screen.getAllByRole("button", { name: /Джон Уик 4/ })[0]);

    expect(screen.getByText("2 из 6 варианта")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Начать голосование" })).toBeDisabled();

    await user.selectOptions(screen.getByRole("combobox"), "episode-1");
    expect(screen.getByRole("button", { name: "Начать голосование" })).not.toBeDisabled();
    expect(screen.getByText("Ходячие мертвецы — Сезон 1, Серия 1")).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /Ниже/ })[0]);
    await user.click(screen.getByRole("button", { name: /Удалить Джон Уик 4/ }));

    expect(screen.getByText("1 из 6 вариант")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Начать голосование" })).toBeDisabled();
  });

  it("prevents submitting a structured poll option until an episode is selected", async () => {
    const user = userEvent.setup();
    mocks.apiGet.mockImplementation((endpoint: string) => {
      if (endpoint === "/content") {
        return Promise.resolve({ success: true, data: { items: buildVoteSearchResults() } });
      }
      if (endpoint.includes("/poll")) {
        return Promise.resolve({ success: true, data: null });
      }
      return Promise.resolve({ success: true, data: { items: [], nextCursor: null, hasMore: false } });
    });

    renderJoinPage();

    await user.click((await screen.findAllByRole("button", { name: /Создать голосование/ }))[0]);
    await user.type(screen.getByLabelText("Поиск фильма или сериала"), "ход");

    await screen.findByText("Ходячие мертвецы");
    await user.click(screen.getAllByRole("button", { name: /Ходячие мертвецы/ })[0]);
    await user.click(screen.getAllByRole("button", { name: /Джон Уик 4/ })[0]);

    const submitButton = screen.getByRole("button", { name: "Начать голосование" });
    expect(submitButton).toBeDisabled();
    expect(screen.getByText("Выберите конкретную серию или урок.")).toBeInTheDocument();
    expect(mocks.createPollAck).not.toHaveBeenCalled();

    await user.selectOptions(screen.getByRole("combobox"), "episode-1");
    expect(submitButton).not.toBeDisabled();
    await user.click(submitButton);

    await waitFor(() => {
      expect(mocks.createPollAck).toHaveBeenCalledWith({
        roomId: "cd51ee45-d3d7-4fdd-a6a5-0237a5ce6563",
        options: [
          { contentId: "content-series", episodeId: "episode-1" },
          { contentId: "content-movie", episodeId: undefined },
        ],
      });
    });
  });

  it("keeps the room shell visible if Mini Chat fails during render", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.miniChatThrows = true;

    const view = renderJoinPage();

    expect((await screen.findAllByText("1")).length).toBeGreaterThan(0);
    expect(screen.getByText("Сообщения временно недоступны.")).toBeInTheDocument();
    expect(view.container.querySelector(".sesh-watch-party-page")).toBeInTheDocument();
    expect(screen.getByTestId("watch-party-video-player")).toBeInTheDocument();

    consoleError.mockRestore();
  });

  it("keeps the room shell visible if the player fails during render", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.playerThrows = true;

    const view = renderJoinPage();

    expect(await screen.findByText(hasText("Не удалось загрузить видео."))).toBeInTheDocument();
    expect(screen.getByText("Произошла непредвиденная ошибка. Повторите загрузку видео.")).toBeInTheDocument();
    expect(view.container.querySelector(".sesh-watch-party-page")).toBeInTheDocument();
    expect(screen.getByTestId("mini-chat-widget")).toBeInTheDocument();

    consoleError.mockRestore();
  });

  it("renders a visible branded shell for every recovery state", async () => {
    mocks.isHydrated = false;
    const hydratingView = renderJoinPage();
    expect(screen.getByText("Загружаем совместный просмотр...")).toBeInTheDocument();
    expect(hydratingView.container.querySelector(".sesh-watch-party-page")).toBeInTheDocument();
    hydratingView.unmount();

    mocks.isHydrated = true;
    mocks.isAuthenticated = false;
    const unauthorizedView = renderJoinPage();
    expect(screen.getByText("Для входа в комнату необходимо авторизоваться.")).toBeInTheDocument();
    expect(unauthorizedView.container.querySelector(".sesh-watch-party-page")).toBeInTheDocument();
    unauthorizedView.unmount();

    mocks.isAuthenticated = true;
    mocks.apiPost.mockRejectedValueOnce(new Error("connection failed"));
    const errorView = renderJoinPage();
    expect(await screen.findByText("Соединение потеряно. Переподключитесь и повторите действие.")).toBeInTheDocument();
    expect(errorView.container.querySelector(".sesh-watch-party-page")).toBeInTheDocument();
  });
});
