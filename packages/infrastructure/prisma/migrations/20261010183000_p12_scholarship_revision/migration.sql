-- Source-only migration; apply only after authorized preflight.
ALTER TABLE "Scholarship" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;
