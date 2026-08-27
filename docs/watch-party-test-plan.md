# Watch Party and Mini Chat Test Plan

## Automated Tests

Run before every deployment candidate:

- Prisma validation: `npx.cmd prisma validate --schema apps/api/prisma/schema.prisma`
- Prisma client generation: `npm.cmd run db:generate --workspace=@movie-platform/api`
- Migration status: `npx.cmd prisma migrate status --schema apps/api/prisma/schema.prisma`
- API lint: `npm.cmd run lint --workspace=@movie-platform/api`
- Web lint: `npm.cmd run lint --workspace=@movie-platform/web`
- API type-check: `npm.cmd run type-check --workspace=@movie-platform/api`
- Web type-check: `npm.cmd run type-check --workspace=@movie-platform/web`
- Watch Party tests: `cd apps/api && npx.cmd jest watch-party --runInBand`
- Mini Chat tests: `cd apps/api && npx.cmd jest mini-chat --runInBand`
- API critical tests: `npm.cmd run test --workspace=@movie-platform/api`
- Web critical tests: `npm.cmd run test --workspace=@movie-platform/web`
- API build: `npm.cmd run build --workspace=@movie-platform/api`
- Web build: `npm.cmd run build --workspace=@movie-platform/web`
- Full workspace build: `npm.cmd run build`

Automated coverage must include:

- room creation and authenticated joining;
- secure invite-token join;
- room participant authorization;
- room-isolated Socket.IO broadcasts;
- presence disconnect and reconnect grace;
- Host-only playback mutations;
- stale playback sequence rejection;
- Host transfer permissions;
- reaction allowlist and rate limit;
- room chat authorization, pagination, XSS payload storage as plain text, and rate limit;
- poll create/vote/close/start-winner separation;
- tied poll behavior;
- content switch sequence increment;
- duplicate next-episode ended events;
- final-episode no-op;
- Mini Chat unique unordered one-to-one conversation;
- private message participant authorization;
- Mini Chat duplicate `clientMessageId` retry and concurrent uniqueness race;
- unread count and mark-read behavior;
- quick reaction allowlist;
- private-chat room isolation.

## Manual Desktop Tests

Use two desktop browsers or normal/incognito sessions with separate users.

1. Log in as User A and open a normal content watch page.
2. Verify normal playback, pause, seek, volume, fullscreen, and watch history still work outside Watch Party.
3. Create or join a Watch Party through an invite link.
4. Confirm the page shows video, room metadata, participant panel, Host badge, connection state, Synchronize, Leave, and Host-only End.
5. Resize desktop widths from narrow laptop to wide monitor and verify video, chat, participants, poll panel, and Mini Chat launcher do not overlap incoherently.
6. Open Mini Chat from the bottom-right launcher.
7. Search a user, start a conversation, send text, send a URL, send quick reactions, minimize, close, and reopen.
8. Confirm safe links open in a new tab with `noopener noreferrer`.

## Manual Mobile Tests

Use a real phone or browser device emulation.

1. Log in and open a Watch Party invite link.
2. Verify the video stays usable and controls do not hide behind browser UI.
3. Verify participant list, quick reactions, chat, poll, next-episode countdown, Synchronize, Leave, and End controls wrap without text overflow.
4. Collapse/open room chat and verify it does not permanently cover the player.
5. Open Mini Chat and confirm it uses a full-screen panel instead of a tiny desktop popup.
6. Send messages, URLs, and quick reactions from Mini Chat.
7. Rotate between portrait and landscape and verify no critical actions become unreachable.

## Two-User Scenario

1. User A creates a room and becomes Host.
2. User B joins through `/watch-party/join/{inviteToken}`.
3. User A plays, pauses, and seeks.
4. User B receives the state changes without sending feedback-loop playback events.
5. User B clicks Synchronize and receives the latest authoritative state.
6. User B attempts Host-only actions:
   - end room;
   - transfer Host;
   - create poll;
   - close poll;
   - start winner;
   - start/cancel next episode.
7. Each unauthorized action must fail without changing room state.
8. Both users exchange room chat messages and verify history after refresh.
9. Both users exchange private Mini Chat messages and verify no room chat state is reused.

## Three-User Scenario

1. User A hosts, Users B and C join.
2. Verify all three appear in the participant list with correct status and Host badge.
3. User B sends reactions; A and C see them, no other room sees them.
4. User C sends room chat; A and B see it, no other room sees it.
5. Host creates a poll with at least two options.
6. B and C vote once; duplicate vote attempts fail.
7. Close the poll and verify the winner or tie state appears for all users.
8. If tied, Host must explicitly choose a tied winner.

## Reconnect Scenario

1. Join a room with User B.
2. Disable User B network for less than the disconnect grace period.
3. Re-enable network and verify User B remains in the room and returns to online.
4. Disable network longer than the grace period.
5. Verify User B becomes disconnected/offline but is not permanently removed.
6. Reconnect and verify participant status returns online and latest playback/countdown state is received.
7. Open two tabs for the same user and close one tab.
8. Verify the user remains online until all sockets close.

## Host Transfer Scenario

