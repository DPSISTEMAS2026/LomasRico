-- Add missing columns to Promotion table for banner scheduling
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "activeDays" TEXT;
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "startTime" TEXT;
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "endTime" TEXT;
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "bannerDesktopUrl" TEXT;
ALTER TABLE "Promotion" ADD COLUMN IF NOT EXISTS "bannerMobileUrl" TEXT;
