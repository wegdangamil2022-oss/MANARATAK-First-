-- SOURCE-ONLY CLOSURE MIGRATION. DO NOT APPLY outside the approved runtime database gate.
-- Aligns future certificate-template defaults with MANARATAK's current brand identity.
ALTER TABLE "CertificateTemplateVersion"
  ALTER COLUMN "accentColor" SET DEFAULT '#142B5F',
  ALTER COLUMN "secondaryColor" SET DEFAULT '#D6A43B';