1. Host A transfers Host to connected User B.
2. Verify the database owner, participant roles, Host badge, and playback authorization update.
3. Verify playback does not reset, `sequence` does not reset, and no unnecessary playback event fires.
4. Old Host A attempts playback control and is rejected.
5. New Host B controls playback successfully.
6. Host B disconnects briefly and reconnects before grace expires; Host remains B.
7. Host B disconnects beyond grace; earliest joined connected participant becomes Host.
8. If no connected participants remain, room stays without transfer or ends according to documented service behavior.

## Network Delay Scenario

1. Add latency and packet loss in browser dev tools or a proxy.
2. Host sends play, pause, and seek rapidly.
3. Verify stale sequence acknowledgements are rejected.
4. Verify a participant's older delayed state never overwrites a newer state.
5. Verify manual Synchronize returns the current authoritative PostgreSQL room state.
6. Verify moderate drift is corrected and large drift seeks directly according to the documented thresholds.

## Next Episode Scenario

1. Use a room whose current playable content has a valid next episode.
2. Let the Host video reach ended or emit ended from multiple clients.
3. Verify only one countdown appears.
4. Refresh a participant during countdown and verify they receive the same countdown state.
5. Host cancels countdown; verify all clients remove it.
6. Trigger countdown again and Host clicks Start now.
7. Verify content changes once, playback resets to `currentTime = 0`, status becomes `PLAYING`, and `sequence` increments.
8. Repeat on a final episode and verify no countdown starts.
9. End the room during countdown and verify the countdown is canceled.

## Private Chat Scenario

1. User A searches for User B and starts a conversation.
2. User B searches for User A and starts a conversation.
3. Verify both actions return the same conversation.
4. Send text, URL text, and each fixed quick reaction.
5. Refresh both users and verify message history persists.
6. Send the same `clientMessageId` twice through a test client and verify only one message persists.
7. Open User C and verify C receives no `chat:message`, cannot load the conversation, and cannot send to it.
8. Mark messages as read and verify unread counts update.

## Authorization Abuse Scenarios

Attempt each action with no token, an expired token, a valid token for a non-member, and tampered payload fields:

- join a Watch Party by internal room ID without invite or membership;
- send playback actions as a participant;
- send playback actions without `sequence`;
- send stale playback sequence;
- transfer Host to self, non-member, or disconnected participant;
- end a room as non-Host;
- send unsupported reaction payloads;
- send overlong room chat or Mini Chat text;
- send room chat to a room the user does not belong to;
- create, vote, close, or start poll outside the room;
- start next episode without Host rights;
- load private messages as a non-participant;
- send a private message with forged `senderUserId`;
- create duplicate direct conversations concurrently;
- send HTML/script payloads in room chat and Mini Chat;
- send `javascript:` URL text and verify it is not linkified.

## Deployment Checklist

Before deploy:

- Confirm `.env` contains required database, Redis, JWT, CORS, app URL, API URL, and MinIO variables.
- Run `npm.cmd install` if dependencies changed.
- Run `npm.cmd run db:generate --workspace=@movie-platform/api`.
- Run `npx.cmd prisma validate --schema apps/api/prisma/schema.prisma`.
- Run `npx.cmd prisma migrate status --schema apps/api/prisma/schema.prisma` against the target database.
- Apply migrations with `npm.cmd run db:migrate:prod --workspace=@movie-platform/api`.
- Run API and web type-checks, lint, tests, and builds.
- Confirm Nginx proxies `/socket.io` to the API with HTTP/1.1, `Upgrade`, `Connection`, and long read/send timeouts.
- Confirm `CORS_ORIGINS` includes the production web origin.
- Confirm only one API replica is used for realtime features unless a Socket.IO Redis adapter has been added and tested.
- Confirm Redis memory policy and persistence match production tolerance for ephemeral presence/countdown/rate-limit keys.
- Confirm logs and metrics cover API errors, socket disconnects, Redis errors, and Prisma errors.

After deploy:

- Create a room, join from a second browser, play/pause/seek, transfer Host, send chat, send reactions, run a poll, and end the room.
- Verify Mini Chat conversation creation, realtime delivery, unread badge, and history.
- Verify normal `/watch/[id]`, authentication, content pages, notifications, and streaming still work.
- Verify `/socket.io` establishes WebSocket or falls back to polling through Nginx.

## Rollback Checklist

If rollback is needed:

- Stop new traffic to the affected API/web version.
- Deploy the previous API and web images together.
- Do not roll back database migrations automatically unless a tested down migration or restore plan exists.
- If database rollback is required, restore from a verified pre-deploy backup.
- Clear ephemeral Redis keys only if they are causing active issues:
  - `watch-party:socket:*`
  - `watch-party:presence:*`
  - `watch-party:reaction-rate:*`
  - `watch-party:chat-rate:*`
  - `watch-party:chat-dedupe:*`
  - `watch-party:next-episode:*`
  - `mini-chat:send-rate:*`
- Verify existing users can still log in, stream normal content, and load existing content pages.
- Verify Watch Party and Mini Chat endpoints either work on the previous version or are disabled/hidden consistently.
- Preserve PostgreSQL message/room/poll/conversation history unless product owners approve deletion.
