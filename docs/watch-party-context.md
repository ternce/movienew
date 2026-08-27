# Watch Party and Mini Chat Context

## Current Project Architecture

The repository is a TypeScript monorepo for a video streaming platform.

- `apps/web`: Next.js App Router frontend with React, Tailwind CSS, Zustand stores, TanStack Query hooks, shared UI primitives, and feature components.
- `apps/api`: NestJS backend with Prisma/PostgreSQL, Redis, Bull queues, Socket.IO, Swagger decorators, and feature modules.
- `packages/shared`: shared TypeScript types/constants used by frontend and backend.
- `docker`, `docker-compose*.yml`, and `docker/nginx/nginx.conf`: local/production infrastructure for web, API, PostgreSQL, Redis, MinIO, Nginx, and related services.

The backend is organized by Nest feature modules under `apps/api/src/modules/*`. `AppModule` imports the core infrastructure modules (`PrismaModule`, `RedisModule`, `CacheModule`) and feature modules (`AuthModule`, `UsersModule`, `ContentModule`, `CommentsModule`, `EdgeCenterModule`, `NotificationsModule`, etc.). Global guards are registered in `apps/api/src/app.module.ts`.

The frontend uses route groups under `apps/web/app`, feature hooks in `apps/web/hooks`, API endpoint constants in `apps/web/lib/api/endpoints.ts`, the HTTP client in `apps/web/lib/api/client.ts`, and shared layout components in `apps/web/components/layout`.

## Discovered Authentication Approach

Backend authentication is JWT-based.

- `apps/api/src/modules/auth/guards/jwt-auth.guard.ts` is registered globally through `APP_GUARD`.
- Routes are protected by default unless decorated with `@Public()`.
- Public routes may still receive an optional authenticated user if a valid bearer token is present.
- `apps/api/src/modules/auth/strategies/jwt.strategy.ts` validates JWTs, loads the user by `payload.sub`, and exposes a sanitized user object containing `id`, `email`, `role`, `ageCategory`, and `verificationStatus`.
- `apps/api/src/common/decorators/current-user.decorator.ts` reads authenticated user data from `request.user`.
- Existing protected actions consistently use `@CurrentUser('id') userId` rather than trusting frontend-provided user IDs.

Frontend authentication uses Zustand persistence in `apps/web/stores/auth.store.ts`.

- Access token, refresh token, session ID, user, and `isAuthenticated` are stored in `mp-auth-storage`.
- Auth state is also mirrored into cookies for Next.js middleware.
- API calls attach the bearer token through `apps/web/lib/api/client.ts`.
- Socket.IO notification connections pass the access token in `auth.token`.

Watch Party and Mini Chat must follow this pattern: every REST action and socket connection must derive the acting user from the token/session, never from a frontend `userId`.

## Existing Video Player Implementation

The main watch page is `apps/web/app/(main)/watch/[id]/page.tsx`.

It currently:

- resolves a content ID or slug from the route;
- fetches metadata through `useContentDetail`;
- fetches the playable stream URL through `useStreamUrl`;
- renders `VideoPlayer` dynamically from `apps/web/components/player/video-player.tsx`;
- records content views;
- saves watch progress through `/users/me/watch-history/:contentId`;
- handles CDN signed URL expiry by invalidating the stream query;
- supports likes, share, report placeholder, comments, and next episode countdown.

The player implementation is split across:

- `apps/web/components/player/video-player.tsx`: UI shell, controls, overlays, touch gestures, callbacks.
- `apps/web/components/player/use-player.ts`: HLS.js setup, media element event listeners, progress callbacks, quality selection, seek/play/pause/fullscreen/PiP behavior.
- `apps/web/stores/player.store.ts`: Zustand player state.
- `apps/web/components/player/player-controls.tsx`, `player-progress-bar.tsx`, `player-overlay.tsx`, `player-volume-control.tsx`, and `player-settings-menu.tsx`.

Watch Party should extend this surface with synchronization hooks and party overlays rather than replacing the player.

## Existing Content and Episode Models

The Prisma schema is in `apps/api/prisma/schema.prisma`.

Relevant existing models:

- `User`: platform users, roles, verification, profile fields, sessions, notifications, comments, content ratings/likes, created content, watch history, playlists, and subscriptions.
- `Content`: root and episode/lesson content records. Contains title, slug, description, content type, category, age category, duration, free/premium fields, status, EdgeCenter references, and relations to video files, seasons, comments, likes, ratings, etc.
- `Series`: links content records into structured series/tutorial hierarchies. Root series has no `parentSeriesId`; episodes/lessons reference a parent series and season.
- `ContentSeason`: season/chapter grouping for structured content.
- `VideoFile`: encoded video files by quality and encoding status.
- `WatchHistory`: per-user progress for a content item.
- `Comment`, `ContentRating`, `ContentLike`: existing content interaction models.
- `UserNotification`, `NotificationTemplate`, `NewsletterPreferences`: existing notification storage.

There is no existing Watch Party, party room chat, one-to-one conversation, or private message model.

Streaming access checks are implemented in `apps/api/src/modules/edgecenter/streaming.service.ts`. That service verifies age/category, publication status, creator/admin access, free content access, and subscription access before returning a stream URL.

## Existing Socket.IO and Redis Infrastructure

Socket.IO is already used for notifications.

- Backend gateway: `apps/api/src/modules/notifications/notifications.gateway.ts`
- Backend service integration: `apps/api/src/modules/notifications/notifications.service.ts`
- Frontend hook: `apps/web/hooks/use-notification-socket.ts`
- Nginx proxy support: `docker/nginx/nginx.conf` has `/socket.io` proxy configuration with upgrade headers and long WebSocket timeouts.

The notification gateway:

- uses namespace `notifications`;
- validates the JWT from `client.handshake.auth.token` or bearer header;
- checks CORS origins from `CORS_ORIGINS`;
- joins each socket to `user:${userId}`;
- emits `notification:new` and `notification:count` only to the authenticated user's room.

Redis is available globally.

- Provider: `apps/api/src/config/redis.module.ts`
- Injection token: `REDIS_CLIENT`
- Client: `ioredis`
- Cache wrapper: `apps/api/src/common/cache/cache.service.ts`
- Queues: Bull is configured in `apps/api/src/app.module.ts`.

Watch Party should use Redis for ephemeral room playback state, participant presence, host socket mapping, sync timestamps, short-lived invitation token lookups, and rate limiting/chat throttling where needed.

Socket.IO scaling decision:

- Existing Redis configuration does not by itself provide Socket.IO cross-instance scaling.
- The repository has `ioredis` and Redis module support, but `apps/api/package.json` does not include `@socket.io/redis-adapter`, and the current notification gateway does not call `server.adapter(...)`.
- Nginx already proxies `/socket.io`, but that only supports WebSocket transport to the API; it does not fan out Socket.IO rooms across multiple API replicas.
- Decision for Stage 1: document Watch Party/Mini Chat for the existing single API instance and do not assume cross-instance room delivery.
- Decision before running multiple API replicas: add Socket.IO Redis adapter support with separate pub/sub Redis clients created from the existing Redis configuration, then reuse that adapter for notifications, Watch Party, and Mini Chat namespaces.

## Proposed Watch Party Architecture

Add a dedicated backend module, `WatchPartyModule`, under `apps/api/src/modules/watch-party`.

Socket.IO reuse approach:

- Reuse the existing Nest Socket.IO infrastructure, `/socket.io` Nginx proxy, CORS origin rules, frontend socket URL derivation, and JWT handshake pattern from notifications.
- Do not copy/paste a second independent authentication implementation into each gateway. Extract a shared socket-auth helper/service when implementing Watch Party and Mini Chat so notification, party, and chat gateways validate tokens consistently.
- A separate namespace/gateway class is acceptable for domain isolation (`/watch-party`, `/chat`), but it should reuse the common Socket.IO/auth/Redis setup rather than creating parallel infrastructure.

Responsibilities:

- create rooms for authenticated users;
- generate unique invitation tokens/links;
- validate that joining users can access the target content through existing content/streaming access logic;
- manage persisted room metadata and chat history;
- manage ephemeral room playback state and participant presence through Redis;
- expose REST endpoints for room lifecycle and room data;
- expose a Socket.IO namespace for live playback sync, participant status, reactions, chat, votes, host transfer, and closing.

Room isolation:

