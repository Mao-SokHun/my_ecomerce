-- Admin notification: track when admin last viewed support chat inbox
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastSeenSupportAt" TIMESTAMP(3);
