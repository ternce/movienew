import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

import { MiniChatGateway } from './mini-chat.gateway';
import { MiniChatService } from './mini-chat.service';

const JWT_SECRET = 'test-secret';

function createRedisMock() {
  const counters = new Map<string, number>();
  return {
    incr: jest.fn(async (key: string) => {
      const next = (counters.get(key) ?? 0) + 1;
      counters.set(key, next);
      return next;
    }),
    expire: jest.fn(async () => 1),
  };
}

function createSocket(userId?: string) {
  const token = userId ? jwt.sign({ sub: userId }, JWT_SECRET) : undefined;
  return {
    id: `socket-${Math.random().toString(16).slice(2)}`,
    handshake: {
      headers: { origin: 'http://localhost:3000' },
      auth: token ? { token } : {},
    },
    join: jest.fn(async () => undefined),
    disconnect: jest.fn(),
    emit: jest.fn(),
  } as any;
}

function messagePayload() {
  return {
    id: 'message-1',
    conversationId: 'conversation-1',
    senderUserId: 'user-1',
    type: 'TEXT',
    text: 'Hello',
    reactionCode: null,
    clientMessageId: 'client-1',
    createdAt: new Date('2026-07-25T12:00:00.000Z'),
    sender: { id: 'user-1', displayName: 'One User' },
  };
}

function conversationPayload(userId = 'user-1') {
  return {
    id: 'conversation-1',
    otherUser: { id: userId === 'user-1' ? 'user-2' : 'user-1', displayName: 'Two User' },
    latestMessage: messagePayload(),
    unreadCount: userId === 'user-1' ? 0 : 1,
    createdAt: new Date('2026-07-25T12:00:00.000Z'),
    updatedAt: new Date('2026-07-25T12:00:00.000Z'),
  };
}

function createGateway() {
  const redis = createRedisMock();
  const service = {
    getTotalUnreadCount: jest.fn().mockResolvedValue(0),
    getConversation: jest.fn((conversationId: string, userId: string) =>
      Promise.resolve({ ...conversationPayload(userId), id: conversationId }),
    ),
    sendMessage: jest.fn().mockResolvedValue({
      message: messagePayload(),
      participantUserIds: ['user-1', 'user-2'],
      deduped: false,
    }),
    markAsRead: jest.fn().mockResolvedValue({
      conversationId: 'conversation-1',
      lastReadMessageId: 'message-1',
      unreadCount: 0,
      totalUnreadCount: 0,
    }),
  };
  const config = {
    get: jest.fn((key: string, fallback?: unknown) => {
      if (key === 'JWT_SECRET') return JWT_SECRET;
      if (key === 'CORS_ORIGINS') return 'http://localhost:3000';
      return fallback;
    }),
  };
  const gateway = new MiniChatGateway(
    config as unknown as ConfigService,
    service as unknown as MiniChatService,
    redis as any,
  );
  const serverRooms = new Map<string, { emit: jest.Mock }>();
  gateway.server = {
    to: jest.fn((room: string) => {
      if (!serverRooms.has(room)) {
        serverRooms.set(room, { emit: jest.fn() });
      }
      return serverRooms.get(room);
    }),
  } as any;

  return { gateway, redis, service, serverRooms };
}

