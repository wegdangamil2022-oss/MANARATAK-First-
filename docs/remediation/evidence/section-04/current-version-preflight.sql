-- READ-ONLY PREFLIGHT DESIGN ONLY. Not executed in this remediation round.
-- No stored value/reason/secret material is selected. No data repair is implied.
SELECT
  count(*) FILTER (WHERE v."id" IS NULL) AS missing_version_count,
  count(*) FILTER (WHERE v."id" IS NOT NULL AND v."assignmentId" <> a."id") AS foreign_version_count
FROM "SettingAssignmentRecord" a
LEFT JOIN "SettingVersionRecord" v ON v."id" = a."currentVersionId";

-- Bounded first anomaly page; use assignment-ID keyset for subsequent read-only pages.
SELECT a."id" AS assignment_id, a."key", a."scopeLevel", a."scopeId", a."currentVersionId",
  CASE WHEN v."id" IS NULL THEN 'MISSING_VERSION' ELSE 'FOREIGN_VERSION' END AS anomaly
FROM "SettingAssignmentRecord" a
LEFT JOIN "SettingVersionRecord" v ON v."id" = a."currentVersionId"
WHERE v."id" IS NULL OR v."assignmentId" <> a."id"
ORDER BY a."id" ASC
LIMIT 100;
