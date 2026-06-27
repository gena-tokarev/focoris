ALTER TABLE "ExternalIdentity" RENAME TO "UserIdentity";

ALTER INDEX "ExternalIdentity_pkey" RENAME TO "UserIdentity_pkey";
ALTER INDEX "ExternalIdentity_provider_providerUserId_key" RENAME TO "UserIdentity_provider_providerUserId_key";
ALTER INDEX "ExternalIdentity_userId_idx" RENAME TO "UserIdentity_userId_idx";
ALTER INDEX "ExternalIdentity_email_idx" RENAME TO "UserIdentity_email_idx";
ALTER TABLE "UserIdentity" RENAME CONSTRAINT "ExternalIdentity_userId_fkey" TO "UserIdentity_userId_fkey";