- Public URLs and client contracts use `inviteToken` or a derived `partyToken`, never the internal database `room.id`.
- `inviteToken` must be a UUID v4 or cryptographically secure URL-safe token, preferably 32 bytes from `crypto.randomBytes(...).toString("base64url")` or a secure `nanoid`.
- The internal database UUID may be used only server-side after resolving the token.
- Each party room gets an internal Socket.IO room named `watch-party:${room.id}` after the server resolves and authorizes the token.
- Each socket joins only after JWT validation and participant authorization.
- Events for playback, participants, chat, reactions, votes, next episode countdown, and close are emitted only to that Socket.IO room.

Playback sync:

- The host controls authoritative play/pause/seek unless host permissions are explicitly transferred.
- Server stores room state as `{ contentId, status, positionSeconds, playbackRate, updatedAt, hostUserId, version }`.
- Clients compute live position as `positionSeconds + elapsedSeconds` only while state is `playing`.
- Automatic sync sends periodic server state snapshots.
- Manual synchronize button requests the latest authoritative room state.
- Host-originated playback events include a monotonic `version`/`clientEventId`; server rejects stale events.
- Every state-changing Socket.IO event must use a server acknowledgement callback so the sender knows whether the command was accepted, rejected, or superseded.

Content flow:

- A room should point to a concrete playable `Content` item, not a root series/tutorial without video.
- Next episode behavior should reuse existing `GET /content/:id/next-episode`.
- Voting for next content should store proposals/votes against existing `Content` IDs.

Frontend integration:

- Add a party-aware watch route such as `apps/web/app/(main)/party/[inviteToken]/page.tsx` or route into existing `/watch/[id]` with a `partyToken` context after joining.
- Wrap `VideoPlayer` with Watch Party controls and overlays.
- Add a `useWatchPartySocket` hook patterned after `useNotificationSocket`.
- Reuse existing `Button`, `Popover`, `Sheet`, `Avatar`, `Badge`, `ScrollArea`, `Input`, and dark layout styles.

## Proposed Mini Chat Architecture

Add a dedicated backend module, `MiniChatModule`, under `apps/api/src/modules/mini-chat`.

Scope:

- private one-to-one conversations only;
- text messages only;
- link text allowed as message content, with frontend linkification/sanitization;
- quick reactions/actions as a small controlled enum or metadata field;
- unread counts and notification integration;
- user search for starting conversations;
- message history.

Delivery isolation:

- Each authenticated socket joins `user:${userId}` and, optionally after authorization, `chat:conversation:${conversationId}`.
- Private chat events are emitted only to the two participants.
- REST reads/writes must filter by participant membership.
- The server must ignore frontend-supplied sender IDs and use the authenticated user.
- Creating a conversation must be idempotent for a user pair. The backend should compute a deterministic `participantKey` from the two sorted user IDs and enforce a database-level unique constraint so concurrent requests cannot create duplicates.

Frontend integration:

- Add a floating popup/chat dock mounted in `MainLayoutClient`, similar in spirit to the existing notification bell/popover but optimized for small persistent windows.
- Add hooks for conversations, messages, unread counts, user search, and socket events.
- Reuse the existing auth store, API client, query keys, notification UI patterns, and platform visual language.

## Database Models That Will Be Added

No migrations are implemented yet. Proposed Prisma additions:

```prisma
enum WatchPartyRoomStatus {
  ACTIVE
  CLOSED
}

enum WatchPartyParticipantRole {
  HOST
  PARTICIPANT
}

enum WatchPartyPlaybackStatus {
  PLAYING
  PAUSED
  ENDED
}

model WatchPartyRoom {
  id              String                 @id @default(uuid())
  inviteToken     String                 @unique @map("invite_token")
  contentId       String                 @map("content_id")
  hostUserId      String                 @map("host_user_id")
  status          WatchPartyRoomStatus   @default(ACTIVE)
  title           String?
  currentPosition Int                    @default(0) @map("current_position")
  playbackStatus  WatchPartyPlaybackStatus @default(PAUSED) @map("playback_status")
  playbackVersion Int                    @default(0) @map("playback_version")
  createdAt       DateTime               @default(now()) @map("created_at")
  updatedAt       DateTime               @updatedAt @map("updated_at")
  closedAt        DateTime?              @map("closed_at")

  content      Content                 @relation(fields: [contentId], references: [id], onDelete: Cascade)
  host         User                    @relation(fields: [hostUserId], references: [id], onDelete: Cascade)
  participants WatchPartyParticipant[]
  messages     WatchPartyMessage[]
  votes        WatchPartyVote[]

  @@index([contentId])
  @@index([hostUserId])
  @@index([status, updatedAt])
  @@map("watch_party_rooms")
}

model WatchPartyParticipant {
  id        String                    @id @default(uuid())
  roomId    String                    @map("room_id")
  userId    String                    @map("user_id")
  role      WatchPartyParticipantRole @default(PARTICIPANT)
  joinedAt  DateTime                  @default(now()) @map("joined_at")
  leftAt    DateTime?                 @map("left_at")

  room WatchPartyRoom @relation(fields: [roomId], references: [id], onDelete: Cascade)
  user User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([roomId, userId])
  @@index([userId])
  @@map("watch_party_participants")
}

model WatchPartyMessage {
  id        String   @id @default(uuid())
  roomId    String   @map("room_id")
  userId    String   @map("user_id")
  text      String   @db.Text
  createdAt DateTime @default(now()) @map("created_at")

  room WatchPartyRoom @relation(fields: [roomId], references: [id], onDelete: Cascade)
  user User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([roomId, createdAt])
  @@index([userId])
  @@map("watch_party_messages")
}

model WatchPartyVote {
  id        String   @id @default(uuid())
  roomId    String   @map("room_id")
  contentId String   @map("content_id")
  userId    String   @map("user_id")
  createdAt DateTime @default(now()) @map("created_at")

  room    WatchPartyRoom @relation(fields: [roomId], references: [id], onDelete: Cascade)
  content Content        @relation(fields: [contentId], references: [id], onDelete: Cascade)
  user    User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([roomId, contentId, userId])
  @@index([roomId, contentId])
  @@map("watch_party_votes")
}

model MiniChatConversation {
  id             String                @id @default(uuid())
  participantKey String                @unique @map("participant_key")
  createdAt      DateTime              @default(now()) @map("created_at")
  updatedAt      DateTime              @updatedAt @map("updated_at")

  participants MiniChatParticipant[]
  messages     MiniChatMessage[]

  @@map("mini_chat_conversations")
}

model MiniChatParticipant {
  id             String    @id @default(uuid())
  conversationId String    @map("conversation_id")
  userId         String    @map("user_id")
  lastReadAt     DateTime? @map("last_read_at")
  mutedAt        DateTime? @map("muted_at")
  createdAt      DateTime  @default(now()) @map("created_at")

  conversation MiniChatConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  user         User                 @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([conversationId, userId])
  @@index([userId])
  @@map("mini_chat_participants")
}

model MiniChatMessage {
  id             String    @id @default(uuid())
  conversationId String    @map("conversation_id")
  senderId       String    @map("sender_id")
  text           String    @db.Text
  metadata       Json?
  createdAt      DateTime  @default(now()) @map("created_at")

  conversation MiniChatConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  sender       User                 @relation(fields: [senderId], references: [id], onDelete: Cascade)

  @@index([conversationId, createdAt])
  @@index([senderId])
  @@map("mini_chat_messages")
}
```

`participantKey` must be computed server-side from the sorted pair of user IDs, for example `sha256("${lowerUserId}:${higherUserId}")`, and created inside a transaction/upsert flow. This guarantees a unique one-to-one conversation even under concurrent requests.

Additional relation fields will be needed on `User` and `Content` when the schema is actually edited.

## REST Endpoints That Will Be Added

Watch Party endpoints:

- `POST /watch-parties`: create a room for current user and an existing playable `contentId`.
- `GET /watch-parties/invite/:inviteToken`: resolve invitation preview for authenticated user.
- `POST /watch-parties/invite/:inviteToken/join`: join room through invitation link and return a participant-scoped `partyToken`.
- `GET /watch-parties/:partyToken`: get room details for an authorized participant.
- `POST /watch-parties/:partyToken/leave`: leave room.
- `POST /watch-parties/:partyToken/close`: close room; host only.
- `POST /watch-parties/:partyToken/host-transfer`: transfer host to another active participant; host only.
- `GET /watch-parties/:partyToken/messages`: room chat history for participants.
- `GET /watch-parties/:partyToken/votes`: next content vote state for participants.
- `POST /watch-parties/:partyToken/votes`: vote for next existing content item.
- `DELETE /watch-parties/:partyToken/votes/:contentId`: remove current user's vote.

