-- REVIEW DRAFT ONLY. NOT EXECUTED. Not placed in Prisma migrations.
-- Scope: new disposable validation target only after explicit review.
-- Preserve existing rows, FK protections and search indexes. No DROP TABLE/INDEX/FK.
-- Preserve existing index names via explicit Prisma map annotations in the companion schema patch.
-- Assumes the canonical DRAFT and updatedAt defaults are approved. Other steps remain separate.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
ALTER TABLE public."CmsBlockSchema" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE public."CertificateAuthorityDelegation" ALTER COLUMN "updatedAt" DROP DEFAULT;
COMMIT;
