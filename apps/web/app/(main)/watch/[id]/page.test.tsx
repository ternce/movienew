import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import WatchPage from "./page";

const mocks = vi.hoisted(() => ({
  contentId: "content-1",
  isAuthenticated: true,
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  copyTextToClipboard: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  contentDetail: {
    id: "content-1",
    slug: "test-movie",
    title: "Test Movie",
    contentType: "MOVIE",
    description: "Movie description",
    duration: 120,
    likeCount: 0,
  } as Record<string, unknown>,
  streamData: {
    streamUrl: "/movie.m3u8",
    title: "Test Movie",
    contentType: "MOVIE",
    duration: 120,
    availableQualities: ["1080p"],
  } as Record<string, unknown>,
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: mocks.contentId }),
  useRouter: () => ({
    push: mocks.push,
    replace: mocks.replace,
    back: mocks.back,
  }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/dynamic", () => ({
  default: () => function DynamicMock() {
    return <div data-testid="video-player" />;
  },
}));

vi.mock("@/components/player", () => ({
  VideoPlayerSkeleton: () => <div data-testid="video-player-skeleton" />,
}));

vi.mock("@/components/content", () => ({
  ContentComments: () => <div data-testid="content-comments" />,
  ContentImage: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

vi.mock("@/hooks/use-content", () => ({
  useContentDetail: () => ({
    data: mocks.contentDetail,
    isLoading: false,
    error: null,
  }),
}));

vi.mock("@/hooks/use-streaming", () => ({
  useStreamUrl: () => ({
    data: mocks.streamData,
    isLoading: false,
    error: null,
  }),
}));

vi.mock("@/hooks/use-likes", () => ({
  useContentLikeStatus: () => ({ data: { liked: false, likeCount: 0 } }),
  useLikeContent: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUnlikeContent: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("@/stores/auth.store", () => ({
  useIsAuthenticated: () => mocks.isAuthenticated,
}));

vi.mock("@/lib/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-client")>(
    "@/lib/api-client",
  );

  return {
    ...actual,
    api: {
      ...actual.api,
      get: mocks.apiGet,
      post: mocks.apiPost,
      put: mocks.apiPut,
    },
  };
});

vi.mock("@/lib/utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/utils")>(
    "@/lib/utils",
  );

  return {
    ...actual,
    copyTextToClipboard: mocks.copyTextToClipboard,
  };
});

vi.mock("sonner", () => ({
  toast: {
    error: mocks.toastError,
    success: mocks.toastSuccess,
    message: vi.fn(),
  },
}));

function renderWatchPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <WatchPage />
    </QueryClientProvider>,
  );
}

describe("WatchPage Watch Party creation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.contentId = "content-1";
    mocks.isAuthenticated = true;
    mocks.contentDetail = {
      id: "content-1",
      slug: "test-movie",
      title: "Test Movie",
      contentType: "MOVIE",
      description: "Movie description",
      duration: 120,
      likeCount: 0,
    };
    mocks.streamData = {
      streamUrl: "/movie.m3u8",
      title: "Test Movie",
      contentType: "MOVIE",
      duration: 120,
      availableQualities: ["1080p"],
    };
    mocks.apiGet.mockResolvedValue({ data: null });
    mocks.apiPut.mockResolvedValue({ data: null });
    mocks.apiPost.mockResolvedValue({
      data: {
        id: "room-1",
        inviteToken: "invite-token-1",
        invitationUrl: "/watch-party/join/invite-token-1",
      },
    });
    mocks.copyTextToClipboard.mockResolvedValue(true);
    Object.defineProperty(window.navigator, "share", {
      configurable: true,
      value: undefined,
    });
  });

  it("shows the Watch Party creation button on the watch page", () => {
    renderWatchPage();

    expect(
      screen.getByRole("button", { name: /Совместный просмотр/i }),
    ).toBeInTheDocument();
  });

  it("creates a Watch Party with the current content ID", async () => {
    renderWatchPage();

    fireEvent.click(
      screen.getByRole("button", { name: /Совместный просмотр/i }),
    );

    await waitFor(() => {
      expect(mocks.apiPost).toHaveBeenCalledWith("/watch-parties", {
        contentId: "content-1",
        episodeId: undefined,
      });
    });
  });

  it("includes the selected episode ID when the watch page has one", async () => {
    mocks.contentDetail = {
      ...mocks.contentDetail,
      contentType: "SERIES",
      currentEpisodeId: "episode-1",
    };

    renderWatchPage();

    fireEvent.click(
      screen.getByRole("button", { name: /Совместный просмотр/i }),
    );

    await waitFor(() => {
      expect(mocks.apiPost).toHaveBeenCalledWith("/watch-parties", {
        contentId: "content-1",
        episodeId: "episode-1",
      });
    });
  });

  it("does not send an invalid episode ID for standalone movies", async () => {
    renderWatchPage();

    fireEvent.click(
      screen.getByRole("button", { name: /Совместный просмотр/i }),
    );

    await waitFor(() => {
      expect(mocks.apiPost).toHaveBeenCalledWith("/watch-parties", {
        contentId: "content-1",
        episodeId: undefined,
      });
    });
  });

  it("navigates to the existing Watch Party join flow after creation", async () => {
    renderWatchPage();

    fireEvent.click(
      screen.getByRole("button", { name: /Совместный просмотр/i }),
    );

    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith(
        "/watch-party/join/invite-token-1",
      );
    });
  });

  it("creates only one room when clicked repeatedly while loading", async () => {
    let resolveCreate: (value: unknown) => void = () => undefined;
    mocks.apiPost.mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve;
      }),
    );

    renderWatchPage();

    const button = screen.getByRole("button", {
      name: /Совместный просмотр/i,
    });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(mocks.apiPost).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveCreate({
        data: {
          id: "room-1",
          inviteToken: "invite-token-1",
        },
      });
    });

    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith(
        "/watch-party/join/invite-token-1",
      );
    });
  });

  it("shows an error and does not navigate when creation fails", async () => {
    mocks.apiPost.mockRejectedValue(new Error("Create failed"));

    renderWatchPage();

    fireEvent.click(
      screen.getByRole("button", { name: /Совместный просмотр/i }),
    );

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("Create failed");
    });
    expect(mocks.push).not.toHaveBeenCalledWith(
      "/watch-party/join/invite-token-1",
    );
  });

  it("redirects unauthenticated users to login without creating a room", () => {
    mocks.isAuthenticated = false;

    renderWatchPage();

    fireEvent.click(
      screen.getByRole("button", { name: /Совместный просмотр/i }),
    );

    expect(mocks.apiPost).not.toHaveBeenCalled();
    expect(mocks.push).toHaveBeenCalledWith(
      "/login?redirect=%2Fwatch%2Fcontent-1",
    );
  });

  it("keeps the normal Share button sharing the content URL", async () => {
    renderWatchPage();

    fireEvent.click(screen.getByRole("button", { name: "Поделиться" }));

    await waitFor(() => {
      expect(mocks.copyTextToClipboard).toHaveBeenCalled();
    });
    expect(mocks.apiPost).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalledWith(
      "/watch-party/join/invite-token-1",
    );
  });
});