`inviteToken` and `partyToken` are public identifiers. The internal `WatchPartyRoom.id` is not exposed in URLs or client contracts.

Mini Chat endpoints:

- `GET /chat/conversations`: current user's one-to-one conversation list with latest message, unread counts, pagination, and other user summary.
- `POST /chat/conversations`: create or return the existing one-to-one conversation with `targetUserId`.
- `GET /chat/conversations/:conversationId/messages`: paginated message history, authorized participants only.
- `POST /chat/conversations/:conversationId/read`: mark current user's conversation messages as read.
- `GET /chat/users/search?q=`: authenticated user search to start a conversation, returning safe public fields only.

Mini Chat message sending is implemented through Socket.IO only. PostgreSQL persistence happens before realtime delivery.

## Socket.IO Events That Will Be Added

Watch Party namespace: `/watch-party`.

Client to server:

- `watch-party:join` `{ partyToken }`
- `watch-party:leave` `{ partyToken }`
- `watch-party:state-request` `{ partyToken }`
- `watch-party:play` `{ partyToken, positionSeconds, clientEventId }`
- `watch-party:pause` `{ partyToken, positionSeconds, clientEventId }`
- `watch-party:seek` `{ partyToken, positionSeconds, clientEventId }`
- `watch-party:sync-request` `{ partyToken }`
- `watch-party:reaction` `{ partyToken, reaction }`
- `watch-party:message` `{ partyToken, text, clientMessageId }`
- `watch-party:vote` `{ partyToken, contentId }`
- `watch-party:host-transfer` `{ partyToken, targetUserId }`
- `watch-party:close` `{ partyToken }`

Server to client:

- `watch-party:joined` `{ room, participant, state }`
- `watch-party:state` `{ partyToken, contentId, playbackStatus, positionSeconds, playbackRate, updatedAt, hostUserId, version }`
- `watch-party:participant-list` `{ partyToken, participants }`
- `watch-party:participant-connected` `{ partyToken, participant }`
- `watch-party:participant-disconnected` `{ partyToken, userId }`
- `watch-party:host-changed` `{ partyToken, hostUserId }`
- `watch-party:reaction` `{ partyToken, userId, reaction, createdAt }`
- `watch-party:message` `{ id, partyToken, user, text, createdAt }`
- `watch-party:votes` `{ partyToken, items }`
- `watch-party:next-countdown` `{ partyToken, contentId, startsAt }`
- `watch-party:closed` `{ partyToken, closedAt }`
- `watch-party:error` `{ code, message }`

Acknowledgement shape for state-changing Watch Party events:

- Success: `{ ok: true, data?: unknown, version?: number }`
- Failure: `{ ok: false, code: string, message: string }`
- Required for: `join`, `leave`, `play`, `pause`, `seek`, `sync-request`, `reaction`, `message`, `vote`, `host-transfer`, and `close`.

Mini Chat namespace: `/chat`.

Client to server:

- `chat:join` `{ conversationId }`
- `chat:message-send` `{ conversationId, type, text?, reactionCode?, clientMessageId? }`
- `chat:read` `{ conversationId, messageId? }`

Server to client:

- `chat:message` `{ conversationId, message }`
- `chat:conversation-updated` `{ conversation }`
- `chat:read` `{ conversationId, lastReadMessageId, unreadCount, totalUnreadCount }`
- `chat:unread-updated` `{ unreadCount }`
- `chat:error` `{ code, message }`

Acknowledgement shape for state-changing Mini Chat events:

- Success: `{ ok: true, data?: unknown }`
- Failure: `{ ok: false, code: string, message: string }`
- Required for: `chat:join`, `chat:message-send`, and `chat:read`.

## Security Rules

- All new REST endpoints are authenticated unless a future endpoint is explicitly documented otherwise. Invitation join remains authenticated.
- Never accept `userId`, `senderId`, or `hostUserId` from frontend as authority. Use `@CurrentUser`.
- Never expose or require internal Watch Party room IDs in frontend URLs or socket payloads. Use cryptographically secure tokens and resolve them server-side.
- Watch Party room creation and joining must verify content access by reusing existing content/streaming access rules.
- Watch Party socket connection must validate JWT and authorize the user as a room participant before joining the internal `watch-party:${room.id}` Socket.IO room.
- Watch Party playback control events must be accepted only from the current host.
- Watch Party state-changing socket events must return server acknowledgements and clients should wait for success before treating local state as authoritative.
- Host transfer must target an existing active participant.
- Closing a room must be host-only, with admin/moderator override only if explicitly required later.
- Room chat must be visible only to room participants.
- Party reactions must be restricted to an allowlist and rate-limited.
- Vote content IDs must reference existing accessible content and should not allow root series/tutorial records without playable video unless the UX deliberately supports selecting an episode later.
- Mini Chat conversations must always have exactly two unique participants.
- Mini Chat conversation creation must enforce the deterministic `participantKey` unique constraint in the database, not only in application memory.
- Mini Chat message reads/writes must verify the authenticated user is a participant.
- Mini Chat delivery must target only the two participants' user rooms or the authorized conversation room.
- Mini Chat state-changing socket events must return server acknowledgements.
- User search must expose only safe public fields such as `id`, `username`, `firstName`, `lastName`, and `avatarUrl`.
- Message content must be length-limited, stored as plain text, and linkified safely on the frontend.
- No image/file/voice/video uploads, calls, message editing, group chats, complex replies, or full messenger behaviors.

## Stage 1 Implementation Status

Implemented on July 25, 2026: Watch Party backend foundation and database schema only.

Actual database models added:

- `WatchPartyRoom`
  - `id`: internal UUID primary key.
  - `inviteToken`: unique secure invitation token used for invite URLs.
  - `hostUserId`: relation to existing `User`.
  - `contentId`: relation to existing `Content`.
  - `episodeId`: optional relation to existing `Content`.
  - `status`: `WAITING`, `ACTIVE`, `ENDED`.
  - `currentTime`: integer seconds, default `0`.
  - `playbackStatus`: `PLAYING`, `PAUSED`, default `PAUSED`.
  - `playbackRate`: float, default `1`.
  - `sequence`: integer event/state sequence placeholder, default `0`.
  - `createdAt`, `updatedAt`, `endedAt`.
- `WatchPartyParticipant`
  - `id`: UUID primary key.
  - `roomId`: relation to `WatchPartyRoom`.
  - `userId`: relation to existing `User`.
  - `role`: `HOST` or `PARTICIPANT`.
  - `connectionStatus`: `ONLINE` or `OFFLINE`.
  - `joinedAt`, `leftAt`, `lastSeenAt`.
  - Unique constraint: `(roomId, userId)`.

Actual migration:

- `apps/api/prisma/migrations/20260725151500_add_watch_party_foundation/migration.sql`

Implemented REST endpoints:

- `POST /watch-parties`
  - Authenticated.
  - Creates a room for the current user.
  - Current user becomes `HOST`.
  - Accepts `contentId` and optional `episodeId`.
  - Validates that referenced existing `Content` records exist.
  - Returns room data, `inviteToken`, and invitation URL `/watch-party/join/{inviteToken}`.
- `GET /watch-parties/:roomId`
  - Authenticated.
  - Returns room details only for active room participants.
- `POST /watch-parties/join`
  - Authenticated.
  - Accepts `inviteToken`.
  - Adds or reactivates the current user as a participant.
  - Uses the `(roomId, userId)` unique constraint through upsert to prevent duplicates.
  - Rejects ended rooms.
- `POST /watch-parties/:roomId/leave`
  - Authenticated.
  - Requires current user to be an active participant.
  - Marks ordinary participants as left/offline.
  - Stage 1 decision: if the host leaves, the room is ended because host transfer is a later stage.
- `POST /watch-parties/:roomId/end`
  - Authenticated.
  - Requires current user to be an active participant and the room host.
  - Marks the room as `ENDED`.

Stage 1 decisions made:

