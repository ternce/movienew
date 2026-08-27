-- CreateEnum
CREATE TYPE "WatchPartyRoomStatus" AS ENUM ('WAITING', 'ACTIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "WatchPartyPlaybackStatus" AS ENUM ('PLAYING', 'PAUSED');

-- CreateEnum
CREATE TYPE "WatchPartyParticipantRole" AS ENUM ('HOST', 'PARTICIPANT');

-- CreateEnum
CREATE TYPE "WatchPartyConnectionStatus" AS ENUM ('ONLINE', 'OFFLINE');

-- CreateTable
CREATE TABLE "watch_party_rooms" (
    "id" TEXT NOT NULL,
    "invite_token" TEXT NOT NULL,
    "host_user_id" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "episode_id" TEXT,
    "status" "WatchPartyRoomStatus" NOT NULL DEFAULT 'WAITING',
    "current_time" INTEGER NOT NULL DEFAULT 0,
    "playback_status" "WatchPartyPlaybackStatus" NOT NULL DEFAULT 'PAUSED',
    "playback_rate" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "watch_party_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watch_party_participants" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "WatchPartyParticipantRole" NOT NULL DEFAULT 'PARTICIPANT',
    "connection_status" "WatchPartyConnectionStatus" NOT NULL DEFAULT 'ONLINE',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watch_party_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "watch_party_rooms_invite_token_key" ON "watch_party_rooms"("invite_token");

-- CreateIndex
CREATE INDEX "watch_party_rooms_host_user_id_idx" ON "watch_party_rooms"("host_user_id");

-- CreateIndex
CREATE INDEX "watch_party_rooms_content_id_idx" ON "watch_party_rooms"("content_id");

-- CreateIndex
CREATE INDEX "watch_party_rooms_episode_id_idx" ON "watch_party_rooms"("episode_id");

-- CreateIndex
CREATE INDEX "watch_party_rooms_status_updated_at_idx" ON "watch_party_rooms"("status", "updated_at");

-- CreateIndex
CREATE INDEX "watch_party_participants_user_id_idx" ON "watch_party_participants"("user_id");

-- CreateIndex
CREATE INDEX "watch_party_participants_room_id_connection_status_idx" ON "watch_party_participants"("room_id", "connection_status");

-- CreateIndex
CREATE UNIQUE INDEX "watch_party_participants_room_id_user_id_key" ON "watch_party_participants"("room_id", "user_id");

-- AddForeignKey
ALTER TABLE "watch_party_rooms" ADD CONSTRAINT "watch_party_rooms_host_user_id_fkey" FOREIGN KEY ("host_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_party_rooms" ADD CONSTRAINT "watch_party_rooms_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_party_rooms" ADD CONSTRAINT "watch_party_rooms_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "content"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_party_participants" ADD CONSTRAINT "watch_party_participants_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "watch_party_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_party_participants" ADD CONSTRAINT "watch_party_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
