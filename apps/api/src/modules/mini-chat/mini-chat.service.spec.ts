import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DirectMessageType } from '@prisma/client';
import { createHash } from 'crypto';

import { PrismaService } from '../../config/prisma.service';
import { MINI_CHAT_MESSAGE_MAX_LENGTH, MiniChatService } from './mini-chat.service';

const now = new Date('2026-07-25T12:00:00.000Z');

function user(id: string, name: string) {
  return {
    id,
    firstName: name,
    lastName: 'User',
    username: name.toLowerCase(),
    avatarUrl: null,
  };
}

function participant(userId: string, conversationId = 'conversation-1') {
  return {
    conversationId,
    userId,
    lastReadMessageId: null,
    joinedAt: now,
    user: user(userId, userId === 'user-1' ? 'One' : 'Two'),
  };
}

function conversation(overrides: Record<string, unknown> = {}) {
  return {
    id: 'conversation-1',
    participantKey: pairKey('user-1', 'user-2'),
    createdAt: now,
    updatedAt: now,
    participants: [participant('user-1'), participant('user-2')],
    messages: [],
    ...overrides,
  };
}

function message(overrides: Record<string, unknown> = {}) {
  return {
    id: 'message-1',
    conversationId: 'conversation-1',
    senderUserId: 'user-1',
    type: DirectMessageType.TEXT,
    text: 'Hello https://example.com',
    reactionCode: null,
    clientMessageId: 'client-1',
    createdAt: now,
    sender: user('user-1', 'One'),
    ...overrides,
  };
}

function pairKey(a: string, b: string) {
  const [first, second] = [a, b].sort();
  return createHash('sha256').update(`${first}:${second}`).digest('hex');
}

function createPrismaMock() {
  const tx = {
    directMessage: {
      create: jest.fn(),
    },
    directConversation: {
      update: jest.fn(),
    },
  };

  return {
    user: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    directConversation: {
      upsert: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    directConversationParticipant: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    directMessage: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(tx)),
    tx,
  };
}