- Internal `room.id` is a UUID and is used only for authenticated participant management endpoints.
- Invitation links never rely on predictable database IDs; they use a separate secure `inviteToken` generated with Node `crypto.randomBytes(32).toString("base64url")`.
- Stage 1 does not implement a public invitation preview endpoint. Joining by `inviteToken` is the invite path.
- Stage 1 validates `contentId` and optional `episodeId` existence but does not yet enforce stream entitlement checks; that remains part of later access-hardening work.
- Host transfer is not implemented in Stage 1. Host leaving ends the room.
- No Socket.IO gateway, playback synchronization, reactions, room chat, voting, auto-next episode behavior, frontend pages, or Mini Chat code was implemented.

Changed files:

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260725151500_add_watch_party_foundation/migration.sql`
- `apps/api/src/app.module.ts`
- `apps/api/src/modules/watch-party/watch-party.module.ts`
- `apps/api/src/modules/watch-party/watch-party.controller.ts`
- `apps/api/src/modules/watch-party/watch-party.service.ts`
- `apps/api/src/modules/watch-party/watch-party.service.spec.ts`
- `apps/api/src/modules/watch-party/dto/create-watch-party-room.dto.ts`
- `apps/api/src/modules/watch-party/dto/join-watch-party-room.dto.ts`
- `apps/api/src/modules/watch-party/dto/index.ts`
- `docs/watch-party-context.md`

Stage 1 verification:

- Prisma client generated with `npm.cmd run db:generate --workspace=@movie-platform/api`.
- Prisma schema validated with `npx.cmd prisma validate` from `apps/api`.
- Watch Party tests passed with `npx.cmd jest watch-party.service.spec.ts --runInBand` from `apps/api`.
- API type-check passed with `npm.cmd run type-check --workspace=@movie-platform/api`.

## Stage 2 Implementation Status

Implemented on July 25, 2026: Watch Party real-time room connection and participant presence only.

Actual Socket.IO namespace:

- `/watch-party`

Implemented client-to-server events:

- `watch-party:join`
  - Payload accepts `{ roomId }` for existing participants or `{ inviteToken }` / `{ inviteCode }` for invitation-based join.
  - Authenticated socket user is used as the participant identity.
  - Validates room existence, non-ended status, and either existing membership or valid invitation token.
  - Joins internal Socket.IO room `watch-party:{roomId}`.
  - Updates `WatchPartyParticipant.connectionStatus` to `ONLINE`, clears `leftAt`, and updates `lastSeenAt`.
- `watch-party:leave`
  - Payload accepts `{ roomId }`; falls back to the socket's current watch party room when available.
  - Reuses Stage 1 `leaveRoom` behavior.
  - Ordinary participant leave marks the participant left/offline.
  - Host leave still ends the room because host transfer is not implemented yet.

Implemented server-to-client events:

- `watch-party:joined`
- `watch-party:participant-joined`
- `watch-party:participant-left`
- `watch-party:participants-updated`
- `watch-party:room-ended`
- `watch-party:error`

Stage 2 authentication strategy:

- Reuses the existing notification gateway pattern.
- Socket connections must send a JWT in `client.handshake.auth.token` or an `Authorization: Bearer ...` header.
- The gateway verifies the token with existing `JWT_SECRET` and stores `payload.sub` as the authenticated socket user ID.
- The gateway never accepts `userId` from the client as identity.
- Authenticated sockets join `user:{userId}` for consistency with existing real-time infrastructure.

Stage 2 presence and reconnect behavior:

- Presence uses existing `WatchPartyParticipant.connectionStatus` values: `ONLINE` and `OFFLINE`.
- Participant lists include `userId`, `displayName`, `avatarUrl`, `role`, `connectionStatus`, and `joinedAt`, with safe nested user profile fields.
- The gateway tracks active socket IDs per `{roomId, userId}` in Redis.
- On disconnect, the gateway removes only the disconnected socket ID and waits for a grace period before marking the participant offline.
- Default grace period: `WATCH_PARTY_DISCONNECT_GRACE_MS` or `10000` ms.
- If the user reconnects to the same room before the grace period expires, Redis still has an active socket ID and the participant remains online.
- Disconnects are temporary presence changes; they do not permanently remove participants and do not set `leftAt`.
- Explicit `watch-party:leave` is the path that marks a participant as left.

Stage 2 Redis usage:

- Uses existing `REDIS_CLIENT` from `apps/api/src/config/redis.module.ts`.
- Redis keys:
  - `watch-party:socket:{socketId}` stores `{ roomId, userId }` with a TTL.
  - `watch-party:presence:{roomId}:{userId}` stores active socket IDs for reconnect-aware presence.
- No second Redis architecture was introduced.
- Socket.IO Redis adapter was not added in Stage 2 because the current Docker/Nginx setup points to a single API upstream (`api:4000`) and `apps/api/package.json` still does not include `@socket.io/redis-adapter`.
- Before running multiple API replicas, add `@socket.io/redis-adapter` with pub/sub clients derived from the same Redis configuration so broadcasts to `watch-party:{roomId}` work across instances.

Stage 2 host behavior:

- Host is identifiable in participant events through `role: HOST` and `hostUserId` on room payloads.
- Host transfer is not implemented.
- Planned host disconnect behavior: a temporary socket disconnect should mark the host offline only after the grace period; the room should not end immediately due to a network blip. A later stage should decide whether a long host absence auto-ends the room, prompts host transfer, or allows manual recovery.

Stage 2 changed files:

- `apps/api/src/modules/watch-party/watch-party.gateway.ts`
- `apps/api/src/modules/watch-party/watch-party.gateway.spec.ts`
- `apps/api/src/modules/watch-party/watch-party.module.ts`
- `apps/api/src/modules/watch-party/watch-party.service.ts`
- `apps/api/src/modules/watch-party/watch-party.service.spec.ts`
- `docs/watch-party-context.md`

Stage 2 verification:

- Watch Party tests passed with `npx.cmd jest watch-party --runInBand` from `apps/api`.
- API type-check passed with `npm.cmd run type-check --workspace=@movie-platform/api`.

## Stage 3 Implementation Status

Implemented on July 25, 2026: synchronized Watch Party playback and the first frontend watch-party room page only.

Authoritative playback decision:

- PostgreSQL `WatchPartyRoom` remains the single authoritative persisted playback source.
- Authoritative fields used in Stage 3: `currentTime`, `playbackStatus`, `playbackRate`, `sequence`, `updatedAt`, `hostUserId`, `contentId`, and `episodeId`.
- Redis remains limited to Stage 2 socket presence keys. Playback state is not stored as authoritative Redis presence data.
- The server calculates effective playback time as `currentTime + elapsedSecondsSinceUpdatedAt * playbackRate` while `playbackStatus` is `PLAYING`; paused rooms use the saved `currentTime`.
- Every accepted host action increments `WatchPartyRoom.sequence`.
- Playback events with a provided `sequence` that does not match the current persisted room sequence are rejected as stale.

Implemented Socket.IO playback events in namespace `/watch-party`:

- Client to server:
  - `watch-party:play` `{ roomId, currentTime, playbackRate?, sequence? }`
  - `watch-party:pause` `{ roomId, currentTime, playbackRate?, sequence? }`
  - `watch-party:seek` `{ roomId, currentTime, playbackRate?, sequence? }`
  - `watch-party:state-request` `{ roomId }`
  - `watch-party:sync-request` `{ roomId }`
- Server to client:
  - `watch-party:playback-state`
  - `watch-party:sync-state`
  - `watch-party:play`
  - `watch-party:pause`
  - `watch-party:seek`
- All state-changing playback events use server acknowledgements: `{ ok: true, data }` or `{ ok: false, code, message }`.

Implemented playback authorization:

- Socket identity is still derived only from the JWT validated during the Socket.IO handshake.
- Room membership is still validated through the existing `WatchPartyService` authorization checks.
- Only the current room host can publish `play`, `pause`, or `seek`.
- Participants can request the latest state with `state-request` or `sync-request`, but cannot modify playback state.
- Ended rooms reject playback state access and control events.

Frontend implementation:

- Added `/watch-party/join/[inviteToken]`.
- The page joins the room through the existing authenticated REST endpoint and then connects to the existing `/watch-party` socket namespace.
- The page fetches the playable stream with the existing `useStreamUrl` hook using `episodeId` when present, otherwise `contentId`.
- The existing `VideoPlayer` was extended with a narrow remote-command API instead of replacing the player.
- Remote commands are applied silently so remote play/pause/seek does not emit a new local host action and create feedback loops.
- Host local play/pause/seek actions emit server-acknowledged socket commands with the latest known sequence.
- New participants, reconnects, and browser tab visibility returns request the latest authoritative state.
- A 5-second frontend state-request interval provides periodic room state synchronization.

Drift correction thresholds:

- `<= 0.75s`: ignored.
- `> 0.75s and <= 3s`: corrected by applying the authoritative state. The current player does not expose a smooth drift API, so Stage 3 uses a direct seek rather than temporary rate nudging.
- `> 3s`: corrected by direct seek to the authoritative effective time.
- Manual Synchronize always applies the authoritative state.

Stage 3 changed files:

- `apps/api/src/modules/watch-party/watch-party.gateway.ts`
- `apps/api/src/modules/watch-party/watch-party.gateway.spec.ts`
- `apps/api/src/modules/watch-party/watch-party.service.ts`
- `apps/api/src/modules/watch-party/watch-party.service.spec.ts`
- `apps/web/app/(main)/watch-party/join/[inviteToken]/page.tsx`
- `apps/web/components/player/use-player.ts`
- `apps/web/components/player/video-player.tsx`
- `apps/web/hooks/use-watch-party-socket.ts`
- `apps/web/lib/api/endpoints.ts`
- `docs/watch-party-context.md`

Stage 3 verification:

- Watch Party backend tests passed with `npx.cmd jest watch-party --runInBand` from `apps/api`.
- API type-check passed with `npm.cmd run type-check --workspace=@movie-platform/api`.
- Web type-check passed with `npm.cmd run type-check --workspace=@movie-platform/web`.

Manual two-browser testing checklist:

1. Sign in as User A, create or reuse a Stage 1 watch party, and open `/watch-party/join/{inviteToken}`.
2. Sign in as User B in a separate browser/profile and open the same invite link.
3. Confirm both users appear in the participant panel and only User A is marked Host.
4. As Host, press play and verify User B starts playback.
5. As Host, pause and verify User B pauses.
6. As Host, seek forward/back and verify User B seeks to the same effective position.
7. On User B, click Synchronize and verify the player jumps to the authoritative state.
8. Temporarily disconnect/reload User B and confirm reconnect restores the current playing/paused state.
9. Put User B tab in the background, return to it, and confirm it syncs.
10. Try to control playback as User B and confirm the action is local only and not broadcast to the Host.
11. As Host, click End and confirm the room ends for participants.

## Stage 4 Implementation Status

Implemented on July 25, 2026: Host management and Host transfer only.

Host transfer decision:

- The existing Stage 3 playback synchronization implementation is unchanged.
- Host transfer updates only playback authorization ownership and participant roles.
- `WatchPartyRoom.hostUserId` remains the owner used by `WatchPartyService.updatePlaybackState` to authorize play, pause, and seek.
- Host transfer does not change `currentTime`, `playbackStatus`, `playbackRate`, `sequence`, `updatedAt` for playback intent, active content, or episode.
- Host transfer does not broadcast playback events or playback-state events.

Implemented Socket.IO host events in namespace `/watch-party`:

- Client to server:
  - `watch-party:transfer-host` `{ roomId, targetUserId }`
  - `watch-party:end` `{ roomId }`
- Server to client:
  - `watch-party:host-changed` `{ roomId, hostUserId, room }`
  - `watch-party:room-ended` `{ roomId, room }`

Host transfer validation:

- Requester identity is still derived from the authenticated socket JWT.
- Requester must be the current `WatchPartyRoom.hostUserId`.
- Target must be an active room participant.
- Target must not be the requester.
- Target must be connected in Redis presence (`watch-party:presence:{roomId}:{userId}`).
- Target must also have `WatchPartyParticipant.connectionStatus = ONLINE`.
- Ended rooms reject transfer.
- The database update is atomic: all participants are set to `PARTICIPANT`, the target participant is set to `HOST`, and `WatchPartyRoom.hostUserId` is updated in one transaction.

Host disconnect behavior:

- Temporary Host disconnect uses the existing Stage 2 disconnect grace period.
- If Host reconnects before the grace timer expires, Host rights remain unchanged.
- If Host does not reconnect before grace expires, the Host participant is marked `OFFLINE`.
- The gateway then asks `WatchPartyService` to select a new Host from connected participants.
- Selection is deterministic: earliest `joinedAt` active participant with `connectionStatus = ONLINE`, excluding the disconnected Host.
- If no connected participant remains, no automatic transfer occurs and the room remains waiting for recovery rather than ending automatically.

Host manual leave behavior:

- Host leave no longer immediately ends the room when another connected participant is available.
- The service automatically transfers Host to the earliest joined connected participant, then marks the leaving Host as left/offline.
- If no connected participant is available, the existing fallback is to end the room.

Host ending behavior:

- `watch-party:end` wraps the existing Host-only `endRoom` service action.
- The room is marked `ENDED`.
- `watch-party:room-ended` is broadcast to connected participants.
- Stage 3 playback state requests and control events already reject ended rooms through service checks.

Frontend implementation:

- The Watch Party room page now shows Host badges in the participant panel.
- Current Host sees a Transfer action beside eligible connected participants.
- Transfer uses a confirmation dialog before emitting `watch-party:transfer-host`.
- Host changes show a visible notification and refresh room/participant state from the server payload.
- The End button uses `watch-party:end` first so connected participants receive `room-ended`; REST remains only as a fallback if the socket acknowledgement fails.

Stage 4 changed files:

- `apps/api/src/modules/watch-party/watch-party.gateway.ts`
- `apps/api/src/modules/watch-party/watch-party.gateway.spec.ts`
- `apps/api/src/modules/watch-party/watch-party.service.ts`
- `apps/api/src/modules/watch-party/watch-party.service.spec.ts`
- `apps/web/app/(main)/watch-party/join/[inviteToken]/page.tsx`
- `apps/web/hooks/use-watch-party-socket.ts`
- `docs/watch-party-context.md`

Stage 4 verification:

- Watch Party backend tests passed with `npx.cmd jest watch-party --runInBand` from `apps/api`.
- API type-check passed with `npm.cmd run type-check --workspace=@movie-platform/api`.
- Web type-check passed with `npm.cmd run type-check --workspace=@movie-platform/web`.

## Stage 5 Implementation Status

Implemented on July 25, 2026: participant interface completion and quick video reactions only.

Participant interface:

- The Watch Party room page participant list now displays avatar, display name, Host marker, connected/disconnected status, joined time, and Host transfer action for eligible connected participants when the current user is Host.
- The implementation reuses existing `WatchPartyParticipant` role and connection status fields.
- No participant model or presence architecture changes were introduced.

Reaction persistence decision:

- Quick reactions are ephemeral Socket.IO/UI events only.
- Reactions are not stored in PostgreSQL and no Prisma model or migration was added.
- Redis is used only for reaction rate limiting, not reaction persistence.

Implemented Socket.IO reaction events in namespace `/watch-party`:

- Client to server:
  - `watch-party:reaction` `{ roomId, reaction }`
- Server to client:
  - `watch-party:reaction-received` `{ id, roomId, reaction, sender, timestamp }`

Supported reactions:

- `❤️`
- `🔥`
- `😂`
- `👏`
- `😮`

Reaction security and validation:

- Socket identity is still derived only from the authenticated JWT.
- The sender must be an active participant in the room.
- Ended rooms reject reactions.
- Only the fixed supported reaction allowlist is accepted.
- Arbitrary HTML, text, or unsupported emoji payloads are rejected before broadcast.
- Reactions are emitted only to the internal Socket.IO room `watch-party:{roomId}`.

Reaction rate limit:

- Fixed window: 5 reactions per 5 seconds per `{roomId, userId}`.
- Redis key: `watch-party:reaction-rate:{roomId}:{userId}`.
- Exceeding the limit returns a failed socket acknowledgement and does not broadcast the reaction.

Frontend reaction behavior:

- Quick reaction buttons are shown near the player.
- Accepted reactions animate briefly over the video, then remove themselves automatically.
- At most eight recent floating reactions are kept on screen to avoid covering the player.
- Reactions use fixed horizontal lanes so bursts are distributed across the video.
- Reduced-motion users receive the reaction without the float animation.
- The participant list placeholder text was updated so room chat, voting, and auto-next remain explicitly out of scope.

Stage 5 changed files:

- `apps/api/src/modules/watch-party/watch-party.gateway.ts`
- `apps/api/src/modules/watch-party/watch-party.gateway.spec.ts`
- `apps/api/src/modules/watch-party/watch-party.service.ts`
- `apps/web/app/(main)/watch-party/join/[inviteToken]/page.tsx`
- `apps/web/hooks/use-watch-party-socket.ts`
- `apps/web/app/globals.css`
- `docs/watch-party-context.md`

Stage 5 verification:

- Watch Party backend tests passed with `npx.cmd jest watch-party --runInBand` from `apps/api`.
- API type-check passed with `npm.cmd run type-check --workspace=@movie-platform/api`.
- Web type-check passed with `npm.cmd run type-check --workspace=@movie-platform/web`.

## Stage 6 Implementation Status

Implemented on July 25, 2026: room-specific Watch Party chat only.

Scope decision:

- This is Watch Party room chat, not platform-wide Mini Chat.
- Chat is separate from ephemeral video reactions.
- PostgreSQL is the source of truth for chat history.
- Socket.IO is used only for realtime delivery after a message has been persisted.
- Chat does not use reaction rate-limit keys or presence keys for storage.

Database model added:

- `WatchPartyMessage`
  - `id`: UUID primary key.
  - `roomId`: relation to existing `WatchPartyRoom`.
  - `senderUserId`: relation to existing `User`.
  - `text`: plain text.
  - `createdAt`.
  - Indexes: `(roomId, createdAt)` and `senderUserId`.

Migration:

- `apps/api/prisma/migrations/20260725164500_add_watch_party_messages/migration.sql`

Implemented REST endpoint:

- `GET /watch-parties/:roomId/messages`
  - Authenticated.
  - Active room participants only.
  - Query params:
    - `limit`, default `30`, maximum `50`.
    - `beforeMessageId` for cursor pagination.
  - Queries newest messages by `createdAt desc, id desc`, then returns the page in chronological display order.
  - Response: `{ items, nextCursor, hasMore, limit }`.

Implemented Socket.IO chat events in namespace `/watch-party`:

- Client to server:
  - `watch-party:chat-send` `{ roomId, text, clientMessageId? }`
- Server to client:
  - `watch-party:chat-message` `{ roomId, message }`
  - `watch-party:chat-error` `{ code, message }`

Message payload:

- `id`
- `roomId`
- `text`
- `senderId`
- `senderDisplayName`
- `senderAvatarUrl`
- `createdAt`

Chat security and validation:

- Socket identity is still derived from the authenticated JWT.
- Senders and history readers must be active room participants.
- Ended rooms reject new chat messages.
- Message text is trimmed.
- Empty messages are rejected.
- Maximum message length is `500` characters.
- Messages are stored as plain text.
- Frontend renders text through React, never raw HTML.
- Plain `http://` and `https://` URLs are linkified safely with `target="_blank"` and `rel="noopener noreferrer"`.
- Socket delivery is isolated to the internal `watch-party:{roomId}` room.

