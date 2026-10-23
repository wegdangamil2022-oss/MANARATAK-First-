-- AlterTable
ALTER TABLE "ServiceCatalogRecord" ADD COLUMN     "managedApplication" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ServiceRequestRecord" ADD COLUMN     "applicationOpportunityId" TEXT;

-- CreateTable
CREATE TABLE "PublicAnalyticsConsent" (
    "tokenHash" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "PublicAnalyticsConsent_pkey" PRIMARY KEY ("tokenHash")
);

-- CreateTable
CREATE TABLE "DashboardMeasurementEpoch" (
    "key" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DashboardMeasurementEpoch_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "PublicAnalyticsEvent" (
    "id" TEXT NOT NULL,
    "consentHash" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "pageKey" TEXT NOT NULL,
    "opportunityId" TEXT,
    "destinationHost" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicAnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceApplicationEvidence" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "evidenceAssetId" TEXT,
    "evidenceDigest" TEXT,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceApplicationEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectApplicationReport" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectApplicationReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PublicAnalyticsConsent_expiresAt_idx" ON "PublicAnalyticsConsent"("expiresAt");

-- CreateIndex
CREATE INDEX "PublicAnalyticsEvent_kind_receivedAt_consentHash_idx" ON "PublicAnalyticsEvent"("kind", "receivedAt", "consentHash");

-- CreateIndex
CREATE INDEX "PublicAnalyticsEvent_expiresAt_idx" ON "PublicAnalyticsEvent"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PublicAnalyticsEvent_consentHash_eventId_key" ON "PublicAnalyticsEvent"("consentHash", "eventId");

-- CreateIndex
CREATE INDEX "ServiceApplicationEvidence_kind_verifiedAt_idx" ON "ServiceApplicationEvidence"("kind", "verifiedAt");

-- CreateIndex
CREATE INDEX "ServiceApplicationEvidence_expiresAt_idx" ON "ServiceApplicationEvidence"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceApplicationEvidence_requestId_idempotencyKey_key" ON "ServiceApplicationEvidence"("requestId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "DirectApplicationReport_reportedAt_idx" ON "DirectApplicationReport"("reportedAt");

-- CreateIndex
CREATE INDEX "DirectApplicationReport_expiresAt_idx" ON "DirectApplicationReport"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "DirectApplicationReport_studentId_opportunityId_key" ON "DirectApplicationReport"("studentId", "opportunityId");

-- CreateIndex
CREATE INDEX "IdentityRecord_type_status_createdAt_idx" ON "IdentityRecord"("type", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceRequestRecord_createdAt_status_idx" ON "ServiceRequestRecord"("createdAt", "status");

-- CreateIndex
CREATE INDEX "ServiceRequestRecord_applicationOpportunityId_idx" ON "ServiceRequestRecord"("applicationOpportunityId");

-- AddForeignKey
ALTER TABLE "ServiceRequestRecord" ADD CONSTRAINT "ServiceRequestRecord_applicationOpportunityId_fkey" FOREIGN KEY ("applicationOpportunityId") REFERENCES "Scholarship"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicAnalyticsEvent" ADD CONSTRAINT "PublicAnalyticsEvent_consentHash_fkey" FOREIGN KEY ("consentHash") REFERENCES "PublicAnalyticsConsent"("tokenHash") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceApplicationEvidence" ADD CONSTRAINT "ServiceApplicationEvidence_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ServiceRequestRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceApplicationEvidence" ADD CONSTRAINT "ServiceApplicationEvidence_evidenceAssetId_fkey" FOREIGN KEY ("evidenceAssetId") REFERENCES "AssetRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectApplicationReport" ADD CONSTRAINT "DirectApplicationReport_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "IdentityRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectApplicationReport" ADD CONSTRAINT "DirectApplicationReport_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Scholarship"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Measurement begins at migration execution; no historical analytics are fabricated.
INSERT INTO "DashboardMeasurementEpoch" ("key", "startedAt") VALUES ('managed-application-v1', CURRENT_TIMESTAMP);

ALTER TABLE "PublicAnalyticsConsent" ADD CONSTRAINT "PublicAnalyticsConsent_hash_and_lifetime" CHECK (
 "tokenHash" ~ '^[a-f0-9]{64}$' AND "expiresAt" > "grantedAt" AND "expiresAt" <= "grantedAt" + interval '30 days');
ALTER TABLE "PublicAnalyticsEvent" ADD CONSTRAINT "PublicAnalyticsEvent_shape" CHECK (
 "id" ~ '^[a-f0-9]{64}$' AND "kind" IN ('page_view','application_outbound_click')
 AND "pageKey" IN ('home','scholarships','universities','majors','courses','tests','services','careers','articles','countries')
 AND (CASE WHEN "kind"='page_view' THEN "opportunityId" IS NULL AND "destinationHost" IS NULL ELSE "opportunityId" IS NOT NULL AND "destinationHost" IS NOT NULL AND "destinationHost" ~ '^[a-z0-9.-]+$' END)
 AND "expiresAt">"receivedAt" AND "expiresAt"<="receivedAt"+interval '90 days');
ALTER TABLE "ServiceApplicationEvidence" ADD CONSTRAINT "ServiceApplicationEvidence_shape" CHECK (
 "kind" IN ('NEEDS_INFORMATION','PROCESSING','UNIVERSITY_SUBMITTED','ADMISSION_ACCEPTED','ADMISSION_REJECTED')
 AND "expiresAt">"verifiedAt" AND ("kind" NOT IN ('UNIVERSITY_SUBMITTED','ADMISSION_ACCEPTED','ADMISSION_REJECTED') OR ("evidenceDigest" IS NOT NULL AND "evidenceDigest" ~ '^[a-f0-9]{64}$')));
-- Only proven stages are one-time events. Information/processing can recur without rewriting history.
CREATE UNIQUE INDEX "ServiceApplicationEvidence_proven_stage_unique" ON "ServiceApplicationEvidence"("requestId","kind")
 WHERE "kind" IN ('UNIVERSITY_SUBMITTED','ADMISSION_ACCEPTED','ADMISSION_REJECTED');
CREATE INDEX "ServiceApplicationEvidence_request_latest" ON "ServiceApplicationEvidence"("requestId","verifiedAt" DESC,"id" DESC);
ALTER TABLE "DirectApplicationReport" ADD CONSTRAINT "DirectApplicationReport_lifetime" CHECK ("expiresAt">"reportedAt" AND "expiresAt"<="reportedAt"+interval '180 days');

CREATE FUNCTION protect_service_application_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' THEN
  -- Asset retention may remove the file link, while the verified digest attestation remains immutable.
  IF NEW."evidenceAssetId" IS NULL AND OLD."evidenceAssetId" IS NOT NULL
    AND (to_jsonb(NEW)-'evidenceAssetId')=(to_jsonb(OLD)-'evidenceAssetId') THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'SERVICE_APPLICATION_EVIDENCE_IMMUTABLE';
 END IF;
 IF OLD."expiresAt">CURRENT_TIMESTAMP OR EXISTS (SELECT 1 FROM "ServiceRequestRecord" r WHERE r.id=OLD."requestId" AND r."legalHoldUntil">CURRENT_TIMESTAMP)
   OR EXISTS (SELECT 1 FROM "AssetRecord" a WHERE a.id=OLD."evidenceAssetId" AND a."legalHoldUntil">CURRENT_TIMESTAMP) THEN
  RAISE EXCEPTION 'SERVICE_APPLICATION_EVIDENCE_RETENTION_PROTECTED';
 END IF;
 RETURN OLD;
END $$;
CREATE TRIGGER "ServiceApplicationEvidence_immutable" BEFORE UPDATE OR DELETE ON "ServiceApplicationEvidence"
 FOR EACH ROW EXECUTE FUNCTION protect_service_application_evidence();
