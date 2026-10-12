BEGIN;

CREATE TABLE "AssetRenditionRecord" (
 "id" TEXT PRIMARY KEY, "assetId" TEXT NOT NULL, "variantKey" TEXT NOT NULL,
 "version" INTEGER NOT NULL, "status" TEXT NOT NULL, "generatedAssetId" TEXT,
 "sourceSha256" TEXT NOT NULL, "evidence" JSONB,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "AssetRenditionRecord_status_check" CHECK ("status" IN ('MISSING','READY','FAILED')),
 CONSTRAINT "AssetRenditionRecord_link_check" CHECK (("status" = 'READY') = ("generatedAssetId" IS NOT NULL))
);
CREATE UNIQUE INDEX "AssetRenditionRecord_assetId_variantKey_key" ON "AssetRenditionRecord"("assetId","variantKey");
CREATE INDEX "AssetRenditionRecord_generatedAssetId_idx" ON "AssetRenditionRecord"("generatedAssetId");
CREATE TRIGGER "eap_asset_reference_owner" BEFORE INSERT OR UPDATE OF "assetId", "generatedAssetId" ON "AssetRenditionRecord"
FOR EACH ROW EXECUTE FUNCTION manaratak_require_active_asset_reference('assetId,generatedAssetId', 'false', 'false');

