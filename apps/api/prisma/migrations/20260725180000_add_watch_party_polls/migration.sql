-- CreateEnum
CREATE TYPE "WatchPartyPollStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateTable
CREATE TABLE "watch_party_polls" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "status" "WatchPartyPollStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "watch_party_polls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watch_party_poll_options" (
    "id" TEXT NOT NULL,
    "poll_id" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "episode_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watch_party_poll_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watch_party_poll_votes" (
    "id" TEXT NOT NULL,
    "poll_id" TEXT NOT NULL,
    "option_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watch_party_poll_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "watch_party_polls_room_id_status_idx" ON "watch_party_polls"("room_id", "status");

-- CreateIndex
CREATE INDEX "watch_party_polls_created_by_user_id_idx" ON "watch_party_polls"("created_by_user_id");

-- CreateIndex
CREATE INDEX "watch_party_poll_options_poll_id_idx" ON "watch_party_poll_options"("poll_id");

-- CreateIndex
CREATE INDEX "watch_party_poll_options_content_id_idx" ON "watch_party_poll_options"("content_id");

-- CreateIndex
CREATE INDEX "watch_party_poll_options_episode_id_idx" ON "watch_party_poll_options"("episode_id");

-- CreateIndex
CREATE UNIQUE INDEX "watch_party_poll_votes_poll_id_user_id_key" ON "watch_party_poll_votes"("poll_id", "user_id");

-- CreateIndex
CREATE INDEX "watch_party_poll_votes_option_id_idx" ON "watch_party_poll_votes"("option_id");

-- CreateIndex
CREATE INDEX "watch_party_poll_votes_user_id_idx" ON "watch_party_poll_votes"("user_id");

-- AddForeignKey
ALTER TABLE "watch_party_polls" ADD CONSTRAINT "watch_party_polls_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "watch_party_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_party_polls" ADD CONSTRAINT "watch_party_polls_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_party_poll_options" ADD CONSTRAINT "watch_party_poll_options_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "watch_party_polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_party_poll_options" ADD CONSTRAINT "watch_party_poll_options_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_party_poll_options" ADD CONSTRAINT "watch_party_poll_options_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "content"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_party_poll_votes" ADD CONSTRAINT "watch_party_poll_votes_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "watch_party_polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_party_poll_votes" ADD CONSTRAINT "watch_party_poll_votes_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "watch_party_poll_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_party_poll_votes" ADD CONSTRAINT "watch_party_poll_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
