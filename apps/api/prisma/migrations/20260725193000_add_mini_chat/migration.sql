-- CreateEnum
CREATE TYPE "DirectMessageType" AS ENUM ('TEXT', 'QUICK_REACTION');

-- CreateTable
CREATE TABLE "direct_conversations" (
    "id" TEXT NOT NULL,
    "participant_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "direct_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direct_conversation_participants" (
    "conversation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "last_read_message_id" TEXT,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "direct_conversation_participants_pkey" PRIMARY KEY ("conversation_id","user_id")
);

-- CreateTable
CREATE TABLE "direct_messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_user_id" TEXT NOT NULL,
    "type" "DirectMessageType" NOT NULL DEFAULT 'TEXT',
    "text" TEXT,
    "reaction_code" TEXT,
    "client_message_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "direct_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "direct_conversations_participant_key_key" ON "direct_conversations"("participant_key");

-- CreateIndex
CREATE INDEX "direct_conversations_updated_at_idx" ON "direct_conversations"("updated_at");

-- CreateIndex
CREATE INDEX "direct_conversation_participants_user_id_idx" ON "direct_conversation_participants"("user_id");

-- CreateIndex
CREATE INDEX "direct_conversation_participants_last_read_message_id_idx" ON "direct_conversation_participants"("last_read_message_id");

-- CreateIndex
CREATE UNIQUE INDEX "direct_messages_conversation_id_sender_user_id_client_message_id_key" ON "direct_messages"("conversation_id", "sender_user_id", "client_message_id");

-- CreateIndex
CREATE INDEX "direct_messages_conversation_id_created_at_idx" ON "direct_messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "direct_messages_sender_user_id_idx" ON "direct_messages"("sender_user_id");

-- AddForeignKey
ALTER TABLE "direct_conversation_participants" ADD CONSTRAINT "direct_conversation_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "direct_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_conversation_participants" ADD CONSTRAINT "direct_conversation_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "direct_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
