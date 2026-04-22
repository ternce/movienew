-- Add missing columns to users table (prod hotfix)
-- These fields exist in schema.prisma but were missing from earlier migrations.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "email_verified" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "referral_code_active" BOOLEAN NOT NULL DEFAULT true;