-- Extend the existing physical lifecycle guard with the new owner-derived reference.
CREATE OR REPLACE FUNCTION manaratak_protect_asset_references() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE used boolean;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW."id" = OLD."id" AND (NEW."lifecycleState" = OLD."lifecycleState" OR NEW."lifecycleState" = 'ACTIVE') THEN RETURN NEW; END IF;
  END IF;
  -- The row update/delete lock conflicts with every owner's FOR SHARE. Fresh usage reads
  -- after that lock must see committed owners; snapshot isolation would invalidate this proof.
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION 'ASSET_REFERENCE_ISOLATION_UNSUPPORTED' USING ERRCODE = '23514';
  END IF;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I."Course" WHERE "thumbnailAssetId" = $1)', TG_TABLE_SCHEMA) INTO used USING OLD."id";
  IF used THEN RAISE EXCEPTION 'ASSET_REFERENCE_IN_USE' USING ERRCODE = '23514'; END IF;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I."CourseLessonAsset" WHERE "assetId" = $1)', TG_TABLE_SCHEMA) INTO used USING OLD."id";
  IF used THEN RAISE EXCEPTION 'ASSET_REFERENCE_IN_USE' USING ERRCODE = '23514'; END IF;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I."CertificateIssuer" WHERE "issuerLogoAssetId" = $1)', TG_TABLE_SCHEMA) INTO used USING OLD."id";
  IF used THEN RAISE EXCEPTION 'ASSET_REFERENCE_IN_USE' USING ERRCODE = '23514'; END IF;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I."CertificateTemplateVersion" WHERE "logoAssetId" = $1)', TG_TABLE_SCHEMA) INTO used USING OLD."id";
  IF used THEN RAISE EXCEPTION 'ASSET_REFERENCE_IN_USE' USING ERRCODE = '23514'; END IF;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I."CertificateTemplateVersion" WHERE "sealAssetId" = $1)', TG_TABLE_SCHEMA) INTO used USING OLD."id";
  IF used THEN RAISE EXCEPTION 'ASSET_REFERENCE_IN_USE' USING ERRCODE = '23514'; END IF;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I."CertificateTemplateVersion" WHERE "signatureAssetId" = $1)', TG_TABLE_SCHEMA) INTO used USING OLD."id";
  IF used THEN RAISE EXCEPTION 'ASSET_REFERENCE_IN_USE' USING ERRCODE = '23514'; END IF;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I."CertificateTemplateVersion" WHERE "designAssetId" = $1)', TG_TABLE_SCHEMA) INTO used USING OLD."id";
  IF used THEN RAISE EXCEPTION 'ASSET_REFERENCE_IN_USE' USING ERRCODE = '23514'; END IF;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I."Certificate" WHERE "certificatePdfAssetId" = $1)', TG_TABLE_SCHEMA) INTO used USING OLD."id";
  IF used THEN RAISE EXCEPTION 'ASSET_REFERENCE_IN_USE' USING ERRCODE = '23514'; END IF;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I."Certificate" WHERE "previewImageAssetId" = $1)', TG_TABLE_SCHEMA) INTO used USING OLD."id";
  IF used THEN RAISE EXCEPTION 'ASSET_REFERENCE_IN_USE' USING ERRCODE = '23514'; END IF;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I."Certificate" WHERE "verificationQrAssetId" = $1)', TG_TABLE_SCHEMA) INTO used USING OLD."id";
  IF used THEN RAISE EXCEPTION 'ASSET_REFERENCE_IN_USE' USING ERRCODE = '23514'; END IF;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I."Certificate" WHERE "signatureAssetId" = $1)', TG_TABLE_SCHEMA) INTO used USING OLD."id";
  IF used THEN RAISE EXCEPTION 'ASSET_REFERENCE_IN_USE' USING ERRCODE = '23514'; END IF;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I."University" WHERE "logoAssetId" = $1)', TG_TABLE_SCHEMA) INTO used USING OLD."id";
  IF used THEN RAISE EXCEPTION 'ASSET_REFERENCE_IN_USE' USING ERRCODE = '23514'; END IF;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I."InternationalTestPreparationMaterial" WHERE "assetId" = $1)', TG_TABLE_SCHEMA) INTO used USING OLD."id";
  IF used THEN RAISE EXCEPTION 'ASSET_REFERENCE_IN_USE' USING ERRCODE = '23514'; END IF;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I."StudentWorkspace" WHERE "avatarAssetId" = $1)', TG_TABLE_SCHEMA) INTO used USING OLD."id";
  IF used THEN RAISE EXCEPTION 'ASSET_REFERENCE_IN_USE' USING ERRCODE = '23514'; END IF;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I."StudentCertificateReadProjection" WHERE "certificatePdfAssetId" = $1)', TG_TABLE_SCHEMA) INTO used USING OLD."id";
  IF used THEN RAISE EXCEPTION 'ASSET_REFERENCE_IN_USE' USING ERRCODE = '23514'; END IF;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I."StudentCertificateReadProjection" WHERE "previewImageAssetId" = $1)', TG_TABLE_SCHEMA) INTO used USING OLD."id";
  IF used THEN RAISE EXCEPTION 'ASSET_REFERENCE_IN_USE' USING ERRCODE = '23514'; END IF;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I."CmsContentNode" WHERE "featuredAssetId" = $1)', TG_TABLE_SCHEMA) INTO used USING OLD."id";
  IF used THEN RAISE EXCEPTION 'ASSET_REFERENCE_IN_USE' USING ERRCODE = '23514'; END IF;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I."CmsLocalizedContent" WHERE "featuredAssetId" = $1)', TG_TABLE_SCHEMA) INTO used USING OLD."id";
  IF used THEN RAISE EXCEPTION 'ASSET_REFERENCE_IN_USE' USING ERRCODE = '23514'; END IF;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I."CmsContentAttachment" WHERE "assetId" = $1)', TG_TABLE_SCHEMA) INTO used USING OLD."id";
  IF used THEN RAISE EXCEPTION 'ASSET_REFERENCE_IN_USE' USING ERRCODE = '23514'; END IF;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I."CmsPublishedContent" WHERE "featuredAssetId" = $1)', TG_TABLE_SCHEMA) INTO used USING OLD."id";
  IF used THEN RAISE EXCEPTION 'ASSET_REFERENCE_IN_USE' USING ERRCODE = '23514'; END IF;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I."ReferenceCountry" WHERE "flagAssetId" = $1)', TG_TABLE_SCHEMA) INTO used USING OLD."id";
  IF used THEN RAISE EXCEPTION 'ASSET_REFERENCE_IN_USE' USING ERRCODE = '23514'; END IF;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I."StudyDestinationProfile" WHERE "imageAssetId" = $1)', TG_TABLE_SCHEMA) INTO used USING OLD."id";
  IF used THEN RAISE EXCEPTION 'ASSET_REFERENCE_IN_USE' USING ERRCODE = '23514'; END IF;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I."StudentToolDefinitionRecord" WHERE "iconAssetId" = $1)', TG_TABLE_SCHEMA) INTO used USING OLD."id";
  IF used THEN RAISE EXCEPTION 'ASSET_REFERENCE_IN_USE' USING ERRCODE = '23514'; END IF;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I."ServiceCatalogRecord" WHERE "thumbnailAssetId" = $1)', TG_TABLE_SCHEMA) INTO used USING OLD."id";
  IF used THEN RAISE EXCEPTION 'ASSET_REFERENCE_IN_USE' USING ERRCODE = '23514'; END IF;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I."ServiceDeliveryArtifactRecord" WHERE "assetId" = $1)', TG_TABLE_SCHEMA) INTO used USING OLD."id";
  IF used THEN RAISE EXCEPTION 'ASSET_REFERENCE_IN_USE' USING ERRCODE = '23514'; END IF;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I."CareerEmployerRecord" WHERE "logoAssetId" = $1)', TG_TABLE_SCHEMA) INTO used USING OLD."id";
  IF used THEN RAISE EXCEPTION 'ASSET_REFERENCE_IN_USE' USING ERRCODE = '23514'; END IF;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I."CareerProfileRecord" WHERE "resumeAssetId" = $1)', TG_TABLE_SCHEMA) INTO used USING OLD."id";
  IF used THEN RAISE EXCEPTION 'ASSET_REFERENCE_IN_USE' USING ERRCODE = '23514'; END IF;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I."CareerApplicationRecord" WHERE "cvAssetId" = $1)', TG_TABLE_SCHEMA) INTO used USING OLD."id";
  IF used THEN RAISE EXCEPTION 'ASSET_REFERENCE_IN_USE' USING ERRCODE = '23514'; END IF;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I."CmsContentNode" WHERE "seoMetadata" ->> ''openGraphAssetId'' = $1)', TG_TABLE_SCHEMA) INTO used USING OLD."id";
  IF used THEN RAISE EXCEPTION 'ASSET_REFERENCE_IN_USE' USING ERRCODE = '23514'; END IF;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I."CmsLocalizedContent" WHERE "seoMetadata" ->> ''openGraphAssetId'' = $1)', TG_TABLE_SCHEMA) INTO used USING OLD."id";
  IF used THEN RAISE EXCEPTION 'ASSET_REFERENCE_IN_USE' USING ERRCODE = '23514'; END IF;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I."CmsPublishedContent" WHERE "seoMetadata" ->> ''openGraphAssetId'' = $1)', TG_TABLE_SCHEMA) INTO used USING OLD."id";
  IF used THEN RAISE EXCEPTION 'ASSET_REFERENCE_IN_USE' USING ERRCODE = '23514'; END IF;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I."CmsPublishedContent" WHERE "attachmentAssetIds" @> jsonb_build_array($1::text))', TG_TABLE_SCHEMA) INTO used USING OLD."id";
  IF used THEN RAISE EXCEPTION 'ASSET_REFERENCE_IN_USE' USING ERRCODE = '23514'; END IF;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I."AssetRenditionRecord" WHERE "assetId" = $1)', TG_TABLE_SCHEMA) INTO used USING OLD."id";
  IF used THEN RAISE EXCEPTION 'ASSET_REFERENCE_IN_USE' USING ERRCODE = '23514'; END IF;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I."AssetRenditionRecord" WHERE "generatedAssetId" = $1)', TG_TABLE_SCHEMA) INTO used USING OLD."id";
  IF used THEN RAISE EXCEPTION 'ASSET_REFERENCE_IN_USE' USING ERRCODE = '23514'; END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
COMMIT;
