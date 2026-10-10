-- EAP canonical reference/lifecycle serialization. Schema only: no backfill or policy guesses.
-- Deploy while API/workers are drained; startup verifies all installed guards.
BEGIN;

-- statement-breakpoint

CREATE FUNCTION manaratak_asset_reference_ids(document jsonb, fields text[], attachments boolean, seo boolean)
RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(array_agg(DISTINCT reference_id ORDER BY reference_id), ARRAY[]::text[])
  FROM (
    SELECT document ->> field AS reference_id FROM unnest(fields) AS field
    UNION ALL
    SELECT value #>> '{}' FROM jsonb_array_elements(
      CASE WHEN attachments AND jsonb_typeof(document -> 'attachmentAssetIds') = 'array'
        THEN document -> 'attachmentAssetIds' ELSE '[]'::jsonb END
    ) AS value WHERE jsonb_typeof(value) = 'string'
    UNION ALL
    SELECT document #>> '{seoMetadata,openGraphAssetId}' WHERE seo
      AND jsonb_typeof(document #> '{seoMetadata,openGraphAssetId}') = 'string'
  ) AS references_found
  WHERE reference_id IS NOT NULL AND reference_id <> '';
$$;

-- statement-breakpoint

CREATE FUNCTION manaratak_require_active_asset_reference() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  fields text[] := string_to_array(TG_ARGV[0], ',');
  new_refs text[];
  old_refs text[] := ARRAY[]::text[];
  reference_id text;
  asset_state text;
BEGIN
  new_refs := manaratak_asset_reference_ids(to_jsonb(NEW), fields, TG_ARGV[1]::boolean, TG_ARGV[2]::boolean);
  IF TG_OP = 'UPDATE' THEN
    old_refs := manaratak_asset_reference_ids(to_jsonb(OLD), fields, TG_ARGV[1]::boolean, TG_ARGV[2]::boolean);
  END IF;
  -- Ordered locks last until the owner transaction commits/rolls back, including bulk/nested writes.
  FOREACH reference_id IN ARRAY new_refs LOOP
    IF reference_id = ANY(old_refs) THEN CONTINUE; END IF;
    EXECUTE format('SELECT "lifecycleState" FROM %I."AssetRecord" WHERE "id" = $1 FOR SHARE', TG_TABLE_SCHEMA)
      INTO asset_state USING reference_id;
    IF asset_state IS DISTINCT FROM 'ACTIVE' THEN
      RAISE EXCEPTION 'ASSET_REFERENCE_NOT_ACTIVE' USING ERRCODE = '23514';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

-- statement-breakpoint

CREATE FUNCTION manaratak_protect_asset_references() RETURNS trigger LANGUAGE plpgsql AS $$
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
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

-- statement-breakpoint

CREATE TRIGGER "eap_asset_reference_lifecycle" BEFORE UPDATE OR DELETE ON "AssetRecord"
FOR EACH ROW EXECUTE FUNCTION manaratak_protect_asset_references();

-- statement-breakpoint

CREATE TRIGGER "eap_asset_reference_owner" BEFORE INSERT OR UPDATE OF "thumbnailAssetId" ON "Course"
FOR EACH ROW EXECUTE FUNCTION manaratak_require_active_asset_reference('thumbnailAssetId', 'false', 'false');

-- statement-breakpoint

CREATE TRIGGER "eap_asset_reference_owner" BEFORE INSERT OR UPDATE OF "assetId" ON "CourseLessonAsset"
FOR EACH ROW EXECUTE FUNCTION manaratak_require_active_asset_reference('assetId', 'false', 'false');

-- statement-breakpoint

CREATE TRIGGER "eap_asset_reference_owner" BEFORE INSERT OR UPDATE OF "issuerLogoAssetId" ON "CertificateIssuer"
FOR EACH ROW EXECUTE FUNCTION manaratak_require_active_asset_reference('issuerLogoAssetId', 'false', 'false');

-- statement-breakpoint

CREATE TRIGGER "eap_asset_reference_owner" BEFORE INSERT OR UPDATE OF "logoAssetId", "sealAssetId", "signatureAssetId", "designAssetId" ON "CertificateTemplateVersion"
FOR EACH ROW EXECUTE FUNCTION manaratak_require_active_asset_reference('logoAssetId,sealAssetId,signatureAssetId,designAssetId', 'false', 'false');

-- statement-breakpoint

CREATE TRIGGER "eap_asset_reference_owner" BEFORE INSERT OR UPDATE OF "certificatePdfAssetId", "previewImageAssetId", "verificationQrAssetId", "signatureAssetId" ON "Certificate"
FOR EACH ROW EXECUTE FUNCTION manaratak_require_active_asset_reference('certificatePdfAssetId,previewImageAssetId,verificationQrAssetId,signatureAssetId', 'false', 'false');

-- statement-breakpoint

CREATE TRIGGER "eap_asset_reference_owner" BEFORE INSERT OR UPDATE OF "logoAssetId" ON "University"
FOR EACH ROW EXECUTE FUNCTION manaratak_require_active_asset_reference('logoAssetId', 'false', 'false');