describe('MiniChatGateway', () => {
  it('authenticates sockets with the existing JWT handshake pattern', async () => {
    const { gateway } = createGateway();
    const socket = createSocket('user-1');

    await gateway.handleConnection(socket);

    expect(socket.disconnect).not.toHaveBeenCalled();
    expect(socket.userId).toBe('user-1');
    expect(socket.join).toHaveBeenCalledWith('user:user-1');
    expect(socket.emit).toHaveBeenCalledWith('chat:unread-updated', {
      unreadCount: 0,
    });
  });

  it('rejects unauthenticated sockets', async () => {
    const { gateway } = createGateway();
    const socket = createSocket();

    await gateway.handleConnection(socket);

    expect(socket.disconnect).toHaveBeenCalled();
    expect(socket.join).not.toHaveBeenCalled();
  });

  it('authorizes chat joins before joining a conversation room', async () => {
    const { gateway, service } = createGateway();
    const socket = createSocket('user-1');
    await gateway.handleConnection(socket);

    const ack = jest.fn();
    await gateway.handleJoin(socket, { conversationId: 'conversation-1' }, ack);

    expect(service.getConversation).toHaveBeenCalledWith(
      'conversation-1',
      'user-1',
    );
    expect(socket.join).toHaveBeenCalledWith('chat:conversation:conversation-1');
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });

  it('persists messages before delivering them to both participants', async () => {
    const { gateway, service, serverRooms } = createGateway();
    const socket = createSocket('user-1');
    await gateway.handleConnection(socket);

    const ack = jest.fn();
    await gateway.handleMessageSend(
      socket,
      {
        conversationId: 'conversation-1',
        text: 'Hello',
        clientMessageId: 'client-1',
      },
      ack,
    );

    expect(service.sendMessage).toHaveBeenCalledWith('user-1', {
      conversationId: 'conversation-1',
      type: undefined,
      text: 'Hello',
      reactionCode: undefined,
      clientMessageId: 'client-1',
    });
    expect(serverRooms.get('user:user-1')?.emit).toHaveBeenCalledWith(
      'chat:message',
      expect.objectContaining({ conversationId: 'conversation-1' }),
    );
    expect(serverRooms.get('user:user-2')?.emit).toHaveBeenCalledWith(
      'chat:message',
      expect.objectContaining({ conversationId: 'conversation-1' }),
    );
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });

  it('does not rebroadcast a deduped clientMessageId retry', async () => {
    const { gateway, service, serverRooms } = createGateway();
    service.sendMessage.mockResolvedValueOnce({
      message: messagePayload(),
      participantUserIds: ['user-1', 'user-2'],
      deduped: true,
    });
    const socket = createSocket('user-1');
    await gateway.handleConnection(socket);

    await gateway.handleMessageSend(
      socket,
      {
        conversationId: 'conversation-1',
        text: 'Retry',
        clientMessageId: 'client-1',
      },
      jest.fn(),
    );

    expect(serverRooms.get('user:user-2')?.emit).toBeUndefined();
  });

  it('rate limits message sending', async () => {
    const { gateway, service } = createGateway();
    const socket = createSocket('user-1');
    await gateway.handleConnection(socket);

    for (let i = 0; i < 10; i += 1) {
      await gateway.handleMessageSend(
        socket,
        { conversationId: 'conversation-1', text: `Message ${i}` },
        jest.fn(),
      );
    }

    const ack = jest.fn();
    await gateway.handleMessageSend(
      socket,
      { conversationId: 'conversation-1', text: 'Too much' },
      ack,
    );

    expect(service.sendMessage).toHaveBeenCalledTimes(10);
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
  });

  it('keeps delivery isolated to conversation participants', async () => {
    const { gateway, serverRooms } = createGateway();
    const socket = createSocket('user-1');
    await gateway.handleConnection(socket);

    await gateway.handleMessageSend(
      socket,
      { conversationId: 'conversation-1', text: 'Hello' },
      jest.fn(),
    );

    expect(serverRooms.has('user:user-1')).toBe(true);
    expect(serverRooms.has('user:user-2')).toBe(true);
    expect(serverRooms.has('user:user-3')).toBe(false);
  });

  it('marks reads only for the authenticated participant', async () => {
    const { gateway, service } = createGateway();
    const socket = createSocket('user-1');
    await gateway.handleConnection(socket);

    const ack = jest.fn();
    await gateway.handleRead(
      socket,
      { conversationId: 'conversation-1', messageId: 'message-1' },
      ack,
    );

    expect(service.markAsRead).toHaveBeenCalledWith(
      'conversation-1',
      'user-1',
      'message-1',
    );
    expect(socket.emit).toHaveBeenCalledWith(
      'chat:read',
      expect.objectContaining({ lastReadMessageId: 'message-1' }),
    );
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });
});
