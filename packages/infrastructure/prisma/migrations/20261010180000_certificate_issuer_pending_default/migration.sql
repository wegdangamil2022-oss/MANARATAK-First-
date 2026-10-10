-- Source only. Existing ACTIVE issuers require explicit trust review; never auto-approve.
ALTER TABLE "CertificateIssuer" ALTER COLUMN "status" SET DEFAULT 'PENDING_APPROVAL';
CREATE INDEX "Certificate_issuerId_issuedAt_id_idx" ON "Certificate" ("issuerId", "issuedAt" DESC, "id" DESC);
CREATE INDEX "Certificate_studentReferenceId_issuedAt_id_idx" ON "Certificate" ("studentReferenceId", "issuedAt" DESC, "id" DESC);

-- Historical certificates stay intact. Unreviewed external issuer authority must not survive activation.
UPDATE "CertificateIssuer" SET "status" = 'PENDING_APPROVAL' WHERE "issuerType" <> 'MANARATAK' AND "status" = 'ACTIVE' AND (metadata->'trust'->>'approvedBy' IS NULL OR metadata->'trust'->>'evidenceAssetId' IS NULL);

CREATE INDEX "CertificateLedgerEntry_certificateId_occurredAt_id_idx" ON "CertificateLedgerEntry" ("certificateId", "occurredAt" DESC, "id" DESC);
