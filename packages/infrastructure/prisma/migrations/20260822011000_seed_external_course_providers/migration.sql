-- WP-IC-02: reviewed idempotent seed for the 18 providers in the 3,663-row master.
-- Provider headquarters country is intentionally NULL in this package; WP-IC-06 owns reviewed geography relationships.
-- This migration does not import any Course rows and does not publish anything.

INSERT INTO "ExternalCourseProvider" ("id", "publicId", "slug", "canonicalName", "normalizedCanonicalName", "displayName", "status", "headquartersCountryReferenceId", "sourceTrustLevel", "importStrategy", "lastVerifiedAt", "createdAt", "updatedAt")
VALUES ('a7660a7d-398e-5cd1-b8bd-17421e8af1c1', 'ecp-openlearn', 'openlearn', 'The Open University — OpenLearn', 'the open university openlearn', 'The Open University — OpenLearn', 'APPROVED', NULL, 'REVIEWED_SEED', 'FILE', TIMESTAMP '2026-08-21 00:00:00', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("publicId") DO UPDATE SET
  "slug" = EXCLUDED."slug", "canonicalName" = EXCLUDED."canonicalName", "normalizedCanonicalName" = EXCLUDED."normalizedCanonicalName",
  "displayName" = EXCLUDED."displayName", "status" = EXCLUDED."status", "sourceTrustLevel" = EXCLUDED."sourceTrustLevel",
  "importStrategy" = EXCLUDED."importStrategy", "lastVerifiedAt" = EXCLUDED."lastVerifiedAt", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProviderAlias" ("id", "providerId", "alias", "normalizedAlias", "source", "createdAt", "updatedAt")
VALUES ('f3b85925-9699-586e-bf8a-19b41775d7b1', 'a7660a7d-398e-5cd1-b8bd-17421e8af1c1', 'OpenLearn', 'openlearn', 'WP-IC-02 seed migration', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("normalizedAlias") DO NOTHING;

INSERT INTO "ExternalCourseProviderAlias" ("id", "providerId", "alias", "normalizedAlias", "source", "createdAt", "updatedAt")
VALUES ('e3bda016-8df5-5ffa-bc45-4a38562c02a1', 'a7660a7d-398e-5cd1-b8bd-17421e8af1c1', 'Open University OpenLearn', 'open university openlearn', 'WP-IC-02 seed migration', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("normalizedAlias") DO NOTHING;

INSERT INTO "ExternalCourseProviderDomain" ("id", "providerId", "domain", "normalizedDomain", "createdAt", "updatedAt")
VALUES ('e6159691-b920-5d87-9dcb-7cd69959457e', 'a7660a7d-398e-5cd1-b8bd-17421e8af1c1', 'open.edu', 'open.edu', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("providerId", "normalizedDomain") DO UPDATE SET "domain" = EXCLUDED."domain", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProvider" ("id", "publicId", "slug", "canonicalName", "normalizedCanonicalName", "displayName", "status", "headquartersCountryReferenceId", "sourceTrustLevel", "importStrategy", "lastVerifiedAt", "createdAt", "updatedAt")
VALUES ('a7a5fd94-6632-5a2e-b411-fb60bfc32445', 'ecp-freecodecamp', 'freecodecamp', 'freeCodeCamp', 'freecodecamp', 'freeCodeCamp', 'APPROVED', NULL, 'REVIEWED_SEED', 'FILE', TIMESTAMP '2026-08-21 00:00:00', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("publicId") DO UPDATE SET
  "slug" = EXCLUDED."slug", "canonicalName" = EXCLUDED."canonicalName", "normalizedCanonicalName" = EXCLUDED."normalizedCanonicalName",
  "displayName" = EXCLUDED."displayName", "status" = EXCLUDED."status", "sourceTrustLevel" = EXCLUDED."sourceTrustLevel",
  "importStrategy" = EXCLUDED."importStrategy", "lastVerifiedAt" = EXCLUDED."lastVerifiedAt", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProviderDomain" ("id", "providerId", "domain", "normalizedDomain", "createdAt", "updatedAt")
VALUES ('b61f9e7c-10ff-5f5b-924d-02adb23fea11', 'a7a5fd94-6632-5a2e-b411-fb60bfc32445', 'freecodecamp.org', 'freecodecamp.org', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("providerId", "normalizedDomain") DO UPDATE SET "domain" = EXCLUDED."domain", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProviderDomain" ("id", "providerId", "domain", "normalizedDomain", "createdAt", "updatedAt")
VALUES ('835e674d-f87e-5f9c-a706-121bb1fcadf9', 'a7a5fd94-6632-5a2e-b411-fb60bfc32445', 'youtube.com', 'youtube.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("providerId", "normalizedDomain") DO UPDATE SET "domain" = EXCLUDED."domain", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProvider" ("id", "publicId", "slug", "canonicalName", "normalizedCanonicalName", "displayName", "status", "headquartersCountryReferenceId", "sourceTrustLevel", "importStrategy", "lastVerifiedAt", "createdAt", "updatedAt")
VALUES ('8cce5e1b-35e3-5884-ba7f-15ba3e667dcb', 'ecp-fao-elearning-academy', 'fao-elearning-academy', 'FAO eLearning Academy', 'fao elearning academy', 'FAO eLearning Academy', 'APPROVED', NULL, 'REVIEWED_SEED', 'FILE', TIMESTAMP '2026-08-21 00:00:00', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("publicId") DO UPDATE SET
  "slug" = EXCLUDED."slug", "canonicalName" = EXCLUDED."canonicalName", "normalizedCanonicalName" = EXCLUDED."normalizedCanonicalName",
  "displayName" = EXCLUDED."displayName", "status" = EXCLUDED."status", "sourceTrustLevel" = EXCLUDED."sourceTrustLevel",
  "importStrategy" = EXCLUDED."importStrategy", "lastVerifiedAt" = EXCLUDED."lastVerifiedAt", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProviderDomain" ("id", "providerId", "domain", "normalizedDomain", "createdAt", "updatedAt")
VALUES ('665151a7-dd8f-5621-b9ba-8e5df1c45a3d', '8cce5e1b-35e3-5884-ba7f-15ba3e667dcb', 'elearning.fao.org', 'elearning.fao.org', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("providerId", "normalizedDomain") DO UPDATE SET "domain" = EXCLUDED."domain", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProvider" ("id", "publicId", "slug", "canonicalName", "normalizedCanonicalName", "displayName", "status", "headquartersCountryReferenceId", "sourceTrustLevel", "importStrategy", "lastVerifiedAt", "createdAt", "updatedAt")
VALUES ('c5c0614f-cbf8-5b5c-9531-4b29f2574d4b', 'ecp-ibm-skillsbuild', 'ibm-skillsbuild', 'IBM SkillsBuild', 'ibm skillsbuild', 'IBM SkillsBuild', 'APPROVED', NULL, 'REVIEWED_SEED', 'FILE', TIMESTAMP '2026-08-21 00:00:00', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("publicId") DO UPDATE SET
  "slug" = EXCLUDED."slug", "canonicalName" = EXCLUDED."canonicalName", "normalizedCanonicalName" = EXCLUDED."normalizedCanonicalName",
  "displayName" = EXCLUDED."displayName", "status" = EXCLUDED."status", "sourceTrustLevel" = EXCLUDED."sourceTrustLevel",
  "importStrategy" = EXCLUDED."importStrategy", "lastVerifiedAt" = EXCLUDED."lastVerifiedAt", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProviderDomain" ("id", "providerId", "domain", "normalizedDomain", "createdAt", "updatedAt")
VALUES ('687c5530-ff01-5967-817d-c0a062d10ebc', 'c5c0614f-cbf8-5b5c-9531-4b29f2574d4b', 'skills.yourlearning.ibm.com', 'skills.yourlearning.ibm.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("providerId", "normalizedDomain") DO UPDATE SET "domain" = EXCLUDED."domain", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProviderDomain" ("id", "providerId", "domain", "normalizedDomain", "createdAt", "updatedAt")
VALUES ('2d3ad075-d4fb-5c31-bb28-4c9a9dea440a', 'c5c0614f-cbf8-5b5c-9531-4b29f2574d4b', 'ibm.biz', 'ibm.biz', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("providerId", "normalizedDomain") DO UPDATE SET "domain" = EXCLUDED."domain", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProviderDomain" ("id", "providerId", "domain", "normalizedDomain", "createdAt", "updatedAt")
VALUES ('31bc8d53-fcee-5ebc-b983-40f44c57096a', 'c5c0614f-cbf8-5b5c-9531-4b29f2574d4b', 'skillsbuild.org', 'skillsbuild.org', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("providerId", "normalizedDomain") DO UPDATE SET "domain" = EXCLUDED."domain", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProvider" ("id", "publicId", "slug", "canonicalName", "normalizedCanonicalName", "displayName", "status", "headquartersCountryReferenceId", "sourceTrustLevel", "importStrategy", "lastVerifiedAt", "createdAt", "updatedAt")
VALUES ('067dafbe-a319-539f-8c3c-da85b82daa23', 'ecp-hubspot-academy', 'hubspot-academy', 'HubSpot Academy', 'hubspot academy', 'HubSpot Academy', 'APPROVED', NULL, 'REVIEWED_SEED', 'FILE', TIMESTAMP '2026-08-21 00:00:00', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("publicId") DO UPDATE SET
  "slug" = EXCLUDED."slug", "canonicalName" = EXCLUDED."canonicalName", "normalizedCanonicalName" = EXCLUDED."normalizedCanonicalName",
  "displayName" = EXCLUDED."displayName", "status" = EXCLUDED."status", "sourceTrustLevel" = EXCLUDED."sourceTrustLevel",
  "importStrategy" = EXCLUDED."importStrategy", "lastVerifiedAt" = EXCLUDED."lastVerifiedAt", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProviderDomain" ("id", "providerId", "domain", "normalizedDomain", "createdAt", "updatedAt")
VALUES ('503d5e75-2974-5763-8760-f61c4392ea4d', '067dafbe-a319-539f-8c3c-da85b82daa23', 'academy.hubspot.com', 'academy.hubspot.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("providerId", "normalizedDomain") DO UPDATE SET "domain" = EXCLUDED."domain", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProviderDomain" ("id", "providerId", "domain", "normalizedDomain", "createdAt", "updatedAt")
VALUES ('4621a53f-c780-55c6-bce5-e4f5c6b69748', '067dafbe-a319-539f-8c3c-da85b82daa23', 'academy.hubspot.fr', 'academy.hubspot.fr', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("providerId", "normalizedDomain") DO UPDATE SET "domain" = EXCLUDED."domain", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProviderDomain" ("id", "providerId", "domain", "normalizedDomain", "createdAt", "updatedAt")
VALUES ('e135a195-bd8f-53ef-8317-6ed3dc15770f', '067dafbe-a319-539f-8c3c-da85b82daa23', 'academy.hubspot.de', 'academy.hubspot.de', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("providerId", "normalizedDomain") DO UPDATE SET "domain" = EXCLUDED."domain", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProviderDomain" ("id", "providerId", "domain", "normalizedDomain", "createdAt", "updatedAt")
VALUES ('1b227524-ee4a-5a7f-9176-428c90484bb8', '067dafbe-a319-539f-8c3c-da85b82daa23', 'academy.hubspot.jp', 'academy.hubspot.jp', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("providerId", "normalizedDomain") DO UPDATE SET "domain" = EXCLUDED."domain", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProvider" ("id", "publicId", "slug", "canonicalName", "normalizedCanonicalName", "displayName", "status", "headquartersCountryReferenceId", "sourceTrustLevel", "importStrategy", "lastVerifiedAt", "createdAt", "updatedAt")
VALUES ('daa4b0e5-ac8a-562f-9477-ba0e2bb9cf1a', 'ecp-saylor-university', 'saylor-university', 'Saylor University', 'saylor university', 'Saylor University', 'APPROVED', NULL, 'REVIEWED_SEED', 'FILE', TIMESTAMP '2026-08-21 00:00:00', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("publicId") DO UPDATE SET
  "slug" = EXCLUDED."slug", "canonicalName" = EXCLUDED."canonicalName", "normalizedCanonicalName" = EXCLUDED."normalizedCanonicalName",
  "displayName" = EXCLUDED."displayName", "status" = EXCLUDED."status", "sourceTrustLevel" = EXCLUDED."sourceTrustLevel",
  "importStrategy" = EXCLUDED."importStrategy", "lastVerifiedAt" = EXCLUDED."lastVerifiedAt", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProviderDomain" ("id", "providerId", "domain", "normalizedDomain", "createdAt", "updatedAt")
VALUES ('b3ba78cf-f9fc-5c8f-9d3b-272e72b7a6f1', 'daa4b0e5-ac8a-562f-9477-ba0e2bb9cf1a', 'learn.saylor.org', 'learn.saylor.org', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("providerId", "normalizedDomain") DO UPDATE SET "domain" = EXCLUDED."domain", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProvider" ("id", "publicId", "slug", "canonicalName", "normalizedCanonicalName", "displayName", "status", "headquartersCountryReferenceId", "sourceTrustLevel", "importStrategy", "lastVerifiedAt", "createdAt", "updatedAt")
VALUES ('27709d6d-83dc-5a0d-a677-34033e11766f', 'ecp-nextgenu', 'nextgenu', 'NextGenU', 'nextgenu', 'NextGenU', 'APPROVED', NULL, 'REVIEWED_SEED', 'FILE', TIMESTAMP '2026-08-21 00:00:00', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("publicId") DO UPDATE SET
  "slug" = EXCLUDED."slug", "canonicalName" = EXCLUDED."canonicalName", "normalizedCanonicalName" = EXCLUDED."normalizedCanonicalName",
  "displayName" = EXCLUDED."displayName", "status" = EXCLUDED."status", "sourceTrustLevel" = EXCLUDED."sourceTrustLevel",
  "importStrategy" = EXCLUDED."importStrategy", "lastVerifiedAt" = EXCLUDED."lastVerifiedAt", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProviderDomain" ("id", "providerId", "domain", "normalizedDomain", "createdAt", "updatedAt")
VALUES ('6a7f90d3-e1ba-5098-a0d4-0e51d00482a5', '27709d6d-83dc-5a0d-a677-34033e11766f', 'courses.nextgenu.org', 'courses.nextgenu.org', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("providerId", "normalizedDomain") DO UPDATE SET "domain" = EXCLUDED."domain", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProvider" ("id", "publicId", "slug", "canonicalName", "normalizedCanonicalName", "displayName", "status", "headquartersCountryReferenceId", "sourceTrustLevel", "importStrategy", "lastVerifiedAt", "createdAt", "updatedAt")
VALUES ('f603ff00-2566-5cf4-9b1c-759f8547e5e9', 'ecp-openhpi', 'openhpi', 'openHPI — Hasso Plattner Institute', 'openhpi hasso plattner institute', 'openHPI — Hasso Plattner Institute', 'APPROVED', NULL, 'REVIEWED_SEED', 'FILE', TIMESTAMP '2026-08-21 00:00:00', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("publicId") DO UPDATE SET
  "slug" = EXCLUDED."slug", "canonicalName" = EXCLUDED."canonicalName", "normalizedCanonicalName" = EXCLUDED."normalizedCanonicalName",
  "displayName" = EXCLUDED."displayName", "status" = EXCLUDED."status", "sourceTrustLevel" = EXCLUDED."sourceTrustLevel",
  "importStrategy" = EXCLUDED."importStrategy", "lastVerifiedAt" = EXCLUDED."lastVerifiedAt", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProviderAlias" ("id", "providerId", "alias", "normalizedAlias", "source", "createdAt", "updatedAt")
VALUES ('02fc2979-a294-5329-936b-9309acdf21ad', 'f603ff00-2566-5cf4-9b1c-759f8547e5e9', 'openHPI', 'openhpi', 'WP-IC-02 seed migration', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("normalizedAlias") DO NOTHING;

INSERT INTO "ExternalCourseProviderDomain" ("id", "providerId", "domain", "normalizedDomain", "createdAt", "updatedAt")
VALUES ('2f2861d7-1eff-5c62-9d5e-b5557f43ee47', 'f603ff00-2566-5cf4-9b1c-759f8547e5e9', 'open.hpi.de', 'open.hpi.de', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("providerId", "normalizedDomain") DO UPDATE SET "domain" = EXCLUDED."domain", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProvider" ("id", "publicId", "slug", "canonicalName", "normalizedCanonicalName", "displayName", "status", "headquartersCountryReferenceId", "sourceTrustLevel", "importStrategy", "lastVerifiedAt", "createdAt", "updatedAt")
VALUES ('3b3cfb3c-9abe-5d9e-ae89-93ab6c3af07b', 'ecp-global-health-learning-center', 'global-health-learning-center', 'Global Health Learning Center', 'global health learning center', 'Global Health Learning Center', 'APPROVED', NULL, 'REVIEWED_SEED', 'FILE', TIMESTAMP '2026-08-21 00:00:00', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("publicId") DO UPDATE SET
  "slug" = EXCLUDED."slug", "canonicalName" = EXCLUDED."canonicalName", "normalizedCanonicalName" = EXCLUDED."normalizedCanonicalName",
  "displayName" = EXCLUDED."displayName", "status" = EXCLUDED."status", "sourceTrustLevel" = EXCLUDED."sourceTrustLevel",
  "importStrategy" = EXCLUDED."importStrategy", "lastVerifiedAt" = EXCLUDED."lastVerifiedAt", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProviderDomain" ("id", "providerId", "domain", "normalizedDomain", "createdAt", "updatedAt")
VALUES ('7d7b35af-ca3b-5ceb-a367-f822b5b367f5', '3b3cfb3c-9abe-5d9e-ae89-93ab6c3af07b', 'globalhealthlearning.frank-foundation.org', 'globalhealthlearning.frank-foundation.org', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("providerId", "normalizedDomain") DO UPDATE SET "domain" = EXCLUDED."domain", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProvider" ("id", "publicId", "slug", "canonicalName", "normalizedCanonicalName", "displayName", "status", "headquartersCountryReferenceId", "sourceTrustLevel", "importStrategy", "lastVerifiedAt", "createdAt", "updatedAt")
VALUES ('a44ef3ed-14cf-547b-94b1-bbcfb8e96e5a', 'ecp-semrush-academy', 'semrush-academy', 'Semrush Academy', 'semrush academy', 'Semrush Academy', 'APPROVED', NULL, 'REVIEWED_SEED', 'FILE', TIMESTAMP '2026-08-21 00:00:00', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("publicId") DO UPDATE SET
  "slug" = EXCLUDED."slug", "canonicalName" = EXCLUDED."canonicalName", "normalizedCanonicalName" = EXCLUDED."normalizedCanonicalName",
  "displayName" = EXCLUDED."displayName", "status" = EXCLUDED."status", "sourceTrustLevel" = EXCLUDED."sourceTrustLevel",
  "importStrategy" = EXCLUDED."importStrategy", "lastVerifiedAt" = EXCLUDED."lastVerifiedAt", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProviderDomain" ("id", "providerId", "domain", "normalizedDomain", "createdAt", "updatedAt")
VALUES ('09ca52d8-fe9c-5dd4-847b-953eb5804aa5', 'a44ef3ed-14cf-547b-94b1-bbcfb8e96e5a', 'semrush.com', 'semrush.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("providerId", "normalizedDomain") DO UPDATE SET "domain" = EXCLUDED."domain", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProviderDomain" ("id", "providerId", "domain", "normalizedDomain", "createdAt", "updatedAt")
VALUES ('c0dcd05e-5abb-5fef-987b-b5fd101325c5', 'a44ef3ed-14cf-547b-94b1-bbcfb8e96e5a', 'es.semrush.com', 'es.semrush.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("providerId", "normalizedDomain") DO UPDATE SET "domain" = EXCLUDED."domain", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProviderDomain" ("id", "providerId", "domain", "normalizedDomain", "createdAt", "updatedAt")
VALUES ('4112204b-4730-58bc-820b-1dc0a99d0126', 'a44ef3ed-14cf-547b-94b1-bbcfb8e96e5a', 'fr.semrush.com', 'fr.semrush.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("providerId", "normalizedDomain") DO UPDATE SET "domain" = EXCLUDED."domain", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProviderDomain" ("id", "providerId", "domain", "normalizedDomain", "createdAt", "updatedAt")
VALUES ('9342fd23-6c8c-54fa-8c34-79872428950b', 'a44ef3ed-14cf-547b-94b1-bbcfb8e96e5a', 'de.semrush.com', 'de.semrush.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("providerId", "normalizedDomain") DO UPDATE SET "domain" = EXCLUDED."domain", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProviderDomain" ("id", "providerId", "domain", "normalizedDomain", "createdAt", "updatedAt")
VALUES ('89b6a310-c86d-513c-b748-475f4be42c0e', 'a44ef3ed-14cf-547b-94b1-bbcfb8e96e5a', 'it.semrush.com', 'it.semrush.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("providerId", "normalizedDomain") DO UPDATE SET "domain" = EXCLUDED."domain", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProviderDomain" ("id", "providerId", "domain", "normalizedDomain", "createdAt", "updatedAt")
VALUES ('05593aab-2382-5fc5-95ca-386a7bbc992a', 'a44ef3ed-14cf-547b-94b1-bbcfb8e96e5a', 'pt.semrush.com', 'pt.semrush.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("providerId", "normalizedDomain") DO UPDATE SET "domain" = EXCLUDED."domain", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProviderDomain" ("id", "providerId", "domain", "normalizedDomain", "createdAt", "updatedAt")
VALUES ('566102b4-3186-5939-9c43-c9e8d7b4e2d0', 'a44ef3ed-14cf-547b-94b1-bbcfb8e96e5a', 'ja.semrush.com', 'ja.semrush.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("providerId", "normalizedDomain") DO UPDATE SET "domain" = EXCLUDED."domain", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProvider" ("id", "publicId", "slug", "canonicalName", "normalizedCanonicalName", "displayName", "status", "headquartersCountryReferenceId", "sourceTrustLevel", "importStrategy", "lastVerifiedAt", "createdAt", "updatedAt")
VALUES ('353c8871-d1db-52bc-af20-32278ab8390a', 'ecp-cisco-networking-academy', 'cisco-networking-academy', 'Cisco Networking Academy', 'cisco networking academy', 'Cisco Networking Academy', 'APPROVED', NULL, 'REVIEWED_SEED', 'FILE', TIMESTAMP '2026-08-21 00:00:00', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("publicId") DO UPDATE SET
  "slug" = EXCLUDED."slug", "canonicalName" = EXCLUDED."canonicalName", "normalizedCanonicalName" = EXCLUDED."normalizedCanonicalName",
  "displayName" = EXCLUDED."displayName", "status" = EXCLUDED."status", "sourceTrustLevel" = EXCLUDED."sourceTrustLevel",
  "importStrategy" = EXCLUDED."importStrategy", "lastVerifiedAt" = EXCLUDED."lastVerifiedAt", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProviderDomain" ("id", "providerId", "domain", "normalizedDomain", "createdAt", "updatedAt")
VALUES ('a79d7cc1-ca9c-599d-b25b-fd6d8baf314f', '353c8871-d1db-52bc-af20-32278ab8390a', 'netacad.com', 'netacad.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("providerId", "normalizedDomain") DO UPDATE SET "domain" = EXCLUDED."domain", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProvider" ("id", "publicId", "slug", "canonicalName", "normalizedCanonicalName", "displayName", "status", "headquartersCountryReferenceId", "sourceTrustLevel", "importStrategy", "lastVerifiedAt", "createdAt", "updatedAt")
VALUES ('4c845ec7-5d47-578d-ab10-aaf76ceb3cd8', 'ecp-jmooc', 'jmooc', 'JMOOC', 'jmooc', 'JMOOC', 'APPROVED', NULL, 'REVIEWED_SEED', 'FILE', TIMESTAMP '2026-08-21 00:00:00', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("publicId") DO UPDATE SET
  "slug" = EXCLUDED."slug", "canonicalName" = EXCLUDED."canonicalName", "normalizedCanonicalName" = EXCLUDED."normalizedCanonicalName",
  "displayName" = EXCLUDED."displayName", "status" = EXCLUDED."status", "sourceTrustLevel" = EXCLUDED."sourceTrustLevel",
  "importStrategy" = EXCLUDED."importStrategy", "lastVerifiedAt" = EXCLUDED."lastVerifiedAt", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProviderDomain" ("id", "providerId", "domain", "normalizedDomain", "createdAt", "updatedAt")
VALUES ('fba92549-bd60-5175-8c56-4fe52b517762', '4c845ec7-5d47-578d-ab10-aaf76ceb3cd8', 'platjam.jmooc.jp', 'platjam.jmooc.jp', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("providerId", "normalizedDomain") DO UPDATE SET "domain" = EXCLUDED."domain", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProviderDomain" ("id", "providerId", "domain", "normalizedDomain", "createdAt", "updatedAt")
VALUES ('cdceba41-bc57-56ee-b834-1741fe348761', '4c845ec7-5d47-578d-ab10-aaf76ceb3cd8', 'lms.gacco.org', 'lms.gacco.org', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("providerId", "normalizedDomain") DO UPDATE SET "domain" = EXCLUDED."domain", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProvider" ("id", "publicId", "slug", "canonicalName", "normalizedCanonicalName", "displayName", "status", "headquartersCountryReferenceId", "sourceTrustLevel", "importStrategy", "lastVerifiedAt", "createdAt", "updatedAt")
VALUES ('843ea20b-d01e-5436-b71d-86ffb9ffea09', 'ecp-wipo-academy', 'wipo-academy', 'WIPO Academy', 'wipo academy', 'WIPO Academy', 'APPROVED', NULL, 'REVIEWED_SEED', 'FILE', TIMESTAMP '2026-08-21 00:00:00', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("publicId") DO UPDATE SET
  "slug" = EXCLUDED."slug", "canonicalName" = EXCLUDED."canonicalName", "normalizedCanonicalName" = EXCLUDED."normalizedCanonicalName",
  "displayName" = EXCLUDED."displayName", "status" = EXCLUDED."status", "sourceTrustLevel" = EXCLUDED."sourceTrustLevel",
  "importStrategy" = EXCLUDED."importStrategy", "lastVerifiedAt" = EXCLUDED."lastVerifiedAt", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProviderDomain" ("id", "providerId", "domain", "normalizedDomain", "createdAt", "updatedAt")
VALUES ('8c73f8d1-322e-586a-ba04-80d2e2c5ccd0', '843ea20b-d01e-5436-b71d-86ffb9ffea09', 'welc.wipo.int', 'welc.wipo.int', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("providerId", "normalizedDomain") DO UPDATE SET "domain" = EXCLUDED."domain", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProviderDomain" ("id", "providerId", "domain", "normalizedDomain", "createdAt", "updatedAt")
VALUES ('a2e5a507-94be-54dd-9206-ee1ead94ae63', '843ea20b-d01e-5436-b71d-86ffb9ffea09', 'wipo.int', 'wipo.int', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("providerId", "normalizedDomain") DO UPDATE SET "domain" = EXCLUDED."domain", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProvider" ("id", "publicId", "slug", "canonicalName", "normalizedCanonicalName", "displayName", "status", "headquartersCountryReferenceId", "sourceTrustLevel", "importStrategy", "lastVerifiedAt", "createdAt", "updatedAt")
VALUES ('a7512586-2b93-5e33-b45e-09522e13cd61', 'ecp-undp-learning-for-nature', 'undp-learning-for-nature', 'UNDP Learning for Nature', 'undp learning for nature', 'UNDP Learning for Nature', 'APPROVED', NULL, 'REVIEWED_SEED', 'FILE', TIMESTAMP '2026-08-21 00:00:00', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("publicId") DO UPDATE SET
  "slug" = EXCLUDED."slug", "canonicalName" = EXCLUDED."canonicalName", "normalizedCanonicalName" = EXCLUDED."normalizedCanonicalName",
  "displayName" = EXCLUDED."displayName", "status" = EXCLUDED."status", "sourceTrustLevel" = EXCLUDED."sourceTrustLevel",
  "importStrategy" = EXCLUDED."importStrategy", "lastVerifiedAt" = EXCLUDED."lastVerifiedAt", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProviderAlias" ("id", "providerId", "alias", "normalizedAlias", "source", "createdAt", "updatedAt")
VALUES ('ed73cbcb-102d-5f26-8343-8a821cf6da54', 'a7512586-2b93-5e33-b45e-09522e13cd61', 'Learning for Nature', 'learning for nature', 'WP-IC-02 seed migration', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("normalizedAlias") DO NOTHING;

INSERT INTO "ExternalCourseProviderDomain" ("id", "providerId", "domain", "normalizedDomain", "createdAt", "updatedAt")
VALUES ('f58bcf4f-32dd-5923-9322-b4d3ce368051', 'a7512586-2b93-5e33-b45e-09522e13cd61', 'learningfornature.org', 'learningfornature.org', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("providerId", "normalizedDomain") DO UPDATE SET "domain" = EXCLUDED."domain", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProvider" ("id", "publicId", "slug", "canonicalName", "normalizedCanonicalName", "displayName", "status", "headquartersCountryReferenceId", "sourceTrustLevel", "importStrategy", "lastVerifiedAt", "createdAt", "updatedAt")
VALUES ('0fed0288-0fd7-57f1-9771-e8e127f11e64', 'ecp-hp-life', 'hp-life', 'HP LIFE', 'hp life', 'HP LIFE', 'APPROVED', NULL, 'REVIEWED_SEED', 'FILE', TIMESTAMP '2026-08-21 00:00:00', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("publicId") DO UPDATE SET
  "slug" = EXCLUDED."slug", "canonicalName" = EXCLUDED."canonicalName", "normalizedCanonicalName" = EXCLUDED."normalizedCanonicalName",
  "displayName" = EXCLUDED."displayName", "status" = EXCLUDED."status", "sourceTrustLevel" = EXCLUDED."sourceTrustLevel",
  "importStrategy" = EXCLUDED."importStrategy", "lastVerifiedAt" = EXCLUDED."lastVerifiedAt", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProviderDomain" ("id", "providerId", "domain", "normalizedDomain", "createdAt", "updatedAt")
VALUES ('1712a1cc-8f52-5c29-899c-32dd37d33c7e', '0fed0288-0fd7-57f1-9771-e8e127f11e64', 'life-global.org', 'life-global.org', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("providerId", "normalizedDomain") DO UPDATE SET "domain" = EXCLUDED."domain", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProvider" ("id", "publicId", "slug", "canonicalName", "normalizedCanonicalName", "displayName", "status", "headquartersCountryReferenceId", "sourceTrustLevel", "importStrategy", "lastVerifiedAt", "createdAt", "updatedAt")
VALUES ('1870d39d-4ae5-5856-9479-7685d5832a07', 'ecp-google-skillshop', 'google-skillshop', 'Google Skillshop', 'google skillshop', 'Google Skillshop', 'APPROVED', NULL, 'REVIEWED_SEED', 'FILE', TIMESTAMP '2026-08-21 00:00:00', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("publicId") DO UPDATE SET
  "slug" = EXCLUDED."slug", "canonicalName" = EXCLUDED."canonicalName", "normalizedCanonicalName" = EXCLUDED."normalizedCanonicalName",
  "displayName" = EXCLUDED."displayName", "status" = EXCLUDED."status", "sourceTrustLevel" = EXCLUDED."sourceTrustLevel",
  "importStrategy" = EXCLUDED."importStrategy", "lastVerifiedAt" = EXCLUDED."lastVerifiedAt", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProviderDomain" ("id", "providerId", "domain", "normalizedDomain", "createdAt", "updatedAt")
VALUES ('c4a22c72-a600-561e-bab8-871008180dda', '1870d39d-4ae5-5856-9479-7685d5832a07', 'skillshop.docebosaas.com', 'skillshop.docebosaas.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("providerId", "normalizedDomain") DO UPDATE SET "domain" = EXCLUDED."domain", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProviderDomain" ("id", "providerId", "domain", "normalizedDomain", "createdAt", "updatedAt")
VALUES ('b4e3c868-abae-59b2-b854-946ae7bce84b', '1870d39d-4ae5-5856-9479-7685d5832a07', 'skillshop.exceedlms.com', 'skillshop.exceedlms.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("providerId", "normalizedDomain") DO UPDATE SET "domain" = EXCLUDED."domain", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProvider" ("id", "publicId", "slug", "canonicalName", "normalizedCanonicalName", "displayName", "status", "headquartersCountryReferenceId", "sourceTrustLevel", "importStrategy", "lastVerifiedAt", "createdAt", "updatedAt")
VALUES ('818401c9-4f02-5f0b-9e8e-4d0afa29beeb', 'ecp-university-helsinki-mooc', 'university-helsinki-mooc', 'University of Helsinki — MOOC.fi', 'university of helsinki mooc fi', 'University of Helsinki — MOOC.fi', 'APPROVED', NULL, 'REVIEWED_SEED', 'FILE', TIMESTAMP '2026-08-21 00:00:00', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("publicId") DO UPDATE SET
  "slug" = EXCLUDED."slug", "canonicalName" = EXCLUDED."canonicalName", "normalizedCanonicalName" = EXCLUDED."normalizedCanonicalName",
  "displayName" = EXCLUDED."displayName", "status" = EXCLUDED."status", "sourceTrustLevel" = EXCLUDED."sourceTrustLevel",
  "importStrategy" = EXCLUDED."importStrategy", "lastVerifiedAt" = EXCLUDED."lastVerifiedAt", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProviderAlias" ("id", "providerId", "alias", "normalizedAlias", "source", "createdAt", "updatedAt")
VALUES ('0d8adca1-7222-5552-a06e-21487d6cefbd', '818401c9-4f02-5f0b-9e8e-4d0afa29beeb', 'MOOC.fi', 'mooc fi', 'WP-IC-02 seed migration', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("normalizedAlias") DO NOTHING;

INSERT INTO "ExternalCourseProviderDomain" ("id", "providerId", "domain", "normalizedDomain", "createdAt", "updatedAt")
VALUES ('0bab4c3b-0837-59d8-ae2e-8b65b6746a3b', '818401c9-4f02-5f0b-9e8e-4d0afa29beeb', 'courses.mooc.fi', 'courses.mooc.fi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("providerId", "normalizedDomain") DO UPDATE SET "domain" = EXCLUDED."domain", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProviderDomain" ("id", "providerId", "domain", "normalizedDomain", "createdAt", "updatedAt")
VALUES ('2c979529-7bd0-5450-b3ec-b387007d866f', '818401c9-4f02-5f0b-9e8e-4d0afa29beeb', 'cybersecuritybase.mooc.fi', 'cybersecuritybase.mooc.fi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("providerId", "normalizedDomain") DO UPDATE SET "domain" = EXCLUDED."domain", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProviderDomain" ("id", "providerId", "domain", "normalizedDomain", "createdAt", "updatedAt")
VALUES ('50a09948-b44b-5f1c-9e3b-0a0031e4e838', '818401c9-4f02-5f0b-9e8e-4d0afa29beeb', 'programming-26.mooc.fi', 'programming-26.mooc.fi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("providerId", "normalizedDomain") DO UPDATE SET "domain" = EXCLUDED."domain", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProviderDomain" ("id", "providerId", "domain", "normalizedDomain", "createdAt", "updatedAt")
VALUES ('3d7858fd-084d-5ba0-a3c6-726c57a3b651', '818401c9-4f02-5f0b-9e8e-4d0afa29beeb', 'java-programming.mooc.fi', 'java-programming.mooc.fi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("providerId", "normalizedDomain") DO UPDATE SET "domain" = EXCLUDED."domain", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProviderDomain" ("id", "providerId", "domain", "normalizedDomain", "createdAt", "updatedAt")
VALUES ('a6a8f7aa-cb59-5487-b5a3-a1eb372ab16b', '818401c9-4f02-5f0b-9e8e-4d0afa29beeb', 'ethics-of-ai.mooc.fi', 'ethics-of-ai.mooc.fi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("providerId", "normalizedDomain") DO UPDATE SET "domain" = EXCLUDED."domain", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProviderDomain" ("id", "providerId", "domain", "normalizedDomain", "createdAt", "updatedAt")
VALUES ('629c5b6a-cec8-5b03-986c-d743289873a0', '818401c9-4f02-5f0b-9e8e-4d0afa29beeb', 'fullstackopen.com', 'fullstackopen.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("providerId", "normalizedDomain") DO UPDATE SET "domain" = EXCLUDED."domain", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProviderDomain" ("id", "providerId", "domain", "normalizedDomain", "createdAt", "updatedAt")
VALUES ('fa235981-6735-52af-8b84-bf0817b61e36', '818401c9-4f02-5f0b-9e8e-4d0afa29beeb', 'course.elementsofai.com', 'course.elementsofai.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("providerId", "normalizedDomain") DO UPDATE SET "domain" = EXCLUDED."domain", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProviderDomain" ("id", "providerId", "domain", "normalizedDomain", "createdAt", "updatedAt")
VALUES ('4b70090e-1c24-5e55-8b78-e2324cc42712', '818401c9-4f02-5f0b-9e8e-4d0afa29beeb', 'tdd.mooc.fi', 'tdd.mooc.fi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("providerId", "normalizedDomain") DO UPDATE SET "domain" = EXCLUDED."domain", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProvider" ("id", "publicId", "slug", "canonicalName", "normalizedCanonicalName", "displayName", "status", "headquartersCountryReferenceId", "sourceTrustLevel", "importStrategy", "lastVerifiedAt", "createdAt", "updatedAt")
VALUES ('ac66ad26-ead9-5004-abe3-1822500bd046', 'ecp-harvard-cs50', 'harvard-cs50', 'Harvard University — CS50', 'harvard university cs50', 'Harvard University — CS50', 'APPROVED', NULL, 'REVIEWED_SEED', 'FILE', TIMESTAMP '2026-08-21 00:00:00', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("publicId") DO UPDATE SET
  "slug" = EXCLUDED."slug", "canonicalName" = EXCLUDED."canonicalName", "normalizedCanonicalName" = EXCLUDED."normalizedCanonicalName",
  "displayName" = EXCLUDED."displayName", "status" = EXCLUDED."status", "sourceTrustLevel" = EXCLUDED."sourceTrustLevel",
  "importStrategy" = EXCLUDED."importStrategy", "lastVerifiedAt" = EXCLUDED."lastVerifiedAt", "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "ExternalCourseProviderAlias" ("id", "providerId", "alias", "normalizedAlias", "source", "createdAt", "updatedAt")
VALUES ('d8502023-6090-545f-9067-dba2fa4ad022', 'ac66ad26-ead9-5004-abe3-1822500bd046', 'CS50', 'cs50', 'WP-IC-02 seed migration', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("normalizedAlias") DO NOTHING;

INSERT INTO "ExternalCourseProviderDomain" ("id", "providerId", "domain", "normalizedDomain", "createdAt", "updatedAt")
VALUES ('bdf6f3f2-5a19-5519-9db6-597ce7392ce4', 'ac66ad26-ead9-5004-abe3-1822500bd046', 'cs50.harvard.edu', 'cs50.harvard.edu', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("providerId", "normalizedDomain") DO UPDATE SET "domain" = EXCLUDED."domain", "updatedAt" = CURRENT_TIMESTAMP;
