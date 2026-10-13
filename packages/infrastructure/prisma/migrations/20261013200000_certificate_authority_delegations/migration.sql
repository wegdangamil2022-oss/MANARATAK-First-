-- SOURCE ONLY. Do not apply to an existing database without a separate approved rollout.
CREATE TABLE "CertificateAuthorityDelegation" (
  "id" TEXT PRIMARY KEY,
  "issuerId" TEXT NOT NULL REFERENCES "CertificateIssuer"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  "canonicalOwnerType" TEXT NOT NULL CHECK ("canonicalOwnerType" IN ('UNIVERSITY','ORGANIZATION')),
  "canonicalOwnerId" TEXT NOT NULL,
  "authorityReference" TEXT NOT NULL,
  "legalRegistryReference" TEXT NOT NULL,
  "evidenceAssetId" TEXT NOT NULL,
  "evidenceChecksum" TEXT NOT NULL CHECK ("evidenceChecksum" ~ '^[a-f0-9]{64}$'),
  "signingKeyReference" TEXT NOT NULL,
  "scope" TEXT NOT NULL DEFAULT 'CERTIFICATE_ISSUANCE' CHECK ("scope" = 'CERTIFICATE_ISSUANCE'),
  "status" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL' CHECK ("status" IN ('PENDING_APPROVAL','APPROVED','REVOKED')),
  "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version" > 0),
  "validFrom" TIMESTAMP(3) NOT NULL,
  "validUntil" TIMESTAMP(3) NOT NULL CHECK ("validUntil" > "validFrom"),
  "ownershipVerified" BOOLEAN NOT NULL DEFAULT false,
  "delegationVerified" BOOLEAN NOT NULL DEFAULT false,
  "createdBy" TEXT NOT NULL,
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ("status" <> 'APPROVED' OR ("reviewedBy" IS NOT NULL AND "reviewedBy" <> "createdBy" AND "reviewedAt" IS NOT NULL AND "ownershipVerified" AND "delegationVerified"))
);
CREATE INDEX "CertificateAuthorityDelegation_issuerId_status_validUntil_idx" ON "CertificateAuthorityDelegation"("issuerId","status","validUntil");
CREATE INDEX "CertificateAuthorityDelegation_issuerId_createdAt_id_idx" ON "CertificateAuthorityDelegation"("issuerId","createdAt" DESC,"id" DESC);
CREATE INDEX "cert_authority_owner_idx" ON "CertificateAuthorityDelegation"("canonicalOwnerType","canonicalOwnerId");

-- Register evidence as a canonical EAP consumer. Serialize attach versus lifecycle
-- changes using the existing P3 share-lock owner-reference guard.
CREATE TRIGGER "eap_asset_reference_owner" BEFORE INSERT OR UPDATE OF "evidenceAssetId"
  ON "CertificateAuthorityDelegation" FOR EACH ROW
  EXECUTE FUNCTION "manaratak_require_active_asset_reference"('evidenceAssetId','false','false');

-- Preserve immutable legal evidence, including withdrawn delegation history.
-- Normal P3 guards still protect every other existing consumer.
CREATE FUNCTION "manaratak_guard_certificate_delegation_evidence_lifecycle"() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF EXISTS (SELECT 1 FROM "CertificateAuthorityDelegation" WHERE "evidenceAssetId" = OLD."id") THEN
      RAISE EXCEPTION 'ASSET_REFERENCE_IN_USE' USING ERRCODE = '23514';
    END IF;
    RETURN OLD;
  END IF;
  IF NEW."lifecycleState" IS DISTINCT FROM OLD."lifecycleState" AND NEW."lifecycleState" <> 'ACTIVE' THEN
    IF EXISTS (SELECT 1 FROM "CertificateAuthorityDelegation" WHERE "evidenceAssetId" = OLD."id") THEN
      RAISE EXCEPTION 'ASSET_REFERENCE_IN_USE' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "eap_asset_lifecycle_certificate_delegation" BEFORE DELETE OR UPDATE OF "lifecycleState"
  ON "AssetRecord" FOR EACH ROW
  EXECUTE FUNCTION "manaratak_guard_certificate_delegation_evidence_lifecycle"();
