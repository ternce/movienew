import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DirectMessageType, Prisma } from '@prisma/client';
import { createHash } from 'crypto';

import { PrismaService } from '../../config/prisma.service';

const USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  username: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

const MESSAGE_INCLUDE = {
  sender: {
    select: USER_SELECT,
  },
} satisfies Prisma.DirectMessageInclude;

const CONVERSATION_INCLUDE = {
  participants: {
    include: {
      user: {
        select: USER_SELECT,
      },
    },
    orderBy: { joinedAt: 'asc' as const },
  },
  messages: {
    include: MESSAGE_INCLUDE,
    orderBy: { createdAt: 'desc' as const },
    take: 1,
  },
} satisfies Prisma.DirectConversationInclude;

export const MINI_CHAT_MESSAGE_MAX_LENGTH = 1000;
export const MINI_CHAT_DEFAULT_LIMIT = 20;
export const MINI_CHAT_MAX_LIMIT = 50;
export const MINI_CHAT_SEARCH_LIMIT = 10;
export const MINI_CHAT_REACTIONS = ['❤️', '👍', '😂', '🔥', '👋'] as const;

export type MiniChatReaction = (typeof MINI_CHAT_REACTIONS)[number];

export type MiniChatSendMessageInput = {
  conversationId: string;
  type?: DirectMessageType | 'TEXT' | 'QUICK_REACTION';
  text?: string;
  reactionCode?: string;
  clientMessageId?: string;
};

type ListInput = {
  limit?: number;
  beforeMessageId?: string;
  beforeConversationId?: string;
};

@Injectable()
export class MiniChatService {
  constructor(private readonly prisma: PrismaService) {}

