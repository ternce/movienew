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
import { randomUUID } from 'crypto';
import { Server, Socket } from 'socket.io';

import { REDIS_CLIENT } from '../../config/redis.module';
import {
  WATCH_PARTY_REACTIONS,
  WatchPartyReaction,
  WatchPartyService,
} from './watch-party.service';

type AuthenticatedSocket = Socket & {
  userId?: string;
  watchPartyRoomId?: string;
};

type WatchPartyJoinPayload = {
  roomId?: string;
  inviteCode?: string;
  inviteToken?: string;
};

type WatchPartyLeavePayload = {
  roomId?: string;
};

type WatchPartyPlaybackPayload = {
  roomId?: string;
  currentTime?: number;
  playbackRate?: number;
  sequence?: number;
};

type WatchPartyTransferHostPayload = {
  roomId?: string;
  targetUserId?: string;
};

type WatchPartyReactionPayload = {
  roomId?: string;
  reaction?: string;
  clientReactionId?: string;
};

type WatchPartyChatSendPayload = {
  roomId?: string;
  text?: string;
  clientMessageId?: string;
};

type WatchPartyPollCreatePayload = {
  roomId?: string;
  options?: Array<{
    contentId?: string;
    episodeId?: string;
  }>;
};

type WatchPartyPollActionPayload = {
  roomId?: string;
  pollId?: string;
  optionId?: string;
};

type WatchPartyEpisodeEndedPayload = {
  roomId?: string;
};

type WatchPartyNextEpisodeActionPayload = {
  roomId?: string;
  countdownId?: string;
};

type WatchPartyNextEpisodeCountdownState = {
  id: string;
  roomId: string;
  currentContentId: string;
  currentSequence: number;
  nextEpisode: unknown;
  durationSeconds: number;
  startedAt: string;
  startsAt: string;
};

type SocketAck = (response: {
  ok: boolean;
  data?: unknown;
  code?: string;
  message?: string;
}) => void;

const SOCKET_KEY_PREFIX = 'watch-party:socket:';
const PRESENCE_KEY_PREFIX = 'watch-party:presence:';
const REACTION_RATE_KEY_PREFIX = 'watch-party:reaction-rate:';
const CHAT_RATE_KEY_PREFIX = 'watch-party:chat-rate:';
const CHAT_DEDUPE_KEY_PREFIX = 'watch-party:chat-dedupe:';
const NEXT_EPISODE_KEY_PREFIX = 'watch-party:next-episode:';
const SOCKET_TTL_SECONDS = 60 * 60 * 12;
const REACTION_RATE_LIMIT = 5;
const REACTION_RATE_WINDOW_SECONDS = 5;
const CHAT_RATE_LIMIT = 6;
const CHAT_RATE_WINDOW_SECONDS = 10;
const CHAT_DEDUPE_TTL_SECONDS = 60;
const NEXT_EPISODE_COUNTDOWN_DEFAULT_SECONDS = 10;
const NEXT_EPISODE_COUNTDOWN_EXTRA_TTL_SECONDS = 60;

