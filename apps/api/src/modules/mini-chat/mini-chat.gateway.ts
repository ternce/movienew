import { Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Redis } from 'ioredis';
import * as jwt from 'jsonwebtoken';
import { Server, Socket } from 'socket.io';

import { REDIS_CLIENT } from '../../config/redis.module';
import { MiniChatService } from './mini-chat.service';

type AuthenticatedChatSocket = Socket & {
  userId?: string;
};

type SocketAck = (response: {
  ok: boolean;
  data?: unknown;
  code?: string;
  message?: string;
}) => void;

type ChatJoinPayload = {
  conversationId?: string;
};

type ChatSendPayload = {
  conversationId?: string;
  type?: 'TEXT' | 'QUICK_REACTION';
  text?: string;
  reactionCode?: string;
  clientMessageId?: string;
};

type ChatReadPayload = {
  conversationId?: string;
  messageId?: string;
};

const CHAT_RATE_KEY_PREFIX = 'mini-chat:send-rate:';
const CHAT_RATE_LIMIT = 10;
const CHAT_RATE_WINDOW_SECONDS = 10;

@WebSocketGateway({
  namespace: 'chat',
  cors: {
    origin: function (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) {
      if (!origin) {
        callback(null, true);
        return;
      }
      callback(null, true);
    },
    credentials: true,
  },
})
export class MiniChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(MiniChatGateway.name);
  private readonly allowedOrigins: string[];

  constructor(
    private readonly configService: ConfigService,
    private readonly miniChatService: MiniChatService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    this.allowedOrigins = this.configService
      .get<string>('CORS_ORIGINS', 'http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  async handleConnection(client: AuthenticatedChatSocket) {
    try {
      const origin = client.handshake.headers?.origin;
      if (origin && !this.allowedOrigins.includes(origin)) {
        client.disconnect();
        return;
      }

      const token = this.extractToken(client);
      if (!token) {
        client.disconnect();
        return;
      }

      const secret = this.configService.get<string>('JWT_SECRET');
      if (!secret) {
        throw new Error('JWT_SECRET environment variable is required');
      }

      const payload = jwt.verify(token, secret) as { sub?: string };
      if (!payload?.sub) {
        client.disconnect();
        return;
      }

      client.userId = payload.sub;
      await client.join(this.userRoom(payload.sub));

      const unreadCount = await this.miniChatService.getTotalUnreadCount(
        payload.sub,
      );
      client.emit('chat:unread-updated', { unreadCount });
    } catch (error) {
      this.logger.warn(
        `Rejected Mini Chat socket connection: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      client.disconnect();
    }
  }

  handleDisconnect(_client: AuthenticatedChatSocket) {
    // Socket.IO handles room cleanup. Mini Chat intentionally has no presence.
  }

  @SubscribeMessage('chat:join')
  async handleJoin(
    @ConnectedSocket() client: AuthenticatedChatSocket,
    @MessageBody() payload: ChatJoinPayload,
    ack?: SocketAck,
  ) {
    try {
      const userId = this.requireUser(client);
      const conversationId = this.requireConversationId(payload?.conversationId);
      const conversation = await this.miniChatService.getConversation(
        conversationId,
        userId,
      );

      await client.join(this.conversationRoom(conversationId));
      ack?.({ ok: true, data: conversation });
    } catch (error) {
      this.emitError(client, error);
      ack?.(this.errorAck(error));
    }
  }

  @SubscribeMessage('chat:message-send')
  async handleMessageSend(
    @ConnectedSocket() client: AuthenticatedChatSocket,
    @MessageBody() payload: ChatSendPayload,
    ack?: SocketAck,
  ) {
    try {
      const userId = this.requireUser(client);
      const conversationId = this.requireConversationId(payload?.conversationId);

      await this.assertMessageRateLimit(userId);
      const result = await this.miniChatService.sendMessage(userId, {
        conversationId,
        type: payload?.type,
        text: payload?.text,
        reactionCode: payload?.reactionCode,
        clientMessageId: payload?.clientMessageId,
      });

      if (!result.deduped) {
        await this.broadcastPersistedMessage(
          result.participantUserIds,
          conversationId,
          result.message,
        );
      }

      ack?.({ ok: true, data: result.message });
    } catch (error) {
      this.emitError(client, error);
      ack?.(this.errorAck(error));
    }
  }

  @SubscribeMessage('chat:read')
  async handleRead(
    @ConnectedSocket() client: AuthenticatedChatSocket,
    @MessageBody() payload: ChatReadPayload,
    ack?: SocketAck,
  ) {
    try {
      const userId = this.requireUser(client);
      const conversationId = this.requireConversationId(payload?.conversationId);
      const result = await this.miniChatService.markAsRead(
        conversationId,
        userId,
        payload?.messageId,
      );

      client.emit('chat:read', result);
      client.emit('chat:unread-updated', {
        unreadCount: result.totalUnreadCount,
      });
      ack?.({ ok: true, data: result });
    } catch (error) {
      this.emitError(client, error);
      ack?.(this.errorAck(error));
    }
  }

  private async broadcastPersistedMessage(
    participantUserIds: string[],
    conversationId: string,
    message: unknown,
  ) {
    await Promise.all(
      participantUserIds.map(async (participantUserId) => {
        const [conversation, unreadCount] = await Promise.all([
          this.miniChatService.getConversation(conversationId, participantUserId),
          this.miniChatService.getTotalUnreadCount(participantUserId),
        ]);

        this.server.to(this.userRoom(participantUserId)).emit('chat:message', {
          conversationId,
          message,
        });
        this.server
          .to(this.userRoom(participantUserId))
          .emit('chat:conversation-updated', conversation);
        this.server.to(this.userRoom(participantUserId)).emit(
          'chat:unread-updated',
          { unreadCount },
        );
      }),
    );
  }

  private extractToken(client: Socket) {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) {
      return authToken.trim();
    }

    const header = client.handshake.headers?.authorization;
    if (typeof header === 'string') {
      return header.replace(/^Bearer\s+/i, '').trim();
    }

    return undefined;
  }

  private requireUser(client: AuthenticatedChatSocket) {
    if (!client.userId) {
      throw new Error('Authentication required');
    }

    return client.userId;
  }

  private requireConversationId(conversationId?: string) {
    if (!conversationId) {
      throw new Error('conversationId is required');
    }

    return conversationId;
  }

  private userRoom(userId: string) {
    return `user:${userId}`;
  }

  private conversationRoom(conversationId: string) {
    return `chat:conversation:${conversationId}`;
  }

  private rateKey(userId: string) {
    return `${CHAT_RATE_KEY_PREFIX}${userId}`;
  }

  private async assertMessageRateLimit(userId: string) {
    const key = this.rateKey(userId);
    const count = await this.redis.incr(key);

    if (count === 1) {
      await this.redis.expire(key, CHAT_RATE_WINDOW_SECONDS);
    }

    if (count > CHAT_RATE_LIMIT) {
      throw new Error('Mini Chat message rate limit exceeded');
    }
  }

  private emitError(client: AuthenticatedChatSocket, error: unknown) {
    const ack = this.errorAck(error);
    client.emit('chat:error', {
      code: ack.code,
      message: ack.message,
    });
  }

  private errorAck(error: unknown) {
    const anyError = error as {
      name?: string;
      message?: string;
    };

    return {
      ok: false,
      code: anyError.name ?? 'MINI_CHAT_ERROR',
      message: anyError.message ?? 'Mini Chat error',
    };
  }
}
