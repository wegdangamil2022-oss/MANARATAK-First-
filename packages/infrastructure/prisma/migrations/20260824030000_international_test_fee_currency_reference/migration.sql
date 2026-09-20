ALTER TABLE "InternationalTestFeeMetadata"
ADD COLUMN "currencyReferenceId" TEXT;

UPDATE "InternationalTestFeeMetadata" AS fee
SET "currencyReferenceId" = currency."id"
FROM "ReferenceCurrency" AS currency
WHERE UPPER(currency."isoCode") = UPPER(fee."currencyCode");

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "InternationalTestFeeMetadata"
    WHERE "currencyReferenceId" IS NULL
  ) THEN
    RAISE EXCEPTION 'INTERNATIONAL_TEST_FEE_CURRENCY_BACKFILL_UNRESOLVED';
  END IF;
END $$;

ALTER TABLE "InternationalTestFeeMetadata"
ALTER COLUMN "currencyReferenceId" SET NOT NULL;

CREATE INDEX "InternationalTestFeeMetadata_currencyReferenceId_idx"
ON "InternationalTestFeeMetadata"("currencyReferenceId");

ALTER TABLE "InternationalTestFeeMetadata"
ADD CONSTRAINT "InternationalTestFeeMetadata_currencyReferenceId_fkey"
FOREIGN KEY ("currencyReferenceId") REFERENCES "ReferenceCurrency"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