@WebSocketGateway({
  namespace: 'watch-party',
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
export class WatchPartyGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(WatchPartyGateway.name);
  private readonly allowedOrigins: string[];
  private readonly disconnectGraceMs: number;
  private readonly nextEpisodeCountdownSeconds: number;
  private readonly nextEpisodeTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly configService: ConfigService,
    private readonly watchPartyService: WatchPartyService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    this.allowedOrigins = this.configService
      .get<string>('CORS_ORIGINS', 'http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    this.disconnectGraceMs = this.configService.get<number>(
      'WATCH_PARTY_DISCONNECT_GRACE_MS',
      10000,
    );
    this.nextEpisodeCountdownSeconds = this.configService.get<number>(
      'WATCH_PARTY_NEXT_EPISODE_COUNTDOWN_SECONDS',
      NEXT_EPISODE_COUNTDOWN_DEFAULT_SECONDS,
    );
  }

  async handleConnection(client: AuthenticatedSocket) {
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
      await client.join(`user:${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    const socketInfo = await this.getSocketInfo(client);
    if (!socketInfo) return;

    await this.removeSocketFromPresence(
      socketInfo.roomId,
      socketInfo.userId,
      client.id,
    );

    setTimeout(() => {
      this.finalizeDisconnect(socketInfo.roomId, socketInfo.userId).catch(
        (error) => {
          this.logger.warn(
            `Failed to finalize watch party disconnect: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        },
      );
    }, this.disconnectGraceMs);
  }

  @SubscribeMessage('watch-party:join')
  async handleJoin(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: WatchPartyJoinPayload,
    ack?: SocketAck,
  ) {
    try {
      const userId = this.requireUser(client);
      const room = await this.watchPartyService.connectRealtimeParticipant(
        userId,
        {
          roomId: payload?.roomId,
          inviteToken: payload?.inviteToken ?? payload?.inviteCode,
        },
      );
      const roomName = this.roomName(room.id);

      await client.join(roomName);
      client.watchPartyRoomId = room.id;
      await this.addSocketToPresence(room.id, userId, client.id);

      client.emit('watch-party:joined', {
        room,
        participants: room.participants,
        playbackState: room.playbackState,
      });
      client.emit('watch-party:playback-state', room.playbackState);
      const countdown = await this.getNextEpisodeCountdown(room.id);
      if (countdown) {
        client.emit('watch-party:next-episode-countdown', countdown);
        this.scheduleNextEpisodeCountdown(countdown);
      }
      client.to(roomName).emit('watch-party:participant-joined', {
        roomId: room.id,
        participant: room.currentParticipant,
      });
      await this.broadcastParticipants(room.id);

      return this.sendAck(ack, { ok: true, data: { room, participants: room.participants } });
    } catch (error) {
      this.emitError(client, error);
      return this.sendAck(ack, this.errorAck(error));
    }
  }

  @SubscribeMessage('watch-party:leave')
  async handleLeave(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: WatchPartyLeavePayload,
    ack?: SocketAck,
  ) {
    try {
      const userId = this.requireUser(client);
      const roomId = payload?.roomId ?? client.watchPartyRoomId;
      if (!roomId) {
        throw new Error('roomId is required');
      }

      await this.removeSocketFromPresence(roomId, userId, client.id);
      const result = await this.watchPartyService.leaveRoom(roomId, userId);
      await client.leave(this.roomName(roomId));

      if ((result as { status?: string }).status === 'ENDED') {
        await this.cancelNextEpisodeCountdown(roomId);
        this.server.to(this.roomName(roomId)).emit('watch-party:room-ended', {
          roomId,
          room: result,
        });
      } else {
        this.server
          .to(this.roomName(roomId))
          .emit('watch-party:participant-left', {
            roomId,
            userId,
            participant: (result as { participant?: unknown }).participant,
          });
        await this.broadcastParticipants(roomId);
        if ((result as { hostTransferred?: boolean }).hostTransferred) {
          this.broadcastHostChanged(
            roomId,
            (result as { newHostUserId?: string }).newHostUserId,
            result,
          );
        }
      }

      return this.sendAck(ack, { ok: true, data: result });
    } catch (error) {
      this.emitError(client, error);
      return this.sendAck(ack, this.errorAck(error));
    }
  }

  @SubscribeMessage('watch-party:state-request')
  async handleStateRequest(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: WatchPartyLeavePayload,
    ack?: SocketAck,
  ) {
    try {
      const userId = this.requireUser(client);
      const roomId = this.resolveRoomId(client, payload?.roomId);
      const playbackState = await this.watchPartyService.getPlaybackState(
        roomId,
        userId,
      );

      client.emit('watch-party:playback-state', playbackState);
      return this.sendAck(ack, { ok: true, data: playbackState });
    } catch (error) {
      this.emitError(client, error);
      return this.sendAck(ack, this.errorAck(error));
    }
  }

  @SubscribeMessage('watch-party:sync-request')
  async handleSyncRequest(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: WatchPartyLeavePayload,
    ack?: SocketAck,
  ) {
    try {
      const userId = this.requireUser(client);
      const roomId = this.resolveRoomId(client, payload?.roomId);
      const playbackState = await this.watchPartyService.getPlaybackState(
        roomId,
        userId,
      );

      client.emit('watch-party:sync-state', playbackState);
      return this.sendAck(ack, { ok: true, data: playbackState });
    } catch (error) {
      this.emitError(client, error);
      return this.sendAck(ack, this.errorAck(error));
    }
  }

  @SubscribeMessage('watch-party:play')
  async handlePlay(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: WatchPartyPlaybackPayload,
    ack?: SocketAck,
  ) {
    return this.handlePlaybackAction(client, payload, 'PLAY', 'watch-party:play', ack);
  }

  @SubscribeMessage('watch-party:pause')
  async handlePause(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: WatchPartyPlaybackPayload,
    ack?: SocketAck,
  ) {
    return this.handlePlaybackAction(client, payload, 'PAUSE', 'watch-party:pause', ack);
  }

  @SubscribeMessage('watch-party:seek')
  async handleSeek(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: WatchPartyPlaybackPayload,
    ack?: SocketAck,
  ) {
    return this.handlePlaybackAction(client, payload, 'SEEK', 'watch-party:seek', ack);
  }

  @SubscribeMessage('watch-party:transfer-host')
  async handleTransferHost(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: WatchPartyTransferHostPayload,
    ack?: SocketAck,
  ) {
    try {
      const userId = this.requireUser(client);
      const roomId = this.resolveRoomId(client, payload?.roomId);
      const targetUserId = payload?.targetUserId;
      if (!targetUserId) {
        throw new Error('targetUserId is required');
      }

      const isTargetConnected = await this.isUserConnected(roomId, targetUserId);
      if (!isTargetConnected) {
        throw new Error('Target participant is not connected');
      }

      const room = await this.watchPartyService.transferHost(userId, {
        roomId,
        targetUserId,
      });

      this.broadcastHostChanged(roomId, room.hostUserId, room);
      await this.broadcastParticipants(roomId);
      return this.sendAck(ack, { ok: true, data: room });
    } catch (error) {
      this.emitError(client, error);
      return this.sendAck(ack, this.errorAck(error));
    }
  }

  @SubscribeMessage('watch-party:end')
  async handleEndRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: WatchPartyLeavePayload,
    ack?: SocketAck,
  ) {
    try {
      const userId = this.requireUser(client);
      const roomId = this.resolveRoomId(client, payload?.roomId);
      const room = await this.watchPartyService.endRoom(roomId, userId);

      await this.cancelNextEpisodeCountdown(roomId);
      this.server.to(this.roomName(roomId)).emit('watch-party:room-ended', {
        roomId,
        room,
      });
      return this.sendAck(ack, { ok: true, data: room });
    } catch (error) {
      this.emitError(client, error);
      return this.sendAck(ack, this.errorAck(error));
    }
  }

  @SubscribeMessage('watch-party:reaction')
  async handleReaction(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: WatchPartyReactionPayload,
    ack?: SocketAck,
  ) {
    try {
      const userId = this.requireUser(client);
      const roomId = this.resolveRoomId(client, payload?.roomId);
      const reaction = this.parseReaction(payload?.reaction);
      const reactionId = this.parseClientReactionId(payload?.clientReactionId);

      await this.assertReactionRateLimit(roomId, userId);
      const sender = await this.watchPartyService.getReactionSender(
        roomId,
        userId,
      );

      const event = {
        id: reactionId ?? randomUUID(),
        roomId,
        reaction,
        sender,
        timestamp: new Date().toISOString(),
      };

      this.server
        .to(this.roomName(roomId))
        .emit('watch-party:reaction-received', event);
      return this.sendAck(ack, { ok: true, data: event });
    } catch (error) {
      this.emitError(client, error);
      return this.sendAck(ack, this.errorAck(error));
    }
  }

  @SubscribeMessage('watch-party:chat-send')
  async handleChatSend(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: WatchPartyChatSendPayload,
    ack?: SocketAck,
  ) {
    try {
      const userId = this.requireUser(client);
      const roomId = this.resolveRoomId(client, payload?.roomId);

      await this.assertChatRateLimit(roomId, userId);
      await this.assertChatNotDuplicate(roomId, userId, payload?.clientMessageId);

      const message = await this.watchPartyService.createMessage(
        roomId,
        userId,
        payload?.text ?? '',
      );

      this.server.to(this.roomName(roomId)).emit('watch-party:chat-message', {
        roomId,
        message,
      });
      return this.sendAck(ack, { ok: true, data: message });
    } catch (error) {
      const errorPayload = this.errorAck(error);
      client.emit('watch-party:chat-error', {
        code: errorPayload.code,
        message: errorPayload.message,
      });
      return this.sendAck(ack, errorPayload);
    }
  }

  @SubscribeMessage('watch-party:poll-create')
  async handlePollCreate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: WatchPartyPollCreatePayload,
    ack?: SocketAck,
  ) {
    try {
      const userId = this.requireUser(client);
      const roomId = this.resolveRoomId(client, payload?.roomId);
      const poll = await this.watchPartyService.createPoll(userId, {
        roomId,
        options: (payload?.options ?? []).map((option) => ({
          contentId: option.contentId ?? '',
          episodeId: option.episodeId,
        })),
      });

      this.server.to(this.roomName(roomId)).emit('watch-party:poll-created', {
        roomId,
        poll,
      });
      return this.sendAck(ack, { ok: true, data: poll });
    } catch (error) {
      this.emitError(client, error);
      return this.sendAck(ack, this.errorAck(error));
    }
  }

  @SubscribeMessage('watch-party:poll-vote')
  async handlePollVote(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: WatchPartyPollActionPayload,
    ack?: SocketAck,
  ) {
    try {
      const userId = this.requireUser(client);
      const roomId = this.resolveRoomId(client, payload?.roomId);
      if (!payload?.pollId || !payload?.optionId) {
        throw new Error('pollId and optionId are required');
      }

      const poll = await this.watchPartyService.votePoll(userId, {
        roomId,
        pollId: payload.pollId,
        optionId: payload.optionId,
      });

      this.server.to(this.roomName(roomId)).emit('watch-party:poll-updated', {
        roomId,
        poll,
      });
      return this.sendAck(ack, { ok: true, data: poll });
    } catch (error) {
      this.emitError(client, error);
      return this.sendAck(ack, this.errorAck(error));
    }
  }

  @SubscribeMessage('watch-party:poll-close')
  async handlePollClose(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: WatchPartyPollActionPayload,
    ack?: SocketAck,
  ) {
    try {
      const userId = this.requireUser(client);
      const roomId = this.resolveRoomId(client, payload?.roomId);
      if (!payload?.pollId) {
        throw new Error('pollId is required');
      }

      const poll = await this.watchPartyService.closePoll(userId, {
        roomId,
        pollId: payload.pollId,
      });

      this.server.to(this.roomName(roomId)).emit('watch-party:poll-closed', {
        roomId,
        poll,
      });
      return this.sendAck(ack, { ok: true, data: poll });
    } catch (error) {
      this.emitError(client, error);
      return this.sendAck(ack, this.errorAck(error));
    }
  }

  @SubscribeMessage('watch-party:poll-start-winner')
  async handlePollStartWinner(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: WatchPartyPollActionPayload,
    ack?: SocketAck,
  ) {
    try {
      const userId = this.requireUser(client);
      const roomId = this.resolveRoomId(client, payload?.roomId);
      if (!payload?.pollId) {
        throw new Error('pollId is required');
      }

      const result = await this.watchPartyService.startPollWinner(userId, {
        roomId,
        pollId: payload.pollId,
        optionId: payload.optionId,
      });

      this.server
        .to(this.roomName(roomId))
        .emit('watch-party:content-changed', result);
      this.server
        .to(this.roomName(roomId))
        .emit('watch-party:playback-state', result.playbackState);
      return this.sendAck(ack, { ok: true, data: result });
    } catch (error) {
      this.emitError(client, error);
      return this.sendAck(ack, this.errorAck(error));
    }
  }

  @SubscribeMessage('watch-party:episode-ended')
  async handleEpisodeEnded(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: WatchPartyEpisodeEndedPayload,
    ack?: SocketAck,
  ) {
    try {
      const userId = this.requireUser(client);
      const roomId = this.resolveRoomId(client, payload?.roomId);
      const countdown = await this.ensureNextEpisodeCountdown(roomId, userId);

      if (countdown) {
        this.server
          .to(this.roomName(roomId))
          .emit('watch-party:next-episode-countdown', countdown);
      }
      return this.sendAck(ack, { ok: true, data: countdown });
    } catch (error) {
      this.emitError(client, error);
      return this.sendAck(ack, this.errorAck(error));
    }
  }

  @SubscribeMessage('watch-party:next-episode-start')
  async handleNextEpisodeStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: WatchPartyNextEpisodeActionPayload,
    ack?: SocketAck,
  ) {
    try {
      const userId = this.requireUser(client);
      const roomId = this.resolveRoomId(client, payload?.roomId);
      const result = await this.startNextEpisodeFromCountdown(
        roomId,
        userId,
        payload?.countdownId,
      );

      return this.sendAck(ack, { ok: true, data: result });
    } catch (error) {
      this.emitError(client, error);
      return this.sendAck(ack, this.errorAck(error));
    }
  }

  @SubscribeMessage('watch-party:next-episode-cancel')
  async handleNextEpisodeCancel(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: WatchPartyNextEpisodeActionPayload,
    ack?: SocketAck,
  ) {
    try {
      const userId = this.requireUser(client);
      const roomId = this.resolveRoomId(client, payload?.roomId);
      const countdown = await this.getNextEpisodeCountdown(roomId);
      if (!countdown) {
        return this.sendAck(ack, { ok: true, data: null });
      }

      if (payload?.countdownId && payload.countdownId !== countdown.id) {
        throw new Error('Countdown is stale');
      }

      await this.watchPartyService.getPlaybackState(roomId, userId);
      const room = await this.watchPartyService.getRoom(roomId, userId);
      if (room.hostUserId !== userId) {
        throw new Error('Only the host can cancel the next episode countdown');
      }

      await this.cancelNextEpisodeCountdown(roomId);
      this.server.to(this.roomName(roomId)).emit('watch-party:next-episode-cancel', {
        roomId,
        countdownId: countdown.id,
      });
      return this.sendAck(ack, { ok: true, data: { roomId, countdownId: countdown.id } });
    } catch (error) {
      this.emitError(client, error);
      return this.sendAck(ack, this.errorAck(error));
    }
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

  private requireUser(client: AuthenticatedSocket) {
    if (!client.userId) {
      throw new Error('Authentication required');
    }

    return client.userId;
  }

  private roomName(roomId: string) {
    return `watch-party:${roomId}`;
  }

  private resolveRoomId(client: AuthenticatedSocket, roomId?: string) {
    const resolvedRoomId = roomId ?? client.watchPartyRoomId;
    if (!resolvedRoomId) {
      throw new Error('roomId is required');
    }

    return resolvedRoomId;
  }

  private presenceKey(roomId: string, userId: string) {
    return `${PRESENCE_KEY_PREFIX}${roomId}:${userId}`;
  }

  private socketKey(socketId: string) {
    return `${SOCKET_KEY_PREFIX}${socketId}`;
  }

  private reactionRateKey(roomId: string, userId: string) {
    return `${REACTION_RATE_KEY_PREFIX}${roomId}:${userId}`;
  }

  private chatRateKey(roomId: string, userId: string) {
    return `${CHAT_RATE_KEY_PREFIX}${roomId}:${userId}`;
  }

  private chatDedupeKey(roomId: string, userId: string, clientMessageId: string) {
    return `${CHAT_DEDUPE_KEY_PREFIX}${roomId}:${userId}:${clientMessageId}`;
  }

  private nextEpisodeKey(roomId: string) {
    return `${NEXT_EPISODE_KEY_PREFIX}${roomId}`;
  }

  private async addSocketToPresence(
    roomId: string,
    userId: string,
    socketId: string,
  ) {
    const presenceKey = this.presenceKey(roomId, userId);
    await this.redis.sadd(presenceKey, socketId);
    await this.redis.expire(presenceKey, SOCKET_TTL_SECONDS);
    await this.redis.setex(
      this.socketKey(socketId),
      SOCKET_TTL_SECONDS,
      JSON.stringify({ roomId, userId }),
    );
  }

  private async removeSocketFromPresence(
    roomId: string,
    userId: string,
    socketId: string,
  ) {
    await this.redis.srem(this.presenceKey(roomId, userId), socketId);
    await this.redis.del(this.socketKey(socketId));
  }

  private async getSocketInfo(client: AuthenticatedSocket) {
    const raw = await this.redis.get(this.socketKey(client.id));
    if (!raw) {
      if (client.watchPartyRoomId && client.userId) {
        return { roomId: client.watchPartyRoomId, userId: client.userId };
      }
      return null;
    }

    try {
      return JSON.parse(raw) as { roomId: string; userId: string };
    } catch {
      return null;
    }
  }

  private async finalizeDisconnect(roomId: string, userId: string) {
    const remainingSockets = await this.redis.scard(
      this.presenceKey(roomId, userId),
    );
    if (remainingSockets > 0) return;

    const participant =
      await this.watchPartyService.markRealtimeParticipantOffline(
        roomId,
        userId,
      );
    if (!participant) return;

    this.server.to(this.roomName(roomId)).emit('watch-party:participant-left', {
      roomId,
      userId,
      participant,
      temporary: true,
    });
    await this.broadcastParticipants(roomId);

    if (participant.role === 'HOST') {
      const room =
        await this.watchPartyService.reassignHostFromConnectedParticipants(
          roomId,
          userId,
        );
      if (room) {
        this.broadcastHostChanged(roomId, room.hostUserId, room);
        await this.broadcastParticipants(roomId);
      }
    }
  }

  private async broadcastParticipants(roomId: string) {
    const participants = await this.watchPartyService.getParticipants(roomId);
    this.server
      .to(this.roomName(roomId))
      .emit('watch-party:participants-updated', {
        roomId,
        participants,
      });
  }

  private async isUserConnected(roomId: string, userId: string) {
    const activeSockets = await this.redis.scard(this.presenceKey(roomId, userId));
    return activeSockets > 0;
  }

  private parseReaction(reaction?: string): WatchPartyReaction {
    if (
      typeof reaction === 'string' &&
      (WATCH_PARTY_REACTIONS as readonly string[]).includes(reaction)
    ) {
      return reaction as WatchPartyReaction;
    }

    throw new Error('Unsupported reaction');
  }

  private parseClientReactionId(clientReactionId?: string) {
    if (!clientReactionId) return undefined;
    if (/^[a-zA-Z0-9_-]{1,80}$/.test(clientReactionId)) {
      return clientReactionId;
    }

    throw new Error('Invalid client reaction id');
  }

  private async assertReactionRateLimit(roomId: string, userId: string) {
    const key = this.reactionRateKey(roomId, userId);
    const count = await this.redis.incr(key);

    if (count === 1) {
      await this.redis.expire(key, REACTION_RATE_WINDOW_SECONDS);
    }

    if (count > REACTION_RATE_LIMIT) {
      throw new Error('Reaction rate limit exceeded');
    }
  }

  private async assertChatRateLimit(roomId: string, userId: string) {
    const key = this.chatRateKey(roomId, userId);
    const count = await this.redis.incr(key);

    if (count === 1) {
      await this.redis.expire(key, CHAT_RATE_WINDOW_SECONDS);
    }

    if (count > CHAT_RATE_LIMIT) {
      throw new Error('Chat message rate limit exceeded');
    }
  }

  private async assertChatNotDuplicate(
    roomId: string,
    userId: string,
    clientMessageId?: string,
  ) {
    if (!clientMessageId) return;
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(clientMessageId)) {
      throw new Error('Invalid client message id');
    }

    const key = this.chatDedupeKey(roomId, userId, clientMessageId);
    const existing = await this.redis.get(key);
    if (existing) {
      throw new Error('Duplicate chat message');
    }

    await this.redis.setex(key, CHAT_DEDUPE_TTL_SECONDS, '1');
  }

  private async getNextEpisodeCountdown(roomId: string) {
    const raw = await this.redis.get(this.nextEpisodeKey(roomId));
    if (!raw) return null;

    try {
      return JSON.parse(raw) as WatchPartyNextEpisodeCountdownState;
    } catch {
      await this.redis.del(this.nextEpisodeKey(roomId));
      return null;
    }
  }

  private async ensureNextEpisodeCountdown(roomId: string, userId: string) {
    const existing = await this.getNextEpisodeCountdown(roomId);
    if (existing) {
      this.scheduleNextEpisodeCountdown(existing);
      return existing;
    }

    const nextEpisode = await this.watchPartyService.getNextEpisodeForRoom(
      roomId,
      userId,
    );
    if (!nextEpisode) {
      return null;
    }

    const now = new Date();
    const startsAt = new Date(
      now.getTime() + this.nextEpisodeCountdownSeconds * 1000,
    );
    const countdown: WatchPartyNextEpisodeCountdownState = {
      id: randomUUID(),
      roomId,
      currentContentId: nextEpisode.currentContentId,
      currentSequence: nextEpisode.currentSequence,
      nextEpisode: nextEpisode.nextEpisode,
      durationSeconds: this.nextEpisodeCountdownSeconds,
      startedAt: now.toISOString(),
      startsAt: startsAt.toISOString(),
    };

    const ttl =
      this.nextEpisodeCountdownSeconds +
      NEXT_EPISODE_COUNTDOWN_EXTRA_TTL_SECONDS;
    const result = await this.redis.set(
      this.nextEpisodeKey(roomId),
      JSON.stringify(countdown),
      'EX',
      ttl,
      'NX',
    );

    if (result !== 'OK') {
      const active = await this.getNextEpisodeCountdown(roomId);
      if (active) {
        this.scheduleNextEpisodeCountdown(active);
      }
      return active;
    }

    this.scheduleNextEpisodeCountdown(countdown);
    return countdown;
  }

  private scheduleNextEpisodeCountdown(
    countdown: WatchPartyNextEpisodeCountdownState,
  ) {
    if (this.nextEpisodeTimers.has(countdown.roomId)) return;

    const delayMs = Math.max(
      0,
      new Date(countdown.startsAt).getTime() - Date.now(),
    );
    const timer = setTimeout(() => {
      this.nextEpisodeTimers.delete(countdown.roomId);
      this.completeNextEpisodeCountdown(countdown.roomId, countdown.id).catch(
        (error) => {
          this.logger.warn(
            `Failed to complete next episode countdown: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        },
      );
    }, delayMs);

    this.nextEpisodeTimers.set(countdown.roomId, timer);
  }

  private async cancelNextEpisodeCountdown(roomId: string) {
    const timer = this.nextEpisodeTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.nextEpisodeTimers.delete(roomId);
    }

    await this.redis.del(this.nextEpisodeKey(roomId));
  }

  private async completeNextEpisodeCountdown(
    roomId: string,
    countdownId: string,
  ) {
    await this.startNextEpisodeFromCountdown(roomId, null, countdownId);
  }

  private async startNextEpisodeFromCountdown(
    roomId: string,
    userId: string | null,
    countdownId?: string,
  ) {
    const countdown = await this.getNextEpisodeCountdown(roomId);
    if (!countdown) {
      return null;
    }

    if (countdownId && countdown.id !== countdownId) {
      throw new Error('Countdown is stale');
    }

    await this.cancelNextEpisodeCountdown(roomId);
    const result = await this.watchPartyService.startNextEpisode(roomId, userId, {
      expectedContentId: countdown.currentContentId,
      nextEpisodeId: (countdown.nextEpisode as { id: string }).id,
    });

    if (!result) {
      this.server.to(this.roomName(roomId)).emit('watch-party:next-episode-cancel', {
        roomId,
        countdownId: countdown.id,
      });
      return null;
    }

    this.server.to(this.roomName(roomId)).emit('watch-party:next-episode-start', {
      roomId,
      countdownId: countdown.id,
      nextEpisode: countdown.nextEpisode,
      room: result.room,
      playbackState: result.playbackState,
    });
    this.server.to(this.roomName(roomId)).emit('watch-party:content-changed', {
      ...result,
      countdownId: countdown.id,
    });
    this.server
      .to(this.roomName(roomId))
      .emit('watch-party:playback-state', result.playbackState);

    return result;
  }

  private broadcastHostChanged(
    roomId: string,
    hostUserId: string | undefined,
    room: unknown,
  ) {
    this.server.to(this.roomName(roomId)).emit('watch-party:host-changed', {
      roomId,
      hostUserId,
      room,
    });
  }

  private sendAck<T extends Parameters<SocketAck>[0]>(
    ack: SocketAck | undefined,
    response: T,
  ) {
    ack?.(response);
    return response;
  }

  private async handlePlaybackAction(
    client: AuthenticatedSocket,
    payload: WatchPartyPlaybackPayload,
    action: 'PLAY' | 'PAUSE' | 'SEEK',
    eventName: 'watch-party:play' | 'watch-party:pause' | 'watch-party:seek',
    ack?: SocketAck,
  ) {
    try {
      const userId = this.requireUser(client);
      const roomId = this.resolveRoomId(client, payload?.roomId);
      const playbackState = await this.watchPartyService.updatePlaybackState(
        userId,
        {
          roomId,
          action,
          currentTime: payload?.currentTime,
          playbackRate: payload?.playbackRate,
          sequence: payload?.sequence,
        },
      );

      this.server.to(this.roomName(roomId)).emit(eventName, playbackState);
      this.server
        .to(this.roomName(roomId))
        .emit('watch-party:playback-state', playbackState);
      return this.sendAck(ack, {
        ok: true,
        data: playbackState,
      });
    } catch (error) {
      const errorPayload = this.errorAck(error);
      // A stale playback command is an expected optimistic-concurrency race.
      // Return it through ACK so the host can refresh sequence and retry, but
      // do not surface it as a room-wide/user-facing error banner.
      if (!String(errorPayload.message || "").toLowerCase().includes("playback event is stale")) {
        this.emitError(client, error);
      }
      return this.sendAck(ack, errorPayload);
    }
  }

  private emitError(client: AuthenticatedSocket, error: unknown) {
    const ack = this.errorAck(error);
    client.emit('watch-party:error', {
      code: ack.code,
      message: ack.message,
    });
  }

  private errorAck(error: unknown) {
    const anyError = error as {
      status?: number;
      name?: string;
      message?: string;
    };

    return {
      ok: false,
      code: anyError.name ?? 'WATCH_PARTY_ERROR',
      message: anyError.message ?? 'Watch party error',
    };
  }
}
