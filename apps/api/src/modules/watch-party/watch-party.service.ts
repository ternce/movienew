import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ContentStatus,
  ContentType,
  Prisma,
  WatchPartyConnectionStatus,
  WatchPartyParticipantRole,
  WatchPartyPollStatus,
  WatchPartyPlaybackStatus,
  WatchPartyRoomStatus,
} from '@prisma/client';
import { randomBytes } from 'crypto';

import { PrismaService } from '../../config/prisma.service';
import {
  CloseWatchPartyPollDto,
  CreateWatchPartyPollDto,
  CreateWatchPartyRoomDto,
  JoinWatchPartyRoomDto,
  StartWatchPartyPollWinnerDto,
  VoteWatchPartyPollDto,
} from './dto';

const ROOM_INCLUDE = {
  content: {
    select: {
      id: true,
      title: true,
      slug: true,
      contentType: true,
      description: true,
      thumbnailUrl: true,
      duration: true,
      series: {
        select: { seasonNumber: true, episodeNumber: true },
      },
    },
  },
  episode: {
    select: {
      id: true,
      title: true,
      slug: true,
      contentType: true,
      description: true,
      thumbnailUrl: true,
      duration: true,
      series: {
        select: { seasonNumber: true, episodeNumber: true },
      },
    },
  },
  participants: {
    orderBy: { joinedAt: 'asc' as const },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          avatarUrl: true,
        },
      },
    },
  },
} satisfies Prisma.WatchPartyRoomInclude;

const MESSAGE_SENDER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  username: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

const MESSAGE_INCLUDE = {
  sender: {
    select: MESSAGE_SENDER_SELECT,
  },
} satisfies Prisma.WatchPartyMessageInclude;

const POLL_CONTENT_SELECT = {
  id: true,
  title: true,
  slug: true,
  contentType: true,
  thumbnailUrl: true,
  duration: true,
} satisfies Prisma.ContentSelect;

const NEXT_EPISODE_CONTENT_SELECT = {
  id: true,
  slug: true,
  title: true,
  contentType: true,
  thumbnailUrl: true,
  duration: true,
} satisfies Prisma.ContentSelect;

const POLL_INCLUDE = {
  options: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      content: { select: POLL_CONTENT_SELECT },
      episode: { select: POLL_CONTENT_SELECT },
      votes: {
        select: {
          id: true,
          userId: true,
          createdAt: true,
        },
      },
    },
  },
  votes: {
    select: {
      id: true,
      optionId: true,
      userId: true,
      createdAt: true,
    },
  },
  createdBy: {
    select: MESSAGE_SENDER_SELECT,
  },
} satisfies Prisma.WatchPartyPollInclude;

export const WATCH_PARTY_CHAT_MAX_LENGTH = 500;
export const WATCH_PARTY_CHAT_DEFAULT_LIMIT = 30;
export const WATCH_PARTY_CHAT_MAX_LIMIT = 50;
export const WATCH_PARTY_POLL_MIN_OPTIONS = 2;
export const WATCH_PARTY_POLL_MAX_OPTIONS = 6;

type WatchPartyPlaybackAction = 'PLAY' | 'PAUSE' | 'SEEK';

type UpdatePlaybackStateInput = {
  roomId: string;
  action: WatchPartyPlaybackAction;
  currentTime?: number;
  playbackRate?: number;
  sequence?: number;
};

type TransferHostInput = {
  roomId: string;
  targetUserId: string;
};

type ListMessagesInput = {
  limit?: number;
  beforeMessageId?: string;
};

type StartNextEpisodeInput = {
  expectedContentId: string;
  nextEpisodeId: string;
};

type PollOptionInput = {
  contentId: string;
  episodeId: string | null;
};

const STRUCTURED_CONTENT_TYPES = new Set<ContentType>([
  ContentType.SERIES,
  ContentType.TUTORIAL,
]);

export const WATCH_PARTY_REACTIONS = ['❤️', '🔥', '😂', '👏', '😮'] as const;
export type WatchPartyReaction = (typeof WATCH_PARTY_REACTIONS)[number];

@Injectable()
export class WatchPartyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async createRoom(userId: string, dto: CreateWatchPartyRoomDto) {
    await this.assertContentExists(dto.contentId, 'Content not found');
    if (dto.episodeId) {
      await this.assertContentExists(dto.episodeId, 'Episode not found');
    }
    await this.assertPlayableContentPublished(
      dto.episodeId ?? dto.contentId,
      'Content is not available',
    );

    const inviteToken = await this.generateUniqueInviteToken();

    const room = await this.prisma.watchPartyRoom.create({
      data: {
        inviteToken,
        hostUserId: userId,
        contentId: dto.contentId,
        episodeId: dto.episodeId,
        participants: {
          create: {
            userId,
            role: WatchPartyParticipantRole.HOST,
            connectionStatus: WatchPartyConnectionStatus.ONLINE,
          },
        },
      },
      include: ROOM_INCLUDE,
    });

