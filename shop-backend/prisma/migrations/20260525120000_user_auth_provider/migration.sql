-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('LOCAL', 'GOOGLE', 'FACEBOOK');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "provider" "AuthProvider" NOT NULL DEFAULT 'LOCAL';
