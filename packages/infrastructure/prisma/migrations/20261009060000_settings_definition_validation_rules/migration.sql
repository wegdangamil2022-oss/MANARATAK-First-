-- Additive Settings definition rule storage (source plan only).
-- Never apply this migration to an existing/production database as part of Section 04 source review.
ALTER TABLE "SettingDefinitionRecord" ADD COLUMN IF NOT EXISTS "validationRules" JSONB;
