/*
  Warnings:

  - You are about to drop the column `bunny_library_id` on the `content` table. All the data in the column will be lost.
  - You are about to drop the column `bunny_video_id` on the `content` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "BonusCampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BonusCampaignTargetType" AS ENUM ('ALL', 'SEGMENT', 'INDIVIDUAL');

-- AlterTable
ALTER TABLE "bonus_rates" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "created_by_id" TEXT,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "bonus_transactions" ADD COLUMN     "expires_at" TIMESTAMP(3),
ADD COLUMN     "metadata" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "content" DROP COLUMN "bunny_library_id",
DROP COLUMN "bunny_video_id",
ADD COLUMN     "edgecenter_client_id" TEXT,
ADD COLUMN     "edgecenter_video_id" TEXT;

-- AlterTable
ALTER TABLE "products" ALTER COLUMN "description" DROP NOT NULL;

-- CreateTable
CREATE TABLE "genres" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#C94BFF',
    "icon_url" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "genres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_genre_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "genre_id" TEXT NOT NULL,
    "color" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_genre_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_genres" (
    "content_id" TEXT NOT NULL,
    "genre_id" TEXT NOT NULL,

    CONSTRAINT "content_genres_pkey" PRIMARY KEY ("content_id","genre_id")
);

-- CreateTable
CREATE TABLE "bonus_campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "bonus_amount" DECIMAL(12,2) NOT NULL,
    "target_type" "BonusCampaignTargetType" NOT NULL,
    "target_criteria" JSONB NOT NULL DEFAULT '{}',
    "status" "BonusCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "expiry_days" INTEGER,
    "usage_limit" INTEGER,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executed_at" TIMESTAMP(3),

    CONSTRAINT "bonus_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bonus_withdrawals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "bonus_amount" DECIMAL(12,2) NOT NULL,
    "currency_amount" DECIMAL(12,2) NOT NULL,
    "rate" DECIMAL(10,4) NOT NULL,
    "tax_status" "TaxStatus" NOT NULL,
    "tax_amount" DECIMAL(12,2) NOT NULL,
    "net_amount" DECIMAL(12,2) NOT NULL,
    "payment_details" JSONB NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "processed_by_id" TEXT,
    "processed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bonus_withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_activity_bonuses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "activity_type" TEXT NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_activity_bonuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "genres_name_key" ON "genres"("name");

-- CreateIndex
CREATE UNIQUE INDEX "genres_slug_key" ON "genres"("slug");

-- CreateIndex
CREATE INDEX "genres_slug_idx" ON "genres"("slug");

-- CreateIndex
CREATE INDEX "genres_is_active_idx" ON "genres"("is_active");

-- CreateIndex
CREATE INDEX "user_genre_preferences_user_id_idx" ON "user_genre_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_genre_preferences_user_id_genre_id_key" ON "user_genre_preferences"("user_id", "genre_id");

-- CreateIndex
CREATE INDEX "bonus_campaigns_status_idx" ON "bonus_campaigns"("status");

-- CreateIndex
CREATE INDEX "bonus_campaigns_start_date_idx" ON "bonus_campaigns"("start_date");

-- CreateIndex
CREATE INDEX "bonus_withdrawals_user_id_idx" ON "bonus_withdrawals"("user_id");

-- CreateIndex
CREATE INDEX "bonus_withdrawals_status_idx" ON "bonus_withdrawals"("status");

-- CreateIndex
CREATE INDEX "user_activity_bonuses_user_id_idx" ON "user_activity_bonuses"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_activity_bonuses_user_id_activity_type_key" ON "user_activity_bonuses"("user_id", "activity_type");

-- CreateIndex
CREATE INDEX "bonus_rates_is_active_idx" ON "bonus_rates"("is_active");

-- CreateIndex
CREATE INDEX "bonus_transactions_expires_at_idx" ON "bonus_transactions"("expires_at");

-- CreateIndex
CREATE INDEX "bonus_transactions_user_id_type_created_at_idx" ON "bonus_transactions"("user_id", "type", "created_at");

-- CreateIndex
CREATE INDEX "content_content_type_age_category_status_idx" ON "content"("content_type", "age_category", "status");

-- CreateIndex
CREATE INDEX "content_category_id_status_published_at_idx" ON "content"("category_id", "status", "published_at");

-- CreateIndex
CREATE INDEX "content_status_published_at_age_category_idx" ON "content"("status", "published_at", "age_category");

-- CreateIndex
CREATE INDEX "content_is_free_status_age_category_idx" ON "content"("is_free", "status", "age_category");

-- CreateIndex
CREATE INDEX "partner_commissions_partner_id_status_created_at_idx" ON "partner_commissions"("partner_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "products_status_category_id_created_at_idx" ON "products"("status", "category_id", "created_at");

-- CreateIndex
CREATE INDEX "transactions_user_id_status_created_at_idx" ON "transactions"("user_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "transactions_user_id_type_status_idx" ON "transactions"("user_id", "type", "status");

-- CreateIndex
CREATE INDEX "transactions_status_created_at_idx" ON "transactions"("status", "created_at");

-- CreateIndex
CREATE INDEX "transactions_type_status_created_at_idx" ON "transactions"("type", "status", "created_at");

-- CreateIndex
CREATE INDEX "user_notifications_user_id_read_at_created_at_idx" ON "user_notifications"("user_id", "read_at", "created_at");

-- CreateIndex
CREATE INDEX "watch_history_user_id_last_watched_at_idx" ON "watch_history"("user_id", "last_watched_at");

-- AddForeignKey
ALTER TABLE "user_genre_preferences" ADD CONSTRAINT "user_genre_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_genre_preferences" ADD CONSTRAINT "user_genre_preferences_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "genres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_genres" ADD CONSTRAINT "content_genres_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_genres" ADD CONSTRAINT "content_genres_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "genres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_commissions" ADD CONSTRAINT "partner_commissions_source_user_id_fkey" FOREIGN KEY ("source_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bonus_withdrawals" ADD CONSTRAINT "bonus_withdrawals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bonus_withdrawals" ADD CONSTRAINT "bonus_withdrawals_processed_by_id_fkey" FOREIGN KEY ("processed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_activity_bonuses" ADD CONSTRAINT "user_activity_bonuses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
