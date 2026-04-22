/*
  Warnings:

  - Added the required table `content_likes`.

*/

-- CreateTable
CREATE TABLE "content_likes" (
    "id" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_likes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_likes_content_id_idx" ON "content_likes"("content_id");

-- CreateIndex
CREATE INDEX "content_likes_user_id_idx" ON "content_likes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_likes_content_id_user_id_key" ON "content_likes"("content_id", "user_id");

-- AddForeignKey
ALTER TABLE "content_likes" ADD CONSTRAINT "content_likes_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_likes" ADD CONSTRAINT "content_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;