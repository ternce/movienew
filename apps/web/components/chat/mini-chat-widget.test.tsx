import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MiniChatWidget } from "./mini-chat-widget";

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  joinConversation: vi.fn(),
  sendMessage: vi.fn(),
  markRead: vi.fn(),
  user: { id: "user-1" },
}));

vi.mock("@/stores/auth.store", () => ({
  useAuthStore: () => ({
    isAuthenticated: true,
    isHydrated: true,
    user: mocks.user,
  }),
}));

vi.mock("@/hooks/use-mini-chat-socket", () => ({
  useMiniChatSocket: () => ({
    connected: true,
    joinConversation: mocks.joinConversation,
    sendMessage: mocks.sendMessage,
    markRead: mocks.markRead,
  }),
}));

vi.mock("@/lib/api/endpoints", () => ({
  api: {
    get: mocks.apiGet,
    post: mocks.apiPost,
  },
  endpoints: {
    chat: {
      conversations: "/chat/conversations",
      messages: (conversationId: string) =>
        `/chat/conversations/${conversationId}/messages`,
      userSearch: "/chat/users/search",
    },
  },
}));

describe("MiniChatWidget responsive UI behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.className = "";
    mocks.apiGet.mockResolvedValue({
      data: {
        items: [
          {
            id: "conversation-1",
            otherUser: {
              id: "user-2",
              displayName: "Mobile Friend",
              avatarUrl: null,
            },
            latestMessage: {
              id: "message-1",
              conversationId: "conversation-1",
              senderUserId: "user-2",
              text: "Hello",
              type: "TEXT",
              createdAt: "2026-07-25T12:00:00.000Z",
            },
            unreadCount: 0,
            updatedAt: "2026-07-25T12:00:00.000Z",
          },
        ],
        unreadCount: 0,
        nextCursor: null,
        hasMore: false,
      },
    });
    mocks.sendMessage.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    document.body.className = "";
  });

  it("opens with an obvious close action and hides mobile navigation via body state", async () => {
    const user = userEvent.setup();
    render(
      <>
        <div data-testid="page-state">page still mounted</div>
        <nav className="sesh-mobile-bottom-nav">bottom nav</nav>
        <MiniChatWidget />
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Открыть сообщения" }));

    expect(screen.getByRole("button", { name: "Закрыть сообщения" })).toBeInTheDocument();
    expect(document.body).toHaveClass("sesh-mini-chat-open");
    expect(screen.getByTestId("page-state")).toBeInTheDocument();
  });

  it("closes without unmounting page state or clearing loaded chat state", async () => {
    const user = userEvent.setup();
    render(
      <>
        <div data-testid="page-state">page still mounted</div>
        <MiniChatWidget />
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Открыть сообщения" }));
    expect(await screen.findByText("Mobile Friend")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Закрыть сообщения" }));

    expect(document.body).not.toHaveClass("sesh-mini-chat-open");
    expect(screen.getByTestId("page-state")).toBeInTheDocument();
    expect(screen.queryByLabelText("Сообщения")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Открыть сообщения" }));
    await waitFor(() => {
      expect(screen.getByText("Mobile Friend")).toBeInTheDocument();
    });
  });
});