-- statement-breakpoint

CREATE TRIGGER "eap_asset_reference_owner" BEFORE INSERT OR UPDATE OF "assetId" ON "InternationalTestPreparationMaterial"
FOR EACH ROW EXECUTE FUNCTION manaratak_require_active_asset_reference('assetId', 'false', 'false');

-- statement-breakpoint

CREATE TRIGGER "eap_asset_reference_owner" BEFORE INSERT OR UPDATE OF "avatarAssetId" ON "StudentWorkspace"
FOR EACH ROW EXECUTE FUNCTION manaratak_require_active_asset_reference('avatarAssetId', 'false', 'false');

-- statement-breakpoint

CREATE TRIGGER "eap_asset_reference_owner" BEFORE INSERT OR UPDATE OF "certificatePdfAssetId", "previewImageAssetId" ON "StudentCertificateReadProjection"
FOR EACH ROW EXECUTE FUNCTION manaratak_require_active_asset_reference('certificatePdfAssetId,previewImageAssetId', 'false', 'false');

-- statement-breakpoint

CREATE TRIGGER "eap_asset_reference_owner" BEFORE INSERT OR UPDATE OF "featuredAssetId", "seoMetadata" ON "CmsContentNode"
FOR EACH ROW EXECUTE FUNCTION manaratak_require_active_asset_reference('featuredAssetId', 'false', 'true');

-- statement-breakpoint

CREATE TRIGGER "eap_asset_reference_owner" BEFORE INSERT OR UPDATE OF "featuredAssetId", "seoMetadata" ON "CmsLocalizedContent"
FOR EACH ROW EXECUTE FUNCTION manaratak_require_active_asset_reference('featuredAssetId', 'false', 'true');

-- statement-breakpoint

CREATE TRIGGER "eap_asset_reference_owner" BEFORE INSERT OR UPDATE OF "assetId" ON "CmsContentAttachment"
FOR EACH ROW EXECUTE FUNCTION manaratak_require_active_asset_reference('assetId', 'false', 'false');

-- statement-breakpoint

CREATE TRIGGER "eap_asset_reference_owner" BEFORE INSERT OR UPDATE OF "featuredAssetId", "seoMetadata", "attachmentAssetIds" ON "CmsPublishedContent"
FOR EACH ROW EXECUTE FUNCTION manaratak_require_active_asset_reference('featuredAssetId', 'true', 'true');

-- statement-breakpoint

CREATE TRIGGER "eap_asset_reference_owner" BEFORE INSERT OR UPDATE OF "flagAssetId" ON "ReferenceCountry"
FOR EACH ROW EXECUTE FUNCTION manaratak_require_active_asset_reference('flagAssetId', 'false', 'false');

-- statement-breakpoint

CREATE TRIGGER "eap_asset_reference_owner" BEFORE INSERT OR UPDATE OF "imageAssetId" ON "StudyDestinationProfile"
FOR EACH ROW EXECUTE FUNCTION manaratak_require_active_asset_reference('imageAssetId', 'false', 'false');

-- statement-breakpoint

CREATE TRIGGER "eap_asset_reference_owner" BEFORE INSERT OR UPDATE OF "iconAssetId" ON "StudentToolDefinitionRecord"
FOR EACH ROW EXECUTE FUNCTION manaratak_require_active_asset_reference('iconAssetId', 'false', 'false');

-- statement-breakpoint

CREATE TRIGGER "eap_asset_reference_owner" BEFORE INSERT OR UPDATE OF "thumbnailAssetId" ON "ServiceCatalogRecord"
FOR EACH ROW EXECUTE FUNCTION manaratak_require_active_asset_reference('thumbnailAssetId', 'false', 'false');

-- statement-breakpoint

CREATE TRIGGER "eap_asset_reference_owner" BEFORE INSERT OR UPDATE OF "assetId" ON "ServiceDeliveryArtifactRecord"
FOR EACH ROW EXECUTE FUNCTION manaratak_require_active_asset_reference('assetId', 'false', 'false');

-- statement-breakpoint

CREATE TRIGGER "eap_asset_reference_owner" BEFORE INSERT OR UPDATE OF "logoAssetId" ON "CareerEmployerRecord"
FOR EACH ROW EXECUTE FUNCTION manaratak_require_active_asset_reference('logoAssetId', 'false', 'false');

-- statement-breakpoint

CREATE TRIGGER "eap_asset_reference_owner" BEFORE INSERT OR UPDATE OF "resumeAssetId" ON "CareerProfileRecord"
FOR EACH ROW EXECUTE FUNCTION manaratak_require_active_asset_reference('resumeAssetId', 'false', 'false');

-- statement-breakpoint

CREATE TRIGGER "eap_asset_reference_owner" BEFORE INSERT OR UPDATE OF "cvAssetId" ON "CareerApplicationRecord"
FOR EACH ROW EXECUTE FUNCTION manaratak_require_active_asset_reference('cvAssetId', 'false', 'false');

-- statement-breakpoint

COMMIT;