Chat rate limit and duplicate protection:

- Rate limit: 6 messages per 10 seconds per `{roomId, userId}`.
- Redis key: `watch-party:chat-rate:{roomId}:{userId}`.
- Duplicate send protection uses optional `clientMessageId`.
- Dedupe key: `watch-party:chat-dedupe:{roomId}:{userId}:{clientMessageId}`.
- Dedupe TTL: 60 seconds.
- These Redis keys are separate from reaction and presence keys and are not message storage.

Frontend implementation:

- Added a collapsible room chat panel beside the player on desktop.
- On smaller screens it behaves as a collapsible section, so it does not permanently cover the video.
- Includes message list, input, Send button, unread count while collapsed, and Load older messages.
- Auto-scroll happens only when the user is already near the bottom.
- Chat input is disabled after room end.
- History is retained after room close because messages remain in PostgreSQL until the room is deleted; `ON DELETE CASCADE` removes messages if the room is deleted.

Stage 6 changed files:

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260725164500_add_watch_party_messages/migration.sql`
- `apps/api/src/modules/watch-party/watch-party.controller.ts`
- `apps/api/src/modules/watch-party/watch-party.gateway.ts`
- `apps/api/src/modules/watch-party/watch-party.gateway.spec.ts`
- `apps/api/src/modules/watch-party/watch-party.service.ts`
- `apps/api/src/modules/watch-party/watch-party.service.spec.ts`
- `apps/web/app/(main)/watch-party/join/[inviteToken]/page.tsx`
- `apps/web/hooks/use-watch-party-socket.ts`
- `apps/web/lib/api/endpoints.ts`
- `docs/watch-party-context.md`

Stage 6 verification:

- Prisma client generated with `npm.cmd run db:generate --workspace=@movie-platform/api`.
- Watch Party backend tests passed with `npx.cmd jest watch-party --runInBand` from `apps/api`.
- API type-check passed with `npm.cmd run type-check --workspace=@movie-platform/api`.
- Web type-check passed with `npm.cmd run type-check --workspace=@movie-platform/web`.

## Stage 7 Implementation Status

Implemented on July 25, 2026: voting for the next Watch Party content only.

Scope decision:

- Voting reuses the existing Watch Party room, participant, host, playback, chat, and `/watch-party` Socket.IO infrastructure.
- Voting does not directly change room content.
- Creating a poll, voting, closing a poll, and starting the winner are separate validated actions.
- PostgreSQL is the source of truth for poll state and votes.
- Redis presence, reaction keys, and chat keys are not used for poll storage.

Database models added:

- `WatchPartyPoll`
  - `id`, `roomId`, `createdByUserId`, `status`, `createdAt`, `closedAt`.
  - Status enum: `ACTIVE`, `CLOSED`.
  - Indexes: `(roomId, status)`, `createdByUserId`.
- `WatchPartyPollOption`
  - `id`, `pollId`, `contentId`, nullable `episodeId`, `createdAt`.
  - Options reference existing `Content` rows.
  - Duplicate option pairs are rejected in service validation.
- `WatchPartyPollVote`
  - `id`, `pollId`, `optionId`, `userId`, `createdAt`.
  - Unique constraint: `(pollId, userId)` so a participant can vote only once per poll.

Migration:

- `apps/api/prisma/migrations/20260725180000_add_watch_party_polls/migration.sql`

Implemented REST endpoint:

- `GET /watch-parties/:roomId/poll`
  - Authenticated.
  - Active room participants only.
  - Returns the latest poll for the room, preferring active polls, or `null`.

Implemented Socket.IO poll events in namespace `/watch-party`:

- Client to server:
  - `watch-party:poll-create` `{ roomId, options: [{ contentId, episodeId? }] }`
  - `watch-party:poll-vote` `{ roomId, pollId, optionId }`
  - `watch-party:poll-close` `{ roomId, pollId }`
  - `watch-party:poll-start-winner` `{ roomId, pollId, optionId? }`
- Server to client:
  - `watch-party:poll-created` `{ roomId, poll }`
  - `watch-party:poll-updated` `{ roomId, poll }`
  - `watch-party:poll-closed` `{ roomId, poll }`
  - `watch-party:content-changed` `{ room, poll, selectedOptionId, contentId, episodeId, playbackState }`
  - Existing `watch-party:playback-state` is also emitted after the Host starts a winner.
- All state-changing poll events use server acknowledgements.

Voting rules:

- Only the current Host can create a poll, close a poll, and start the winning option.
- All active room participants can vote.
- Participants may not change their vote before the poll closes.
- Only one active poll per room is allowed.
- Poll options must reference existing content and must be unique inside the poll.
- Ended rooms reject poll creation, voting, closing, and winner start actions.
- Poll broadcasts are isolated to the internal Socket.IO room `watch-party:{roomId}`.

Tie behavior:

- Vote counts are deterministic and persisted.
- A closed poll can have multiple winners when tied.
- If there is a tie, the Host must explicitly choose one of the tied winning options in `watch-party:poll-start-winner`.
- If no votes were cast, all options are treated as tied winners and the Host must explicitly choose one.
- The server never randomly starts tied content.

Starting the winner:

- Only `watch-party:poll-start-winner` changes room content.
- The selected option must be a winning option from a closed poll.
- The room keeps the same Host.
- `WatchPartyRoom.contentId` and nullable `episodeId` are updated to the selected option.
- Playback resets to `PAUSED`, `currentTime = 0`, `playbackRate = 1`.
- `WatchPartyRoom.sequence` is incremented so stale playback events from the previous content cannot be applied.
- The existing Stage 3 playback authorization remains unchanged: only the current Host can control playback after the switch.

Frontend implementation:

- The Watch Party room page now includes a next-content poll panel.
- Host can create a poll using existing content IDs, with optional episode IDs.
- Participants can see content poster/title, vote count, current selection, leading option, and final winner.
- Active polls show vote controls until the current user has voted.
- Closed tied polls show Start controls for tied winners to the Host.
- The existing video player is reused; when content changes, the player remounts for the new playable content ID and applies the authoritative playback state.

Stage 7 changed files:

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260725180000_add_watch_party_polls/migration.sql`
- `apps/api/src/modules/watch-party/dto/index.ts`
- `apps/api/src/modules/watch-party/dto/watch-party-poll.dto.ts`
- `apps/api/src/modules/watch-party/watch-party.controller.ts`
- `apps/api/src/modules/watch-party/watch-party.gateway.ts`
- `apps/api/src/modules/watch-party/watch-party.gateway.spec.ts`
- `apps/api/src/modules/watch-party/watch-party.service.ts`
- `apps/api/src/modules/watch-party/watch-party.service.spec.ts`
- `apps/web/app/(main)/watch-party/join/[inviteToken]/page.tsx`
- `apps/web/hooks/use-watch-party-socket.ts`
- `apps/web/lib/api/endpoints.ts`
- `docs/watch-party-context.md`

