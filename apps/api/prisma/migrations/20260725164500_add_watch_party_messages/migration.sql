-- CreateTable
CREATE TABLE "watch_party_messages" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "sender_user_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watch_party_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "watch_party_messages_room_id_created_at_idx" ON "watch_party_messages"("room_id", "created_at");

-- CreateIndex
CREATE INDEX "watch_party_messages_sender_user_id_idx" ON "watch_party_messages"("sender_user_id");

-- AddForeignKey
ALTER TABLE "watch_party_messages" ADD CONSTRAINT "watch_party_messages_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "watch_party_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_party_messages" ADD CONSTRAINT "watch_party_messages_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