  async listConversations(userId: string, input: ListInput = {}) {
    const limit = this.normalizeLimit(input.limit);
    const cursor = input.beforeConversationId
      ? await this.prisma.directConversation.findFirst({
          where: {
            id: input.beforeConversationId,
            participants: { some: { userId } },
          },
          select: { id: true, updatedAt: true },
        })
      : null;

    if (input.beforeConversationId && !cursor) {
      throw new NotFoundException('Conversation cursor not found');
    }

    const conversations = await this.prisma.directConversation.findMany({
      where: {
        participants: { some: { userId } },
        ...(cursor
          ? {
              OR: [
                { updatedAt: { lt: cursor.updatedAt } },
                { updatedAt: cursor.updatedAt, id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      include: CONVERSATION_INCLUDE,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const pageItems = conversations.slice(0, limit);
    const items = await Promise.all(
      pageItems.map((conversation) => this.mapConversation(conversation, userId)),
    );

    return {
      items,
      nextCursor:
        conversations.length > limit ? pageItems[pageItems.length - 1]?.id : null,
      hasMore: conversations.length > limit,
      limit,
      unreadCount: await this.getTotalUnreadCount(userId),
    };
  }

  async createOrGetConversation(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      throw new BadRequestException('Cannot start a conversation with yourself');
    }

    const targetUser = await this.prisma.user.findFirst({
      where: { id: targetUserId, isActive: true },
      select: { id: true },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    const participantKey = this.getParticipantKey(userId, targetUserId);
    const conversation = await this.prisma.directConversation.upsert({
      where: { participantKey },
      update: {},
      create: {
        participantKey,
        participants: {
          create: [{ userId }, { userId: targetUserId }],
        },
      },
      include: CONVERSATION_INCLUDE,
    });

    return this.mapConversation(conversation, userId);
  }

  async getConversation(conversationId: string, userId: string) {
    const conversation = await this.getAuthorizedConversation(
      conversationId,
      userId,
    );

    return this.mapConversation(conversation, userId);
  }

  async listMessages(
    conversationId: string,
    userId: string,
    input: ListInput = {},
  ) {
    await this.assertParticipant(conversationId, userId);

    const limit = this.normalizeLimit(input.limit);
    const cursor = input.beforeMessageId
      ? await this.prisma.directMessage.findFirst({
          where: { id: input.beforeMessageId, conversationId },
          select: { id: true, createdAt: true },
        })
      : null;

    if (input.beforeMessageId && !cursor) {
      throw new NotFoundException('Message cursor not found');
    }

    const messages = await this.prisma.directMessage.findMany({
      where: {
        conversationId,
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: cursor.createdAt } },
                { createdAt: cursor.createdAt, id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      include: MESSAGE_INCLUDE,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const pageItems = messages.slice(0, limit);
    const chronologicalItems = [...pageItems].reverse();

    return {
      items: chronologicalItems.map((message) => this.mapMessage(message)),
      nextCursor:
        messages.length > limit ? pageItems[pageItems.length - 1]?.id : null,
      hasMore: messages.length > limit,
      limit,
    };
  }

  async sendMessage(userId: string, input: MiniChatSendMessageInput) {
    const conversation = await this.getAuthorizedConversation(
      input.conversationId,
      userId,
    );
    const clientMessageId = this.normalizeClientMessageId(input.clientMessageId);

    if (clientMessageId) {
      const existingMessage = await this.prisma.directMessage.findFirst({
        where: {
          conversationId: conversation.id,
          senderUserId: userId,
          clientMessageId,
        },
        include: MESSAGE_INCLUDE,
      });

      if (existingMessage) {
        return {
          message: this.mapMessage(existingMessage),
          conversation: await this.mapConversation(conversation, userId),
          participantUserIds: conversation.participants.map((item) => item.userId),
          deduped: true,
        };
      }
    }

    const normalized = this.normalizeMessagePayload(input);
    let message;
    try {
      message = await this.prisma.$transaction(async (tx) => {
        const created = await tx.directMessage.create({
          data: {
            conversationId: conversation.id,
            senderUserId: userId,
            type: normalized.type,
            text: normalized.text,
            reactionCode: normalized.reactionCode,
            clientMessageId,
          },
          include: MESSAGE_INCLUDE,
        });

        await tx.directConversation.update({
          where: { id: conversation.id },
          data: { updatedAt: new Date() },
        });

        return created;
      });
    } catch (error) {
      if (clientMessageId && (error as { code?: string }).code === 'P2002') {
        const existingMessage = await this.prisma.directMessage.findFirst({
          where: {
            conversationId: conversation.id,
            senderUserId: userId,
            clientMessageId,
          },
          include: MESSAGE_INCLUDE,
        });

        if (existingMessage) {
          return {
            message: this.mapMessage(existingMessage),
            conversation: await this.mapConversation(conversation, userId),
            participantUserIds: conversation.participants.map(
              (item) => item.userId,
            ),
            deduped: true,
          };
        }
      }

      throw error;
    }

    const updatedConversation = await this.getAuthorizedConversation(
      conversation.id,
      userId,
    );

    return {
      message: this.mapMessage(message),
      conversation: await this.mapConversation(updatedConversation, userId),
      participantUserIds: updatedConversation.participants.map(
        (item) => item.userId,
      ),
      deduped: false,
    };
  }

  async markAsRead(
    conversationId: string,
    userId: string,
    messageId?: string,
  ) {
    await this.assertParticipant(conversationId, userId);

    const message = messageId
      ? await this.prisma.directMessage.findFirst({
          where: { id: messageId, conversationId },
          select: { id: true },
        })
      : await this.prisma.directMessage.findFirst({
          where: { conversationId },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          select: { id: true },
        });

    if (messageId && !message) {
      throw new NotFoundException('Message not found');
    }

    await this.prisma.directConversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: {
        lastReadMessageId: message?.id ?? null,
      },
    });

    return {
      conversationId,
      lastReadMessageId: message?.id ?? null,
      unreadCount: await this.getUnreadCount(conversationId, userId),
      totalUnreadCount: await this.getTotalUnreadCount(userId),
    };
  }

  async searchUsers(userId: string, query: string, limit = MINI_CHAT_SEARCH_LIMIT) {
    const q = typeof query === 'string' ? query.trim() : '';
    if (q.length < 2) {
      return { items: [], limit: MINI_CHAT_SEARCH_LIMIT };
    }

    const users = await this.prisma.user.findMany({
      where: {
        id: { not: userId },
        isActive: true,
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { username: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: USER_SELECT,
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      take: Math.min(MINI_CHAT_SEARCH_LIMIT, Math.max(1, Math.floor(limit))),
    });

    return {
      items: users.map((user) => this.mapUser(user)),
      limit: MINI_CHAT_SEARCH_LIMIT,
    };
  }

  async getTotalUnreadCount(userId: string) {
    const participants =
      await this.prisma.directConversationParticipant.findMany({
        where: { userId },
        select: {
          conversationId: true,
          lastReadMessageId: true,
        },
      });

    const counts = await Promise.all(
      participants.map((participant) =>
        this.getUnreadCount(
          participant.conversationId,
          userId,
          participant.lastReadMessageId,
        ),
      ),
    );

    return counts.reduce((sum, count) => sum + count, 0);
  }

  async getParticipantUserIds(conversationId: string) {
    const participants =
      await this.prisma.directConversationParticipant.findMany({
        where: { conversationId },
        select: { userId: true },
      });

    return participants.map((participant) => participant.userId);
  }

  private async getAuthorizedConversation(conversationId: string, userId: string) {
    const conversation = await this.prisma.directConversation.findFirst({
      where: {
        id: conversationId,
        participants: { some: { userId } },
      },
      include: CONVERSATION_INCLUDE,
    });

    if (!conversation) {
      throw new ForbiddenException('Conversation not found or access denied');
    }

    return conversation;
  }

  private async assertParticipant(conversationId: string, userId: string) {
    const participant =
      await this.prisma.directConversationParticipant.findUnique({
        where: {
          conversationId_userId: {
            conversationId,
            userId,
          },
        },
        select: { conversationId: true },
      });

    if (!participant) {
      throw new ForbiddenException('Conversation not found or access denied');
    }
  }

  private getParticipantKey(userId: string, targetUserId: string) {
    const [first, second] = [userId, targetUserId].sort();
    return createHash('sha256').update(`${first}:${second}`).digest('hex');
  }

  private normalizeLimit(limit?: number) {
    if (!Number.isFinite(limit)) return MINI_CHAT_DEFAULT_LIMIT;
    return Math.min(
      MINI_CHAT_MAX_LIMIT,
      Math.max(1, Math.floor(limit ?? MINI_CHAT_DEFAULT_LIMIT)),
    );
  }

  private normalizeClientMessageId(clientMessageId?: string) {
    if (clientMessageId === undefined || clientMessageId === null) {
      return null;
    }

    const value = String(clientMessageId).trim();
    if (!value) return null;
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(value)) {
      throw new BadRequestException('Invalid clientMessageId');
    }

    return value;
  }

  private normalizeMessagePayload(input: MiniChatSendMessageInput) {
    const type = String(input.type ?? DirectMessageType.TEXT);

    if (type === DirectMessageType.QUICK_REACTION) {
      const reactionCode = typeof input.reactionCode === 'string'
        ? input.reactionCode.trim()
        : '';
      if (!MINI_CHAT_REACTIONS.includes(reactionCode as MiniChatReaction)) {
        throw new BadRequestException('Unsupported quick reaction');
      }

      return {
        type: DirectMessageType.QUICK_REACTION,
        text: null,
        reactionCode,
      };
    }

    const text = typeof input.text === 'string' ? input.text.trim() : '';
    if (!text) {
      throw new BadRequestException('Message text is required');
    }
    if (text.length > MINI_CHAT_MESSAGE_MAX_LENGTH) {
      throw new BadRequestException(
        `Message must be ${MINI_CHAT_MESSAGE_MAX_LENGTH} characters or less`,
      );
    }

    return {
      type: DirectMessageType.TEXT,
      text,
      reactionCode: null,
    };
  }

  private async getUnreadCount(
    conversationId: string,
    userId: string,
    knownLastReadMessageId?: string | null,
  ) {
    let lastReadMessageId = knownLastReadMessageId;

    if (lastReadMessageId === undefined) {
      const participant =
        await this.prisma.directConversationParticipant.findUnique({
          where: {
            conversationId_userId: {
              conversationId,
              userId,
            },
          },
          select: { lastReadMessageId: true },
        });
      lastReadMessageId = participant?.lastReadMessageId ?? null;
    }

    const lastReadMessage = lastReadMessageId
      ? await this.prisma.directMessage.findFirst({
          where: { id: lastReadMessageId, conversationId },
          select: { createdAt: true, id: true },
        })
      : null;

    return this.prisma.directMessage.count({
      where: {
        conversationId,
        senderUserId: { not: userId },
        ...(lastReadMessage
          ? {
              OR: [
                { createdAt: { gt: lastReadMessage.createdAt } },
                { createdAt: lastReadMessage.createdAt, id: { gt: lastReadMessage.id } },
              ],
            }
          : {}),
      },
    });
  }

  private async mapConversation(conversation: any, currentUserId: string) {
    const otherParticipant = conversation.participants.find(
      (participant: any) => participant.userId !== currentUserId,
    );
    const currentParticipant = conversation.participants.find(
      (participant: any) => participant.userId === currentUserId,
    );

    return {
      id: conversation.id,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      otherUser: otherParticipant?.user
        ? this.mapUser(otherParticipant.user)
        : null,
      latestMessage: conversation.messages?.[0]
        ? this.mapMessage(conversation.messages[0])
        : null,
      unreadCount: await this.getUnreadCount(
        conversation.id,
        currentUserId,
        currentParticipant?.lastReadMessageId ?? null,
      ),
    };
  }

  private mapMessage(message: any) {
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderUserId: message.senderUserId,
      type: message.type,
      text: message.text,
      reactionCode: message.reactionCode,
      clientMessageId: message.clientMessageId,
      createdAt: message.createdAt,
      sender: message.sender ? this.mapUser(message.sender) : null,
    };
  }

  private mapUser(user: any) {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      avatarUrl: user.avatarUrl,
      displayName:
        [user.firstName, user.lastName].filter(Boolean).join(' ') ||
        user.username ||
        'User',
    };
  }
}
