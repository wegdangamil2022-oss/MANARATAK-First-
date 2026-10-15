-- AlterTable
ALTER TABLE "StudentApplicationDocumentBinding" ADD COLUMN     "attestation" JSONB,
ADD COLUMN     "reviewConsentGrantedAt" TIMESTAMP(3),
ADD COLUMN     "reviewConsentUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ScholarshipReferenceTransition" (
    "id" TEXT NOT NULL,
    "sourceOwnerId" TEXT NOT NULL,
    "sourcePublicId" TEXT NOT NULL,
    "sourceSlug" TEXT NOT NULL,
    "sourceRevision" INTEGER NOT NULL,
    "targetOwnerId" TEXT,
    "targetRevision" INTEGER,
    "changeType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "proposedBy" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "ScholarshipReferenceTransition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScholarshipReference_source_revision_idx" ON "ScholarshipReferenceTransition"("sourceOwnerId", "status", "sourceRevision");

-- CreateIndex
CREATE INDEX "ScholarshipReference_source_slug_idx" ON "ScholarshipReferenceTransition"("sourceSlug", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ScholarshipReference_source_revision_key" ON "ScholarshipReferenceTransition"("sourceOwnerId", "sourceRevision");

-- CreateIndex
CREATE INDEX "StudentApplicationDocumentBinding_reviewConsentUntil_id_idx" ON "StudentApplicationDocumentBinding"("reviewConsentUntil", "id");