Stage 7 verification:

- Prisma client generated with `npm.cmd run db:generate --workspace=@movie-platform/api`.
- Watch Party backend tests passed with `npx.cmd jest watch-party --runInBand` from `apps/api`.
- API type-check passed with `npm.cmd run type-check --workspace=@movie-platform/api`.
- Web type-check passed with `npm.cmd run type-check --workspace=@movie-platform/web`.

## Stage 8 Implementation Status

Implemented on July 25, 2026: automatic transition to the next episode only.

Scope decision:

- Stage 8 reuses the existing Watch Party room, playback sequence, Host, participant, poll, chat, and `/watch-party` Socket.IO infrastructure.
- No private Mini Chat functionality was implemented.
- Countdown state is server-authoritative and ephemeral.
- PostgreSQL `WatchPartyRoom` remains the authoritative persisted playback/content state.
- Redis is used only for the active countdown idempotency key and reconnect-visible countdown state.

Next-episode eligibility:

- The current playable content is resolved as `room.episodeId ?? room.contentId`.
- The backend uses the existing `Series` ordering model:
  - current content is looked up through `Series.contentId`;
  - root series is `current.parentSeriesId ?? current.id`;
  - next episode is the first published child with a later `(seasonNumber, episodeNumber)`.
- Final episodes or non-series content return no countdown.

