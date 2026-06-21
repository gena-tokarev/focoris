-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('local', 'google', 'apple', 'meta');

-- CreateTable
CREATE TABLE "ExternalIdentity" (
    "id" TEXT NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "email" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "displayName" TEXT,
    "passwordHash" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalIdentity_pkey" PRIMARY KEY ("id")
);

-- Migrate existing local email/password accounts into ExternalIdentity rows
INSERT INTO "ExternalIdentity" (
    "id",
    "provider",
    "providerUserId",
    "email",
    "emailVerified",
    "displayName",
    "passwordHash",
    "userId",
    "createdAt",
    "updatedAt"
)
SELECT
    "id" || ':local',
    'local'::"AuthProvider",
    lower("email"),
    "email",
    false,
    NULL,
    "passwordHash",
    "id",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "User";

-- Drop old local-password-only constraint/modeling
DROP INDEX "User_email_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "passwordHash";

-- CreateIndex
CREATE UNIQUE INDEX "ExternalIdentity_provider_providerUserId_key" ON "ExternalIdentity"("provider", "providerUserId");

-- CreateIndex
CREATE INDEX "ExternalIdentity_userId_idx" ON "ExternalIdentity"("userId");

-- CreateIndex
CREATE INDEX "ExternalIdentity_email_idx" ON "ExternalIdentity"("email");

-- AddForeignKey
ALTER TABLE "ExternalIdentity" ADD CONSTRAINT "ExternalIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