describe('MiniChatService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: MiniChatService;

  beforeEach(() => {
    prisma = createPrismaMock();
    prisma.directMessage.count.mockResolvedValue(0);
    prisma.directConversationParticipant.findMany.mockResolvedValue([]);
    service = new MiniChatService(prisma as unknown as PrismaService);
  });

  it('creates or finds a unique one-to-one conversation for an unordered user pair', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'user-2' });
    prisma.directConversation.upsert.mockResolvedValue(conversation());

    await service.createOrGetConversation('user-1', 'user-2');
    await service.createOrGetConversation('user-2', 'user-1');

    expect(prisma.directConversation.upsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { participantKey: pairKey('user-1', 'user-2') },
      }),
    );
    expect(prisma.directConversation.upsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { participantKey: pairKey('user-1', 'user-2') },
      }),
    );
  });

  it('rejects creating a conversation with yourself', async () => {
    await expect(
      service.createOrGetConversation('user-1', 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.directConversation.upsert).not.toHaveBeenCalled();
  });

  it('rejects creating a conversation with a missing user', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(
      service.createOrGetConversation('user-1', 'missing-user'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('sends a text message after participant authorization', async () => {
    prisma.directConversation.findFirst.mockResolvedValue(conversation());
    prisma.directMessage.findFirst.mockResolvedValue(null);
    prisma.tx.directMessage.create.mockResolvedValue(message());

    const result = await service.sendMessage('user-1', {
      conversationId: 'conversation-1',
      text: ' Hello https://example.com ',
      clientMessageId: 'client-1',
    });

    expect(prisma.tx.directMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          conversationId: 'conversation-1',
          senderUserId: 'user-1',
          text: 'Hello https://example.com',
          clientMessageId: 'client-1',
        }),
      }),
    );
    expect(result.message.text).toBe('Hello https://example.com');
    expect(result.participantUserIds).toEqual(['user-1', 'user-2']);
  });

  it('returns an existing message for duplicate clientMessageId', async () => {
    prisma.directConversation.findFirst.mockResolvedValue(conversation());
    prisma.directMessage.findFirst.mockResolvedValue(message());

    const result = await service.sendMessage('user-1', {
      conversationId: 'conversation-1',
      text: 'Retry',
      clientMessageId: 'client-1',
    });

    expect(result.deduped).toBe(true);
    expect(prisma.tx.directMessage.create).not.toHaveBeenCalled();
  });

  it('returns an existing message when a concurrent duplicate insert wins first', async () => {
    prisma.directConversation.findFirst.mockResolvedValue(conversation());
    prisma.directMessage.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(message());
    prisma.tx.directMessage.create.mockRejectedValue({ code: 'P2002' });

    const result = await service.sendMessage('user-1', {
      conversationId: 'conversation-1',
      text: 'Retry',
      clientMessageId: 'client-1',
    });

    expect(result.deduped).toBe(true);
    expect(result.message.id).toBe('message-1');
  });

  it('rejects unauthorized conversation message access', async () => {
    prisma.directConversation.findFirst.mockResolvedValue(null);

    await expect(
      service.sendMessage('stranger', {
        conversationId: 'conversation-1',
        text: 'Nope',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('stores an XSS-looking payload only as message text', async () => {
    const payload = '<img src=x onerror=alert(1)>';
    prisma.directConversation.findFirst.mockResolvedValue(conversation());
    prisma.tx.directMessage.create.mockResolvedValue(message({ text: payload }));

    const result = await service.sendMessage('user-1', {
      conversationId: 'conversation-1',
      text: payload,
    });

    expect(result.message.text).toBe(payload);
  });

  it('rejects excessive message length', async () => {
    prisma.directConversation.findFirst.mockResolvedValue(conversation());

    await expect(
      service.sendMessage('user-1', {
        conversationId: 'conversation-1',
        text: 'x'.repeat(MINI_CHAT_MESSAGE_MAX_LENGTH + 1),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts only supported quick reactions', async () => {
    prisma.directConversation.findFirst.mockResolvedValue(conversation());
    prisma.tx.directMessage.create.mockResolvedValue(
      message({
        type: DirectMessageType.QUICK_REACTION,
        text: null,
        reactionCode: '👍',
      }),
    );

    const result = await service.sendMessage('user-1', {
      conversationId: 'conversation-1',
      type: 'QUICK_REACTION',
      reactionCode: '👍',
    });

    expect(result.message.reactionCode).toBe('👍');

    await expect(
      service.sendMessage('user-1', {
        conversationId: 'conversation-1',
        type: 'QUICK_REACTION',
        reactionCode: '<b>hi</b>',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('loads message history with pagination', async () => {
    prisma.directConversationParticipant.findUnique.mockResolvedValue(
      participant('user-1'),
    );
    prisma.directMessage.findMany.mockResolvedValue([
      message({ id: 'message-3', text: 'Newest' }),
      message({ id: 'message-2', text: 'Older' }),
      message({ id: 'message-1', text: 'Oldest' }),
    ]);

    const result = await service.listMessages('conversation-1', 'user-1', {
      limit: 2,
    });

    expect(result.items.map((item) => item.id)).toEqual([
      'message-2',
      'message-3',
    ]);
    expect(result.nextCursor).toBe('message-2');
    expect(result.hasMore).toBe(true);
  });

  it('computes unread count and marks messages as read', async () => {
    prisma.directConversationParticipant.findMany.mockResolvedValue([
      { conversationId: 'conversation-1', lastReadMessageId: null },
    ]);
    prisma.directConversationParticipant.findUnique.mockResolvedValue(
      participant('user-1'),
    );
    prisma.directMessage.findFirst.mockResolvedValue({ id: 'message-2' });
    prisma.directMessage.count.mockResolvedValue(2);

    const unread = await service.getTotalUnreadCount('user-1');
    const read = await service.markAsRead('conversation-1', 'user-1', 'message-2');

    expect(unread).toBe(2);
    expect(prisma.directConversationParticipant.update).toHaveBeenCalledWith({
      where: {
        conversationId_userId: {
          conversationId: 'conversation-1',
          userId: 'user-1',
        },
      },
      data: { lastReadMessageId: 'message-2' },
    });
    expect(read.lastReadMessageId).toBe('message-2');
  });

  it('searches active users and excludes the current user', async () => {
    prisma.user.findMany.mockResolvedValue([user('user-2', 'Two')]);

    const result = await service.searchUsers('user-1', 'two');

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { not: 'user-1' },
          isActive: true,
        }),
      }),
    );
    expect(result.items[0].id).toBe('user-2');
  });

  it('keeps conversations isolated by participant membership', async () => {
    prisma.directConversation.findMany.mockResolvedValue([
      conversation({ id: 'conversation-1' }),
    ]);

    await service.listConversations('user-1');

    expect(prisma.directConversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          participants: { some: { userId: 'user-1' } },
        }),
      }),
    );
  });
});
