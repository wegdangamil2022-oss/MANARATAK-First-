-- CreateTable
CREATE TABLE "SessionRecord" (
    "id" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SessionRecord_refreshTokenHash_key" ON "SessionRecord"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "SessionRecord_identityId_idx" ON "SessionRecord"("identityId");

-- CreateIndex
CREATE INDEX "SessionRecord_expiresAt_idx" ON "SessionRecord"("expiresAt");

-- AddForeignKey
ALTER TABLE "SessionRecord" ADD CONSTRAINT "SessionRecord_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "IdentityRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

