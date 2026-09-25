-- MANARATAK_MIGRATION_OWNER: core_platform
-- MANARATAK_MIGRATION_SCOPE: structural_batch_a2
-- MANARATAK_ARCH_DECISION: ADR-M7-A2
-- Batch A2: New Token Tables, DegreeLevel Relationship, Certificate Nullability, CertificateTemplate Legacy Columns Removal

-- CreateTable
CREATE TABLE "EmailVerificationTokenRecord" (
    "id" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationTokenRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetTokenRecord" (
    "id" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetTokenRecord_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "InternationalTestDegreeRelationship" ADD COLUMN "degreeLevelId" TEXT;

-- AlterTable
ALTER TABLE "Certificate" ALTER COLUMN "courseId" DROP NOT NULL,
ALTER COLUMN "courseDisplayName" DROP NOT NULL,
ALTER COLUMN "courseCompletionId" DROP NOT NULL,
ALTER COLUMN "courseCompletedAt" DROP NOT NULL,
ALTER COLUMN "templateVersion" SET NOT NULL;

-- DropIndex
DROP INDEX IF EXISTS "CertificateTemplate_issuerReferenceId_idx";

-- AlterTable
ALTER TABLE "CertificateTemplate" DROP COLUMN "accentColor",
DROP COLUMN "bodyAr",
DROP COLUMN "bodyEn",
DROP COLUMN "designAssetId",
DROP COLUMN "issuerName",
DROP COLUMN "issuerReferenceId",
DROP COLUMN "language",
DROP COLUMN "layout",
DROP COLUMN "logoAssetId",
DROP COLUMN "metadata",
DROP COLUMN "sealAssetId",
DROP COLUMN "secondaryColor",
DROP COLUMN "signatoryNameAr",
DROP COLUMN "signatoryNameEn",
DROP COLUMN "signatoryTitleAr",
DROP COLUMN "signatoryTitleEn",
DROP COLUMN "signatureAssetId",
DROP COLUMN "templateVersion",
DROP COLUMN "titleAr",
DROP COLUMN "titleEn";

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationTokenRecord_tokenHash_key" ON "EmailVerificationTokenRecord"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailVerificationTokenRecord_identityId_idx" ON "EmailVerificationTokenRecord"("identityId");

-- CreateIndex
CREATE INDEX "EmailVerificationTokenRecord_tokenHash_idx" ON "EmailVerificationTokenRecord"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetTokenRecord_tokenHash_key" ON "PasswordResetTokenRecord"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetTokenRecord_identityId_idx" ON "PasswordResetTokenRecord"("identityId");

-- CreateIndex
CREATE INDEX "PasswordResetTokenRecord_tokenHash_idx" ON "PasswordResetTokenRecord"("tokenHash");

-- AddForeignKey
ALTER TABLE "EmailVerificationTokenRecord" ADD CONSTRAINT "EmailVerificationTokenRecord_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "IdentityRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetTokenRecord" ADD CONSTRAINT "PasswordResetTokenRecord_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "IdentityRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternationalTestDegreeRelationship" ADD CONSTRAINT "InternationalTestDegreeRelationship_degreeLevelId_fkey" FOREIGN KEY ("degreeLevelId") REFERENCES "DegreeLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
