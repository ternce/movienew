import { ConfigService } from '@nestjs/config';
import { ConflictException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

import { WatchPartyGateway } from './watch-party.gateway';
import { WatchPartyService } from './watch-party.service';

const JWT_SECRET = 'test-secret';

function createRedisMock() {
  const strings = new Map<string, string>();
  const sets = new Map<string, Set<string>>();
  const counters = new Map<string, number>();

  return {
    sadd: jest.fn(async (key: string, value: string) => {
      if (!sets.has(key)) sets.set(key, new Set());
      sets.get(key)!.add(value);
      return 1;
    }),
    expire: jest.fn(async () => 1),
    setex: jest.fn(async (key: string, _ttl: number, value: string) => {
      strings.set(key, value);
      return 'OK';
    }),
    set: jest.fn(
      async (
        key: string,
        value: string,
        _mode: string,
        _ttl: number,
        condition?: string,
      ) => {
        if (condition === 'NX' && strings.has(key)) return null;
        strings.set(key, value);
        return 'OK';
      },
    ),
    get: jest.fn(async (key: string) => strings.get(key) ?? null),
    srem: jest.fn(async (key: string, value: string) => {
      sets.get(key)?.delete(value);
      return 1;
    }),
    del: jest.fn(async (key: string) => {
      strings.delete(key);
      return 1;
    }),
    scard: jest.fn(async (key: string) => sets.get(key)?.size ?? 0),
    incr: jest.fn(async (key: string) => {
      const next = (counters.get(key) ?? 0) + 1;
      counters.set(key, next);
      return next;
    }),
    __sets: sets,
    __strings: strings,
    __counters: counters,
  };
}

function createSocket(userId?: string) {
  const token = userId ? jwt.sign({ sub: userId }, JWT_SECRET) : undefined;
  const socketTo = { emit: jest.fn() };
  return {
    id: `socket-${Math.random().toString(16).slice(2)}`,
    handshake: {
      headers: { origin: 'http://localhost:3000' },
      auth: token ? { token } : {},
    },
    join: jest.fn(async () => undefined),
    leave: jest.fn(async () => undefined),
    disconnect: jest.fn(),
    emit: jest.fn(),
    to: jest.fn(() => socketTo),
    __to: socketTo,
  } as any;
}

function createGateway() {
  const redis = createRedisMock();
  const service = {
    connectRealtimeParticipant: jest.fn(),
    getRoom: jest.fn(),
    getParticipants: jest.fn(),
    getPlaybackState: jest.fn(),
    updatePlaybackState: jest.fn(),
    transferHost: jest.fn(),
    reassignHostFromConnectedParticipants: jest.fn(),
    endRoom: jest.fn(),
    getReactionSender: jest.fn(),
    createMessage: jest.fn(),
    createPoll: jest.fn(),
    votePoll: jest.fn(),
    closePoll: jest.fn(),
    startPollWinner: jest.fn(),
    getNextEpisodeForRoom: jest.fn(),
    startNextEpisode: jest.fn(),
    leaveRoom: jest.fn(),
    markRealtimeParticipantOffline: jest.fn(),
  };
  const config = {
    get: jest.fn((key: string, fallback?: unknown) => {
      if (key === 'JWT_SECRET') return JWT_SECRET;
      if (key === 'CORS_ORIGINS') return 'http://localhost:3000';
      if (key === 'WATCH_PARTY_DISCONNECT_GRACE_MS') return 100;
      return fallback;
    }),
  };
  const gateway = new WatchPartyGateway(
    config as unknown as ConfigService,
    service as unknown as WatchPartyService,
    redis as any,
  );
  const serverTo = { emit: jest.fn() };
  gateway.server = {
    to: jest.fn(() => serverTo),
  } as any;

  return { gateway, redis, service, serverTo };
}

function roomPayload(roomId = 'room-1', userId = 'user-1') {
  const participant = {
    userId,
    displayName: 'User One',
    avatarUrl: null,
    role: userId === 'host-1' ? 'HOST' : 'PARTICIPANT',
    connectionStatus: 'ONLINE',
    joinedAt: new Date('2026-07-25T12:00:00.000Z'),
  };

  return {
    id: roomId,
    status: 'WAITING',
    currentParticipant: participant,
    participants: [participant],
    hostUserId: 'host-1',
    playbackState: playbackStatePayload(roomId),
  };
}

function transferredRoomPayload(roomId = 'room-1') {
  return {
    ...roomPayload(roomId, 'host-1'),
    hostUserId: 'user-2',
    participants: [
      {
        ...roomPayload(roomId, 'host-1').participants[0],
        userId: 'host-1',
        role: 'PARTICIPANT',
      },
      {
        userId: 'user-2',
        displayName: 'User Two',
        avatarUrl: null,
        role: 'HOST',
        connectionStatus: 'ONLINE',
        joinedAt: new Date('2026-07-25T12:00:05.000Z'),
      },
    ],
  };
}

function playbackStatePayload(roomId = 'room-1') {
  return {
    roomId,
    hostUserId: 'host-1',
    contentId: 'content-1',
    episodeId: null,
    status: 'WAITING',
    playbackStatus: 'PLAYING',
    currentTime: 12,
    effectiveCurrentTime: 12,
    playbackRate: 1,
    sequence: 1,
    updatedAt: new Date('2026-07-25T12:00:00.000Z'),
    serverTime: new Date('2026-07-25T12:00:00.000Z'),
  };
}

function reactionSender(userId = 'user-1') {
  return {
    userId,
    displayName: userId === 'host-1' ? 'Host User' : 'User One',
    avatarUrl: null,
    role: userId === 'host-1' ? 'HOST' : 'PARTICIPANT',
    connectionStatus: 'ONLINE',
    joinedAt: new Date('2026-07-25T12:00:00.000Z'),
  };
}

function chatMessage(roomId = 'room-1') {
  return {
    id: 'message-1',
    roomId,
    text: 'Hello room',
    senderId: 'user-1',
    senderDisplayName: 'User One',
    senderAvatarUrl: null,
    createdAt: new Date('2026-07-25T12:00:00.000Z'),
  };
}

function pollPayload(roomId = 'room-1') {
  return {
    id: 'poll-1',
    roomId,
    createdByUserId: 'host-1',
    status: 'ACTIVE',
    createdAt: new Date('2026-07-25T12:00:00.000Z'),
    closedAt: null,
    currentUserOptionId: null,
    leadingOptionIds: ['option-1', 'option-2'],
    winnerOptionIds: [],
    options: [
      {
        id: 'option-1',
        pollId: 'poll-1',
        contentId: 'content-2',
        episodeId: null,
        content: { id: 'content-2', title: 'Next Movie', thumbnailUrl: null },
        voteCount: 0,
        isLeading: true,
        isWinner: false,
        votedByCurrentUser: false,
      },
      {
        id: 'option-2',
        pollId: 'poll-1',
        contentId: 'content-3',
        episodeId: null,
        content: { id: 'content-3', title: 'Other Movie', thumbnailUrl: null },
        voteCount: 0,
        isLeading: true,
        isWinner: false,
        votedByCurrentUser: false,
      },
    ],
  };
}

function nextEpisodePayload() {
  return {
    id: 'episode-2',
    slug: 'episode-2',
    title: 'Episode 2',
    contentType: 'SERIES',
    thumbnailUrl: null,
    duration: 100,
    seasonNumber: 1,
    episodeNumber: 2,
  };
}

function nextEpisodeLookupPayload(roomId = 'room-1') {
  return {
    roomId,
    currentContentId: 'episode-1',
    currentSequence: 7,
    nextEpisode: nextEpisodePayload(),
  };
}

function nextEpisodeTransitionPayload(roomId = 'room-1') {
  return {
    room: {
      ...roomPayload(roomId, 'host-1'),
      contentId: 'series-root',
      episodeId: 'episode-2',
      playbackState: {
        ...playbackStatePayload(roomId),
        contentId: 'series-root',
        episodeId: 'episode-2',
        currentTime: 0,
        effectiveCurrentTime: 0,
        playbackStatus: 'PLAYING',
        sequence: 8,
      },
    },
    nextEpisode: nextEpisodePayload(),
    contentId: 'series-root',
    episodeId: 'episode-2',
    playbackState: {
      ...playbackStatePayload(roomId),
      contentId: 'series-root',
      episodeId: 'episode-2',
      currentTime: 0,
      effectiveCurrentTime: 0,
      playbackStatus: 'PLAYING',
      sequence: 8,
    },
  };
}

describe('WatchPartyGateway', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('authenticates a socket connection with JWT', async () => {
    const { gateway } = createGateway();
    const socket = createSocket('user-1');

    await gateway.handleConnection(socket);

    expect(socket.disconnect).not.toHaveBeenCalled();
    expect(socket.userId).toBe('user-1');
    expect(socket.join).toHaveBeenCalledWith('user:user-1');
  });

  it('rejects unauthenticated socket connections', async () => {
    const { gateway } = createGateway();
    const socket = createSocket();

    await gateway.handleConnection(socket);

    expect(socket.disconnect).toHaveBeenCalled();
    expect(socket.join).not.toHaveBeenCalled();
  });

  it('joins a room and broadcasts participant updates', async () => {
    const { gateway, service, serverTo } = createGateway();
    const socket = createSocket('user-1');
    service.connectRealtimeParticipant.mockResolvedValue(roomPayload());
    service.getParticipants.mockResolvedValue(roomPayload().participants);

    await gateway.handleConnection(socket);
    const ack = jest.fn();
    await gateway.handleJoin(socket, { roomId: 'room-1' }, ack);

    expect(service.connectRealtimeParticipant).toHaveBeenCalledWith('user-1', {
      roomId: 'room-1',
      inviteToken: undefined,
    });
    expect(socket.join).toHaveBeenCalledWith('watch-party:room-1');
    expect(socket.emit).toHaveBeenCalledWith(
      'watch-party:joined',
      expect.objectContaining({ participants: roomPayload().participants }),
    );
    expect(serverTo.emit).toHaveBeenCalledWith(
      'watch-party:participants-updated',
      { roomId: 'room-1', participants: roomPayload().participants },
    );
    expect(ack).toHaveBeenCalledWith(
      expect.objectContaining({ ok: true }),
    );
  });

  it('returns an ACK payload for leave even when no callback argument is injected', async () => {
    const { gateway, service, serverTo } = createGateway();
    const socket = createSocket('user-1');
    service.leaveRoom.mockResolvedValue({
      success: true,
      participant: reactionSender('user-1'),
    });
    service.getParticipants.mockResolvedValue(roomPayload().participants);

    await gateway.handleConnection(socket);
    socket.watchPartyRoomId = 'room-1';
    const response = await gateway.handleLeave(socket, { roomId: 'room-1' });

    expect(response).toEqual(
      expect.objectContaining({
        ok: true,
        data: expect.objectContaining({ success: true }),
      }),
    );
    expect(service.leaveRoom).toHaveBeenCalledWith('room-1', 'user-1');
    expect(socket.leave).toHaveBeenCalledWith('watch-party:room-1');
    expect(serverTo.emit).toHaveBeenCalledWith(
      'watch-party:participant-left',
      expect.objectContaining({ roomId: 'room-1', userId: 'user-1' }),
    );
  });

  it('returns an ACK payload for end and broadcasts room-ended without REST fallback', async () => {
    const { gateway, service, serverTo } = createGateway();
    const socket = createSocket('host-1');
    const endedRoom = { ...roomPayload('room-1', 'host-1'), status: 'ENDED' };
    service.endRoom.mockResolvedValue(endedRoom);

    await gateway.handleConnection(socket);
    socket.watchPartyRoomId = 'room-1';
    const response = await gateway.handleEndRoom(socket, { roomId: 'room-1' });

    expect(response).toEqual({ ok: true, data: endedRoom });
    expect(service.endRoom).toHaveBeenCalledWith('room-1', 'host-1');
    expect(serverTo.emit).toHaveBeenCalledWith('watch-party:room-ended', {
      roomId: 'room-1',
      room: endedRoom,
    });
  });

  it('marks a participant offline after disconnect grace period', async () => {
    jest.useFakeTimers();
    const { gateway, service } = createGateway();
    const socket = createSocket('user-1');
    service.connectRealtimeParticipant.mockResolvedValue(roomPayload());
    service.getParticipants.mockResolvedValue([
      { ...roomPayload().participants[0], connectionStatus: 'OFFLINE' },
    ]);
    service.markRealtimeParticipantOffline.mockResolvedValue({
      ...roomPayload().participants[0],
      connectionStatus: 'OFFLINE',
    });

    await gateway.handleConnection(socket);
    await gateway.handleJoin(socket, { roomId: 'room-1' }, jest.fn());
    await gateway.handleDisconnect(socket);

    expect(service.markRealtimeParticipantOffline).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(101);

    expect(service.markRealtimeParticipantOffline).toHaveBeenCalledWith(
      'room-1',
      'user-1',
    );
  });

  it('supports reconnect before disconnect grace expires', async () => {
    jest.useFakeTimers();
    const { gateway, service } = createGateway();
    const firstSocket = createSocket('user-1');
    const secondSocket = createSocket('user-1');
    service.connectRealtimeParticipant.mockResolvedValue(roomPayload());
    service.getParticipants.mockResolvedValue(roomPayload().participants);

    await gateway.handleConnection(firstSocket);
    await gateway.handleJoin(firstSocket, { roomId: 'room-1' }, jest.fn());
    await gateway.handleDisconnect(firstSocket);

    await gateway.handleConnection(secondSocket);
    await gateway.handleJoin(secondSocket, { roomId: 'room-1' }, jest.fn());
    await jest.advanceTimersByTimeAsync(101);

    expect(service.markRealtimeParticipantOffline).not.toHaveBeenCalled();
  });

  it('rejects joining an ended room', async () => {
    const { gateway, service } = createGateway();
    const socket = createSocket('user-1');
    service.connectRealtimeParticipant.mockRejectedValue(
      new ConflictException('Watch party has ended'),
    );

    await gateway.handleConnection(socket);
    const ack = jest.fn();
    await gateway.handleJoin(socket, { roomId: 'room-1' }, ack);

    expect(socket.join).not.toHaveBeenCalledWith('watch-party:room-1');
    expect(socket.emit).toHaveBeenCalledWith(
      'watch-party:error',
      expect.objectContaining({ message: 'Watch party has ended' }),
    );
    expect(ack).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false }),
    );
  });

  it('isolates participant broadcasts between rooms', async () => {
    const { gateway, service } = createGateway();
    const socketOne = createSocket('user-1');
    const socketTwo = createSocket('user-2');
    service.connectRealtimeParticipant
      .mockResolvedValueOnce(roomPayload('room-1', 'user-1'))
      .mockResolvedValueOnce(roomPayload('room-2', 'user-2'));
    service.getParticipants
      .mockResolvedValueOnce(roomPayload('room-1', 'user-1').participants)
      .mockResolvedValueOnce(roomPayload('room-2', 'user-2').participants);

    await gateway.handleConnection(socketOne);
    await gateway.handleJoin(socketOne, { roomId: 'room-1' }, jest.fn());
    await gateway.handleConnection(socketTwo);
    await gateway.handleJoin(socketTwo, { roomId: 'room-2' }, jest.fn());

    expect(gateway.server.to).toHaveBeenCalledWith('watch-party:room-1');
    expect(gateway.server.to).toHaveBeenCalledWith('watch-party:room-2');
  });

  it('broadcasts accepted host playback actions with acknowledgement', async () => {
    const { gateway, service, serverTo } = createGateway();
    const socket = createSocket('host-1');
    service.updatePlaybackState.mockResolvedValue(playbackStatePayload());

    await gateway.handleConnection(socket);
    socket.watchPartyRoomId = 'room-1';
    const ack = jest.fn();
    await gateway.handlePlay(
      socket,
      { roomId: 'room-1', currentTime: 12, sequence: 0 },
      ack,
    );

    expect(service.updatePlaybackState).toHaveBeenCalledWith('host-1', {
      roomId: 'room-1',
      action: 'PLAY',
      currentTime: 12,
      playbackRate: undefined,
      sequence: 0,
    });
    expect(serverTo.emit).toHaveBeenCalledWith(
      'watch-party:play',
      playbackStatePayload(),
    );
    expect(serverTo.emit).toHaveBeenCalledWith(
      'watch-party:playback-state',
      playbackStatePayload(),
    );
    expect(ack).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        data: playbackStatePayload(),
      }),
    );
  });

  it('returns the latest playback state for sync requests', async () => {
    const { gateway, service } = createGateway();
    const socket = createSocket('user-1');
    service.getPlaybackState.mockResolvedValue(playbackStatePayload());

    await gateway.handleConnection(socket);
    socket.watchPartyRoomId = 'room-1';
    const ack = jest.fn();
    await gateway.handleSyncRequest(socket, { roomId: 'room-1' }, ack);

    expect(service.getPlaybackState).toHaveBeenCalledWith('room-1', 'user-1');
    expect(socket.emit).toHaveBeenCalledWith(
      'watch-party:sync-state',
      playbackStatePayload(),
    );
    expect(ack).toHaveBeenCalledWith(
      expect.objectContaining({ ok: true, data: playbackStatePayload() }),
    );
  });

  it('transfers host to a connected participant and broadcasts only host state', async () => {
    const { gateway, service, redis, serverTo } = createGateway();
    const hostSocket = createSocket('host-1');
    const targetSocket = createSocket('user-2');
    service.connectRealtimeParticipant
      .mockResolvedValueOnce(roomPayload('room-1', 'host-1'))
      .mockResolvedValueOnce(roomPayload('room-1', 'user-2'));
    service.getParticipants.mockResolvedValue(transferredRoomPayload().participants);
    service.transferHost.mockResolvedValue(transferredRoomPayload());

    await gateway.handleConnection(hostSocket);
    await gateway.handleJoin(hostSocket, { roomId: 'room-1' }, jest.fn());
    await gateway.handleConnection(targetSocket);
    await gateway.handleJoin(targetSocket, { roomId: 'room-1' }, jest.fn());

    const ack = jest.fn();
    await gateway.handleTransferHost(
      hostSocket,
      { roomId: 'room-1', targetUserId: 'user-2' },
      ack,
    );

    expect(redis.scard).toHaveBeenCalledWith(
      'watch-party:presence:room-1:user-2',
    );
    expect(service.transferHost).toHaveBeenCalledWith('host-1', {
      roomId: 'room-1',
      targetUserId: 'user-2',
    });
    expect(serverTo.emit).toHaveBeenCalledWith(
      'watch-party:host-changed',
      expect.objectContaining({
        roomId: 'room-1',
        hostUserId: 'user-2',
      }),
    );
    expect(serverTo.emit).not.toHaveBeenCalledWith(
      'watch-party:playback-state',
      expect.anything(),
    );
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });

  it('rejects host transfer to a disconnected participant before service call', async () => {
    const { gateway, service } = createGateway();
    const socket = createSocket('host-1');

    await gateway.handleConnection(socket);
    socket.watchPartyRoomId = 'room-1';
    const ack = jest.fn();
    await gateway.handleTransferHost(
      socket,
      { roomId: 'room-1', targetUserId: 'user-2' },
      ack,
    );

    expect(service.transferHost).not.toHaveBeenCalled();
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
  });

  it('auto-reassigns host after disconnect grace when host does not reconnect', async () => {
    jest.useFakeTimers();
    const { gateway, service, serverTo } = createGateway();
    const socket = createSocket('host-1');
    service.connectRealtimeParticipant.mockResolvedValue(roomPayload('room-1', 'host-1'));
    service.getParticipants.mockResolvedValue(transferredRoomPayload().participants);
    service.markRealtimeParticipantOffline.mockResolvedValue({
      ...roomPayload('room-1', 'host-1').participants[0],
      role: 'HOST',
      connectionStatus: 'OFFLINE',
    });
    service.reassignHostFromConnectedParticipants.mockResolvedValue(
      transferredRoomPayload(),
    );

    await gateway.handleConnection(socket);
    await gateway.handleJoin(socket, { roomId: 'room-1' }, jest.fn());
    await gateway.handleDisconnect(socket);
    await jest.advanceTimersByTimeAsync(101);

    expect(service.reassignHostFromConnectedParticipants).toHaveBeenCalledWith(
      'room-1',
      'host-1',
    );
    expect(serverTo.emit).toHaveBeenCalledWith(
      'watch-party:host-changed',
      expect.objectContaining({ hostUserId: 'user-2' }),
    );
  });

  it('does not auto-reassign host when host reconnects during grace period', async () => {
    jest.useFakeTimers();
    const { gateway, service } = createGateway();
    const firstSocket = createSocket('host-1');
    const secondSocket = createSocket('host-1');
    service.connectRealtimeParticipant.mockResolvedValue(roomPayload('room-1', 'host-1'));
    service.getParticipants.mockResolvedValue(roomPayload('room-1', 'host-1').participants);

    await gateway.handleConnection(firstSocket);
    await gateway.handleJoin(firstSocket, { roomId: 'room-1' }, jest.fn());
    await gateway.handleDisconnect(firstSocket);

    await gateway.handleConnection(secondSocket);
    await gateway.handleJoin(secondSocket, { roomId: 'room-1' }, jest.fn());
    await jest.advanceTimersByTimeAsync(101);

    expect(service.reassignHostFromConnectedParticipants).not.toHaveBeenCalled();
  });

  it('broadcasts valid reactions to the watch party room', async () => {
    const { gateway, service, serverTo } = createGateway();
    const socket = createSocket('user-1');
    service.getReactionSender.mockResolvedValue(reactionSender('user-1'));

    await gateway.handleConnection(socket);
    socket.watchPartyRoomId = 'room-1';
    const ack = jest.fn();
    await gateway.handleReaction(
      socket,
      { roomId: 'room-1', reaction: '❤️' },
      ack,
    );

    expect(service.getReactionSender).toHaveBeenCalledWith('room-1', 'user-1');
    expect(gateway.server.to).toHaveBeenCalledWith('watch-party:room-1');
    expect(serverTo.emit).toHaveBeenCalledWith(
      'watch-party:reaction-received',
      expect.objectContaining({
        roomId: 'room-1',
        reaction: '❤️',
        sender: reactionSender('user-1'),
        id: expect.any(String),
        timestamp: expect.any(String),
      }),
    );
    expect(ack).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        data: expect.objectContaining({ reaction: '❤️' }),
      }),
    );
  });

  it('broadcasts host reactions to the room exactly once for guest delivery', async () => {
    const { gateway, service, serverTo } = createGateway();
    const socket = createSocket('host-1');
    service.getReactionSender.mockResolvedValue(reactionSender('host-1'));

    await gateway.handleConnection(socket);
    await socket.join('watch-party:room-1');
    socket.watchPartyRoomId = 'room-1';
    await gateway.handleReaction(
      socket,
      {
        roomId: 'room-1',
        reaction: '🔥',
        clientReactionId: 'reaction-host-1',
      },
      jest.fn(),
    );

    expect(gateway.server.to).toHaveBeenCalledWith('watch-party:room-1');
    expect(socket.to).not.toHaveBeenCalledWith('watch-party:room-1');
    expect(serverTo.emit).toHaveBeenCalledTimes(1);
    expect(serverTo.emit).toHaveBeenCalledWith(
      'watch-party:reaction-received',
      expect.objectContaining({
        id: 'reaction-host-1',
        roomId: 'room-1',
        reaction: '🔥',
        sender: reactionSender('host-1'),
      }),
    );
  });

  it('broadcasts guest reactions to the room exactly once for host delivery', async () => {
    const { gateway, service, serverTo } = createGateway();
    const socket = createSocket('user-2');
    service.getReactionSender.mockResolvedValue(reactionSender('user-2'));

    await gateway.handleConnection(socket);
    await socket.join('watch-party:room-1');
    socket.watchPartyRoomId = 'room-1';
    await gateway.handleReaction(
      socket,
      {
        roomId: 'room-1',
        reaction: '👏',
        clientReactionId: 'reaction-guest-1',
      },
      jest.fn(),
    );

    expect(gateway.server.to).toHaveBeenCalledWith('watch-party:room-1');
    expect(socket.to).not.toHaveBeenCalledWith('watch-party:room-1');
    expect(serverTo.emit).toHaveBeenCalledTimes(1);
    expect(serverTo.emit).toHaveBeenCalledWith(
      'watch-party:reaction-received',
      expect.objectContaining({
        id: 'reaction-guest-1',
        roomId: 'room-1',
        reaction: '👏',
        sender: reactionSender('user-2'),
      }),
    );
  });

  it('rejects unsupported reactions', async () => {
    const { gateway, service } = createGateway();
    const socket = createSocket('user-1');

    await gateway.handleConnection(socket);
    socket.watchPartyRoomId = 'room-1';
    const ack = jest.fn();
    await gateway.handleReaction(
      socket,
      { roomId: 'room-1', reaction: '<b>hi</b>' },
      ack,
    );

    expect(service.getReactionSender).not.toHaveBeenCalled();
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
  });

  it('rejects malformed client reaction ids', async () => {
    const { gateway, service, serverTo } = createGateway();
    const socket = createSocket('user-1');

    await gateway.handleConnection(socket);
    socket.watchPartyRoomId = 'room-1';
    const ack = jest.fn();
    await gateway.handleReaction(
      socket,
      { roomId: 'room-1', reaction: '😂', clientReactionId: '../bad' },
      ack,
    );

    expect(service.getReactionSender).not.toHaveBeenCalled();
    expect(serverTo.emit).not.toHaveBeenCalledWith(
      'watch-party:reaction-received',
      expect.anything(),
    );
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
  });

  it('rejects reactions from non-members', async () => {
    const { gateway, service, serverTo } = createGateway();
    const socket = createSocket('stranger');
    service.getReactionSender.mockRejectedValue(new Error('You are not a participant in this room'));

    await gateway.handleConnection(socket);
    socket.watchPartyRoomId = 'room-1';
    const ack = jest.fn();
    await gateway.handleReaction(
      socket,
      { roomId: 'room-1', reaction: '🔥' },
      ack,
    );

    expect(serverTo.emit).not.toHaveBeenCalledWith(
      'watch-party:reaction-received',
      expect.anything(),
    );
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
  });

  it('rate limits reaction spam', async () => {
    const { gateway, service, serverTo } = createGateway();
    const socket = createSocket('user-1');
    service.getReactionSender.mockResolvedValue(reactionSender('user-1'));

    await gateway.handleConnection(socket);
    socket.watchPartyRoomId = 'room-1';

    for (let i = 0; i < 5; i += 1) {
      await gateway.handleReaction(
        socket,
        { roomId: 'room-1', reaction: '👏' },
        jest.fn(),
      );
    }

    const ack = jest.fn();
    await gateway.handleReaction(
      socket,
      { roomId: 'room-1', reaction: '👏' },
      ack,
    );

    expect(serverTo.emit).toHaveBeenCalledTimes(5);
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
  });

  it('keeps reaction delivery isolated between rooms', async () => {
    const { gateway, service } = createGateway();
    const socket = createSocket('user-1');
    service.getReactionSender.mockResolvedValue(reactionSender('user-1'));

    await gateway.handleConnection(socket);
    socket.watchPartyRoomId = 'room-1';
    await gateway.handleReaction(
      socket,
      { roomId: 'room-1', reaction: '😂' },
      jest.fn(),
    );

    expect(gateway.server.to).toHaveBeenCalledWith('watch-party:room-1');
    expect(gateway.server.to).not.toHaveBeenCalledWith('watch-party:room-2');
  });

  it('persists and broadcasts a room chat message', async () => {
    const { gateway, service, serverTo } = createGateway();
    const socket = createSocket('user-1');
    service.createMessage.mockResolvedValue(chatMessage());

    await gateway.handleConnection(socket);
    socket.watchPartyRoomId = 'room-1';
    const ack = jest.fn();
    await gateway.handleChatSend(
      socket,
      {
        roomId: 'room-1',
        text: 'Hello room',
        clientMessageId: 'client-1',
      },
      ack,
    );

    expect(service.createMessage).toHaveBeenCalledWith(
      'room-1',
      'user-1',
      'Hello room',
    );
    expect(serverTo.emit).toHaveBeenCalledWith('watch-party:chat-message', {
      roomId: 'room-1',
      message: chatMessage(),
    });
    expect(ack).toHaveBeenCalledWith(
      expect.objectContaining({ ok: true, data: chatMessage() }),
    );
  });

  it('emits chat-error when chat sender is not a room member', async () => {
    const { gateway, service, serverTo } = createGateway();
    const socket = createSocket('stranger');
    service.createMessage.mockRejectedValue(
      new Error('You are not a participant in this room'),
    );

    await gateway.handleConnection(socket);
    socket.watchPartyRoomId = 'room-1';
    const ack = jest.fn();
    await gateway.handleChatSend(
      socket,
      { roomId: 'room-1', text: 'Nope' },
      ack,
    );

    expect(serverTo.emit).not.toHaveBeenCalledWith(
      'watch-party:chat-message',
      expect.anything(),
    );
    expect(socket.emit).toHaveBeenCalledWith(
      'watch-party:chat-error',
      expect.objectContaining({
        message: 'You are not a participant in this room',
      }),
    );
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
  });

  it('rate limits room chat messages', async () => {
    const { gateway, service, serverTo } = createGateway();
    const socket = createSocket('user-1');
    service.createMessage.mockResolvedValue(chatMessage());

    await gateway.handleConnection(socket);
    socket.watchPartyRoomId = 'room-1';

    for (let i = 0; i < 6; i += 1) {
      await gateway.handleChatSend(
        socket,
        { roomId: 'room-1', text: `Message ${i}` },
        jest.fn(),
      );
    }

    const ack = jest.fn();
    await gateway.handleChatSend(
      socket,
      { roomId: 'room-1', text: 'Too much' },
      ack,
    );

    expect(serverTo.emit).toHaveBeenCalledTimes(6);
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
  });

  it('rejects duplicate chat sends with the same client message id', async () => {
    const { gateway, service, serverTo } = createGateway();
    const socket = createSocket('user-1');
    service.createMessage.mockResolvedValue(chatMessage());

    await gateway.handleConnection(socket);
    socket.watchPartyRoomId = 'room-1';
    await gateway.handleChatSend(
      socket,
      { roomId: 'room-1', text: 'Hello', clientMessageId: 'same-id' },
      jest.fn(),
    );

    const ack = jest.fn();
    await gateway.handleChatSend(
      socket,
      { roomId: 'room-1', text: 'Hello again', clientMessageId: 'same-id' },
      ack,
    );

    expect(service.createMessage).toHaveBeenCalledTimes(1);
    expect(serverTo.emit).toHaveBeenCalledTimes(1);
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
  });

  it('keeps chat delivery isolated between rooms', async () => {
    const { gateway, service } = createGateway();
    const socket = createSocket('user-1');
    service.createMessage.mockResolvedValue(chatMessage('room-1'));

    await gateway.handleConnection(socket);
    socket.watchPartyRoomId = 'room-1';
    await gateway.handleChatSend(
      socket,
      { roomId: 'room-1', text: 'Room one' },
      jest.fn(),
    );

    expect(gateway.server.to).toHaveBeenCalledWith('watch-party:room-1');
    expect(gateway.server.to).not.toHaveBeenCalledWith('watch-party:room-2');
  });

  it('broadcasts created polls to the watch party room with acknowledgement', async () => {
    const { gateway, service, serverTo } = createGateway();
    const socket = createSocket('host-1');
    service.createPoll.mockResolvedValue(pollPayload());

    await gateway.handleConnection(socket);
    socket.watchPartyRoomId = 'room-1';
    const ack = jest.fn();
    await gateway.handlePollCreate(
      socket,
      {
        roomId: 'room-1',
        options: [{ contentId: 'content-2' }, { contentId: 'content-3' }],
      },
      ack,
    );

    expect(service.createPoll).toHaveBeenCalledWith('host-1', {
      roomId: 'room-1',
      options: [{ contentId: 'content-2', episodeId: undefined }, { contentId: 'content-3', episodeId: undefined }],
    });
    expect(serverTo.emit).toHaveBeenCalledWith('watch-party:poll-created', {
      roomId: 'room-1',
      poll: pollPayload(),
    });
    expect(ack).toHaveBeenCalledWith(
      expect.objectContaining({ ok: true, data: pollPayload() }),
    );
  });

  it('broadcasts poll vote updates only to the current room', async () => {
    const { gateway, service, serverTo } = createGateway();
    const socket = createSocket('user-1');
    service.votePoll.mockResolvedValue({
      ...pollPayload(),
      currentUserOptionId: 'option-1',
    });

    await gateway.handleConnection(socket);
    socket.watchPartyRoomId = 'room-1';
    await gateway.handlePollVote(
      socket,
      { roomId: 'room-1', pollId: 'poll-1', optionId: 'option-1' },
      jest.fn(),
    );

    expect(gateway.server.to).toHaveBeenCalledWith('watch-party:room-1');
    expect(gateway.server.to).not.toHaveBeenCalledWith('watch-party:room-2');
    expect(serverTo.emit).toHaveBeenCalledWith(
      'watch-party:poll-updated',
      expect.objectContaining({
        roomId: 'room-1',
        poll: expect.objectContaining({ currentUserOptionId: 'option-1' }),
      }),
    );
  });

  it('broadcasts poll close events', async () => {
    const { gateway, service, serverTo } = createGateway();
    const socket = createSocket('host-1');
    service.closePoll.mockResolvedValue({
      ...pollPayload(),
      status: 'CLOSED',
      winnerOptionIds: ['option-1', 'option-2'],
    });

    await gateway.handleConnection(socket);
    socket.watchPartyRoomId = 'room-1';
    const ack = jest.fn();
    await gateway.handlePollClose(
      socket,
      { roomId: 'room-1', pollId: 'poll-1' },
      ack,
    );

    expect(service.closePoll).toHaveBeenCalledWith('host-1', {
      roomId: 'room-1',
      pollId: 'poll-1',
    });
    expect(serverTo.emit).toHaveBeenCalledWith(
      'watch-party:poll-closed',
      expect.objectContaining({ roomId: 'room-1' }),
    );
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });

  it('broadcasts content changes and playback state when host starts winner', async () => {
    const { gateway, service, serverTo } = createGateway();
    const socket = createSocket('host-1');
    const result = {
      room: { ...roomPayload('room-1', 'host-1'), contentId: 'content-2' },
      poll: { ...pollPayload(), status: 'CLOSED', winnerOptionIds: ['option-1'] },
      selectedOptionId: 'option-1',
      contentId: 'content-2',
      episodeId: null,
      playbackState: { ...playbackStatePayload(), contentId: 'content-2', sequence: 2 },
    };
    service.startPollWinner.mockResolvedValue(result);

    await gateway.handleConnection(socket);
    socket.watchPartyRoomId = 'room-1';
    const ack = jest.fn();
    await gateway.handlePollStartWinner(
      socket,
      { roomId: 'room-1', pollId: 'poll-1' },
      ack,
    );

    expect(service.startPollWinner).toHaveBeenCalledWith('host-1', {
      roomId: 'room-1',
      pollId: 'poll-1',
      optionId: undefined,
    });
    expect(serverTo.emit).toHaveBeenCalledWith(
      'watch-party:content-changed',
      result,
    );
    expect(serverTo.emit).toHaveBeenCalledWith(
      'watch-party:playback-state',
      result.playbackState,
    );
    expect(ack).toHaveBeenCalledWith(
      expect.objectContaining({ ok: true, data: result }),
    );
  });

  it('does not broadcast a content switch when start winner validation fails', async () => {
    const { gateway, service, serverTo } = createGateway();
    const socket = createSocket('host-1');
    service.startPollWinner.mockRejectedValue(
      new ConflictException('Winning poll option content is not available'),
    );

    await gateway.handleConnection(socket);
    socket.watchPartyRoomId = 'room-1';
    const ack = jest.fn();
    await gateway.handlePollStartWinner(
      socket,
      { roomId: 'room-1', pollId: 'poll-1' },
      ack,
    );

    expect(serverTo.emit).not.toHaveBeenCalledWith(
      'watch-party:content-changed',
      expect.anything(),
    );
    expect(serverTo.emit).not.toHaveBeenCalledWith(
      'watch-party:playback-state',
      expect.anything(),
    );
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
  });

  it('starts one authoritative next-episode countdown for duplicate ended events', async () => {
    jest.useFakeTimers();
    const { gateway, service, serverTo } = createGateway();
    const socketOne = createSocket('user-1');
    const socketTwo = createSocket('user-2');
    service.getNextEpisodeForRoom.mockResolvedValue(nextEpisodeLookupPayload());

    await gateway.handleConnection(socketOne);
    socketOne.watchPartyRoomId = 'room-1';
    await gateway.handleConnection(socketTwo);
    socketTwo.watchPartyRoomId = 'room-1';

    const ackOne = jest.fn();
    const ackTwo = jest.fn();
    await gateway.handleEpisodeEnded(socketOne, { roomId: 'room-1' }, ackOne);
    await gateway.handleEpisodeEnded(socketTwo, { roomId: 'room-1' }, ackTwo);

    expect(service.getNextEpisodeForRoom).toHaveBeenCalledTimes(1);
    expect(serverTo.emit).toHaveBeenCalledWith(
      'watch-party:next-episode-countdown',
      expect.objectContaining({
        roomId: 'room-1',
        currentContentId: 'episode-1',
        nextEpisode: nextEpisodePayload(),
      }),
    );
    expect(ackOne).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
    expect(ackTwo).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });

  it('does not create a countdown when there is no next episode', async () => {
    const { gateway, service, serverTo } = createGateway();
    const socket = createSocket('user-1');
    service.getNextEpisodeForRoom.mockResolvedValue(null);

    await gateway.handleConnection(socket);
    socket.watchPartyRoomId = 'room-1';
    const ack = jest.fn();
    await gateway.handleEpisodeEnded(socket, { roomId: 'room-1' }, ack);

    expect(serverTo.emit).not.toHaveBeenCalledWith(
      'watch-party:next-episode-countdown',
      expect.anything(),
    );
    expect(ack).toHaveBeenCalledWith({ ok: true, data: null });
  });

  it('sends active next-episode countdown to reconnecting participants', async () => {
    jest.useFakeTimers();
    const { gateway, service } = createGateway();
    const firstSocket = createSocket('user-1');
    const secondSocket = createSocket('user-1');
    service.connectRealtimeParticipant.mockResolvedValue(roomPayload());
    service.getParticipants.mockResolvedValue(roomPayload().participants);
    service.getNextEpisodeForRoom.mockResolvedValue(nextEpisodeLookupPayload());

    await gateway.handleConnection(firstSocket);
    await gateway.handleJoin(firstSocket, { roomId: 'room-1' }, jest.fn());
    await gateway.handleEpisodeEnded(firstSocket, { roomId: 'room-1' }, jest.fn());

    await gateway.handleConnection(secondSocket);
    await gateway.handleJoin(secondSocket, { roomId: 'room-1' }, jest.fn());

    expect(secondSocket.emit).toHaveBeenCalledWith(
      'watch-party:next-episode-countdown',
      expect.objectContaining({ roomId: 'room-1' }),
    );
  });

  it('allows host cancellation of a next-episode countdown', async () => {
    const { gateway, service, serverTo } = createGateway();
    const socket = createSocket('host-1');
    service.getNextEpisodeForRoom.mockResolvedValue(nextEpisodeLookupPayload());
    service.getPlaybackState.mockResolvedValue(playbackStatePayload());
    service.getRoom.mockResolvedValue(roomPayload('room-1', 'host-1'));

    await gateway.handleConnection(socket);
    socket.watchPartyRoomId = 'room-1';
    const startAck = jest.fn();
    await gateway.handleEpisodeEnded(socket, { roomId: 'room-1' }, startAck);
    const countdownId = startAck.mock.calls[0][0].data.id;

    const ack = jest.fn();
    await gateway.handleNextEpisodeCancel(
      socket,
      { roomId: 'room-1', countdownId },
      ack,
    );

    expect(serverTo.emit).toHaveBeenCalledWith(
      'watch-party:next-episode-cancel',
      { roomId: 'room-1', countdownId },
    );
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });

  it('clears next-episode countdown when the room ends', async () => {
    const { gateway, service, serverTo } = createGateway();
    const socket = createSocket('host-1');
    service.getNextEpisodeForRoom.mockResolvedValue(nextEpisodeLookupPayload());
    service.endRoom.mockResolvedValue({ ...roomPayload(), status: 'ENDED' });

    await gateway.handleConnection(socket);
    socket.watchPartyRoomId = 'room-1';
    await gateway.handleEpisodeEnded(socket, { roomId: 'room-1' }, jest.fn());
    await gateway.handleEndRoom(socket, { roomId: 'room-1' }, jest.fn());

    expect(serverTo.emit).toHaveBeenCalledWith(
      'watch-party:room-ended',
      expect.objectContaining({ roomId: 'room-1' }),
    );
    expect(await gateway['getNextEpisodeCountdown']('room-1')).toBeNull();
  });

  it('automatically starts the next episode when countdown completes', async () => {
    jest.useFakeTimers();
    const { gateway, service, serverTo } = createGateway();
    const socket = createSocket('user-1');
    service.getNextEpisodeForRoom.mockResolvedValue(nextEpisodeLookupPayload());
    service.startNextEpisode.mockResolvedValue(nextEpisodeTransitionPayload());

    await gateway.handleConnection(socket);
    socket.watchPartyRoomId = 'room-1';
    await gateway.handleEpisodeEnded(socket, { roomId: 'room-1' }, jest.fn());
    await jest.advanceTimersByTimeAsync(10001);

    expect(service.startNextEpisode).toHaveBeenCalledWith('room-1', null, {
      expectedContentId: 'episode-1',
      nextEpisodeId: 'episode-2',
    });
    expect(serverTo.emit).toHaveBeenCalledWith(
      'watch-party:next-episode-start',
      expect.objectContaining({
        roomId: 'room-1',
        nextEpisode: nextEpisodePayload(),
      }),
    );
    expect(serverTo.emit).toHaveBeenCalledWith(
      'watch-party:playback-state',
      expect.objectContaining({
        currentTime: 0,
        playbackStatus: 'PLAYING',
        sequence: 8,
      }),
    );
  });
});
