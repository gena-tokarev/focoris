-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'member');

-- AlterTable
ALTER TABLE "User"
ALTER COLUMN "roles" TYPE "UserRole"[]
USING ("roles"::text[]::"UserRole"[]);
