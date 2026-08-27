import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ContentStatus,
  WatchPartyConnectionStatus,
  WatchPartyParticipantRole,
  WatchPartyPollStatus,
  WatchPartyPlaybackStatus,
  WatchPartyRoomStatus,
} from '@prisma/client';

import { PrismaService } from '../../config/prisma.service';
import { WatchPartyService } from './watch-party.service';

const now = new Date('2026-07-25T12:00:00.000Z');

function createTransactionClient() {
  return {
    watchPartyRoom: {
      update: jest.fn(),
    },
    watchPartyParticipant: {
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };
}

function createMockPrisma() {
  const transactionClient = createTransactionClient();

  return {
    content: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    watchPartyRoom: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    watchPartyParticipant: {
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    watchPartyMessage: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    watchPartyPoll: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    watchPartyPollVote: {
      create: jest.fn(),
    },
    series: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(transactionClient)),
    transactionClient,
  };
}

function buildRoom(overrides: Record<string, unknown> = {}) {
  return {
    id: 'room-1',
    inviteToken: 'secure-invite-token',
    hostUserId: 'host-1',
    contentId: 'content-1',
    episodeId: null,
    status: WatchPartyRoomStatus.WAITING,
    currentTime: 0,
    playbackStatus: WatchPartyPlaybackStatus.PAUSED,
    playbackRate: 1,
    sequence: 0,
    createdAt: now,
    updatedAt: now,
    endedAt: null,
    content: {
      id: 'content-1',
      title: 'Movie',
      slug: 'movie',
      contentType: 'CLIP',
      thumbnailUrl: null,
      duration: 120,
    },
    episode: null,
    participants: [
      {
        id: 'participant-host',
        roomId: 'room-1',
        userId: 'host-1',
        role: WatchPartyParticipantRole.HOST,
        connectionStatus: WatchPartyConnectionStatus.ONLINE,
        joinedAt: now,
        leftAt: null,
        lastSeenAt: now,
        user: {
          id: 'host-1',
          firstName: 'Host',
          lastName: 'User',
          username: 'host',
          avatarUrl: null,
        },
      },
    ],
    ...overrides,
  };
}

function buildRoomWithGuest(overrides: Record<string, unknown> = {}) {
  return buildRoom({
    participants: [
      ...buildRoom().participants,
      {
        id: 'participant-2',
        roomId: 'room-1',
        userId: 'user-2',
        role: WatchPartyParticipantRole.PARTICIPANT,
        connectionStatus: WatchPartyConnectionStatus.ONLINE,
        joinedAt: new Date('2026-07-25T12:00:05.000Z'),
        leftAt: null,
        lastSeenAt: now,
        user: {
          id: 'user-2',
          firstName: 'Guest',
          lastName: 'User',
          username: 'guest',
          avatarUrl: null,
        },
      },
    ],
    ...overrides,
  });
}

function buildMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: 'message-1',
    roomId: 'room-1',
    senderUserId: 'host-1',
    text: 'Hello room',
    createdAt: now,
    sender: {
      id: 'host-1',
      firstName: 'Host',
      lastName: 'User',
      username: 'host',
      avatarUrl: null,
    },
    ...overrides,
  };
}

function buildPoll(overrides: Record<string, unknown> = {}) {
  return {
    id: 'poll-1',
    roomId: 'room-1',
    createdByUserId: 'host-1',
    status: WatchPartyPollStatus.ACTIVE,
    createdAt: now,
    closedAt: null,
    createdBy: {
      id: 'host-1',
      firstName: 'Host',
      lastName: 'User',
      username: 'host',
      avatarUrl: null,
    },
    options: [
      {
        id: 'option-1',
        pollId: 'poll-1',
        contentId: 'content-2',
        episodeId: null,
        createdAt: now,
        content: {
          id: 'content-2',
          title: 'Next Movie',
          slug: 'next-movie',
          contentType: 'CLIP',
          thumbnailUrl: null,
          duration: 90,
        },
        episode: null,
        votes: [],
      },
      {
        id: 'option-2',
        pollId: 'poll-1',
        contentId: 'content-3',
        episodeId: null,
        createdAt: now,
        content: {
          id: 'content-3',
          title: 'Other Movie',
          slug: 'other-movie',
          contentType: 'CLIP',
          thumbnailUrl: null,
          duration: 95,
        },
        episode: null,
        votes: [],
      },
    ],
    votes: [],
    ...overrides,
  };
}

function buildPollContent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'content-2',
    status: ContentStatus.PUBLISHED,
    contentType: 'CLIP',
    series: null,
    ...overrides,
  };
}

function buildRootSeriesContent(overrides: Record<string, unknown> = {}) {
  return buildPollContent({
    id: 'series-root-content',
    contentType: 'SERIES',
    series: {
      id: 'series-root',
      parentSeriesId: null,
    },
    ...overrides,
  });
}

function buildRootTutorialContent(overrides: Record<string, unknown> = {}) {
  return buildPollContent({
    id: 'tutorial-root-content',
    contentType: 'TUTORIAL',
    series: {
      id: 'tutorial-root',
      parentSeriesId: null,
    },
    ...overrides,
  });
}

function buildChildSeriesContent(overrides: Record<string, unknown> = {}) {
  return buildPollContent({
    id: 'episode-1',
    contentType: 'SERIES',
    series: {
      id: 'series-episode-1',
      parentSeriesId: 'series-root',
    },
    ...overrides,
  });
}