Countdown architecture:

- Client ended events are sent to the existing Watch Party namespace.
- The gateway asks `WatchPartyService.getNextEpisodeForRoom(...)` for the validated next episode.
- The first accepted ended event creates a Redis countdown record with `SET NX`.
- Countdown duration defaults to `10` seconds.
- Duration is configurable with `WATCH_PARTY_NEXT_EPISODE_COUNTDOWN_SECONDS`.
- The Redis record stores:
  - `id`;
  - `roomId`;
  - `currentContentId`;
  - `currentSequence`;
  - `nextEpisode`;
  - `durationSeconds`;
  - `startedAt`;
  - `startsAt`.
- Reconnecting or newly joined participants receive the active countdown after joining the Socket.IO room.

Duplicate protection:

- Redis key: `watch-party:next-episode:{roomId}`.
- Only the first ended event can create the countdown because the gateway uses Redis `NX`.
- Later ended events read and return the existing countdown.
- The gateway keeps one local timer per room.
- Countdown completion deletes the Redis key before calling the service transition.
- Host Start Now also deletes the Redis key before transitioning.
- If a stale timer, stale Start Now, or content-changed room reaches completion, `WatchPartyService.startNextEpisode(...)` returns `null` instead of changing content again.

Implemented Socket.IO next-episode events in namespace `/watch-party`:

- Client to server:
  - `watch-party:episode-ended` `{ roomId }`
  - `watch-party:next-episode-start` `{ roomId, countdownId? }`
  - `watch-party:next-episode-cancel` `{ roomId, countdownId? }`
- Server to client:
  - `watch-party:next-episode-countdown`
  - `watch-party:next-episode-cancel`
  - `watch-party:next-episode-start`
  - existing `watch-party:content-changed`
  - existing `watch-party:playback-state`
- State-changing actions use acknowledgements.

Host controls:

- Host can start the next episode immediately during the countdown.
- Host can cancel the countdown.
- Optional alternate episode selection was not implemented in Stage 8.

Transition behavior:

- At countdown completion, the server validates that the room is still active.
- The server validates that the next episode still exists and is still the next published episode.
- If the room was created with a root `contentId` plus `episodeId`, only `episodeId` is updated.
- If the room is playing an episode directly as `contentId`, `contentId` is updated to the next episode and `episodeId` remains `null`.
- Playback resets to `currentTime = 0`, `playbackRate = 1`.
- Playback status becomes `PLAYING`, so the party auto-starts after the countdown.
- `WatchPartyRoom.sequence` increments to invalidate stale playback events from the previous episode.

Frontend implementation:

- The Watch Party page now reports `VideoPlayer.onEnded` to the server.
- Countdown overlay appears over the video with the next episode title, poster, and server-derived remaining time.
- Host sees Start now and Cancel buttons.
- Participants see the same server-authoritative countdown.
- The existing player is reused; content changes remount the player by playable content ID and apply the authoritative playback state.

Stage 8 changed files:

- `apps/api/src/modules/watch-party/watch-party.gateway.ts`
- `apps/api/src/modules/watch-party/watch-party.gateway.spec.ts`
- `apps/api/src/modules/watch-party/watch-party.service.ts`
- `apps/api/src/modules/watch-party/watch-party.service.spec.ts`
- `apps/web/app/(main)/watch-party/join/[inviteToken]/page.tsx`
- `apps/web/hooks/use-watch-party-socket.ts`
- `docs/watch-party-context.md`

Stage 8 verification:

- Watch Party backend tests passed with `npx.cmd jest watch-party --runInBand` from `apps/api`.
- API type-check passed with `npm.cmd run type-check --workspace=@movie-platform/api`.
- Web type-check passed with `npm.cmd run type-check --workspace=@movie-platform/web`.

## Stage 9 Implementation Status

Implemented on July 25, 2026: lightweight private Mini Chat MVP.

Scope decision:

- Mini Chat is a separate subsystem from Watch Party.
- It does not reuse Watch Party rooms, participants, playback, polls, reactions, or room chat models.
- It reuses the existing Nest Socket.IO server setup, `/socket.io` transport, JWT handshake pattern, global auth guards for REST, Prisma/PostgreSQL, and the existing Redis provider.
- PostgreSQL is the source of truth for conversations, participants, messages, read markers, and history.
- Socket.IO is used only for authenticated realtime delivery after persistence succeeds.
- Redis is used only for Mini Chat send rate limiting through keys prefixed with `mini-chat:send-rate:`. It is not message storage and does not share Watch Party presence/chat/reaction keys.

Database models added:

- `DirectConversation`
  - `id`, `participantKey`, `createdAt`, `updatedAt`.
  - `participantKey` is a SHA-256 hash of the sorted unordered user ID pair.
  - Unique constraint: `participantKey`.
- `DirectConversationParticipant`
  - Composite primary key: `(conversationId, userId)`.
  - Fields: `conversationId`, `userId`, nullable `lastReadMessageId`, `joinedAt`.
  - Indexes on `userId` and `lastReadMessageId`.
- `DirectMessage`
  - `id`, `conversationId`, `senderUserId`, `type`, nullable `text`, nullable `reactionCode`, nullable `clientMessageId`, `createdAt`.
  - Message type enum: `DirectMessageType` with `TEXT` and `QUICK_REACTION`.
  - Unique constraint: `(conversationId, senderUserId, clientMessageId)` for optional client-side dedupe.
  - Indexes on `(conversationId, createdAt)` and `senderUserId`.

Migration:

- `apps/api/prisma/migrations/20260725193000_add_mini_chat/migration.sql`

Implemented REST endpoints:

- `GET /chat/conversations`
  - Authenticated.
  - Returns only conversations where the current user is a participant.
  - Supports `limit` and `beforeConversationId`.
  - Includes latest message, unread count, total unread count, and other user summary.
