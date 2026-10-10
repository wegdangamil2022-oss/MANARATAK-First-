-- P14 CERT-ADM-003. Schema-only: preserve one original certificate -> at most one replacement.
-- Never auto-delete/mutate existing certificate records; abort and review conflicts first.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "Certificate"
    WHERE "replacesCertificateId" IS NOT NULL
    GROUP BY "replacesCertificateId"
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'CERTIFICATE_REPLACEMENT_DUPLICATES_REQUIRE_MANUAL_REVIEW';
  END IF;
END $$;

-- Nullable UNIQUE allows certificates with no predecessor while enforcing a single successor.
CREATE UNIQUE INDEX "Certificate_replacesCertificateId_key"
  ON "Certificate"("replacesCertificateId");
