ALTER TYPE "AuthProvider" ADD VALUE IF NOT EXISTS 'passkey';

CREATE TABLE "PasskeyCredential" (
    "id" TEXT NOT NULL,
    "userIdentityId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "publicKey" BYTEA NOT NULL,
    "counter" INTEGER NOT NULL,
    "transports" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deviceType" TEXT,
    "backedUp" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PasskeyCredential_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PasskeyCredential_credentialId_key" ON "PasskeyCredential"("credentialId");
CREATE INDEX "PasskeyCredential_userIdentityId_idx" ON "PasskeyCredential"("userIdentityId");

ALTER TABLE "PasskeyCredential"
ADD CONSTRAINT "PasskeyCredential_userIdentityId_fkey"
FOREIGN KEY ("userIdentityId") REFERENCES "UserIdentity"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
