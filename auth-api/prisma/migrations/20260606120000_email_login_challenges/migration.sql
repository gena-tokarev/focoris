CREATE TABLE "EmailLoginChallenge" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "linkTokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailLoginChallenge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailLoginChallenge_email_idx" ON "EmailLoginChallenge"("email");
CREATE INDEX "EmailLoginChallenge_expiresAt_idx" ON "EmailLoginChallenge"("expiresAt");