- `POST /chat/conversations`
  - Authenticated.
  - Body: `{ targetUserId }`.
  - Returns the existing conversation for the unordered pair or creates one atomically through the unique `participantKey`.
- `GET /chat/conversations/:conversationId/messages`
  - Authenticated conversation participants only.
  - Supports `limit` and `beforeMessageId`.
  - Loads newest messages efficiently and returns them in display order.
- `POST /chat/conversations/:conversationId/read`
  - Authenticated conversation participants only.
  - Body: optional `{ messageId }`.
  - Updates only the current participant's `lastReadMessageId`.
- `GET /chat/users/search?q=`
  - Authenticated.
  - Searches active platform users by first name, last name, username, or email.
  - Excludes the current user.
  - No block/unavailable-user integration exists yet.

Implemented Socket.IO events in namespace `/chat`:

- Client to server:
  - `chat:join` `{ conversationId }`
  - `chat:message-send` `{ conversationId, type, text?, reactionCode?, clientMessageId? }`
  - `chat:read` `{ conversationId, messageId? }`
- Server to client:
  - `chat:message` `{ conversationId, message }`
  - `chat:conversation-updated` `{ conversation }`
  - `chat:read` `{ conversationId, lastReadMessageId, unreadCount, totalUnreadCount }`
  - `chat:unread-updated` `{ unreadCount }`
  - `chat:error` `{ code, message }`
- All state-changing socket events use acknowledgement callbacks.

Authorization and safety:

- REST sender/actor identity always comes from `@CurrentUser('id')`.
- Socket sender identity always comes from the verified JWT `sub`; frontend `userId` is ignored.
- Only conversation participants can join a chat room, load history, mark read, or send messages.
- Text messages are trimmed, non-empty, and limited to 1000 characters.
- Quick reactions are persisted messages but only allow this fixed list: `❤️`, `👍`, `😂`, `🔥`, `👋`.
- Unsupported reactions, arbitrary HTML-as-reaction, invalid `clientMessageId`, and overlong messages are rejected.
- Stored text remains plain text; frontend renders through React text nodes and only linkifies `http://`/`https://` URLs with `target="_blank"` and `rel="noopener noreferrer"`.
- Send rate limit: 10 Mini Chat messages or quick reactions per user per 10 seconds.
- Duplicate sends with the same `(conversationId, senderUserId, clientMessageId)` return the existing persisted message and are not rebroadcast.
- Realtime delivery is isolated to `user:${userId}` rooms for the two persisted conversation participants.

Frontend implementation:

- Added `MiniChatWidget` mounted in `apps/web/app/(main)/layout-client.tsx`.
- Desktop behavior:
  - bottom-right launcher;
  - unread badge;
  - popup conversation list;
  - one active conversation window;
  - minimize and close actions;
  - internal notice for new messages/errors.
- Mobile behavior:
  - opens as a full-screen panel rather than a tiny desktop popup.
- Conversation list shows avatar, display name, latest message preview, latest time, and unread count.
- Message window shows history, sender distinction, timestamps, text input, send button, quick reaction buttons, safe clickable links, and Load older pagination.
- User search starts or returns the existing one-to-one conversation.
- Online/last-seen status is intentionally not displayed because Mini Chat does not implement presence.

Intentionally excluded from the MVP:

- group chats;
- image uploads;
- file uploads;
- voice messages;
- audio calls;
- video calls;
- stickers marketplace;
- message editing;
- message deletion;
- message forwarding;
- complex threads;
- typing indicators;
- read receipts;
- online last seen/presence;
- third-party notifications, email, SMS, Telegram, WhatsApp, or browser push.

Stage 9 changed files:

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260725193000_add_mini_chat/migration.sql`
- `apps/api/src/app.module.ts`
- `apps/api/src/modules/mini-chat/dto/create-direct-conversation.dto.ts`
- `apps/api/src/modules/mini-chat/dto/direct-chat-read.dto.ts`
- `apps/api/src/modules/mini-chat/dto/index.ts`
- `apps/api/src/modules/mini-chat/mini-chat.controller.ts`
- `apps/api/src/modules/mini-chat/mini-chat.gateway.ts`
- `apps/api/src/modules/mini-chat/mini-chat.gateway.spec.ts`
- `apps/api/src/modules/mini-chat/mini-chat.module.ts`
- `apps/api/src/modules/mini-chat/mini-chat.service.ts`
- `apps/api/src/modules/mini-chat/mini-chat.service.spec.ts`
- `apps/web/app/(main)/layout-client.tsx`
- `apps/web/components/chat/mini-chat-widget.tsx`
- `apps/web/hooks/use-mini-chat-socket.ts`
- `apps/web/lib/api/endpoints.ts`
- `docs/watch-party-context.md`

Stage 9 verification:

- Prisma schema formatted with `npx.cmd prisma format --schema apps/api/prisma/schema.prisma`.
- Prisma client generated with `npm.cmd run db:generate --workspace=@movie-platform/api`.
- API type-check passed with `npm.cmd run type-check --workspace=@movie-platform/api`.
- Mini Chat backend tests passed with `npx.cmd jest mini-chat --runInBand` from `apps/api`.
- Web type-check passed with `npm.cmd run type-check --workspace=@movie-platform/web`.

## Implementation Stages

1. Watch Party backend schema and REST foundation: implemented for room create, authenticated room read, join, leave, and end.
2. Remaining Watch Party REST hardening: invitation preview if needed, stream entitlement checks at create/join, host transfer, stale-room cleanup, and admin/moderator policy if required.
3. Backend Watch Party socket foundation: implemented for authenticated namespace, participant authorization, room isolation, Redis-backed presence, and reconnect-aware disconnect handling. Playback sync is not implemented.
4. Watch Party synchronized playback: implemented for host-controlled play/pause/seek, server-authoritative state, sequence rejection, periodic/manual sync, and first frontend room page.
5. Watch Party Host management: implemented for manual Host transfer, automatic reassignment after Host disconnect grace, Host leave transfer, and realtime room-ended notifications.
6. Watch Party participant interface and quick reactions: implemented for complete participant list display and ephemeral video reactions.
7. Watch Party room chat: implemented for persisted room history and realtime delivery.
8. Watch Party voting: implemented for persisted next-content polls, one vote per participant, Host close/start winner, deterministic tie handling, and content switch sequence increment.
9. Watch Party automatic next episode countdown: implemented for server-authoritative countdowns, duplicate-ended protection, Host start/cancel controls, and sequence-incrementing episode transition.
10. Remaining Watch Party hardening: create-room frontend action, invitation preview if needed, stream access hardening, and broader multi-instance Socket.IO adapter work.
11. Backend Mini Chat REST foundation: implemented for conversations, history, read state, unread count, and user search.
12. Backend Mini Chat socket foundation: implemented for authenticated `/chat` namespace, private delivery, message send, read confirmations, unread updates, rate limiting, and clientMessageId dedupe.
13. Frontend Mini Chat MVP: implemented for popup/full-screen panel, conversation list, message view, send text, quick reactions, unread badges, new message notices, and user search.
14. Hardening: broader multi-instance Socket.IO adapter work, moderation/reporting decisions, block/mute policy, retention policy, and richer manual QA.

Do not implement later stages early.

## Risks and Unresolved Questions

- Socket.IO Redis adapter is not currently present. A single API instance works without it, but multiple API replicas will need adapter support for cross-instance room broadcasts.
- The watch page currently uses `initialTime={0}` and saves regular watch history. Party mode needs careful separation so host-driven party seeks do not corrupt personal progress unexpectedly.
- Current `VideoPlayer` encapsulates media element controls through `usePlayer`; party mode may need a controlled-player API or callback layer for external play/pause/seek commands.
- Root series/tutorial content is not playable. Room creation should require a concrete episode/lesson/content item unless product wants a selection step.
- Content access should be checked at room creation and join time. It may also need revalidation when switching to next content through votes.
- Invitation links need an expiration policy and optional room visibility policy.
- Mini Chat may need block/mute/report behavior later; not part of the requested scope but relevant for abuse handling.
- Message retention limits are unresolved.
- Link safety policy is unresolved: frontend linkification should sanitize URLs and probably add `rel="noopener noreferrer nofollow"`.
- Notification integration for Mini Chat should avoid double-alerting users who already have the conversation open.
- Presence status is socket-derived and should tolerate disconnect/reconnect delays.
- Existing frontend text appears partly encoded incorrectly in some files; new UI text should follow the repository's current language/style while avoiding further encoding churn.