    return this.mapRoom(room, userId);
  }

  async getRoom(roomId: string, userId: string) {
    const room = await this.getAuthorizedRoom(roomId, userId);
    return this.mapRoom(room, userId);
  }

  async joinRoom(userId: string, dto: JoinWatchPartyRoomDto) {
    const room = await this.prisma.watchPartyRoom.findUnique({
      where: { inviteToken: dto.inviteToken },
      include: ROOM_INCLUDE,
    });

    if (!room) {
      throw new NotFoundException('Watch party invitation not found');
    }

    if (room.status === WatchPartyRoomStatus.ENDED) {
      throw new ConflictException('Watch party has ended');
    }

    await this.prisma.watchPartyParticipant.upsert({
      where: {
        roomId_userId: {
          roomId: room.id,
          userId,
        },
      },
      update: {
        leftAt: null,
        connectionStatus: WatchPartyConnectionStatus.ONLINE,
        lastSeenAt: new Date(),
      },
      create: {
        roomId: room.id,
        userId,
        role:
          room.hostUserId === userId
            ? WatchPartyParticipantRole.HOST
            : WatchPartyParticipantRole.PARTICIPANT,
        connectionStatus: WatchPartyConnectionStatus.ONLINE,
      },
    });

    const updatedRoom = await this.prisma.watchPartyRoom.findUniqueOrThrow({
      where: { id: room.id },
      include: ROOM_INCLUDE,
    });

    return this.mapRoom(updatedRoom, userId);
  }

  async connectRealtimeParticipant(
    userId: string,
    payload: { roomId?: string; inviteToken?: string },
  ) {
    const room = payload.inviteToken
      ? await this.prisma.watchPartyRoom.findUnique({
          where: { inviteToken: payload.inviteToken },
          include: ROOM_INCLUDE,
        })
      : payload.roomId
        ? await this.prisma.watchPartyRoom.findUnique({
            where: { id: payload.roomId },
            include: ROOM_INCLUDE,
          })
        : null;

    if (!room) {
      throw new NotFoundException('Watch party room not found');
    }

    if (room.status === WatchPartyRoomStatus.ENDED) {
      throw new ConflictException('Watch party has ended');
    }

    const existingParticipant = room.participants.find(
      (p) => p.userId === userId,
    );

    if (!existingParticipant && !payload.inviteToken) {
      throw new ForbiddenException('You are not a participant in this room');
    }

    await this.prisma.watchPartyParticipant.upsert({
      where: {
        roomId_userId: {
          roomId: room.id,
          userId,
        },
      },
      update: {
        leftAt: null,
        connectionStatus: WatchPartyConnectionStatus.ONLINE,
        lastSeenAt: new Date(),
      },
      create: {
        roomId: room.id,
        userId,
        role:
          room.hostUserId === userId
            ? WatchPartyParticipantRole.HOST
            : WatchPartyParticipantRole.PARTICIPANT,
        connectionStatus: WatchPartyConnectionStatus.ONLINE,
      },
    });

    const updatedRoom = await this.prisma.watchPartyRoom.findUniqueOrThrow({
      where: { id: room.id },
      include: ROOM_INCLUDE,
    });

    return this.mapRoom(updatedRoom, userId);
  }

  async markRealtimeParticipantOffline(roomId: string, userId: string) {
    const participant = await this.prisma.watchPartyParticipant.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
    });

    if (!participant || participant.leftAt) {
      return null;
    }

    const updatedParticipant = await this.prisma.watchPartyParticipant.update({
      where: { id: participant.id },
      data: {
        connectionStatus: WatchPartyConnectionStatus.OFFLINE,
        lastSeenAt: new Date(),
      },
    });

    return this.mapParticipant(updatedParticipant);
  }

  async getParticipants(roomId: string) {
    const room = await this.prisma.watchPartyRoom.findUnique({
      where: { id: roomId },
      include: ROOM_INCLUDE,
    });

    if (!room) {
      throw new NotFoundException('Watch party room not found');
    }

    return this.mapParticipants(room.participants);
  }

  async getReactionSender(roomId: string, userId: string) {
    const room = await this.getAuthorizedRoom(roomId, userId);

    if (room.status === WatchPartyRoomStatus.ENDED) {
      throw new ConflictException('Watch party has ended');
    }

    const participant = room.participants.find(
      (roomParticipant) =>
        roomParticipant.userId === userId && !roomParticipant.leftAt,
    );

    if (!participant) {
      throw new ForbiddenException('You are not a participant in this room');
    }

    return this.mapParticipant(participant);
  }

  async listMessages(
    roomId: string,
    userId: string,
    input: ListMessagesInput = {},
  ) {
    await this.getAuthorizedRoom(roomId, userId);

    const limit = this.normalizeMessageLimit(input.limit);
    const cursorMessage = input.beforeMessageId
      ? await this.prisma.watchPartyMessage.findFirst({
          where: { id: input.beforeMessageId, roomId },
          select: { createdAt: true, id: true },
        })
      : null;

    if (input.beforeMessageId && !cursorMessage) {
      throw new NotFoundException('Message cursor not found');
    }

    const messages = await this.prisma.watchPartyMessage.findMany({
      where: {
        roomId,
        ...(cursorMessage
          ? {
              OR: [
                { createdAt: { lt: cursorMessage.createdAt } },
                { createdAt: cursorMessage.createdAt, id: { lt: cursorMessage.id } },
              ],
            }
          : {}),
      },
      include: MESSAGE_INCLUDE,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const hasMore = messages.length > limit;
    const pageItems = messages.slice(0, limit);
    const chronologicalItems = [...pageItems].reverse();

    return {
      items: chronologicalItems.map((message) => this.mapMessage(message)),
      nextCursor: hasMore ? pageItems[pageItems.length - 1]?.id : null,
      hasMore,
      limit,
    };
  }

  async createMessage(roomId: string, userId: string, text: string) {
    const room = await this.getAuthorizedRoom(roomId, userId);

    if (room.status === WatchPartyRoomStatus.ENDED) {
      throw new ConflictException('Watch party has ended');
    }

    const normalizedText = this.normalizeMessageText(text);

    const message = await this.prisma.watchPartyMessage.create({
      data: {
        roomId,
        senderUserId: userId,
        text: normalizedText,
      },
      include: MESSAGE_INCLUDE,
    });

    return this.mapMessage(message);
  }

  async getCurrentPoll(roomId: string, userId: string) {
    await this.getAuthorizedRoom(roomId, userId);

    const poll = await this.prisma.watchPartyPoll.findFirst({
      where: { roomId },
      include: POLL_INCLUDE,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });

    return poll ? this.mapPoll(poll, userId) : null;
  }

  async createPoll(userId: string, dto: CreateWatchPartyPollDto) {
    const room = await this.getAuthorizedRoom(dto.roomId, userId);
    this.assertActiveHost(room, userId, 'Only the host can create a poll');
    const options = this.normalizePollOptions(dto.options);

    const activePoll = await this.prisma.watchPartyPoll.findFirst({
      where: {
        roomId: room.id,
        status: WatchPartyPollStatus.ACTIVE,
      },
      select: { id: true },
    });

    if (activePoll) {
      throw new ConflictException('A poll is already active in this room');
    }

    await this.assertPollContentsAvailable(options);

    const poll = await this.prisma.watchPartyPoll.create({
      data: {
        roomId: room.id,
        createdByUserId: userId,
        options: {
          create: options.map((option) => ({
            contentId: option.contentId,
            episodeId: option.episodeId,
          })),
        },
      },
      include: POLL_INCLUDE,
    });

    return this.mapPoll(poll, userId);
  }

  async votePoll(userId: string, dto: VoteWatchPartyPollDto) {
    const room = await this.getAuthorizedRoom(dto.roomId, userId);
    if (room.status === WatchPartyRoomStatus.ENDED) {
      throw new ConflictException('Watch party has ended');
    }

    const poll = await this.getPollForRoom(dto.roomId, dto.pollId);
    if (poll.status !== WatchPartyPollStatus.ACTIVE) {
      throw new ConflictException('Poll is closed');
    }

    const option = poll.options.find((item: any) => item.id === dto.optionId);
    if (!option) {
      throw new NotFoundException('Poll option not found');
    }

    const existingVote = poll.votes.find((vote: any) => vote.userId === userId);
    if (existingVote) {
      throw new ConflictException('You have already voted in this poll');
    }

    try {
      await this.prisma.watchPartyPollVote.create({
        data: {
          pollId: poll.id,
          optionId: option.id,
          userId,
        },
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new ConflictException('You have already voted in this poll');
      }
      throw error;
    }

    const updatedPoll = await this.getPollForRoom(dto.roomId, dto.pollId);
    return this.mapPoll(updatedPoll, userId);
  }

  async closePoll(userId: string, dto: CloseWatchPartyPollDto) {
    const room = await this.getAuthorizedRoom(dto.roomId, userId);
    this.assertActiveHost(room, userId, 'Only the host can close a poll');

    const poll = await this.getPollForRoom(dto.roomId, dto.pollId);
    if (poll.status === WatchPartyPollStatus.CLOSED) {
      return this.mapPoll(poll, userId);
    }

    const updatedPoll = await this.prisma.watchPartyPoll.update({
      where: { id: poll.id },
      data: {
        status: WatchPartyPollStatus.CLOSED,
        closedAt: new Date(),
      },
      include: POLL_INCLUDE,
    });

    return this.mapPoll(updatedPoll, userId);
  }

  async startPollWinner(userId: string, dto: StartWatchPartyPollWinnerDto) {
    const room = await this.getAuthorizedRoom(dto.roomId, userId);
    this.assertActiveHost(
      room,
      userId,
      'Only the host can start the winning content',
    );

    const poll = await this.getPollForRoom(dto.roomId, dto.pollId);
    if (poll.status !== WatchPartyPollStatus.CLOSED) {
      throw new ConflictException('Poll must be closed before starting a winner');
    }

    const winnerOptionIds = this.getWinnerOptionIds(poll);
    const selectedOptionId =
      winnerOptionIds.length === 1 ? winnerOptionIds[0] : dto.optionId;

    if (!selectedOptionId || !winnerOptionIds.includes(selectedOptionId)) {
      throw new BadRequestException(
        'Host must select one of the tied winning options',
      );
    }

    const selectedOption = poll.options.find(
      (option: any) => option.id === selectedOptionId,
    );
    if (!selectedOption) {
      throw new NotFoundException('Winning poll option not found');
    }

    await this.assertPollContentsAvailable(
      [
        {
          contentId: selectedOption.contentId,
          episodeId: selectedOption.episodeId ?? null,
        },
      ],
      'Winning poll option content is not available',
    );

    const updatedRoom = await this.prisma.watchPartyRoom.update({
      where: { id: room.id },
      data: {
        contentId: selectedOption.contentId,
        episodeId: selectedOption.episodeId,
        currentTime: 0,
        // A poll winner is an explicit "play next" action. Start it immediately
        // instead of switching the room to a paused frame. The gateway broadcasts
        // this playback state to every participant.
        playbackStatus: WatchPartyPlaybackStatus.PLAYING,
        playbackRate: 1,
        sequence: { increment: 1 },
      },
      include: ROOM_INCLUDE,
    });

    return {
      room: this.mapRoom(updatedRoom, userId),
      poll: this.mapPoll(poll, userId),
      selectedOptionId,
      contentId: selectedOption.contentId,
      episodeId: selectedOption.episodeId,
      playbackState: this.mapPlaybackState(updatedRoom),
    };
  }

  async getNextEpisodeForRoom(roomId: string, userId: string) {
    const room = await this.getAuthorizedRoom(roomId, userId);

    if (room.status === WatchPartyRoomStatus.ENDED) {
      throw new ConflictException('Watch party has ended');
    }

    const currentContentId = this.getRoomPlayableContentId(room);
    const nextEpisode = await this.findNextEpisodeForContent(currentContentId);

    if (!nextEpisode) {
      return null;
    }

    return {
      roomId: room.id,
      currentContentId,
      currentSequence: room.sequence,
      nextEpisode,
    };
  }

  async startNextEpisode(
    roomId: string,
    userId: string | null,
    input: StartNextEpisodeInput,
  ) {
    const room = userId
      ? await this.getAuthorizedRoom(roomId, userId)
      : await this.prisma.watchPartyRoom.findUnique({
          where: { id: roomId },
          include: ROOM_INCLUDE,
        });

    if (!room) {
      throw new NotFoundException('Watch party room not found');
    }

    if (room.status === WatchPartyRoomStatus.ENDED) {
      throw new ConflictException('Watch party has ended');
    }

    if (userId && room.hostUserId !== userId) {
      throw new ForbiddenException('Only the host can start the next episode');
    }

    const currentContentId = this.getRoomPlayableContentId(room);
    if (currentContentId !== input.expectedContentId) {
      return null;
    }

    const nextEpisode = await this.findNextEpisodeForContent(currentContentId);
    if (!nextEpisode || nextEpisode.id !== input.nextEpisodeId) {
      return null;
    }

    const keepsRootContent =
      Boolean(room.episodeId) || room.contentId !== currentContentId;
    const updates = keepsRootContent
        ? {
            episodeId: nextEpisode.id,
          }
        : {
            contentId: nextEpisode.id,
            episodeId: null,
          };

    const updatedRoom = await this.prisma.watchPartyRoom.update({
      where: { id: room.id },
      data: {
        ...updates,
        currentTime: 0,
        playbackStatus: WatchPartyPlaybackStatus.PLAYING,
        playbackRate: 1,
        sequence: { increment: 1 },
      },
      include: ROOM_INCLUDE,
    });

    return {
      room: this.mapRoom(updatedRoom, userId ?? undefined),
      nextEpisode,
      contentId: updatedRoom.contentId,
      episodeId: updatedRoom.episodeId,
      playbackState: this.mapPlaybackState(updatedRoom),
    };
  }

  async transferHost(userId: string, input: TransferHostInput) {
    const room = await this.getAuthorizedRoom(input.roomId, userId);

    if (room.status === WatchPartyRoomStatus.ENDED) {
      throw new ConflictException('Watch party has ended');
    }

    if (room.hostUserId !== userId) {
      throw new ForbiddenException('Only the host can transfer host rights');
    }

    if (input.targetUserId === userId) {
      throw new BadRequestException('Host cannot transfer to themselves');
    }

    const targetParticipant = room.participants.find(
      (participant) =>
        participant.userId === input.targetUserId && !participant.leftAt,
    );

    if (!targetParticipant) {
      throw new NotFoundException('Target participant not found');
    }

    if (
      targetParticipant.connectionStatus !== WatchPartyConnectionStatus.ONLINE
    ) {
      throw new ConflictException('Target participant is not connected');
    }

    const updatedRoom = await this.updateHostOwnership(
      room.id,
      input.targetUserId,
    );

    return this.mapRoom(updatedRoom, userId);
  }

  async getPlaybackState(roomId: string, userId: string) {
    const room = await this.getAuthorizedRoom(roomId, userId);

    if (room.status === WatchPartyRoomStatus.ENDED) {
      throw new ConflictException('Watch party has ended');
    }

    return this.mapPlaybackState(room);
  }

  async updatePlaybackState(userId: string, input: UpdatePlaybackStateInput) {
    const room = await this.getAuthorizedRoom(input.roomId, userId);

    if (room.status === WatchPartyRoomStatus.ENDED) {
      throw new ConflictException('Watch party has ended');
    }

    if (room.hostUserId !== userId) {
      throw new ForbiddenException('Only the host can control playback');
    }

    if (typeof input.sequence !== 'number') {
      throw new BadRequestException('Playback sequence is required');
    }

    if (input.sequence !== room.sequence) {
      throw new ConflictException('Playback event is stale');
    }

    const currentTime =
      typeof input.currentTime === 'number'
        ? this.normalizePlaybackTime(input.currentTime)
        : this.normalizePlaybackTime(this.getEffectiveCurrentTime(room));
    const playbackRate =
      typeof input.playbackRate === 'number' && input.playbackRate > 0
        ? input.playbackRate
        : room.playbackRate;

    const data: Prisma.WatchPartyRoomUpdateInput = {
      currentTime,
      playbackRate,
      sequence: { increment: 1 },
    };

    if (input.action === 'PLAY') {
      data.playbackStatus = WatchPartyPlaybackStatus.PLAYING;
    } else if (input.action === 'PAUSE') {
      data.playbackStatus = WatchPartyPlaybackStatus.PAUSED;
    }

    const updated = await this.prisma.watchPartyRoom.update({
      where: { id: room.id },
      data,
      include: ROOM_INCLUDE,
    });

    return this.mapPlaybackState(updated);
  }

  async leaveRoom(roomId: string, userId: string) {
    const room = await this.getAuthorizedRoom(roomId, userId);

    if (room.status === WatchPartyRoomStatus.ENDED) {
      return this.mapRoom(room, userId);
    }

    const now = new Date();
    const participant = room.participants.find((p) => p.userId === userId);
    if (!participant) {
      throw new ForbiddenException('You are not a participant in this room');
    }

    if (room.hostUserId === userId) {
      const updatedRoom = await this.prisma.$transaction(async (tx) => {
        await tx.watchPartyParticipant.update({
          where: { id: participant.id },
          data: {
            leftAt: now,
            lastSeenAt: now,
            connectionStatus: WatchPartyConnectionStatus.OFFLINE,
          },
        });

        const nextHost = this.findNextConnectedHost(room, userId);
        if (!nextHost) {
          return tx.watchPartyRoom.update({
            where: { id: room.id },
            data: {
              status: WatchPartyRoomStatus.ENDED,
              endedAt: now,
            },
            include: ROOM_INCLUDE,
          });
        }

        await tx.watchPartyParticipant.updateMany({
          where: { roomId: room.id },
          data: { role: WatchPartyParticipantRole.PARTICIPANT },
        });
        await tx.watchPartyParticipant.update({
          where: { id: nextHost.id },
          data: { role: WatchPartyParticipantRole.HOST },
        });

        return tx.watchPartyRoom.update({
          where: { id: room.id },
          data: { hostUserId: nextHost.userId },
          include: ROOM_INCLUDE,
        });
      });

      const mappedRoom = this.mapRoom(updatedRoom, userId);
      return {
        ...mappedRoom,
        hostTransferred:
          updatedRoom.status !== WatchPartyRoomStatus.ENDED &&
          updatedRoom.hostUserId !== userId,
        newHostUserId:
          updatedRoom.status !== WatchPartyRoomStatus.ENDED
            ? updatedRoom.hostUserId
            : undefined,
      };
    }

    const updatedParticipant = await this.prisma.watchPartyParticipant.update({
      where: { id: participant.id },
      data: {
        leftAt: now,
        lastSeenAt: now,
        connectionStatus: WatchPartyConnectionStatus.OFFLINE,
      },
    });

    return {
      success: true,
      participant: this.mapParticipant(updatedParticipant),
      hostLeftEndsRoom: false,
    };
  }

  async endRoom(roomId: string, userId: string) {
    const room = await this.getAuthorizedRoom(roomId, userId);

    if (room.hostUserId !== userId) {
      throw new ForbiddenException('Only the host can end this watch party');
    }

    if (room.status === WatchPartyRoomStatus.ENDED) {
      return this.mapRoom(room, userId);
    }

    const updatedRoom = await this.prisma.watchPartyRoom.update({
      where: { id: room.id },
      data: {
        status: WatchPartyRoomStatus.ENDED,
        endedAt: new Date(),
      },
      include: ROOM_INCLUDE,
    });

    return this.mapRoom(updatedRoom, userId);
  }

  async reassignHostFromConnectedParticipants(roomId: string, hostUserId: string) {
    const room = await this.prisma.watchPartyRoom.findUnique({
      where: { id: roomId },
      include: ROOM_INCLUDE,
    });

    if (!room || room.status === WatchPartyRoomStatus.ENDED) {
      return null;
    }

    if (room.hostUserId !== hostUserId) {
      return this.mapRoom(room);
    }

    const nextHost = this.findNextConnectedHost(room, hostUserId);
    if (!nextHost) {
      return null;
    }

    const updatedRoom = await this.updateHostOwnership(room.id, nextHost.userId);
    return this.mapRoom(updatedRoom);
  }

  private assertActiveHost(room: any, userId: string, message: string) {
    if (room.status === WatchPartyRoomStatus.ENDED) {
      throw new ConflictException('Watch party has ended');
    }

    if (room.hostUserId !== userId) {
      throw new ForbiddenException(message);
    }
  }

  private normalizePollOptions(options: CreateWatchPartyPollDto['options']) {
    if (
      !Array.isArray(options) ||
      options.length < WATCH_PARTY_POLL_MIN_OPTIONS ||
      options.length > WATCH_PARTY_POLL_MAX_OPTIONS
    ) {
      throw new BadRequestException(
        `Poll must include ${WATCH_PARTY_POLL_MIN_OPTIONS} to ${WATCH_PARTY_POLL_MAX_OPTIONS} options`,
      );
    }

    const normalized = options.map((option) => ({
      contentId: option.contentId,
      episodeId: option.episodeId || null,
    }));
    const uniqueKeys = new Set(
      normalized.map((option) => `${option.contentId}:${option.episodeId ?? ''}`),
    );

    if (uniqueKeys.size !== normalized.length) {
      throw new BadRequestException('Poll options must be unique');
    }

    return normalized;
  }

  private async assertPollContentsAvailable(
    options: PollOptionInput[],
    unavailableMessage = 'Poll option content is not available',
  ) {
    const ids = new Set<string>();
    for (const option of options) {
      ids.add(option.contentId);
      if (option.episodeId) ids.add(option.episodeId);
    }

    const contents = await this.prisma.content.findMany({
      where: { id: { in: [...ids] } },
      select: {
        id: true,
        status: true,
        contentType: true,
        series: {
          select: {
            id: true,
            parentSeriesId: true,
          },
        },
      },
    });
    const contentById = new Map(contents.map((content) => [content.id, content]));
    const foundIds = new Set(contentById.keys());
    const missingId = [...ids].find((id) => !foundIds.has(id));

    if (missingId) {
      throw new NotFoundException('Poll option content not found');
    }

    for (const option of options) {
      const rootContent = contentById.get(option.contentId);
      if (!rootContent) continue;

      if (rootContent.status !== ContentStatus.PUBLISHED) {
        throw new ForbiddenException(unavailableMessage);
      }

      if (option.episodeId) {
        const childContent = contentById.get(option.episodeId);
        if (!childContent) continue;

        if (childContent.status !== ContentStatus.PUBLISHED) {
          throw new ForbiddenException(unavailableMessage);
        }

        if (!this.isValidStructuredChild(rootContent, childContent)) {
          throw new BadRequestException(
            'Poll option episode does not belong to the selected content',
          );
        }

        continue;
      }

      if (this.isStructuredRootContent(rootContent)) {
        throw new BadRequestException(
          'Poll option requires a playable episode or lesson',
        );
      }
    }
  }

  private isStructuredRootContent(content: {
    contentType?: ContentType | string | null;
    series?: { id?: string | null; parentSeriesId?: string | null } | null;
  }) {
    return (
      STRUCTURED_CONTENT_TYPES.has(content.contentType as ContentType) &&
      (!content.series || !content.series.parentSeriesId)
    );
  }

  private isValidStructuredChild(
    rootContent: {
      contentType?: ContentType | string | null;
      series?: { id?: string | null; parentSeriesId?: string | null } | null;
    },
    childContent: {
      series?: { parentSeriesId?: string | null } | null;
    },
  ) {
    if (!this.isStructuredRootContent(rootContent)) return false;
    const rootSeriesId = rootContent.series?.id;
    return Boolean(
      rootSeriesId &&
        childContent.series?.parentSeriesId &&
        childContent.series.parentSeriesId === rootSeriesId,
    );
  }

  private async getPollForRoom(roomId: string, pollId: string) {
    const poll = await this.prisma.watchPartyPoll.findFirst({
      where: { id: pollId, roomId },
      include: POLL_INCLUDE,
    });

    if (!poll) {
      throw new NotFoundException('Watch party poll not found');
    }

    return poll;
  }

  private getRoomPlayableContentId(room: any) {
    return room.episodeId ?? room.contentId;
  }

  private async findNextEpisodeForContent(contentId: string) {
    const current = await this.prisma.series.findUnique({
      where: { contentId },
      select: {
        id: true,
        parentSeriesId: true,
        seasonNumber: true,
        episodeNumber: true,
      },
    });

    if (!current) {
      return null;
    }

    const rootSeriesId = current.parentSeriesId ?? current.id;
    const next = await this.prisma.series.findFirst({
      where: {
        parentSeriesId: rootSeriesId,
        content: { status: ContentStatus.PUBLISHED },
        OR: [
          { seasonNumber: { gt: current.seasonNumber } },
          {
            seasonNumber: current.seasonNumber,
            episodeNumber: { gt: current.episodeNumber },
          },
        ],
      },
      orderBy: [{ seasonNumber: 'asc' }, { episodeNumber: 'asc' }],
      include: {
        content: {
          select: NEXT_EPISODE_CONTENT_SELECT,
        },
      },
    });

    if (!next?.content) {
      return null;
    }

    return {
      id: next.content.id,
      slug: next.content.slug,
      title: next.content.title,
      contentType: next.content.contentType,
      thumbnailUrl: next.content.thumbnailUrl,
      duration: next.content.duration,
      seasonNumber: next.seasonNumber,
      episodeNumber: next.episodeNumber,
    };
  }

  private async assertContentExists(contentId: string, message: string) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      select: { id: true },
    });

    if (!content) {
      throw new NotFoundException(message);
    }
  }

  private async assertPlayableContentPublished(contentId: string, message: string) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      select: { id: true, status: true },
    });

    if (!content) {
      throw new NotFoundException(message);
    }

    if (content.status !== ContentStatus.PUBLISHED) {
      throw new ForbiddenException(message);
    }
  }

  private async getAuthorizedRoom(roomId: string, userId: string) {
    const room = await this.prisma.watchPartyRoom.findUnique({
      where: { id: roomId },
      include: ROOM_INCLUDE,
    });

    if (!room) {
      throw new NotFoundException('Watch party room not found');
    }

    const participant = room.participants.find(
      (p) => p.userId === userId && !p.leftAt,
    );

    if (!participant) {
      throw new ForbiddenException('You are not a participant in this room');
    }

    return room;
  }

  private findNextConnectedHost(room: any, excludeUserId: string) {
    return [...(room.participants ?? [])]
      .filter(
        (participant) =>
          participant.userId !== excludeUserId &&
          !participant.leftAt &&
          participant.connectionStatus === WatchPartyConnectionStatus.ONLINE,
      )
      .sort(
        (a, b) =>
          new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime(),
      )[0];
  }

  private async updateHostOwnership(roomId: string, targetUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.watchPartyParticipant.updateMany({
        where: { roomId },
        data: { role: WatchPartyParticipantRole.PARTICIPANT },
      });

      await tx.watchPartyParticipant.update({
        where: {
          roomId_userId: {
            roomId,
            userId: targetUserId,
          },
        },
        data: { role: WatchPartyParticipantRole.HOST },
      });

      return tx.watchPartyRoom.update({
        where: { id: roomId },
        data: { hostUserId: targetUserId },
        include: ROOM_INCLUDE,
      });
    });
  }

  private getEffectiveCurrentTime(room: any) {
    const baseTime = Number(room.currentTime ?? 0);
    if (room.playbackStatus !== WatchPartyPlaybackStatus.PLAYING) {
      return baseTime;
    }

    const updatedAt = new Date(room.updatedAt).getTime();
    const elapsedSeconds = Math.max(0, (Date.now() - updatedAt) / 1000);

    return baseTime + elapsedSeconds * Number(room.playbackRate ?? 1);
  }

  private normalizePlaybackTime(time: number) {
    if (!Number.isFinite(time)) return 0;
    return Math.max(0, Math.round(time));
  }

  private normalizeMessageLimit(limit?: number) {
    if (!Number.isFinite(limit)) return WATCH_PARTY_CHAT_DEFAULT_LIMIT;
    return Math.min(
      WATCH_PARTY_CHAT_MAX_LIMIT,
      Math.max(1, Math.floor(limit ?? WATCH_PARTY_CHAT_DEFAULT_LIMIT)),
    );
  }

  private normalizeMessageText(text: string) {
    const normalizedText = typeof text === 'string' ? text.trim() : '';

    if (!normalizedText) {
      throw new BadRequestException('Message text is required');
    }

    if (normalizedText.length > WATCH_PARTY_CHAT_MAX_LENGTH) {
      throw new BadRequestException(
        `Message must be ${WATCH_PARTY_CHAT_MAX_LENGTH} characters or less`,
      );
    }

    return normalizedText;
  }

  private mapPlaybackState(room: any) {
    const serverTime = new Date();

    return {
      roomId: room.id,
      inviteToken: room.inviteToken,
      hostUserId: room.hostUserId,
      contentId: room.contentId,
      episodeId: room.episodeId,
      status: room.status,
      playbackStatus: room.playbackStatus,
      currentTime: room.currentTime,
      effectiveCurrentTime: this.getEffectiveCurrentTime(room),
      playbackRate: room.playbackRate,
      sequence: room.sequence,
      updatedAt: room.updatedAt,
      serverTime,
      content: room.content,
      episode: room.episode,
    };
  }

  private async generateUniqueInviteToken() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const token = randomBytes(32).toString('base64url');
      const existing = await this.prisma.watchPartyRoom.findUnique({
        where: { inviteToken: token },
        select: { id: true },
      });

      if (!existing) return token;
    }

    throw new BadRequestException('Failed to generate invitation token');
  }

  private getInvitationUrl(inviteToken: string) {
    const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    return `${appUrl.replace(/\/$/, '')}/watch-party/join/${inviteToken}`;
  }

  private mapRoom(room: any, currentUserId?: string) {
    return {
      id: room.id,
      inviteToken: room.inviteToken,
      invitationUrl: this.getInvitationUrl(room.inviteToken),
      hostUserId: room.hostUserId,
      contentId: room.contentId,
      episodeId: room.episodeId,
      status: room.status,
      currentTime: room.currentTime,
      playbackStatus: room.playbackStatus,
      playbackRate: room.playbackRate,
      sequence: room.sequence,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      endedAt: room.endedAt,
      content: room.content,
      episode: room.episode,
      participants: this.mapParticipants(room.participants),
      currentParticipant:
        currentUserId && room.participants
          ? this.mapParticipant(
              room.participants.find((p: any) => p.userId === currentUserId),
            )
          : null,
      playbackState: this.mapPlaybackState(room),
    };
  }

  private mapParticipant(participant: any) {
    if (!participant) return null;

    return {
      id: participant.id,
      roomId: participant.roomId,
      userId: participant.userId,
      displayName: participant.user
        ? [participant.user.firstName, participant.user.lastName]
            .filter(Boolean)
            .join(' ') ||
          participant.user.username ||
          'User'
        : undefined,
      avatarUrl: participant.user?.avatarUrl ?? undefined,
      role: participant.role,
      connectionStatus: participant.connectionStatus,
      joinedAt: participant.joinedAt,
      leftAt: participant.leftAt,
      lastSeenAt: participant.lastSeenAt,
      user: participant.user
        ? {
            id: participant.user.id,
            firstName: participant.user.firstName,
            lastName: participant.user.lastName,
            username: participant.user.username,
            avatarUrl: participant.user.avatarUrl,
          }
        : undefined,
    };
  }

  private mapParticipants(participants?: any[]) {
    return (participants ?? [])
      .filter((participant) => !participant.leftAt)
      .map((participant) => this.mapParticipant(participant));
  }

  private mapMessage(message: any) {
    return {
      id: message.id,
      roomId: message.roomId,
      text: message.text,
      senderId: message.senderUserId,
      senderDisplayName: message.sender
        ? [message.sender.firstName, message.sender.lastName]
            .filter(Boolean)
            .join(' ') ||
          message.sender.username ||
          'User'
        : 'User',
      senderAvatarUrl: message.sender?.avatarUrl ?? undefined,
      createdAt: message.createdAt,
    };
  }

  private getWinnerOptionIds(poll: any) {
    const voteCounts = new Map<string, number>();
    for (const option of poll.options ?? []) {
      voteCounts.set(option.id, option.votes?.length ?? 0);
    }

    const maxVotes = Math.max(...[...voteCounts.values()], 0);
    return [...voteCounts.entries()]
      .filter(([, count]) => count === maxVotes)
      .map(([optionId]) => optionId);
  }

  private mapPoll(poll: any, currentUserId?: string) {
    const currentUserVote = currentUserId
      ? (poll.votes ?? []).find((vote: any) => vote.userId === currentUserId)
      : null;
    const leadingOptionIds = this.getWinnerOptionIds(poll);

    return {
      id: poll.id,
      roomId: poll.roomId,
      createdByUserId: poll.createdByUserId,
      status: poll.status,
      createdAt: poll.createdAt,
      closedAt: poll.closedAt,
      currentUserOptionId: currentUserVote?.optionId ?? null,
      leadingOptionIds,
      winnerOptionIds:
        poll.status === WatchPartyPollStatus.CLOSED ? leadingOptionIds : [],
      options: (poll.options ?? []).map((option: any) => ({
        id: option.id,
        pollId: option.pollId,
        contentId: option.contentId,
        episodeId: option.episodeId,
        content: option.content,
        episode: option.episode,
        voteCount: option.votes?.length ?? 0,
        isLeading: leadingOptionIds.includes(option.id),
        isWinner:
          poll.status === WatchPartyPollStatus.CLOSED &&
          leadingOptionIds.includes(option.id),
        votedByCurrentUser: currentUserVote?.optionId === option.id,
      })),
    };
  }
}