function buildChildTutorialContent(overrides: Record<string, unknown> = {}) {
  return buildPollContent({
    id: 'lesson-1',
    contentType: 'TUTORIAL',
    series: {
      id: 'tutorial-lesson-1',
      parentSeriesId: 'tutorial-root',
    },
    ...overrides,
  });
}

function buildSeriesEpisode(overrides: Record<string, unknown> = {}) {
  return {
    id: 'series-current',
    parentSeriesId: 'series-root',
    seasonNumber: 1,
    episodeNumber: 1,
    ...overrides,
  };
}

function buildNextSeriesEpisode(overrides: Record<string, unknown> = {}) {
  return {
    id: 'series-next',
    parentSeriesId: 'series-root',
    seasonNumber: 1,
    episodeNumber: 2,
    content: {
      id: 'episode-2',
      slug: 'episode-2',
      title: 'Episode 2',
      contentType: 'SERIES',
      thumbnailUrl: null,
      duration: 100,
    },
    ...overrides,
  };
}

describe('WatchPartyService', () => {
  let service: WatchPartyService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createMockPrisma();
    service = new WatchPartyService(
      prisma as unknown as PrismaService,
      { get: jest.fn(() => 'http://localhost:3000') } as any,
    );
  });

  it('creates a room with the current user as host', async () => {
    const room = buildRoom();
    prisma.content.findUnique
      .mockResolvedValueOnce({ id: 'content-1' })
      .mockResolvedValueOnce({ id: 'content-1', status: ContentStatus.PUBLISHED });
    prisma.watchPartyRoom.findUnique.mockResolvedValue(null);
    prisma.watchPartyRoom.create.mockResolvedValue(room);

    const result = await service.createRoom('host-1', { contentId: 'content-1' });

    expect(prisma.content.findUnique).toHaveBeenCalledWith({
      where: { id: 'content-1' },
      select: { id: true },
    });
    expect(prisma.content.findUnique).toHaveBeenCalledWith({
      where: { id: 'content-1' },
      select: { id: true, status: true },
    });
    expect(prisma.watchPartyRoom.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          hostUserId: 'host-1',
          contentId: 'content-1',
          inviteToken: expect.any(String),
          participants: {
            create: {
              userId: 'host-1',
              role: WatchPartyParticipantRole.HOST,
              connectionStatus: WatchPartyConnectionStatus.ONLINE,
            },
          },
        }),
      }),
    );
    expect(result.hostUserId).toBe('host-1');
    expect(result.invitationUrl).toContain('/watch-party/join/');
  });

  it('joins a room by invite token', async () => {
    const joinedRoom = buildRoom({
      participants: [
        ...buildRoom().participants,
        {
          id: 'participant-2',
          roomId: 'room-1',
          userId: 'user-2',
          role: WatchPartyParticipantRole.PARTICIPANT,
          connectionStatus: WatchPartyConnectionStatus.ONLINE,
          joinedAt: now,
          leftAt: null,
          lastSeenAt: now,
          user: {
            id: 'user-2',
            firstName: 'Guest',
            lastName: 'User',
            username: 'guest',
            avatarUrl: null,
          },
        },
      ],
    });
    prisma.watchPartyRoom.findUnique.mockResolvedValue(buildRoom());
    prisma.watchPartyParticipant.upsert.mockResolvedValue(joinedRoom.participants[1]);
    prisma.watchPartyRoom.findUniqueOrThrow.mockResolvedValue(joinedRoom);

    const result = await service.joinRoom('user-2', {
      inviteToken: 'secure-invite-token',
    });

    expect(prisma.watchPartyParticipant.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { roomId_userId: { roomId: 'room-1', userId: 'user-2' } },
        create: expect.objectContaining({
          roomId: 'room-1',
          userId: 'user-2',
          role: WatchPartyParticipantRole.PARTICIPANT,
        }),
      }),
    );
    expect(result.currentParticipant.userId).toBe('user-2');
  });

  it('prevents duplicate participants when joining twice', async () => {
    const existingRoom = buildRoom({
      participants: [
        ...buildRoom().participants,
        {
          id: 'participant-2',
          roomId: 'room-1',
          userId: 'user-2',
          role: WatchPartyParticipantRole.PARTICIPANT,
          connectionStatus: WatchPartyConnectionStatus.ONLINE,
          joinedAt: now,
          leftAt: null,
          lastSeenAt: now,
        },
      ],
    });
    prisma.watchPartyRoom.findUnique.mockResolvedValue(existingRoom);
    prisma.watchPartyParticipant.upsert.mockResolvedValue(existingRoom.participants[1]);
    prisma.watchPartyRoom.findUniqueOrThrow.mockResolvedValue(existingRoom);

    await service.joinRoom('user-2', { inviteToken: 'secure-invite-token' });

    expect(prisma.watchPartyParticipant.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { roomId_userId: { roomId: 'room-1', userId: 'user-2' } },
        update: expect.objectContaining({
          leftAt: null,
          connectionStatus: WatchPartyConnectionStatus.ONLINE,
        }),
      }),
    );
  });

  it('rejects joining an ended room', async () => {
    prisma.watchPartyRoom.findUnique.mockResolvedValue(
      buildRoom({ status: WatchPartyRoomStatus.ENDED }),
    );

    await expect(
      service.joinRoom('user-2', { inviteToken: 'secure-invite-token' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.watchPartyParticipant.upsert).not.toHaveBeenCalled();
  });

  it('rejects room access for users who are not participants', async () => {
    prisma.watchPartyRoom.findUnique.mockResolvedValue(buildRoom());

    await expect(service.getRoom('room-1', 'stranger')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows the host to end the room', async () => {
    prisma.watchPartyRoom.findUnique.mockResolvedValue(buildRoom());
    prisma.watchPartyRoom.update.mockResolvedValue(
      buildRoom({ status: WatchPartyRoomStatus.ENDED, endedAt: now }),
    );

    const result = await service.endRoom('room-1', 'host-1');

    expect(prisma.watchPartyRoom.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'room-1' },
        data: expect.objectContaining({
          status: WatchPartyRoomStatus.ENDED,
          endedAt: expect.any(Date),
        }),
      }),
    );
    expect(result.status).toBe(WatchPartyRoomStatus.ENDED);
  });

  it('rejects ordinary participants trying to end the room', async () => {
    prisma.watchPartyRoom.findUnique.mockResolvedValue(
      buildRoom({
        participants: [
          ...buildRoom().participants,
          {
            id: 'participant-2',
            roomId: 'room-1',
            userId: 'user-2',
            role: WatchPartyParticipantRole.PARTICIPANT,
            connectionStatus: WatchPartyConnectionStatus.ONLINE,
            joinedAt: now,
            leftAt: null,
            lastSeenAt: now,
          },
        ],
      }),
    );

    await expect(service.endRoom('room-1', 'user-2')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.watchPartyRoom.update).not.toHaveBeenCalled();
  });

  it('returns not found when creating a room for missing content', async () => {
    prisma.content.findUnique.mockResolvedValue(null);

    await expect(
      service.createRoom('host-1', { contentId: 'missing-content' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.watchPartyRoom.create).not.toHaveBeenCalled();
  });

  it('rejects unavailable content when creating a room', async () => {
    prisma.content.findUnique
      .mockResolvedValueOnce({ id: 'content-1' })
      .mockResolvedValueOnce({ id: 'content-1', status: ContentStatus.DRAFT });

    await expect(
      service.createRoom('host-1', { contentId: 'content-1' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.watchPartyRoom.create).not.toHaveBeenCalled();
  });

  it('allows the host to publish a play state and increments sequence', async () => {
    prisma.watchPartyRoom.findUnique.mockResolvedValue(buildRoom());
    prisma.watchPartyRoom.update.mockResolvedValue(
      buildRoom({
        playbackStatus: WatchPartyPlaybackStatus.PLAYING,
        currentTime: 42,
        sequence: 1,
      }),
    );

    const result = await service.updatePlaybackState('host-1', {
      roomId: 'room-1',
      action: 'PLAY',
      currentTime: 42,
      sequence: 0,
    });

    expect(prisma.watchPartyRoom.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'room-1' },
        data: expect.objectContaining({
          currentTime: 42,
          playbackStatus: WatchPartyPlaybackStatus.PLAYING,
          sequence: { increment: 1 },
        }),
      }),
    );
    expect(result.playbackStatus).toBe(WatchPartyPlaybackStatus.PLAYING);
    expect(result.sequence).toBe(1);
  });

  it('rejects participant playback control', async () => {
    prisma.watchPartyRoom.findUnique.mockResolvedValue(
      buildRoom({
        participants: [
          ...buildRoom().participants,
          {
            id: 'participant-2',
            roomId: 'room-1',
            userId: 'user-2',
            role: WatchPartyParticipantRole.PARTICIPANT,
            connectionStatus: WatchPartyConnectionStatus.ONLINE,
            joinedAt: now,
            leftAt: null,
            lastSeenAt: now,
          },
        ],
      }),
    );

    await expect(
      service.updatePlaybackState('user-2', {
        roomId: 'room-1',
        action: 'PAUSE',
        currentTime: 10,
        sequence: 0,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.watchPartyRoom.update).not.toHaveBeenCalled();
  });

  it('rejects stale playback events', async () => {
    prisma.watchPartyRoom.findUnique.mockResolvedValue(
      buildRoom({
        sequence: 3,
      }),
    );

    await expect(
      service.updatePlaybackState('host-1', {
        roomId: 'room-1',
        action: 'SEEK',
        currentTime: 20,
        sequence: 2,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.watchPartyRoom.update).not.toHaveBeenCalled();
  });

  it('rejects playback events without an authoritative sequence', async () => {
    prisma.watchPartyRoom.findUnique.mockResolvedValue(buildRoom());

    await expect(
      service.updatePlaybackState('host-1', {
        roomId: 'room-1',
        action: 'PLAY',
        currentTime: 20,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.watchPartyRoom.update).not.toHaveBeenCalled();
  });

  it('returns effective current time while playing', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-25T12:00:10.000Z'));
    prisma.watchPartyRoom.findUnique.mockResolvedValue(
      buildRoom({
        playbackStatus: WatchPartyPlaybackStatus.PLAYING,
        currentTime: 30,
        updatedAt: new Date('2026-07-25T12:00:00.000Z'),
      }),
    );

    const result = await service.getPlaybackState('room-1', 'host-1');

    expect(result.effectiveCurrentTime).toBe(40);
    jest.useRealTimers();
  });

  it('transfers host rights to a connected participant without changing playback state', async () => {
    const updatedRoom = buildRoomWithGuest({
      hostUserId: 'user-2',
      currentTime: 55,
      playbackStatus: WatchPartyPlaybackStatus.PLAYING,
      sequence: 7,
      participants: [
        {
          ...buildRoom().participants[0],
          role: WatchPartyParticipantRole.PARTICIPANT,
        },
        {
          ...buildRoomWithGuest().participants[1],
          role: WatchPartyParticipantRole.HOST,
        },
      ],
    });
    prisma.watchPartyRoom.findUnique.mockResolvedValue(buildRoomWithGuest());
    prisma.transactionClient.watchPartyRoom.update.mockResolvedValue(updatedRoom);

    const result = await service.transferHost('host-1', {
      roomId: 'room-1',
      targetUserId: 'user-2',
    });

    expect(prisma.transactionClient.watchPartyParticipant.updateMany).toHaveBeenCalledWith({
      where: { roomId: 'room-1' },
      data: { role: WatchPartyParticipantRole.PARTICIPANT },
    });
    expect(prisma.transactionClient.watchPartyRoom.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'room-1' },
        data: { hostUserId: 'user-2' },
      }),
    );
    expect(result.hostUserId).toBe('user-2');
    expect(result.currentTime).toBe(55);
    expect(result.sequence).toBe(7);
  });

  it('rejects participant attempting host transfer', async () => {
    prisma.watchPartyRoom.findUnique.mockResolvedValue(buildRoomWithGuest());

    await expect(
      service.transferHost('user-2', {
        roomId: 'room-1',
        targetUserId: 'host-1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects host transfer to a non-member', async () => {
    prisma.watchPartyRoom.findUnique.mockResolvedValue(buildRoomWithGuest());

    await expect(
      service.transferHost('host-1', {
        roomId: 'room-1',
        targetUserId: 'missing-user',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects host transfer to a disconnected member', async () => {
    prisma.watchPartyRoom.findUnique.mockResolvedValue(
      buildRoomWithGuest({
        participants: [
          buildRoom().participants[0],
          {
            ...buildRoomWithGuest().participants[1],
            connectionStatus: WatchPartyConnectionStatus.OFFLINE,
          },
        ],
      }),
    );

    await expect(
      service.transferHost('host-1', {
        roomId: 'room-1',
        targetUserId: 'user-2',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('auto-transfers host when the host leaves and another participant is connected', async () => {
    const updatedRoom = buildRoomWithGuest({
      hostUserId: 'user-2',
      participants: [
        {
          ...buildRoom().participants[0],
          role: WatchPartyParticipantRole.PARTICIPANT,
          leftAt: now,
          connectionStatus: WatchPartyConnectionStatus.OFFLINE,
        },
        {
          ...buildRoomWithGuest().participants[1],
          role: WatchPartyParticipantRole.HOST,
        },
      ],
    });
    prisma.watchPartyRoom.findUnique.mockResolvedValue(buildRoomWithGuest());
    prisma.transactionClient.watchPartyRoom.update.mockResolvedValue(updatedRoom);

    const result = await service.leaveRoom('room-1', 'host-1');

    expect((result as { hostTransferred?: boolean }).hostTransferred).toBe(true);
    expect((result as { newHostUserId?: string }).newHostUserId).toBe('user-2');
  });

  it('allows only the new host to control playback after transfer', async () => {
    prisma.watchPartyRoom.findUnique.mockResolvedValue(
      buildRoomWithGuest({ hostUserId: 'user-2' }),
    );
    prisma.watchPartyRoom.update.mockResolvedValue(
      buildRoomWithGuest({
        hostUserId: 'user-2',
        playbackStatus: WatchPartyPlaybackStatus.PAUSED,
        currentTime: 80,
        sequence: 8,
      }),
    );

    await expect(
      service.updatePlaybackState('host-1', {
        roomId: 'room-1',
        action: 'PAUSE',
        currentTime: 80,
        sequence: 7,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const result = await service.updatePlaybackState('user-2', {
      roomId: 'room-1',
      action: 'PAUSE',
      currentTime: 80,
      sequence: 0,
    });

    expect(result.hostUserId).toBe('user-2');
  });

  it('creates a room chat message for an active member', async () => {
    prisma.watchPartyRoom.findUnique.mockResolvedValue(buildRoom());
    prisma.watchPartyMessage.create.mockResolvedValue(buildMessage());

    const result = await service.createMessage('room-1', 'host-1', ' Hello room ');

    expect(prisma.watchPartyMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          roomId: 'room-1',
          senderUserId: 'host-1',
          text: 'Hello room',
        },
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 'message-1',
        text: 'Hello room',
        senderId: 'host-1',
        senderDisplayName: 'Host User',
      }),
    );
  });

  it('loads paginated room chat history', async () => {
    prisma.watchPartyRoom.findUnique.mockResolvedValue(buildRoom());
    prisma.watchPartyMessage.findMany.mockResolvedValue([
      buildMessage({ id: 'message-3', text: 'Newest' }),
      buildMessage({ id: 'message-2', text: 'Middle' }),
      buildMessage({ id: 'message-1', text: 'Oldest' }),
    ]);

    const result = await service.listMessages('room-1', 'host-1', {
      limit: 2,
    });

    expect(prisma.watchPartyMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { roomId: 'room-1' },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 3,
      }),
    );
    expect(result.items.map((message) => message.id)).toEqual([
      'message-2',
      'message-3',
    ]);
    expect(result.nextCursor).toBe('message-2');
    expect(result.hasMore).toBe(true);
  });

  it('rejects chat history for unauthorized users', async () => {
    prisma.watchPartyRoom.findUnique.mockResolvedValue(buildRoom());

    await expect(
      service.listMessages('room-1', 'stranger'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('stores XSS chat payload as plain text', async () => {
    const text = '<img src=x onerror=alert(1)>';
    prisma.watchPartyRoom.findUnique.mockResolvedValue(buildRoom());
    prisma.watchPartyMessage.create.mockResolvedValue(
      buildMessage({ text }),
    );

    const result = await service.createMessage('room-1', 'host-1', text);

    expect(result.text).toBe(text);
  });

  it('rejects excessive chat message length', async () => {
    prisma.watchPartyRoom.findUnique.mockResolvedValue(buildRoom());

    await expect(
      service.createMessage('room-1', 'host-1', 'x'.repeat(501)),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.watchPartyMessage.create).not.toHaveBeenCalled();
  });

  it('rejects chat messages after the room ends', async () => {
    prisma.watchPartyRoom.findUnique.mockResolvedValue(
      buildRoom({ status: WatchPartyRoomStatus.ENDED }),
    );

    await expect(
      service.createMessage('room-1', 'host-1', 'Nope'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('allows the host to create a next-content poll', async () => {
    prisma.watchPartyRoom.findUnique.mockResolvedValue(buildRoom());
    prisma.watchPartyPoll.findFirst.mockResolvedValue(null);
    prisma.content.findMany.mockResolvedValue([
      { id: 'content-2', status: ContentStatus.PUBLISHED },
      { id: 'content-3', status: ContentStatus.PUBLISHED },
    ]);
    prisma.watchPartyPoll.create.mockResolvedValue(buildPoll());

    const result = await service.createPoll('host-1', {
      roomId: 'room-1',
      options: [
        { contentId: 'content-2' },
        { contentId: 'content-3' },
      ],
    });

    expect(prisma.watchPartyPoll.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          roomId: 'room-1',
          createdByUserId: 'host-1',
          options: {
            create: [
              { contentId: 'content-2', episodeId: null },
              { contentId: 'content-3', episodeId: null },
            ],
          },
        }),
      }),
    );
    expect(result.options).toHaveLength(2);
  });

  it('allows a standalone movie poll option without an episode', async () => {
    prisma.watchPartyRoom.findUnique.mockResolvedValue(buildRoom());
    prisma.watchPartyPoll.findFirst.mockResolvedValue(null);
    prisma.content.findMany.mockResolvedValue([
      buildPollContent({ id: 'movie-1', contentType: 'CLIP' }),
      buildPollContent({ id: 'movie-2', contentType: 'SHORT' }),
    ]);
    prisma.watchPartyPoll.create.mockResolvedValue(buildPoll());

    await expect(
      service.createPoll('host-1', {
        roomId: 'room-1',
        options: [{ contentId: 'movie-1' }, { contentId: 'movie-2' }],
      }),
    ).resolves.toEqual(expect.objectContaining({ id: 'poll-1' }));
  });

  it('rejects a series root poll option without a concrete episode', async () => {
    prisma.watchPartyRoom.findUnique.mockResolvedValue(buildRoom());
    prisma.watchPartyPoll.findFirst.mockResolvedValue(null);
    prisma.content.findMany.mockResolvedValue([
      buildRootSeriesContent(),
      buildPollContent({ id: 'movie-1' }),
    ]);

    await expect(
      service.createPoll('host-1', {
        roomId: 'room-1',
        options: [
          { contentId: 'series-root-content' },
          { contentId: 'movie-1' },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.watchPartyPoll.create).not.toHaveBeenCalled();
  });

  it('allows a series poll option with a valid published child episode', async () => {
    prisma.watchPartyRoom.findUnique.mockResolvedValue(buildRoom());
    prisma.watchPartyPoll.findFirst.mockResolvedValue(null);
    prisma.content.findMany.mockResolvedValue([
      buildRootSeriesContent(),
      buildChildSeriesContent(),
      buildPollContent({ id: 'movie-1' }),
    ]);
    prisma.watchPartyPoll.create.mockResolvedValue(buildPoll());

    await expect(
      service.createPoll('host-1', {
        roomId: 'room-1',
        options: [
          { contentId: 'series-root-content', episodeId: 'episode-1' },
          { contentId: 'movie-1' },
        ],
      }),
    ).resolves.toEqual(expect.objectContaining({ id: 'poll-1' }));

    expect(prisma.watchPartyPoll.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          options: {
            create: [
              { contentId: 'series-root-content', episodeId: 'episode-1' },
              { contentId: 'movie-1', episodeId: null },
            ],
          },
        }),
      }),
    );
  });

  it('rejects a series poll option when the episode belongs to another series', async () => {
    prisma.watchPartyRoom.findUnique.mockResolvedValue(buildRoom());
    prisma.watchPartyPoll.findFirst.mockResolvedValue(null);
    prisma.content.findMany.mockResolvedValue([
      buildRootSeriesContent(),
      buildChildSeriesContent({
        id: 'episode-from-series-b',
        series: {
          id: 'series-b-episode',
          parentSeriesId: 'series-b-root',
        },
      }),
      buildPollContent({ id: 'movie-1' }),
    ]);

    await expect(
      service.createPoll('host-1', {
        roomId: 'room-1',
        options: [
          {
            contentId: 'series-root-content',
            episodeId: 'episode-from-series-b',
          },
          { contentId: 'movie-1' },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.watchPartyPoll.create).not.toHaveBeenCalled();
  });

  it('rejects a series poll option with a draft child episode', async () => {
    prisma.watchPartyRoom.findUnique.mockResolvedValue(buildRoom());
    prisma.watchPartyPoll.findFirst.mockResolvedValue(null);
    prisma.content.findMany.mockResolvedValue([
      buildRootSeriesContent(),
      buildChildSeriesContent({ status: ContentStatus.DRAFT }),
      buildPollContent({ id: 'movie-1' }),
    ]);

    await expect(
      service.createPoll('host-1', {
        roomId: 'room-1',
        options: [
          { contentId: 'series-root-content', episodeId: 'episode-1' },
          { contentId: 'movie-1' },
        ],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.watchPartyPoll.create).not.toHaveBeenCalled();
  });

  it('rejects a tutorial root poll option without a concrete lesson', async () => {
    prisma.watchPartyRoom.findUnique.mockResolvedValue(buildRoom());
    prisma.watchPartyPoll.findFirst.mockResolvedValue(null);
    prisma.content.findMany.mockResolvedValue([
      buildRootTutorialContent(),
      buildPollContent({ id: 'movie-1' }),
    ]);

    await expect(
      service.createPoll('host-1', {
        roomId: 'room-1',
        options: [
          { contentId: 'tutorial-root-content' },
          { contentId: 'movie-1' },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.watchPartyPoll.create).not.toHaveBeenCalled();
  });

  it('allows a tutorial poll option with a valid published lesson', async () => {
    prisma.watchPartyRoom.findUnique.mockResolvedValue(buildRoom());
    prisma.watchPartyPoll.findFirst.mockResolvedValue(null);
    prisma.content.findMany.mockResolvedValue([
      buildRootTutorialContent(),
      buildChildTutorialContent(),
      buildPollContent({ id: 'movie-1' }),
    ]);
    prisma.watchPartyPoll.create.mockResolvedValue(buildPoll());

    await expect(
      service.createPoll('host-1', {
        roomId: 'room-1',
        options: [
          { contentId: 'tutorial-root-content', episodeId: 'lesson-1' },
          { contentId: 'movie-1' },
        ],
      }),
    ).resolves.toEqual(expect.objectContaining({ id: 'poll-1' }));
  });

  it('rejects unavailable poll option content', async () => {
    prisma.watchPartyRoom.findUnique.mockResolvedValue(buildRoom());
    prisma.watchPartyPoll.findFirst.mockResolvedValue(null);
    prisma.content.findMany.mockResolvedValue([
      { id: 'content-2', status: ContentStatus.PUBLISHED },
      { id: 'content-3', status: ContentStatus.DRAFT },
    ]);

    await expect(
      service.createPoll('host-1', {
        roomId: 'room-1',
        options: [
          { contentId: 'content-2' },
          { contentId: 'content-3' },
        ],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.watchPartyPoll.create).not.toHaveBeenCalled();
  });

  it('rejects participant poll creation', async () => {
    prisma.watchPartyRoom.findUnique.mockResolvedValue(buildRoomWithGuest());

    await expect(
      service.createPoll('user-2', {
        roomId: 'room-1',
        options: [{ contentId: 'content-2' }, { contentId: 'content-3' }],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.watchPartyPoll.create).not.toHaveBeenCalled();
  });

  it('allows a participant to vote once in an active poll', async () => {
    prisma.watchPartyRoom.findUnique.mockResolvedValue(buildRoomWithGuest());
    prisma.watchPartyPoll.findFirst
      .mockResolvedValueOnce(buildPoll())
      .mockResolvedValueOnce(
        buildPoll({
          options: [
            { ...buildPoll().options[0], votes: [{ id: 'vote-1', userId: 'user-2' }] },
            buildPoll().options[1],
          ],
          votes: [
            {
              id: 'vote-1',
              pollId: 'poll-1',
              optionId: 'option-1',
              userId: 'user-2',
              createdAt: now,
            },
          ],
        }),
      );

    const result = await service.votePoll('user-2', {
      roomId: 'room-1',
      pollId: 'poll-1',
      optionId: 'option-1',
    });

    expect(prisma.watchPartyPollVote.create).toHaveBeenCalledWith({
      data: {
        pollId: 'poll-1',
        optionId: 'option-1',
        userId: 'user-2',
      },
    });
    expect(result.currentUserOptionId).toBe('option-1');
    expect(result.options[0].voteCount).toBe(1);
  });

  it('rejects duplicate votes instead of changing them', async () => {
    prisma.watchPartyRoom.findUnique.mockResolvedValue(buildRoomWithGuest());
    prisma.watchPartyPoll.findFirst.mockResolvedValue(
      buildPoll({
        votes: [
          {
            id: 'vote-1',
            pollId: 'poll-1',
            optionId: 'option-1',
            userId: 'user-2',
            createdAt: now,
          },
        ],
      }),
    );

    await expect(
      service.votePoll('user-2', {
        roomId: 'room-1',
        pollId: 'poll-1',
        optionId: 'option-2',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.watchPartyPollVote.create).not.toHaveBeenCalled();
  });

  it('allows the host to close a poll', async () => {
    prisma.watchPartyRoom.findUnique.mockResolvedValue(buildRoom());
    prisma.watchPartyPoll.findFirst.mockResolvedValue(buildPoll());
    prisma.watchPartyPoll.update.mockResolvedValue(
      buildPoll({ status: WatchPartyPollStatus.CLOSED, closedAt: now }),
    );

    const result = await service.closePoll('host-1', {
      roomId: 'room-1',
      pollId: 'poll-1',
    });

    expect(prisma.watchPartyPoll.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'poll-1' },
        data: expect.objectContaining({
          status: WatchPartyPollStatus.CLOSED,
          closedAt: expect.any(Date),
        }),
      }),
    );
    expect(result.status).toBe(WatchPartyPollStatus.CLOSED);
  });

  it('requires the host to pick between tied winners', async () => {
    prisma.watchPartyRoom.findUnique.mockResolvedValue(buildRoom());
    prisma.watchPartyPoll.findFirst.mockResolvedValue(
      buildPoll({ status: WatchPartyPollStatus.CLOSED, closedAt: now }),
    );

    await expect(
      service.startPollWinner('host-1', {
        roomId: 'room-1',
        pollId: 'poll-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.watchPartyRoom.update).not.toHaveBeenCalled();
  });

  it('starts the winning content and increments playback sequence', async () => {
    const closedPoll = buildPoll({
      status: WatchPartyPollStatus.CLOSED,
      closedAt: now,
      options: [
        {
          ...buildPoll().options[0],
          votes: [
            { id: 'vote-1', userId: 'user-2', createdAt: now },
            { id: 'vote-2', userId: 'host-1', createdAt: now },
          ],
        },
        {
          ...buildPoll().options[1],
          votes: [{ id: 'vote-3', userId: 'user-3', createdAt: now }],
        },
      ],
      votes: [
        {
          id: 'vote-1',
          pollId: 'poll-1',
          optionId: 'option-1',
          userId: 'user-2',
          createdAt: now,
        },
        {
          id: 'vote-2',
          pollId: 'poll-1',
          optionId: 'option-1',
          userId: 'host-1',
          createdAt: now,
        },
        {
          id: 'vote-3',
          pollId: 'poll-1',
          optionId: 'option-2',
          userId: 'user-3',
          createdAt: now,
        },
      ],
    });
    prisma.watchPartyRoom.findUnique.mockResolvedValue(buildRoomWithGuest());
    prisma.watchPartyPoll.findFirst.mockResolvedValue(closedPoll);
    prisma.content.findMany.mockResolvedValue([
      buildPollContent({ id: 'content-2' }),
    ]);
    prisma.watchPartyRoom.update.mockResolvedValue(
      buildRoomWithGuest({
        contentId: 'content-2',
        currentTime: 0,
        playbackStatus: WatchPartyPlaybackStatus.PLAYING,
        playbackRate: 1,
        sequence: 8,
      }),
    );

    const result = await service.startPollWinner('host-1', {
      roomId: 'room-1',
      pollId: 'poll-1',
    });

    expect(prisma.watchPartyRoom.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'room-1' },
        data: expect.objectContaining({
          contentId: 'content-2',
          episodeId: null,
          currentTime: 0,
          playbackStatus: WatchPartyPlaybackStatus.PLAYING,
          playbackRate: 1,
          sequence: { increment: 1 },
        }),
      }),
    );
    expect(result.room.contentId).toBe('content-2');
    expect(result.playbackState.sequence).toBe(8);
  });

  it('rejects starting an unavailable poll winner', async () => {
    const closedPoll = buildPoll({
      status: WatchPartyPollStatus.CLOSED,
      closedAt: now,
      options: [
        {
          ...buildPoll().options[0],
          votes: [{ id: 'vote-1', userId: 'host-1', createdAt: now }],
        },
        buildPoll().options[1],
      ],
      votes: [
        {
          id: 'vote-1',
          pollId: 'poll-1',
          optionId: 'option-1',
          userId: 'host-1',
          createdAt: now,
        },
      ],
    });
    prisma.watchPartyRoom.findUnique.mockResolvedValue(buildRoomWithGuest());
    prisma.watchPartyPoll.findFirst.mockResolvedValue(closedPoll);
    prisma.content.findMany.mockResolvedValue([
      buildPollContent({ id: 'content-2', status: ContentStatus.DRAFT }),
    ]);

    await expect(
      service.startPollWinner('host-1', {
        roomId: 'room-1',
        pollId: 'poll-1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.watchPartyRoom.update).not.toHaveBeenCalled();
  });

  it('rejects a legacy poll winner that points at a series root without mutating the room', async () => {
    const closedPoll = buildPoll({
      status: WatchPartyPollStatus.CLOSED,
      closedAt: now,
      options: [
        {
          ...buildPoll().options[0],
          contentId: 'series-root-content',
          episodeId: null,
          votes: [{ id: 'vote-1', userId: 'host-1', createdAt: now }],
        },
        buildPoll().options[1],
      ],
      votes: [
        {
          id: 'vote-1',
          pollId: 'poll-1',
          optionId: 'option-1',
          userId: 'host-1',
          createdAt: now,
        },
      ],
    });
    prisma.watchPartyRoom.findUnique.mockResolvedValue(buildRoomWithGuest());
    prisma.watchPartyPoll.findFirst.mockResolvedValue(closedPoll);
    prisma.content.findMany.mockResolvedValue([buildRootSeriesContent()]);

    await expect(
      service.startPollWinner('host-1', {
        roomId: 'room-1',
        pollId: 'poll-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.watchPartyRoom.update).not.toHaveBeenCalled();
  });

  it('revalidates winner availability when content became draft after poll creation', async () => {
    const closedPoll = buildPoll({
      status: WatchPartyPollStatus.CLOSED,
      closedAt: now,
      options: [
        {
          ...buildPoll().options[0],
          contentId: 'series-root-content',
          episodeId: 'episode-1',
          votes: [{ id: 'vote-1', userId: 'host-1', createdAt: now }],
        },
        buildPoll().options[1],
      ],
      votes: [
        {
          id: 'vote-1',
          pollId: 'poll-1',
          optionId: 'option-1',
          userId: 'host-1',
          createdAt: now,
        },
      ],
    });
    prisma.watchPartyRoom.findUnique.mockResolvedValue(buildRoomWithGuest());
    prisma.watchPartyPoll.findFirst.mockResolvedValue(closedPoll);
    prisma.content.findMany.mockResolvedValue([
      buildRootSeriesContent(),
      buildChildSeriesContent({ status: ContentStatus.DRAFT }),
    ]);

    await expect(
      service.startPollWinner('host-1', {
        roomId: 'room-1',
        pollId: 'poll-1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.watchPartyRoom.update).not.toHaveBeenCalled();
  });

  it('keeps poll actions isolated to their room', async () => {
    prisma.watchPartyRoom.findUnique.mockResolvedValue(buildRoomWithGuest({ id: 'room-2' }));
    prisma.watchPartyPoll.findFirst.mockResolvedValue(null);

    await expect(
      service.votePoll('user-2', {
        roomId: 'room-2',
        pollId: 'poll-1',
        optionId: 'option-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns the next episode for a room playing a series episode', async () => {
    prisma.watchPartyRoom.findUnique.mockResolvedValue(
      buildRoom({ contentId: 'series-root-content', episodeId: 'episode-1' }),
    );
    prisma.series.findUnique.mockResolvedValue(buildSeriesEpisode());
    prisma.series.findFirst.mockResolvedValue(buildNextSeriesEpisode());

    const result = await service.getNextEpisodeForRoom('room-1', 'host-1');

    expect(prisma.series.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { contentId: 'episode-1' } }),
    );
    expect(result?.currentContentId).toBe('episode-1');
    expect(result?.nextEpisode.id).toBe('episode-2');
  });

  it('returns null for the final episode with no next episode', async () => {
    prisma.watchPartyRoom.findUnique.mockResolvedValue(
      buildRoom({ contentId: 'series-root-content', episodeId: 'episode-1' }),
    );
    prisma.series.findUnique.mockResolvedValue(buildSeriesEpisode());
    prisma.series.findFirst.mockResolvedValue(null);

    const result = await service.getNextEpisodeForRoom('room-1', 'host-1');

    expect(result).toBeNull();
  });

  it('starts the next episode and resets authoritative playback state', async () => {
    prisma.watchPartyRoom.findUnique.mockResolvedValue(
      buildRoomWithGuest({
        contentId: 'series-root-content',
        episodeId: 'episode-1',
        currentTime: 98,
        playbackStatus: WatchPartyPlaybackStatus.PLAYING,
        sequence: 4,
      }),
    );
    prisma.series.findUnique.mockResolvedValue(buildSeriesEpisode());
    prisma.series.findFirst.mockResolvedValue(buildNextSeriesEpisode());
    prisma.watchPartyRoom.update.mockResolvedValue(
      buildRoomWithGuest({
        contentId: 'series-root-content',
        episodeId: 'episode-2',
        currentTime: 0,
        playbackStatus: WatchPartyPlaybackStatus.PLAYING,
        playbackRate: 1,
        sequence: 5,
        episode: {
          id: 'episode-2',
          title: 'Episode 2',
          slug: 'episode-2',
          contentType: 'SERIES',
          thumbnailUrl: null,
          duration: 100,
        },
      }),
    );

    const result = await service.startNextEpisode('room-1', 'host-1', {
      expectedContentId: 'episode-1',
      nextEpisodeId: 'episode-2',
    });

    expect(prisma.watchPartyRoom.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'room-1' },
        data: expect.objectContaining({
          episodeId: 'episode-2',
          currentTime: 0,
          playbackStatus: WatchPartyPlaybackStatus.PLAYING,
          playbackRate: 1,
          sequence: { increment: 1 },
        }),
      }),
    );
    expect(result?.playbackState.sequence).toBe(5);
    expect(result?.playbackState.currentTime).toBe(0);
  });

  it('does not start the next episode when the room content already changed', async () => {
    prisma.watchPartyRoom.findUnique.mockResolvedValue(
      buildRoom({ contentId: 'series-root-content', episodeId: 'episode-2' }),
    );

    const result = await service.startNextEpisode('room-1', null, {
      expectedContentId: 'episode-1',
      nextEpisodeId: 'episode-2',
    });

    expect(result).toBeNull();
    expect(prisma.watchPartyRoom.update).not.toHaveBeenCalled();
  });

  it('rejects next episode start after room end', async () => {
    prisma.watchPartyRoom.findUnique.mockResolvedValue(
      buildRoom({ status: WatchPartyRoomStatus.ENDED }),
    );

    await expect(
      service.startNextEpisode('room-1', null, {
        expectedContentId: 'episode-1',
        nextEpisodeId: 'episode-2',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
